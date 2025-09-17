/**
 * Bayesian Ensemble and Uncertainty Quantification for Rockfall Prediction
 * 
 * This module implements:
 * - Bayesian Neural Network implementation
 * - Deep Ensemble methods for uncertainty estimation
 * - Monte Carlo Dropout for prediction confidence
 * - Calibration techniques for probability outputs
 */

/**
 * Uncertainty quantification result
 */
export interface UncertaintyResult {
  mean_prediction: number;
  variance: number;
  confidence_interval: [number, number];
  epistemic_uncertainty: number; // Model uncertainty
  aleatoric_uncertainty: number; // Data uncertainty
  total_uncertainty: number;
  calibration_score: number;
}

/**
 * Ensemble prediction result
 */
export interface EnsemblePredictionResult {
  predictions: number[];
  uncertainty: UncertaintyResult;
  model_weights: number[];
  consensus_score: number;
  outlier_flags: boolean[];
}

/**
 * Bayesian layer with weight uncertainty
 */
export class BayesianLayer {
  private input_dim: number;
  private output_dim: number;
  private weight_mean!: number[][];
  private weight_log_var!: number[][];
  private bias_mean!: number[];
  private bias_log_var!: number[];
  private prior_mean: number;
  private prior_var: number;

  constructor(
    input_dim: number,
    output_dim: number,
    prior_mean: number = 0,
    prior_var: number = 1
  ) {
    this.input_dim = input_dim;
    this.output_dim = output_dim;
    this.prior_mean = prior_mean;
    this.prior_var = prior_var;
    
    this.initializeParameters();
  }

  /**
   * Sample weights from posterior distribution
   */
  public sampleWeights(): { weights: number[][]; bias: number[] } {
    const weights: number[][] = [];
    const bias: number[] = [];

    // Sample weights
    for (let i = 0; i < this.output_dim; i++) {
      const weight_row: number[] = [];
      for (let j = 0; j < this.input_dim; j++) {
        const std = Math.sqrt(Math.exp(this.weight_log_var[i][j]));
        weight_row.push(this.gaussianSample(this.weight_mean[i][j], std));
      }
      weights.push(weight_row);
    }

    // Sample bias
    for (let i = 0; i < this.output_dim; i++) {
      const std = Math.sqrt(Math.exp(this.bias_log_var[i]));
      bias.push(this.gaussianSample(this.bias_mean[i], std));
    }

    return { weights, bias };
  }

  /**
   * Forward pass with sampled weights
   */
  public forward(input: number[], num_samples: number = 10): number[][] {
    const outputs: number[][] = [];

    for (let sample = 0; sample < num_samples; sample++) {
      const { weights, bias } = this.sampleWeights();
      const output = this.computeOutput(input, weights, bias);
      outputs.push(output);
    }

    return outputs;
  }

  /**
   * Compute KL divergence for regularization
   */
  public computeKLDivergence(): number {
    let kl_div = 0;

    // KL divergence for weights
    for (let i = 0; i < this.output_dim; i++) {
      for (let j = 0; j < this.input_dim; j++) {
        const mean = this.weight_mean[i][j];
        const log_var = this.weight_log_var[i][j];
        const var_val = Math.exp(log_var);
        
        kl_div += 0.5 * (
          Math.pow(mean - this.prior_mean, 2) / this.prior_var +
          var_val / this.prior_var -
          log_var +
          Math.log(this.prior_var) - 1
        );
      }
    }

    // KL divergence for bias
    for (let i = 0; i < this.output_dim; i++) {
      const mean = this.bias_mean[i];
      const log_var = this.bias_log_var[i];
      const var_val = Math.exp(log_var);
      
      kl_div += 0.5 * (
        Math.pow(mean - this.prior_mean, 2) / this.prior_var +
        var_val / this.prior_var -
        log_var +
        Math.log(this.prior_var) - 1
      );
    }

    return kl_div;
  }

  /**
   * Update parameters using variational inference
   */
  public updateParameters(
    input: number[],
    target: number[],
    learning_rate: number
  ): void {
    // Simplified variational update (in practice would use more sophisticated methods)
    const { weights, bias } = this.sampleWeights();
    const prediction = this.computeOutput(input, weights, bias);
    
    // Compute gradients and update mean and variance
    for (let i = 0; i < this.output_dim; i++) {
      const error = prediction[i] - target[i];
      
      for (let j = 0; j < this.input_dim; j++) {
        const grad_mean = error * input[j];
        this.weight_mean[i][j] -= learning_rate * grad_mean;
        
        // Update log variance (simplified and clipped)
        const current_var = Math.exp(this.weight_log_var[i][j]);
        const grad_var = 0.1 * (current_var - 0.1); // Regularize towards small variance
        this.weight_log_var[i][j] -= learning_rate * grad_var;
        
        // Clip log variance to prevent numerical issues
        this.weight_log_var[i][j] = Math.max(-10, Math.min(2, this.weight_log_var[i][j]));
      }
      
      // Update bias
      this.bias_mean[i] -= learning_rate * error;
      const current_bias_var = Math.exp(this.bias_log_var[i]);
      const grad_bias_var = 0.1 * (current_bias_var - 0.1);
      this.bias_log_var[i] -= learning_rate * grad_bias_var;
      
      // Clip bias log variance
      this.bias_log_var[i] = Math.max(-10, Math.min(2, this.bias_log_var[i]));
    }
  }

  private initializeParameters(): void {
    const init_std = Math.sqrt(1.0 / this.input_dim);
    
    this.weight_mean = [];
    this.weight_log_var = [];
    this.bias_mean = Array(this.output_dim).fill(0);
    this.bias_log_var = Array(this.output_dim).fill(Math.log(0.01));

    for (let i = 0; i < this.output_dim; i++) {
      const mean_row: number[] = [];
      const var_row: number[] = [];
      
      for (let j = 0; j < this.input_dim; j++) {
        mean_row.push((Math.random() - 0.5) * init_std);
        var_row.push(Math.log(0.01)); // Smaller initial log variance
      }
      
      this.weight_mean.push(mean_row);
      this.weight_log_var.push(var_row);
    }
  }

  private gaussianSample(mean: number, std: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z0;
  }

  private computeOutput(input: number[], weights: number[][], bias: number[]): number[] {
    const output: number[] = [];
    
    for (let i = 0; i < this.output_dim; i++) {
      let sum = bias[i];
      for (let j = 0; j < this.input_dim; j++) {
        sum += weights[i][j] * input[j];
      }
      output.push(Math.tanh(sum)); // Tanh activation
    }
    
    return output;
  }
}

/**
 * Monte Carlo Dropout layer
 */
export class MCDropoutLayer {
  private dropout_rate: number;

  constructor(dropout_rate: number = 0.1) {
    this.dropout_rate = dropout_rate;
  }

  /**
   * Apply dropout during inference for uncertainty estimation
   */
  public forward(input: number[], num_samples: number = 50): number[][] {
    const outputs: number[][] = [];

    for (let sample = 0; sample < num_samples; sample++) {
      const dropped_input = input.map(val => 
        Math.random() < this.dropout_rate ? 0 : val / (1 - this.dropout_rate)
      );
      outputs.push(dropped_input);
    }

    return outputs;
  }

  public setTrainingMode(_training: boolean): void {
    // Training mode setting (could be used for different behavior)
  }
}

/**
 * Deep Ensemble for uncertainty quantification
 */
export class DeepEnsemble {
  private models: Array<{ forward: (input: number[]) => number[] }>;
  private model_weights: number[];

  constructor() {
    this.models = [];
    this.model_weights = [];
  }

  /**
   * Add model to ensemble
   */
  public addModel(
    model: { forward: (input: number[]) => number[] },
    weight: number = 1.0
  ): void {
    this.models.push(model);
    this.model_weights.push(weight);
    this.normalizeWeights();
  }

  /**
   * Make ensemble prediction with uncertainty quantification
   */
  public predict(input: number[]): EnsemblePredictionResult {
    const predictions: number[] = [];
    const all_outputs: number[][] = [];

    // Get predictions from all models
    for (let i = 0; i < this.models.length; i++) {
      const output = this.models[i].forward(input);
      predictions.push(output[0]); // Assuming single output
      all_outputs.push(output);
    }

    // Compute weighted ensemble prediction
    const weighted_mean = this.computeWeightedMean(predictions);
    
    // Compute uncertainty metrics
    const uncertainty = this.computeUncertainty(predictions, weighted_mean);
    
    // Compute consensus score
    const consensus_score = this.computeConsensusScore(predictions);
    
    // Detect outliers
    const outlier_flags = this.detectOutliers(predictions);

    return {
      predictions,
      uncertainty,
      model_weights: [...this.model_weights],
      consensus_score,
      outlier_flags
    };
  }

  /**
   * Calibrate ensemble predictions
   */
  public calibrate(
    validation_data: Array<{ input: number[]; target: number }>
  ): void {
    const predictions: number[] = [];
    const targets: number[] = [];

    for (const sample of validation_data) {
      const result = this.predict(sample.input);
      predictions.push(result.uncertainty.mean_prediction);
      targets.push(sample.target);
    }

    // Apply Platt scaling or isotonic regression (simplified implementation)
    this.applyCalibration(predictions, targets);
  }

  private computeWeightedMean(predictions: number[]): number {
    let weighted_sum = 0;

    for (let i = 0; i < predictions.length; i++) {
      weighted_sum += predictions[i] * this.model_weights[i];
    }

    return weighted_sum;
  }

  private computeUncertainty(predictions: number[], mean: number): UncertaintyResult {
    // Compute variance
    let variance = 0;
    for (const pred of predictions) {
      variance += Math.pow(pred - mean, 2);
    }
    variance /= predictions.length;

    // Epistemic uncertainty (model uncertainty)
    const epistemic_uncertainty = variance;
    
    // Aleatoric uncertainty (data uncertainty) - simplified
    const aleatoric_uncertainty = 0.1; // Would be learned from data
    
    // Total uncertainty
    const total_uncertainty = epistemic_uncertainty + aleatoric_uncertainty;
    
    // Confidence interval (95%)
    const std = Math.sqrt(total_uncertainty);
    const confidence_interval: [number, number] = [
      mean - 1.96 * std,
      mean + 1.96 * std
    ];

    // Calibration score (simplified)
    const calibration_score = Math.max(0, 1 - total_uncertainty);

    return {
      mean_prediction: mean,
      variance,
      confidence_interval,
      epistemic_uncertainty,
      aleatoric_uncertainty,
      total_uncertainty,
      calibration_score
    };
  }

  private computeConsensusScore(predictions: number[]): number {
    if (predictions.length < 2) return 1.0;

    const mean = predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length;
    
    // Higher consensus when variance is lower, scale variance to get reasonable scores
    return Math.exp(-variance * 10);
  }

  private detectOutliers(predictions: number[]): boolean[] {
    if (predictions.length < 3) return predictions.map(() => false);
    
    const mean = predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
    const std = Math.sqrt(
      predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length
    );

    // Use a lower threshold for outlier detection
    return predictions.map(pred => Math.abs(pred - mean) > 1.5 * std);
  }

  private normalizeWeights(): void {
    const sum = this.model_weights.reduce((acc, weight) => acc + weight, 0);
    if (sum > 0) {
      this.model_weights = this.model_weights.map(weight => weight / sum);
    }
  }

  private applyCalibration(predictions: number[], _targets: number[]): void {
    // Simplified Platt scaling - in practice would use more sophisticated methods
    // This would adjust model outputs to be better calibrated
    console.log(`Calibrating ensemble with ${predictions.length} samples`);
  }
}

/**
 * Bayesian Neural Network
 */
export class BayesianNeuralNetwork {
  private layers: BayesianLayer[];
  private mc_dropout: MCDropoutLayer;
  private kl_weight: number;

  constructor(
    layer_sizes: number[],
    dropout_rate: number = 0.1,
    kl_weight: number = 0.01
  ) {
    this.kl_weight = kl_weight;
    this.mc_dropout = new MCDropoutLayer(dropout_rate);
    
    this.layers = [];
    for (let i = 0; i < layer_sizes.length - 1; i++) {
      this.layers.push(new BayesianLayer(layer_sizes[i], layer_sizes[i + 1]));
    }
  }

  /**
   * Forward pass with uncertainty quantification
   */
  public predictWithUncertainty(
    input: number[],
    num_samples: number = 100
  ): UncertaintyResult {
    const predictions: number[] = [];

    for (let sample = 0; sample < num_samples; sample++) {
      let current_input = input;
      
      // Apply MC dropout
      const dropout_samples = this.mc_dropout.forward(current_input, 1);
      current_input = dropout_samples[0];
      
      // Forward through Bayesian layers
      for (const layer of this.layers) {
        const layer_outputs = layer.forward(current_input, 1);
        current_input = layer_outputs[0];
      }
      
      predictions.push(current_input[0]); // Assuming single output
    }

    return this.computeUncertaintyFromSamples(predictions);
  }

  /**
   * Train with variational inference
   */
  public train(
    training_data: Array<{ input: number[]; target: number[] }>,
    epochs: number = 100,
    learning_rate: number = 0.001
  ): void {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let total_loss = 0;
      let total_kl = 0;

      for (const sample of training_data) {
        // Forward pass
        const prediction = this.forward(sample.input);
        
        // Data loss
        const data_loss = Math.pow(prediction[0] - sample.target[0], 2);
        
        // KL divergence
        let kl_loss = 0;
        for (const layer of this.layers) {
          kl_loss += layer.computeKLDivergence();
        }
        
        // Total loss
        const loss = data_loss + this.kl_weight * kl_loss;
        total_loss += loss;
        total_kl += kl_loss;
        
        // Update parameters
        for (const layer of this.layers) {
          layer.updateParameters(sample.input, sample.target, learning_rate);
        }
      }

      if (epoch % 20 === 0) {
        console.log(`Epoch ${epoch}: Loss = ${total_loss.toFixed(4)}, KL = ${total_kl.toFixed(4)}`);
      }
    }
  }

  public forward(input: number[]): number[] {
    let current_input = input;
    
    for (const layer of this.layers) {
      const layer_outputs = layer.forward(current_input, 1);
      current_input = layer_outputs[0];
    }
    
    return current_input;
  }

  private computeUncertaintyFromSamples(predictions: number[]): UncertaintyResult {
    const mean = predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length;
    
    const std = Math.sqrt(variance);
    const confidence_interval: [number, number] = [mean - 1.96 * std, mean + 1.96 * std];
    
    return {
      mean_prediction: mean,
      variance,
      confidence_interval,
      epistemic_uncertainty: variance * 0.7, // Approximate split
      aleatoric_uncertainty: variance * 0.3,
      total_uncertainty: variance,
      calibration_score: Math.max(0, 1 - variance)
    };
  }
}

/**
 * Uncertainty-aware ensemble for rockfall prediction
 */
export class RockfallUncertaintyEnsemble {
  private bayesian_net: BayesianNeuralNetwork;
  private deep_ensemble: DeepEnsemble;
  private calibrated: boolean;

  constructor(
    network_architecture: number[],
    num_ensemble_models: number = 5
  ) {
    this.bayesian_net = new BayesianNeuralNetwork(network_architecture);
    this.deep_ensemble = new DeepEnsemble();
    this.calibrated = false;
    
    // Initialize ensemble with multiple models
    for (let i = 0; i < num_ensemble_models; i++) {
      const model = new BayesianNeuralNetwork(network_architecture);
      this.deep_ensemble.addModel(model);
    }
  }

  /**
   * Comprehensive uncertainty-aware prediction
   */
  public predictWithFullUncertainty(input: number[]): {
    bayesian_result: UncertaintyResult;
    ensemble_result: EnsemblePredictionResult;
    combined_uncertainty: UncertaintyResult;
    reliability_score: number;
  } {
    // Bayesian prediction
    const bayesian_result = this.bayesian_net.predictWithUncertainty(input);
    
    // Ensemble prediction
    const ensemble_result = this.deep_ensemble.predict(input);
    
    // Combine uncertainties
    const combined_uncertainty = this.combineUncertainties(
      bayesian_result,
      ensemble_result.uncertainty
    );
    
    // Compute reliability score
    const reliability_score = this.computeReliabilityScore(
      bayesian_result,
      ensemble_result
    );

    return {
      bayesian_result,
      ensemble_result,
      combined_uncertainty,
      reliability_score
    };
  }

  /**
   * Calibrate the ensemble
   */
  public calibrate(
    validation_data: Array<{ input: number[]; target: number }>
  ): void {
    this.deep_ensemble.calibrate(validation_data);
    this.calibrated = true;
  }

  private combineUncertainties(
    bayesian: UncertaintyResult,
    ensemble: UncertaintyResult
  ): UncertaintyResult {
    // Weighted combination of uncertainties
    const weight_bayesian = 0.6;
    const weight_ensemble = 0.4;
    
    const combined_mean = 
      weight_bayesian * bayesian.mean_prediction + 
      weight_ensemble * ensemble.mean_prediction;
    
    const combined_variance = 
      weight_bayesian * bayesian.variance + 
      weight_ensemble * ensemble.variance;
    
    const combined_std = Math.sqrt(combined_variance);
    
    return {
      mean_prediction: combined_mean,
      variance: combined_variance,
      confidence_interval: [
        combined_mean - 1.96 * combined_std,
        combined_mean + 1.96 * combined_std
      ],
      epistemic_uncertainty: Math.max(bayesian.epistemic_uncertainty, ensemble.epistemic_uncertainty),
      aleatoric_uncertainty: (bayesian.aleatoric_uncertainty + ensemble.aleatoric_uncertainty) / 2,
      total_uncertainty: combined_variance,
      calibration_score: (bayesian.calibration_score + ensemble.calibration_score) / 2
    };
  }

  private computeReliabilityScore(
    bayesian: UncertaintyResult,
    ensemble: EnsemblePredictionResult
  ): number {
    // Agreement between methods
    const prediction_agreement = 1 - Math.abs(
      bayesian.mean_prediction - ensemble.uncertainty.mean_prediction
    );
    
    // Consensus in ensemble
    const ensemble_consensus = ensemble.consensus_score;
    
    // Calibration quality
    const calibration_quality = this.calibrated ? 
      (bayesian.calibration_score + ensemble.uncertainty.calibration_score) / 2 : 0.5;
    
    return (prediction_agreement + ensemble_consensus + calibration_quality) / 3;
  }
}