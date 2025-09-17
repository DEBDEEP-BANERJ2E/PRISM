import { ModelPipeline, ModelConfig } from '../../models/ModelPipeline';
import { TrainingData } from '../../models/BaselineModels';

describe('ModelPipeline', () => {
  let pipeline: ModelPipeline;
  let mockTrainingData: TrainingData;

  beforeEach(() => {
    pipeline = new ModelPipeline();

    // Create synthetic training data
    mockTrainingData = {
      features: [],
      labels: [],
      feature_names: ['feature1', 'feature2', 'feature3']
    };

    // Generate synthetic data: y = 2*x1 + 3*x2 - x3 + noise
    for (let i = 0; i < 100; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      const x3 = Math.random() * 10;
      const noise = (Math.random() - 0.5) * 2;
      
      const y = 2 * x1 + 3 * x2 - x3 + noise;
      
      mockTrainingData.features.push([x1, x2, x3]);
      mockTrainingData.labels.push(y);
    }
  });

  describe('trainModel', () => {
    it('should train a Random Forest model', async () => {
      const config: ModelConfig = {
        model_type: 'random_forest',
        hyperparameters: {
          n_estimators: 5,
          max_depth: 5,
          min_samples_split: 2
        },
        cross_validation_folds: 3,
        test_size: 0.2,
        random_seed: 42
      };

      const result = await pipeline.trainModel(config, mockTrainingData);

      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('training_metrics');
      expect(result).toHaveProperty('validation_metrics');
      expect(result).toHaveProperty('test_metrics');
      expect(result).toHaveProperty('training_time_ms');

      expect(result.model.isTrained()).toBe(true);
      expect(result.training_time_ms).toBeGreaterThan(0);
      
      expect(result.training_metrics).toHaveProperty('mse');
      expect(result.training_metrics).toHaveProperty('mae');
      expect(result.training_metrics).toHaveProperty('r2_score');

      expect(result.validation_metrics).toHaveProperty('mean_score');
      expect(result.validation_metrics).toHaveProperty('std_score');
      expect(result.validation_metrics).toHaveProperty('fold_scores');
      expect(result.validation_metrics.fold_scores).toHaveLength(3);

      expect(result.test_metrics).toHaveProperty('mse');
      expect(result.test_metrics).toHaveProperty('mae');
      expect(result.test_metrics).toHaveProperty('r2_score');
    });

    it('should train an XGBoost model', async () => {
      const config: ModelConfig = {
        model_type: 'xgboost',
        hyperparameters: {
          learning_rate: 0.1,
          n_estimators: 10,
          max_depth: 3
        },
        cross_validation_folds: 3,
        test_size: 0.2
      };

      const result = await pipeline.trainModel(config, mockTrainingData);

      expect(result.model.isTrained()).toBe(true);
      expect(result.training_time_ms).toBeGreaterThan(0);
    });

    it('should train a Statistical Threshold model', async () => {
      const config: ModelConfig = {
        model_type: 'statistical_threshold',
        hyperparameters: {
          z_score_threshold: 2.5
        },
        cross_validation_folds: 3,
        test_size: 0.2
      };

      const result = await pipeline.trainModel(config, mockTrainingData);

      expect(result.model.isTrained()).toBe(true);
      expect(result.training_time_ms).toBeGreaterThan(0);
    });

    it('should handle custom model names', async () => {
      const config: ModelConfig = {
        model_type: 'random_forest',
        hyperparameters: { n_estimators: 3 },
        cross_validation_folds: 3,
        test_size: 0.2
      };

      await pipeline.trainModel(config, mockTrainingData, 'custom_rf_model');

      const prediction = await pipeline.predict('custom_rf_model', [1, 2, 3]);
      expect(prediction).toHaveProperty('prediction');
    });
  });

  describe('trainEnsemble', () => {
    it('should train multiple models and create ensemble', async () => {
      const configs: ModelConfig[] = [
        {
          model_type: 'random_forest',
          hyperparameters: { n_estimators: 3, max_depth: 3 },
          cross_validation_folds: 3,
          test_size: 0.2
        },
        {
          model_type: 'xgboost',
          hyperparameters: { learning_rate: 0.1, n_estimators: 5 },
          cross_validation_folds: 3,
          test_size: 0.2
        },
        {
          model_type: 'statistical_threshold',
          hyperparameters: { z_score_threshold: 2.0 },
          cross_validation_folds: 3,
          test_size: 0.2
        }
      ];

      const results = await pipeline.trainEnsemble(configs, mockTrainingData);

      expect(Object.keys(results)).toHaveLength(3);
      expect(results).toHaveProperty('random_forest_0');
      expect(results).toHaveProperty('xgboost_1');
      expect(results).toHaveProperty('statistical_threshold_2');

      for (const result of Object.values(results)) {
        expect(result.model.isTrained()).toBe(true);
        expect(result.training_time_ms).toBeGreaterThan(0);
      }
    });

    it('should handle ensemble with different configurations', async () => {
      const configs: ModelConfig[] = [
        {
          model_type: 'random_forest',
          hyperparameters: { n_estimators: 2 },
          cross_validation_folds: 2,
          test_size: 0.3
        },
        {
          model_type: 'random_forest',
          hyperparameters: { n_estimators: 4 },
          cross_validation_folds: 2,
          test_size: 0.3
        }
      ];

      const results = await pipeline.trainEnsemble(configs, mockTrainingData);

      expect(Object.keys(results)).toHaveLength(2);
      expect(results).toHaveProperty('random_forest_0');
      expect(results).toHaveProperty('random_forest_1');
    });
  });

  describe('predict', () => {
    it('should make predictions with trained model', async () => {
      const config: ModelConfig = {
        model_type: 'random_forest',
        hyperparameters: { n_estimators: 3 },
        cross_validation_folds: 3,
        test_size: 0.2
      };

      await pipeline.trainModel(config, mockTrainingData, 'test_model');

      const prediction = await pipeline.predict('test_model', [5, 5, 5]);

      expect(prediction).toHaveProperty('prediction');
      expect(prediction).toHaveProperty('confidence');
      expect(typeof prediction.prediction).toBe('number');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should throw error for non-existent model', async () => {
      await expect(pipeline.predict('non_existent_model', [1, 2, 3])).rejects.toThrow();
    });
  });

  describe('predictEnsemble', () => {
    it('should make ensemble predictions', async () => {
      const configs: ModelConfig[] = [
        {
          model_type: 'random_forest',
          hyperparameters: { n_estimators: 3 },
          cross_validation_folds: 3,
          test_size: 0.2
        },
        {
          model_type: 'statistical_threshold',
          hyperparameters: { z_score_threshold: 2.0 },
          cross_validation_folds: 3,
          test_size: 0.2
        }
      ];

      await pipeline.trainEnsemble(configs, mockTrainingData);

      const ensemblePrediction = await pipeline.predictEnsemble([5, 5, 5]);

      expect(ensemblePrediction).toHaveProperty('prediction');
      expect(ensemblePrediction).toHaveProperty('confidence');
      expect(ensemblePrediction).toHaveProperty('individual_predictions');
      expect(ensemblePrediction).toHaveProperty('model_weights');

      expect(typeof ensemblePrediction.prediction).toBe('number');
      expect(ensemblePrediction.confidence).toBeGreaterThanOrEqual(0);
      expect(ensemblePrediction.confidence).toBeLessThanOrEqual(1);

      expect(Object.keys(ensemblePrediction.individual_predictions)).toHaveLength(2);
      expect(Object.keys(ensemblePrediction.model_weights)).toHaveLength(2);
    });

    it('should throw error when no models available', async () => {
      await expect(pipeline.predictEnsemble([1, 2, 3])).rejects.toThrow();
    });
  });

  describe('evaluateEnsemble', () => {
    it('should evaluate ensemble performance', async () => {
      const configs: ModelConfig[] = [
        {
          model_type: 'random_forest',
          hyperparameters: { n_estimators: 3 },
          cross_validation_folds: 3,
          test_size: 0.2
        }
      ];

      await pipeline.trainEnsemble(configs, mockTrainingData);

      const testData: TrainingData = {
        features: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        labels: [10, 20, 30],
        feature_names: ['feature1', 'feature2', 'feature3']
      };

      const metrics = await pipeline.evaluateEnsemble(testData);

      expect(metrics).toHaveProperty('mse');
      expect(metrics).toHaveProperty('mae');
      expect(metrics).toHaveProperty('r2_score');

      expect(typeof metrics.mse).toBe('number');
      expect(typeof metrics.mae).toBe('number');
      expect(typeof metrics.r2_score).toBe('number');
    });
  });

  describe('getModelComparison', () => {
    it('should return model comparison information', async () => {
      const configs: ModelConfig[] = [
        {
          model_type: 'random_forest',
          hyperparameters: { n_estimators: 3 },
          cross_validation_folds: 3,
          test_size: 0.2
        },
        {
          model_type: 'xgboost',
          hyperparameters: { n_estimators: 5 },
          cross_validation_folds: 3,
          test_size: 0.2
        }
      ];

      await pipeline.trainEnsemble(configs, mockTrainingData);

      const comparison = pipeline.getModelComparison();

      expect(Object.keys(comparison)).toHaveLength(2);
      
      for (const [_modelName, info] of Object.entries(comparison)) {
        expect(info).toHaveProperty('weight');
        expect(info).toHaveProperty('available');
        expect(typeof info.weight).toBe('number');
        expect(typeof info.available).toBe('boolean');
        expect(info.weight).toBeGreaterThanOrEqual(0);
        expect(info.weight).toBeLessThanOrEqual(1);
      }

      // Weights should sum to approximately 1
      const totalWeight = Object.values(comparison).reduce((sum, info) => sum + info.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 2);
    });
  });

  describe('saveModels and loadModels', () => {
    it('should save and load model states', async () => {
      const config: ModelConfig = {
        model_type: 'random_forest',
        hyperparameters: { n_estimators: 3 },
        cross_validation_folds: 3,
        test_size: 0.2
      };

      await pipeline.trainModel(config, mockTrainingData, 'test_model');

      const modelStates = pipeline.saveModels();

      expect(modelStates).toHaveProperty('test_model');
      expect(modelStates.test_model).toHaveProperty('type');
      expect(modelStates.test_model).toHaveProperty('trained');
      expect(modelStates.test_model).toHaveProperty('feature_names');
      expect(modelStates.test_model).toHaveProperty('weight');

      expect(modelStates.test_model.trained).toBe(true);

      // Test loading (simplified test since actual loading is not implemented)
      expect(() => pipeline.loadModels(modelStates)).not.toThrow();
    });
  });

  describe('gridSearch', () => {
    it('should perform hyperparameter grid search', async () => {
      const baseConfig: ModelConfig = {
        model_type: 'random_forest',
        hyperparameters: {},
        cross_validation_folds: 2,
        test_size: 0.3
      };

      const parameterGrid = {
        n_estimators: [2, 3],
        max_depth: [2, 3]
      };

      const gridSearchResult = await pipeline.gridSearch(baseConfig, parameterGrid, mockTrainingData);

      expect(gridSearchResult).toHaveProperty('bestConfig');
      expect(gridSearchResult).toHaveProperty('bestScore');
      expect(gridSearchResult).toHaveProperty('results');

      expect(gridSearchResult.results).toHaveLength(4); // 2 * 2 combinations
      expect(typeof gridSearchResult.bestScore).toBe('number');

      for (const result of gridSearchResult.results) {
        expect(result).toHaveProperty('parameters');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('metrics');
      }
    });

    it('should handle single parameter grid search', async () => {
      const baseConfig: ModelConfig = {
        model_type: 'statistical_threshold',
        hyperparameters: {},
        cross_validation_folds: 2,
        test_size: 0.3
      };

      const parameterGrid = {
        z_score_threshold: [1.5, 2.0, 2.5]
      };

      const gridSearchResult = await pipeline.gridSearch(baseConfig, parameterGrid, mockTrainingData);

      expect(gridSearchResult.results).toHaveLength(3);
      expect(typeof gridSearchResult.bestScore).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle small datasets', async () => {
      const smallData: TrainingData = {
        features: [[1, 2], [3, 4], [5, 6], [7, 8]],
        labels: [1, 2, 3, 4],
        feature_names: ['x1', 'x2']
      };

      const config: ModelConfig = {
        model_type: 'statistical_threshold',
        hyperparameters: { z_score_threshold: 2.0 },
        cross_validation_folds: 2,
        test_size: 0.25
      };

      const result = await pipeline.trainModel(config, smallData);
      expect(result.model.isTrained()).toBe(true);
    });

    it('should handle invalid model type', async () => {
      const config: ModelConfig = {
        model_type: 'invalid_model' as any,
        hyperparameters: {},
        cross_validation_folds: 3,
        test_size: 0.2
      };

      await expect(pipeline.trainModel(config, mockTrainingData)).rejects.toThrow();
    });

    it('should handle empty hyperparameters', async () => {
      const config: ModelConfig = {
        model_type: 'random_forest',
        hyperparameters: {},
        cross_validation_folds: 3,
        test_size: 0.2
      };

      const result = await pipeline.trainModel(config, mockTrainingData);
      expect(result.model.isTrained()).toBe(true);
    });
  });

  describe('performance', () => {
    it('should train ensemble efficiently', async () => {
      const configs: ModelConfig[] = [
        {
          model_type: 'random_forest',
          hyperparameters: { n_estimators: 3, max_depth: 3 },
          cross_validation_folds: 2,
          test_size: 0.3
        },
        {
          model_type: 'xgboost',
          hyperparameters: { learning_rate: 0.2, n_estimators: 5 },
          cross_validation_folds: 2,
          test_size: 0.3
        },
        {
          model_type: 'statistical_threshold',
          hyperparameters: { z_score_threshold: 2.0 },
          cross_validation_folds: 2,
          test_size: 0.3
        }
      ];

      const startTime = Date.now();
      const results = await pipeline.trainEnsemble(configs, mockTrainingData);
      const trainingTime = Date.now() - startTime;

      expect(trainingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(Object.keys(results)).toHaveLength(3);
    });

    it('should make ensemble predictions efficiently', async () => {
      const configs: ModelConfig[] = [
        {
          model_type: 'random_forest',
          hyperparameters: { n_estimators: 2 },
          cross_validation_folds: 2,
          test_size: 0.3
        },
        {
          model_type: 'statistical_threshold',
          hyperparameters: { z_score_threshold: 2.0 },
          cross_validation_folds: 2,
          test_size: 0.3
        }
      ];

      await pipeline.trainEnsemble(configs, mockTrainingData);

      const startTime = Date.now();
      
      // Make multiple ensemble predictions
      for (let i = 0; i < 50; i++) {
        await pipeline.predictEnsemble([Math.random() * 10, Math.random() * 10, Math.random() * 10]);
      }
      
      const predictionTime = Date.now() - startTime;
      expect(predictionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});