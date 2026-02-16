'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSessionWeather } from '@/lib/services/weatherService';
import { RyderCupSession, Course } from '@/lib/types';
import { SessionWeather, WeatherForecast } from '@/lib/types/captain';
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Umbrella,
  CloudSnow,
} from 'lucide-react';

interface SessionWeatherPanelProps {
  session: RyderCupSession;
  course?: Course;
  /** Optional latitude for weather lookup (if not provided, will use course location for geocoding) */
  latitude?: number;
  /** Optional longitude for weather lookup */
  longitude?: number;
  onWeatherUpdate?: (weather: SessionWeather) => void;
}

// Simple geocoding cache for location strings
const geoCache = new Map<string, { lat: number; lng: number }>();

// Known golf destinations for quick lookup (fallback)
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'scottsdale': { lat: 33.4942, lng: -111.9261 },
  'phoenix': { lat: 33.4484, lng: -112.0740 },
  'pebble beach': { lat: 36.5684, lng: -121.9469 },
  'st andrews': { lat: 56.3398, lng: -2.7967 },
  'pinehurst': { lat: 35.1954, lng: -79.4700 },
  'kiawah island': { lat: 32.6083, lng: -80.0845 },
  'myrtle beach': { lat: 33.6891, lng: -78.8867 },
  'palm springs': { lat: 33.8303, lng: -116.5453 },
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  'orlando': { lat: 28.5383, lng: -81.3792 },
};

function getCoordinatesFromLocation(location: string): { lat: number; lng: number } | null {
  const normalized = location.toLowerCase();

  // Check cache
  if (geoCache.has(normalized)) {
    return geoCache.get(normalized)!;
  }

  // Check known locations
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (normalized.includes(key)) {
      geoCache.set(normalized, coords);
      return coords;
    }
  }

  return null;
}

export function SessionWeatherPanel({ session, course, latitude, longitude, onWeatherUpdate }: SessionWeatherPanelProps) {
  const [weather, setWeather] = useState<SessionWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    // Try to get coordinates
    let lat = latitude;
    let lng = longitude;

    // If no explicit coordinates, try to derive from course location.
    // Note: latitude/longitude may legitimately be 0, so we check for null/undefined.
    if (lat == null || lng == null) {
      if (course?.location) {
        const coords = getCoordinatesFromLocation(course.location);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
    }

    if (lat == null || lng == null) {
      setError('Location not available - add course location to enable weather');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const weatherData = await getSessionWeather(
        session,
        lat,
        lng
      );

      if (weatherData) {
        setWeather(weatherData);
        onWeatherUpdate?.(weatherData);
      } else {
        setError('Unable to fetch weather data');
      }
    } catch {
      setError('Weather service unavailable');
    } finally {
      setLoading(false);
    }
  }, [session, latitude, longitude, course?.location, onWeatherUpdate]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const getWeatherIcon = (forecast?: WeatherForecast) => {
    if (!forecast) return <Cloud className="w-8 h-8 text-[var(--ink-tertiary)]" />;

    const iconName = forecast.icon?.toLowerCase() || '';

    if (iconName.includes('snow') || forecast.precipitation?.type === 'snow') {
      return <CloudSnow className="w-8 h-8 text-[var(--info)]" />;
    }
    if (forecast.precipitation?.chance && forecast.precipitation.chance > 50) {
      return <CloudRain className="w-8 h-8 text-[var(--info)]" />;
    }
    if (iconName.includes('cloud') || iconName.includes('overcast')) {
      return <Cloud className="w-8 h-8 text-[var(--ink-tertiary)]" />;
    }
    return <Sun className="w-8 h-8 text-[var(--warning)]" />;
  };

  const getRecommendationText = (sessionWeather?: SessionWeather): string => {
    if (!sessionWeather?.forecast) return 'Weather data unavailable';

    const forecast = sessionWeather.forecast;
    const issues: string[] = [];

    if (forecast.precipitation?.chance && forecast.precipitation.chance > 60) {
      issues.push('Bring rain gear');
    }
    if (forecast.wind?.speed && forecast.wind.speed > 20) {
      issues.push('Club up in the wind');
    }
    if (forecast.temperature?.high && forecast.temperature.high > 85) {
      issues.push('Stay hydrated');
    }
    if (forecast.temperature?.low && forecast.temperature.low < 50) {
      issues.push('Dress in layers');
    }
    if (forecast.uvIndex && forecast.uvIndex > 7) {
      issues.push('Apply sunscreen');
    }

    if (issues.length === 0) {
      return 'Perfect conditions for golf!';
    }

    return issues.join(' • ');
  };

  const getRecommendationBadge = (rec: SessionWeather['recommendation']) => {
    switch (rec) {
      case 'go':
        return <span className="px-2 py-0.5 bg-[color:var(--success)]/15 text-[var(--success)] text-xs rounded-full">Good to Go</span>;
      case 'monitor':
        return <span className="px-2 py-0.5 bg-[color:var(--info)]/15 text-[var(--info)] text-xs rounded-full">Monitor</span>;
      case 'delay':
        return <span className="px-2 py-0.5 bg-[color:var(--warning)]/15 text-[var(--warning)] text-xs rounded-full">Consider Delay</span>;
      case 'cancel':
        return <span className="px-2 py-0.5 bg-[color:var(--error)]/15 text-[var(--error)] text-xs rounded-full">Unfavorable</span>;
    }
  };

  const formatSessionDate = () => {
    if (session.scheduledDate) {
      return new Date(session.scheduledDate).toLocaleDateString();
    }
    return 'Date TBD';
  };

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--surface-tertiary)] rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-[var(--surface-tertiary)] rounded w-1/2 mb-2" />
            <div className="h-3 bg-[var(--surface-tertiary)] rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border bg-[color:var(--warning)]/10 border-[color:var(--warning)]/25">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
            <span className="text-[var(--ink-secondary)]">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchWeather}
            className="p-1 rounded hover:bg-[color:var(--warning)]/10"
            aria-label="Retry weather fetch"
          >
            <RefreshCw className="w-4 h-4 text-[var(--warning)]" />
          </button>
        </div>
      </div>
    );
  }

  const forecast = weather?.forecast;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
      >
        <div className="flex items-center gap-4">
          {getWeatherIcon(forecast)}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--ink-primary)]">
                {forecast?.temperature?.high
                  ? `${Math.round(forecast.temperature.high)}°${forecast.temperature.unit || 'F'}`
                  : '--°F'}
              </span>
              {weather && getRecommendationBadge(weather.recommendation)}
            </div>
            <p className="text-sm text-[var(--ink-tertiary)]">
              {session.name} • {formatSessionDate()}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-[var(--ink-tertiary)]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[var(--ink-tertiary)]" />
        )}
      </button>

      {/* Expanded Details */}
      {expanded && forecast && (
        <div className="px-4 pb-4 space-y-4">
          {/* Weather Alerts */}
          {weather?.alerts && weather.alerts.length > 0 && (
            <div className="space-y-2">
              {weather.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${alert.severity === 'severe'
                    ? 'bg-[color:var(--error)]/10 border-[color:var(--error)]/25'
                    : alert.severity === 'moderate'
                      ? 'bg-[color:var(--warning)]/10 border-[color:var(--warning)]/25'
                      : 'bg-[color:var(--info)]/10 border-[color:var(--info)]/25'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className={`w-4 h-4 ${alert.severity === 'severe'
                      ? 'text-[var(--error)]'
                      : alert.severity === 'moderate'
                        ? 'text-[var(--warning)]'
                        : 'text-[var(--info)]'
                      }`} />
                    <span className="font-medium text-sm text-[var(--ink-primary)]">{alert.title}</span>
                  </div>
                  <p className="text-xs text-[var(--ink-secondary)]">{alert.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Weather Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-[var(--surface-secondary)] rounded-lg">
              <Wind className="w-5 h-5 text-[var(--info)] mx-auto mb-1" />
              <p className="text-sm font-medium text-[var(--ink-primary)]">
                {forecast.wind?.speed ?? '--'} mph
              </p>
              <p className="text-xs text-[var(--ink-tertiary)]">Wind</p>
            </div>

            <div className="text-center p-3 bg-[var(--surface-secondary)] rounded-lg">
              <Droplets className="w-5 h-5 text-[var(--info)] mx-auto mb-1" />
              <p className="text-sm font-medium text-[var(--ink-primary)]">
                {forecast.humidity ?? '--'}%
              </p>
              <p className="text-xs text-[var(--ink-tertiary)]">Humidity</p>
            </div>

            <div className="text-center p-3 bg-[var(--surface-secondary)] rounded-lg">
              <Umbrella className="w-5 h-5 text-[var(--info)] mx-auto mb-1" />
              <p className="text-sm font-medium text-[var(--ink-primary)]">
                {forecast.precipitation?.chance ?? '--'}%
              </p>
              <p className="text-xs text-[var(--ink-tertiary)]">Rain</p>
            </div>

            <div className="text-center p-3 bg-[var(--surface-secondary)] rounded-lg">
              <Sun className="w-5 h-5 text-[var(--warning)] mx-auto mb-1" />
              <p className="text-sm font-medium text-[var(--ink-primary)]">
                {forecast.uvIndex ?? '--'}
              </p>
              <p className="text-xs text-[var(--ink-tertiary)]">UV Index</p>
            </div>
          </div>

          {/* Temperature Range */}
          {forecast.temperature && (
            <div className="flex items-center gap-3 text-sm text-[var(--ink-secondary)]">
              <Thermometer className="w-4 h-4" />
              <span>
                High: {forecast.temperature.high}°{forecast.temperature.unit} /
                Low: {forecast.temperature.low}°{forecast.temperature.unit}
              </span>
            </div>
          )}

          {/* Wind Direction */}
          {forecast.wind?.direction && (
            <div className="flex items-center gap-2 text-sm text-[var(--ink-secondary)]">
              <Wind className="w-4 h-4" />
              Wind from {forecast.wind.direction}
              {forecast.wind.gusts && ` (gusts to ${forecast.wind.gusts} mph)`}
            </div>
          )}

          {/* Sunrise/Sunset */}
          {(forecast.sunrise || forecast.sunset) && (
            <div className="flex items-center gap-4 text-sm text-[var(--ink-tertiary)]">
              {forecast.sunrise && <span>☀️ Sunrise: {forecast.sunrise}</span>}
              {forecast.sunset && <span>🌙 Sunset: {forecast.sunset}</span>}
            </div>
          )}

          {/* Recommendation */}
          <div className="p-3 rounded-lg border bg-[color:var(--info)]/10 border-[color:var(--info)]/25">
            <p className="text-sm text-[var(--ink-secondary)]">
              {getRecommendationText(weather ?? undefined)}
            </p>
          </div>

          {/* Refresh */}
          <div className="flex items-center justify-between text-xs text-[var(--ink-tertiary)]">
            <span>
              Updated: {weather?.lastUpdated ? new Date(weather.lastUpdated).toLocaleTimeString() : 'Unknown'}
            </span>
            <button
              type="button"
              onClick={fetchWeather}
              className="text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] flex items-center gap-1"
              aria-label="Refresh weather"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionWeatherPanel;
