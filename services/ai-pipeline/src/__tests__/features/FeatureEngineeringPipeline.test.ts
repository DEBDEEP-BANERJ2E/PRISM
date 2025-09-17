import { FeatureEngineeringPipeline, FeatureExtractionConfig, FeatureExtractionContext } from '../../features/FeatureEngineeringPipeline';
// import { SensorReading } from '../../../../shared/models/dist/sensor';
// import { SpatialLocation } from '../../../../shared/models/dist/spatial';

describe.skip('FeatureEngineeringPipeline', () => {
  let pipeline: FeatureEngineeringPipeline;
  let config: FeatureExtractionConfig;
  let mockContext: FeatureExtractionContext;

  beforeEach(() => {
    config = {
      temporal_window_hours: 24,
      spatial_search_radius_m: 1000,
      dem_cell_size_m: 1.0,
      min_data_quality_threshold: 0.5,
      measurement_types: ['displacement', 'strain', 'tilt']
    };

    pipeline = new FeatureEngineeringPipeline(config);

    const mockLocation: SpatialLocation = {
      latitude: -23.5,
      longitude: 133.5,
      elevation: 100,
      utm_x: 500000,
      utm_y: 7500000,
      mine_grid_x: 1000,
      mine_grid_y: 2000
    };

    mockContext = {
      location: mockLocation,
      sensorReadings: [
        {
          sensor_id: 'sensor1',
          timestamp: new Date('2024-01-15T11:00:00Z'),
          location: mockLocation,
          measurements: { displacement: 10.5, strain: 0.001, tilt: 2.5 },
          quality_flags: { displacement: true, strain: true, tilt: true },
          battery_level: 0.8,
          signal_strength: -70
        },
        {
          sensor_id: 'sensor1',
          timestamp: new Date('2024-01-15T12:00:00Z'),
          location: mockLocation,
          measurements: { displacement: 12.0, strain: 0.0012, tilt: 2.8 },
          quality_flags: { displacement: true, strain: true, tilt: true },
          battery_level: 0.75,
          signal_strength: -68
        }
      ],
      weatherData: [
        {
          timestamp: new Date('2024-01-15T11:00:00Z'),
          temperature: 25,
          humidity: 60,
          pressure: 1013.25,
          rainfall: 0,
          wind_speed: 5,
          wind_direction: 180
        },
        {
          timestamp: new Date('2024-01-15T12:00:00Z'),
          temperature: 27,
          humidity: 55,
          pressure: 1012.8,
          rainfall: 2.5,
          wind_speed: 7,
          wind_direction: 190
        }
      ],
      demData: [
        { x: 499950, y: 7499950, elevation: 95 },
        { x: 500000, y: 7500000, elevation: 100 },
        { x: 500050, y: 7500050, elevation: 105 }
      ],
      joints: [
        {
          location: { ...mockLocation, utm_x: 500050, utm_y: 7500050 },
          strike: 45,
          dip: 60,
          length: 10,
          aperture: 2,
          roughness: 0.7,
          infilling: 'clay',
          is_major: true
        }
      ],
      drainage: [
        {
          location: { ...mockLocation, utm_x: 500100, utm_y: 7500100 },
          type: 'channel',
          seasonal: false
        }
      ],
      miningFeatures: [
        {
          location: { ...mockLocation, utm_x: 500200, utm_y: 7500200 },
          type: 'haul_road',
          last_activity: new Date(),
          intensity: 0.8
        }
      ],
      sensorLocations: [
        { ...mockLocation, sensor_id: 'sensor1', sensor_type: 'displacement', installation_date: new Date(), last_maintenance: new Date() },
        { ...mockLocation, utm_x: 500025, utm_y: 7500025, sensor_id: 'sensor2', sensor_type: 'strain', installation_date: new Date(), last_maintenance: new Date() }
      ],
      currentTime: new Date('2024-01-15T12:00:00Z')
    };
  });

  describe('constructor and configuration', () => {
    it('should initialize with valid configuration', () => {
      expect(pipeline).toBeDefined();
      expect(pipeline.validateConfig()).toBe(true);
    });

    it('should validate configuration parameters', () => {
      const invalidConfigs = [
        { ...config, temporal_window_hours: 0 },
        { ...config, spatial_search_radius_m: -100 },
        { ...config, dem_cell_size_m: 0 },
        { ...config, min_data_quality_threshold: 1.5 },
        { ...config, measurement_types: [] }
      ];

      for (const invalidConfig of invalidConfigs) {
        expect(() => new FeatureEngineeringPipeline(invalidConfig)).toThrow();
      }
    });
  });

  describe('extractFeatures', () => {
    it('should extract combined features successfully', async () => {
      const features = await pipeline.extractFeatures(mockContext);

      expect(features).toHaveProperty('location_id');
      expect(features).toHaveProperty('timestamp');
      expect(features).toHaveProperty('geomorphological');
      expect(features).toHaveProperty('temporal');
      expect(features).toHaveProperty('environmental');
      expect(features).toHaveProperty('spatial');
      expect(features).toHaveProperty('metadata');

      expect(features.location_id).toBe('loc_500000_7500000_100');
      expect(features.timestamp).toEqual(mockContext.currentTime);
      expect(features.temporal.size).toBe(3); // displacement, strain, tilt
      expect(features.metadata.data_quality_score).toBeGreaterThan(0);
      expect(features.metadata.feature_completeness).toBeGreaterThan(0);
      expect(features.metadata.processing_time_ms).toBeGreaterThan(0);
    });

    it('should extract geomorphological features', async () => {
      const features = await pipeline.extractFeatures(mockContext);

      expect(features.geomorphological).toHaveProperty('slope');
      expect(features.geomorphological).toHaveProperty('aspect');
      expect(features.geomorphological).toHaveProperty('curvature');
      expect(features.geomorphological).toHaveProperty('roughness');
      expect(features.geomorphological).toHaveProperty('elevation');

      expect(typeof features.geomorphological.slope).toBe('number');
      expect(typeof features.geomorphological.aspect).toBe('number');
    });

    it('should extract temporal features for all measurement types', async () => {
      const features = await pipeline.extractFeatures(mockContext);

      expect(features.temporal.has('displacement')).toBe(true);
      expect(features.temporal.has('strain')).toBe(true);
      expect(features.temporal.has('tilt')).toBe(true);

      const displacementFeatures = features.temporal.get('displacement')!;
      expect(displacementFeatures).toHaveProperty('mean_1h');
      expect(displacementFeatures).toHaveProperty('velocity_1h');
      expect(displacementFeatures).toHaveProperty('trend_slope_6h');
      expect(displacementFeatures.mean_1h).toBe(11.25); // (10.5 + 12.0) / 2
    });

    it('should extract environmental features', async () => {
      const features = await pipeline.extractFeatures(mockContext);

      expect(features.environmental).toHaveProperty('rainfall_1h');
      expect(features.environmental).toHaveProperty('temperature_current');
      expect(features.environmental).toHaveProperty('humidity_current');
      expect(features.environmental).toHaveProperty('day_of_year');
      expect(features.environmental).toHaveProperty('season');

      expect(features.environmental.rainfall_1h).toBe(2.5);
      expect(features.environmental.temperature_current).toBe(27);
    });

    it('should extract spatial features', async () => {
      const features = await pipeline.extractFeatures(mockContext);

      expect(features.spatial).toHaveProperty('distance_to_nearest_joint');
      expect(features.spatial).toHaveProperty('distance_to_water_source');
      expect(features.spatial).toHaveProperty('joint_density_500m');
      expect(features.spatial).toHaveProperty('sensor_density_100m');
      expect(features.spatial).toHaveProperty('blast_proximity_score');

      expect(typeof features.spatial.distance_to_nearest_joint).toBe('number');
      expect(typeof features.spatial.sensor_density_100m).toBe('number');
    });

    it('should calculate data quality score', async () => {
      const features = await pipeline.extractFeatures(mockContext);

      expect(features.metadata.data_quality_score).toBeGreaterThan(0.5);
      expect(features.metadata.data_quality_score).toBeLessThanOrEqual(1);
    });

    it('should calculate feature completeness', async () => {
      const features = await pipeline.extractFeatures(mockContext);

      expect(features.metadata.feature_completeness).toBeGreaterThan(0);
      expect(features.metadata.feature_completeness).toBeLessThanOrEqual(1);
    });

    it('should handle missing data gracefully', async () => {
      const incompleteContext = {
        ...mockContext,
        sensorReadings: [],
        weatherData: [],
        demData: []
      };

      const features = await pipeline.extractFeatures(incompleteContext);

      expect(features).toBeDefined();
      expect(features.metadata.data_quality_score).toBeLessThan(0.5);
    });

    it('should reject low quality data', async () => {
      const lowQualityConfig = { ...config, min_data_quality_threshold: 0.9 };
      const strictPipeline = new FeatureEngineeringPipeline(lowQualityConfig);

      const lowQualityContext = {
        ...mockContext,
        sensorReadings: [],
        weatherData: []
      };

      await expect(strictPipeline.extractFeatures(lowQualityContext)).rejects.toThrow();
    });
  });

  describe('extractBatchFeatures', () => {
    it('should process multiple contexts in batch', async () => {
      const contexts = [
        mockContext,
        {
          ...mockContext,
          location: { ...mockContext.location, utm_x: 500100, utm_y: 7500100 }
        },
        {
          ...mockContext,
          location: { ...mockContext.location, utm_x: 500200, utm_y: 7500200 }
        }
      ];

      const batchFeatures = await pipeline.extractBatchFeatures(contexts);

      expect(batchFeatures).toHaveLength(3);
      expect(batchFeatures[0].location_id).toBe('loc_500000_7500000_100');
      expect(batchFeatures[1].location_id).toBe('loc_500100_7500100_100');
      expect(batchFeatures[2].location_id).toBe('loc_500200_7500200_100');
    });

    it('should handle batch processing errors gracefully', async () => {
      const contexts = [
        mockContext,
        {
          ...mockContext,
          sensorReadings: [], // This might cause low quality
          weatherData: [],
          demData: []
        }
      ];

      // Should not throw, but may have fewer results
      const batchFeatures = await pipeline.extractBatchFeatures(contexts);
      expect(batchFeatures.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('flattenFeatures', () => {
    it('should flatten features to numeric array', async () => {
      const features = await pipeline.extractFeatures(mockContext);
      const flatFeatures = pipeline.flattenFeatures(features);

      expect(Array.isArray(flatFeatures)).toBe(true);
      expect(flatFeatures.length).toBeGreaterThan(0);
      expect(flatFeatures.every(value => typeof value === 'number')).toBe(true);
      expect(flatFeatures.every(value => isFinite(value))).toBe(true);
    });

    it('should handle infinite and NaN values', async () => {
      const features = await pipeline.extractFeatures(mockContext);
      
      // Artificially introduce problematic values
      features.spatial.distance_to_nearest_joint = Infinity;
      features.temporal.get('displacement')!.time_since_last_peak = NaN;

      const flatFeatures = pipeline.flattenFeatures(features);

      expect(flatFeatures.every(value => isFinite(value))).toBe(true);
    });

    it('should maintain consistent feature order', async () => {
      const features1 = await pipeline.extractFeatures(mockContext);
      const features2 = await pipeline.extractFeatures(mockContext);

      const flat1 = pipeline.flattenFeatures(features1);
      const flat2 = pipeline.flattenFeatures(features2);

      expect(flat1.length).toBe(flat2.length);
    });
  });

  describe('getFeatureNames', () => {
    it('should return feature names matching flattened features', () => {
      const featureNames = pipeline.getFeatureNames();
      
      expect(Array.isArray(featureNames)).toBe(true);
      expect(featureNames.length).toBeGreaterThan(0);
      expect(featureNames.every(name => typeof name === 'string')).toBe(true);
      expect(featureNames.every(name => name.length > 0)).toBe(true);
    });

    it('should include all feature categories', () => {
      const featureNames = pipeline.getFeatureNames();
      
      expect(featureNames.some(name => name.startsWith('geo_'))).toBe(true);
      expect(featureNames.some(name => name.startsWith('temp_'))).toBe(true);
      expect(featureNames.some(name => name.startsWith('env_'))).toBe(true);
      expect(featureNames.some(name => name.startsWith('spatial_'))).toBe(true);
    });

    it('should include all measurement types in temporal features', () => {
      const featureNames = pipeline.getFeatureNames();
      
      for (const measurementType of config.measurement_types) {
        expect(featureNames.some(name => name.includes(measurementType))).toBe(true);
      }
    });
  });

  describe('performance', () => {
    it('should process features within reasonable time', async () => {
      const startTime = Date.now();
      const features = await pipeline.extractFeatures(mockContext);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      expect(features.metadata.processing_time_ms).toBeLessThan(1000);
    });

    it('should handle large batch processing efficiently', async () => {
      const largeBatch = Array(50).fill(mockContext);

      const startTime = Date.now();
      const batchFeatures = await pipeline.extractBatchFeatures(largeBatch);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(batchFeatures.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty sensor readings', async () => {
      const emptyContext = {
        ...mockContext,
        sensorReadings: []
      };

      const features = await pipeline.extractFeatures(emptyContext);
      
      expect(features.temporal.size).toBe(3); // Should still create entries for all measurement types
      for (const [_, temporalFeatures] of features.temporal) {
        expect(temporalFeatures.mean_1h).toBe(0);
      }
    });

    it('should handle missing measurement types', async () => {
      const incompleteSensorReadings: SensorReading[] = [
        {
          ...mockContext.sensorReadings[0],
          measurements: { displacement: 10.5 }, // Missing strain and tilt
          quality_flags: { displacement: true }
        }
      ];

      const incompleteContext = {
        ...mockContext,
        sensorReadings: incompleteSensorReadings
      };

      const features = await pipeline.extractFeatures(incompleteContext);
      
      expect(features.temporal.has('displacement')).toBe(true);
      expect(features.temporal.has('strain')).toBe(true); // Should still exist with default values
      expect(features.temporal.has('tilt')).toBe(true);
    });

    it('should handle extreme coordinate values', async () => {
      const extremeContext = {
        ...mockContext,
        location: {
          ...mockContext.location,
          utm_x: 999999999,
          utm_y: 999999999
        }
      };

      const features = await pipeline.extractFeatures(extremeContext);
      
      expect(features).toBeDefined();
      expect(features.location_id).toContain('999999999');
    });

    it('should handle future timestamps', async () => {
      const futureContext = {
        ...mockContext,
        currentTime: new Date('2030-01-01T00:00:00Z')
      };

      const features = await pipeline.extractFeatures(futureContext);
      
      expect(features).toBeDefined();
      expect(features.timestamp).toEqual(futureContext.currentTime);
    });
  });
});