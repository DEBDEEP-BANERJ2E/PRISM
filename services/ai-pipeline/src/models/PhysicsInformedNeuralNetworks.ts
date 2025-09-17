/**
 * Physics-Informed Neural Networks (PINNs) for Rockfall Prediction
 * 
 * This module implements PINNs that incorporate physical laws and constraints:
 * - Slope stability equations (limit equilibrium, factor of safety)
 * - Darcy flow constraints for groundwater modeling
 * - Conservation laws enforcement
 * - Physics-guided regularization techniques
 */

/**
 * Physical parameters for slope stability analysis
 */
export interface SlopeStabilityParams {
  cohesion: number; // Soil cohesion (kPa)
  friction_angle: number; // Internal friction angle (degrees)
  unit_weight: number; // Unit weight of soil (kN/m³)
  slope_angle: number; // Slope angle (degrees)
  height: number; // Slope height (m)
  water_table_depth?: number; // Depth to water table (m)
  pore_pressure?: number; // Pore water pressure (kPa)
}

/**
 * Groundwater flow parameters
 */
export interface GroundwaterFlowParams {
  hydraulic_conductivity: number; // Hydraulic conductivity (m/s)
  porosity: number; // Soil porosity (0-1)
  specific_storage: number; // Specific storage (1/m)
  boundary_conditions: {
    head_boundaries: Array<{ x: number; y: number; head: number }>;
    flux_boundaries: Array<{ x: number; y: number; flux: number }>;
  };
}

/**
 * Physics constraints for neural network training
 */
export interface PhysicsConstraints {
  slope_stability: SlopeStabilityParams;
  groundwater_flow: GroundwaterFlowParams;
  conservation_laws: {
    mass_conservation: boolean;
    momentum_conservation: boolean;
    energy_conservation: boolean;
  };
}

/**
 * PINN prediction result with physics validation
 */
export interface PINNPredictionResult {
  risk_probability: number;
  factor_of_safety: number;
  groundwater_head: number[];
  physics_loss: number;
  data_loss: number;
  total_loss: number;
  constraint_violations: string[];
  confidence: number;
  explanation: string[];
}

/**
 * Neural network layer with physics-aware activation
 */
export class PhysicsAwareLayer {
  private input_dim: number;
  private output_dim: number;
  private weights: number[][];
  private bias: number[];
  private activation_type: 'tanh' | 'sigmoid' | 'relu' | 'swish';

  constructor(
    input_dim: number,
    output_dim: number,
    activation_type: 'tanh' | 'sigmoid' | 'relu' | 'swish' = 'tanh'
  ) {
    this.input_dim = input_dim;
    this.output_dim = output_dim;
    this.activation_type = activation_type;
    
    // Initialize weights using Xavier initialization
    this.weights = this.initializeWeights();
    this.bias = Array(output_dim).fill(0);
  }

  /**
   * Forward pass through the layer
   */
  public forward(input: number[]): number[] {
    const linear_output = this.matrixVectorMultiply(this.weights, input);
    const biased_output = linear_output.map((val, idx) => val + this.bias[idx]);
    
    return biased_output.map(val => this.applyActivation(val));
  }

  /**
   * Compute gradients for backpropagation
   */
  public computeGradients(input: number[], output_gradients: number[]): {
    weight_gradients: number[][];
    bias_gradients: number[];
    input_gradients: number[];
  } {
    const weight_gradients: number[][] = [];
    const bias_gradients: number[] = [];
    const input_gradients = Array(this.input_dim).fill(0);

    // Compute weight and bias gradients
    for (let i = 0; i < this.output_dim; i++) {
      const weight_grad_row: number[] = [];
      
      for (let j = 0; j < this.input_dim; j++) {
        weight_grad_row.push(output_gradients[i] * input[j]);
        input_gradients[j] += output_gradients[i] * this.weights[i][j];
      }
      
      weight_gradients.push(weight_grad_row);
      bias_gradients.push(output_gradients[i]);
    }

    return { weight_gradients, bias_gradients, input_gradients };
  }

  /**
   * Update weights and biases
   */
  public updateParameters(
    weight_gradients: number[][],
    bias_gradients: number[],
    learning_rate: number
  ): void {
    for (let i = 0; i < this.output_dim; i++) {
      for (let j = 0; j < this.input_dim; j++) {
        this.weights[i][j] -= learning_rate * weight_gradients[i][j];
      }
      this.bias[i] -= learning_rate * bias_gradients[i];
    }
  }

  /**
   * Initialize weights using Xavier initialization
   */
  private initializeWeights(): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (this.input_dim + this.output_dim));
    
    for (let i = 0; i < this.output_dim; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.input_dim; j++) {
        row.push((Math.random() * 2 - 1) * limit);
      }
      weights.push(row);
    }
    
    return weights;
  }

  /**
   * Matrix-vector multiplication
   */
  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < vector.length && j < matrix[i].length; j++) {
        sum += matrix[i][j] * vector[j];
      }
      result.push(sum);
    }
    
    return result;
  }

  /**
   * Apply activation function
   */
  private applyActivation(x: number): number {
    switch (this.activation_type) {
      case 'tanh':
        return Math.tanh(x);
      case 'sigmoid':
        return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
      case 'relu':
        return Math.max(0, x);
      case 'swish':
        return x / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
      default:
        return Math.tanh(x);
    }
  }

  /**
   * Compute activation derivative for backpropagation
   */
  public computeActivationDerivative(x: number): number {
    switch (this.activation_type) {
      case 'tanh':
        const tanh_val = Math.tanh(x);
        return 1 - tanh_val * tanh_val;
      case 'sigmoid':
        const sigmoid_val = this.applyActivation(x);
        return sigmoid_val * (1 - sigmoid_val);
      case 'relu':
        return x > 0 ? 1 : 0;
      case 'swish':
        const sigmoid_x = 1 / (1 + Math.exp(-x));
        return sigmoid_x + x * sigmoid_x * (1 - sigmoid_x);
      default:
        const tanh_default = Math.tanh(x);
        return 1 - tanh_default * tanh_default;
    }
  }
}

/**
 * Physics-Informed Neural Network for rockfall prediction
 */
export class PhysicsInformedNeuralNetwork {
  private layers: PhysicsAwareLayer[];
  private physics_constraints: PhysicsConstraints;
  private lambda_physics: number; // Physics loss weight
  private lambda_data: number; // Data loss weight

  constructor(
    layer_sizes: number[],
    physics_constraints: PhysicsConstraints,
    lambda_physics: number = 1.0,
    lambda_data: number = 1.0
  ) {
    this.physics_constraints = physics_constraints;
    this.lambda_physics = lambda_physics;
    this.lambda_data = lambda_data;
    
    // Initialize neural network layers
    this.layers = [];
    for (let i = 0; i < layer_sizes.length - 1; i++) {
      const activation = i === layer_sizes.length - 2 ? 'sigmoid' : 'tanh';
      this.layers.push(new PhysicsAwareLayer(
        layer_sizes[i],
        layer_sizes[i + 1],
        activation
      ));
    }
  }

  /**
   * Forward pass through the network
   */
  public forward(input: number[]): number[] {
    let current_input = input;
    
    for (const layer of this.layers) {
      current_input = layer.forward(current_input);
    }
    
    return current_input;
  }

  /**
   * Train the PINN with physics constraints
   */
  public train(
    training_data: Array<{ input: number[]; target: number[] }>,
    physics_points: Array<{ x: number; y: number; z?: number }>,
    epochs: number = 1000,
    learning_rate: number = 0.001
  ): void {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let total_data_loss = 0;
      let total_physics_loss = 0;

      // Data loss computation
      for (const sample of training_data) {
        const prediction = this.forward(sample.input);
        const data_loss = this.computeDataLoss(prediction, sample.target);
        total_data_loss += data_loss;
        
        // Backpropagate data loss
        this.backpropagate(sample.input, prediction, sample.target, learning_rate, 'data');
      }

      // Physics loss computation
      for (const point of physics_points) {
        const physics_loss = this.computePhysicsLoss(point);
        total_physics_loss += physics_loss;
        
        // Backpropagate physics loss
        this.backpropagatePhysicsLoss(point, learning_rate);
      }

      // Log progress
      if (epoch % 100 === 0) {
        console.log(`Epoch ${epoch}: Data Loss = ${total_data_loss.toFixed(6)}, Physics Loss = ${total_physics_loss.toFixed(6)}`);
      }
    }
  }

  /**
   * Make prediction with physics validation
   */
  public predict(input: number[]): PINNPredictionResult {
    const prediction = this.forward(input);
    
    // Extract predictions
    const risk_probability = prediction[0];
    const factor_of_safety = this.computeFactorOfSafety(input);
    const groundwater_head = this.computeGroundwaterHead(input);
    
    // Compute physics loss for validation
    const physics_point = { x: input[0], y: input[1], z: input[2] || 0 };
    const physics_loss = this.computePhysicsLoss(physics_point);
    const data_loss = 0; // No target for prediction
    const total_loss = this.lambda_data * data_loss + this.lambda_physics * physics_loss;
    
    // Check constraint violations
    const constraint_violations = this.checkConstraintViolations(input, prediction);
    
    // Compute confidence based on physics consistency
    const confidence = Math.max(0, 1 - physics_loss);
    
    // Generate explanations
    const explanation = this.generatePhysicsExplanation(
      input,
      prediction,
      factor_of_safety,
      constraint_violations
    );

    return {
      risk_probability,
      factor_of_safety,
      groundwater_head,
      physics_loss,
      data_loss,
      total_loss,
      constraint_violations,
      confidence,
      explanation
    };
  }

  /**
   * Compute slope stability factor of safety
   */
  private computeFactorOfSafety(_input: number[]): number {
    const params = this.physics_constraints.slope_stability;
    
    // Extract relevant features from input
    const slope_angle_rad = (params.slope_angle * Math.PI) / 180;
    const friction_angle_rad = (params.friction_angle * Math.PI) / 180;
    
    // Simplified infinite slope analysis
    const normal_stress = params.unit_weight * params.height * Math.cos(slope_angle_rad) ** 2;
    const shear_stress = params.unit_weight * params.height * Math.sin(slope_angle_rad) * Math.cos(slope_angle_rad);
    
    // Account for pore water pressure if present
    let effective_normal_stress = normal_stress;
    if (params.pore_pressure) {
      effective_normal_stress -= params.pore_pressure;
    }
    
    // Factor of safety calculation
    const resisting_force = params.cohesion + Math.max(0, effective_normal_stress) * Math.tan(friction_angle_rad);
    const driving_force = Math.abs(shear_stress);
    
    return driving_force > 0 ? Math.max(0.1, resisting_force / driving_force) : 10; // Minimum FoS of 0.1, High FoS if no driving force
  }

  /**
   * Compute groundwater head distribution
   */
  private computeGroundwaterHead(input: number[]): number[] {
    const params = this.physics_constraints.groundwater_flow;
    
    // Simplified groundwater head calculation
    // In practice, this would solve the groundwater flow equation
    const heads: number[] = [];
    
    for (const boundary of params.boundary_conditions.head_boundaries) {
      // Simple interpolation based on distance
      const distance = Math.sqrt(
        Math.pow(input[0] - boundary.x, 2) + Math.pow(input[1] - boundary.y, 2)
      );
      const head = boundary.head * Math.exp(-distance / 100); // Exponential decay
      heads.push(head);
    }
    
    return heads.length > 0 ? heads : [0];
  }

  /**
   * Compute data loss (MSE)
   */
  private computeDataLoss(prediction: number[], target: number[]): number {
    let loss = 0;
    for (let i = 0; i < prediction.length; i++) {
      loss += Math.pow(prediction[i] - target[i], 2);
    }
    return loss / prediction.length;
  }

  /**
   * Compute physics loss based on physical constraints
   */
  private computePhysicsLoss(point: { x: number; y: number; z?: number }): number {
    let physics_loss = 0;
    
    // Slope stability constraint
    physics_loss += this.computeSlopeStabilityLoss(point);
    
    // Groundwater flow constraint (Darcy's law)
    physics_loss += this.computeGroundwaterFlowLoss(point);
    
    // Conservation laws
    if (this.physics_constraints.conservation_laws.mass_conservation) {
      physics_loss += this.computeMassConservationLoss(point);
    }
    
    return physics_loss;
  }

  /**
   * Compute slope stability physics loss
   */
  private computeSlopeStabilityLoss(point: { x: number; y: number; z?: number }): number {
    // Predict factor of safety at this point
    const input = [point.x, point.y, point.z || 0];
    const prediction = this.forward(input);
    const predicted_risk = prediction[0];
    
    // Compute theoretical factor of safety
    const theoretical_fos = this.computeFactorOfSafety(input);
    
    // Physics constraint: risk should be inversely related to factor of safety
    const expected_risk = Math.max(0, Math.min(1, 2 - theoretical_fos)); // FoS=1 -> risk=1, FoS=2 -> risk=0
    
    return Math.pow(predicted_risk - expected_risk, 2);
  }

  /**
   * Compute groundwater flow physics loss (Darcy's law)
   */
  private computeGroundwaterFlowLoss(point: { x: number; y: number; z?: number }): number {
    // Simplified Darcy's law constraint
    // In practice, this would compute the divergence of hydraulic conductivity * gradient of head
    
    const params = this.physics_constraints.groundwater_flow;
    const input = [point.x, point.y, point.z || 0];
    
    // Compute numerical gradients (simplified)
    const h = 0.01; // Small perturbation
    const head_center = this.computeGroundwaterHead(input)[0] || 0;
    const head_x_plus = this.computeGroundwaterHead([input[0] + h, input[1], input[2]])[0] || 0;
    const head_y_plus = this.computeGroundwaterHead([input[0], input[1] + h, input[2]])[0] || 0;
    
    const grad_x = (head_x_plus - head_center) / h;
    const grad_y = (head_y_plus - head_center) / h;
    
    // Darcy's law: q = -K * grad(h)
    const flux_x = -params.hydraulic_conductivity * grad_x;
    const flux_y = -params.hydraulic_conductivity * grad_y;
    
    // Continuity equation: div(q) = 0 for steady state
    const divergence = Math.abs(flux_x + flux_y); // Simplified 1D divergence
    
    return divergence * divergence; // Penalize non-zero divergence
  }

  /**
   * Compute mass conservation loss
   */
  private computeMassConservationLoss(_point: { x: number; y: number; z?: number }): number {
    // Mass conservation: ∂ρ/∂t + ∇·(ρv) = 0
    // For steady state and incompressible flow: ∇·v = 0
    
    // Simplified implementation - in practice would compute velocity divergence
    return 0; // Placeholder
  }

  /**
   * Backpropagate gradients
   */
  private backpropagate(
    _input: number[],
    prediction: number[],
    target: number[],
    learning_rate: number,
    loss_type: 'data' | 'physics'
  ): void {
    // Compute output gradients
    const output_gradients = prediction.map((pred, idx) => 
      2 * (pred - target[idx]) / prediction.length
    );
    
    // Backpropagate through layers
    let current_gradients = output_gradients;
    let current_input = _input;
    
    // Forward pass to store intermediate values
    const layer_inputs: number[][] = [_input];
    for (const layer of this.layers) {
      current_input = layer.forward(current_input);
      layer_inputs.push([...current_input]);
    }
    
    // Backward pass
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const layer_input = layer_inputs[i];
      
      const { weight_gradients, bias_gradients, input_gradients } = 
        layer.computeGradients(layer_input, current_gradients);
      
      // Apply weight based on loss type
      const weight = loss_type === 'data' ? this.lambda_data : this.lambda_physics;
      
      // Scale gradients
      const scaled_weight_gradients = weight_gradients.map(row => 
        row.map(grad => grad * weight)
      );
      const scaled_bias_gradients = bias_gradients.map(grad => grad * weight);
      
      // Update parameters
      layer.updateParameters(scaled_weight_gradients, scaled_bias_gradients, learning_rate);
      
      current_gradients = input_gradients;
    }
  }

  /**
   * Backpropagate physics loss
   */
  private backpropagatePhysicsLoss(
    point: { x: number; y: number; z?: number },
    learning_rate: number
  ): void {
    const input = [point.x, point.y, point.z || 0];
    const prediction = this.forward(input);
    
    // Compute physics-based target
    const theoretical_fos = this.computeFactorOfSafety(input);
    const physics_target = [Math.max(0, Math.min(1, 2 - theoretical_fos))];
    
    this.backpropagate(input, prediction, physics_target, learning_rate, 'physics');
  }

  /**
   * Check constraint violations
   */
  private checkConstraintViolations(input: number[], prediction: number[]): string[] {
    const violations: string[] = [];
    
    // Check if risk probability is in valid range
    if (prediction[0] < 0 || prediction[0] > 1) {
      violations.push(`Risk probability ${prediction[0].toFixed(3)} is outside valid range [0,1]`);
    }
    
    // Check factor of safety consistency
    const fos = this.computeFactorOfSafety(input);
    const expected_risk = Math.max(0, Math.min(1, 2 - fos));
    const risk_difference = Math.abs(prediction[0] - expected_risk);
    
    if (risk_difference > 0.3) {
      violations.push(`Risk prediction inconsistent with factor of safety (FoS=${fos.toFixed(2)}, expected risk=${expected_risk.toFixed(3)})`);
    }
    
    // Check groundwater constraints
    const groundwater_head = this.computeGroundwaterHead(input);
    if (groundwater_head.some(head => head < 0)) {
      violations.push('Negative groundwater head detected');
    }
    
    return violations;
  }

  /**
   * Generate physics-based explanations
   */
  private generatePhysicsExplanation(
    _input: number[],
    prediction: number[],
    factor_of_safety: number,
    violations: string[]
  ): string[] {
    const explanations: string[] = [];
    
    // Risk level explanation
    const risk = prediction[0];
    if (risk > 0.7) {
      explanations.push('HIGH RISK: Physics-informed model indicates elevated failure probability');
    } else if (risk > 0.4) {
      explanations.push('MODERATE RISK: Some concerning physical indicators detected');
    } else {
      explanations.push('LOW RISK: Physical parameters indicate stable conditions');
    }
    
    // Factor of safety explanation
    if (factor_of_safety < 1.0) {
      explanations.push(`CRITICAL: Factor of safety (${factor_of_safety.toFixed(2)}) below unity indicates potential failure`);
    } else if (factor_of_safety < 1.5) {
      explanations.push(`WARNING: Factor of safety (${factor_of_safety.toFixed(2)}) is low, monitor closely`);
    } else {
      explanations.push(`STABLE: Factor of safety (${factor_of_safety.toFixed(2)}) indicates stable slope conditions`);
    }
    
    // Physics constraint explanations
    const params = this.physics_constraints.slope_stability;
    if (params.pore_pressure && params.pore_pressure > 0) {
      explanations.push('Pore water pressure reduces effective stress and slope stability');
    }
    
    if (params.slope_angle > 45) {
      explanations.push('Steep slope angle increases driving forces for failure');
    }
    
    // Violation explanations
    if (violations.length > 0) {
      explanations.push(`Physics constraint violations detected: ${violations.length} issues`);
    } else {
      explanations.push('All physics constraints satisfied');
    }
    
    return explanations;
  }
}

/**
 * Physics-guided regularization techniques
 */
export class PhysicsRegularizer {
  private regularization_strength: number;

  constructor(regularization_strength: number = 0.01) {
    this.regularization_strength = regularization_strength;
  }

  /**
   * Apply physics-based weight regularization
   */
  public applyPhysicsRegularization(
    weights: number[][],
    physics_constraints: PhysicsConstraints
  ): number {
    let regularization_loss = 0;
    
    // L2 regularization with physics-aware scaling
    for (const weight_row of weights) {
      for (const weight of weight_row) {
        regularization_loss += weight * weight;
      }
    }
    
    // Scale by physics parameters
    const cohesion_scale = physics_constraints.slope_stability.cohesion / 100; // Normalize by typical cohesion
    const conductivity_scale = physics_constraints.groundwater_flow.hydraulic_conductivity * 1000; // Scale up small values
    
    const physics_scale = Math.sqrt(cohesion_scale * conductivity_scale);
    
    return this.regularization_strength * regularization_loss * physics_scale;
  }

  /**
   * Apply conservation law regularization
   */
  public applyConservationRegularization(
    network_output: number[],
    conservation_laws: { mass_conservation: boolean; momentum_conservation: boolean; energy_conservation: boolean }
  ): number {
    let conservation_loss = 0;
    
    if (conservation_laws.mass_conservation) {
      // Penalize outputs that violate mass conservation
      const mass_violation = Math.abs(network_output.reduce((sum, val) => sum + val, 0));
      conservation_loss += mass_violation * mass_violation;
    }
    
    if (conservation_laws.momentum_conservation) {
      // Simplified momentum conservation check
      const momentum_violation = network_output.reduce((sum, val, idx) => 
        sum + Math.abs(val * (idx + 1)), 0
      );
      conservation_loss += momentum_violation * 0.1;
    }
    
    return this.regularization_strength * conservation_loss;
  }
}