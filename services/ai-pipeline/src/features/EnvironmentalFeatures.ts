export interface EnvironmentalFeatures {
  // Rainfall features
  rainfall_1h: number;
  rainfall_6h: number;
  rainfall_24h: number;
  rainfall_7d: number;
  rainfall_intensity_max_1h: number;
  antecedent_precipitation_index: number;
  days_since_last_rain: number;
  
  // Temperature features
  temperature_current: number;
  temperature_mean_24h: number;
  temperature_min_24h: number;
  temperature_max_24h: number;
  temperature_range_24h: number;
  freeze_thaw_cycles_7d: number;
  heating_degree_days: number;
  cooling_degree_days: number;
  
  // Humidity and atmospheric features
  humidity_current: number;
  humidity_mean_24h: number;
  atmospheric_pressure: number;
  pressure_trend_6h: number;
  
  // Wind features
  wind_speed_current: number;
  wind_speed_max_24h: number;
  wind_direction: number;
  wind_chill_factor: number;
  
  // Derived environmental indices
  evapotranspiration_rate: number;
  soil_moisture_index: number;
  weathering_intensity_index: number;
  thermal_stress_index: number;
  
  // Seasonal and temporal features
  day_of_year: number;
  season: number; // 0-3 for seasons
  is_growing_season: boolean;
  solar_radiation_index: number;
}

export interface WeatherReading {
  timestamp: Date;
  temperature: number; // Celsius
  humidity: number; // %
  pressure: number; // hPa
  rainfall: number; // mm
  wind_speed: number; // m/s
  wind_direction: number; // degrees
  solar_radiation?: number; // W/m²
}

export class EnvironmentalFeatureExtractor {
  private readonly freezingPoint: number = 0; // Celsius
  private readonly baseTemperature: number = 18; // Base temperature for degree days

  constructor() {}

  /**
   * Extract environmental features from weather data
   */
  public extractFeatures(
    weatherData: WeatherReading[],
    currentTime: Date,
    latitude: number = 0
  ): EnvironmentalFeatures {
    if (weatherData.length === 0) {
      return this.getDefaultFeatures(currentTime, latitude);
    }

    // Sort by timestamp
    const sortedData = weatherData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const current = sortedData[sortedData.length - 1];

    return {
      // Rainfall features
      rainfall_1h: this.calculateRainfallAccumulation(sortedData, currentTime, 1),
      rainfall_6h: this.calculateRainfallAccumulation(sortedData, currentTime, 6),
      rainfall_24h: this.calculateRainfallAccumulation(sortedData, currentTime, 24),
      rainfall_7d: this.calculateRainfallAccumulation(sortedData, currentTime, 168),
      rainfall_intensity_max_1h: this.calculateMaxRainfallIntensity(sortedData, currentTime, 1),
      antecedent_precipitation_index: this.calculateAntecedenPrecipitationIndex(sortedData, currentTime),
      days_since_last_rain: this.calculateDaysSinceLastRain(sortedData, currentTime),
      
      // Temperature features
      temperature_current: current.temperature,
      temperature_mean_24h: this.calculateTemperatureMean(sortedData, currentTime, 24),
      temperature_min_24h: this.calculateTemperatureMin(sortedData, currentTime, 24),
      temperature_max_24h: this.calculateTemperatureMax(sortedData, currentTime, 24),
      temperature_range_24h: this.calculateTemperatureRange(sortedData, currentTime, 24),
      freeze_thaw_cycles_7d: this.calculateFreezeThawCycles(sortedData, currentTime, 168),
      heating_degree_days: this.calculateHeatingDegreeDays(sortedData, currentTime, 24),
      cooling_degree_days: this.calculateCoolingDegreeDays(sortedData, currentTime, 24),
      
      // Humidity and atmospheric features
      humidity_current: current.humidity,
      humidity_mean_24h: this.calculateHumidityMean(sortedData, currentTime, 24),
      atmospheric_pressure: current.pressure,
      pressure_trend_6h: this.calculatePressureTrend(sortedData, currentTime, 6),
      
      // Wind features
      wind_speed_current: current.wind_speed,
      wind_speed_max_24h: this.calculateMaxWindSpeed(sortedData, currentTime, 24),
      wind_direction: current.wind_direction,
      wind_chill_factor: this.calculateWindChillFactor(current.temperature, current.wind_speed),
      
      // Derived indices
      evapotranspiration_rate: this.calculateEvapotranspirationRate(current, latitude),
      soil_moisture_index: this.calculateSoilMoistureIndex(sortedData, currentTime),
      weathering_intensity_index: this.calculateWeatheringIntensityIndex(sortedData, currentTime),
      thermal_stress_index: this.calculateThermalStressIndex(sortedData, currentTime),
      
      // Seasonal features
      day_of_year: this.getDayOfYear(currentTime),
      season: this.getSeason(currentTime, latitude),
      is_growing_season: this.isGrowingSeason(currentTime, latitude),
      solar_radiation_index: this.calculateSolarRadiationIndex(currentTime, latitude, current.solar_radiation)
    };
  }

  /**
   * Get time window data
   */
  private getTimeWindowData(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): WeatherReading[] {
    const cutoffTime = new Date(currentTime.getTime() - hoursBack * 60 * 60 * 1000);
    return weatherData.filter(reading => reading.timestamp >= cutoffTime && reading.timestamp <= currentTime);
  }

  /**
   * Calculate rainfall accumulation
   */
  private calculateRainfallAccumulation(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    return windowData.reduce((sum, reading) => sum + reading.rainfall, 0);
  }

  /**
   * Calculate maximum rainfall intensity
   */
  private calculateMaxRainfallIntensity(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    return Math.max(...windowData.map(reading => reading.rainfall));
  }

  /**
   * Calculate Antecedent Precipitation Index (API)
   */
  private calculateAntecedenPrecipitationIndex(weatherData: WeatherReading[], currentTime: Date): number {
    const days = 30; // 30-day API
    const decayFactor = 0.85; // Daily decay factor
    
    let api = 0;
    
    for (let day = 0; day < days; day++) {
      const dayStart = new Date(currentTime.getTime() - (day + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(currentTime.getTime() - day * 24 * 60 * 60 * 1000);
      
      const dayData = weatherData.filter(reading => 
        reading.timestamp >= dayStart && reading.timestamp < dayEnd
      );
      
      const dailyRainfall = dayData.reduce((sum, reading) => sum + reading.rainfall, 0);
      api += dailyRainfall * Math.pow(decayFactor, day);
    }
    
    return api;
  }

  /**
   * Calculate days since last significant rain
   */
  private calculateDaysSinceLastRain(weatherData: WeatherReading[], currentTime: Date): number {
    const significantRainThreshold = 1.0; // mm
    
    for (let day = 0; day < 365; day++) {
      const dayStart = new Date(currentTime.getTime() - (day + 1) * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(currentTime.getTime() - day * 24 * 60 * 60 * 1000);
      
      const dayData = weatherData.filter(reading => 
        reading.timestamp >= dayStart && reading.timestamp < dayEnd
      );
      
      const dailyRainfall = dayData.reduce((sum, reading) => sum + reading.rainfall, 0);
      
      if (dailyRainfall >= significantRainThreshold) {
        return day;
      }
    }
    
    return 365; // More than a year
  }

  /**
   * Calculate temperature statistics
   */
  private calculateTemperatureMean(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    return windowData.reduce((sum, reading) => sum + reading.temperature, 0) / windowData.length;
  }

  private calculateTemperatureMin(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    return Math.min(...windowData.map(reading => reading.temperature));
  }

  private calculateTemperatureMax(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    return Math.max(...windowData.map(reading => reading.temperature));
  }

  private calculateTemperatureRange(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const min = this.calculateTemperatureMin(weatherData, currentTime, hoursBack);
    const max = this.calculateTemperatureMax(weatherData, currentTime, hoursBack);
    return max - min;
  }

  /**
   * Calculate freeze-thaw cycles
   */
  private calculateFreezeThawCycles(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length < 2) return 0;
    
    let cycles = 0;
    let wasBelow = windowData[0].temperature < this.freezingPoint;
    
    for (let i = 1; i < windowData.length; i++) {
      const isBelow = windowData[i].temperature < this.freezingPoint;
      
      if (wasBelow && !isBelow) {
        cycles++; // Thaw event
      }
      
      wasBelow = isBelow;
    }
    
    return cycles;
  }

  /**
   * Calculate degree days
   */
  private calculateHeatingDegreeDays(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    const meanTemp = this.calculateTemperatureMean(weatherData, currentTime, hoursBack);
    return Math.max(0, this.baseTemperature - meanTemp) * (hoursBack / 24);
  }

  private calculateCoolingDegreeDays(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    const meanTemp = this.calculateTemperatureMean(weatherData, currentTime, hoursBack);
    return Math.max(0, meanTemp - this.baseTemperature) * (hoursBack / 24);
  }

  /**
   * Calculate humidity mean
   */
  private calculateHumidityMean(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    return windowData.reduce((sum, reading) => sum + reading.humidity, 0) / windowData.length;
  }

  /**
   * Calculate pressure trend
   */
  private calculatePressureTrend(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length < 2) return 0;
    
    const first = windowData[0];
    const last = windowData[windowData.length - 1];
    
    return last.pressure - first.pressure;
  }

  /**
   * Calculate maximum wind speed
   */
  private calculateMaxWindSpeed(weatherData: WeatherReading[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(weatherData, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    return Math.max(...windowData.map(reading => reading.wind_speed));
  }

  /**
   * Calculate wind chill factor
   */
  private calculateWindChillFactor(temperature: number, windSpeed: number): number {
    if (temperature > 10 || windSpeed < 4.8) {
      return temperature; // Wind chill not applicable
    }
    
    // Wind chill formula (Environment Canada)
    const windSpeedKmh = windSpeed * 3.6; // Convert m/s to km/h
    return 13.12 + 0.6215 * temperature - 11.37 * Math.pow(windSpeedKmh, 0.16) + 
           0.3965 * temperature * Math.pow(windSpeedKmh, 0.16);
  }

  /**
   * Calculate evapotranspiration rate (simplified Penman-Monteith)
   */
  private calculateEvapotranspirationRate(current: WeatherReading, _latitude: number): number {
    // Simplified ET calculation
    const temperature = current.temperature;
    const humidity = current.humidity;
    const windSpeed = current.wind_speed;
    
    // Saturation vapor pressure
    const es = 0.6108 * Math.exp(17.27 * temperature / (temperature + 237.3));
    
    // Actual vapor pressure
    const ea = es * humidity / 100;
    
    // Vapor pressure deficit
    const vpd = es - ea;
    
    // Simplified ET rate (mm/day)
    return Math.max(0, (0.0023 * (temperature + 17.8) * Math.sqrt(vpd) * (windSpeed + 1)) / 10);
  }

  /**
   * Calculate soil moisture index
   */
  private calculateSoilMoistureIndex(weatherData: WeatherReading[], currentTime: Date): number {
    const rainfall7d = this.calculateRainfallAccumulation(weatherData, currentTime, 168);
    const rainfall30d = this.calculateRainfallAccumulation(weatherData, currentTime, 720);
    const meanTemp7d = this.calculateTemperatureMean(weatherData, currentTime, 168);
    
    // Simplified soil moisture index
    const precipitation_factor = (rainfall7d * 0.7 + rainfall30d * 0.3) / 100;
    const temperature_factor = Math.max(0, 1 - meanTemp7d / 30);
    
    return Math.min(1, precipitation_factor * temperature_factor);
  }

  /**
   * Calculate weathering intensity index
   */
  private calculateWeatheringIntensityIndex(weatherData: WeatherReading[], currentTime: Date): number {
    const freezeThawCycles = this.calculateFreezeThawCycles(weatherData, currentTime, 168);
    const tempRange = this.calculateTemperatureRange(weatherData, currentTime, 168);
    const rainfall = this.calculateRainfallAccumulation(weatherData, currentTime, 168);
    
    // Combine factors that contribute to weathering
    const thermalStress = tempRange / 50; // Normalize to 0-1
    const freezeThawStress = freezeThawCycles / 10; // Normalize to 0-1
    const moistureStress = rainfall / 100; // Normalize to 0-1
    
    return Math.min(1, (thermalStress + freezeThawStress + moistureStress) / 3);
  }

  /**
   * Calculate thermal stress index
   */
  private calculateThermalStressIndex(weatherData: WeatherReading[], currentTime: Date): number {
    const tempRange24h = this.calculateTemperatureRange(weatherData, currentTime, 24);
    const tempRange7d = this.calculateTemperatureRange(weatherData, currentTime, 168);
    
    // Thermal stress increases with temperature range
    const dailyStress = Math.min(1, tempRange24h / 30);
    const weeklyStress = Math.min(1, tempRange7d / 50);
    
    return (dailyStress * 0.7 + weeklyStress * 0.3);
  }

  /**
   * Get day of year
   */
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get season (0=winter, 1=spring, 2=summer, 3=autumn)
   */
  private getSeason(date: Date, latitude: number): number {
    const month = date.getMonth();
    
    // Northern hemisphere seasons
    if (latitude >= 0) {
      if (month >= 2 && month <= 4) return 1; // Spring
      if (month >= 5 && month <= 7) return 2; // Summer
      if (month >= 8 && month <= 10) return 3; // Autumn
      return 0; // Winter
    } else {
      // Southern hemisphere (seasons reversed)
      if (month >= 2 && month <= 4) return 3; // Autumn
      if (month >= 5 && month <= 7) return 0; // Winter
      if (month >= 8 && month <= 10) return 1; // Spring
      return 2; // Summer
    }
  }

  /**
   * Check if it's growing season
   */
  private isGrowingSeason(date: Date, latitude: number): boolean {
    const season = this.getSeason(date, latitude);
    return season === 1 || season === 2; // Spring or Summer
  }

  /**
   * Calculate solar radiation index
   */
  private calculateSolarRadiationIndex(date: Date, latitude: number, solarRadiation?: number): number {
    if (solarRadiation !== undefined) {
      return Math.min(1, solarRadiation / 1000); // Normalize to 0-1
    }
    
    // Estimate based on day of year and latitude
    const dayOfYear = this.getDayOfYear(date);
    const declination = 23.45 * Math.sin(2 * Math.PI * (284 + dayOfYear) / 365) * Math.PI / 180;
    const latRad = latitude * Math.PI / 180;
    
    const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declination));
    const solarConstant = 1367; // W/m²
    
    const estimatedRadiation = solarConstant * (Math.sin(latRad) * Math.sin(declination) + 
                                               Math.cos(latRad) * Math.cos(declination) * Math.sin(hourAngle) / hourAngle);
    
    return Math.min(1, Math.max(0, estimatedRadiation / 1000));
  }

  /**
   * Get default features when no data is available
   */
  private getDefaultFeatures(currentTime: Date, latitude: number): EnvironmentalFeatures {
    return {
      rainfall_1h: 0, rainfall_6h: 0, rainfall_24h: 0, rainfall_7d: 0,
      rainfall_intensity_max_1h: 0, antecedent_precipitation_index: 0,
      days_since_last_rain: 365,
      temperature_current: 20, temperature_mean_24h: 20,
      temperature_min_24h: 15, temperature_max_24h: 25,
      temperature_range_24h: 10, freeze_thaw_cycles_7d: 0,
      heating_degree_days: 0, cooling_degree_days: 0,
      humidity_current: 50, humidity_mean_24h: 50,
      atmospheric_pressure: 1013.25, pressure_trend_6h: 0,
      wind_speed_current: 0, wind_speed_max_24h: 0,
      wind_direction: 0, wind_chill_factor: 20,
      evapotranspiration_rate: 0, soil_moisture_index: 0.5,
      weathering_intensity_index: 0, thermal_stress_index: 0,
      day_of_year: this.getDayOfYear(currentTime),
      season: this.getSeason(currentTime, latitude),
      is_growing_season: this.isGrowingSeason(currentTime, latitude),
      solar_radiation_index: this.calculateSolarRadiationIndex(currentTime, latitude)
    };
  }
}