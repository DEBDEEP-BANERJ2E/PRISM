import { SyntheticDataGenerator, SyntheticDataConfig } from '../../preprocessing/SyntheticDataGenerator';

describe('SyntheticDataGenerator', () => {
  let generator: SyntheticDataGenerator;
  let config: SyntheticDataConfig;

  beforeEach(() => {
    generator = new SyntheticDataGenerator();
    
    config = {
      slope_angle: 45,
      rock_density: 2500,
      friction_coefficient: 0.6,
      cohesion: 50000,
      joint_spacing: 2.0,
      weathering_factor: 0.1,
      rainfall_intensity: 5.0,
      temperature_variation: 15.0,
      freeze_thaw_cycles: 2,
      duration_hours: 24,
      sampling_rate_minutes: 15,
      noise_level: 0.05,
      measurement_error: 0.02,
      failure_probability: 0.0
    };
  });

  describe('generateSyntheticData', () => {
    it('should generate synthetic data successfully', () => {
      const result = generator.generateSyntheticData(config);

      expect(result).toHaveProperty('displacement_data');
      expect(result).toHaveProperty('strain_data');
      expect(result).toHaveProperty('tilt_data');
      expect(result).toHaveProperty('pore_pressure_data');
      expect(result).toHaveProperty('temperature_data');
      expect(result).toHaveProperty('metadata');

      expect(result.displacement_data.length).toBeGreaterThan(0);
      expect(result.strain_data.length).toBeGreaterThan(0);
      expect(result.tilt_data.length).toBeGreaterThan(0);
      expect(result.pore_pressure_data.length).toBeGreaterThan(0);
      expect(result.temperature_data.length).toBeGreaterThan(0);
    });

    it('should generate correct number of data points', () => {
      const result = generator.generateSyntheticData(config);
      
      const expectedPoints = Math.floor(config.duration_hours * 60 / config.sampling_rate_minutes) + 1;
      
      expect(result.displacement_data.length).toBe(expectedPoints);
      expect(result.strain_data.length).toBe(expectedPoints);
      expect(result.tilt_data.length).toBe(expectedPoints);
      expect(result.pore_pressure_data.length).toBe(expectedPoints);
      expect(result.temperature_data.length).toBe(expectedPoints);
    });

    it('should generate data with correct timestamps', () => {
      const result = generator.generateSyntheticData(config);
      
      const displacementData = result.displacement_data;
      
      // Check that timestamps are properly spaced
      if (displacementData.length > 1) {
        const timeDiff = displacementData[1].timestamp.getTime() - displacementData[0].timestamp.getTime();
        const expectedDiff = config.sampling_rate_minutes * 60 * 1000;
        expect(timeDiff).toBe(expectedDiff);
      }
    });

    it('should generate realistic displacement values', () => {
      const result = generator.generateSyntheticData(config);
      
      const displacementValues = result.displacement_data.map(d => d.value);
      
      // Displacement should be non-negative and generally increasing over time
      expect(Math.min(...displacementValues)).toBeGreaterThanOrEqual(0);
      
      // Should have some variation
      const maxValue = Math.max(...displacementValues);
      const minValue = Math.min(...displacementValues);
      expect(maxValue - minValue).toBeGreaterThan(0);
    });

    it('should generate realistic strain values', () => {
      const result = generator.generateSyntheticData(config);
      
      const strainValues = result.strain_data.map(d => d.value);
      
      // Strain values should be small (typical engineering strains)
      expect(Math.max(...strainValues.map(Math.abs))).toBeLessThan(0.1);
    });

    it('should generate realistic temperature values', () => {
      const result = generator.generateSyntheticData(config);
      
      const temperatureValues = result.temperature_data.map(d => d.value);
      
      // Temperature should vary around a reasonable base temperature
      const avgTemp = temperatureValues.reduce((sum, val) => sum + val, 0) / temperatureValues.length;
      expect(avgTemp).toBeGreaterThan(0);
      expect(avgTemp).toBeLessThan(50); // Reasonable temperature range
    });

    it('should generate data with quality scores', () => {
      const result = generator.generateSyntheticData(config);
      
      const allData = [
        ...result.displacement_data,
        ...result.strain_data,
        ...result.tilt_data,
        ...result.pore_pressure_data,
        ...result.temperature_data
      ];
      
      // All data points should have quality scores between 0 and 1
      for (const point of allData) {
        expect(point.quality).toBeGreaterThanOrEqual(0);
        expect(point.quality).toBeLessThanOrEqual(1);
      }
    });

    it('should include metadata', () => {
      const result = generator.generateSyntheticData(config);
      
      expect(result.metadata.config).toEqual(config);
      expect(result.metadata.physics_params).toBeDefined();
      expect(result.metadata.failure_occurred).toBe(false); // No failure configured
      expect(result.metadata.generation_time_ms).toBeGreaterThan(0);
    });
  });

  describe('failure simulation', () => {
    it('should simulate deterministic failure', () => {
      const failureConfig = {
        ...config,
        failure_time_hours: 12 // Failure at 12 hours
      };
      
      const result = generator.generateSyntheticData(failureConfig);
      
      expect(result.metadata.failure_occurred).toBe(true);
      expect(result.metadata.failure_time).toBeDefined();
      
      if (result.metadata.failure_time) {
        const failureHour = (result.metadata.failure_time.getTime() - result.displacement_data[0].timestamp.getTime()) / (1000 * 60 * 60);
        expect(failureHour).toBeCloseTo(12, 0);
      }
    });

    it('should simulate probabilistic failure', () => {
      const failureConfig = {
        ...config,
        failure_probability: 1.0 // 100% chance of failure
      };
      
      const result = generator.generateSyntheticData(failureConfig);
      
      expect(result.metadata.failure_occurred).toBe(true);
      expect(result.metadata.failure_time).toBeDefined();
    });

    it('should not simulate failure when probability is zero', () => {
      const noFailureConfig = {
        ...config,
        failure_probability: 0.0
      };
      
      const result = generator.generateSyntheticData(noFailureConfig);
      
      expect(result.metadata.failure_occurred).toBe(false);
      expect(result.metadata.failure_time).toBeUndefined();
    });
  });

  describe('physics-based behavior', () => {
    it('should show increased displacement with steeper slopes', () => {
      const gentleSlope = { ...config, slope_angle: 15 };
      const steepSlope = { ...config, slope_angle: 60 };
      
      const gentleResult = generator.generateSyntheticData(gentleSlope);
      const steepResult = generator.generateSyntheticData(steepSlope);
      
      const gentleMaxDisplacement = Math.max(...gentleResult.displacement_data.map(d => d.value));
      const steepMaxDisplacement = Math.max(...steepResult.displacement_data.map(d => d.value));
      
      expect(steepMaxDisplacement).toBeGreaterThan(gentleMaxDisplacement);
    });

    it('should show increased pore pressure with higher rainfall', () => {
      const lowRainfall = { ...config, rainfall_intensity: 1.0 };
      const highRainfall = { ...config, rainfall_intensity: 20.0 };
      
      const lowResult = generator.generateSyntheticData(lowRainfall);
      const highResult = generator.generateSyntheticData(highRainfall);
      
      const lowAvgPressure = lowResult.pore_pressure_data.reduce((sum, d) => sum + d.value, 0) / lowResult.pore_pressure_data.length;
      const highAvgPressure = highResult.pore_pressure_data.reduce((sum, d) => sum + d.value, 0) / highResult.pore_pressure_data.length;
      
      expect(highAvgPressure).toBeGreaterThan(lowAvgPressure);
    });

    it('should show temperature variation effects', () => {
      const lowVariation = { ...config, temperature_variation: 5.0 };
      const highVariation = { ...config, temperature_variation: 25.0 };
      
      const lowResult = generator.generateSyntheticData(lowVariation);
      const highResult = generator.generateSyntheticData(highVariation);
      
      const lowTempRange = Math.max(...lowResult.temperature_data.map(d => d.value)) - 
                          Math.min(...lowResult.temperature_data.map(d => d.value));
      const highTempRange = Math.max(...highResult.temperature_data.map(d => d.value)) - 
                           Math.min(...highResult.temperature_data.map(d => d.value));
      
      expect(highTempRange).toBeGreaterThan(lowTempRange);
    });
  });

  describe('noise and measurement error', () => {
    it('should add appropriate noise levels', () => {
      const lowNoise = { ...config, noise_level: 0.01 };
      const highNoise = { ...config, noise_level: 0.2 };
      
      const lowResult = generator.generateSyntheticData(lowNoise);
      const highResult = generator.generateSyntheticData(highNoise);
      
      // Calculate coefficient of variation as a measure of noise
      const calculateCV = (values: number[]) => {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
        return Math.abs(mean) > 0.001 ? std / Math.abs(mean) : 0;
      };
      
      const lowCV = calculateCV(lowResult.displacement_data.map(d => d.value));
      const highCV = calculateCV(highResult.displacement_data.map(d => d.value));
      
      expect(highCV).toBeGreaterThan(lowCV);
    });

    it('should reflect measurement error in quality scores', () => {
      const lowError = { ...config, measurement_error: 0.01 };
      const highError = { ...config, measurement_error: 0.1 };
      
      const lowResult = generator.generateSyntheticData(lowError);
      const highResult = generator.generateSyntheticData(highError);
      
      const lowAvgQuality = lowResult.displacement_data.reduce((sum, d) => sum + d.quality, 0) / lowResult.displacement_data.length;
      const highAvgQuality = highResult.displacement_data.reduce((sum, d) => sum + d.quality, 0) / highResult.displacement_data.length;
      
      expect(lowAvgQuality).toBeGreaterThan(highAvgQuality);
    });
  });

  describe('generateBatchSyntheticData', () => {
    it('should generate multiple datasets', () => {
      const variations = [
        { slope_angle: 30 },
        { slope_angle: 45 },
        { slope_angle: 60 }
      ];
      
      const results = generator.generateBatchSyntheticData(config, variations, 5);
      
      expect(results).toHaveLength(5);
      
      // Each result should be valid
      for (const result of results) {
        expect(result.displacement_data.length).toBeGreaterThan(0);
        expect(result.metadata.generation_time_ms).toBeGreaterThan(0);
      }
    });

    it('should apply variations correctly', () => {
      const variations = [
        { slope_angle: 30 },
        { slope_angle: 60 }
      ];
      
      const results = generator.generateBatchSyntheticData(config, variations, 4);
      
      expect(results).toHaveLength(4);
      
      // Should cycle through variations
      expect(results[0].metadata.config.slope_angle).toBe(30);
      expect(results[1].metadata.config.slope_angle).toBe(60);
      expect(results[2].metadata.config.slope_angle).toBe(30);
      expect(results[3].metadata.config.slope_angle).toBe(60);
    });
  });

  describe('configuration validation', () => {
    it('should validate slope angle', () => {
      const invalidConfig = { ...config, slope_angle: -10 };
      expect(() => generator.generateSyntheticData(invalidConfig)).toThrow();
      
      const invalidConfig2 = { ...config, slope_angle: 100 };
      expect(() => generator.generateSyntheticData(invalidConfig2)).toThrow();
    });

    it('should validate rock density', () => {
      const invalidConfig = { ...config, rock_density: -100 };
      expect(() => generator.generateSyntheticData(invalidConfig)).toThrow();
    });

    it('should validate friction coefficient', () => {
      const invalidConfig = { ...config, friction_coefficient: -0.5 };
      expect(() => generator.generateSyntheticData(invalidConfig)).toThrow();
      
      const invalidConfig2 = { ...config, friction_coefficient: 1.5 };
      expect(() => generator.generateSyntheticData(invalidConfig2)).toThrow();
    });

    it('should validate duration', () => {
      const invalidConfig = { ...config, duration_hours: 0 };
      expect(() => generator.generateSyntheticData(invalidConfig)).toThrow();
    });

    it('should validate sampling rate', () => {
      const invalidConfig = { ...config, sampling_rate_minutes: 0 };
      expect(() => generator.generateSyntheticData(invalidConfig)).toThrow();
    });

    it('should validate failure probability', () => {
      const invalidConfig = { ...config, failure_probability: -0.1 };
      expect(() => generator.generateSyntheticData(invalidConfig)).toThrow();
      
      const invalidConfig2 = { ...config, failure_probability: 1.1 };
      expect(() => generator.generateSyntheticData(invalidConfig2)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very short duration', () => {
      const shortConfig = { ...config, duration_hours: 0.5 };
      const result = generator.generateSyntheticData(shortConfig);
      
      expect(result.displacement_data.length).toBeGreaterThan(0);
    });

    it('should handle high sampling rate', () => {
      const highRateConfig = { ...config, sampling_rate_minutes: 1 };
      const result = generator.generateSyntheticData(highRateConfig);
      
      expect(result.displacement_data.length).toBeGreaterThan(20); // Should have many points
    });

    it('should handle extreme weather conditions', () => {
      const extremeConfig = {
        ...config,
        rainfall_intensity: 100,
        temperature_variation: 50
      };
      
      const result = generator.generateSyntheticData(extremeConfig);
      expect(result.displacement_data.length).toBeGreaterThan(0);
    });

    it('should handle zero noise', () => {
      const noNoiseConfig = { ...config, noise_level: 0 };
      const result = generator.generateSyntheticData(noNoiseConfig);
      
      expect(result.displacement_data.length).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should generate data efficiently', () => {
      const longConfig = {
        ...config,
        duration_hours: 168, // 1 week
        sampling_rate_minutes: 5
      };
      
      const startTime = Date.now();
      const result = generator.generateSyntheticData(longConfig);
      const generationTime = Date.now() - startTime;
      
      expect(generationTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.displacement_data.length).toBeGreaterThan(1000);
      expect(result.metadata.generation_time_ms).toBeLessThan(2000);
    });
  });
});