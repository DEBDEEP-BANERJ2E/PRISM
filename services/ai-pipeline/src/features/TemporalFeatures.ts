import { SensorReading } from '../../../../shared/models/dist/sensor';

export interface TemporalFeatures {
  // Rolling statistics
  mean_1h: number;
  mean_6h: number;
  mean_24h: number;
  std_1h: number;
  std_6h: number;
  std_24h: number;
  min_1h: number;
  max_1h: number;
  range_1h: number;
  
  // Derivatives and rates of change
  velocity_1h: number;
  velocity_6h: number;
  acceleration_1h: number;
  
  // Trend analysis
  trend_slope_6h: number;
  trend_slope_24h: number;
  trend_r2_6h: number;
  trend_r2_24h: number;
  
  // Variability measures
  coefficient_variation_1h: number;
  coefficient_variation_6h: number;
  
  // Anomaly indicators
  z_score_current: number;
  deviation_from_baseline: number;
  
  // Temporal patterns
  time_since_last_peak: number;
  time_since_last_anomaly: number;
  peak_frequency_24h: number;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  quality: number; // 0-1 quality score
}

export class TemporalFeatureExtractor {
  private readonly baselineWindow: number; // hours for baseline calculation
  private readonly anomalyThreshold: number; // z-score threshold for anomalies

  constructor(baselineWindow: number = 168, anomalyThreshold: number = 2.5) { // 1 week baseline
    this.baselineWindow = baselineWindow;
    this.anomalyThreshold = anomalyThreshold;
  }

  /**
   * Extract temporal features from time series data
   */
  public extractFeatures(
    timeSeries: TimeSeriesPoint[],
    currentTime: Date,
    measurementType: string = 'displacement'
  ): TemporalFeatures {
    // Sort by timestamp
    const sortedSeries = timeSeries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Filter by quality
    const qualityFiltered = sortedSeries.filter(point => point.quality > 0.5);
    
    if (qualityFiltered.length === 0) {
      return this.getDefaultFeatures();
    }

    const current = qualityFiltered[qualityFiltered.length - 1];
    
    return {
      // Rolling statistics
      mean_1h: this.calculateRollingMean(qualityFiltered, currentTime, 1),
      mean_6h: this.calculateRollingMean(qualityFiltered, currentTime, 6),
      mean_24h: this.calculateRollingMean(qualityFiltered, currentTime, 24),
      std_1h: this.calculateRollingStd(qualityFiltered, currentTime, 1),
      std_6h: this.calculateRollingStd(qualityFiltered, currentTime, 6),
      std_24h: this.calculateRollingStd(qualityFiltered, currentTime, 24),
      min_1h: this.calculateRollingMin(qualityFiltered, currentTime, 1),
      max_1h: this.calculateRollingMax(qualityFiltered, currentTime, 1),
      range_1h: this.calculateRollingRange(qualityFiltered, currentTime, 1),
      
      // Derivatives
      velocity_1h: this.calculateVelocity(qualityFiltered, currentTime, 1),
      velocity_6h: this.calculateVelocity(qualityFiltered, currentTime, 6),
      acceleration_1h: this.calculateAcceleration(qualityFiltered, currentTime, 1),
      
      // Trends
      trend_slope_6h: this.calculateTrendSlope(qualityFiltered, currentTime, 6),
      trend_slope_24h: this.calculateTrendSlope(qualityFiltered, currentTime, 24),
      trend_r2_6h: this.calculateTrendR2(qualityFiltered, currentTime, 6),
      trend_r2_24h: this.calculateTrendR2(qualityFiltered, currentTime, 24),
      
      // Variability
      coefficient_variation_1h: this.calculateCoefficientOfVariation(qualityFiltered, currentTime, 1),
      coefficient_variation_6h: this.calculateCoefficientOfVariation(qualityFiltered, currentTime, 6),
      
      // Anomaly indicators
      z_score_current: this.calculateZScore(qualityFiltered, current.value),
      deviation_from_baseline: this.calculateDeviationFromBaseline(qualityFiltered, current.value),
      
      // Temporal patterns
      time_since_last_peak: this.calculateTimeSinceLastPeak(qualityFiltered, currentTime),
      time_since_last_anomaly: this.calculateTimeSinceLastAnomaly(qualityFiltered, currentTime),
      peak_frequency_24h: this.calculatePeakFrequency(qualityFiltered, currentTime, 24)
    };
  }

  /**
   * Get time window data
   */
  private getTimeWindowData(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): TimeSeriesPoint[] {
    const cutoffTime = new Date(currentTime.getTime() - hoursBack * 60 * 60 * 1000);
    return timeSeries.filter(point => point.timestamp >= cutoffTime && point.timestamp <= currentTime);
  }

  /**
   * Calculate rolling mean
   */
  private calculateRollingMean(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    const sum = windowData.reduce((acc, point) => acc + point.value, 0);
    return sum / windowData.length;
  }

  /**
   * Calculate rolling standard deviation
   */
  private calculateRollingStd(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length < 2) return 0;
    
    const mean = this.calculateRollingMean(timeSeries, currentTime, hoursBack);
    const variance = windowData.reduce((acc, point) => acc + Math.pow(point.value - mean, 2), 0) / windowData.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate rolling minimum
   */
  private calculateRollingMin(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    return Math.min(...windowData.map(point => point.value));
  }

  /**
   * Calculate rolling maximum
   */
  private calculateRollingMax(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    return Math.max(...windowData.map(point => point.value));
  }

  /**
   * Calculate rolling range
   */
  private calculateRollingRange(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length === 0) return 0;
    
    const min = Math.min(...windowData.map(point => point.value));
    const max = Math.max(...windowData.map(point => point.value));
    return max - min;
  }

  /**
   * Calculate velocity (rate of change)
   */
  private calculateVelocity(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length < 2) return 0;
    
    const first = windowData[0];
    const last = windowData[windowData.length - 1];
    const timeDiff = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60 * 60); // hours
    
    if (timeDiff === 0) return 0;
    return (last.value - first.value) / timeDiff;
  }

  /**
   * Calculate acceleration (rate of change of velocity)
   */
  private calculateAcceleration(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const halfWindow = hoursBack / 2;
    const velocity1 = this.calculateVelocity(timeSeries, new Date(currentTime.getTime() - halfWindow * 60 * 60 * 1000), halfWindow);
    const velocity2 = this.calculateVelocity(timeSeries, currentTime, halfWindow);
    
    return (velocity2 - velocity1) / halfWindow;
  }

  /**
   * Calculate trend slope using linear regression
   */
  private calculateTrendSlope(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length < 2) return 0;
    
    const n = windowData.length;
    const baseTime = windowData[0].timestamp.getTime();
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (const point of windowData) {
      const x = (point.timestamp.getTime() - baseTime) / (1000 * 60 * 60); // hours from start
      const y = point.value;
      
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denominator;
  }

  /**
   * Calculate R-squared for trend
   */
  private calculateTrendR2(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length < 2) return 0;
    
    const slope = this.calculateTrendSlope(timeSeries, currentTime, hoursBack);
    const mean = windowData.reduce((acc, point) => acc + point.value, 0) / windowData.length;
    const baseTime = windowData[0].timestamp.getTime();
    
    let ssRes = 0, ssTot = 0;
    
    for (const point of windowData) {
      const x = (point.timestamp.getTime() - baseTime) / (1000 * 60 * 60);
      const predicted = slope * x + windowData[0].value;
      
      ssRes += Math.pow(point.value - predicted, 2);
      ssTot += Math.pow(point.value - mean, 2);
    }
    
    if (ssTot === 0) return 1;
    return 1 - (ssRes / ssTot);
  }

  /**
   * Calculate coefficient of variation
   */
  private calculateCoefficientOfVariation(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const mean = this.calculateRollingMean(timeSeries, currentTime, hoursBack);
    const std = this.calculateRollingStd(timeSeries, currentTime, hoursBack);
    
    if (mean === 0) return 0;
    return std / Math.abs(mean);
  }

  /**
   * Calculate z-score for current value
   */
  private calculateZScore(timeSeries: TimeSeriesPoint[], currentValue: number): number {
    if (timeSeries.length < 2) return 0;
    
    const values = timeSeries.map(point => point.value);
    const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
    const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);
    
    if (std === 0) return 0;
    return (currentValue - mean) / std;
  }

  /**
   * Calculate deviation from baseline
   */
  private calculateDeviationFromBaseline(timeSeries: TimeSeriesPoint[], currentValue: number): number {
    if (timeSeries.length === 0) return 0;
    
    // Use first part of time series as baseline
    const baselineSize = Math.min(Math.floor(timeSeries.length * 0.2), 100);
    const baseline = timeSeries.slice(0, baselineSize);
    
    if (baseline.length === 0) return 0;
    
    const baselineMean = baseline.reduce((acc, point) => acc + point.value, 0) / baseline.length;
    return currentValue - baselineMean;
  }

  /**
   * Calculate time since last peak
   */
  private calculateTimeSinceLastPeak(timeSeries: TimeSeriesPoint[], currentTime: Date): number {
    if (timeSeries.length < 3) return Infinity;
    
    // Find peaks (local maxima)
    const peaks: TimeSeriesPoint[] = [];
    
    for (let i = 1; i < timeSeries.length - 1; i++) {
      if (timeSeries[i].value > timeSeries[i-1].value && 
          timeSeries[i].value > timeSeries[i+1].value) {
        peaks.push(timeSeries[i]);
      }
    }
    
    if (peaks.length === 0) return Infinity;
    
    const lastPeak = peaks[peaks.length - 1];
    return (currentTime.getTime() - lastPeak.timestamp.getTime()) / (1000 * 60 * 60); // hours
  }

  /**
   * Calculate time since last anomaly
   */
  private calculateTimeSinceLastAnomaly(timeSeries: TimeSeriesPoint[], currentTime: Date): number {
    if (timeSeries.length < 2) return Infinity;
    
    // Find anomalies based on z-score
    const anomalies: TimeSeriesPoint[] = [];
    
    for (const point of timeSeries) {
      const zScore = this.calculateZScore(timeSeries, point.value);
      if (Math.abs(zScore) > this.anomalyThreshold) {
        anomalies.push(point);
      }
    }
    
    if (anomalies.length === 0) return Infinity;
    
    const lastAnomaly = anomalies[anomalies.length - 1];
    return (currentTime.getTime() - lastAnomaly.timestamp.getTime()) / (1000 * 60 * 60); // hours
  }

  /**
   * Calculate peak frequency
   */
  private calculatePeakFrequency(timeSeries: TimeSeriesPoint[], currentTime: Date, hoursBack: number): number {
    const windowData = this.getTimeWindowData(timeSeries, currentTime, hoursBack);
    if (windowData.length < 3) return 0;
    
    // Count peaks in window
    let peakCount = 0;
    
    for (let i = 1; i < windowData.length - 1; i++) {
      if (windowData[i].value > windowData[i-1].value && 
          windowData[i].value > windowData[i+1].value) {
        peakCount++;
      }
    }
    
    return peakCount / hoursBack; // peaks per hour
  }

  /**
   * Get default features when no data is available
   */
  private getDefaultFeatures(): TemporalFeatures {
    return {
      mean_1h: 0, mean_6h: 0, mean_24h: 0,
      std_1h: 0, std_6h: 0, std_24h: 0,
      min_1h: 0, max_1h: 0, range_1h: 0,
      velocity_1h: 0, velocity_6h: 0, acceleration_1h: 0,
      trend_slope_6h: 0, trend_slope_24h: 0,
      trend_r2_6h: 0, trend_r2_24h: 0,
      coefficient_variation_1h: 0, coefficient_variation_6h: 0,
      z_score_current: 0, deviation_from_baseline: 0,
      time_since_last_peak: Infinity, time_since_last_anomaly: Infinity,
      peak_frequency_24h: 0
    };
  }

  /**
   * Extract features from sensor readings
   */
  public extractFromSensorReadings(
    readings: SensorReading[],
    measurementKey: string,
    currentTime: Date
  ): TemporalFeatures {
    const timeSeries: TimeSeriesPoint[] = readings.map(reading => ({
      timestamp: reading.timestamp,
      value: reading.measurements[measurementKey] || 0,
      quality: reading.quality_flags[measurementKey] ? 1 : 0.5
    }));

    return this.extractFeatures(timeSeries, currentTime, measurementKey);
  }

  /**
   * Extract features for multiple measurement types
   */
  public extractMultiMeasurementFeatures(
    readings: SensorReading[],
    measurementKeys: string[],
    currentTime: Date
  ): Map<string, TemporalFeatures> {
    const features = new Map<string, TemporalFeatures>();

    for (const key of measurementKeys) {
      features.set(key, this.extractFromSensorReadings(readings, key, currentTime));
    }

    return features;
  }
}