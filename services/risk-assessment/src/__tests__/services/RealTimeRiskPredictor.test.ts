import { RealTimeRiskPredictor } from '../../services/RealTimeRiskPredictor';
import { logger } from '../../utils/logger';
import { RiskPredictionInput, SensorData, SpatialContext } from '../../types';

describe('RealTimeRiskPredictor', () => {
  let predictor: RealTimeRiskPredictor;
  let mockSensorData: SensorData[];
  let mockSpatialContext: SpatialContext;

  beforeEach(() => {
    predictor = new RealTimeRiskPredictor(logger);

    mockSensorData = [
      {
        sensor_id: 'sensor_001',
        timestamp: new Date(),
        location: { latitude: 45.0, longitude: -120.0, elevation: 1000 },
        measurements: {
          displacement: 2.5,
          pore_pressure: 45.0,
          temperature: 15.0
        },
        quality_flags: { displacement: true, pore_pressure: true, temperature: true }
      },
      {
        sensor_id: 'sensor_002',
        timestamp: new Date(),
        location: { latitude: 45.001, longitude: -120.001, elevation: 1010 },
        measurements: {
          displacement: 3.2,
          pore_pressure: 52.0,
          temperature: 16.0
        },
        quality_flags: { displacement: true, pore_pressure: true, temperature: true }
      }
    ];

    mockSpatialContext = {
      slope_segments: [
        {
          id: 'segment_001',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]
          },
          slope_angle: 45,
          aspect: 180,
          curvature: 0.1,
          rock_type: 'limestone',
          joint_orientation: [45, 135],
          stability_rating: 0.7
        }
      ],
      geological_features: [],
      infrastructure: []
    };
  });

  describe('predictRisk', () => {
    it('should generate risk prediction with valid input', async () => {
      const input: RiskPredictionInput = {
        sensor_data: mockSensorData,
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const prediction = await predictor.predictRisk(input);

      expect(prediction).toBeDefined();
      expect(prediction.risk_probability).toBeGreaterThanOrEqual(0);
      expect(prediction.risk_probability).toBeLessThanOrEqual(1);
      expect(prediction.confidence_interval).toHaveLength(2);
      expect(prediction.confidence_interval[0]).toBeLessThanOrEqual(prediction.confidence_interval[1]);
      expect(prediction.contributing_factors).toBeInstanceOf(Array);
      expect(prediction.explanation).toBeDefined();
    });

    it('should handle empty sensor data gracefully', async () => {
      const input: RiskPredictionInput = {
        sensor_data: [],
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const prediction = await predictor.predictRisk(input);

      expect(prediction).toBeDefined();
      expect(prediction.risk_probability).toBeGreaterThanOrEqual(0);
      expect(prediction.risk_probability).toBeLessThanOrEqual(1);
    });

    it('should generate higher risk for concerning sensor readings', async () => {
      const highRiskSensorData: SensorData[] = [
        {
          sensor_id: 'sensor_high_risk',
          timestamp: new Date(),
          location: { latitude: 45.0, longitude: -120.0, elevation: 1000 },
          measurements: {
            displacement: 15.0, // High displacement
            pore_pressure: 80.0, // High pore pressure
            temperature: 25.0
          },
          quality_flags: { displacement: true, pore_pressure: true, temperature: true }
        }
      ];

      const highRiskInput: RiskPredictionInput = {
        sensor_data: highRiskSensorData,
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const lowRiskInput: RiskPredictionInput = {
        sensor_data: mockSensorData,
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const highRiskPrediction = await predictor.predictRisk(highRiskInput);
      const lowRiskPrediction = await predictor.predictRisk(lowRiskInput);

      expect(highRiskPrediction.risk_probability).toBeGreaterThan(lowRiskPrediction.risk_probability);
    });

    it('should include time to failure for high risk scenarios', async () => {
      const highRiskSensorData: SensorData[] = [
        {
          sensor_id: 'sensor_critical',
          timestamp: new Date(),
          location: { latitude: 45.0, longitude: -120.0, elevation: 1000 },
          measurements: {
            displacement: 20.0,
            pore_pressure: 90.0,
            temperature: 30.0
          },
          quality_flags: { displacement: true, pore_pressure: true, temperature: true }
        }
      ];

      const input: RiskPredictionInput = {
        sensor_data: highRiskSensorData,
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const prediction = await predictor.predictRisk(input);

      if (prediction.risk_probability > 0.3) {
        expect(prediction.time_to_failure_hours).toBeDefined();
        expect(prediction.time_to_failure_hours).toBeGreaterThan(0);
      }
    });

    it('should generate meaningful explanations', async () => {
      const input: RiskPredictionInput = {
        sensor_data: mockSensorData,
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const prediction = await predictor.predictRisk(input);

      expect(prediction.explanation.feature_importance).toBeDefined();
      expect(prediction.explanation.shap_values).toBeDefined();
      expect(prediction.explanation.natural_language_explanation).toBeDefined();
      expect(prediction.explanation.natural_language_explanation.length).toBeGreaterThan(0);
      expect(prediction.explanation.confidence_factors).toBeInstanceOf(Array);
      expect(prediction.explanation.uncertainty_sources).toBeInstanceOf(Array);
    });
  });

  describe('updateEnvironmentalContext', () => {
    it('should update environmental context successfully', async () => {
      const environmentalData = {
        rainfall_mm: 25.0,
        temperature_c: 18.0,
        humidity_percent: 75.0,
        wind_speed_ms: 5.0,
        freeze_thaw_cycles: 2
      };

      await expect(predictor.updateEnvironmentalContext(environmentalData)).resolves.not.toThrow();
    });

    it('should incorporate environmental data in predictions', async () => {
      const environmentalData = {
        rainfall_mm: 50.0, // High rainfall
        temperature_c: 5.0,
        humidity_percent: 90.0,
        wind_speed_ms: 10.0,
        freeze_thaw_cycles: 5
      };

      await predictor.updateEnvironmentalContext(environmentalData);

      const input: RiskPredictionInput = {
        sensor_data: mockSensorData,
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const predictionWithEnvironmental = await predictor.predictRisk(input);

      // Reset environmental context
      const newPredictor = new RealTimeRiskPredictor(logger);
      const predictionWithoutEnvironmental = await newPredictor.predictRisk(input);

      // Environmental factors should influence risk
      expect(predictionWithEnvironmental.contributing_factors.some(factor => 
        factor.includes('rainfall') || factor.includes('temperature')
      )).toBe(true);
    });
  });

  describe('getModelMetrics', () => {
    it('should return model metrics', () => {
      const metrics = predictor.getModelMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.averageProcessingTime).toBeDefined();
      expect(metrics.featureCount).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should complete predictions within acceptable time', async () => {
      const input: RiskPredictionInput = {
        sensor_data: mockSensorData,
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const startTime = Date.now();
      await predictor.predictRisk(input);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent predictions', async () => {
      const input: RiskPredictionInput = {
        sensor_data: mockSensorData,
        spatial_context: mockSpatialContext,
        timestamp: new Date()
      };

      const promises = Array(5).fill(null).map(() => predictor.predictRisk(input));
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.risk_probability).toBeGreaterThanOrEqual(0);
        expect(result.risk_probability).toBeLessThanOrEqual(1);
      });
    });
  });
});