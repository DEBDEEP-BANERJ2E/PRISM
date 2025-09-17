export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  quality: number;
  sensor_id: string;
  measurement_type: string;
}

export interface PreprocessingConfig {
  target_sampling_rate_minutes: number;
  interpolation_method: 'linear' | 'cubic' | 'nearest';
  outlier_detection_method: 'zscore' | 'iqr' | 'isolation_forest';
  outlier_threshold: number;
  missing_data_threshold: number; // Maximum percentage of missing data allowed
  normalization_method: 'minmax' | 'zscore' | 'robust';
}

export interface PreprocessedData {
  original_data: TimeSeriesData[];
  processed_data: TimeSeriesData[];
  metadata: {
    original_count: number;
    processed_count: number;
    outliers_removed: number;
    missing_values_imputed: number;
    quality_score: number;
    processing_time_ms: number;
  };
}

export class DataPreprocessor {
  private config: PreprocessingConfig;

  constructor(config: PreprocessingConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Main preprocessing pipeline
   */
  public async preprocess(data: TimeSeriesData[]): Promise<PreprocessedData> {
    const startTime = Date.now();
    
    if (data.length === 0) {
      return this.createEmptyResult(data, startTime);
    }

    // Sort by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Step 1: Remove outliers
    const outlierFreeData = this.removeOutliers(sortedData);
    const outliersRemoved = sortedData.length - outlierFreeData.length;

    // Step 2: Align timestamps and resample
    const alignedData = this.alignTimestamps(outlierFreeData);

    // Step 3: Impute missing values
    const imputedData = this.imputeMissingValues(alignedData);
    const missingValuesImputed = this.countImputedValues(alignedData, imputedData);

    // Step 4: Normalize data
    const normalizedData = this.normalizeData(imputedData);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(data, normalizedData);

    const processingTime = Date.now() - startTime;

    return {
      original_data: data,
      processed_data: normalizedData,
      metadata: {
        original_count: data.length,
        processed_count: normalizedData.length,
        outliers_removed: outliersRemoved,
        missing_values_imputed: missingValuesImputed,
        quality_score: qualityScore,
        processing_time_ms: processingTime
      }
    };
  }

  /**
   * Remove outliers using specified method
   */
  private removeOutliers(data: TimeSeriesData[]): TimeSeriesData[] {
    if (data.length < 3) return data;

    switch (this.config.outlier_detection_method) {
      case 'zscore':
        return this.removeOutliersZScore(data);
      case 'iqr':
        return this.removeOutliersIQR(data);
      case 'isolation_forest':
        return this.removeOutliersIsolationForest(data);
      default:
        return data;
    }
  }

  /**
   * Remove outliers using Z-score method
   */
  private removeOutliersZScore(data: TimeSeriesData[]): TimeSeriesData[] {
    const validValues = data.filter(d => !isNaN(d.value)).map(d => d.value);
    
    if (validValues.length < 3) return data; // Need at least 3 points for meaningful outlier detection
    
    const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    const std = Math.sqrt(validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validValues.length);

    if (std === 0) return data;

    return data.filter(d => {
      if (isNaN(d.value)) return true; // Keep NaN values for later imputation
      const zScore = Math.abs((d.value - mean) / std);
      return zScore <= this.config.outlier_threshold;
    });
  }

  /**
   * Remove outliers using Interquartile Range (IQR) method
   */
  private removeOutliersIQR(data: TimeSeriesData[]): TimeSeriesData[] {
    const validValues = data.filter(d => !isNaN(d.value)).map(d => d.value).sort((a, b) => a - b);
    
    if (validValues.length < 4) return data; // Need at least 4 points for quartiles
    
    const q1Index = Math.floor(validValues.length * 0.25);
    const q3Index = Math.floor(validValues.length * 0.75);
    
    const q1 = validValues[q1Index];
    const q3 = validValues[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.filter(d => {
      if (isNaN(d.value)) return true; // Keep NaN values for later imputation
      return d.value >= lowerBound && d.value <= upperBound;
    });
  }

  /**
   * Remove outliers using simplified Isolation Forest method
   */
  private removeOutliersIsolationForest(data: TimeSeriesData[]): TimeSeriesData[] {
    // Simplified implementation - in practice would use a proper isolation forest
    // For now, use a combination of statistical methods
    const zScoreFiltered = this.removeOutliersZScore(data);
    return this.removeOutliersIQR(zScoreFiltered);
  }

  /**
   * Align timestamps to regular intervals
   */
  private alignTimestamps(data: TimeSeriesData[]): TimeSeriesData[] {
    if (data.length === 0) return data;

    const startTime = data[0].timestamp;
    const endTime = data[data.length - 1].timestamp;
    const intervalMs = this.config.target_sampling_rate_minutes * 60 * 1000;

    const alignedData: TimeSeriesData[] = [];
    
    for (let time = startTime.getTime(); time <= endTime.getTime(); time += intervalMs) {
      const targetTime = new Date(time);
      
      // Find the closest data point
      let closestPoint = data[0];
      let minTimeDiff = Math.abs(data[0].timestamp.getTime() - time);

      for (const point of data) {
        const timeDiff = Math.abs(point.timestamp.getTime() - time);
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestPoint = point;
        }
      }

      // Only include if within reasonable time window (half the sampling interval)
      if (minTimeDiff <= intervalMs / 2) {
        alignedData.push({
          ...closestPoint,
          timestamp: targetTime
        });
      } else {
        // Create placeholder for missing data
        alignedData.push({
          timestamp: targetTime,
          value: NaN,
          quality: 0,
          sensor_id: closestPoint.sensor_id,
          measurement_type: closestPoint.measurement_type
        });
      }
    }

    return alignedData;
  }

  /**
   * Impute missing values
   */
  private imputeMissingValues(data: TimeSeriesData[]): TimeSeriesData[] {
    const result = [...data];
    
    for (let i = 0; i < result.length; i++) {
      if (isNaN(result[i].value) || result[i].quality === 0) {
        result[i] = {
          ...result[i],
          value: this.interpolateValue(data, i),
          quality: 0.5 // Mark as imputed
        };
      }
    }

    return result;
  }

  /**
   * Interpolate missing value at given index
   */
  private interpolateValue(data: TimeSeriesData[], index: number): number {
    switch (this.config.interpolation_method) {
      case 'linear':
        return this.linearInterpolation(data, index);
      case 'cubic':
        return this.cubicInterpolation(data, index);
      case 'nearest':
        return this.nearestNeighborInterpolation(data, index);
      default:
        return this.linearInterpolation(data, index);
    }
  }

  /**
   * Linear interpolation
   */
  private linearInterpolation(data: TimeSeriesData[], index: number): number {
    // Find nearest valid points before and after
    let beforeIndex = -1;
    let afterIndex = -1;

    for (let i = index - 1; i >= 0; i--) {
      if (!isNaN(data[i].value) && data[i].quality > 0) {
        beforeIndex = i;
        break;
      }
    }

    for (let i = index + 1; i < data.length; i++) {
      if (!isNaN(data[i].value) && data[i].quality > 0) {
        afterIndex = i;
        break;
      }
    }

    if (beforeIndex === -1 && afterIndex === -1) {
      return 0; // No valid data points
    }

    if (beforeIndex === -1) {
      return data[afterIndex].value; // Use next valid point
    }

    if (afterIndex === -1) {
      return data[beforeIndex].value; // Use previous valid point
    }

    // Linear interpolation
    const x0 = data[beforeIndex].timestamp.getTime();
    const x1 = data[afterIndex].timestamp.getTime();
    const y0 = data[beforeIndex].value;
    const y1 = data[afterIndex].value;
    const x = data[index].timestamp.getTime();

    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }

  /**
   * Cubic interpolation (simplified)
   */
  private cubicInterpolation(data: TimeSeriesData[], index: number): number {
    // Simplified cubic interpolation - in practice would use proper spline interpolation
    return this.linearInterpolation(data, index);
  }

  /**
   * Nearest neighbor interpolation
   */
  private nearestNeighborInterpolation(data: TimeSeriesData[], index: number): number {
    const targetTime = data[index].timestamp.getTime();
    let nearestValue = 0;
    let minTimeDiff = Infinity;

    for (const point of data) {
      if (!isNaN(point.value) && point.quality > 0) {
        const timeDiff = Math.abs(point.timestamp.getTime() - targetTime);
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          nearestValue = point.value;
        }
      }
    }

    return nearestValue;
  }

  /**
   * Normalize data using specified method
   */
  private normalizeData(data: TimeSeriesData[]): TimeSeriesData[] {
    const values = data.map(d => d.value).filter(v => !isNaN(v));
    
    if (values.length === 0) return data;

    let normalizedValues: number[];

    switch (this.config.normalization_method) {
      case 'minmax':
        normalizedValues = this.minMaxNormalization(values);
        break;
      case 'zscore':
        normalizedValues = this.zScoreNormalization(values);
        break;
      case 'robust':
        normalizedValues = this.robustNormalization(values);
        break;
      default:
        normalizedValues = values;
    }

    // Apply normalization to data
    const result = [...data];
    let normalizedIndex = 0;

    for (let i = 0; i < result.length; i++) {
      if (!isNaN(result[i].value)) {
        result[i] = {
          ...result[i],
          value: normalizedValues[normalizedIndex]
        };
        normalizedIndex++;
      }
    }

    return result;
  }

  /**
   * Min-Max normalization
   */
  private minMaxNormalization(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) return values;

    return values.map(v => (v - min) / range);
  }

  /**
   * Z-score normalization
   */
  private zScoreNormalization(values: number[]): number[] {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

    if (std === 0) return values;

    return values.map(v => (v - mean) / std);
  }

  /**
   * Robust normalization using median and IQR
   */
  private robustNormalization(values: number[]): number[] {
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = this.calculateMedian(sortedValues);
    const q1 = this.calculateQuantile(sortedValues, 0.25);
    const q3 = this.calculateQuantile(sortedValues, 0.75);
    const iqr = q3 - q1;

    if (iqr === 0) return values;

    return values.map(v => (v - median) / iqr);
  }

  /**
   * Calculate median of sorted array
   */
  private calculateMedian(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid];
  }

  /**
   * Calculate quantile of sorted array
   */
  private calculateQuantile(sortedValues: number[], quantile: number): number {
    const index = quantile * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedValues[lower];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Count imputed values
   */
  private countImputedValues(_original: TimeSeriesData[], processed: TimeSeriesData[]): number {
    // Count values that were imputed during the process
    return processed.filter(d => d.quality === 0.5).length; // Imputed values have quality 0.5
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(original: TimeSeriesData[], processed: TimeSeriesData[]): number {
    if (processed.length === 0) return 0;

    const validOriginalCount = original.filter(d => !isNaN(d.value) && d.quality > 0).length;
    const totalProcessedCount = processed.length;
    const avgQuality = processed.reduce((sum, d) => sum + d.quality, 0) / processed.length;

    // Quality score based on data completeness and average quality
    const completenessScore = validOriginalCount / Math.max(totalProcessedCount, 1);

    return (completenessScore * 0.6 + avgQuality * 0.4);
  }

  /**
   * Create empty result for edge cases
   */
  private createEmptyResult(data: TimeSeriesData[], startTime: number): PreprocessedData {
    return {
      original_data: data,
      processed_data: [],
      metadata: {
        original_count: data.length,
        processed_count: 0,
        outliers_removed: 0,
        missing_values_imputed: 0,
        quality_score: 0,
        processing_time_ms: Date.now() - startTime
      }
    };
  }

  /**
   * Validate preprocessing configuration
   */
  public validateConfig(): boolean {
    if (this.config.target_sampling_rate_minutes <= 0) {
      throw new Error('Target sampling rate must be positive');
    }

    if (this.config.outlier_threshold <= 0) {
      throw new Error('Outlier threshold must be positive');
    }

    if (this.config.missing_data_threshold < 0 || this.config.missing_data_threshold > 1) {
      throw new Error('Missing data threshold must be between 0 and 1');
    }

    return true;
  }

  /**
   * Get preprocessing statistics
   */
  public getStatistics(data: TimeSeriesData[]): {
    count: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    missing_count: number;
    quality_distribution: { [key: string]: number };
  } {
    const validValues = data.filter(d => !isNaN(d.value)).map(d => d.value);
    const missingCount = data.length - validValues.length;

    if (validValues.length === 0) {
      return {
        count: data.length,
        mean: 0,
        std: 0,
        min: 0,
        max: 0,
        missing_count: missingCount,
        quality_distribution: {}
      };
    }

    const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    const std = Math.sqrt(validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validValues.length);
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    // Quality distribution
    const qualityDistribution: { [key: string]: number } = {};
    for (const point of data) {
      const qualityBin = Math.floor(point.quality * 10) / 10;
      const key = qualityBin.toString();
      qualityDistribution[key] = (qualityDistribution[key] || 0) + 1;
    }

    return {
      count: data.length,
      mean,
      std,
      min,
      max,
      missing_count: missingCount,
      quality_distribution: qualityDistribution
    };
  }
}