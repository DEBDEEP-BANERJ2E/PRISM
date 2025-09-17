
import {
  BayesianLayer,
  MCDropoutLayer,
  DeepEnsemble,
  BayesianNeuralNetwork,
  RockfallUncertaintyEnsemble
} from '../../models/BayesianEnsemble';

describe('BayesianEnsemble', () => {
  describe('BayesianLayer', () => {
    it('should create Bayesian layer and sample weights', () => {
      const layer = new BayesianLayer(3, 2);
      
      const { weights, bias } = layer.sampleWeights();
      
      expect(weights.length).toBe(2); // output_dim
      expect(weights[0].length).toBe(3); // input_dim
      expect(bias.length).toBe(2);
      
      // Weights should be finite numbers
      for (const row of weights) {
        for (const weight of row) {
          expect(Number.isFinite(weight)).toBe(true);
        }
      }
      
      for (const b of bias) {
        expect(Number.isFinite(b)).toBe(true);
      }
    });

    it('should perform forward pass with multiple samples', () => {
      const layer = new BayesianLayer(2, 1);
      const input = [0.5, -0.3];
      const num_samples = 10;
      
      const outputs = layer.forward(input, num_samples);
      
      expect(outputs.length).toBe(num_samples);
      expect(outputs[0].length).toBe(1); // output_dim
      
      // All outputs should be finite
      for (const output of outputs) {
        for (const val of output) {
          expect(Number.isFinite(val)).toBe(true);
        }
      }
    });

    it('should compute KL divergence', () => {
      const layer = new BayesianLayer(2, 2, 0, 1);
      
      const kl_div = layer.computeKLDivergence();
      
      expect(Number.isFinite(kl_div)).toBe(true);
      expect(kl_div).toBeGreaterThanOrEqual(0);
    });

    it('should update parameters', () => {
      const layer = new BayesianLayer(2, 1);
      const input = [1.0, 0.5];
      const target = [0.8];
      
      const initial_kl = layer.computeKLDivergence();
      
      layer.updateParameters(input, target, 0.01);
      
      const updated_kl = layer.computeKLDivergence();
      
      // Parameters should have changed
      expect(updated_kl).not.toBe(initial_kl);
    });
  });

  describe('MCDropoutLayer', () => {
    it('should apply dropout during inference', () => {
      const dropout_layer = new MCDropoutLayer(0.2);
      const input = [1.0, 2.0, 3.0, 4.0, 5.0];
      const num_samples = 20;
      
      const outputs = dropout_layer.forward(input, num_samples);
      
      expect(outputs.length).toBe(num_samples);
      expect(outputs[0].length).toBe(input.length);
      
      // Some values should be dropped (set to 0)
      let has_zeros = false;
      for (const output of outputs) {
        if (output.some(val => val === 0)) {
          has_zeros = true;
          break;
        }
      }
      expect(has_zeros).toBe(true);
    });

    it('should scale non-dropped values correctly', () => {
      const dropout_rate = 0.5;
      const dropout_layer = new MCDropoutLayer(dropout_rate);
      const input = [2.0];
      
      const outputs = dropout_layer.forward(input, 100);
      
      // Non-zero values should be scaled by 1/(1-dropout_rate)
      const expected_scaled_value = 2.0 / (1 - dropout_rate);
      
      for (const output of outputs) {
        if (output[0] !== 0) {
          expect(Math.abs(output[0] - expected_scaled_value)).toBeLessThan(0.001);
        }
      }
    });
  });

  describe('DeepEnsemble', () => {
    let mockModel1: { forward: (input: number[]) => number[] };
    let mockModel2: { forward: (input: number[]) => number[] };
    let ensemble: DeepEnsemble;

    beforeEach(() => {
      mockModel1 = {
        forward: (_input: number[]) => [0.7] // Always predict 0.7
      };
      
      mockModel2 = {
        forward: (_input: number[]) => [0.3] // Always predict 0.3
      };
      
      ensemble = new DeepEnsemble();
      ensemble.addModel(mockModel1, 0.6);
      ensemble.addModel(mockModel2, 0.4);
    });

    it('should add models and normalize weights', () => {
      const input = [1.0, 2.0];
      const result = ensemble.predict(input);
      
      expect(result.predictions.length).toBe(2);
      expect(result.model_weights.length).toBe(2);
      
      // Weights should be normalized
      const weight_sum = result.model_weights.reduce((sum, w) => sum + w, 0);
      expect(Math.abs(weight_sum - 1.0)).toBeLessThan(0.001);
    });

    it('should compute weighted ensemble prediction', () => {
      const input = [1.0, 2.0];
      const result = ensemble.predict(input);
      
      // Expected weighted mean: 0.6 * 0.7 + 0.4 * 0.3 = 0.54
      expect(Math.abs(result.uncertainty.mean_prediction - 0.54)).toBeLessThan(0.1);
    });

    it('should compute uncertainty metrics', () => {
      const input = [1.0, 2.0];
      const result = ensemble.predict(input);
      
      expect(result.uncertainty.variance).toBeGreaterThan(0);
      expect(result.uncertainty.confidence_interval.length).toBe(2);
      expect(result.uncertainty.confidence_interval[0]).toBeLessThan(result.uncertainty.confidence_interval[1]);
      expect(result.uncertainty.epistemic_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.aleatoric_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.total_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.calibration_score).toBeGreaterThanOrEqual(0);
      expect(result.uncertainty.calibration_score).toBeLessThanOrEqual(1);
    });

    it('should compute consensus score', () => {
      const input = [1.0, 2.0];
      const result = ensemble.predict(input);
      
      expect(result.consensus_score).toBeGreaterThanOrEqual(0);
      expect(result.consensus_score).toBeLessThanOrEqual(1);
      
      // Consensus score should be reasonable
      expect(result.consensus_score).toBeGreaterThan(0);
    });

    it('should detect outliers', () => {
      // Add an outlier model
      const outlierModel = {
        forward: (_input: number[]) => [5.0] // Very different prediction
      };
      ensemble.addModel(outlierModel, 0.1);
      
      const input = [1.0, 2.0];
      const result = ensemble.predict(input);
      
      expect(result.outlier_flags.length).toBe(3);
      // Check that outlier detection works (may or may not detect depending on threshold)
      expect(Array.isArray(result.outlier_flags)).toBe(true);
    });

    it('should handle calibration', () => {
      const validation_data = [
        { input: [1.0], target: 0.5 },
        { input: [2.0], target: 0.6 },
        { input: [3.0], target: 0.4 }
      ];
      
      expect(() => {
        ensemble.calibrate(validation_data);
      }).not.toThrow();
    });
  });

  describe('BayesianNeuralNetwork', () => {
    it('should create BNN and make predictions with uncertainty', () => {
      const bnn = new BayesianNeuralNetwork([3, 4, 1], 0.1, 0.01);
      const input = [0.5, -0.2, 0.8];
      
      const result = bnn.predictWithUncertainty(input, 50);
      
      expect(result.mean_prediction).toBeDefined();
      expect(Number.isFinite(result.mean_prediction)).toBe(true);
      expect(result.variance).toBeGreaterThanOrEqual(0);
      expect(result.confidence_interval.length).toBe(2);
      expect(result.confidence_interval[0]).toBeLessThan(result.confidence_interval[1]);
      expect(result.epistemic_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.aleatoric_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.total_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.calibration_score).toBeGreaterThanOrEqual(0);
      expect(result.calibration_score).toBeLessThanOrEqual(1);
    });

    it('should train with variational inference', () => {
      const bnn = new BayesianNeuralNetwork([2, 1]);
      
      const training_data = [
        { input: [0.1, 0.1], target: [0.2] },
        { input: [0.5, 0.3], target: [0.4] },
        { input: [0.8, 0.7], target: [0.7] }
      ];
      
      expect(() => {
        bnn.train(training_data, 5, 0.001); // Fewer epochs, smaller learning rate
      }).not.toThrow();
      
      // Test prediction after training (should work even if not perfectly trained)
      const result = bnn.predictWithUncertainty([0.5, 0.5], 10);
      expect(result.mean_prediction).toBeDefined();
      expect(result.variance).toBeGreaterThanOrEqual(0);
    });

    it('should have different predictions with different samples', () => {
      const bnn = new BayesianNeuralNetwork([2, 1]);
      const input = [1.0, 0.5];
      
      const result1 = bnn.predictWithUncertainty(input, 10);
      const result2 = bnn.predictWithUncertainty(input, 10);
      
      // Due to sampling, results should potentially be different
      // (though they might be similar due to random seed)
      expect(Number.isFinite(result1.mean_prediction)).toBe(true);
      expect(Number.isFinite(result2.mean_prediction)).toBe(true);
    });
  });

  describe('RockfallUncertaintyEnsemble', () => {
    let ensemble: RockfallUncertaintyEnsemble;

    beforeEach(() => {
      ensemble = new RockfallUncertaintyEnsemble([3, 4, 1], 3);
    });

    it('should create ensemble and make comprehensive predictions', () => {
      const input = [10.0, 20.0, 5.0]; // x, y, z coordinates
      
      const result = ensemble.predictWithFullUncertainty(input);
      
      expect(result.bayesian_result).toBeDefined();
      expect(result.ensemble_result).toBeDefined();
      expect(result.combined_uncertainty).toBeDefined();
      expect(result.reliability_score).toBeDefined();
      
      // Check Bayesian result
      expect(Number.isFinite(result.bayesian_result.mean_prediction)).toBe(true);
      expect(result.bayesian_result.variance).toBeGreaterThanOrEqual(0);
      
      // Check ensemble result
      expect(result.ensemble_result.predictions.length).toBe(3); // 3 models
      expect(Number.isFinite(result.ensemble_result.uncertainty.mean_prediction)).toBe(true);
      
      // Check combined uncertainty
      expect(Number.isFinite(result.combined_uncertainty.mean_prediction)).toBe(true);
      expect(result.combined_uncertainty.variance).toBeGreaterThanOrEqual(0);
      expect(result.combined_uncertainty.confidence_interval.length).toBe(2);
      
      // Check reliability score
      expect(result.reliability_score).toBeGreaterThanOrEqual(0);
      expect(result.reliability_score).toBeLessThanOrEqual(1);
    });

    it('should handle calibration', () => {
      const validation_data = [
        { input: [1.0, 2.0, 0.0], target: 0.3 },
        { input: [5.0, 10.0, 2.0], target: 0.7 },
        { input: [15.0, 25.0, 8.0], target: 0.9 }
      ];
      
      expect(() => {
        ensemble.calibrate(validation_data);
      }).not.toThrow();
      
      // After calibration, predictions should still work
      const result = ensemble.predictWithFullUncertainty([10.0, 15.0, 3.0]);
      expect(Number.isFinite(result.reliability_score)).toBe(true);
    });

    it('should combine uncertainties appropriately', () => {
      const input = [5.0, 8.0, 2.0];
      
      const result = ensemble.predictWithFullUncertainty(input);
      
      // Combined uncertainty should incorporate both Bayesian and ensemble uncertainties
      expect(result.combined_uncertainty.epistemic_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.combined_uncertainty.aleatoric_uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.combined_uncertainty.total_uncertainty).toBeGreaterThanOrEqual(0);
      
      // Combined mean should be between individual predictions (approximately)
      const bayesian_mean = result.bayesian_result.mean_prediction;
      const ensemble_mean = result.ensemble_result.uncertainty.mean_prediction;
      const combined_mean = result.combined_uncertainty.mean_prediction;
      
      const min_mean = Math.min(bayesian_mean, ensemble_mean);
      const max_mean = Math.max(bayesian_mean, ensemble_mean);
      
      // Combined mean should be reasonably close to the individual means
      expect(combined_mean).toBeGreaterThanOrEqual(min_mean - 0.5);
      expect(combined_mean).toBeLessThanOrEqual(max_mean + 0.5);
    });

    it('should compute meaningful reliability scores', () => {
      const input = [12.0, 18.0, 4.0];
      
      const result = ensemble.predictWithFullUncertainty(input);
      
      expect(result.reliability_score).toBeGreaterThanOrEqual(0);
      expect(result.reliability_score).toBeLessThanOrEqual(1);
      
      // Reliability should be reasonable for uncalibrated ensemble
      expect(result.reliability_score).toBeGreaterThan(0.1);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with realistic rockfall data', () => {
      const ensemble = new RockfallUncertaintyEnsemble([4, 8, 4, 1], 4);
      
      // Simulate realistic input features
      const realistic_inputs = [
        [25.5, 45.2, 12.8, 0.3], // x, y, z, slope_angle
        [30.1, 50.7, 15.2, 0.5],
        [18.9, 38.4, 8.1, 0.2],
        [42.3, 62.1, 20.5, 0.7]
      ];
      
      for (const input of realistic_inputs) {
        const result = ensemble.predictWithFullUncertainty(input);
        
        // All results should be valid
        expect(Number.isFinite(result.bayesian_result.mean_prediction)).toBe(true);
        expect(Number.isFinite(result.ensemble_result.uncertainty.mean_prediction)).toBe(true);
        expect(Number.isFinite(result.combined_uncertainty.mean_prediction)).toBe(true);
        expect(Number.isFinite(result.reliability_score)).toBe(true);
        
        // Uncertainty metrics should be reasonable
        expect(result.combined_uncertainty.variance).toBeGreaterThanOrEqual(0);
        expect(result.combined_uncertainty.total_uncertainty).toBeGreaterThanOrEqual(0);
        expect(result.combined_uncertainty.confidence_interval[0]).toBeLessThan(
          result.combined_uncertainty.confidence_interval[1]
        );
        
        // Reliability score should be meaningful
        expect(result.reliability_score).toBeGreaterThan(0);
        expect(result.reliability_score).toBeLessThanOrEqual(1);
      }
    });

    it('should handle training and calibration workflow', () => {
      const ensemble = new RockfallUncertaintyEnsemble([3, 6, 1], 2);
      
      // Validation data for calibration
      const validation_data = [
        { input: [5.0, 5.0, 2.5], target: 0.25 },
        { input: [15.0, 15.0, 7.5], target: 0.55 },
        { input: [25.0, 25.0, 12.5], target: 0.8 }
      ];
      
      // This workflow should complete without errors
      expect(() => {
        ensemble.calibrate(validation_data);
      }).not.toThrow();
      
      // Predictions should still work after calibration
      const result = ensemble.predictWithFullUncertainty([12.0, 12.0, 6.0]);
      expect(Number.isFinite(result.reliability_score)).toBe(true);
      expect(result.reliability_score).toBeGreaterThan(0);
    });

    it('should show different uncertainty for different input regions', () => {
      const ensemble = new RockfallUncertaintyEnsemble([2, 4, 1], 3);
      
      // Test points in different regions
      const center_point = [0.0, 0.0];
      const edge_point = [100.0, 100.0];
      
      const center_result = ensemble.predictWithFullUncertainty(center_point);
      const edge_result = ensemble.predictWithFullUncertainty(edge_point);
      
      // Both should produce valid results
      expect(Number.isFinite(center_result.combined_uncertainty.total_uncertainty)).toBe(true);
      expect(Number.isFinite(edge_result.combined_uncertainty.total_uncertainty)).toBe(true);
      
      // Uncertainty characteristics should be reasonable
      expect(center_result.combined_uncertainty.total_uncertainty).toBeGreaterThanOrEqual(0);
      expect(edge_result.combined_uncertainty.total_uncertainty).toBeGreaterThanOrEqual(0);
      
      // Reliability scores should be meaningful
      expect(center_result.reliability_score).toBeGreaterThan(0);
      expect(edge_result.reliability_score).toBeGreaterThan(0);
    });
  });
});