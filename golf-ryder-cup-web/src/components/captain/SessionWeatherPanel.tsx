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

    // If no explicit coordinates, try to derive from course location
    if (!lat || !lng) {
      if (course?.location) {
        const coords = getCoordinatesFromLocation(course.location);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }
    }

    if (!lat || !lng) {
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
    if (!forecast) return <Cloud className="w-8 h-8 text-gray-400" />;

    const iconName = forecast.icon?.toLowerCase() || '';

    if (iconName.includes('snow') || forecast.precipitation?.type === 'snow') {
      return <CloudSnow className="w-8 h-8 text-blue-300" />;
    }
    if (forecast.precipitation?.chance && forecast.precipitation.chance > 50) {
      return <CloudRain className="w-8 h-8 text-blue-500" />;
    }
    if (iconName.includes('cloud') || iconName.includes('overcast')) {
      return <Cloud className="w-8 h-8 text-gray-500" />;
    }
    return <Sun className="w-8 h-8 text-yellow-500" />;
  };

  const _getPlayabilityColor = (forecast?: WeatherForecast) => {
    if (!forecast) return 'text-gray-500';

    const temp = forecast.temperature?.high || 70;
    const wind = forecast.wind?.speed || 0;
    const precip = forecast.precipitation?.chance || 0;

    // Perfect conditions
    if (temp >= 60 && temp <= 85 && wind < 15 && precip < 20) {
      return 'text-green-600 dark:text-green-400';
    }

    // Challenging but playable
    if (temp >= 45 && temp <= 95 && wind < 25 && precip < 50) {
      return 'text-yellow-600 dark:text-yellow-400';
    }

    // Difficult conditions
    return 'text-red-600 dark:text-red-400';
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
        return <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">Good to Go</span>;
      case 'monitor':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs rounded-full">Monitor</span>;
      case 'delay':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs rounded-full">Consider Delay</span>;
      case 'cancel':
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-full">Unfavorable</span>;
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
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-700 dark:text-yellow-400">{error}</span>
          </div>
          <button
            onClick={fetchWeather}
            className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded"
          >
            <RefreshCw className="w-4 h-4 text-yellow-600" />
          </button>
        </div>
      </div>
    );
  }

  const forecast = weather?.forecast;

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {getWeatherIcon(forecast)}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {forecast?.temperature?.high
                  ? `${Math.round(forecast.temperature.high)}°${forecast.temperature.unit || 'F'}`
                  : '--°F'}
              </span>
              {weather && getRecommendationBadge(weather.recommendation)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {session.name} • {formatSessionDate()}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
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
                  className={`p-3 rounded-lg ${alert.severity === 'severe'
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : alert.severity === 'moderate'
                      ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className={`w-4 h-4 ${alert.severity === 'severe' ? 'text-red-600' :
                      alert.severity === 'moderate' ? 'text-orange-600' : 'text-yellow-600'
                      }`} />
                    <span className="font-medium text-sm">{alert.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{alert.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Weather Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Wind className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {forecast.wind?.speed ?? '--'} mph
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Wind</p>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Droplets className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {forecast.humidity ?? '--'}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Humidity</p>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Umbrella className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {forecast.precipitation?.chance ?? '--'}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rain</p>
            </div>

            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Sun className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {forecast.uvIndex ?? '--'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">UV Index</p>
            </div>
          </div>

          {/* Temperature Range */}
          {forecast.temperature && (
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <Thermometer className="w-4 h-4" />
              <span>
                High: {forecast.temperature.high}°{forecast.temperature.unit} /
                Low: {forecast.temperature.low}°{forecast.temperature.unit}
              </span>
            </div>
          )}

          {/* Wind Direction */}
          {forecast.wind?.direction && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Wind className="w-4 h-4" />
              Wind from {forecast.wind.direction}
              {forecast.wind.gusts && ` (gusts to ${forecast.wind.gusts} mph)`}
            </div>
          )}

          {/* Sunrise/Sunset */}
          {(forecast.sunrise || forecast.sunset) && (
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {forecast.sunrise && <span>☀️ Sunrise: {forecast.sunrise}</span>}
              {forecast.sunset && <span>🌙 Sunset: {forecast.sunset}</span>}
            </div>
          )}

          {/* Recommendation */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 {getRecommendationText(weather ?? undefined)}
            </p>
          </div>

          {/* Refresh */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Updated: {weather?.lastUpdated ? new Date(weather.lastUpdated).toLocaleTimeString() : 'Unknown'}
            </span>
            <button
              onClick={fetchWeather}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
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
