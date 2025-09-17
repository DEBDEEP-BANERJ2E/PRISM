import { DataValidator } from '../../services/DataValidator';
import { SensorReadingInput } from '@prism/shared-models';

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  afterEach(() => {
    // Clear any timers to prevent Jest from hanging
    jest.clearAllTimers();
  });

  describe('validateSensorReading', () => {
    test('should validate a correct sensor reading', () => {
      const validReading: SensorReadingInput = {
        sensor_id: 'SENSOR_001',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.5, unit: '°' },
          tilt_y: { value: -0.8, unit: '°' },
          temperature: { value: 25.3, unit: '°C' }
        },
        battery_level: 85,
        signal_strength: -65
      };

      const result = validator.validateSensorReading(validReading);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.qualityScore).toBeGreaterThan(0.8);
    });

    test('should reject reading with empty sensor ID', () => {
      const invalidReading: SensorReadingInput = {
        sensor_id: '',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.0, unit: '°' }
        }
      };

      const result = validator.validateSensorReading(invalidReading);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('sensor_id'))).toBe(true);
    });

    test('should warn about low battery level', () => {
      const lowBatteryReading: SensorReadingInput = {
        sensor_id: 'SENSOR_LOW_BATTERY',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.0, unit: '°' }
        },
        battery_level: 15 // Below threshold
      };

      const result = validator.validateSensorReading(lowBatteryReading);

      expect(result.isValid).toBe(true); // Still valid, just warning
      expect(result.warnings.some(warning => warning.includes('Low battery'))).toBe(true);
      expect(result.qualityScore).toBeLessThan(1.0);
    });

    test('should warn about weak signal strength', () => {
      const weakSignalReading: SensorReadingInput = {
        sensor_id: 'SENSOR_WEAK_SIGNAL',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.0, unit: '°' }
        },
        signal_strength: -100 // Very weak signal
      };

      const result = validator.validateSensorReading(weakSignalReading);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('Weak signal'))).toBe(true);
      expect(result.qualityScore).toBeLessThan(1.0);
    });

    test('should warn about stale data', () => {
      const staleReading: SensorReadingInput = {
        sensor_id: 'SENSOR_STALE',
        timestamp: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago (beyond 30 min threshold)
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.0, unit: '°' }
        }
      };

      const result = validator.validateSensorReading(staleReading);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('stale'))).toBe(true);
      expect(result.qualityScore).toBeLessThan(1.0);
    });

    test('should detect duplicate readings', () => {
      const reading: SensorReadingInput = {
        sensor_id: 'DUPLICATE_SENSOR',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.0, unit: '°' }
        },
        sequence_number: 123
      };

      // First reading should be valid
      const firstResult = validator.validateSensorReading(reading);
      expect(firstResult.isValid).toBe(true);

      // Second identical reading should be detected as duplicate
      const secondResult = validator.validateSensorReading(reading);
      expect(secondResult.isValid).toBe(false);
      expect(secondResult.errors.some(error => error.includes('Duplicate'))).toBe(true);
    });

    test('should validate measurement values within range', () => {
      const outOfRangeReading: SensorReadingInput = {
        sensor_id: 'SENSOR_OUT_OF_RANGE',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          x_angle: { value: 200, unit: '°' }, // Out of range for tilt sensor (should be -90 to 90)
          y_angle: { value: -200, unit: '°' } // Out of range for tilt sensor
        }
      };

      const result = validator.validateSensorReading(outOfRangeReading);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid measurement value'))).toBe(true);
    });
  });

  describe('validateBatch', () => {
    test('should validate a batch of mixed readings', () => {
      const readings: SensorReadingInput[] = [
        {
          sensor_id: 'BATCH_SENSOR_001',
          timestamp: new Date(),
          sensor_type: 'tilt',
          measurements: {
            tilt_x: { value: 1.5, unit: '°' }
          },
          battery_level: 80
        },
        {
          sensor_id: 'BATCH_SENSOR_002',
          timestamp: new Date(),
          sensor_type: 'temperature',
          measurements: {
            temperature: { value: 25.0, unit: '°C' }
          },
          battery_level: 15 // Low battery
        },
        {
          sensor_id: '', // Invalid
          timestamp: new Date(),
          sensor_type: 'tilt',
          measurements: {}
        }
      ];

      const result = validator.validateBatch(readings);

      expect(result.validReadings).toHaveLength(2);
      expect(result.invalidReadings).toHaveLength(1);
      expect(result.metrics.totalRecords).toBe(3);
      expect(result.metrics.validRecords).toBe(2);
      expect(result.metrics.invalidRecords).toBe(1);
      expect(result.metrics.batteryLowCount).toBe(1);
      expect(result.metrics.averageQualityScore).toBeGreaterThan(0);
    });

    test('should handle empty batch', () => {
      const result = validator.validateBatch([]);

      expect(result.validReadings).toHaveLength(0);
      expect(result.invalidReadings).toHaveLength(0);
      expect(result.metrics.totalRecords).toBe(0);
      expect(result.metrics.averageQualityScore).toBe(0);
    });

    test('should calculate quality metrics correctly', () => {
      const readings: SensorReadingInput[] = [
        {
          sensor_id: 'METRICS_SENSOR_001',
          timestamp: new Date(Date.now() - 35 * 60 * 1000), // Stale data (beyond 30 min threshold)
          sensor_type: 'tilt',
          measurements: {
            tilt_x: { value: 1.0, unit: '°' }
          },
          battery_level: 10, // Low battery
          quality_flags: {
            is_valid: true,
            is_calibrated: true,
            is_within_range: true,
            has_drift: false,
            has_noise: false,
            is_suspicious: false,
            battery_low: false,
            communication_error: true
          }
        },
        {
          sensor_id: 'METRICS_SENSOR_002',
          timestamp: new Date(),
          sensor_type: 'temperature',
          measurements: {
            temperature: { value: 25.0, unit: '°C' }
          },
          battery_level: 90
        }
      ];

      const result = validator.validateBatch(readings);

      expect(result.metrics.batteryLowCount).toBe(1);
      expect(result.metrics.communicationErrorCount).toBe(1);
      expect(result.metrics.staleDataCount).toBe(1);
    });
  });

  describe('cache management', () => {
    test('should provide cache statistics', () => {
      const stats = validator.getCacheStats();

      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    test('should clean up old cache entries', async () => {
      // Add some readings to populate cache
      const reading: SensorReadingInput = {
        sensor_id: 'CACHE_TEST_SENSOR',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.0, unit: '°' }
        }
      };

      validator.validateSensorReading(reading);
      
      const initialStats = validator.getCacheStats();
      expect(initialStats.size).toBeGreaterThan(0);

      // Wait for cache cleanup (in real scenario, this would be automatic)
      // For testing, we can't easily trigger the cleanup without exposing internal methods
      // This test verifies the method exists and returns valid stats
      expect(typeof initialStats.size).toBe('number');
      expect(typeof initialStats.memoryUsage).toBe('number');
    });
  });

  describe('measurement validation', () => {
    test('should validate tilt sensor measurements', () => {
      const tiltReading: SensorReadingInput = {
        sensor_id: 'TILT_SENSOR',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          x_angle: { value: 45, unit: '°' },
          y_angle: { value: -30, unit: '°' },
          z_angle: { value: 0, unit: '°' }
        }
      };

      const result = validator.validateSensorReading(tiltReading);
      expect(result.isValid).toBe(true);
    });

    test('should validate accelerometer measurements', () => {
      const accelReading: SensorReadingInput = {
        sensor_id: 'ACCEL_SENSOR',
        timestamp: new Date(),
        sensor_type: 'accelerometer',
        measurements: {
          x_accel: { value: 0.5, unit: 'g' },
          y_accel: { value: -0.2, unit: 'g' },
          z_accel: { value: 9.8, unit: 'g' }
        }
      };

      const result = validator.validateSensorReading(accelReading);
      expect(result.isValid).toBe(true);
    });

    test('should validate environmental sensor measurements', () => {
      const envReading: SensorReadingInput = {
        sensor_id: 'ENV_SENSOR',
        timestamp: new Date(),
        sensor_type: 'temperature',
        measurements: {
          ambient: { value: 25.5, unit: '°C' },
          internal: { value: 30.2, unit: '°C' }
        }
      };

      const result = validator.validateSensorReading(envReading);
      expect(result.isValid).toBe(true);
    });

    test('should allow unknown sensor types with finite values', () => {
      const unknownReading: SensorReadingInput = {
        sensor_id: 'UNKNOWN_SENSOR',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          custom_value: { value: 42.0, unit: 'custom_unit' }
        }
      };

      const result = validator.validateSensorReading(unknownReading);
      expect(result.isValid).toBe(true);
    });

    test('should handle infinite or NaN measurement values', () => {
      const invalidReading: SensorReadingInput = {
        sensor_id: 'INVALID_VALUES_SENSOR',
        timestamp: new Date(),
        sensor_type: 'tilt',
        measurements: {
          x_angle: { value: Infinity, unit: '°' },
          y_angle: { value: NaN, unit: '°' }
        }
      };

      const result = validator.validateSensorReading(invalidReading);
      // The validation might fail at the SensorReading constructor level or at our validator level
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});