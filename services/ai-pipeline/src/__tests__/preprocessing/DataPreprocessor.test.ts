import { DataPreprocessor, TimeSeriesData, PreprocessingConfig } from '../../preprocessing/DataPreprocessor';

describe('DataPreprocessor', () => {
  let preprocessor: DataPreprocessor;
  let config: PreprocessingConfig;
  let mockData: TimeSeriesData[];

  beforeEach(() => {
    config = {
      target_sampling_rate_minutes: 15,
      interpolation_method: 'linear',
      outlier_detection_method: 'zscore',
      outlier_threshold: 3.0,
      missing_data_threshold: 0.3,
      normalization_method: 'minmax'
    };

    preprocessor = new DataPreprocessor(config);

    // Create mock time series data
    mockData = [];
    const baseTime = new Date('2024-01-15T00:00:00Z');
    
    for (let i = 0; i < 100; i++) {
      mockData.push({
        timestamp: new Date(baseTime.getTime() + i * 10 * 60 * 1000), // Every 10 minutes
        value: 10 + Math.sin(i * 0.1) * 5 + Math.random() * 2, // Sinusoidal with noise
        quality: 0.8 + Math.random() * 0.2,
        sensor_id: 'test_sensor',
        measurement_type: 'displacement'
      });
    }
  });

  describe('constructor and validation', () => {
    it('should initialize with valid configuration', () => {
      expect(preprocessor).toBeDefined();
      expect(preprocessor.validateConfig()).toBe(true);
    });

    it('should validate configuration parameters', () => {
      const invalidConfigs = [
        { ...config, target_sampling_rate_minutes: 0 },
        { ...config, outlier_threshold: -1 },
        { ...config, missing_data_threshold: 1.5 }
      ];

      for (const invalidConfig of invalidConfigs) {
        expect(() => new DataPreprocessor(invalidConfig)).toThrow();
      }
    });
  });

  describe('preprocess', () => {
    it('should preprocess data successfully', async () => {
      const result = await preprocessor.preprocess(mockData);

      expect(result).toHaveProperty('original_data');
      expect(result).toHaveProperty('processed_data');
      expect(result).toHaveProperty('metadata');

      expect(result.original_data).toEqual(mockData);
      expect(result.processed_data.length).toBeGreaterThan(0);
      expect(result.metadata.original_count).toBe(mockData.length);
      expect(result.metadata.processing_time_ms).toBeGreaterThan(0);
    });

    it('should handle empty data', async () => {
      const result = await preprocessor.preprocess([]);

      expect(result.processed_data).toHaveLength(0);
      expect(result.metadata.original_count).toBe(0);
      expect(result.metadata.processed_count).toBe(0);
      expect(result.metadata.quality_score).toBe(0);
    });

    it('should remove outliers correctly', async () => {
      // Add some outliers to the data
      const dataWithOutliers = [...mockData];
      dataWithOutliers.push({
        timestamp: new Date('2024-01-15T10:00:00Z'),
        value: 1000, // Extreme outlier
        quality: 1.0,
        sensor_id: 'test_sensor',
        measurement_type: 'displacement'
      });

      const result = await preprocessor.preprocess(dataWithOutliers);

      expect(result.metadata.outliers_removed).toBeGreaterThan(0);
      expect(result.processed_data.length).toBeLessThan(dataWithOutliers.length);
    });

    it('should align timestamps correctly', async () => {
      const result = await preprocessor.preprocess(mockData);

      // Check that timestamps are aligned to the target sampling rate
      if (result.processed_data.length > 1) {
        const timeDiff = result.processed_data[1].timestamp.getTime() - result.processed_data[0].timestamp.getTime();
        const expectedDiff = config.target_sampling_rate_minutes * 60 * 1000;
        expect(Math.abs(timeDiff - expectedDiff)).toBeLessThan(60000); // Within 1 minute tolerance
      }
    });

    it('should impute missing values', async () => {
      // Create a simple test case with just a few data points
      const simpleData: TimeSeriesData[] = [
        {
          timestamp: new Date('2024-01-15T00:00:00Z'),
          value: 10,
          quality: 1.0,
          sensor_id: 'test_sensor',
          measurement_type: 'displacement'
        },
        {
          timestamp: new Date('2024-01-15T00:15:00Z'),
          value: NaN, // Missing value
          quality: 0,
          sensor_id: 'test_sensor',
          measurement_type: 'displacement'
        },
        {
          timestamp: new Date('2024-01-15T00:30:00Z'),
          value: 12,
          quality: 1.0,
          sensor_id: 'test_sensor',
          measurement_type: 'displacement'
        }
      ];

      const result = await preprocessor.preprocess(simpleData);

      // Should have processed the data
      expect(result.processed_data.length).toBeGreaterThan(0);
      
      // Check that no NaN values remain in processed data
      const hasNaN = result.processed_data.some(d => isNaN(d.value));
      expect(hasNaN).toBe(false);
    });

    it('should normalize data correctly', async () => {
      const result = await preprocessor.preprocess(mockData);

      const values = result.processed_data.map(d => d.value);
      const min = Math.min(...values);
      const max = Math.max(...values);

      // For minmax normalization, values should be between 0 and 1
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThanOrEqual(1);
    });
  });

  describe('outlier detection methods', () => {
    it('should detect outliers using Z-score method', async () => {
      const zscoreConfig = { ...config, outlier_detection_method: 'zscore' as const };
      const zscorePreprocessor = new DataPreprocessor(zscoreConfig);

      const dataWithOutliers = [...mockData];
      dataWithOutliers.push({
        timestamp: new Date('2024-01-15T10:00:00Z'),
        value: 100, // Clear outlier
        quality: 1.0,
        sensor_id: 'test_sensor',
        measurement_type: 'displacement'
      });

      const result = await zscorePreprocessor.preprocess(dataWithOutliers);
      expect(result.metadata.outliers_removed).toBeGreaterThan(0);
    });

    it('should detect outliers using IQR method', async () => {
      const iqrConfig = { ...config, outlier_detection_method: 'iqr' as const };
      const iqrPreprocessor = new DataPreprocessor(iqrConfig);

      const dataWithOutliers = [...mockData];
      dataWithOutliers.push({
        timestamp: new Date('2024-01-15T10:00:00Z'),
        value: 100,
        quality: 1.0,
        sensor_id: 'test_sensor',
        measurement_type: 'displacement'
      });

      const result = await iqrPreprocessor.preprocess(dataWithOutliers);
      expect(result.metadata.outliers_removed).toBeGreaterThan(0);
    });
  });

  describe('interpolation methods', () => {
    it('should perform linear interpolation', async () => {
      const linearConfig = { ...config, interpolation_method: 'linear' as const };
      const linearPreprocessor = new DataPreprocessor(linearConfig);

      const dataWithGaps = mockData.filter((_, i) => i % 3 !== 1); // Remove every 3rd element
      const result = await linearPreprocessor.preprocess(dataWithGaps);

      expect(result.processed_data.length).toBeGreaterThanOrEqual(dataWithGaps.length);
    });

    it('should perform nearest neighbor interpolation', async () => {
      const nearestConfig = { ...config, interpolation_method: 'nearest' as const };
      const nearestPreprocessor = new DataPreprocessor(nearestConfig);

      const dataWithGaps = mockData.filter((_, i) => i % 3 !== 1);
      const result = await nearestPreprocessor.preprocess(dataWithGaps);

      expect(result.processed_data.length).toBeGreaterThanOrEqual(dataWithGaps.length);
    });
  });

  describe('normalization methods', () => {
    it('should perform min-max normalization', async () => {
      const minmaxConfig = { ...config, normalization_method: 'minmax' as const };
      const minmaxPreprocessor = new DataPreprocessor(minmaxConfig);

      const result = await minmaxPreprocessor.preprocess(mockData);
      const values = result.processed_data.map(d => d.value);
      
      expect(Math.min(...values)).toBeCloseTo(0, 1);
      expect(Math.max(...values)).toBeCloseTo(1, 1);
    });

    it('should perform z-score normalization', async () => {
      const zscoreConfig = { ...config, normalization_method: 'zscore' as const };
      const zscorePreprocessor = new DataPreprocessor(zscoreConfig);

      const result = await zscorePreprocessor.preprocess(mockData);
      const values = result.processed_data.map(d => d.value);
      
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      expect(Math.abs(mean)).toBeLessThan(0.1); // Should be close to 0
    });

    it('should perform robust normalization', async () => {
      const robustConfig = { ...config, normalization_method: 'robust' as const };
      const robustPreprocessor = new DataPreprocessor(robustConfig);

      const result = await robustPreprocessor.preprocess(mockData);
      expect(result.processed_data.length).toBeGreaterThan(0);
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', () => {
      const stats = preprocessor.getStatistics(mockData);

      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('mean');
      expect(stats).toHaveProperty('std');
      expect(stats).toHaveProperty('min');
      expect(stats).toHaveProperty('max');
      expect(stats).toHaveProperty('missing_count');
      expect(stats).toHaveProperty('quality_distribution');

      expect(stats.count).toBe(mockData.length);
      expect(stats.missing_count).toBe(0);
      expect(typeof stats.mean).toBe('number');
      expect(typeof stats.std).toBe('number');
    });

    it('should handle data with missing values', () => {
      const dataWithMissing = mockData.map((d, i) => ({
        ...d,
        value: i % 10 === 0 ? NaN : d.value
      }));

      const stats = preprocessor.getStatistics(dataWithMissing);
      expect(stats.missing_count).toBe(10); // Every 10th value is missing
    });

    it('should handle empty data', () => {
      const stats = preprocessor.getStatistics([]);
      
      expect(stats.count).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.std).toBe(0);
      expect(stats.missing_count).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle data with all identical values', async () => {
      const identicalData = mockData.map(d => ({ ...d, value: 10 }));
      const result = await preprocessor.preprocess(identicalData);

      expect(result.processed_data.length).toBeGreaterThan(0);
      expect(result.metadata.quality_score).toBeGreaterThan(0);
    });

    it('should handle data with single point', async () => {
      const singlePoint = [mockData[0]];
      const result = await preprocessor.preprocess(singlePoint);

      expect(result.processed_data.length).toBe(1);
      expect(result.metadata.outliers_removed).toBe(0);
    });

    it('should handle data with extreme values', async () => {
      const extremeData = [
        { ...mockData[0], value: -1e6 },
        { ...mockData[1], value: 1e6 },
        ...mockData.slice(2, 5)
      ];

      const result = await preprocessor.preprocess(extremeData);
      expect(result.processed_data.length).toBeGreaterThan(0);
    });

    it('should handle data with poor quality flags', async () => {
      const poorQualityData = mockData.map(d => ({ ...d, quality: 0.1 }));
      const result = await preprocessor.preprocess(poorQualityData);

      expect(result.metadata.quality_score).toBeLessThan(0.95);
    });
  });

  describe('performance', () => {
    it('should process large datasets efficiently', async () => {
      // Create large dataset
      const largeData: TimeSeriesData[] = [];
      const baseTime = new Date();
      
      for (let i = 0; i < 10000; i++) {
        largeData.push({
          timestamp: new Date(baseTime.getTime() + i * 60 * 1000),
          value: Math.sin(i * 0.01) * 100 + Math.random() * 10,
          quality: 0.8 + Math.random() * 0.2,
          sensor_id: 'test_sensor',
          measurement_type: 'displacement'
        });
      }

      const startTime = Date.now();
      const result = await preprocessor.preprocess(largeData);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processed_data.length).toBeGreaterThan(0);
      expect(result.metadata.processing_time_ms).toBeLessThan(5000);
    });
  });
});