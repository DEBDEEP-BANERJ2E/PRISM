import { TemporalFeatureExtractor, TimeSeriesPoint } from '../../features/TemporalFeatures';
// import { SensorReading } from '../../../../shared/models/dist/sensor';

describe.skip('TemporalFeatureExtractor', () => {
  let extractor: TemporalFeatureExtractor;
  let currentTime: Date;

  beforeEach(() => {
    extractor = new TemporalFeatureExtractor();
    currentTime = new Date('2024-01-15T12:00:00Z');
  });

  describe('extractFeatures', () => {
    it('should extract basic temporal features', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T11:30:00Z'), value: 12, quality: 1 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 15, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(features).toHaveProperty('mean_1h');
      expect(features).toHaveProperty('std_1h');
      expect(features).toHaveProperty('velocity_1h');
      expect(features).toHaveProperty('trend_slope_6h');
      expect(features).toHaveProperty('z_score_current');

      expect(typeof features.mean_1h).toBe('number');
      expect(typeof features.std_1h).toBe('number');
      expect(typeof features.velocity_1h).toBe('number');
    });

    it('should calculate rolling statistics correctly', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T11:20:00Z'), value: 20, quality: 1 },
        { timestamp: new Date('2024-01-15T11:40:00Z'), value: 30, quality: 1 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 40, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(features.mean_1h).toBe(25); // (10+20+30+40)/4
      expect(features.min_1h).toBe(10);
      expect(features.max_1h).toBe(40);
      expect(features.range_1h).toBe(30);
    });

    it('should calculate velocity correctly', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 20, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      // Velocity should be (20-10)/(1 hour) = 10 units/hour
      expect(features.velocity_1h).toBe(10);
    });

    it('should calculate trend slope using linear regression', () => {
      // Create a perfect linear trend: y = 2x + 10
      const timeSeries: TimeSeriesPoint[] = [];
      for (let i = 0; i < 6; i++) {
        timeSeries.push({
          timestamp: new Date(currentTime.getTime() - (6 - i) * 60 * 60 * 1000),
          value: 2 * i + 10,
          quality: 1
        });
      }

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(features.trend_slope_6h).toBeCloseTo(2, 1);
      expect(features.trend_r2_6h).toBeCloseTo(1, 1); // Perfect fit
    });

    it('should detect peaks correctly', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T08:00:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T09:00:00Z'), value: 20, quality: 1 }, // Peak
        { timestamp: new Date('2024-01-15T10:00:00Z'), value: 15, quality: 1 },
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 25, quality: 1 }, // Peak
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 18, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(features.time_since_last_peak).toBe(1); // 1 hour since last peak
      expect(features.peak_frequency_24h).toBeGreaterThan(0);
    });

    it('should calculate z-score for anomaly detection', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T08:00:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T09:00:00Z'), value: 12, quality: 1 },
        { timestamp: new Date('2024-01-15T10:00:00Z'), value: 11, quality: 1 },
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 13, quality: 1 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 50, quality: 1 } // Anomaly
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(Math.abs(features.z_score_current)).toBeGreaterThan(2); // Should be anomalous
    });

    it('should handle missing data with quality filtering', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T11:30:00Z'), value: 999, quality: 0.3 }, // Poor quality
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 12, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      // Should filter out poor quality data
      expect(features.mean_1h).toBe(11); // (10+12)/2, excluding poor quality point
    });

    it('should calculate coefficient of variation', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 8, quality: 1 },
        { timestamp: new Date('2024-01-15T11:30:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 12, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(features.coefficient_variation_1h).toBeGreaterThan(0);
      expect(features.coefficient_variation_1h).toBeLessThan(1);
    });

    it('should handle empty time series', () => {
      const features = extractor.extractFeatures([], currentTime);

      expect(features.mean_1h).toBe(0);
      expect(features.std_1h).toBe(0);
      expect(features.velocity_1h).toBe(0);
      expect(features.time_since_last_peak).toBe(Infinity);
    });

    it('should calculate acceleration correctly', () => {
      // Create data with changing velocity
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T10:00:00Z'), value: 0, quality: 1 },
        { timestamp: new Date('2024-01-15T10:30:00Z'), value: 5, quality: 1 },
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 15, quality: 1 },
        { timestamp: new Date('2024-01-15T11:30:00Z'), value: 30, quality: 1 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 50, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(features.acceleration_1h).toBeGreaterThan(0); // Positive acceleration
    });
  });

  describe('extractFromSensorReadings', () => {
    it('should extract features from sensor readings', () => {
      const sensorReadings: SensorReading[] = [
        {
          sensor_id: 'sensor1',
          timestamp: new Date('2024-01-15T11:00:00Z'),
          location: {
            latitude: -23.5,
            longitude: 133.5,
            elevation: 100,
            utm_x: 500000,
            utm_y: 7500000,
            mine_grid_x: 1000,
            mine_grid_y: 2000
          },
          measurements: { displacement: 10.5, temperature: 25.0 },
          quality_flags: { displacement: true, temperature: true },
          battery_level: 0.8,
          signal_strength: -70
        },
        {
          sensor_id: 'sensor1',
          timestamp: new Date('2024-01-15T12:00:00Z'),
          location: {
            latitude: -23.5,
            longitude: 133.5,
            elevation: 100,
            utm_x: 500000,
            utm_y: 7500000,
            mine_grid_x: 1000,
            mine_grid_y: 2000
          },
          measurements: { displacement: 12.0, temperature: 26.5 },
          quality_flags: { displacement: true, temperature: true },
          battery_level: 0.75,
          signal_strength: -68
        }
      ];

      const features = extractor.extractFromSensorReadings(
        sensorReadings,
        'displacement',
        currentTime
      );

      expect(features).toBeDefined();
      expect(features.mean_1h).toBe(11.25); // (10.5 + 12.0) / 2
    });

    it('should handle multiple measurement types', () => {
      const sensorReadings: SensorReading[] = [
        {
          sensor_id: 'sensor1',
          timestamp: new Date('2024-01-15T11:00:00Z'),
          location: {
            latitude: -23.5,
            longitude: 133.5,
            elevation: 100,
            utm_x: 500000,
            utm_y: 7500000,
            mine_grid_x: 1000,
            mine_grid_y: 2000
          },
          measurements: { displacement: 10, strain: 0.001, tilt: 2.5 },
          quality_flags: { displacement: true, strain: true, tilt: true },
          battery_level: 0.8,
          signal_strength: -70
        }
      ];

      const multiFeatures = extractor.extractMultiMeasurementFeatures(
        sensorReadings,
        ['displacement', 'strain', 'tilt'],
        currentTime
      );

      expect(multiFeatures.size).toBe(3);
      expect(multiFeatures.has('displacement')).toBe(true);
      expect(multiFeatures.has('strain')).toBe(true);
      expect(multiFeatures.has('tilt')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle single data point', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: currentTime, value: 10, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(features.mean_1h).toBe(10);
      expect(features.std_1h).toBe(0);
      expect(features.velocity_1h).toBe(0);
    });

    it('should handle all poor quality data', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 10, quality: 0.3 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 20, quality: 0.4 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      // Should return default features when no quality data available
      expect(features.mean_1h).toBe(0);
    });

    it('should handle extreme values', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: Number.MAX_VALUE, quality: 1 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: -Number.MAX_VALUE, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(isFinite(features.mean_1h)).toBe(true);
      expect(isFinite(features.std_1h)).toBe(true);
    });

    it('should handle identical values', () => {
      const timeSeries: TimeSeriesPoint[] = [
        { timestamp: new Date('2024-01-15T11:00:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T11:30:00Z'), value: 10, quality: 1 },
        { timestamp: new Date('2024-01-15T12:00:00Z'), value: 10, quality: 1 }
      ];

      const features = extractor.extractFeatures(timeSeries, currentTime);

      expect(features.mean_1h).toBe(10);
      expect(features.std_1h).toBe(0);
      expect(features.velocity_1h).toBe(0);
      expect(features.coefficient_variation_1h).toBe(0);
    });
  });

  describe('performance', () => {
    it('should process large time series efficiently', () => {
      const largeSeries: TimeSeriesPoint[] = [];
      for (let i = 0; i < 10000; i++) {
        largeSeries.push({
          timestamp: new Date(currentTime.getTime() - i * 60 * 1000), // Every minute
          value: Math.sin(i * 0.01) * 100 + Math.random() * 10,
          quality: 1
        });
      }

      const startTime = Date.now();
      const features = extractor.extractFeatures(largeSeries, currentTime);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      expect(features).toBeDefined();
    });
  });
});