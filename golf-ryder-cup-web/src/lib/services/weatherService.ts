/**
 * Weather Service
 *
 * Provides weather data for golf courses using Open-Meteo API.
 * No API key required - free and open source.
 *
 * API: https://open-meteo.com/
 */

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

    const response = await fetch(`${WEATHER_API_BASE}/forecast?${params}`);

    if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

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

    // Parse hourly forecast (next 24 hours)
    const hourly: HourlyForecast[] = data.hourly.time
        .slice(0, 24)
        .map((time: string, i: number) => ({
            time: new Date(time),
            temperature: Math.round(data.hourly.temperature_2m[i]),
            precipitation: data.hourly.precipitation[i],
            precipitationProbability: data.hourly.precipitation_probability[i],
            condition: getWeatherCondition(data.hourly.weather_code[i]),
            windSpeed: Math.round(data.hourly.wind_speed_10m[i]),
            windGust: Math.round(data.hourly.wind_gusts_10m[i]),
        }));

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
