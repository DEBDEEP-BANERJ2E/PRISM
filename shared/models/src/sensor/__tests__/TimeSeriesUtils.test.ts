import { TimeSeriesUtils, type TimeSeriesPoint } from '../TimeSeriesUtils';
import { SensorReading } from '../SensorReading';

describe('TimeSeriesUtils', () => {
  const createSensorReading = (timestamp: Date, value: number, sensorId: string = 'TEST001') => {
    return new SensorReading({
      sensor_id: sensorId,
      timestamp,
      sensor_type: 'temperature',
      measurements: {
        temperature: { value, unit: 'celsius' }
      }
    });
  };

  const createTimeSeriesPoints = (): TimeSeriesPoint[] => [
    { timestamp: new Date('2023-01-01T12:00:00Z'), value: 20.0, quality: 1.0 },
    { timestamp: new Date('2023-01-01T12:01:00Z'), value: 20.5, quality: 1.0 },
    { timestamp: new Date('2023-01-01T12:02:00Z'), value: 21.0, quality: 0.9 },
    { timestamp: new Date('2023-01-01T12:03:00Z'), value: 21.5, quality: 1.0 },
    { timestamp: new Date('2023-01-01T12:04:00Z'), value: 22.0, quality: 1.0 }
  ];

  describe('sensor readings to time series conversion', () => {
    it('should convert sensor readings to time series points', () => {
      const readings = [
        createSensorReading(new Date('2023-01-01T12:00:00Z'), 20.0),
        createSensorReading(new Date('2023-01-01T12:01:00Z'), 20.5),
        createSensorReading(new Date('2023-01-01T12:02:00Z'), 21.0)
      ];

      const timeSeries = TimeSeriesUtils.sensorReadingsToTimeSeries(readings, 'temperature');

      expect(timeSeries).toHaveLength(3);
      expect(timeSeries[0].value).toBe(20.0);
      expect(timeSeries[0].timestamp).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(timeSeries[0].quality).toBe(1.0);
      expect(timeSeries[0].metadata?.sensor_id).toBe('TEST001');
      expect(timeSeries[0].metadata?.unit).toBe('celsius');
    });

    it('should filter out readings without the specified measurement', () => {
      const readings = [
        createSensorReading(new Date('2023-01-01T12:00:00Z'), 20.0),
        new SensorReading({
          sensor_id: 'TEST002',
          timestamp: new Date('2023-01-01T12:01:00Z'),
          sensor_type: 'pressure',
          measurements: {
            pressure: { value: 1013.25, unit: 'hPa' }
          }
        })
      ];

      const timeSeries = TimeSeriesUtils.sensorReadingsToTimeSeries(readings, 'temperature');

      expect(timeSeries).toHaveLength(1);
      expect(timeSeries[0].value).toBe(20.0);
    });

    it('should sort time series points by timestamp', () => {
      const readings = [
        createSensorReading(new Date('2023-01-01T12:02:00Z'), 21.0),
        createSensorReading(new Date('2023-01-01T12:00:00Z'), 20.0),
        createSensorReading(new Date('2023-01-01T12:01:00Z'), 20.5)
      ];

      const timeSeries = TimeSeriesUtils.sensorReadingsToTimeSeries(readings, 'temperature');

      expect(timeSeries[0].timestamp).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(timeSeries[1].timestamp).toEqual(new Date('2023-01-01T12:01:00Z'));
      expect(timeSeries[2].timestamp).toEqual(new Date('2023-01-01T12:02:00Z'));
    });
  });

  describe('resampling', () => {
    it('should resample to 1-minute intervals with mean aggregation', () => {
      const points: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 20.0 },
        { timestamp: new Date('2023-01-01T12:00:30Z'), value: 20.5 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 21.0 },
        { timestamp: new Date('2023-01-01T12:01:30Z'), value: 21.5 }
      ];

      const resampled = TimeSeriesUtils.resample(points, '1m', 'mean');

      expect(resampled).toHaveLength(2);
      expect(resampled[0].value).toBeCloseTo(20.25, 2); // (20.0 + 20.5) / 2
      expect(resampled[1].value).toBeCloseTo(21.25, 2); // (21.0 + 21.5) / 2
      expect(resampled[0].timestamp).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(resampled[1].timestamp).toEqual(new Date('2023-01-01T12:01:00Z'));
    });

    it('should resample with different aggregation methods', () => {
      const points: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 10.0 },
        { timestamp: new Date('2023-01-01T12:00:30Z'), value: 30.0 }
      ];

      const maxResampled = TimeSeriesUtils.resample(points, '1m', 'max');
      const minResampled = TimeSeriesUtils.resample(points, '1m', 'min');
      const sumResampled = TimeSeriesUtils.resample(points, '1m', 'sum');

      expect(maxResampled[0].value).toBe(30.0);
      expect(minResampled[0].value).toBe(10.0);
      expect(sumResampled[0].value).toBe(40.0);
    });

    it('should handle empty input', () => {
      const resampled = TimeSeriesUtils.resample([], '1m', 'mean');
      expect(resampled).toEqual([]);
    });
  });

  describe('missing value filling', () => {
    it('should fill missing values with linear interpolation', () => {
      const points: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 10.0 },
        { timestamp: new Date('2023-01-01T12:05:00Z'), value: 20.0 } // 5-minute gap
      ];

      const filled = TimeSeriesUtils.fillMissing(points, 'linear');

      expect(filled.length).toBeGreaterThan(2);
      
      // Check that interpolated values are between original values
      const interpolatedPoints = filled.slice(1, -1);
      interpolatedPoints.forEach(point => {
        expect(point.value).toBeGreaterThan(10.0);
        expect(point.value).toBeLessThan(20.0);
        expect(point.metadata?.interpolated).toBe(true);
        expect(point.quality).toBe(0.5);
      });
    });

    it('should fill missing values with forward fill', () => {
      const points: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 15.0 },
        { timestamp: new Date('2023-01-01T12:05:00Z'), value: 25.0 }
      ];

      const filled = TimeSeriesUtils.fillMissing(points, 'forward');

      const interpolatedPoints = filled.slice(1, -1);
      interpolatedPoints.forEach(point => {
        expect(point.value).toBe(15.0); // Should use forward value
      });
    });

    it('should not fill small gaps', () => {
      const points: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 10.0 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 20.0 } // 1-minute gap
      ];

      const filled = TimeSeriesUtils.fillMissing(points, 'linear');
      expect(filled).toHaveLength(2); // No interpolation for small gaps
    });
  });

  describe('anomaly detection', () => {
    it('should detect anomalies using z-score method', () => {
      const points: TimeSeriesPoint[] = [
        ...Array.from({ length: 10 }, (_, i) => ({
          timestamp: new Date(`2023-01-01T12:${i.toString().padStart(2, '0')}:00Z`),
          value: 20.0 + Math.random() * 2 // Normal values around 20-22
        })),
        { timestamp: new Date('2023-01-01T12:10:00Z'), value: 50.0 } // Anomaly
      ];

      const anomalies = TimeSeriesUtils.detectAnomalies(points, 'zscore', 2);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].point.value).toBe(50.0);
      expect(anomalies[0].anomalyScore).toBeGreaterThan(2);
    });

    it('should detect anomalies using IQR method', () => {
      const points: TimeSeriesPoint[] = [
        ...Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(`2023-01-01T12:${i.toString().padStart(2, '0')}:00Z`),
          value: 20.0 + i * 0.1 // Gradual increase
        })),
        { timestamp: new Date('2023-01-01T12:20:00Z'), value: 100.0 } // Anomaly
      ];

      const anomalies = TimeSeriesUtils.detectAnomalies(points, 'iqr', 1.5);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].point.value).toBe(100.0);
    });

    it('should return empty array for insufficient data', () => {
      const points: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 20.0 }
      ];

      const anomalies = TimeSeriesUtils.detectAnomalies(points, 'zscore');
      expect(anomalies).toEqual([]);
    });
  });

  describe('rolling statistics', () => {
    it('should calculate rolling mean', () => {
      const points = createTimeSeriesPoints();
      const rolling = TimeSeriesUtils.rollingStatistics(points, 3, 'mean');

      expect(rolling).toHaveLength(3); // 5 points - 3 window + 1
      expect(rolling[0].value).toBeCloseTo(20.5, 1); // (20.0 + 20.5 + 21.0) / 3
      expect(rolling[0].metadata?.window_size).toBe(3);
      expect(rolling[0].metadata?.statistic).toBe('mean');
    });

    it('should calculate rolling maximum', () => {
      const points = createTimeSeriesPoints();
      const rolling = TimeSeriesUtils.rollingStatistics(points, 3, 'max');

      expect(rolling[0].value).toBe(21.0); // max of first 3 values
      expect(rolling[1].value).toBe(21.5); // max of values 2-4
    });

    it('should return empty array for insufficient data', () => {
      const points = createTimeSeriesPoints().slice(0, 2);
      const rolling = TimeSeriesUtils.rollingStatistics(points, 3, 'mean');
      expect(rolling).toEqual([]);
    });
  });

  describe('correlation', () => {
    it('should calculate correlation between two time series', () => {
      const series1: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 1.0 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 2.0 },
        { timestamp: new Date('2023-01-01T12:02:00Z'), value: 3.0 }
      ];

      const series2: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 2.0 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 4.0 },
        { timestamp: new Date('2023-01-01T12:02:00Z'), value: 6.0 }
      ];

      const correlation = TimeSeriesUtils.correlation(series1, series2);
      expect(correlation).toBeCloseTo(1.0, 2); // Perfect positive correlation
    });

    it('should handle negative correlation', () => {
      const series1: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 1.0 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 2.0 },
        { timestamp: new Date('2023-01-01T12:02:00Z'), value: 3.0 }
      ];

      const series2: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 3.0 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 2.0 },
        { timestamp: new Date('2023-01-01T12:02:00Z'), value: 1.0 }
      ];

      const correlation = TimeSeriesUtils.correlation(series1, series2);
      expect(correlation).toBeCloseTo(-1.0, 2); // Perfect negative correlation
    });

    it('should return 0 for no correlation', () => {
      const series1: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 1.0 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 1.0 }
      ];

      const series2: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 2.0 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 2.0 }
      ];

      const correlation = TimeSeriesUtils.correlation(series1, series2);
      expect(correlation).toBe(0); // No variation, no correlation
    });
  });

  describe('time series alignment', () => {
    it('should align time series by common timestamps', () => {
      const series1: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 1.0 },
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 2.0 },
        { timestamp: new Date('2023-01-01T12:02:00Z'), value: 3.0 }
      ];

      const series2: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 4.0 },
        { timestamp: new Date('2023-01-01T12:02:00Z'), value: 5.0 },
        { timestamp: new Date('2023-01-01T12:03:00Z'), value: 6.0 }
      ];

      const aligned = TimeSeriesUtils.alignTimeSeries([series1, series2]);

      expect(aligned).toHaveLength(2);
      expect(aligned[0]).toHaveLength(2); // Common timestamps: 12:01 and 12:02
      expect(aligned[1]).toHaveLength(2);
      
      expect(aligned[0][0].timestamp).toEqual(new Date('2023-01-01T12:01:00Z'));
      expect(aligned[0][1].timestamp).toEqual(new Date('2023-01-01T12:02:00Z'));
    });

    it('should return empty arrays when no common timestamps', () => {
      const series1: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:00:00Z'), value: 1.0 }
      ];

      const series2: TimeSeriesPoint[] = [
        { timestamp: new Date('2023-01-01T12:01:00Z'), value: 2.0 }
      ];

      const aligned = TimeSeriesUtils.alignTimeSeries([series1, series2]);

      expect(aligned[0]).toHaveLength(0);
      expect(aligned[1]).toHaveLength(0);
    });

    it('should handle empty input', () => {
      const aligned = TimeSeriesUtils.alignTimeSeries([]);
      expect(aligned).toEqual([]);
    });
  });
});