import { SensorReading } from './SensorReading';

/**
 * Time series data point interface
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  quality?: number;
  metadata?: Record<string, any>;
}

/**
 * Time series aggregation types
 */
export type AggregationType = 'mean' | 'median' | 'min' | 'max' | 'sum' | 'count' | 'stddev';

/**
 * Time series resampling intervals
 */
export type ResampleInterval = '1s' | '1m' | '5m' | '15m' | '1h' | '6h' | '12h' | '1d' | '1w';

/**
 * Utility functions for time series data processing
 */
export class TimeSeriesUtils {
  
  /**
   * Convert sensor readings to time series points
   */
  public static sensorReadingsToTimeSeries(
    readings: SensorReading[], 
    measurementName: string
  ): TimeSeriesPoint[] {
    const points: TimeSeriesPoint[] = [];
    
    for (const reading of readings) {
      const measurement = reading.getMeasurement(measurementName);
      if (measurement) {
        points.push({
          timestamp: reading.timestamp,
          value: measurement.value,
          quality: reading.getQualityScore(),
          metadata: {
            sensor_id: reading.sensor_id,
            sensor_type: reading.sensor_type,
            unit: measurement.unit
          }
        });
      }
    }
    
    return points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Resample time series data to a specific interval
   */
  public static resample(
    points: TimeSeriesPoint[],
    interval: ResampleInterval,
    aggregation: AggregationType = 'mean'
  ): TimeSeriesPoint[] {
    if (points.length === 0) return [];

    const intervalMs = this.parseInterval(interval);
    const startTime = new Date(Math.floor(points[0].timestamp.getTime() / intervalMs) * intervalMs);
    const endTime = points[points.length - 1].timestamp;
    
    const resampled: TimeSeriesPoint[] = [];
    let currentTime = startTime;
    
    while (currentTime <= endTime) {
      const nextTime = new Date(currentTime.getTime() + intervalMs);
      const windowPoints = points.filter(p => 
        p.timestamp >= currentTime && p.timestamp < nextTime
      );
      
      if (windowPoints.length > 0) {
        const aggregatedValue = this.aggregate(windowPoints.map(p => p.value), aggregation);
        const avgQuality = windowPoints.reduce((sum, p) => sum + (p.quality || 1), 0) / windowPoints.length;
        
        resampled.push({
          timestamp: new Date(currentTime),
          value: aggregatedValue,
          quality: avgQuality,
          metadata: {
            count: windowPoints.length,
            aggregation
          }
        });
      }
      
      currentTime = nextTime;
    }
    
    return resampled;
  }

  /**
   * Fill missing values in time series using interpolation
   */
  public static fillMissing(
    points: TimeSeriesPoint[],
    method: 'linear' | 'forward' | 'backward' | 'zero' = 'linear'
  ): TimeSeriesPoint[] {
    if (points.length < 2) return points;

    const filled: TimeSeriesPoint[] = [];
    
    for (let i = 0; i < points.length; i++) {
      filled.push(points[i]);
      
      if (i < points.length - 1) {
        const current = points[i];
        const next = points[i + 1];
        const timeDiff = next.timestamp.getTime() - current.timestamp.getTime();
        
        // If there's a significant gap, fill it
        if (timeDiff > 2 * 60 * 1000) { // More than 2 minutes
          const steps = Math.floor(timeDiff / (60 * 1000)); // 1-minute intervals
          
          for (let step = 1; step < steps; step++) {
            const interpolatedTime = new Date(current.timestamp.getTime() + step * 60 * 1000);
            let interpolatedValue: number;
            
            switch (method) {
              case 'linear':
                const ratio = step / steps;
                interpolatedValue = current.value + ratio * (next.value - current.value);
                break;
              case 'forward':
                interpolatedValue = current.value;
                break;
              case 'backward':
                interpolatedValue = next.value;
                break;
              case 'zero':
                interpolatedValue = 0;
                break;
            }
            
            filled.push({
              timestamp: interpolatedTime,
              value: interpolatedValue,
              quality: 0.5, // Lower quality for interpolated values
              metadata: { interpolated: true, method }
            });
          }
        }
      }
    }
    
    return filled;
  }

  /**
   * Detect anomalies in time series data using statistical methods
   */
  public static detectAnomalies(
    points: TimeSeriesPoint[],
    method: 'zscore' | 'iqr' | 'isolation' = 'zscore',
    threshold: number = 3
  ): { point: TimeSeriesPoint; anomalyScore: number }[] {
    if (points.length < 10) return []; // Need sufficient data

    const values = points.map(p => p.value);
    const anomalies: { point: TimeSeriesPoint; anomalyScore: number }[] = [];

    switch (method) {
      case 'zscore':
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stddev = Math.sqrt(
          values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        );
        
        points.forEach(point => {
          const zscore = Math.abs((point.value - mean) / stddev);
          if (zscore > threshold) {
            anomalies.push({ point, anomalyScore: zscore });
          }
        });
        break;

      case 'iqr':
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - threshold * iqr;
        const upperBound = q3 + threshold * iqr;
        
        points.forEach(point => {
          if (point.value < lowerBound || point.value > upperBound) {
            const score = Math.max(
              Math.abs(point.value - lowerBound) / iqr,
              Math.abs(point.value - upperBound) / iqr
            );
            anomalies.push({ point, anomalyScore: score });
          }
        });
        break;
    }

    return anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore);
  }

  /**
   * Calculate rolling statistics for time series
   */
  public static rollingStatistics(
    points: TimeSeriesPoint[],
    windowSize: number,
    statistic: AggregationType = 'mean'
  ): TimeSeriesPoint[] {
    if (points.length < windowSize) return [];

    const result: TimeSeriesPoint[] = [];
    
    for (let i = windowSize - 1; i < points.length; i++) {
      const window = points.slice(i - windowSize + 1, i + 1);
      const values = window.map(p => p.value);
      const aggregatedValue = this.aggregate(values, statistic);
      
      result.push({
        timestamp: points[i].timestamp,
        value: aggregatedValue,
        quality: window.reduce((sum, p) => sum + (p.quality || 1), 0) / window.length,
        metadata: {
          window_size: windowSize,
          statistic
        }
      });
    }
    
    return result;
  }

  /**
   * Calculate correlation between two time series
   */
  public static correlation(series1: TimeSeriesPoint[], series2: TimeSeriesPoint[]): number {
    // Align time series by timestamp
    const aligned = this.alignTimeSeries([series1, series2]);
    if (aligned[0].length < 2) return 0;

    const values1 = aligned[0].map(p => p.value);
    const values2 = aligned[1].map(p => p.value);

    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;

    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Align multiple time series by timestamp (inner join)
   */
  public static alignTimeSeries(seriesList: TimeSeriesPoint[][]): TimeSeriesPoint[][] {
    if (seriesList.length === 0) return [];

    // Find common timestamps
    const timestampSets = seriesList.map(series => 
      new Set(series.map(p => p.timestamp.getTime()))
    );
    
    const commonTimestamps = timestampSets.reduce((common, current) => 
      new Set([...common].filter(ts => current.has(ts)))
    );

    // Extract points for common timestamps
    return seriesList.map(series => 
      series.filter(p => commonTimestamps.has(p.timestamp.getTime()))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    );
  }

  /**
   * Parse interval string to milliseconds
   */
  private static parseInterval(interval: ResampleInterval): number {
    const intervalMap: Record<ResampleInterval, number> = {
      '1s': 1000,
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    
    return intervalMap[interval];
  }

  /**
   * Aggregate values using specified method
   */
  private static aggregate(values: number[], method: AggregationType): number {
    if (values.length === 0) return 0;

    switch (method) {
      case 'mean':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      
      case 'median':
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
          ? (sorted[mid - 1] + sorted[mid]) / 2 
          : sorted[mid];
      
      case 'min':
        return Math.min(...values);
      
      case 'max':
        return Math.max(...values);
      
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      
      case 'count':
        return values.length;
      
      case 'stddev':
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      
      default:
        return 0;
    }
  }
}