import { 
  RandomForestModel, 
  XGBoostModel, 
  StatisticalThresholdModel, 
  CrossValidator,
  TrainingData 
} from '../../models/BaselineModels';

describe('BaselineModels', () => {
  let mockTrainingData: TrainingData;
  let mockTestData: TrainingData;

  beforeEach(() => {
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

    // Create test data
    mockTestData = {
      features: [],
      labels: [],
      feature_names: ['feature1', 'feature2', 'feature3']
    };

    for (let i = 0; i < 20; i++) {
      const x1 = Math.random() * 10;
      const x2 = Math.random() * 10;
      const x3 = Math.random() * 10;
      const noise = (Math.random() - 0.5) * 2;
      
      const y = 2 * x1 + 3 * x2 - x3 + noise;
      
      mockTestData.features.push([x1, x2, x3]);
      mockTestData.labels.push(y);
    }
  });

  describe('RandomForestModel', () => {
    let model: RandomForestModel;

    beforeEach(() => {
      model = new RandomForestModel(5, 5, 2); // Small forest for testing
    });

    it('should initialize correctly', () => {
      expect(model).toBeDefined();
      expect(model.isTrained()).toBe(false);
    });

    it('should train successfully', async () => {
      await model.train(mockTrainingData);
      expect(model.isTrained()).toBe(true);
      expect(model.getFeatureNames()).toEqual(mockTrainingData.feature_names);
    });

    it('should make predictions after training', async () => {
      await model.train(mockTrainingData);
      
      const prediction = await model.predict([5, 5, 5]);
      
      expect(prediction).toHaveProperty('prediction');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('feature_importance');
      
      expect(typeof prediction.prediction).toBe('number');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should throw error when predicting without training', async () => {
      await expect(model.predict([1, 2, 3])).rejects.toThrow();
    });

    it('should evaluate model performance', async () => {
      await model.train(mockTrainingData);
      
      const metrics = await model.evaluate(mockTestData);
      
      expect(metrics).toHaveProperty('mse');
      expect(metrics).toHaveProperty('mae');
      expect(metrics).toHaveProperty('r2_score');
      
      expect(typeof metrics.mse).toBe('number');
      expect(typeof metrics.mae).toBe('number');
      expect(typeof metrics.r2_score).toBe('number');
      
      expect(metrics.mse).toBeGreaterThanOrEqual(0);
      expect(metrics.mae).toBeGreaterThanOrEqual(0);
    });

    it('should handle different hyperparameters', async () => {
      const model1 = new RandomForestModel(3, 3, 2);
      const model2 = new RandomForestModel(10, 8, 3);
      
      await model1.train(mockTrainingData);
      await model2.train(mockTrainingData);
      
      expect(model1.isTrained()).toBe(true);
      expect(model2.isTrained()).toBe(true);
    });
  });

  describe('XGBoostModel', () => {
    let model: XGBoostModel;

    beforeEach(() => {
      model = new XGBoostModel(0.1, 10, 3); // Small model for testing
    });

    it('should initialize correctly', () => {
      expect(model).toBeDefined();
      expect(model.isTrained()).toBe(false);
    });

    it('should train successfully', async () => {
      await model.train(mockTrainingData);
      expect(model.isTrained()).toBe(true);
      expect(model.getFeatureNames()).toEqual(mockTrainingData.feature_names);
    });

    it('should make predictions after training', async () => {
      await model.train(mockTrainingData);
      
      const prediction = await model.predict([5, 5, 5]);
      
      expect(prediction).toHaveProperty('prediction');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('feature_importance');
      
      expect(typeof prediction.prediction).toBe('number');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should throw error when predicting without training', async () => {
      await expect(model.predict([1, 2, 3])).rejects.toThrow();
    });

    it('should evaluate model performance', async () => {
      await model.train(mockTrainingData);
      
      const metrics = await model.evaluate(mockTestData);
      
      expect(metrics).toHaveProperty('mse');
      expect(metrics).toHaveProperty('mae');
      expect(metrics).toHaveProperty('r2_score');
      
      expect(typeof metrics.mse).toBe('number');
      expect(typeof metrics.mae).toBe('number');
      expect(typeof metrics.r2_score).toBe('number');
    });

    it('should handle different hyperparameters', async () => {
      const model1 = new XGBoostModel(0.05, 5, 2);
      const model2 = new XGBoostModel(0.2, 20, 5);
      
      await model1.train(mockTrainingData);
      await model2.train(mockTrainingData);
      
      expect(model1.isTrained()).toBe(true);
      expect(model2.isTrained()).toBe(true);
    });
  });

  describe('StatisticalThresholdModel', () => {
    let model: StatisticalThresholdModel;

    beforeEach(() => {
      model = new StatisticalThresholdModel(2.0);
    });

    it('should initialize correctly', () => {
      expect(model).toBeDefined();
      expect(model.isTrained()).toBe(false);
    });

    it('should train successfully', async () => {
      await model.train(mockTrainingData);
      expect(model.isTrained()).toBe(true);
      expect(model.getFeatureNames()).toEqual(mockTrainingData.feature_names);
    });

    it('should calculate thresholds correctly', async () => {
      await model.train(mockTrainingData);
      
      const thresholds = model.getThresholds();
      const statistics = model.getStatistics();
      
      expect(Object.keys(thresholds)).toEqual(mockTrainingData.feature_names);
      expect(Object.keys(statistics)).toEqual(mockTrainingData.feature_names);
      
      for (const featureName of mockTrainingData.feature_names!) {
        expect(typeof thresholds[featureName]).toBe('number');
        expect(typeof statistics[featureName].mean).toBe('number');
        expect(typeof statistics[featureName].std).toBe('number');
      }
    });

    it('should make predictions after training', async () => {
      await model.train(mockTrainingData);
      
      const prediction = await model.predict([5, 5, 5]);
      
      expect(prediction).toHaveProperty('prediction');
      expect(prediction).toHaveProperty('confidence');
      
      expect(typeof prediction.prediction).toBe('number');
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.prediction).toBeGreaterThanOrEqual(0);
      expect(prediction.prediction).toBeLessThanOrEqual(1);
    });

    it('should detect anomalies correctly', async () => {
      await model.train(mockTrainingData);
      
      // Normal values should have low alert score
      const normalPrediction = await model.predict([5, 5, 5]);
      
      // Extreme values should have high alert score
      const anomalousPrediction = await model.predict([100, 100, 100]);
      
      expect(anomalousPrediction.prediction).toBeGreaterThan(normalPrediction.prediction);
    });

    it('should evaluate model performance', async () => {
      await model.train(mockTrainingData);
      
      const metrics = await model.evaluate(mockTestData);
      
      expect(metrics).toHaveProperty('mse');
      expect(metrics).toHaveProperty('mae');
      expect(metrics).toHaveProperty('r2_score');
    });
  });

  describe('CrossValidator', () => {
    it('should perform k-fold cross validation', async () => {
      const model = new RandomForestModel(3, 3, 2);
      const k = 3;
      
      const result = await CrossValidator.kFoldCrossValidation(model, mockTrainingData, k);
      
      expect(result).toHaveProperty('mean_score');
      expect(result).toHaveProperty('std_score');
      expect(result).toHaveProperty('fold_scores');
      expect(result).toHaveProperty('metrics');
      
      expect(result.fold_scores).toHaveLength(k);
      expect(typeof result.mean_score).toBe('number');
      expect(typeof result.std_score).toBe('number');
      
      expect(result.metrics).toHaveProperty('mse');
      expect(result.metrics).toHaveProperty('mae');
      expect(result.metrics).toHaveProperty('r2_score');
    });

    it('should handle different values of k', async () => {
      const model = new StatisticalThresholdModel(2.0);
      
      const result3 = await CrossValidator.kFoldCrossValidation(model, mockTrainingData, 3);
      const result5 = await CrossValidator.kFoldCrossValidation(model, mockTrainingData, 5);
      
      expect(result3.fold_scores).toHaveLength(3);
      expect(result5.fold_scores).toHaveLength(5);
    });

    it('should work with different model types', async () => {
      const models = [
        new RandomForestModel(3, 3, 2),
        new XGBoostModel(0.1, 5, 3),
        new StatisticalThresholdModel(2.0)
      ];

      for (const model of models) {
        const result = await CrossValidator.kFoldCrossValidation(model, mockTrainingData, 3);
        
        expect(result.fold_scores).toHaveLength(3);
        expect(typeof result.mean_score).toBe('number');
        expect(typeof result.std_score).toBe('number');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle small datasets', async () => {
      const smallData: TrainingData = {
        features: [[1, 2], [3, 4], [5, 6]],
        labels: [1, 2, 3],
        feature_names: ['x1', 'x2']
      };

      const model = new RandomForestModel(2, 2, 1);
      await model.train(smallData);
      
      const prediction = await model.predict([2, 3]);
      expect(prediction).toHaveProperty('prediction');
    });

    it('should handle single feature', async () => {
      const singleFeatureData: TrainingData = {
        features: [[1], [2], [3], [4], [5]],
        labels: [2, 4, 6, 8, 10],
        feature_names: ['x']
      };

      const model = new StatisticalThresholdModel(2.0);
      await model.train(singleFeatureData);
      
      const prediction = await model.predict([3]);
      expect(prediction).toHaveProperty('prediction');
    });

    it('should handle identical values', async () => {
      const identicalData: TrainingData = {
        features: [[5, 5], [5, 5], [5, 5], [5, 5]],
        labels: [10, 10, 10, 10],
        feature_names: ['x1', 'x2']
      };

      const model = new StatisticalThresholdModel(2.0);
      await model.train(identicalData);
      
      const prediction = await model.predict([5, 5]);
      expect(prediction).toHaveProperty('prediction');
    });

    it('should handle missing feature names', async () => {
      const dataWithoutNames: TrainingData = {
        features: [[1, 2], [3, 4], [5, 6]],
        labels: [1, 2, 3]
      };

      const model = new RandomForestModel(2, 2, 1);
      await model.train(dataWithoutNames);
      
      expect(model.getFeatureNames()).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should train models efficiently', async () => {
      const largeData: TrainingData = {
        features: [],
        labels: [],
        feature_names: ['x1', 'x2', 'x3', 'x4', 'x5']
      };

      // Generate moderately sized dataset for performance testing
      for (let i = 0; i < 200; i++) {
        const features = Array.from({ length: 5 }, () => Math.random() * 10);
        const label = features.reduce((sum, val) => sum + val, 0) + Math.random();
        
        largeData.features.push(features);
        largeData.labels.push(label);
      }

      const models = [
        new RandomForestModel(3, 3, 2), // Smaller forest
        new XGBoostModel(0.2, 5, 2),    // Fewer estimators
        new StatisticalThresholdModel(2.0)
      ];

      for (const model of models) {
        const startTime = Date.now();
        await model.train(largeData);
        const trainingTime = Date.now() - startTime;
        
        expect(trainingTime).toBeLessThan(10000); // Should complete within 10 seconds
        expect(model.isTrained()).toBe(true);
      }
    });

    it('should make predictions efficiently', async () => {
      const model = new RandomForestModel(5, 5, 2);
      await model.train(mockTrainingData);

      const startTime = Date.now();
      
      // Make many predictions
      for (let i = 0; i < 100; i++) {
        await model.predict([Math.random() * 10, Math.random() * 10, Math.random() * 10]);
      }
      
      const predictionTime = Date.now() - startTime;
      expect(predictionTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});