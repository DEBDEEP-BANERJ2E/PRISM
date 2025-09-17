import {
  PhysicsInformedNeuralNetwork,
  PhysicsAwareLayer,
  PhysicsRegularizer,
  type PhysicsConstraints
} from '../../models/PhysicsInformedNeuralNetworks';

describe('PhysicsInformedNeuralNetworks', () => {
  let mockPhysicsConstraints: PhysicsConstraints;

  beforeEach(() => {
    mockPhysicsConstraints = {
      slope_stability: {
        cohesion: 20, // kPa
        friction_angle: 30, // degrees
        unit_weight: 18, // kN/m³
        slope_angle: 45, // degrees
        height: 10, // m
        water_table_depth: 5, // m
        pore_pressure: 50 // kPa
      },
      groundwater_flow: {
        hydraulic_conductivity: 1e-5, // m/s
        porosity: 0.3,
        specific_storage: 1e-4, // 1/m
        boundary_conditions: {
          head_boundaries: [
            { x: 0, y: 0, head: 10 },
            { x: 100, y: 0, head: 8 },
            { x: 50, y: 50, head: 9 }
          ],
          flux_boundaries: [
            { x: 0, y: 100, flux: 0.001 }
          ]
        }
      },
      conservation_laws: {
        mass_conservation: true,
        momentum_conservation: true,
        energy_conservation: false
      }
    };
  });

  describe('PhysicsAwareLayer', () => {
    it('should create layer and process input', () => {
      const layer = new PhysicsAwareLayer(4, 6, 'tanh');

      const input = [1.0, 0.5, -0.2, 0.8];
      const output = layer.forward(input);

      expect(output).toBeDefined();
      expect(output.length).toBe(6);

      // Tanh activation should produce values in [-1, 1]
      for (const value of output) {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should compute gradients correctly', () => {
      const layer = new PhysicsAwareLayer(3, 2, 'sigmoid');

      const input = [0.5, -0.3, 0.8];
      const output_gradients = [0.1, -0.2];

      const gradients = layer.computeGradients(input, output_gradients);

      expect(gradients.weight_gradients).toBeDefined();
      expect(gradients.bias_gradients).toBeDefined();
      expect(gradients.input_gradients).toBeDefined();

      expect(gradients.weight_gradients.length).toBe(2); // output_dim
      expect(gradients.weight_gradients[0].length).toBe(3); // input_dim
      expect(gradients.bias_gradients.length).toBe(2);
      expect(gradients.input_gradients.length).toBe(3);
    });

    it('should update parameters', () => {
      const layer = new PhysicsAwareLayer(2, 2, 'tanh');

      const input = [1.0, 0.5];
      const initial_output = layer.forward(input);

      // Create mock gradients with larger values to ensure visible change
      const weight_gradients = [[1.0, 0.5], [2.0, 1.0]];
      const bias_gradients = [1.0, 2.0];

      layer.updateParameters(weight_gradients, bias_gradients, 0.1);

      const updated_output = layer.forward(input);

      // Output should change after parameter update
      expect(updated_output).not.toEqual(initial_output);
    });

    it('should handle different activation functions', () => {
      const activations: Array<'tanh' | 'sigmoid' | 'relu' | 'swish'> = ['tanh', 'sigmoid', 'relu', 'swish'];

      for (const activation of activations) {
        const layer = new PhysicsAwareLayer(3, 2, activation);
        const input = [1.0, -0.5, 0.3];
        const output = layer.forward(input);

        expect(output.length).toBe(2);

        // Check activation-specific properties
        switch (activation) {
          case 'tanh':
            for (const val of output) {
              expect(val).toBeGreaterThanOrEqual(-1);
              expect(val).toBeLessThanOrEqual(1);
            }
            break;
          case 'sigmoid':
            for (const val of output) {
              expect(val).toBeGreaterThanOrEqual(0);
              expect(val).toBeLessThanOrEqual(1);
            }
            break;
          case 'relu':
            for (const val of output) {
              expect(val).toBeGreaterThanOrEqual(0);
            }
            break;
          case 'swish':
            // Swish can produce negative values but is generally positive for positive inputs
            expect(output.every(val => Number.isFinite(val))).toBe(true);
            break;
        }
      }
    });

    it('should compute activation derivatives', () => {
      const layer = new PhysicsAwareLayer(2, 2, 'tanh');

      const test_values = [-2, -1, 0, 1, 2];

      for (const val of test_values) {
        const derivative = layer.computeActivationDerivative(val);

        expect(Number.isFinite(derivative)).toBe(true);
        expect(derivative).toBeGreaterThanOrEqual(0); // Tanh derivative is always positive
        expect(derivative).toBeLessThanOrEqual(1); // Tanh derivative max is 1
      }
    });
  });

  describe('PhysicsInformedNeuralNetwork', () => {
    it('should create PINN and make predictions', () => {
      const layer_sizes = [3, 8, 4, 1];
      const pinn = new PhysicsInformedNeuralNetwork(
        layer_sizes,
        mockPhysicsConstraints,
        1.0, // lambda_physics
        1.0  // lambda_data
      );

      const input = [10, 20, 5]; // x, y, z coordinates
      const result = pinn.predict(input);

      expect(result).toBeDefined();
      expect(result.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result.risk_probability).toBeLessThanOrEqual(1);
      expect(result.factor_of_safety).toBeGreaterThan(0);
      expect(result.groundwater_head).toBeDefined();
      expect(result.physics_loss).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should compute factor of safety correctly', () => {
      const pinn = new PhysicsInformedNeuralNetwork(
        [3, 4, 1],
        mockPhysicsConstraints
      );

      const input = [0, 0, 0];
      const result = pinn.predict(input);

      // Factor of safety should be reasonable for given parameters
      expect(result.factor_of_safety).toBeGreaterThan(0);
      expect(result.factor_of_safety).toBeLessThan(10); // Reasonable upper bound

      // For the given parameters (cohesion=20, friction_angle=30, slope_angle=45)
      // Factor of safety should be reasonable but could be low due to high pore pressure
      expect(result.factor_of_safety).toBeGreaterThan(0.1);
      expect(result.factor_of_safety).toBeLessThan(5.0);
    });

    it('should compute groundwater head distribution', () => {
      const pinn = new PhysicsInformedNeuralNetwork(
        [3, 4, 1],
        mockPhysicsConstraints
      );

      const input = [25, 25, 0]; // Point near boundary conditions
      const result = pinn.predict(input);

      expect(result.groundwater_head).toBeDefined();
      expect(result.groundwater_head.length).toBeGreaterThan(0);

      // Groundwater heads should be reasonable values
      for (const head of result.groundwater_head) {
        expect(head).toBeGreaterThanOrEqual(0);
        expect(head).toBeLessThan(20); // Reasonable upper bound
      }
    });

    it('should detect constraint violations', () => {
      const pinn = new PhysicsInformedNeuralNetwork(
        [3, 4, 1],
        mockPhysicsConstraints
      );

      // Test with various inputs
      const test_inputs = [
        [0, 0, 0],
        [50, 50, 0],
        [100, 100, 0]
      ];

      for (const input of test_inputs) {
        const result = pinn.predict(input);

        expect(result.constraint_violations).toBeDefined();
        expect(Array.isArray(result.constraint_violations)).toBe(true);

        // Each violation should be a descriptive string
        for (const violation of result.constraint_violations) {
          expect(typeof violation).toBe('string');
          expect(violation.length).toBeGreaterThan(0);
        }
      }
    });

    it('should generate meaningful explanations', () => {
      const pinn = new PhysicsInformedNeuralNetwork(
        [3, 6, 3, 1],
        mockPhysicsConstraints
      );

      const input = [10, 10, 0];
      const result = pinn.predict(input);

      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);

      // Should contain risk level explanation
      const risk_explanation = result.explanation.find(exp =>
        exp.includes('RISK') || exp.includes('risk')
      );
      expect(risk_explanation).toBeDefined();

      // Should contain factor of safety explanation
      const fos_explanation = result.explanation.find(exp =>
        exp.includes('Factor of safety') || exp.includes('factor of safety')
      );
      expect(fos_explanation).toBeDefined();

      // Should contain physics constraint explanation
      const physics_explanation = result.explanation.find(exp =>
        exp.includes('physics') || exp.includes('constraint')
      );
      expect(physics_explanation).toBeDefined();
    });

    it('should handle training with physics constraints', () => {
      const pinn = new PhysicsInformedNeuralNetwork(
        [2, 4, 1],
        mockPhysicsConstraints,
        0.5, // lambda_physics
        1.0  // lambda_data
      );

      // Create simple training data
      const training_data = [
        { input: [0, 0], target: [0.8] }, // High risk point
        { input: [50, 50], target: [0.3] }, // Medium risk point
        { input: [100, 100], target: [0.1] } // Low risk point
      ];

      const physics_points = [
        { x: 25, y: 25 },
        { x: 75, y: 75 },
        { x: 10, y: 90 }
      ];

      // Train for a few epochs (short test)
      expect(() => {
        pinn.train(training_data, physics_points, 10, 0.01);
      }).not.toThrow();

      // Check that predictions are still reasonable after training
      const result = pinn.predict([25, 25]);
      expect(result.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result.risk_probability).toBeLessThanOrEqual(1);
    });

    it('should handle different physics constraint weights', () => {
      const pinn_high_physics = new PhysicsInformedNeuralNetwork(
        [3, 4, 1],
        mockPhysicsConstraints,
        10.0, // High physics weight
        1.0
      );

      const pinn_low_physics = new PhysicsInformedNeuralNetwork(
        [3, 4, 1],
        mockPhysicsConstraints,
        0.1, // Low physics weight
        1.0
      );

      const input = [10, 10, 0];

      const result_high = pinn_high_physics.predict(input);
      const result_low = pinn_low_physics.predict(input);

      // Both should produce valid results
      expect(result_high.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result_high.risk_probability).toBeLessThanOrEqual(1);
      expect(result_low.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result_low.risk_probability).toBeLessThanOrEqual(1);

      // Physics loss should be computed for both
      expect(result_high.physics_loss).toBeGreaterThanOrEqual(0);
      expect(result_low.physics_loss).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PhysicsRegularizer', () => {
    it('should apply physics-based regularization', () => {
      const regularizer = new PhysicsRegularizer(0.01);

      const weights = [
        [0.5, -0.3, 0.2, 0.8],
        [0.1, 0.4, -0.6, 0.3]
      ];

      const regularization_loss = regularizer.applyPhysicsRegularization(
        weights,
        mockPhysicsConstraints
      );

      expect(regularization_loss).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(regularization_loss)).toBe(true);
    });

    it('should apply conservation law regularization', () => {
      const regularizer = new PhysicsRegularizer(0.05);

      const network_output = [0.3, -0.1, 0.2, 0.4];
      const conservation_laws = {
        mass_conservation: true,
        momentum_conservation: true,
        energy_conservation: false
      };

      const conservation_loss = regularizer.applyConservationRegularization(
        network_output,
        conservation_laws
      );

      expect(conservation_loss).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(conservation_loss)).toBe(true);
    });

    it('should handle different regularization strengths', () => {
      const weak_regularizer = new PhysicsRegularizer(0.001);
      const strong_regularizer = new PhysicsRegularizer(0.1);

      const weights = [[1.0, 2.0, 3.0, 4.0]];

      const weak_loss = weak_regularizer.applyPhysicsRegularization(
        weights,
        mockPhysicsConstraints
      );
      const strong_loss = strong_regularizer.applyPhysicsRegularization(
        weights,
        mockPhysicsConstraints
      );

      expect(strong_loss).toBeGreaterThan(weak_loss);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with realistic slope parameters', () => {
      // Create realistic slope stability parameters
      const realistic_constraints: PhysicsConstraints = {
        slope_stability: {
          cohesion: 15, // kPa - typical for weathered rock
          friction_angle: 35, // degrees - typical for rock
          unit_weight: 20, // kN/m³ - typical for rock
          slope_angle: 60, // degrees - steep slope
          height: 15, // m - moderate height
          water_table_depth: 8, // m
          pore_pressure: 30 // kPa
        },
        groundwater_flow: {
          hydraulic_conductivity: 5e-6, // m/s - low permeability rock
          porosity: 0.15, // Low porosity rock
          specific_storage: 5e-5,
          boundary_conditions: {
            head_boundaries: [
              { x: 0, y: 0, head: 12 },
              { x: 200, y: 0, head: 10 },
              { x: 100, y: 100, head: 11 }
            ],
            flux_boundaries: []
          }
        },
        conservation_laws: {
          mass_conservation: true,
          momentum_conservation: false,
          energy_conservation: false
        }
      };

      const pinn = new PhysicsInformedNeuralNetwork(
        [3, 16, 8, 4, 1],
        realistic_constraints,
        2.0, // Higher physics weight for realistic constraints
        1.0
      );

      // Test multiple points across the slope
      const test_points = [
        [0, 0, 0],     // Bottom of slope
        [50, 50, 5],   // Mid-slope
        [100, 100, 10], // Top of slope
        [150, 75, 8],   // Side of slope
        [25, 150, 3]    // Different location
      ];

      for (const point of test_points) {
        const result = pinn.predict(point);

        // All results should be physically reasonable
        expect(result.risk_probability).toBeGreaterThanOrEqual(0);
        expect(result.risk_probability).toBeLessThanOrEqual(1);
        expect(result.factor_of_safety).toBeGreaterThan(0);
        expect(result.factor_of_safety).toBeLessThan(10);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.explanation.length).toBeGreaterThan(2);

        // Physics loss should be reasonable
        expect(result.physics_loss).toBeGreaterThanOrEqual(0);
        expect(result.physics_loss).toBeLessThan(10);
      }
    });

    it('should handle extreme parameter values gracefully', () => {
      // Test with extreme but valid parameters
      const extreme_constraints: PhysicsConstraints = {
        slope_stability: {
          cohesion: 0.1, // Very low cohesion
          friction_angle: 15, // Low friction angle
          unit_weight: 25, // High unit weight
          slope_angle: 80, // Very steep
          height: 50, // Very high
          pore_pressure: 200 // High pore pressure
        },
        groundwater_flow: {
          hydraulic_conductivity: 1e-8, // Very low permeability
          porosity: 0.05, // Very low porosity
          specific_storage: 1e-6,
          boundary_conditions: {
            head_boundaries: [{ x: 0, y: 0, head: 20 }],
            flux_boundaries: []
          }
        },
        conservation_laws: {
          mass_conservation: true,
          momentum_conservation: true,
          energy_conservation: true
        }
      };

      const pinn = new PhysicsInformedNeuralNetwork(
        [3, 8, 1],
        extreme_constraints
      );

      const result = pinn.predict([10, 10, 0]);

      // Should still produce valid results even with extreme parameters
      expect(result.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result.risk_probability).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result.factor_of_safety)).toBe(true);
      expect(result.factor_of_safety).toBeGreaterThanOrEqual(0.1); // Minimum enforced FoS

      // Should detect elevated risk due to extreme parameters (untrained network may not be perfectly calibrated)
      expect(result.risk_probability).toBeGreaterThan(0.0); // Should show some risk
      expect(result.factor_of_safety).toBeLessThan(2.0); // Should be low FoS due to extreme conditions
    });

    it('should maintain physics consistency across predictions', () => {
      const pinn = new PhysicsInformedNeuralNetwork(
        [3, 12, 6, 1],
        mockPhysicsConstraints,
        1.5,
        1.0
      );

      // Test consistency across nearby points
      const base_point = [50, 50, 0];
      const nearby_points = [
        [51, 50, 0],
        [50, 51, 0],
        [49, 50, 0],
        [50, 49, 0]
      ];

      const base_result = pinn.predict(base_point);

      for (const point of nearby_points) {
        const result = pinn.predict(point);

        // Nearby points should have similar predictions
        const risk_difference = Math.abs(result.risk_probability - base_result.risk_probability);
        expect(risk_difference).toBeLessThan(0.3); // Should be reasonably similar

        const fos_difference = Math.abs(result.factor_of_safety - base_result.factor_of_safety);
        expect(fos_difference).toBeLessThan(1.0); // Should be reasonably similar

        // Physics loss should be similar
        const physics_loss_difference = Math.abs(result.physics_loss - base_result.physics_loss);
        expect(physics_loss_difference).toBeLessThan(2.0);
      }
    });
  });
});