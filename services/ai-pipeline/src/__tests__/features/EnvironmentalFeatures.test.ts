import { EnvironmentalFeatureExtractor, WeatherReading } from '../../features/EnvironmentalFeatures';

describe('EnvironmentalFeatureExtractor', () => {
  let extractor: EnvironmentalFeatureExtractor;
  let currentTime: Date;

  beforeEach(() => {
    extractor = new EnvironmentalFeatureExtractor();
    currentTime = new Date('2024-06-15T12:00:00Z'); // Summer solstice
  });

  describe('extractFeatures', () => {
    it('should extract basic environmental features', () => {
      const weatherData: WeatherReading[] = [
        {
          timestamp: new Date('2024-06-15T11:00:00Z'),
          temperature: 25,
          humidity: 60,
          pressure: 1013.25,
          rainfall: 0,
          wind_speed: 5,
          wind_direction: 180,
          solar_radiation: 800
        },
        {
          timestamp: new Date('2024-06-15T12:00:00Z'),
          temperature: 27,
          humidity: 55,
          pressure: 1012.8,
          rainfall: 2.5,
          wind_speed: 7,
          wind_direction: 190,
          solar_radiation: 850
        }
      ];

      const features = extractor.extractFeatures(weatherData, currentTime, -23.5);

      expect(features).toHaveProperty('rainfall_1h');
      expect(features).toHaveProperty('temperature_current');
      expect(features).toHaveProperty('humidity_current');
      expect(features).toHaveProperty('atmospheric_pressure');
      expect(features).toHaveProperty('wind_speed_current');
      expect(features).toHaveProperty('evapotranspiration_rate');
      expect(features).toHaveProperty('day_of_year');
      expect(features).toHaveProperty('season');

      expect(typeof features.rainfall_1h).toBe('number');
      expect(typeof features.temperature_current).toBe('number');
      expect(typeof features.evapotranspiration_rate).toBe('number');
    });

    it('should calculate rainfall accumulation correctly', () => {
      const weatherData: WeatherReading[] = [
        {
          timestamp: new Date('2024-06-15T10:00:00Z'),
          temperature: 25, humidity: 60, pressure: 1013, rainfall: 1.5,
          wind_speed: 5, wind_direction: 180
        },
        {
          timestamp: new Date('2024-06-15T11:00:00Z'),
          temperature: 25, humidity: 60, pressure: 1013, rainfall: 2.0,
          wind_speed: 5, wind_direction: 180
        },
        {
          timestamp: new Date('2024-06-15T12:00:00Z'),
          temperature: 25, humidity: 60, pressure: 1013, rainfall: 1.0,
          wind_speed: 5, wind_direction: 180
        }
      ];

      const features = extractor.extractFeatures(weatherData, currentTime, -23.5);

      expect(features.rainfall_1h).toBe(1.0); // Last hour only
      expect(features.rainfall_6h).toBe(4.5); // All three readings
    });

    it('should calculate temperature statistics correctly', () => {
      const weatherData: WeatherReading[] = [
        {
          timestamp: new Date('2024-06-15T08:00:00Z'),
          temperature: 20, humidity: 70, pressure: 1013, rainfall: 0,
          wind_speed: 3, wind_direction: 90
        },
        {
          timestamp: new Date('2024-06-15T12:00:00Z'),
          temperature: 30, humidity: 50, pressure: 1012, rainfall: 0,
          wind_speed: 8, wind_direction: 180
        },
        {
          timestamp: new Date('2024-06-15T16:00:00Z'),
          temperature: 25, humidity: 60, pressure: 1011, rainfall: 0,
          wind_speed: 5, wind_direction: 270
        }
      ];

      const features = extractor.extractFeatures(weatherData, currentTime, -23.5);

      expect(features.temperature_current).toBe(25); // Most recent
      expect(features.temperature_min_24h).toBe(20);
      expect(features.temperature_max_24h).toBe(30);
      expect(features.temperature_range_24h).toBe(10);
    });

    it('should detect freeze-thaw cycles', () => {
      const weatherData: WeatherReading[] = [];
      
      // Create temperature data that crosses freezing point
      for (let hour = 0; hour < 24; hour++) {
        weatherData.push({
          timestamp: new Date(currentTime.getTime() - (24 - hour) * 60 * 60 * 1000),
          temperature: Math.sin(hour * Math.PI / 12) * 10, // -10 to +10 degrees
          humidity: 60,
          pressure: 1013,
          rainfall: 0,
          wind_speed: 5,
          wind_direction: 180
        });
      }

      const features = extractor.extractFeatures(weatherData, currentTime, -23.5);

      expect(features.freeze_thaw_cycles_7d).toBeGreaterThan(0);
    });

    it('should calculate wind chill factor', () => {
      const coldWindyWeather: WeatherReading[] = [
        {
          timestamp: currentTime,
          temperature: -5, // Cold temperature
          humidity: 80,
          pressure: 1020,
          rainfall: 0,
          wind_speed: 15, // Strong wind
          wind_direction: 0
        }
      ];

      const features = extractor.extractFeatures(coldWindyWeather, currentTime, 45);

      expect(features.wind_chill_factor).toBeLessThan(-5); // Should be colder than air temp
    });

    it('should calculate antecedent precipitation index', () => {
      const weatherData: WeatherReading[] = [];
      
      // Create 30 days of weather data with varying rainfall
      for (let day = 0; day < 30; day++) {
        weatherData.push({
          timestamp: new Date(currentTime.getTime() - day * 24 * 60 * 60 * 1000),
          temperature: 20 + Math.random() * 10,
          humidity: 50 + Math.random() * 30,
          pressure: 1010 + Math.random() * 10,
          rainfall: Math.random() * 5, // 0-5mm random rainfall
          wind_speed: Math.random() * 10,
          wind_direction: Math.random() * 360
        });
      }

      const features = extractor.extractFeatures(weatherData, currentTime, -23.5);

      expect(features.antecedent_precipitation_index).toBeGreaterThan(0);
    });

    it('should calculate seasonal features correctly', () => {
      // Test summer solstice (Northern Hemisphere)
      const summerTime = new Date('2024-06-21T12:00:00Z');
      const features = extractor.extractFeatures([], summerTime, 45); // Northern latitude

      expect(features.season).toBe(2); // Summer
      expect(features.is_growing_season).toBe(true);
      expect(features.day_of_year).toBeCloseTo(173, 0); // Around day 173

      // Test winter solstice (Northern Hemisphere)
      const winterTime = new Date('2024-12-21T12:00:00Z');
      const winterFeatures = extractor.extractFeatures([], winterTime, 45);

      expect(winterFeatures.season).toBe(0); // Winter
      expect(winterFeatures.is_growing_season).toBe(false);
    });

    it('should handle Southern Hemisphere seasons', () => {
      const summerTime = new Date('2024-06-21T12:00:00Z');
      const features = extractor.extractFeatures([], summerTime, -23.5); // Southern latitude

      expect(features.season).toBe(0); // Winter in Southern Hemisphere
      expect(features.is_growing_season).toBe(false);
    });

    it('should calculate soil moisture index', () => {
      const wetWeather: WeatherReading[] = [];
      
      // Create wet conditions
      for (let day = 0; day < 7; day++) {
        wetWeather.push({
          timestamp: new Date(currentTime.getTime() - day * 24 * 60 * 60 * 1000),
          temperature: 15, // Cool temperature
          humidity: 90,
          pressure: 1005,
          rainfall: 10, // Heavy rain
          wind_speed: 5,
          wind_direction: 180
        });
      }

      const features = extractor.extractFeatures(wetWeather, currentTime, -23.5);

      expect(features.soil_moisture_index).toBeGreaterThan(0.5); // Should indicate wet conditions
    });

    it('should calculate weathering intensity index', () => {
      const extremeWeather: WeatherReading[] = [];
      
      // Create conditions conducive to weathering
      for (let hour = 0; hour < 168; hour++) { // 7 days
        extremeWeather.push({
          timestamp: new Date(currentTime.getTime() - hour * 60 * 60 * 1000),
          temperature: Math.sin(hour * Math.PI / 12) * 20, // Large temperature swings
          humidity: 80,
          pressure: 1010,
          rainfall: hour % 24 < 12 ? 5 : 0, // Rain every 12 hours
          wind_speed: 10,
          wind_direction: 180
        });
      }

      const features = extractor.extractFeatures(extremeWeather, currentTime, -23.5);

      expect(features.weathering_intensity_index).toBeGreaterThan(0);
      expect(features.thermal_stress_index).toBeGreaterThan(0);
    });

    it('should calculate evapotranspiration rate', () => {
      const hotDryWeather: WeatherReading[] = [
        {
          timestamp: currentTime,
          temperature: 35, // Hot
          humidity: 30, // Dry
          pressure: 1010,
          rainfall: 0,
          wind_speed: 10, // Windy
          wind_direction: 180,
          solar_radiation: 1000
        }
      ];

      const features = extractor.extractFeatures(hotDryWeather, currentTime, -23.5);

      expect(features.evapotranspiration_rate).toBeGreaterThan(0);
    });

    it('should handle empty weather data', () => {
      const features = extractor.extractFeatures([], currentTime, -23.5);

      expect(features.rainfall_1h).toBe(0);
      expect(features.temperature_current).toBe(20); // Default value
      expect(features.humidity_current).toBe(50); // Default value
      expect(features.day_of_year).toBeGreaterThan(0);
      expect(features.season).toBeGreaterThanOrEqual(0);
      expect(features.season).toBeLessThanOrEqual(3);
    });

    it('should calculate pressure trend', () => {
      const weatherData: WeatherReading[] = [
        {
          timestamp: new Date(currentTime.getTime() - 6 * 60 * 60 * 1000),
          temperature: 25, humidity: 60, pressure: 1020, rainfall: 0,
          wind_speed: 5, wind_direction: 180
        },
        {
          timestamp: currentTime,
          temperature: 25, humidity: 60, pressure: 1010, rainfall: 0,
          wind_speed: 5, wind_direction: 180
        }
      ];

      const features = extractor.extractFeatures(weatherData, currentTime, -23.5);

      expect(features.pressure_trend_6h).toBe(-10); // Falling pressure
    });

    it('should calculate days since last rain', () => {
      const dryWeather: WeatherReading[] = [];
      
      // Create 10 days of dry weather, then rain
      for (let day = 0; day < 15; day++) {
        dryWeather.push({
          timestamp: new Date(currentTime.getTime() - day * 24 * 60 * 60 * 1000),
          temperature: 25,
          humidity: 40,
          pressure: 1015,
          rainfall: day === 10 ? 5 : 0, // Rain 10 days ago
          wind_speed: 5,
          wind_direction: 180
        });
      }

      const features = extractor.extractFeatures(dryWeather, currentTime, -23.5);

      expect(features.days_since_last_rain).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme weather values', () => {
      const extremeWeather: WeatherReading[] = [
        {
          timestamp: currentTime,
          temperature: -50, // Extreme cold
          humidity: 100,
          pressure: 900, // Very low pressure
          rainfall: 100, // Heavy rain
          wind_speed: 50, // Hurricane force
          wind_direction: 360
        }
      ];

      const features = extractor.extractFeatures(extremeWeather, currentTime, -23.5);

      expect(features.temperature_current).toBe(-50);
      expect(features.wind_speed_current).toBe(50);
      expect(features.rainfall_1h).toBe(100);
      expect(isFinite(features.wind_chill_factor)).toBe(true);
    });

    it('should handle missing solar radiation data', () => {
      const weatherData: WeatherReading[] = [
        {
          timestamp: currentTime,
          temperature: 25,
          humidity: 60,
          pressure: 1013,
          rainfall: 0,
          wind_speed: 5,
          wind_direction: 180
          // No solar_radiation field
        }
      ];

      const features = extractor.extractFeatures(weatherData, currentTime, -23.5);

      expect(features.solar_radiation_index).toBeGreaterThanOrEqual(0);
      expect(features.solar_radiation_index).toBeLessThanOrEqual(1);
    });

    it('should handle zero wind speed for wind chill', () => {
      const calmWeather: WeatherReading[] = [
        {
          timestamp: currentTime,
          temperature: -10,
          humidity: 80,
          pressure: 1020,
          rainfall: 0,
          wind_speed: 0, // No wind
          wind_direction: 0
        }
      ];

      const features = extractor.extractFeatures(calmWeather, currentTime, 45);

      expect(features.wind_chill_factor).toBe(-10); // Should equal air temperature
    });
  });

  describe('performance', () => {
    it('should process large weather datasets efficiently', () => {
      const largeWeatherData: WeatherReading[] = [];
      
      // Create 1 year of hourly weather data
      for (let hour = 0; hour < 8760; hour++) {
        largeWeatherData.push({
          timestamp: new Date(currentTime.getTime() - hour * 60 * 60 * 1000),
          temperature: 20 + Math.sin(hour * 2 * Math.PI / 8760) * 15,
          humidity: 50 + Math.random() * 40,
          pressure: 1013 + Math.sin(hour * 2 * Math.PI / 24) * 5,
          rainfall: Math.random() < 0.1 ? Math.random() * 10 : 0,
          wind_speed: Math.random() * 15,
          wind_direction: Math.random() * 360
        });
      }

      const startTime = Date.now();
      const features = extractor.extractFeatures(largeWeatherData, currentTime, -23.5);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(features).toBeDefined();
    });
  });
});