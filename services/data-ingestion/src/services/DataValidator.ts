import { SensorReading, SensorReadingInput } from '@prism/shared-models';
import { ValidationResult, DataQualityMetrics } from '../types';
import { config } from '../config';
import logger from '../utils/logger';

export class DataValidator {
  private duplicateCache = new Map<string, Date>();
  private readonly cacheCleanupInterval = 60000; // 1 minute

  constructor() {
    // Periodically clean up duplicate cache
    setInterval(() => {
      this.cleanupDuplicateCache();
    }, this.cacheCleanupInterval);
  }

  /**
   * Validate a single sensor reading
   */
  public validateSensorReading(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let qualityScore = 1.0;

    try {
      // Basic schema validation
      const sensorReading = new SensorReading(data as SensorReadingInput);

      // Check data age
      const dataAge = Date.now() - sensorReading.timestamp.getTime();
      if (dataAge > config.qualityThresholds.maxDataAge) {
        warnings.push(`Data is stale: ${Math.round(dataAge / 60000)} minutes old`);
        qualityScore -= 0.1;
      }

      // Check battery level
      if (sensorReading.battery_level !== undefined && 
          sensorReading.battery_level < config.qualityThresholds.minBatteryLevel) {
        warnings.push(`Low battery level: ${sensorReading.battery_level}%`);
        qualityScore -= 0.1;
      }

      // Check signal strength
      if (sensorReading.signal_strength !== undefined && 
          sensorReading.signal_strength < config.qualityThresholds.maxSignalStrengthDb) {
        warnings.push(`Weak signal strength: ${sensorReading.signal_strength} dBm`);
        qualityScore -= 0.1;
      }

      // Check for duplicate data
      const duplicateKey = this.generateDuplicateKey(sensorReading);
      if (this.duplicateCache.has(duplicateKey)) {
        errors.push('Duplicate sensor reading detected');
        qualityScore -= 0.5;
      } else {
        this.duplicateCache.set(duplicateKey, new Date());
      }

      // Validate measurement values
      for (const [key, measurement] of Object.entries(sensorReading.measurements)) {
        if (!this.isValidMeasurementValue(measurement.value, sensorReading.sensor_type, key)) {
          errors.push(`Invalid measurement value for ${key}: ${measurement.value}`);
          qualityScore -= 0.2;
        }
      }

      // Check sensor reading quality flags
      const sensorQualityScore = sensorReading.getQualityScore();
      if (sensorQualityScore < config.qualityThresholds.minQualityScore) {
        warnings.push(`Low sensor quality score: ${sensorQualityScore.toFixed(2)}`);
        qualityScore = Math.min(qualityScore, sensorQualityScore);
      }

      return {
        isValid: errors.length === 0 && qualityScore >= config.qualityThresholds.minQualityScore,
        errors,
        warnings,
        qualityScore: Math.max(0, qualityScore)
      };

    } catch (error) {
      errors.push(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings,
        qualityScore: 0
      };
    }
  }

  /**
   * Validate a batch of sensor readings
   */
  public validateBatch(readings: unknown[]): {
    validReadings: SensorReading[];
    invalidReadings: Array<{ data: unknown; validation: ValidationResult }>;
    metrics: DataQualityMetrics;
  } {
    const validReadings: SensorReading[] = [];
    const invalidReadings: Array<{ data: unknown; validation: ValidationResult }> = [];
    
    let totalQualityScore = 0;
    let batteryLowCount = 0;
    let communicationErrorCount = 0;
    let staleDataCount = 0;
    let duplicateCount = 0;

    for (const data of readings) {
      const validation = this.validateSensorReading(data);
      
      if (validation.isValid) {
        try {
          const sensorReading = new SensorReading(data as SensorReadingInput);
          validReadings.push(sensorReading);
          totalQualityScore += validation.qualityScore;

          // Update metrics
          if (sensorReading.battery_level !== undefined && 
              sensorReading.battery_level < config.qualityThresholds.minBatteryLevel) {
            batteryLowCount++;
          }
          
          if (sensorReading.quality_flags.communication_error) {
            communicationErrorCount++;
          }

          const dataAge = Date.now() - sensorReading.timestamp.getTime();
          if (dataAge > config.qualityThresholds.maxDataAge) {
            staleDataCount++;
          }

        } catch (error) {
          logger.error('Failed to create SensorReading from validated data', { error, data });
          invalidReadings.push({ data, validation });
        }
      } else {
        invalidReadings.push({ data, validation });
        
        // Check for duplicate errors
        if (validation.errors.some(error => error.includes('Duplicate'))) {
          duplicateCount++;
        }
      }
    }

    const metrics: DataQualityMetrics = {
      totalRecords: readings.length,
      validRecords: validReadings.length,
      invalidRecords: invalidReadings.length,
      averageQualityScore: validReadings.length > 0 ? totalQualityScore / validReadings.length : 0,
      batteryLowCount,
      communicationErrorCount,
      staleDataCount,
      duplicateCount
    };

    return { validReadings, invalidReadings, metrics };
  }

  /**
   * Generate a unique key for duplicate detection
   */
  private generateDuplicateKey(reading: SensorReading): string {
    return `${reading.sensor_id}_${reading.timestamp.getTime()}_${reading.sequence_number || 0}`;
  }

  /**
   * Validate measurement values based on sensor type and measurement name
   */
  private isValidMeasurementValue(value: number, sensorType: string, measurementName: string): boolean {
    // Basic range checks based on sensor type and measurement
    const ranges: Record<string, Record<string, [number, number]>> = {
      'tilt': {
        'x_angle': [-90, 90],
        'y_angle': [-90, 90],
        'z_angle': [-90, 90]
      },
      'accelerometer': {
        'x_accel': [-50, 50], // g
        'y_accel': [-50, 50],
        'z_accel': [-50, 50]
      },
      'temperature': {
        'ambient': [-50, 80], // Celsius
        'internal': [-40, 85]
      },
      'humidity': {
        'relative_humidity': [0, 100] // %
      },
      'piezometer': {
        'pressure': [0, 10000], // kPa
        'water_level': [0, 1000] // meters
      },
      'strain_gauge': {
        'strain': [-10000, 10000] // microstrain
      },
      'displacement': {
        'x_displacement': [-1000, 1000], // mm
        'y_displacement': [-1000, 1000],
        'z_displacement': [-1000, 1000]
      }
    };

    const sensorRanges = ranges[sensorType];
    if (!sensorRanges) {
      // Unknown sensor type, allow any finite number
      return isFinite(value);
    }

    const measurementRange = sensorRanges[measurementName];
    if (!measurementRange) {
      // Unknown measurement for this sensor type, allow any finite number
      return isFinite(value);
    }

    const [min, max] = measurementRange;
    return isFinite(value) && value >= min && value <= max;
  }

  /**
   * Clean up old entries from duplicate cache
   */
  private cleanupDuplicateCache(): void {
    const cutoffTime = new Date(Date.now() - config.qualityThresholds.maxDataAge);
    
    for (const [key, timestamp] of this.duplicateCache.entries()) {
      if (timestamp < cutoffTime) {
        this.duplicateCache.delete(key);
      }
    }
  }

  /**
   * Get current cache statistics
   */
  public getCacheStats(): { size: number; memoryUsage: number } {
    return {
      size: this.duplicateCache.size,
      memoryUsage: JSON.stringify([...this.duplicateCache.entries()]).length
    };
  }
}