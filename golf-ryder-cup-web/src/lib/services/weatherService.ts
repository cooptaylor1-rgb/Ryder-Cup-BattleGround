/**
 * Weather Service
 *
 * Provides weather data for golf courses using Open-Meteo API.
 * No API key required - free and open source.
 *
 * API: https://open-meteo.com/
 */

import { fetchWithTimeout, fetchWithRetry, FetchError } from '../utils/fetchWithTimeout';
import { createLogger } from '../utils/logger';

const logger = createLogger('Weather');
const WEATHER_API_BASE = 'https://api.open-meteo.com/v1';

// ============================================
// TYPES
// ============================================

export interface WeatherCondition {
    code: number;
    description: string;
    icon: string;
}

export interface CurrentWeather {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    windGust: number;
    condition: WeatherCondition;
    uvIndex: number;
    visibility: number;
    isDay: boolean;
    updatedAt: Date;
}

export interface HourlyForecast {
    time: Date;
    temperature: number;
    precipitation: number;
    precipitationProbability: number;
    condition: WeatherCondition;
    windSpeed: number;
    windGust: number;
}

export interface DailyForecast {
    date: Date;
    temperatureMax: number;
    temperatureMin: number;
    sunrise: Date;
    sunset: Date;
    precipitationSum: number;
    precipitationProbability: number;
    condition: WeatherCondition;
    windSpeedMax: number;
    uvIndexMax: number;
}

export interface GolfWeather {
    current: CurrentWeather;
    hourly: HourlyForecast[];
    daily: DailyForecast[];
    location: {
        latitude: number;
        longitude: number;
        timezone: string;
    };
    golfConditions: {
        overall: 'excellent' | 'good' | 'fair' | 'poor';
        score: number; // 0-100
        factors: {
            temperature: number;
            wind: number;
            precipitation: number;
            comfort: number;
        };
        recommendations: string[];
    };
}

// ============================================
// WEATHER CODE MAPPING
// ============================================

const WEATHER_CODES: Record<number, WeatherCondition> = {
    0: { code: 0, description: 'Clear sky', icon: 'sun' },
    1: { code: 1, description: 'Mainly clear', icon: 'sun' },
    2: { code: 2, description: 'Partly cloudy', icon: 'cloud-sun' },
    3: { code: 3, description: 'Overcast', icon: 'cloud' },
    45: { code: 45, description: 'Fog', icon: 'cloud-fog' },
    48: { code: 48, description: 'Depositing rime fog', icon: 'cloud-fog' },
    51: { code: 51, description: 'Light drizzle', icon: 'cloud-drizzle' },
    53: { code: 53, description: 'Moderate drizzle', icon: 'cloud-drizzle' },
    55: { code: 55, description: 'Dense drizzle', icon: 'cloud-drizzle' },
    61: { code: 61, description: 'Slight rain', icon: 'cloud-rain' },
    63: { code: 63, description: 'Moderate rain', icon: 'cloud-rain' },
    65: { code: 65, description: 'Heavy rain', icon: 'cloud-rain' },
    66: { code: 66, description: 'Light freezing rain', icon: 'cloud-hail' },
    67: { code: 67, description: 'Heavy freezing rain', icon: 'cloud-hail' },
    71: { code: 71, description: 'Slight snow', icon: 'cloud-snow' },
    73: { code: 73, description: 'Moderate snow', icon: 'cloud-snow' },
    75: { code: 75, description: 'Heavy snow', icon: 'cloud-snow' },
    77: { code: 77, description: 'Snow grains', icon: 'cloud-snow' },
    80: { code: 80, description: 'Slight rain showers', icon: 'cloud-rain' },
    81: { code: 81, description: 'Moderate rain showers', icon: 'cloud-rain' },
    82: { code: 82, description: 'Violent rain showers', icon: 'cloud-rain' },
    85: { code: 85, description: 'Slight snow showers', icon: 'cloud-snow' },
    86: { code: 86, description: 'Heavy snow showers', icon: 'cloud-snow' },
    95: { code: 95, description: 'Thunderstorm', icon: 'cloud-lightning' },
    96: { code: 96, description: 'Thunderstorm with hail', icon: 'cloud-lightning' },
    99: { code: 99, description: 'Thunderstorm with heavy hail', icon: 'cloud-lightning' },
};

function getWeatherCondition(code: number): WeatherCondition {
    return WEATHER_CODES[code] || { code, description: 'Unknown', icon: 'cloud' };
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch weather data for a location
 */
export async function getWeather(
    latitude: number,
    longitude: number,
    timezone?: string
): Promise<GolfWeather> {
    const tz = timezone || 'auto';

    const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        timezone: tz,
        // Current weather
        current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'weather_code',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m',
        ].join(','),
        // Hourly forecast (next 24 hours)
        hourly: [
            'temperature_2m',
            'precipitation',
            'precipitation_probability',
            'weather_code',
            'wind_speed_10m',
            'wind_gusts_10m',
        ].join(','),
        // Daily forecast (7 days)
        daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'sunrise',
            'sunset',
            'precipitation_sum',
            'precipitation_probability_max',
            'wind_speed_10m_max',
            'uv_index_max',
        ].join(','),
        forecast_days: '7',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
    });

    // Use fetchWithRetry for resilient weather fetching
    const response = await fetchWithRetry(`${WEATHER_API_BASE}/forecast?${params}`, {
        timeout: 8000, // 8 second timeout
        retries: 2,
    });

    if (!response.ok) {
        const error = new Error(`Weather API error: ${response.status}`);
        logger.error('Weather API returned error status', { status: response.status });
        throw error;
    }

    let data;
    try {
        data = await response.json();
    } catch (parseError) {
        logger.error('Failed to parse weather API response', { error: parseError });
        throw new Error('Invalid weather data received');
    }

    // Parse current weather
    const current: CurrentWeather = {
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        windDirection: data.current.wind_direction_10m,
        windGust: Math.round(data.current.wind_gusts_10m),
        condition: getWeatherCondition(data.current.weather_code),
        uvIndex: data.daily.uv_index_max[0] || 0,
        visibility: 10, // Open-Meteo doesn't provide visibility
        isDay: data.current.is_day === 1,
        updatedAt: new Date(),
    };

    // Parse hourly forecast (next 24 hours from current hour)
    const now = new Date();
    const currentHour = now.getHours();

    // Find the index of the current hour in the API response
    const hourlyStartIndex = data.hourly.time.findIndex((time: string) => {
        const hourTime = new Date(time);
        return hourTime.getHours() >= currentHour &&
            hourTime.getDate() === now.getDate() &&
            hourTime.getMonth() === now.getMonth();
    });

    // If we found the current hour, start from there; otherwise start from 0
    const startIdx = hourlyStartIndex >= 0 ? hourlyStartIndex : 0;

    const hourly: HourlyForecast[] = data.hourly.time
        .slice(startIdx, startIdx + 24)
        .map((time: string, i: number) => {
            const actualIndex = startIdx + i;
            // For the first entry ("Now"), use current temperature for consistency
            const temperature = i === 0
                ? Math.round(data.current.temperature_2m)
                : Math.round(data.hourly.temperature_2m[actualIndex]);
            const condition = i === 0
                ? getWeatherCondition(data.current.weather_code)
                : getWeatherCondition(data.hourly.weather_code[actualIndex]);
            return {
                time: new Date(time),
                temperature,
                precipitation: data.hourly.precipitation[actualIndex],
                precipitationProbability: data.hourly.precipitation_probability[actualIndex],
                condition,
                windSpeed: Math.round(data.hourly.wind_speed_10m[actualIndex]),
                windGust: Math.round(data.hourly.wind_gusts_10m[actualIndex]),
            };
        });

    // Parse daily forecast
    const daily: DailyForecast[] = data.daily.time.map((date: string, i: number) => ({
        date: new Date(date),
        temperatureMax: Math.round(data.daily.temperature_2m_max[i]),
        temperatureMin: Math.round(data.daily.temperature_2m_min[i]),
        sunrise: new Date(data.daily.sunrise[i]),
        sunset: new Date(data.daily.sunset[i]),
        precipitationSum: data.daily.precipitation_sum[i],
        precipitationProbability: data.daily.precipitation_probability_max[i],
        condition: getWeatherCondition(data.daily.weather_code[i]),
        windSpeedMax: Math.round(data.daily.wind_speed_10m_max[i]),
        uvIndexMax: data.daily.uv_index_max[i],
    }));

    // Calculate golf conditions
    const golfConditions = calculateGolfConditions(current, hourly);

    return {
        current,
        hourly,
        daily,
        location: {
            latitude,
            longitude,
            timezone: data.timezone,
        },
        golfConditions,
    };
}

// ============================================
// GOLF CONDITIONS CALCULATOR
// ============================================

function calculateGolfConditions(
    current: CurrentWeather,
    hourly: HourlyForecast[]
): GolfWeather['golfConditions'] {
    const recommendations: string[] = [];

    // Temperature score (ideal: 65-80°F)
    let tempScore = 100;
    if (current.temperature < 50) {
        tempScore = Math.max(0, 50 - (50 - current.temperature) * 5);
        recommendations.push('Dress in layers - it\'s cold out there!');
    } else if (current.temperature < 65) {
        tempScore = 70 + (current.temperature - 50) * 2;
        recommendations.push('Bring a light jacket for cooler moments');
    } else if (current.temperature > 95) {
        tempScore = Math.max(0, 100 - (current.temperature - 95) * 10);
        recommendations.push('Stay hydrated! It\'s very hot');
    } else if (current.temperature > 85) {
        tempScore = 100 - (current.temperature - 85) * 3;
        recommendations.push('Bring plenty of water');
    }

    // Wind score (ideal: < 10 mph)
    let windScore = 100;
    if (current.windSpeed > 25) {
        windScore = Math.max(0, 100 - (current.windSpeed - 10) * 5);
        recommendations.push('Very windy - club up and keep it low');
    } else if (current.windSpeed > 15) {
        windScore = 70 - (current.windSpeed - 15) * 3;
        recommendations.push('Moderate wind - adjust your club selection');
    } else if (current.windSpeed > 10) {
        windScore = 90 - (current.windSpeed - 10) * 4;
    }

    // Precipitation score
    let precipScore = 100;
    const nextFewHours = hourly.slice(0, 4);
    const maxPrecipProb = Math.max(...nextFewHours.map((h) => h.precipitationProbability));

    if (maxPrecipProb > 70) {
        precipScore = 20;
        recommendations.push('Rain likely - bring rain gear');
    } else if (maxPrecipProb > 40) {
        precipScore = 60;
        recommendations.push('Chance of rain - pack an umbrella');
    } else if (maxPrecipProb > 20) {
        precipScore = 80;
    }

    // Humidity/comfort score
    let comfortScore = 100;
    if (current.humidity > 80 && current.temperature > 75) {
        comfortScore = 60;
        recommendations.push('High humidity - take breaks in the shade');
    } else if (current.humidity > 90) {
        comfortScore = 70;
    }

    // UV recommendations
    if (current.uvIndex >= 8) {
        recommendations.push('Very high UV - wear sunscreen and a hat');
    } else if (current.uvIndex >= 6) {
        recommendations.push('High UV - apply sunscreen');
    }

    // Calculate overall score
    const overallScore = Math.round(
        tempScore * 0.3 + windScore * 0.3 + precipScore * 0.3 + comfortScore * 0.1
    );

    // Determine rating
    let overall: GolfWeather['golfConditions']['overall'];
    if (overallScore >= 80) overall = 'excellent';
    else if (overallScore >= 60) overall = 'good';
    else if (overallScore >= 40) overall = 'fair';
    else overall = 'poor';

    // Add positive recommendation if conditions are good
    if (overallScore >= 80 && recommendations.length === 0) {
        recommendations.push('Perfect conditions for golf!');
    }

    return {
        overall,
        score: overallScore,
        factors: {
            temperature: Math.round(tempScore),
            wind: Math.round(windScore),
            precipitation: Math.round(precipScore),
            comfort: Math.round(comfortScore),
        },
        recommendations,
    };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get wind direction as cardinal direction
 */
export function getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

/**
 * Format sunrise/sunset time
 */
export function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Get hours of daylight
 */
export function getDaylightHours(sunrise: Date, sunset: Date): number {
    return (sunset.getTime() - sunrise.getTime()) / (1000 * 60 * 60);
}

// ============================================
// SESSION WEATHER INTEGRATION
// ============================================

import type { SessionWeather, WeatherForecast, WeatherAlert } from '@/lib/types/captain';
import type { RyderCupSession, UUID } from '@/lib/types/models';

/**
 * Get weather forecast for a specific session
 */
export async function getSessionWeather(
    session: RyderCupSession,
    latitude: number,
    longitude: number
): Promise<SessionWeather> {
    try {
        const weather = await getWeather(latitude, longitude);

        // Find forecast for session date/time
        const sessionDate = session.scheduledDate ? new Date(session.scheduledDate) : new Date();
        const isAM = session.timeSlot === 'AM';
        const targetHour = isAM ? 9 : 14; // 9 AM or 2 PM

        sessionDate.setHours(targetHour, 0, 0, 0);

        // Find closest hourly forecast
        const closestHourly = weather.hourly.reduce((closest: typeof weather.hourly[0], h: typeof weather.hourly[0]) => {
            const diff = Math.abs(h.time.getTime() - sessionDate.getTime());
            const closestDiff = Math.abs(closest.time.getTime() - sessionDate.getTime());
            return diff < closestDiff ? h : closest;
        }, weather.hourly[0]);

        // Find daily forecast
        const targetDateStr = sessionDate.toDateString();
        const dailyForecast = weather.daily.find((d: typeof weather.daily[0]) => d.date.toDateString() === targetDateStr);

        const forecast: WeatherForecast = {
            date: sessionDate.toISOString(),
            timeSlot: session.timeSlot || 'AM',
            temperature: {
                high: dailyForecast?.temperatureMax || weather.current.temperature,
                low: dailyForecast?.temperatureMin || weather.current.temperature - 10,
                unit: 'F',
            },
            conditions: closestHourly.condition.description,
            icon: closestHourly.condition.icon,
            precipitation: {
                chance: closestHourly.precipitationProbability,
                type: closestHourly.precipitation > 0 ? 'rain' : undefined,
            },
            wind: {
                speed: closestHourly.windSpeed,
                direction: getWindDirection(weather.current.windDirection),
                gusts: closestHourly.windGust,
            },
            humidity: weather.current.humidity,
            uvIndex: weather.current.uvIndex,
            sunrise: dailyForecast ? formatTime(dailyForecast.sunrise) : undefined,
            sunset: dailyForecast ? formatTime(dailyForecast.sunset) : undefined,
        };

        // Generate alerts based on conditions
        const alerts: WeatherAlert[] = [];

        if (closestHourly.precipitationProbability > 70) {
            alerts.push({
                id: 'rain-likely',
                type: 'advisory',
                title: 'Rain Likely',
                description: `${closestHourly.precipitationProbability}% chance of precipitation`,
                severity: closestHourly.precipitationProbability > 90 ? 'severe' : 'moderate',
                startTime: sessionDate.toISOString(),
                endTime: new Date(sessionDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            });
        }

        if (closestHourly.windSpeed > 20) {
            alerts.push({
                id: 'high-wind',
                type: 'advisory',
                title: 'High Winds',
                description: `Winds ${Math.round(closestHourly.windSpeed)} mph with gusts to ${Math.round(closestHourly.windGust)} mph`,
                severity: closestHourly.windSpeed > 30 ? 'severe' : 'moderate',
                startTime: sessionDate.toISOString(),
                endTime: new Date(sessionDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            });
        }

        if (weather.current.uvIndex >= 8) {
            alerts.push({
                id: 'high-uv',
                type: 'advisory',
                title: 'High UV Index',
                description: 'UV index is very high. Sun protection recommended.',
                severity: 'minor',
                startTime: sessionDate.toISOString(),
                endTime: new Date(sessionDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            });
        }

        // Determine recommendation
        let recommendation: SessionWeather['recommendation'] = 'go';
        if (weather.golfConditions.score < 40) {
            recommendation = 'delay';
        } else if (weather.golfConditions.score < 60 || alerts.some(a => a.severity === 'severe')) {
            recommendation = 'monitor';
        }

        return {
            sessionId: session.id,
            forecast,
            alerts,
            recommendation,
            lastUpdated: new Date().toISOString(),
        };
    } catch (error) {
        // Return default/empty weather on error
        return {
            sessionId: session.id,
            forecast: {
                date: new Date().toISOString(),
                timeSlot: session.timeSlot || 'AM',
                temperature: { high: 72, low: 55, unit: 'F' },
                conditions: 'Unable to fetch weather',
                icon: 'cloud',
                precipitation: { chance: 0 },
                wind: { speed: 0, direction: 'N' },
                humidity: 50,
                uvIndex: 5,
            },
            alerts: [],
            recommendation: 'go',
            lastUpdated: new Date().toISOString(),
        };
    }
}

/**
 * Get weather summary text
 */
export function getWeatherSummary(forecast: WeatherForecast): string {
    const parts: string[] = [];

    parts.push(`${forecast.conditions}`);
    parts.push(`${forecast.temperature.high}°/${forecast.temperature.low}°`);

    if (forecast.precipitation.chance > 30) {
        parts.push(`${forecast.precipitation.chance}% rain`);
    }

    if (forecast.wind.speed > 10) {
        parts.push(`Wind ${Math.round(forecast.wind.speed)} mph`);
    }

    return parts.join(' • ');
}

/**
 * Get weather recommendation text
 */
export function getWeatherRecommendation(recommendation: SessionWeather['recommendation']): {
    text: string;
    color: string;
    icon: string;
} {
    switch (recommendation) {
        case 'go':
            return { text: 'Good to Go', color: 'green', icon: 'check-circle' };
        case 'monitor':
            return { text: 'Monitor Conditions', color: 'yellow', icon: 'alert-circle' };
        case 'delay':
            return { text: 'Consider Delay', color: 'orange', icon: 'clock' };
        case 'cancel':
            return { text: 'Cancellation Advised', color: 'red', icon: 'x-circle' };
        default:
            return { text: 'Unknown', color: 'gray', icon: 'help-circle' };
    }
}
