/**
 * Weather Alert Service
 *
 * Monitors weather conditions during play and sends alerts for:
 * - Lightning/thunderstorm warnings
 * - Rain approaching
 * - Severe weather
 * - Extreme heat/cold
 * - High winds
 *
 * Uses National Weather Service API for reliable alerts.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUIStore } from '@/lib/stores';
import { getWeather, type GolfWeather } from '@/lib/services/weatherService';
import { sendNotification } from './liveScoreNotifications';
import { createLogger } from '../utils/logger';

const logger = createLogger('WeatherAlerts');

export type WeatherAlertSeverity = 'info' | 'warning' | 'danger' | 'emergency';

export interface WeatherAlert {
    id: string;
    type: 'lightning' | 'rain' | 'wind' | 'heat' | 'cold' | 'storm';
    severity: WeatherAlertSeverity;
    title: string;
    message: string;
    actionRequired?: string;
    eta?: number; // Minutes until condition arrives
    expires?: number; // Timestamp when alert expires
    dismissed?: boolean;
}

interface WeatherAlertOptions {
    latitude: number;
    longitude: number;
    checkIntervalMinutes?: number;
    enablePush?: boolean;
    enableSound?: boolean;
    lightningThresholdMiles?: number;
    rainThresholdMinutes?: number;
    windThresholdMph?: number;
    heatThresholdF?: number;
    coldThresholdF?: number;
}

const DEFAULT_OPTIONS: Partial<WeatherAlertOptions> = {
    checkIntervalMinutes: 10,
    enablePush: true,
    enableSound: true,
    lightningThresholdMiles: 10,
    rainThresholdMinutes: 30,
    windThresholdMph: 25,
    heatThresholdF: 95,
    coldThresholdF: 40,
};

// Analyze weather data and generate alerts
function analyzeWeatherForAlerts(
    weather: GolfWeather,
    options: WeatherAlertOptions
): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    const current = weather.current;
    const hourly = weather.hourly;

    // Check for thunderstorms in current conditions
    const currentCondition = current.condition.description.toLowerCase();
    const currentCode = current.condition.code;
    if (currentCondition.includes('thunder') || currentCondition.includes('lightning') || currentCondition.includes('storm') || (currentCode >= 95 && currentCode <= 99)) {
        alerts.push({
            id: `lightning-${Date.now()}`,
            type: 'lightning',
            severity: 'emergency',
            title: '⚡ LIGHTNING WARNING',
            message: 'Thunderstorm activity detected in your area.',
            actionRequired: 'Seek shelter immediately. Do not stay on the course.',
        });
    }

    // Check hourly forecast for approaching rain
    const rainThreshold = options.rainThresholdMinutes || 30;
    for (let i = 0; i < Math.min(3, hourly.length); i++) {
        const hour = hourly[i];
        const minutesAway = i * 60;
        const hourCondition = hour.condition.description.toLowerCase();
        const hourCode = hour.condition.code;
        const isThunderstorm = hourCondition.includes('thunder') || hourCondition.includes('storm') || (hourCode >= 95 && hourCode <= 99);

        if (hour.precipitationProbability > 60 && minutesAway <= rainThreshold) {
            alerts.push({
                id: `rain-${i}-${Date.now()}`,
                type: isThunderstorm ? 'storm' : 'rain',
                severity: isThunderstorm ? 'danger' : 'warning',
                title: isThunderstorm ? '🌩️ Storm Approaching' : '🌧️ Rain Expected',
                message: `${hour.precipitationProbability}% chance of ${isThunderstorm ? 'thunderstorms' : 'rain'} in ${minutesAway || 'less than 60'} minutes.`,
                eta: minutesAway || 30,
                actionRequired: isThunderstorm ? 'Consider finishing early or seeking shelter.' : undefined,
            });
            break; // Only show first rain alert
        }
    }

    // Check for high winds
    const windThreshold = options.windThresholdMph || 25;
    if (current.windSpeed > windThreshold) {
        alerts.push({
            id: `wind-${Date.now()}`,
            type: 'wind',
            severity: current.windSpeed > 35 ? 'danger' : 'warning',
            title: '💨 High Winds',
            message: `Wind speed: ${Math.round(current.windSpeed)} mph with gusts up to ${Math.round(current.windGust || current.windSpeed * 1.3)} mph.`,
            actionRequired: current.windSpeed > 35 ? 'Play may be suspended due to dangerous conditions.' : 'Expect significant ball flight impact.',
        });
    }

    // Check for extreme heat
    const heatThreshold = options.heatThresholdF || 95;
    if (current.temperature > heatThreshold) {
        alerts.push({
            id: `heat-${Date.now()}`,
            type: 'heat',
            severity: current.temperature > 100 ? 'danger' : 'warning',
            title: '🌡️ Extreme Heat',
            message: `Temperature: ${Math.round(current.temperature)}°F. ${current.humidity > 60 ? `Feels like ${Math.round(current.feelsLike)}°F with humidity.` : ''}`,
            actionRequired: 'Stay hydrated. Take breaks in shade. Watch for heat exhaustion symptoms.',
        });
    }

    // Check for cold
    const coldThreshold = options.coldThresholdF || 40;
    if (current.temperature < coldThreshold) {
        alerts.push({
            id: `cold-${Date.now()}`,
            type: 'cold',
            severity: current.temperature < 32 ? 'danger' : 'info',
            title: '🥶 Cold Weather',
            message: `Temperature: ${Math.round(current.temperature)}°F. ${current.windSpeed > 10 ? `Wind chill: ${Math.round(current.feelsLike)}°F.` : ''}`,
            actionRequired: current.temperature < 32 ? 'Watch for frost on greens. Course may have delays.' : undefined,
        });
    }

    return alerts;
}

// Hook for weather alerts during play
export function useWeatherAlerts(options: WeatherAlertOptions) {
    const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);
    const [weather, setWeather] = useState<GolfWeather | null>(null);
    const { showToast } = useUIStore();
    const previousAlertIds = useRef<Set<string>>(new Set());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    // Check weather and generate alerts
    const checkWeather = useCallback(async () => {
        if (!options.latitude || !options.longitude) return;

        setIsLoading(true);

        try {
            const weatherData = await getWeather(options.latitude, options.longitude);
            setWeather(weatherData);

            const newAlerts = analyzeWeatherForAlerts(weatherData, mergedOptions);

            // Find truly new alerts (not seen before)
            const newAlertIds = new Set(newAlerts.map(a => a.type));
            const trulyNewAlerts = newAlerts.filter(
                a => !previousAlertIds.current.has(a.type)
            );

            // Send notifications for new dangerous alerts
            if (trulyNewAlerts.length > 0 && mergedOptions.enablePush) {
                for (const alert of trulyNewAlerts) {
                    if (alert.severity === 'danger' || alert.severity === 'emergency') {
                        sendNotification(
                            alert.title,
                            alert.message,
                            {
                                tag: `weather-${alert.type}`,
                                requireInteraction: alert.severity === 'emergency',
                                vibrate: alert.severity === 'emergency'
                                    ? [500, 200, 500, 200, 500]
                                    : [200, 100, 200],
                            }
                        );

                        // Also show toast for high-severity alerts
                        showToast(
                            alert.severity === 'emergency' ? 'error' : 'warning',
                            `${alert.title}: ${alert.message}`,
                            10000
                        );
                    }
                }
            }

            // Update previous alert tracking
            previousAlertIds.current = newAlertIds;

            setAlerts(newAlerts);
            setLastCheck(new Date());
        } catch (error) {
            logger.error('Failed to check weather:', error);
        } finally {
            setIsLoading(false);
        }
    }, [options.latitude, options.longitude, mergedOptions, showToast]);

    // Start periodic checking
    useEffect(() => {
        // Initial check
        checkWeather();

        // Set up interval
        const intervalMs = (mergedOptions.checkIntervalMinutes || 10) * 60 * 1000;
        intervalRef.current = setInterval(checkWeather, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [checkWeather, mergedOptions.checkIntervalMinutes]);

    // Dismiss an alert
    const dismissAlert = useCallback((alertId: string) => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
    }, []);

    // Force refresh
    const refresh = useCallback(() => {
        checkWeather();
    }, [checkWeather]);

    return {
        alerts,
        weather,
        isLoading,
        lastCheck,
        dismissAlert,
        refresh,
        hasActiveAlerts: alerts.length > 0,
        hasDangerousAlerts: alerts.some(a => a.severity === 'danger' || a.severity === 'emergency'),
    };
}

// Weather Alert Banner Component
interface WeatherAlertBannerProps {
    alert: WeatherAlert;
    onDismiss: () => void;
}

export function WeatherAlertBanner({ alert, onDismiss }: WeatherAlertBannerProps) {
    const severityColors = {
        info: 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400',
        warning: 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400',
        danger: 'bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-400',
        emergency: 'bg-red-500/20 border-red-600 text-red-700 dark:text-red-400',
    };

    const severityIcons = {
        lightning: '⚡',
        rain: '🌧️',
        wind: '💨',
        heat: '🌡️',
        cold: '🥶',
        storm: '🌩️',
    };

    return (
        <div
            className={`rounded-xl border-l-4 p-4 mb-3 ${severityColors[alert.severity]}`
            }
        >
            <div className="flex items-start gap-3" >
                <span className="text-2xl" > {severityIcons[alert.type]} </span>
                < div className="flex-1" >
                    <div className="flex items-center justify-between" >
                        <h4 className="font-semibold" > {alert.title} </h4>
                        < button
                            onClick={onDismiss}
                            className="text-sm opacity-60 hover:opacity-100"
                        >
                            Dismiss
                        </button>
                    </div>
                    < p className="text-sm mt-1 opacity-90" > {alert.message} </p>
                    {
                        alert.eta && (
                            <p className="text-xs mt-2 opacity-70" >
                                Expected in ~{alert.eta} minutes
                            </p>
                        )
                    }
                    {
                        alert.actionRequired && (
                            <p className="text-sm mt-2 font-medium" >
                                ⚠️ {alert.actionRequired}
                            </p>
                        )
                    }
                </div>
            </div>
        </div>
    );
}

// Floating Weather Alert Toast
export function WeatherAlertFloating({
    latitude,
    longitude,
}: {
    latitude: number;
    longitude: number;
}) {
    const { alerts, dismissAlert, hasDangerousAlerts: _hasDangerousAlerts } = useWeatherAlerts({
        latitude,
        longitude,
    });

    // Only show emergency/danger alerts as floating
    const criticalAlerts = alerts.filter(
        a => a.severity === 'emergency' || a.severity === 'danger'
    );

    if (criticalAlerts.length === 0) return null;

    return (
        <div className="fixed top-16 left-4 right-4 z-50 space-y-2" >
            {
                criticalAlerts.map(alert => (
                    <WeatherAlertBanner
                        key={alert.id}
                        alert={alert}
                        onDismiss={() => dismissAlert(alert.id)}
                    />
                ))
            }
        </div>
    );
}
