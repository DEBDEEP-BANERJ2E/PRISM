import { BaseModel, TrainingData, ModelMetrics, CrossValidationResult, RandomForestModel, XGBoostModel, StatisticalThresholdModel, CrossValidator } from './BaselineModels';

export interface ModelConfig {
  model_type: 'random_forest' | 'xgboost' | 'statistical_threshold';
  hyperparameters: { [key: string]: any };
  cross_validation_folds: number;
  test_size: number; // Fraction of data to use for testing
  random_seed?: number;
}

export interface ModelTrainingResult {
  model: BaseModel;
  training_metrics: ModelMetrics;
  validation_metrics: CrossValidationResult;
  test_metrics: ModelMetrics;
  feature_importance?: { [key: string]: number } | undefined;
  training_time_ms: number;
}

export interface ModelEnsembleResult {
  prediction: number;
  confidence: number;
  individual_predictions: { [key: string]: number };
  model_weights: { [key: string]: number };
}

export class ModelPipeline {
  private models: Map<string, BaseModel> = new Map();
  private model_weights: Map<string, number> = new Map();

  /**
   * Train a single model
   */
  public async trainModel(
    config: ModelConfig,
    data: TrainingData,
    modelName: string = config.model_type
  ): Promise<ModelTrainingResult> {
    const startTime = Date.now();

    // Split data into train and test sets
    const { trainData, testData } = this.splitData(data, config.test_size, config.random_seed);

    // Create model instance
    const model = this.createModel(config);

    // Train the model
    await model.train(trainData);

    // Evaluate on training data
    const trainingMetrics = await model.evaluate(trainData);

    // Cross-validation on training data
    const validationMetrics = await CrossValidator.kFoldCrossValidation(
      model,
      trainData,
      config.cross_validation_folds
    );

    // Evaluate on test data
    const testMetrics = await model.evaluate(testData);

    // Get feature importance if available
    let featureImportance: { [key: string]: number } | undefined;
    if (trainData.features.length > 0) {
      try {
        const samplePrediction = await model.predict(trainData.features[0]);
        featureImportance = samplePrediction.feature_importance;
      } catch (error) {
        // Feature importance not available for this model
      }
    }

    const trainingTime = Date.now() - startTime;

    // Store the trained model
    this.models.set(modelName, model);

    return {
      model,
      training_metrics: trainingMetrics,
      validation_metrics: validationMetrics,
      test_metrics: testMetrics,
      feature_importance: featureImportance || undefined,
      training_time_ms: trainingTime
    };
  }

  /**
   * Train multiple models and create an ensemble
   */
  public async trainEnsemble(
    configs: ModelConfig[],
    data: TrainingData
  ): Promise<{ [key: string]: ModelTrainingResult }> {
    const results: { [key: string]: ModelTrainingResult } = {};

    // Train each model
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const modelName = `${config.model_type}_${i}`;
      
      try {
        const result = await this.trainModel(config, data, modelName);
        results[modelName] = result;

        // Set model weight based on validation performance
        const weight = Math.max(0, result.validation_metrics.mean_score);
        this.model_weights.set(modelName, weight);
      } catch (error) {
        console.error(`Failed to train model ${modelName}:`, error);
      }
    }

    // Normalize weights
    this.normalizeWeights();

    return results;
  }

  /**
   * Make prediction using a single model
   */
  public async predict(modelName: string, features: number[]): Promise<any> {
    const model = this.models.get(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    return await model.predict(features);
  }

  /**
   * Make ensemble prediction using all trained models
   */
  public async predictEnsemble(features: number[]): Promise<ModelEnsembleResult> {
    if (this.models.size === 0) {
      throw new Error('No models available for ensemble prediction');
    }

    const individualPredictions: { [key: string]: number } = {};
    const confidences: { [key: string]: number } = {};
    let weightedSum = 0;
    let totalWeight = 0;

    // Get predictions from all models
    for (const [modelName, model] of this.models) {
      try {
        const result = await model.predict(features);
        const weight = this.model_weights.get(modelName) || 0;

        individualPredictions[modelName] = result.prediction;
        confidences[modelName] = result.confidence;

        weightedSum += result.prediction * weight;
        totalWeight += weight;
      } catch (error) {
        console.warn(`Failed to get prediction from model ${modelName}:`, error);
      }
    }

    if (totalWeight === 0) {
      throw new Error('No valid predictions from ensemble models');
    }

    // Calculate ensemble prediction
    const ensemblePrediction = weightedSum / totalWeight;

    // Calculate ensemble confidence as weighted average of individual confidences
    let weightedConfidenceSum = 0;
    for (const [modelName, confidence] of Object.entries(confidences)) {
      const weight = this.model_weights.get(modelName) || 0;
      weightedConfidenceSum += confidence * weight;
    }
    const ensembleConfidence = weightedConfidenceSum / totalWeight;

    return {
      prediction: ensemblePrediction,
      confidence: ensembleConfidence,
      individual_predictions: individualPredictions,
      model_weights: Object.fromEntries(this.model_weights)
    };
  }

  /**
   * Evaluate ensemble performance
   */
  public async evaluateEnsemble(testData: TrainingData): Promise<ModelMetrics> {
    const predictions: number[] = [];

    for (const features of testData.features) {
      const result = await this.predictEnsemble(features);
      predictions.push(result.prediction);
    }

    return this.calculateMetrics(testData.labels, predictions);
  }

  /**
   * Get model performance comparison
   */
  public getModelComparison(): { [key: string]: { weight: number; available: boolean } } {
    const comparison: { [key: string]: { weight: number; available: boolean } } = {};

    for (const [modelName, weight] of this.model_weights) {
      comparison[modelName] = {
        weight,
        available: this.models.has(modelName)
      };
    }

    return comparison;
  }

  /**
   * Save model state (simplified - in practice would serialize to disk)
   */
  public saveModels(): { [key: string]: any } {
    const modelStates: { [key: string]: any } = {};

    for (const [modelName, model] of this.models) {
      modelStates[modelName] = {
        type: model.constructor.name,
        trained: model.isTrained(),
        feature_names: model.getFeatureNames(),
        weight: this.model_weights.get(modelName) || 0
      };
    }

    return modelStates;
  }

  /**
   * Load model state (simplified - in practice would deserialize from disk)
   */
  public loadModels(modelStates: { [key: string]: any }): void {
    // In a real implementation, this would restore the actual trained models
    console.log('Loading model states:', modelStates);
  }

  /**
   * Create model instance based on configuration
   */
  private createModel(config: ModelConfig): BaseModel {
    switch (config.model_type) {
      case 'random_forest':
        return new RandomForestModel(
          config.hyperparameters.n_estimators || 10,
          config.hyperparameters.max_depth || 10,
          config.hyperparameters.min_samples_split || 2
        );
      
      case 'xgboost':
        return new XGBoostModel(
          config.hyperparameters.learning_rate || 0.1,
          config.hyperparameters.n_estimators || 100,
          config.hyperparameters.max_depth || 6
        );
      
      case 'statistical_threshold':
        return new StatisticalThresholdModel(
          config.hyperparameters.z_score_threshold || 2.5
        );
      
      default:
        throw new Error(`Unknown model type: ${config.model_type}`);
    }
  }

  /**
   * Split data into training and test sets
   */
  private splitData(
    data: TrainingData,
    testSize: number,
    randomSeed?: number
  ): { trainData: TrainingData; testData: TrainingData } {
    // Set random seed for reproducibility
    if (randomSeed !== undefined) {
      // Simple seeded random number generator
      let seed = randomSeed;
      Math.random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    }

    const totalSamples = data.features.length;
    const testSamples = Math.floor(totalSamples * testSize);
    
    // Create shuffled indices
    const indices = Array.from({ length: totalSamples }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const testIndices = indices.slice(0, testSamples);
    const trainIndices = indices.slice(testSamples);

    const trainData: TrainingData = {
      features: trainIndices.map(i => data.features[i]),
      labels: trainIndices.map(i => data.labels[i]),
      feature_names: data.feature_names
    };

    const testData: TrainingData = {
      features: testIndices.map(i => data.features[i]),
      labels: testIndices.map(i => data.labels[i]),
      feature_names: data.feature_names
    };

    return { trainData, testData };
  }

  /**
   * Normalize model weights to sum to 1
   */
  private normalizeWeights(): void {
    const totalWeight = Array.from(this.model_weights.values()).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight > 0) {
      for (const [modelName, weight] of this.model_weights) {
        this.model_weights.set(modelName, weight / totalWeight);
      }
    }
  }

  /**
   * Calculate regression metrics
   */
  private calculateMetrics(actual: number[], predicted: number[]): ModelMetrics {
    const n = actual.length;
    
    // Mean Squared Error
    const mse = actual.reduce((sum, act, i) => sum + Math.pow(act - predicted[i], 2), 0) / n;
    
    // Mean Absolute Error
    const mae = actual.reduce((sum, act, i) => sum + Math.abs(act - predicted[i]), 0) / n;
    
    // R² Score
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = actual.reduce((sum, act, i) => sum + Math.pow(act - predicted[i], 2), 0);
    const r2_score = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { mse, mae, r2_score };
  }

  /**
   * Hyperparameter tuning using grid search (simplified)
   */
  public async gridSearch(
    baseConfig: ModelConfig,
    parameterGrid: { [key: string]: any[] },
    data: TrainingData
  ): Promise<{ bestConfig: ModelConfig; bestScore: number; results: any[] }> {
    const results: any[] = [];
    let bestScore = -Infinity;
    let bestConfig = baseConfig;

    // Generate all parameter combinations
    const parameterCombinations = this.generateParameterCombinations(parameterGrid);

    for (const params of parameterCombinations) {
      const config: ModelConfig = {
        ...baseConfig,
        hyperparameters: { ...baseConfig.hyperparameters, ...params }
      };

      try {
        const result = await this.trainModel(config, data, 'grid_search_temp');
        const score = result.validation_metrics.mean_score;

        results.push({
          parameters: params,
          score,
          metrics: result.validation_metrics.metrics
        });

        if (score > bestScore) {
          bestScore = score;
          bestConfig = config;
        }

        // Clean up temporary model
        this.models.delete('grid_search_temp');
      } catch (error) {
        console.warn('Grid search iteration failed:', error);
      }
    }

    return { bestConfig, bestScore, results };
  }

  /**
   * Generate all combinations of parameters for grid search
   */
  private generateParameterCombinations(parameterGrid: { [key: string]: any[] }): any[] {
    const keys = Object.keys(parameterGrid);
    const combinations: any[] = [];

    const generateCombinations = (index: number, currentCombination: any) => {
      if (index === keys.length) {
        combinations.push({ ...currentCombination });
        return;
      }

      const key = keys[index];
      const values = parameterGrid[key];

      for (const value of values) {
        currentCombination[key] = value;
        generateCombinations(index + 1, currentCombination);
      }
    };

    generateCombinations(0, {});
    return combinations;
  }
}