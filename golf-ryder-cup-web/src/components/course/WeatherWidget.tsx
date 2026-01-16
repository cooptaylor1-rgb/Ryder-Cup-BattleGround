/**
 * Weather Widget Component
 *
 * Displays current weather and forecast for a golf course.
 * Includes golf-specific recommendations.
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    getWeather,
    getWindDirection,
    formatTime,
    type GolfWeather,
    type CurrentWeather,
    type HourlyForecast,
    type DailyForecast,
} from '@/lib/services/weatherService';
import {
    Sun,
    Cloud,
    CloudRain,
    CloudSnow,
    CloudLightning,
    CloudFog,
    CloudDrizzle,
    CloudSun,
    Wind,
    Droplets,
    Thermometer,
    Sunrise,
    Sunset,
    AlertCircle,
    ChevronRight,
    RefreshCw,
    Loader2,
} from 'lucide-react';

interface WeatherWidgetProps {
    latitude: number;
    longitude: number;
    courseName?: string;
    compact?: boolean;
    className?: string;
}

export function WeatherWidget({
    latitude,
    longitude,
    courseName,
    compact = false,
    className,
}: WeatherWidgetProps) {
    const [weather, setWeather] = useState<GolfWeather | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForecast, setShowForecast] = useState(false);

    useEffect(() => {
        loadWeather();
    }, [latitude, longitude]);

    const loadWeather = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await getWeather(latitude, longitude);
            setWeather(data);
        } catch (err) {
            setError('Failed to load weather data');
            console.error('Weather error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className={cn('p-4 rounded-xl bg-surface-card flex items-center justify-center', className)}>
                <Loader2 className="w-6 h-6 animate-spin text-surface-400" />
            </div>
        );
    }

    if (error || !weather) {
        return (
            <div className={cn('p-4 rounded-xl bg-surface-card', className)}>
                <div className="flex items-center gap-2 text-surface-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">{error || 'Weather unavailable'}</span>
                    <button onClick={loadWeather} className="ml-auto p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    const { current, golfConditions } = weather;

    // Compact mode
    if (compact) {
        return (
            <div className={cn('space-y-2', className)}>
                <button
                    onClick={() => setShowForecast(!showForecast)}
                    className={cn(
                        'flex items-center gap-3 p-3 rounded-xl bg-surface-card',
                        'hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors',
                        'w-full text-left'
                    )}
                >
                    <WeatherIcon condition={current.condition.icon} size="sm" isDay={current.isDay} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">{current.temperature}°</span>
                            <span className="text-sm text-surface-500">{current.condition.description}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-surface-500">
                            <span className="flex items-center gap-1">
                                <Wind className="w-3 h-3" />
                                {current.windSpeed} mph
                            </span>
                            <span>{getWindDirection(current.windDirection)}</span>
                        </div>
                    </div>
                    <ChevronRight className={cn('w-5 h-5 text-surface-400 transition-transform', showForecast && 'rotate-90')} />
                </button>

                {/* Expanded forecast panel */}
                {showForecast && (
                    <div className="space-y-3 p-3 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700">
                        {/* Golf Conditions */}
                        <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-surface-700">
                            <span className="text-sm font-medium">Golf Conditions</span>
                            <GolfConditionBadge overall={golfConditions.overall} showLabel />
                        </div>

                        {/* Additional stats */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <div className="text-xs text-surface-500">Feels Like</div>
                                <div className="font-medium">{current.feelsLike}°</div>
                            </div>
                            <div>
                                <div className="text-xs text-surface-500">Humidity</div>
                                <div className="font-medium">{current.humidity}%</div>
                            </div>
                            <div>
                                <div className="text-xs text-surface-500">UV Index</div>
                                <div className="font-medium">{current.uvIndex}</div>
                            </div>
                        </div>

                        {/* Hourly mini forecast */}
                        <div>
                            <div className="text-xs text-surface-500 mb-2">Next Hours</div>
                            <div className="flex gap-3 overflow-x-auto pb-1">
                                {weather.hourly.slice(0, 6).map((hour, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1 min-w-[45px]">
                                        <span className="text-xs text-surface-500">
                                            {i === 0 ? 'Now' : format(hour.time, 'ha')}
                                        </span>
                                        <WeatherIcon condition={hour.condition.icon} size="sm" isDay={hour.time.getHours() > 6 && hour.time.getHours() < 20} />
                                        <span className="text-sm font-medium">{hour.temperature}°</span>
                                        {hour.precipitationProbability > 20 && (
                                            <span className="text-xs text-blue-500">{hour.precipitationProbability}%</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations */}
                        {golfConditions.recommendations.length > 0 && (
                            <div className="pt-2 border-t border-surface-200 dark:border-surface-700">
                                <div className="text-xs text-surface-500 mb-1">Tips</div>
                                {golfConditions.recommendations.slice(0, 2).map((rec, i) => (
                                    <div key={i} className="flex items-start gap-1 text-xs text-surface-600 dark:text-surface-400">
                                        <span className="text-masters-primary">•</span>
                                        <span>{rec}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Full mode
    return (
        <div className={cn('space-y-4', className)}>
            {/* Main Weather Card */}
            <div
                className={cn(
                    'p-6 rounded-2xl overflow-hidden relative',
                    getWeatherGradient(current.condition.code, current.isDay)
                )}
            >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <pattern id="weather-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                            <circle cx="5" cy="5" r="1" fill="white" />
                        </pattern>
                        <rect width="100" height="100" fill="url(#weather-pattern)" />
                    </svg>
                </div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            {courseName && (
                                <div className="text-white/70 text-sm mb-1">{courseName}</div>
                            )}
                            <div className="text-white text-lg font-medium">Current Weather</div>
                        </div>
                        <button
                            onClick={loadWeather}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* Main weather display */}
                    <div className="flex items-center gap-6">
                        <WeatherIcon condition={current.condition.icon} size="lg" isDay={current.isDay} />
                        <div>
                            <div className="text-white text-6xl font-bold">{current.temperature}°</div>
                            <div className="text-white/80">{current.condition.description}</div>
                            <div className="text-white/60 text-sm">Feels like {current.feelsLike}°</div>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2 text-white/80">
                            <Wind className="w-4 h-4" />
                            <span>{current.windSpeed} mph {getWindDirection(current.windDirection)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <Droplets className="w-4 h-4" />
                            <span>{current.humidity}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <Sun className="w-4 h-4" />
                            <span>UV {current.uvIndex}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Golf Conditions Card */}
            <div className="p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700">
                <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Golf Conditions</span>
                    <GolfConditionBadge overall={golfConditions.overall} showLabel />
                </div>

                {/* Factor bars */}
                <div className="space-y-2 mb-4">
                    <FactorBar label="Temperature" value={golfConditions.factors.temperature} />
                    <FactorBar label="Wind" value={golfConditions.factors.wind} />
                    <FactorBar label="Precipitation" value={golfConditions.factors.precipitation} />
                </div>

                {/* Recommendations */}
                {golfConditions.recommendations.length > 0 && (
                    <div className="space-y-2">
                        {golfConditions.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400">
                                <span className="text-masters-primary">•</span>
                                <span>{rec}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Hourly Forecast */}
            <div className="p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700">
                <div className="font-medium mb-3">Hourly Forecast</div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {weather.hourly.slice(0, 12).map((hour, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[50px]">
                            <span className="text-xs text-surface-500">
                                {i === 0 ? 'Now' : format(hour.time, 'ha')}
                            </span>
                            <WeatherIcon condition={hour.condition.icon} size="sm" isDay={hour.time.getHours() > 6 && hour.time.getHours() < 20} />
                            <span className="font-medium">{hour.temperature}°</span>
                            {hour.precipitationProbability > 20 && (
                                <span className="text-xs text-blue-500">{hour.precipitationProbability}%</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Daily Forecast */}
            <div className="p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700">
                <div className="font-medium mb-3">7-Day Forecast</div>
                <div className="space-y-3">
                    {weather.daily.map((day, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <span className="w-12 text-sm text-surface-500">
                                {i === 0 ? 'Today' : format(day.date, 'EEE')}
                            </span>
                            <WeatherIcon condition={day.condition.icon} size="sm" isDay />
                            <span className="flex-1 text-sm text-surface-500 truncate">
                                {day.condition.description}
                            </span>
                            {day.precipitationProbability > 20 && (
                                <span className="text-xs text-blue-500">{day.precipitationProbability}%</span>
                            )}
                            <div className="text-right">
                                <span className="font-medium">{day.temperatureMax}°</span>
                                <span className="text-surface-400 ml-1">{day.temperatureMin}°</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sun times */}
            <div className="flex gap-4">
                <div className="flex-1 p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-2 text-surface-500 mb-1">
                        <Sunrise className="w-4 h-4" />
                        <span className="text-sm">Sunrise</span>
                    </div>
                    <div className="font-medium">{formatTime(weather.daily[0].sunrise)}</div>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700">
                    <div className="flex items-center gap-2 text-surface-500 mb-1">
                        <Sunset className="w-4 h-4" />
                        <span className="text-sm">Sunset</span>
                    </div>
                    <div className="font-medium">{formatTime(weather.daily[0].sunset)}</div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface WeatherIconProps {
    condition: string;
    size?: 'sm' | 'md' | 'lg';
    isDay?: boolean;
}

function WeatherIcon({ condition, size = 'md', isDay = true }: WeatherIconProps) {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
    };

    const iconClass = cn(sizeClasses[size], 'text-white');

    switch (condition) {
        case 'sun':
            return <Sun className={cn(iconClass, 'text-yellow-400')} />;
        case 'cloud-sun':
            return <CloudSun className={cn(iconClass, isDay ? 'text-yellow-300' : 'text-gray-300')} />;
        case 'cloud':
            return <Cloud className={cn(iconClass, 'text-gray-300')} />;
        case 'cloud-rain':
            return <CloudRain className={cn(iconClass, 'text-blue-400')} />;
        case 'cloud-drizzle':
            return <CloudDrizzle className={cn(iconClass, 'text-blue-300')} />;
        case 'cloud-snow':
            return <CloudSnow className={cn(iconClass, 'text-white')} />;
        case 'cloud-lightning':
            return <CloudLightning className={cn(iconClass, 'text-yellow-400')} />;
        case 'cloud-fog':
            return <CloudFog className={cn(iconClass, 'text-gray-400')} />;
        case 'cloud-hail':
            return <CloudSnow className={cn(iconClass, 'text-blue-200')} />;
        default:
            return <Cloud className={cn(iconClass, 'text-gray-300')} />;
    }
}

interface GolfConditionBadgeProps {
    overall: GolfWeather['golfConditions']['overall'];
    showLabel?: boolean;
}

function GolfConditionBadge({ overall, showLabel = false }: GolfConditionBadgeProps) {
    const config = {
        excellent: { bg: 'bg-success/10', text: 'text-success', label: 'Excellent' },
        good: { bg: 'bg-masters-primary/10', text: 'text-masters-primary', label: 'Good' },
        fair: { bg: 'bg-warning/10', text: 'text-warning', label: 'Fair' },
        poor: { bg: 'bg-error/10', text: 'text-error', label: 'Poor' },
    };

    const c = config[overall];

    return (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', c.bg, c.text)}>
            {showLabel ? c.label : overall.charAt(0).toUpperCase()}
        </span>
    );
}

interface FactorBarProps {
    label: string;
    value: number;
}

function FactorBar({ label, value }: FactorBarProps) {
    const getColor = () => {
        if (value >= 80) return 'bg-success';
        if (value >= 60) return 'bg-masters-primary';
        if (value >= 40) return 'bg-warning';
        return 'bg-error';
    };

    return (
        <div className="flex items-center gap-3">
            <span className="w-24 text-sm text-surface-500">{label}</span>
            <div className="flex-1 h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all', getColor())}
                    style={{ width: `${value}%` }}
                />
            </div>
            <span className="w-8 text-sm text-right">{value}</span>
        </div>
    );
}

// Get gradient based on weather
function getWeatherGradient(code: number, isDay: boolean): string {
    if (!isDay) return 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e]';

    if (code === 0 || code === 1) return 'bg-gradient-to-br from-[#56CCF2] to-[#2F80ED]';
    if (code === 2 || code === 3) return 'bg-gradient-to-br from-[#757F9A] to-[#D7DDE8]';
    if (code >= 45 && code <= 48) return 'bg-gradient-to-br from-[#8e9eab] to-[#eef2f3]';
    if (code >= 51 && code <= 67) return 'bg-gradient-to-br from-[#4b6cb7] to-[#182848]';
    if (code >= 71 && code <= 86) return 'bg-gradient-to-br from-[#E6DADA] to-[#274046]';
    if (code >= 95) return 'bg-gradient-to-br from-[#373B44] to-[#4286f4]';

    return 'bg-gradient-to-br from-[#56CCF2] to-[#2F80ED]';
}

export default WeatherWidget;
