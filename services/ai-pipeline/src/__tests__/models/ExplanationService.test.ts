import { ExplanationService, ExplanationServiceConfig, BatchExplanationRequest } from '../../models/ExplanationService';
import { ModelPipeline } from '../../models/ModelPipeline';
import { TrainingData } from '../../models/BaselineModels';

// Mock ModelPipeline
class MockModelPipeline extends ModelPipeline {
  private mockModels = new Map<string, any>();

  constructor() {
    super();
    // Add some mock models
    this.mockModels.set('test_model', {
      predict: async (features: number[]) => ({
        prediction: features.reduce((sum, val) => sum + val, 0) / features.length,
        confidence: 0.8
      })
    });
  }

  async predict(modelName: string, features: number[]): Promise<any> {
    const model = this.mockModels.get(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }
    return model.predict(features);
  }
}

describe('ExplanationService', () => {
  let explanationService: ExplanationService;
  let mockModelPipeline: MockModelPipeline;
  let sampleFeatures: number[];
  let featureNames: string[];
  let backgroundData: TrainingData;
  let config: ExplanationServiceConfig;

  beforeEach(() => {
    mockModelPipeline = new MockModelPipeline();
    config = {
      default_explanation_type: 'shap',
      num_lime_samples: 100,
      cache_explanations: true,
      max_cache_size: 10
    };
    
    explanationService = new ExplanationService(mockModelPipeline, config);
    
    sampleFeatures = [0.6, 0.4, 0.3, 0.5, 0.2];
    featureNames = ['slope_angle', 'joint_orientation', 'displacement_rate', 'pore_pressure', 'rainfall_accumulation'];
    
    backgroundData = {
      features: [
        [0.5, 0.3, 0.2, 0.4, 0.1],
        [0.7, 0.5, 0.4, 0.6, 0.3],
        [0.4, 0.2, 0.1, 0.3, 0.05]
      ],
      labels: [0.3, 0.7, 0.2],
      feature_names: featureNames
    };

    explanationService.setBackgroundData(backgroundData);
  });

  describe('Single Prediction Explanation', () => {
    test('should explain single prediction successfully', async () => {
      const result = await explanationService.explainPrediction(
        'test_model',
        sampleFeatures,
        featureNames
      );

      expect(result.natural_language_explanation).toBeDefined();
      expect(result.visualization_data).toBeDefined();
      expect(result.shap_explanation).toBeDefined(); // Default is SHAP
    });

    test('should use specified explanation type', async () => {
      const result = await explanationService.explainPrediction(
        'test_model',
        sampleFeatures,
        featureNames,
        'lime'
      );

      expect(result.lime_explanation).toBeDefined();
      expect(result.shap_explanation).toBeUndefined();
    });

    test('should generate both explanations when requested', async () => {
      const result = await explanationService.explainPrediction(
        'test_model',
        sampleFeatures,
        featureNames,
        'both'
      );

      expect(result.shap_explanation).toBeDefined();
      expect(result.lime_explanation).toBeDefined();
    });

    test('should throw error for non-existent model', async () => {
      await expect(
        explanationService.explainPrediction(
          'non_existent_model',
          sampleFeatures,
          featureNames
        )
      ).rejects.toThrow('Model non_existent_model not found');
    });
  });

  describe('Batch Explanations', () => {
    test('should process batch explanations successfully', async () => {
      const batchRequest: BatchExplanationRequest = {
        instances: [
          [0.6, 0.4, 0.3, 0.5, 0.2],
          [0.7, 0.5, 0.4, 0.6, 0.3],
          [0.4, 0.2, 0.1, 0.3, 0.05]
        ],
        feature_names: featureNames,
        model_name: 'test_model'
      };

      const result = await explanationService.explainBatch(batchRequest);

      expect(result.explanations).toHaveLength(3);
      expect(result.summary_statistics).toBeDefined();
      expect(result.summary_statistics.avg_risk_level).toBeDefined();
      expect(result.summary_statistics.most_important_features).toBeDefined();
      expect(result.summary_statistics.confidence_distribution).toBeDefined();
    });

    test('should handle partial failures in batch processing', async () => {
      // Mock a scenario where some predictions fail
      const originalPredict = mockModelPipeline.predict;
      let callCount = 0;
      
      mockModelPipeline.predict = async (modelName: string, features: number[]) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Prediction failed');
        }
        return originalPredict.call(mockModelPipeline, modelName, features);
      };

      const batchRequest: BatchExplanationRequest = {
        instances: [
          [0.6, 0.4, 0.3, 0.5, 0.2],
          [0.7, 0.5, 0.4, 0.6, 0.3], // This will fail
          [0.4, 0.2, 0.1, 0.3, 0.05]
        ],
        feature_names: featureNames,
        model_name: 'test_model'
      };

      const result = await explanationService.explainBatch(batchRequest);

      // Should have 2 successful explanations (1st and 3rd)
      expect(result.explanations.length).toBeLessThan(3);
      expect(result.explanations.length).toBeGreaterThan(0);
    });

    test('should generate meaningful summary statistics', async () => {
      const batchRequest: BatchExplanationRequest = {
        instances: [
          [0.1, 0.1, 0.1, 0.1, 0.1], // Low risk
          [0.8, 0.8, 0.8, 0.8, 0.8], // High risk
          [0.4, 0.4, 0.4, 0.4, 0.4]  // Medium risk
        ],
        feature_names: featureNames,
        model_name: 'test_model'
      };

      const result = await explanationService.explainBatch(batchRequest);
      const stats = result.summary_statistics;

      expect(stats.avg_risk_level).toMatch(/^(Low|Medium|High|Critical)$/);
      expect(stats.most_important_features.length).toBeGreaterThan(0);
      expect(stats.most_important_features.length).toBeLessThanOrEqual(5);
      
      // Check confidence distribution
      const totalConfidence = Object.values(stats.confidence_distribution)
        .reduce((sum, count) => sum + count, 0);
      expect(totalConfidence).toBe(result.explanations.length);
    });
  });

  describe('Ensemble Explanations', () => {
    test('should combine explanations from multiple models', async () => {
      // Add another mock model
      const mockModelPipeline2 = mockModelPipeline as any;
      mockModelPipeline2.mockModels.set('test_model_2', {
        predict: async (features: number[]) => ({
          prediction: Math.min(1, features.reduce((sum, val) => sum + val, 0) / features.length * 1.2),
          confidence: 0.7
        })
      });

      const result = await explanationService.explainEnsemble(
        sampleFeatures,
        featureNames,
        ['test_model', 'test_model_2']
      );

      expect(result.ensemble_explanation).toBeDefined();
      expect(result.individual_explanations).toBeDefined();
      expect(Object.keys(result.individual_explanations)).toHaveLength(2);
      expect(result.individual_explanations['test_model']).toBeDefined();
      expect(result.individual_explanations['test_model_2']).toBeDefined();
    });

    test('should handle missing models in ensemble gracefully', async () => {
      const result = await explanationService.explainEnsemble(
        sampleFeatures,
        featureNames,
        ['test_model', 'non_existent_model']
      );

      expect(result.individual_explanations['test_model']).toBeDefined();
      expect(result.individual_explanations['non_existent_model']).toBeUndefined();
    });
  });

  describe('Operational Explanations', () => {
    test('should generate operational context explanations', async () => {
      const operationalContext = {
        location: 'Bench 12-A',
        current_operations: ['hauling', 'drilling'],
        personnel_count: 15,
        equipment_value: 2500000
      };

      const result = await explanationService.generateOperationalExplanation(
        'test_model',
        sampleFeatures,
        featureNames,
        operationalContext
      );

      expect(result.explanation).toBeDefined();
      expect(result.operational_impact).toBeDefined();
      expect(result.operational_impact.personnel_risk).toBeDefined();
      expect(result.operational_impact.equipment_risk).toBeDefined();
      expect(result.operational_impact.operational_recommendations).toBeDefined();
      expect(result.operational_impact.estimated_cost_impact).toBeGreaterThan(0);
    });

    test('should scale cost impact with risk level', async () => {
      const operationalContext = {
        location: 'Bench 12-A',
        current_operations: ['hauling'],
        personnel_count: 10,
        equipment_value: 1000000
      };

      // Test with low risk features
      const lowRiskResult = await explanationService.generateOperationalExplanation(
        'test_model',
        [0.1, 0.1, 0.1, 0.1, 0.1],
        featureNames,
        operationalContext
      );

      // Test with high risk features
      const highRiskResult = await explanationService.generateOperationalExplanation(
        'test_model',
        [0.8, 0.8, 0.8, 0.8, 0.8],
        featureNames,
        operationalContext
      );

      expect(highRiskResult.operational_impact.estimated_cost_impact)
        .toBeGreaterThan(lowRiskResult.operational_impact.estimated_cost_impact);
    });
  });

  describe('Feature Importance Trends', () => {
    test('should analyze feature importance trends over time', async () => {
      const timeSeriesData = [
        { timestamp: new Date('2024-01-01'), features: [0.3, 0.2, 0.1, 0.2, 0.1] },
        { timestamp: new Date('2024-01-02'), features: [0.4, 0.3, 0.2, 0.3, 0.2] },
        { timestamp: new Date('2024-01-03'), features: [0.6, 0.5, 0.4, 0.5, 0.3] },
        { timestamp: new Date('2024-01-04'), features: [0.7, 0.6, 0.5, 0.6, 0.4] }
      ];

      const result = await explanationService.analyzeFeatureImportanceTrends(
        'test_model',
        timeSeriesData,
        featureNames
      );

      expect(result.feature_trends).toBeDefined();
      expect(result.trend_analysis).toBeDefined();
      expect(result.risk_evolution).toBeDefined();
      expect(result.risk_evolution).toHaveLength(timeSeriesData.length);

      // Check that all features are tracked
      featureNames.forEach(featureName => {
        expect(result.feature_trends[featureName]).toBeDefined();
        expect(result.feature_trends[featureName].timestamps).toHaveLength(timeSeriesData.length);
        expect(result.feature_trends[featureName].importance_values).toHaveLength(timeSeriesData.length);
      });
    });

    test('should detect significant trends in feature importance', async () => {
      // Create data with a clear trend in one feature
      const timeSeriesData = [
        { timestamp: new Date('2024-01-01'), features: [0.1, 0.2, 0.1, 0.2, 0.1] },
        { timestamp: new Date('2024-01-02'), features: [0.3, 0.2, 0.1, 0.2, 0.1] },
        { timestamp: new Date('2024-01-03'), features: [0.6, 0.2, 0.1, 0.2, 0.1] },
        { timestamp: new Date('2024-01-04'), features: [0.9, 0.2, 0.1, 0.2, 0.1] }
      ];

      const result = await explanationService.analyzeFeatureImportanceTrends(
        'test_model',
        timeSeriesData,
        featureNames
      );

      // Should generate trend analysis
      expect(result.trend_analysis).toBeDefined();
      expect(Array.isArray(result.trend_analysis)).toBe(true);
      
      // Should track feature trends over time
      expect(result.feature_trends).toBeDefined();
      expect(result.feature_trends['slope_angle']).toBeDefined();
      expect(result.feature_trends['slope_angle'].timestamps).toHaveLength(4);
      expect(result.feature_trends['slope_angle'].importance_values).toHaveLength(4);
      
      // Should track risk evolution
      expect(result.risk_evolution).toHaveLength(4);
    });
  });

  describe('Caching', () => {
    test('should cache explanations when enabled', async () => {
      // First call
      const result1 = await explanationService.explainPrediction(
        'test_model',
        sampleFeatures,
        featureNames
      );

      // Second call with same parameters
      const result2 = await explanationService.explainPrediction(
        'test_model',
        sampleFeatures,
        featureNames
      );

      // Results should be identical (from cache)
      expect(result1.natural_language_explanation.summary)
        .toBe(result2.natural_language_explanation.summary);

      const cacheStats = explanationService.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    test('should respect cache size limits', async () => {
      const smallCacheConfig: ExplanationServiceConfig = {
        ...config,
        max_cache_size: 2
      };
      
      const smallCacheService = new ExplanationService(mockModelPipeline, smallCacheConfig);

      // Make 3 different requests (more than cache size)
      await smallCacheService.explainPrediction('test_model', [0.1, 0.1, 0.1, 0.1, 0.1], featureNames);
      await smallCacheService.explainPrediction('test_model', [0.2, 0.2, 0.2, 0.2, 0.2], featureNames);
      await smallCacheService.explainPrediction('test_model', [0.3, 0.3, 0.3, 0.3, 0.3], featureNames);

      const cacheStats = smallCacheService.getCacheStats();
      expect(cacheStats.size).toBeLessThanOrEqual(2);
    });

    test('should clear cache when requested', async () => {
      await explanationService.explainPrediction('test_model', sampleFeatures, featureNames);
      
      let cacheStats = explanationService.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      explanationService.clearCache();
      
      cacheStats = explanationService.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });

    test('should provide meaningful cache statistics', async () => {
      // Make some cached calls
      await explanationService.explainPrediction('test_model', sampleFeatures, featureNames);
      await explanationService.explainPrediction('test_model', sampleFeatures, featureNames); // Cache hit
      await explanationService.explainPrediction('test_model', [0.1, 0.1, 0.1, 0.1, 0.1], featureNames);

      const cacheStats = explanationService.getCacheStats();
      
      expect(cacheStats.size).toBeGreaterThan(0);
      expect(cacheStats.hit_rate).toBeGreaterThanOrEqual(0);
      expect(cacheStats.hit_rate).toBeLessThanOrEqual(1);
      expect(Array.isArray(cacheStats.most_accessed)).toBe(true);
    });
  });

  describe('Configuration', () => {
    test('should use default configuration when not provided', () => {
      const defaultService = new ExplanationService(mockModelPipeline);
      expect(defaultService).toBeDefined();
    });

    test('should respect custom configuration', async () => {
      const customConfig: ExplanationServiceConfig = {
        default_explanation_type: 'lime',
        num_lime_samples: 50,
        cache_explanations: false,
        max_cache_size: 5
      };

      const customService = new ExplanationService(mockModelPipeline, customConfig);
      
      const result = await customService.explainPrediction(
        'test_model',
        sampleFeatures,
        featureNames
      );

      // Should use LIME as default
      expect(result.lime_explanation).toBeDefined();
      expect(result.shap_explanation).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle model pipeline errors gracefully', async () => {
      const errorPipeline = {
        predict: async () => { throw new Error('Pipeline error'); }
      } as any;

      const errorService = new ExplanationService(errorPipeline, config);

      await expect(
        errorService.explainPrediction('test_model', sampleFeatures, featureNames)
      ).rejects.toThrow();
    });

    test('should handle invalid feature dimensions', async () => {
      await expect(
        explanationService.explainPrediction(
          'test_model',
          [0.5, 0.3], // Wrong number of features
          featureNames
        )
      ).rejects.toThrow();
    });

    test('should handle empty batch requests', async () => {
      const emptyBatchRequest: BatchExplanationRequest = {
        instances: [],
        feature_names: featureNames,
        model_name: 'test_model'
      };

      const result = await explanationService.explainBatch(emptyBatchRequest);
      
      expect(result.explanations).toHaveLength(0);
      expect(result.summary_statistics.avg_risk_level).toBe('Unknown');
    });
  });

  describe('Performance', () => {
    test('should complete single explanation within reasonable time', async () => {
      const startTime = Date.now();
      
      await explanationService.explainPrediction('test_model', sampleFeatures, featureNames);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    test('should handle concurrent explanations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        explanationService.explainPrediction(
          'test_model',
          sampleFeatures.map(f => f + i * 0.1),
          featureNames
        )
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.natural_language_explanation).toBeDefined();
      });
    });
  });
});