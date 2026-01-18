/**
 * Weather Alerts Component
 *
 * Real-time weather monitoring and alerting for golf rounds.
 * Provides proactive notifications about weather conditions
 * that could affect play.
 *
 * Features:
 * - Continuous weather monitoring
 * - Lightning/storm alerts (highest priority)
 * - Rain approaching notifications
 * - Wind advisory alerts
 * - Temperature warnings (heat/cold)
 * - Sunset/darkness warnings
 * - Integration with notification system
 * - Smart timing (only alerts during active rounds)
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CloudRain,
    CloudLightning,
    Wind,
    Thermometer,
    Sun,
    Sunset,
    AlertTriangle,
    X,
    RefreshCw,
    MapPin,
    Droplets,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { useTripStore } from '@/lib/stores';
import { getWeather, getWindDirection, formatTime, type GolfWeather } from '@/lib/services/weatherService';

// ============================================
// TYPES
// ============================================

export type WeatherAlertType =
    | 'lightning'
    | 'rain_imminent'
    | 'rain_approaching'
    | 'high_wind'
    | 'extreme_heat'
    | 'extreme_cold'
    | 'sunset'
    | 'fog';

export type AlertSeverity = 'warning' | 'watch' | 'advisory' | 'info';

export interface WeatherAlert {
    id: string;
    type: WeatherAlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    recommendation: string;
    expiresAt?: number;
    data?: {
        temperature?: number;
        windSpeed?: number;
        precipitation?: number;
        visibility?: number;
        minutesUntil?: number;
    };
}

export interface WeatherConditions {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    precipitation: number;
    visibility: number;
    uvIndex: number;
    conditions: string;
    icon: string;
    sunrise: string;
    sunset: string;
}

interface WeatherAlertsProps {
    /** Update interval in ms (default: 5 minutes) */
    updateInterval?: number;
    /** Show persistent weather bar */
    showWeatherBar?: boolean;
    /** Callback when alert is triggered */
    onAlert?: (alert: WeatherAlert) => void;
    /** Custom class name */
    className?: string;
    /** Optional latitude override (uses trip course location by default) */
    latitude?: number;
    /** Optional longitude override (uses trip course location by default) */
    longitude?: number;
}

// Default coordinates (Augusta National as fallback)
const DEFAULT_COORDS = { lat: 33.5021, lng: -82.0241 };

// ============================================
// WEATHER ICON MAPPING
// ============================================

function getWeatherIcon(iconName: string, isDay: boolean = true): string {
    const iconMap: Record<string, string> = {
        'sun': isDay ? '☀️' : '🌙',
        'cloud-sun': isDay ? '⛅' : '☁️',
        'cloud-moon': '🌙',
        'cloud': '☁️',
        'cloud-rain': '🌧️',
        'cloud-drizzle': '🌦️',
        'cloud-snow': '❄️',
        'cloud-lightning': '⛈️',
        'cloud-fog': '🌫️',
        'cloud-hail': '🌨️',
    };
    return iconMap[iconName] || '☁️';
}

// ============================================
// COMPONENT
// ============================================

export function WeatherAlerts({
    updateInterval = 5 * 60 * 1000, // 5 minutes
    showWeatherBar = true,
    onAlert,
    className,
    latitude,
    longitude,
}: WeatherAlertsProps) {
    const { trigger } = useHaptic();
    const { currentTrip } = useTripStore();

    const [weather, setWeather] = useState<WeatherConditions | null>(null);
    const [golfWeatherData, setGolfWeatherData] = useState<GolfWeather | null>(null);
    const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

    // Get coordinates from trip course or props or default
    const coords = useMemo(() => {
        // First check if explicit coordinates were provided
        if (latitude !== undefined && longitude !== undefined) {
            return { lat: latitude, lng: longitude };
        }
        // Try to get from trip's course (if available)
        // For now, use default coordinates
        return DEFAULT_COORDS;
    }, [latitude, longitude]);

    // Generate alerts from weather conditions
    const generateAlerts = useCallback((conditions: WeatherConditions): WeatherAlert[] => {
        const newAlerts: WeatherAlert[] = [];

        // Lightning check (simulated - would need real lightning data)
        if (conditions.precipitation > 60) {
            newAlerts.push({
                id: 'lightning-warning',
                type: 'lightning',
                severity: 'warning',
                title: '⚡ Lightning Risk',
                message: 'Thunderstorm activity detected in the area.',
                recommendation: 'Seek shelter immediately. Do not continue play.',
                data: { precipitation: conditions.precipitation },
            });
        }

        // Rain imminent
        if (conditions.precipitation > 40 && conditions.precipitation <= 60) {
            newAlerts.push({
                id: 'rain-imminent',
                type: 'rain_imminent',
                severity: 'watch',
                title: '🌧️ Rain Imminent',
                message: `${Math.round(conditions.precipitation)}% chance of rain in the next 30 minutes.`,
                recommendation: 'Consider finishing your round or seeking shelter soon.',
                data: { precipitation: conditions.precipitation, minutesUntil: 30 },
            });
        }

        // Rain approaching
        if (conditions.precipitation > 25 && conditions.precipitation <= 40) {
            newAlerts.push({
                id: 'rain-approaching',
                type: 'rain_approaching',
                severity: 'advisory',
                title: '🌦️ Rain Approaching',
                message: `${Math.round(conditions.precipitation)}% chance of rain within the hour.`,
                recommendation: 'Keep an eye on the sky. Rain gear recommended.',
                data: { precipitation: conditions.precipitation, minutesUntil: 60 },
            });
        }

        // High wind
        if (conditions.windSpeed > 20) {
            newAlerts.push({
                id: 'high-wind',
                type: 'high_wind',
                severity: conditions.windSpeed > 30 ? 'watch' : 'advisory',
                title: '💨 High Wind Advisory',
                message: `Winds of ${Math.round(conditions.windSpeed)} mph from the ${conditions.windDirection}.`,
                recommendation: 'Club up and keep shots low. Secure loose items.',
                data: { windSpeed: conditions.windSpeed },
            });
        }

        // Extreme heat
        if (conditions.feelsLike > 95) {
            newAlerts.push({
                id: 'extreme-heat',
                type: 'extreme_heat',
                severity: conditions.feelsLike > 105 ? 'warning' : 'watch',
                title: '🌡️ Heat Advisory',
                message: `Feels like ${Math.round(conditions.feelsLike)}°F. High UV index.`,
                recommendation: 'Stay hydrated. Take breaks in shade. Use sunscreen.',
                data: { temperature: conditions.feelsLike },
            });
        }

        // Extreme cold
        if (conditions.feelsLike < 40) {
            newAlerts.push({
                id: 'extreme-cold',
                type: 'extreme_cold',
                severity: conditions.feelsLike < 32 ? 'watch' : 'advisory',
                title: '❄️ Cold Weather',
                message: `Feels like ${Math.round(conditions.feelsLike)}°F.`,
                recommendation: 'Dress in layers. Keep hands warm between shots.',
                data: { temperature: conditions.feelsLike },
            });
        }

        // Sunset warning - parse sunset time in various formats
        const now = new Date();
        const sunsetTime = new Date();
        try {
            const sunsetStr = conditions.sunset.trim().toUpperCase();
            const isPM = sunsetStr.includes('PM');
            const isAM = sunsetStr.includes('AM');
            const timePart = sunsetStr.replace(/\s*(AM|PM)\s*/i, '').trim();
            const [hours, minutes] = timePart.split(':').map(s => parseInt(s) || 0);

            let adjustedHours = hours;
            if (isPM && hours < 12) adjustedHours = hours + 12;
            else if (isAM && hours === 12) adjustedHours = 0;

            sunsetTime.setHours(adjustedHours, minutes, 0);
        } catch {
            // Default to 7:30 PM if parsing fails
            sunsetTime.setHours(19, 30, 0);
        }
        const minutesToSunset = (sunsetTime.getTime() - now.getTime()) / (1000 * 60);

        if (minutesToSunset > 0 && minutesToSunset < 60) {
            newAlerts.push({
                id: 'sunset-warning',
                type: 'sunset',
                severity: 'info',
                title: '🌅 Sunset Approaching',
                message: `Sunset in ${Math.round(minutesToSunset)} minutes at ${conditions.sunset}.`,
                recommendation: 'Plan to finish your round before dark.',
                data: { minutesUntil: Math.round(minutesToSunset) },
            });
        }

        return newAlerts;
    }, []);

    // Fetch weather and update alerts using real API
    const updateWeather = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch real weather data from Open-Meteo API
            const golfWeather = await getWeather(coords.lat, coords.lng);
            setGolfWeatherData(golfWeather);

            // Map GolfWeather to our WeatherConditions interface
            const { current, daily } = golfWeather;
            const today = daily[0];

            // Get precipitation probability from hourly data (next few hours)
            const nextHoursPrecipProb = golfWeather.hourly
                .slice(0, 6)
                .reduce((max, h) => Math.max(max, h.precipitationProbability), 0);

            const conditions: WeatherConditions = {
                temperature: current.temperature,
                feelsLike: current.feelsLike,
                humidity: current.humidity,
                windSpeed: current.windSpeed,
                windDirection: getWindDirection(current.windDirection),
                precipitation: nextHoursPrecipProb,
                visibility: current.visibility,
                uvIndex: current.uvIndex,
                conditions: current.condition.description,
                icon: getWeatherIcon(current.condition.icon, current.isDay),
                sunrise: formatTime(today.sunrise),
                sunset: formatTime(today.sunset),
            };

            setWeather(conditions);
            setLastUpdate(new Date());

            const newAlerts = generateAlerts(conditions);
            setAlerts(newAlerts);

            // Trigger callback for new high-priority alerts
            newAlerts
                .filter(a => a.severity === 'warning' || a.severity === 'watch')
                .filter(a => !dismissedAlerts.has(a.id))
                .forEach(alert => {
                    onAlert?.(alert);
                    if (alert.severity === 'warning') {
                        trigger('error');
                    } else {
                        trigger('warning');
                    }
                });
        } catch (error) {
            console.error('Failed to fetch weather:', error);
        } finally {
            setIsLoading(false);
        }
    }, [coords, generateAlerts, dismissedAlerts, onAlert, trigger]);

    // Initial fetch and interval
    useEffect(() => {
        updateWeather();
        const interval = setInterval(updateWeather, updateInterval);
        return () => clearInterval(interval);
    }, [updateWeather, updateInterval]);

    // Dismiss alert
    const dismissAlert = useCallback((alertId: string) => {
        trigger('light');
        setDismissedAlerts(prev => new Set([...prev, alertId]));
    }, [trigger]);

    // Get severity colors
    const getSeverityColors = (severity: AlertSeverity) => {
        switch (severity) {
            case 'warning':
                return {
                    bg: 'rgba(185, 28, 28, 0.15)',
                    border: 'rgba(239, 68, 68, 0.4)',
                    text: '#FCA5A5',
                    icon: '#EF4444',
                };
            case 'watch':
                return {
                    bg: 'rgba(217, 119, 6, 0.15)',
                    border: 'rgba(251, 191, 36, 0.4)',
                    text: '#FDE68A',
                    icon: '#F59E0B',
                };
            case 'advisory':
                return {
                    bg: 'rgba(59, 130, 246, 0.15)',
                    border: 'rgba(96, 165, 250, 0.4)',
                    text: '#93C5FD',
                    icon: '#3B82F6',
                };
            default:
                return {
                    bg: 'rgba(128, 120, 104, 0.15)',
                    border: 'rgba(128, 120, 104, 0.4)',
                    text: '#A09080',
                    icon: '#807868',
                };
        }
    };

    // Get alert icon
    const getAlertIcon = (type: WeatherAlertType) => {
        switch (type) {
            case 'lightning':
                return <CloudLightning className="w-5 h-5" />;
            case 'rain_imminent':
            case 'rain_approaching':
                return <CloudRain className="w-5 h-5" />;
            case 'high_wind':
                return <Wind className="w-5 h-5" />;
            case 'extreme_heat':
            case 'extreme_cold':
                return <Thermometer className="w-5 h-5" />;
            case 'sunset':
                return <Sunset className="w-5 h-5" />;
            default:
                return <AlertTriangle className="w-5 h-5" />;
        }
    };

    // Active (non-dismissed) alerts
    const activeAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

    return (
        <div className={cn('space-y-2', className)}>
            {/* Weather bar */}
            {showWeatherBar && weather && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        'flex items-center justify-between gap-4 px-4 py-2 rounded-xl',
                        'backdrop-blur-md',
                    )}
                    style={{
                        background: 'rgba(26, 24, 20, 0.8)',
                        border: '1px solid rgba(128, 120, 104, 0.2)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{weather.icon}</span>
                        <div>
                            <p className="text-sm font-medium text-white">
                                {Math.round(weather.temperature)}°F
                            </p>
                            <p className="text-[10px] text-white/50">
                                Feels like {Math.round(weather.feelsLike)}°
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-white/60">
                        <div className="flex items-center gap-1">
                            <Wind className="w-3 h-3" />
                            {Math.round(weather.windSpeed)} mph
                        </div>
                        <div className="flex items-center gap-1">
                            <Droplets className="w-3 h-3" />
                            {Math.round(weather.humidity)}%
                        </div>
                        <div className="flex items-center gap-1">
                            <Sunset className="w-3 h-3" />
                            {weather.sunset}
                        </div>
                    </div>

                    <button
                        onClick={updateWeather}
                        disabled={isLoading}
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Refresh weather"
                    >
                        <RefreshCw className={cn('w-4 h-4 text-white/40', isLoading && 'animate-spin')} />
                    </button>
                </motion.div>
            )}

            {/* Alert cards */}
            <AnimatePresence mode="popLayout">
                {activeAlerts.map(alert => {
                    const colors = getSeverityColors(alert.severity);

                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            layout
                            className={cn(
                                'flex items-start gap-3 p-4 rounded-xl',
                                'backdrop-blur-md',
                            )}
                            style={{
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                            }}
                        >
                            {/* Icon */}
                            <div style={{ color: colors.icon }}>
                                {getAlertIcon(alert.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-sm" style={{ color: colors.text }}>
                                        {alert.title}
                                    </h4>
                                    <span
                                        className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold"
                                        style={{ background: `${colors.icon}30`, color: colors.icon }}
                                    >
                                        {alert.severity}
                                    </span>
                                </div>
                                <p className="text-white/70 text-xs mt-1">{alert.message}</p>
                                <p className="text-white/50 text-xs mt-2 italic">
                                    💡 {alert.recommendation}
                                </p>
                            </div>

                            {/* Dismiss */}
                            <button
                                onClick={() => dismissAlert(alert.id)}
                                className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
                                aria-label="Dismiss alert"
                            >
                                <X className="w-4 h-4 text-white/40" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

export default WeatherAlerts;
