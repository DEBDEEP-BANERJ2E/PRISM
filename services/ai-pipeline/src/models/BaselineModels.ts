export interface TrainingData {
  features: number[][];
  labels: number[];
  feature_names?: string[] | undefined;
}

export interface PredictionResult {
  prediction: number;
  confidence: number;
  feature_importance?: { [key: string]: number };
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  mse?: number;
  mae?: number;
  r2_score?: number;
}

export interface CrossValidationResult {
  mean_score: number;
  std_score: number;
  fold_scores: number[];
  metrics: ModelMetrics;
}

export abstract class BaseModel {
  protected trained: boolean = false;
  protected feature_names: string[] = [];

  abstract train(data: TrainingData): Promise<void>;
  abstract predict(features: number[]): Promise<PredictionResult>;
  abstract evaluate(testData: TrainingData): Promise<ModelMetrics>;

  public isTrained(): boolean {
    return this.trained;
  }

  public getFeatureNames(): string[] {
    return this.feature_names;
  }
}

/**
 * Simplified Random Forest implementation
 * In production, would use a proper ML library
 */
export class RandomForestModel extends BaseModel {
  private trees: DecisionTree[] = [];
  private n_estimators: number;
  private max_depth: number;
  private min_samples_split: number;

  constructor(n_estimators: number = 10, max_depth: number = 10, min_samples_split: number = 2) {
    super();
    this.n_estimators = n_estimators;
    this.max_depth = max_depth;
    this.min_samples_split = min_samples_split;
  }

  async train(data: TrainingData): Promise<void> {
    this.feature_names = data.feature_names || [];
    this.trees = [];

    // Train multiple decision trees with bootstrap sampling
    for (let i = 0; i < this.n_estimators; i++) {
      const bootstrapData = this.bootstrapSample(data);
      const tree = new DecisionTree(this.max_depth, this.min_samples_split);
      await tree.train(bootstrapData);
      this.trees.push(tree);
    }

    this.trained = true;
  }

  async predict(features: number[]): Promise<PredictionResult> {
    if (!this.trained) {
      throw new Error('Model must be trained before making predictions');
    }

    // Get predictions from all trees
    const predictions: number[] = [];
    for (const tree of this.trees) {
      const result = await tree.predict(features);
      predictions.push(result.prediction);
    }

    // Average predictions (for regression) or majority vote (for classification)
    const prediction = predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
    
    // Calculate confidence as inverse of prediction variance
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - prediction, 2), 0) / predictions.length;
    const confidence = Math.max(0, 1 - Math.sqrt(variance));

    return {
      prediction,
      confidence,
      feature_importance: this.calculateFeatureImportance()
    };
  }

  async evaluate(testData: TrainingData): Promise<ModelMetrics> {
    const predictions: number[] = [];
    
    for (const features of testData.features) {
      const result = await this.predict(features);
      predictions.push(result.prediction);
    }

    return this.calculateMetrics(testData.labels, predictions);
  }

  private bootstrapSample(data: TrainingData): TrainingData {
    const n_samples = data.features.length;
    const indices = Array.from({ length: n_samples }, () => Math.floor(Math.random() * n_samples));
    
    return {
      features: indices.map(i => data.features[i]),
      labels: indices.map(i => data.labels[i]),
      feature_names: data.feature_names || undefined
    };
  }

  private calculateFeatureImportance(): { [key: string]: number } {
    const importance: { [key: string]: number } = {};
    
    // Simplified feature importance calculation
    for (let i = 0; i < this.feature_names.length; i++) {
      const featureName = this.feature_names[i] || `feature_${i}`;
      importance[featureName] = Math.random(); // Placeholder - would calculate actual importance
    }

    return importance;
  }

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
}

/**
 * Simplified XGBoost-style Gradient Boosting implementation
 */
export class XGBoostModel extends BaseModel {
  private trees: DecisionTree[] = [];
  private learning_rate: number;
  private n_estimators: number;
  private max_depth: number;

  constructor(learning_rate: number = 0.1, n_estimators: number = 100, max_depth: number = 6) {
    super();
    this.learning_rate = learning_rate;
    this.n_estimators = n_estimators;
    this.max_depth = max_depth;
  }

  async train(data: TrainingData): Promise<void> {
    this.feature_names = data.feature_names || [];
    this.trees = [];

    let predictions = new Array(data.labels.length).fill(0);

    // Gradient boosting iterations
    for (let i = 0; i < this.n_estimators; i++) {
      // Calculate residuals (gradients)
      const residuals = data.labels.map((label, idx) => label - predictions[idx]);
      
      // Train tree on residuals
      const tree = new DecisionTree(this.max_depth, 2);
      await tree.train({
        features: data.features,
        labels: residuals,
        feature_names: data.feature_names || undefined
      });
      
      this.trees.push(tree);

      // Update predictions
      for (let j = 0; j < predictions.length; j++) {
        const treeResult = await tree.predict(data.features[j]);
        predictions[j] += this.learning_rate * treeResult.prediction;
      }
    }

    this.trained = true;
  }

  async predict(features: number[]): Promise<PredictionResult> {
    if (!this.trained) {
      throw new Error('Model must be trained before making predictions');
    }

    let prediction = 0;
    
    // Sum predictions from all trees
    for (const tree of this.trees) {
      const result = await tree.predict(features);
      prediction += this.learning_rate * result.prediction;
    }

    // Confidence based on number of trees (simplified)
    const confidence = Math.min(1, this.trees.length / this.n_estimators);

    return {
      prediction,
      confidence,
      feature_importance: this.calculateFeatureImportance()
    };
  }

  async evaluate(testData: TrainingData): Promise<ModelMetrics> {
    const predictions: number[] = [];
    
    for (const features of testData.features) {
      const result = await this.predict(features);
      predictions.push(result.prediction);
    }

    return this.calculateMetrics(testData.labels, predictions);
  }

  private calculateFeatureImportance(): { [key: string]: number } {
    const importance: { [key: string]: number } = {};
    
    // Simplified feature importance calculation
    for (let i = 0; i < this.feature_names.length; i++) {
      const featureName = this.feature_names[i] || `feature_${i}`;
      importance[featureName] = Math.random(); // Placeholder
    }

    return importance;
  }

  private calculateMetrics(actual: number[], predicted: number[]): ModelMetrics {
    const n = actual.length;
    
    const mse = actual.reduce((sum, act, i) => sum + Math.pow(act - predicted[i], 2), 0) / n;
    const mae = actual.reduce((sum, act, i) => sum + Math.abs(act - predicted[i]), 0) / n;
    
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = actual.reduce((sum, act, i) => sum + Math.pow(act - predicted[i], 2), 0);
    const r2_score = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { mse, mae, r2_score };
  }
}

/**
 * Simplified Decision Tree implementation
 */
class DecisionTree {
  private root: TreeNode | null = null;
  private max_depth: number;
  private min_samples_split: number;

  constructor(max_depth: number = 10, min_samples_split: number = 2) {
    this.max_depth = max_depth;
    this.min_samples_split = min_samples_split;
  }

  async train(data: TrainingData): Promise<void> {
    this.root = this.buildTree(data.features, data.labels, 0);
  }

  async predict(features: number[]): Promise<PredictionResult> {
    if (!this.root) {
      throw new Error('Tree must be trained before making predictions');
    }

    const prediction = this.traverseTree(this.root, features);
    return {
      prediction,
      confidence: 0.8 // Simplified confidence
    };
  }

  private buildTree(features: number[][], labels: number[], depth: number): TreeNode {
    // Base cases
    if (depth >= this.max_depth || features.length < this.min_samples_split || this.isPure(labels)) {
      return new TreeNode(this.calculateMean(labels));
    }

    // Find best split
    const bestSplit = this.findBestSplit(features, labels);
    if (!bestSplit) {
      return new TreeNode(this.calculateMean(labels));
    }

    // Split data
    const { leftFeatures, leftLabels, rightFeatures, rightLabels } = this.splitData(
      features, labels, bestSplit.feature_index, bestSplit.threshold
    );

    // Create node
    const node = new TreeNode(
      this.calculateMean(labels),
      bestSplit.feature_index,
      bestSplit.threshold
    );

    // Recursively build subtrees
    if (leftFeatures.length > 0) {
      node.left = this.buildTree(leftFeatures, leftLabels, depth + 1);
    }
    if (rightFeatures.length > 0) {
      node.right = this.buildTree(rightFeatures, rightLabels, depth + 1);
    }

    return node;
  }

  private findBestSplit(features: number[][], labels: number[]): { feature_index: number; threshold: number } | null {
    let bestGain = -Infinity;
    let bestSplit: { feature_index: number; threshold: number } | null = null;

    const n_features = features[0].length;
    
    for (let feature_idx = 0; feature_idx < n_features; feature_idx++) {
      const values = features.map(row => row[feature_idx]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const gain = this.calculateInformationGain(features, labels, feature_idx, threshold);

        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = { feature_index: feature_idx, threshold };
        }
      }
    }

    return bestSplit;
  }

  private calculateInformationGain(features: number[][], labels: number[], feature_index: number, threshold: number): number {
    const { leftLabels, rightLabels } = this.splitLabels(features, labels, feature_index, threshold);
    
    if (leftLabels.length === 0 || rightLabels.length === 0) {
      return -Infinity;
    }

    const totalVariance = this.calculateVariance(labels);
    const leftVariance = this.calculateVariance(leftLabels);
    const rightVariance = this.calculateVariance(rightLabels);

    const n = labels.length;
    const weightedVariance = (leftLabels.length / n) * leftVariance + (rightLabels.length / n) * rightVariance;

    return totalVariance - weightedVariance;
  }

  private splitData(features: number[][], labels: number[], feature_index: number, threshold: number) {
    const leftFeatures: number[][] = [];
    const leftLabels: number[] = [];
    const rightFeatures: number[][] = [];
    const rightLabels: number[] = [];

    for (let i = 0; i < features.length; i++) {
      if (features[i][feature_index] <= threshold) {
        leftFeatures.push(features[i]);
        leftLabels.push(labels[i]);
      } else {
        rightFeatures.push(features[i]);
        rightLabels.push(labels[i]);
      }
    }

    return { leftFeatures, leftLabels, rightFeatures, rightLabels };
  }

  private splitLabels(features: number[][], labels: number[], feature_index: number, threshold: number) {
    const leftLabels: number[] = [];
    const rightLabels: number[] = [];

    for (let i = 0; i < features.length; i++) {
      if (features[i][feature_index] <= threshold) {
        leftLabels.push(labels[i]);
      } else {
        rightLabels.push(labels[i]);
      }
    }

    return { leftLabels, rightLabels };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private isPure(labels: number[]): boolean {
    return new Set(labels).size <= 1;
  }

  private traverseTree(node: TreeNode, features: number[]): number {
    if (node.isLeaf()) {
      return node.value;
    }

    if (features[node.feature_index!] <= node.threshold!) {
      return node.left ? this.traverseTree(node.left, features) : node.value;
    } else {
      return node.right ? this.traverseTree(node.right, features) : node.value;
    }
  }
}

class TreeNode {
  public value: number;
  public feature_index?: number | undefined;
  public threshold?: number | undefined;
  public left?: TreeNode;
  public right?: TreeNode;

  constructor(value: number, feature_index?: number | undefined, threshold?: number | undefined) {
    this.value = value;
    this.feature_index = feature_index;
    this.threshold = threshold;
  }

  isLeaf(): boolean {
    return this.feature_index === undefined;
  }
}

/**
 * Statistical threshold-based alerting system
 */
export class StatisticalThresholdModel extends BaseModel {
  private thresholds: { [key: string]: number } = {};
  private statistics: { [key: string]: { mean: number; std: number } } = {};

  constructor(private z_score_threshold: number = 2.5) {
    super();
  }

  async train(data: TrainingData): Promise<void> {
    this.feature_names = data.feature_names || [];
    
    // Calculate statistics for each feature
    const n_features = data.features[0].length;
    
    for (let i = 0; i < n_features; i++) {
      const featureName = this.feature_names[i] || `feature_${i}`;
      const values = data.features.map(row => row[i]);
      
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      
      this.statistics[featureName] = { mean, std };
      this.thresholds[featureName] = mean + this.z_score_threshold * std;
    }

    this.trained = true;
  }

  async predict(features: number[]): Promise<PredictionResult> {
    if (!this.trained) {
      throw new Error('Model must be trained before making predictions');
    }

    let alertScore = 0;
    let maxZScore = 0;

    // Check each feature against its threshold
    for (let i = 0; i < features.length; i++) {
      const featureName = this.feature_names[i] || `feature_${i}`;
      const stats = this.statistics[featureName];
      
      if (stats && stats.std > 0) {
        const zScore = Math.abs((features[i] - stats.mean) / stats.std);
        maxZScore = Math.max(maxZScore, zScore);
        
        if (zScore > this.z_score_threshold) {
          alertScore += zScore / this.z_score_threshold;
        }
      }
    }

    // Normalize alert score to 0-1 range
    const prediction = Math.min(1, alertScore / features.length);
    const confidence = Math.min(1, maxZScore / (this.z_score_threshold * 2));

    return {
      prediction,
      confidence
    };
  }

  async evaluate(testData: TrainingData): Promise<ModelMetrics> {
    const predictions: number[] = [];
    
    for (const features of testData.features) {
      const result = await this.predict(features);
      predictions.push(result.prediction);
    }

    return this.calculateMetrics(testData.labels, predictions);
  }

  private calculateMetrics(actual: number[], predicted: number[]): ModelMetrics {
    const n = actual.length;
    
    const mse = actual.reduce((sum, act, i) => sum + Math.pow(act - predicted[i], 2), 0) / n;
    const mae = actual.reduce((sum, act, i) => sum + Math.abs(act - predicted[i]), 0) / n;
    
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
    const residualSumSquares = actual.reduce((sum, act, i) => sum + Math.pow(act - predicted[i], 2), 0);
    const r2_score = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { mse, mae, r2_score };
  }

  public getThresholds(): { [key: string]: number } {
    return { ...this.thresholds };
  }

  public getStatistics(): { [key: string]: { mean: number; std: number } } {
    return { ...this.statistics };
  }
}

/**
 * Cross-validation utility
 */
export class CrossValidator {
  public static async kFoldCrossValidation(
    model: BaseModel,
    data: TrainingData,
    k: number = 5
  ): Promise<CrossValidationResult> {
    const foldSize = Math.floor(data.features.length / k);
    const foldScores: number[] = [];
    const allMetrics: ModelMetrics[] = [];

    for (let fold = 0; fold < k; fold++) {
      // Split data into train and validation sets
      const validationStart = fold * foldSize;
      const validationEnd = fold === k - 1 ? data.features.length : (fold + 1) * foldSize;

      const trainFeatures = [
        ...data.features.slice(0, validationStart),
        ...data.features.slice(validationEnd)
      ];
      const trainLabels = [
        ...data.labels.slice(0, validationStart),
        ...data.labels.slice(validationEnd)
      ];

      const validationFeatures = data.features.slice(validationStart, validationEnd);
      const validationLabels = data.labels.slice(validationStart, validationEnd);

      // Train model on training set
      const trainData: TrainingData = {
        features: trainFeatures,
        labels: trainLabels,
        feature_names: data.feature_names || undefined
      };

      // Create new instance of the model for this fold
      const foldModel = this.cloneModel(model);
      await foldModel.train(trainData);

      // Evaluate on validation set
      const validationData: TrainingData = {
        features: validationFeatures,
        labels: validationLabels,
        feature_names: data.feature_names || undefined
      };

      const metrics = await foldModel.evaluate(validationData);
      allMetrics.push(metrics);
      
      // Use R² score as the primary metric
      foldScores.push(metrics.r2_score || 0);
    }

    // Calculate mean and std of scores
    const meanScore = foldScores.reduce((sum, score) => sum + score, 0) / foldScores.length;
    const variance = foldScores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / foldScores.length;
    const stdScore = Math.sqrt(variance);

    // Average metrics across folds
    const avgMetrics: ModelMetrics = {
      mse: allMetrics.reduce((sum, m) => sum + (m.mse || 0), 0) / allMetrics.length,
      mae: allMetrics.reduce((sum, m) => sum + (m.mae || 0), 0) / allMetrics.length,
      r2_score: meanScore
    };

    return {
      mean_score: meanScore,
      std_score: stdScore,
      fold_scores: foldScores,
      metrics: avgMetrics
    };
  }

  private static cloneModel(model: BaseModel): BaseModel {
    // Simple cloning - in practice would use proper cloning
    if (model instanceof RandomForestModel) {
      return new RandomForestModel();
    } else if (model instanceof XGBoostModel) {
      return new XGBoostModel();
    } else if (model instanceof StatisticalThresholdModel) {
      return new StatisticalThresholdModel();
    }
    
    throw new Error('Unknown model type');
  }
}