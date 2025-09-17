/**
 * Spatio-Temporal Deep Learning Models for Rockfall Prediction
 * 
 * This module implements advanced spatio-temporal models:
 * - Diffusion Convolutional Recurrent Neural Network (DCRNN)
 * - Graph WaveNet for multi-scale temporal patterns
 * - Temporal Graph Networks for long-term forecasting
 * - Attention mechanisms for temporal feature weighting
 */

/**
 * Safe matrix-vector multiplication that handles NaN and invalid inputs
 */
function safeMatrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
  const result: number[] = [];
  
  if (!matrix || !vector || matrix.length === 0 || vector.length === 0) {
    return result;
  }
  
  for (let i = 0; i < matrix.length; i++) {
    let sum = 0;
    for (let j = 0; j < vector.length && j < matrix[i].length; j++) {
      const product = matrix[i][j] * vector[j];
      if (!isNaN(product) && isFinite(product)) {
        sum += product;
      }
    }
    result.push(sum);
  }
  
  return result;
}

/**
 * Time series data point with spatial context
 */
export interface SpatioTemporalDataPoint {
  timestamp: Date;
  node_id: string;
  features: number[];
  spatial_coordinates: [number, number, number]; // [x, y, z]
  metadata: Record<string, any>;
}

/**
 * Temporal sequence for a single node
 */
export interface TemporalSequence {
  node_id: string;
  timestamps: Date[];
  feature_sequences: number[][]; // [time_step][feature_dim]
  sequence_length: number;
}

/**
 * Spatio-temporal graph structure
 */
export interface SpatioTemporalGraph {
  nodes: string[];
  spatial_adjacency: number[][]; // Spatial connections
  temporal_length: number;
  node_sequences: Map<string, TemporalSequence>;
  edge_weights: number[][];
}

/**
 * Prediction result for spatio-temporal models
 */
export interface SpatioTemporalPrediction {
  node_predictions: Map<string, number[]>; // Multi-step predictions
  temporal_attention: Map<string, number[]>; // Attention weights over time
  spatial_attention: Map<string, Map<string, number>>; // Spatial attention between nodes
  forecast_horizon: number;
  confidence_intervals: Map<string, Array<[number, number]>>; // [lower, upper] bounds
  explanation: string[];
}

/**
 * Diffusion Convolutional Layer for spatial message passing
 */
export class DiffusionConvolutionalLayer {
  private input_dim: number;
  private output_dim: number;
  private num_hops: number;
  private weights_forward: number[][];
  private weights_backward: number[][];
  private bias: number[];

  constructor(input_dim: number, output_dim: number, num_hops: number = 2) {
    this.input_dim = input_dim;
    this.output_dim = output_dim;
    this.num_hops = num_hops;
    
    // Validate dimensions
    if (this.input_dim <= 0 || this.output_dim <= 0) {
      throw new Error('Input and output dimensions must be positive');
    }
    
    // Initialize weights for forward and backward diffusion (transpose for correct matrix multiplication)
    this.weights_forward = this.initializeWeights(output_dim, input_dim * (num_hops + 1));
    this.weights_backward = this.initializeWeights(output_dim, input_dim * (num_hops + 1));
    this.bias = Array(output_dim).fill(0);
  }

  /**
   * Forward pass through diffusion convolution
   */
  public forward(
    node_features: number[][],
    adjacency_matrix: number[][]
  ): number[][] {
    const num_nodes = node_features.length;
    
    // Compute forward and backward diffusion
    const forward_diffusion = this.computeDiffusion(node_features, adjacency_matrix, true);
    const backward_diffusion = this.computeDiffusion(node_features, adjacency_matrix, false);
    
    // Combine diffusion results
    const output: number[][] = [];
    for (let i = 0; i < num_nodes; i++) {
      const forward_output = this.matrixVectorMultiply(this.weights_forward, forward_diffusion[i]);
      const backward_output = this.matrixVectorMultiply(this.weights_backward, backward_diffusion[i]);
      
      const combined = forward_output.map((val, idx) => 
        val + backward_output[idx] + this.bias[idx]
      );
      
      output.push(combined.map(x => this.relu(x)));
    }
    
    return output;
  }

  /**
   * Compute diffusion process (forward or backward)
   */
  private computeDiffusion(
    node_features: number[][],
    adjacency_matrix: number[][],
    forward: boolean
  ): number[][] {
    const num_nodes = node_features.length;
    const feature_dim = node_features[0].length;
    
    // Normalize adjacency matrix
    const transition_matrix = forward 
      ? this.normalizeAdjacency(adjacency_matrix)
      : this.normalizeAdjacency(this.transposeMatrix(adjacency_matrix));
    
    // Initialize diffusion states
    let current_state = node_features.map(features => [...features]);
    const diffusion_states: number[][][] = [current_state.map(f => [...f])];
    
    // Perform diffusion for num_hops steps
    for (let hop = 0; hop < this.num_hops; hop++) {
      const next_state: number[][] = [];
      
      for (let i = 0; i < num_nodes; i++) {
        const aggregated = Array(feature_dim).fill(0);
        
        for (let j = 0; j < num_nodes; j++) {
          const weight = transition_matrix[i][j];
          for (let k = 0; k < feature_dim; k++) {
            aggregated[k] += weight * current_state[j][k];
          }
        }
        
        next_state.push(aggregated);
      }
      
      current_state = next_state;
      diffusion_states.push(current_state.map(f => [...f]));
    }
    
    // Concatenate all diffusion states
    const concatenated_features: number[][] = [];
    for (let i = 0; i < num_nodes; i++) {
      const node_diffusion: number[] = [];
      for (const state of diffusion_states) {
        node_diffusion.push(...state[i]);
      }
      concatenated_features.push(node_diffusion);
    }
    
    return concatenated_features;
  }

  /**
   * Normalize adjacency matrix for diffusion
   */
  private normalizeAdjacency(adjacency: number[][]): number[][] {
    const num_nodes = adjacency.length;
    const normalized: number[][] = Array(num_nodes)
      .fill(null)
      .map(() => Array(num_nodes).fill(0));
    
    // Compute row sums
    const row_sums = adjacency.map(row => 
      row.reduce((sum, val) => sum + val, 0)
    );
    
    // Normalize rows
    for (let i = 0; i < num_nodes; i++) {
      if (row_sums[i] > 0) {
        for (let j = 0; j < num_nodes; j++) {
          normalized[i][j] = adjacency[i][j] / row_sums[i];
        }
      }
    }
    
    return normalized;
  }

  /**
   * Transpose matrix
   */
  private transposeMatrix(matrix: number[][]): number[][] {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const transposed: number[][] = Array(cols)
      .fill(null)
      .map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        transposed[j][i] = matrix[i][j];
      }
    }
    
    return transposed;
  }

  /**
   * Initialize weight matrix
   */
  private initializeWeights(input_size: number, output_size: number): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (input_size + output_size));
    
    for (let i = 0; i < input_size; i++) {
      const row: number[] = [];
      for (let j = 0; j < output_size; j++) {
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
   * ReLU activation function
   */
  private relu(x: number): number {
    return Math.max(0, x);
  }
}

/**
 * Gated Recurrent Unit (GRU) cell for temporal modeling
 */
export class GRUCell {
  private input_dim: number;
  private hidden_dim: number;
  private weights_update: number[][];
  private weights_reset: number[][];
  private weights_new: number[][];
  private bias_update: number[];
  private bias_reset: number[];
  private bias_new: number[];

  constructor(input_dim: number, hidden_dim: number) {
    this.input_dim = input_dim;
    this.hidden_dim = hidden_dim;
    
    // Validate dimensions
    if (this.input_dim <= 0 || this.hidden_dim <= 0) {
      throw new Error('Input and hidden dimensions must be positive');
    }
    
    // Initialize weights and biases
    this.weights_update = this.initializeWeights(input_dim + hidden_dim, hidden_dim);
    this.weights_reset = this.initializeWeights(input_dim + hidden_dim, hidden_dim);
    this.weights_new = this.initializeWeights(input_dim + hidden_dim, hidden_dim);
    
    this.bias_update = Array(hidden_dim).fill(0);
    this.bias_reset = Array(hidden_dim).fill(0);
    this.bias_new = Array(hidden_dim).fill(0);
  }

  /**
   * Forward pass through GRU cell
   */
  public forward(input: number[], hidden_state: number[]): number[] {
    // Concatenate input and hidden state
    const combined = [...input, ...hidden_state];
    
    // Update gate
    const update_gate = this.matrixVectorMultiply(this.weights_update, combined)
      .map((val, idx) => this.sigmoid(val + this.bias_update[idx]));
    
    // Reset gate
    const reset_gate = this.matrixVectorMultiply(this.weights_reset, combined)
      .map((val, idx) => this.sigmoid(val + this.bias_reset[idx]));
    
    // New gate (candidate hidden state)
    const reset_hidden = hidden_state.map((val, idx) => val * reset_gate[idx]);
    const combined_reset = [...input, ...reset_hidden];
    const new_gate = this.matrixVectorMultiply(this.weights_new, combined_reset)
      .map((val, idx) => this.tanh(val + this.bias_new[idx]));
    
    // Compute new hidden state
    const new_hidden = hidden_state.map((val, idx) => 
      (1 - update_gate[idx]) * val + update_gate[idx] * new_gate[idx]
    );
    
    return new_hidden;
  }

  /**
   * Initialize weight matrix
   */
  private initializeWeights(input_size: number, output_size: number): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (input_size + output_size));
    
    for (let i = 0; i < input_size; i++) {
      const row: number[] = [];
      for (let j = 0; j < output_size; j++) {
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
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  /**
   * Tanh activation function
   */
  private tanh(x: number): number {
    const clipped = Math.max(-500, Math.min(500, x));
    return Math.tanh(clipped);
  }
}

/**
 * Diffusion Convolutional Recurrent Neural Network (DCRNN)
 */
export class DCRNN {
  private input_dim: number;
  private hidden_dim: number;
  private output_dim: number;
  private num_layers: number;
  private diffusion_layers: DiffusionConvolutionalLayer[];
  private gru_cells: GRUCell[][];
  private output_layer: number[][];

  constructor(
    input_dim: number,
    hidden_dim: number,
    output_dim: number,
    num_layers: number = 2,
    num_hops: number = 2
  ) {
    this.input_dim = input_dim;
    this.hidden_dim = hidden_dim;
    this.output_dim = output_dim;
    this.num_layers = num_layers;
    
    // Validate dimensions
    if (this.input_dim <= 0 || this.hidden_dim <= 0 || this.output_dim <= 0) {
      throw new Error('All dimensions must be positive');
    }
    
    // Initialize diffusion layers
    this.diffusion_layers = [];
    for (let i = 0; i < num_layers; i++) {
      const layer_input_dim = i === 0 ? input_dim : hidden_dim;
      this.diffusion_layers.push(
        new DiffusionConvolutionalLayer(layer_input_dim, hidden_dim, num_hops)
      );
    }
    
    // Initialize GRU cells for each layer and node
    this.gru_cells = [];
    for (let i = 0; i < num_layers; i++) {
      this.gru_cells.push([]);
    }
    
    // Initialize output layer (transpose for correct matrix multiplication)
    this.output_layer = this.initializeWeights(output_dim, hidden_dim);
  }

  /**
   * Forward pass through DCRNN
   */
  public forward(
    spatio_temporal_data: SpatioTemporalGraph,
    forecast_steps: number = 1
  ): SpatioTemporalPrediction {
    const num_nodes = spatio_temporal_data.nodes.length;
    const sequence_length = spatio_temporal_data.temporal_length;
    
    // Initialize hidden states for all layers and nodes
    const hidden_states: number[][][] = [];
    for (let layer = 0; layer < this.num_layers; layer++) {
      hidden_states.push([]);
      for (let node = 0; node < num_nodes; node++) {
        hidden_states[layer].push(Array(this.hidden_dim).fill(0));
        
        // Initialize GRU cell for this layer-node combination if not exists
        if (!this.gru_cells[layer][node]) {
          this.gru_cells[layer][node] = new GRUCell(this.hidden_dim, this.hidden_dim);
        }
      }
    }
    
    // Process temporal sequence
    const temporal_outputs: number[][][] = []; // [time][node][feature]
    
    for (let t = 0; t < sequence_length; t++) {
      // Get input features for current time step
      const current_features = this.extractTimeStepFeatures(spatio_temporal_data, t);
      
      // Forward pass through layers
      let layer_input = current_features;
      
      for (let layer = 0; layer < this.num_layers; layer++) {
        // Apply diffusion convolution
        const diffused_features = this.diffusion_layers[layer].forward(
          layer_input,
          spatio_temporal_data.spatial_adjacency
        );
        
        // Apply GRU to each node
        const layer_output: number[][] = [];
        for (let node = 0; node < num_nodes; node++) {
          const new_hidden = this.gru_cells[layer][node].forward(
            diffused_features[node],
            hidden_states[layer][node]
          );
          hidden_states[layer][node] = new_hidden;
          layer_output.push(new_hidden);
        }
        
        layer_input = layer_output;
      }
      
      temporal_outputs.push(layer_input);
    }
    
    // Generate forecasts
    const predictions = this.generateForecasts(
      hidden_states[this.num_layers - 1],
      spatio_temporal_data.spatial_adjacency,
      forecast_steps
    );
    
    // Compute attention weights (simplified)
    const temporal_attention = this.computeTemporalAttention(temporal_outputs);
    const spatial_attention = this.computeSpatialAttention(
      spatio_temporal_data.spatial_adjacency,
      hidden_states[this.num_layers - 1]
    );
    
    return {
      node_predictions: predictions,
      temporal_attention,
      spatial_attention,
      forecast_horizon: forecast_steps,
      confidence_intervals: this.computeConfidenceIntervals(predictions),
      explanation: this.generateExplanation(predictions, temporal_attention, spatial_attention)
    };
  }

  /**
   * Extract features for a specific time step
   */
  private extractTimeStepFeatures(
    graph: SpatioTemporalGraph,
    time_step: number
  ): number[][] {
    const features: number[][] = [];
    
    for (const node_id of graph.nodes) {
      const sequence = graph.node_sequences.get(node_id);
      if (sequence && time_step < sequence.feature_sequences.length) {
        features.push(sequence.feature_sequences[time_step]);
      } else {
        // Pad with zeros if no data available
        features.push(Array(this.input_dim).fill(0));
      }
    }
    
    return features;
  }

  /**
   * Generate multi-step forecasts
   */
  private generateForecasts(
    final_hidden_states: number[][],
    spatial_adjacency: number[][],
    forecast_steps: number
  ): Map<string, number[]> {
    const predictions = new Map<string, number[]>();
    
    // Validate spatial adjacency dimensions
    if (spatial_adjacency.length !== final_hidden_states.length) {
      console.warn('Spatial adjacency matrix size mismatch with hidden states');
    }
    
    for (let node = 0; node < final_hidden_states.length; node++) {
      const node_predictions: number[] = [];
      
      for (let step = 0; step < forecast_steps; step++) {
        // Simple linear projection (in practice, would use more sophisticated decoder)
        const prediction = this.matrixVectorMultiply(
          this.output_layer,
          final_hidden_states[node]
        )[0]; // Assuming single output dimension
        
        node_predictions.push(this.sigmoid(prediction));
      }
      
      predictions.set(`node_${node}`, node_predictions);
    }
    
    return predictions;
  }

  /**
   * Compute temporal attention weights
   */
  private computeTemporalAttention(
    temporal_outputs: number[][][]
  ): Map<string, number[]> {
    const attention = new Map<string, number[]>();
    const sequence_length = temporal_outputs.length;
    
    if (sequence_length === 0) return attention;
    
    const num_nodes = temporal_outputs[0].length;
    
    for (let node = 0; node < num_nodes; node++) {
      // Simple attention based on output magnitude
      const attention_scores: number[] = [];
      
      for (let t = 0; t < sequence_length; t++) {
        const output_magnitude = temporal_outputs[t][node]
          .reduce((sum, val) => sum + Math.abs(val), 0);
        attention_scores.push(output_magnitude);
      }
      
      // Normalize to get attention weights
      const total = attention_scores.reduce((sum, score) => sum + score, 0);
      const normalized = total > 0 
        ? attention_scores.map(score => score / total)
        : Array(sequence_length).fill(1 / sequence_length);
      
      attention.set(`node_${node}`, normalized);
    }
    
    return attention;
  }

  /**
   * Compute spatial attention weights
   */
  private computeSpatialAttention(
    spatial_adjacency: number[][],
    hidden_states: number[][]
  ): Map<string, Map<string, number>> {
    const attention = new Map<string, Map<string, number>>();
    const num_nodes = hidden_states.length;
    
    for (let i = 0; i < num_nodes; i++) {
      const node_attention = new Map<string, number>();
      
      for (let j = 0; j < num_nodes; j++) {
        if (spatial_adjacency[i][j] > 0) {
          // Compute attention based on hidden state similarity
          const similarity = this.computeCosineSimilarity(
            hidden_states[i],
            hidden_states[j]
          );
          node_attention.set(`node_${j}`, similarity * spatial_adjacency[i][j]);
        }
      }
      
      attention.set(`node_${i}`, node_attention);
    }
    
    return attention;
  }

  /**
   * Compute confidence intervals for predictions
   */
  private computeConfidenceIntervals(
    predictions: Map<string, number[]>
  ): Map<string, Array<[number, number]>> {
    const intervals = new Map<string, Array<[number, number]>>();
    
    for (const [node_id, node_predictions] of predictions.entries()) {
      const node_intervals: Array<[number, number]> = [];
      
      for (const prediction of node_predictions) {
        // Simple confidence interval based on prediction uncertainty
        const uncertainty = 0.1; // Simplified - would compute actual uncertainty
        const lower = Math.max(0, prediction - uncertainty);
        const upper = Math.min(1, prediction + uncertainty);
        node_intervals.push([lower, upper]);
      }
      
      intervals.set(node_id, node_intervals);
    }
    
    return intervals;
  }

  /**
   * Generate human-readable explanations
   */
  private generateExplanation(
    predictions: Map<string, number[]>,
    temporal_attention: Map<string, number[]>,
    spatial_attention: Map<string, Map<string, number>>
  ): string[] {
    const explanations: string[] = [];
    
    // Overall risk assessment
    const all_predictions = Array.from(predictions.values()).flat();
    const avg_risk = all_predictions.reduce((sum, pred) => sum + pred, 0) / all_predictions.length;
    
    if (avg_risk > 0.7) {
      explanations.push("HIGH RISK: Spatio-temporal patterns indicate elevated rockfall probability");
    } else if (avg_risk > 0.4) {
      explanations.push("MODERATE RISK: Some concerning temporal trends detected");
    } else {
      explanations.push("LOW RISK: Stable spatio-temporal patterns observed");
    }
    
    // Temporal pattern analysis
    const high_temporal_attention = Array.from(temporal_attention.entries())
      .filter(([_, attention]) => Math.max(...attention) > 0.3)
      .slice(0, 3);
    
    if (high_temporal_attention.length > 0) {
      explanations.push("Recent time periods show increased importance in predictions");
    }
    
    // Spatial correlation analysis
    const strong_spatial_connections = Array.from(spatial_attention.entries())
      .flatMap(([source, targets]) =>
        Array.from(targets.entries()).map(([target, weight]) => ({ source, target, weight }))
      )
      .filter(conn => conn.weight > 0.5)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
    
    if (strong_spatial_connections.length > 0) {
      explanations.push("Strong spatial correlations detected between neighboring sensors");
    }
    
    return explanations;
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private computeCosineSimilarity(vec1: number[], vec2: number[]): number {
    const dot_product = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
    const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    return norm1 > 0 && norm2 > 0 ? dot_product / (norm1 * norm2) : 0;
  }

  /**
   * Initialize weight matrix
   */
  private initializeWeights(input_size: number, output_size: number): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (input_size + output_size));
    
    for (let i = 0; i < input_size; i++) {
      const row: number[] = [];
      for (let j = 0; j < output_size; j++) {
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
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }
}/*
*
 * Graph WaveNet for multi-scale temporal pattern recognition
 */
export class GraphWaveNet {
  private input_dim: number;
  private hidden_dim: number;
  private output_dim: number;
  private num_layers: number;
  private dilation_rates: number[];
  private temporal_conv_layers: TemporalConvolutionalLayer[];
  private spatial_conv_layers: DiffusionConvolutionalLayer[];
  private skip_connections: number[][][]; // Skip connection weights
  private output_layer: number[][];

  constructor(
    input_dim: number,
    hidden_dim: number,
    output_dim: number,
    num_layers: number = 8,
    max_dilation: number = 32
  ) {
    this.input_dim = input_dim;
    this.hidden_dim = hidden_dim;
    this.output_dim = output_dim;
    this.num_layers = num_layers;
    
    // Validate dimensions
    if (this.input_dim <= 0 || this.hidden_dim <= 0 || this.output_dim <= 0) {
      throw new Error('All dimensions must be positive');
    }
    
    // Generate exponentially increasing dilation rates
    this.dilation_rates = [];
    for (let i = 0; i < num_layers; i++) {
      this.dilation_rates.push(Math.min(Math.pow(2, i), max_dilation));
    }
    
    // Initialize temporal convolutional layers
    this.temporal_conv_layers = [];
    for (let i = 0; i < num_layers; i++) {
      this.temporal_conv_layers.push(
        new TemporalConvolutionalLayer(
          i === 0 ? input_dim : hidden_dim,
          hidden_dim,
          2, // kernel_size
          this.dilation_rates[i]
        )
      );
    }
    
    // Initialize spatial convolutional layers
    this.spatial_conv_layers = [];
    for (let i = 0; i < num_layers; i++) {
      this.spatial_conv_layers.push(
        new DiffusionConvolutionalLayer(hidden_dim, hidden_dim, 2)
      );
    }
    
    // Initialize skip connections
    this.skip_connections = [];
    for (let i = 0; i < num_layers; i++) {
      this.skip_connections.push(
        this.initializeWeights(hidden_dim, hidden_dim)
      );
    }
    
    // Initialize output layer (transpose for correct matrix multiplication)
    this.output_layer = this.initializeWeights(output_dim, hidden_dim);
  }

  /**
   * Forward pass through Graph WaveNet
   */
  public forward(
    spatio_temporal_data: SpatioTemporalGraph,
    forecast_steps: number = 1
  ): SpatioTemporalPrediction {
    const num_nodes = spatio_temporal_data.nodes.length;
    const sequence_length = spatio_temporal_data.temporal_length;
    
    // Extract all time step features
    const temporal_features: number[][][] = []; // [time][node][feature]
    for (let t = 0; t < sequence_length; t++) {
      temporal_features.push(this.extractTimeStepFeatures(spatio_temporal_data, t));
    }
    
    // Initialize skip connections accumulator
    let skip_sum: number[][] = Array(num_nodes)
      .fill(null)
      .map(() => Array(this.hidden_dim).fill(0));
    
    // Process through WaveNet layers
    let layer_input = temporal_features;
    
    for (let layer = 0; layer < this.num_layers; layer++) {
      // Apply temporal convolution
      const temporal_output = this.temporal_conv_layers[layer].forward(layer_input);
      
      // Apply spatial convolution to each time step
      const spatio_temporal_output: number[][][] = [];
      for (let t = 0; t < temporal_output.length; t++) {
        const spatial_output = this.spatial_conv_layers[layer].forward(
          temporal_output[t],
          spatio_temporal_data.spatial_adjacency
        );
        spatio_temporal_output.push(spatial_output);
      }
      
      // Add skip connections (use final time step)
      if (spatio_temporal_output.length > 0) {
        const final_output = spatio_temporal_output[spatio_temporal_output.length - 1];
        for (let node = 0; node < num_nodes; node++) {
          const skip_contribution = this.matrixVectorMultiply(
            this.skip_connections[layer],
            final_output[node]
          );
          for (let dim = 0; dim < this.hidden_dim; dim++) {
            skip_sum[node][dim] += skip_contribution[dim];
          }
        }
      }
      
      layer_input = spatio_temporal_output;
    }
    
    // Generate predictions using skip connections
    const predictions = new Map<string, number[]>();
    for (let node = 0; node < num_nodes; node++) {
      const node_predictions: number[] = [];
      
      for (let step = 0; step < forecast_steps; step++) {
        const prediction = this.matrixVectorMultiply(
          this.output_layer,
          skip_sum[node]
        )[0];
        node_predictions.push(this.sigmoid(prediction));
      }
      
      predictions.set(`node_${node}`, node_predictions);
    }
    
    // Compute attention weights
    const temporal_attention = this.computeMultiScaleTemporalAttention(layer_input);
    const spatial_attention = this.computeSpatialAttention(
      spatio_temporal_data.spatial_adjacency,
      skip_sum
    );
    
    return {
      node_predictions: predictions,
      temporal_attention,
      spatial_attention,
      forecast_horizon: forecast_steps,
      confidence_intervals: this.computeConfidenceIntervals(predictions),
      explanation: this.generateWaveNetExplanation(predictions, temporal_attention)
    };
  }

  /**
   * Compute multi-scale temporal attention
   */
  private computeMultiScaleTemporalAttention(
    temporal_outputs: number[][][]
  ): Map<string, number[]> {
    const attention = new Map<string, number[]>();
    
    if (temporal_outputs.length === 0) return attention;
    
    const num_nodes = temporal_outputs[0].length;
    const sequence_length = temporal_outputs.length;
    
    for (let node = 0; node < num_nodes; node++) {
      // Compute attention based on multi-scale patterns
      const attention_scores: number[] = [];
      
      for (let t = 0; t < sequence_length; t++) {
        let scale_weighted_score = 0;
        
        // Weight by different temporal scales
        for (let scale = 0; scale < this.dilation_rates.length; scale++) {
          const dilation = this.dilation_rates[scale];
          if (t >= dilation) {
            const past_output = temporal_outputs[t - dilation][node];
            const current_output = temporal_outputs[t][node];
            
            const similarity = this.computeCosineSimilarity(past_output, current_output);
            scale_weighted_score += similarity / (scale + 1); // Weight by scale importance
          }
        }
        
        attention_scores.push(scale_weighted_score);
      }
      
      // Normalize attention scores
      const total = attention_scores.reduce((sum, score) => sum + Math.abs(score), 0);
      const normalized = total > 0
        ? attention_scores.map(score => Math.abs(score) / total)
        : Array(sequence_length).fill(1 / sequence_length);
      
      attention.set(`node_${node}`, normalized);
    }
    
    return attention;
  }

  /**
   * Generate WaveNet-specific explanations
   */
  private generateWaveNetExplanation(
    predictions: Map<string, number[]>,
    temporal_attention: Map<string, number[]>
  ): string[] {
    const explanations: string[] = [];
    
    // Analyze multi-scale patterns
    const high_attention_periods = Array.from(temporal_attention.values())
      .map(attention => attention.findIndex(val => val === Math.max(...attention)))
      .filter(idx => idx >= 0);
    
    if (high_attention_periods.length > 0) {
      const avg_attention_period = high_attention_periods.reduce((sum, idx) => sum + idx, 0) / high_attention_periods.length;
      explanations.push(`Multi-scale analysis highlights time period ${Math.round(avg_attention_period)} as most significant`);
    }
    
    // Analyze prediction patterns
    const all_predictions = Array.from(predictions.values()).flat();
    const prediction_variance = this.computeVariance(all_predictions);
    
    if (prediction_variance > 0.1) {
      explanations.push("High variability in predictions suggests complex temporal patterns");
    } else {
      explanations.push("Consistent predictions across nodes indicate stable patterns");
    }
    
    return explanations;
  }

  /**
   * Extract features for a specific time step
   */
  private extractTimeStepFeatures(
    graph: SpatioTemporalGraph,
    time_step: number
  ): number[][] {
    const features: number[][] = [];
    
    for (const node_id of graph.nodes) {
      const sequence = graph.node_sequences.get(node_id);
      if (sequence && time_step < sequence.feature_sequences.length) {
        features.push(sequence.feature_sequences[time_step]);
      } else {
        features.push(Array(this.input_dim).fill(0));
      }
    }
    
    return features;
  }

  /**
   * Compute spatial attention weights
   */
  private computeSpatialAttention(
    spatial_adjacency: number[][],
    hidden_states: number[][]
  ): Map<string, Map<string, number>> {
    const attention = new Map<string, Map<string, number>>();
    const num_nodes = hidden_states.length;
    
    for (let i = 0; i < num_nodes; i++) {
      const node_attention = new Map<string, number>();
      
      for (let j = 0; j < num_nodes; j++) {
        if (spatial_adjacency[i][j] > 0) {
          const similarity = this.computeCosineSimilarity(
            hidden_states[i],
            hidden_states[j]
          );
          node_attention.set(`node_${j}`, similarity * spatial_adjacency[i][j]);
        }
      }
      
      attention.set(`node_${i}`, node_attention);
    }
    
    return attention;
  }

  /**
   * Compute confidence intervals
   */
  private computeConfidenceIntervals(
    predictions: Map<string, number[]>
  ): Map<string, Array<[number, number]>> {
    const intervals = new Map<string, Array<[number, number]>>();
    
    for (const [node_id, node_predictions] of predictions.entries()) {
      const node_intervals: Array<[number, number]> = [];
      
      for (const prediction of node_predictions) {
        const uncertainty = 0.15; // Higher uncertainty for complex model
        const lower = Math.max(0, prediction - uncertainty);
        const upper = Math.min(1, prediction + uncertainty);
        node_intervals.push([lower, upper]);
      }
      
      intervals.set(node_id, node_intervals);
    }
    
    return intervals;
  }

  /**
   * Compute variance of an array
   */
  private computeVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  /**
   * Compute cosine similarity
   */
  private computeCosineSimilarity(vec1: number[], vec2: number[]): number {
    const dot_product = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
    const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    return norm1 > 0 && norm2 > 0 ? dot_product / (norm1 * norm2) : 0;
  }

  /**
   * Initialize weight matrix
   */
  private initializeWeights(input_size: number, output_size: number): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (input_size + output_size));
    
    for (let i = 0; i < input_size; i++) {
      const row: number[] = [];
      for (let j = 0; j < output_size; j++) {
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
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }
}

/**
 * Temporal Convolutional Layer with dilated convolutions
 */
export class TemporalConvolutionalLayer {
  private input_dim: number;
  private output_dim: number;
  private kernel_size: number;
  private dilation: number;
  private weights: number[][];
  private bias: number[];

  constructor(
    input_dim: number,
    output_dim: number,
    kernel_size: number = 2,
    dilation: number = 1
  ) {
    this.input_dim = input_dim;
    this.output_dim = output_dim;
    this.kernel_size = kernel_size;
    this.dilation = dilation;
    
    // Validate dimensions
    if (this.input_dim <= 0 || this.output_dim <= 0) {
      throw new Error('Input and output dimensions must be positive');
    }
    
    // Initialize weights for dilated convolution (transpose for correct matrix multiplication)
    this.weights = this.initializeWeights(output_dim, input_dim * kernel_size);
    this.bias = Array(output_dim).fill(0);
  }

  /**
   * Forward pass through temporal convolution
   */
  public forward(temporal_sequence: number[][][]): number[][][] {
    const sequence_length = temporal_sequence.length;
    if (sequence_length === 0) return [];
    
    const num_nodes = temporal_sequence[0].length;
    
    const output: number[][][] = [];
    
    // Apply dilated convolution (ensure we have at least some output)
    const start_time = Math.min(this.kernel_size * this.dilation - 1, sequence_length - 1);
    for (let t = Math.max(0, start_time); t < sequence_length; t++) {
      const time_step_output: number[][] = [];
      
      for (let node = 0; node < num_nodes; node++) {
        // Collect features from dilated kernel positions
        const kernel_features: number[] = [];
        
        for (let k = 0; k < this.kernel_size; k++) {
          const time_idx = t - k * this.dilation;
          if (time_idx >= 0) {
            kernel_features.push(...temporal_sequence[time_idx][node]);
          } else {
            // Pad with zeros for out-of-bounds
            kernel_features.push(...Array(this.input_dim).fill(0));
          }
        }
        
        // Apply convolution
        const conv_output = this.matrixVectorMultiply(this.weights, kernel_features)
          .map((val, idx) => this.relu(val + this.bias[idx]));
        
        time_step_output.push(conv_output);
      }
      
      output.push(time_step_output);
    }
    
    return output;
  }

  /**
   * Initialize weight matrix
   */
  private initializeWeights(input_size: number, output_size: number): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (input_size + output_size));
    
    for (let i = 0; i < input_size; i++) {
      const row: number[] = [];
      for (let j = 0; j < output_size; j++) {
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
   * ReLU activation function
   */
  private relu(x: number): number {
    return Math.max(0, x);
  }
}

/**
 * Temporal Graph Network for long-term forecasting
 */
export class TemporalGraphNetwork {
  private input_dim: number;
  private hidden_dim: number;
  private output_dim: number;
  private num_layers: number;
  private temporal_attention_layers: TemporalAttentionLayer[];
  private graph_conv_layers: DiffusionConvolutionalLayer[];
  private output_layer: number[][];

  constructor(
    input_dim: number,
    hidden_dim: number,
    output_dim: number,
    num_layers: number = 4
  ) {
    this.input_dim = input_dim;
    this.hidden_dim = hidden_dim;
    this.output_dim = output_dim;
    this.num_layers = num_layers;
    
    // Validate dimensions
    if (this.input_dim <= 0 || this.hidden_dim <= 0 || this.output_dim <= 0) {
      throw new Error('All dimensions must be positive');
    }
    
    // Initialize temporal attention layers
    this.temporal_attention_layers = [];
    for (let i = 0; i < num_layers; i++) {
      const layer_input_dim = i === 0 ? input_dim : hidden_dim;
      this.temporal_attention_layers.push(
        new TemporalAttentionLayer(layer_input_dim, hidden_dim)
      );
    }
    
    // Initialize graph convolution layers
    this.graph_conv_layers = [];
    for (let i = 0; i < num_layers; i++) {
      this.graph_conv_layers.push(
        new DiffusionConvolutionalLayer(hidden_dim, hidden_dim, 2)
      );
    }
    
    // Initialize output layer (transpose for correct matrix multiplication)
    this.output_layer = this.initializeWeights(output_dim, hidden_dim);
  }

  /**
   * Forward pass through Temporal Graph Network
   */
  public forward(
    spatio_temporal_data: SpatioTemporalGraph,
    forecast_steps: number = 12 // Long-term forecasting
  ): SpatioTemporalPrediction {
    const num_nodes = spatio_temporal_data.nodes.length;
    const sequence_length = spatio_temporal_data.temporal_length;
    
    // Extract temporal sequences for each node
    const node_sequences: number[][][] = []; // [node][time][feature]
    for (let node = 0; node < num_nodes; node++) {
      const node_sequence: number[][] = [];
      for (let t = 0; t < sequence_length; t++) {
        const features = this.extractTimeStepFeatures(spatio_temporal_data, t);
        node_sequence.push(features[node]);
      }
      node_sequences.push(node_sequence);
    }
    
    // Process through layers
    let layer_input = node_sequences;
    const all_attention_weights: number[][][] = []; // [layer][node][time]
    
    for (let layer = 0; layer < this.num_layers; layer++) {
      // Apply temporal attention
      const { output: temporal_output, attention: attention_weights } = 
        this.temporal_attention_layers[layer].forward(layer_input);
      
      all_attention_weights.push(attention_weights);
      
      // Apply spatial graph convolution
      const spatial_output: number[][][] = [];
      for (let node = 0; node < num_nodes; node++) {
        spatial_output.push([]);
      }
      
      for (let t = 0; t < temporal_output[0].length; t++) {
        const time_step_features = temporal_output.map(node_seq => node_seq[t]);
        const conv_output = this.graph_conv_layers[layer].forward(
          time_step_features,
          spatio_temporal_data.spatial_adjacency
        );
        
        // Update temporal output with spatial convolution results
        for (let node = 0; node < num_nodes; node++) {
          spatial_output[node].push(conv_output[node]);
        }
      }
      
      layer_input = spatial_output;
    }
    
    // Generate long-term forecasts
    const predictions = this.generateLongTermForecasts(
      layer_input,
      spatio_temporal_data.spatial_adjacency,
      forecast_steps
    );
    
    // Compute attention weights
    const temporal_attention = this.aggregateTemporalAttention(all_attention_weights);
    const spatial_attention = this.computeSpatialAttention(
      spatio_temporal_data.spatial_adjacency,
      layer_input.map(seq => seq[seq.length - 1]) // Use final time step
    );
    
    return {
      node_predictions: predictions,
      temporal_attention,
      spatial_attention,
      forecast_horizon: forecast_steps,
      confidence_intervals: this.computeConfidenceIntervals(predictions),
      explanation: this.generateTGNExplanation(predictions, temporal_attention, forecast_steps)
    };
  }

  /**
   * Generate long-term forecasts using autoregressive approach
   */
  private generateLongTermForecasts(
    final_sequences: number[][][],
    spatial_adjacency: number[][],
    forecast_steps: number
  ): Map<string, number[]> {
    const predictions = new Map<string, number[]>();
    const num_nodes = final_sequences.length;
    
    // Use final hidden states as initial conditions
    let current_states = final_sequences.map(seq => seq[seq.length - 1]);
    
    for (let node = 0; node < num_nodes; node++) {
      const node_predictions: number[] = [];
      
      // Generate multi-step predictions
      for (let step = 0; step < forecast_steps; step++) {
        // Apply spatial convolution to current states
        const spatial_output = this.graph_conv_layers[this.num_layers - 1].forward(
          current_states,
          spatial_adjacency
        );
        
        // Generate prediction for this node
        const prediction_vector = safeMatrixVectorMultiply(
          this.output_layer,
          spatial_output[node]
        );
        
        const prediction = prediction_vector.length > 0 ? prediction_vector[0] : 0;
        const prob_prediction = isNaN(prediction) ? 0.5 : this.sigmoid(prediction);
        node_predictions.push(prob_prediction);
        
        // Update current states for next step (simplified autoregressive)
        current_states[node] = spatial_output[node].map(val => val * 0.9); // Decay factor
      }
      
      predictions.set(`node_${node}`, node_predictions);
    }
    
    return predictions;
  }

  /**
   * Aggregate temporal attention across layers
   */
  private aggregateTemporalAttention(
    all_attention_weights: number[][][]
  ): Map<string, number[]> {
    const attention = new Map<string, number[]>();
    
    if (all_attention_weights.length === 0) return attention;
    
    const num_nodes = all_attention_weights[0].length;
    const sequence_length = all_attention_weights[0][0].length;
    
    for (let node = 0; node < num_nodes; node++) {
      const aggregated_attention: number[] = Array(sequence_length).fill(0);
      
      // Average attention across layers
      for (const layer_attention of all_attention_weights) {
        for (let t = 0; t < sequence_length; t++) {
          aggregated_attention[t] += layer_attention[node][t] / all_attention_weights.length;
        }
      }
      
      attention.set(`node_${node}`, aggregated_attention);
    }
    
    return attention;
  }

  /**
   * Generate TGN-specific explanations
   */
  private generateTGNExplanation(
    predictions: Map<string, number[]>,
    temporal_attention: Map<string, number[]>,
    forecast_horizon: number
  ): string[] {
    const explanations: string[] = [];
    
    explanations.push(`Long-term forecast generated for ${forecast_horizon} time steps ahead`);
    
    // Analyze prediction trends
    const prediction_trends = Array.from(predictions.values()).map(pred_seq => {
      if (pred_seq.length < 2) return 0;
      return pred_seq[pred_seq.length - 1] - pred_seq[0]; // Overall trend
    });
    
    const increasing_trends = prediction_trends.filter(trend => trend > 0.1).length;
    const decreasing_trends = prediction_trends.filter(trend => trend < -0.1).length;
    
    if (increasing_trends > decreasing_trends) {
      explanations.push("Long-term trend analysis indicates increasing risk over forecast horizon");
    } else if (decreasing_trends > increasing_trends) {
      explanations.push("Long-term trend analysis indicates decreasing risk over forecast horizon");
    } else {
      explanations.push("Long-term predictions show stable risk levels");
    }
    
    // Analyze temporal attention patterns
    const attention_peaks = Array.from(temporal_attention.values())
      .map(attention => attention.findIndex(val => val === Math.max(...attention)))
      .filter(idx => idx >= 0);
    
    if (attention_peaks.length > 0) {
      const avg_peak = attention_peaks.reduce((sum, idx) => sum + idx, 0) / attention_peaks.length;
      explanations.push(`Historical period ${Math.round(avg_peak)} shows highest influence on long-term predictions`);
    }
    
    return explanations;
  }

  /**
   * Extract features for a specific time step
   */
  private extractTimeStepFeatures(
    graph: SpatioTemporalGraph,
    time_step: number
  ): number[][] {
    const features: number[][] = [];
    
    for (const node_id of graph.nodes) {
      const sequence = graph.node_sequences.get(node_id);
      if (sequence && time_step < sequence.feature_sequences.length) {
        features.push(sequence.feature_sequences[time_step]);
      } else {
        features.push(Array(this.input_dim).fill(0));
      }
    }
    
    return features;
  }

  /**
   * Compute spatial attention weights
   */
  private computeSpatialAttention(
    spatial_adjacency: number[][],
    hidden_states: number[][]
  ): Map<string, Map<string, number>> {
    const attention = new Map<string, Map<string, number>>();
    const num_nodes = hidden_states.length;
    
    for (let i = 0; i < num_nodes; i++) {
      const node_attention = new Map<string, number>();
      
      for (let j = 0; j < num_nodes; j++) {
        if (spatial_adjacency[i][j] > 0) {
          const similarity = this.computeCosineSimilarity(
            hidden_states[i],
            hidden_states[j]
          );
          node_attention.set(`node_${j}`, similarity * spatial_adjacency[i][j]);
        }
      }
      
      attention.set(`node_${i}`, node_attention);
    }
    
    return attention;
  }

  /**
   * Compute confidence intervals
   */
  private computeConfidenceIntervals(
    predictions: Map<string, number[]>
  ): Map<string, Array<[number, number]>> {
    const intervals = new Map<string, Array<[number, number]>>();
    
    for (const [node_id, node_predictions] of predictions.entries()) {
      const node_intervals: Array<[number, number]> = [];
      
      for (let i = 0; i < node_predictions.length; i++) {
        const prediction = node_predictions[i];
        // Uncertainty increases with forecast horizon
        const uncertainty = 0.1 + (i * 0.02); // Increasing uncertainty
        const lower = Math.max(0, prediction - uncertainty);
        const upper = Math.min(1, prediction + uncertainty);
        node_intervals.push([lower, upper]);
      }
      
      intervals.set(node_id, node_intervals);
    }
    
    return intervals;
  }

  /**
   * Compute cosine similarity
   */
  private computeCosineSimilarity(vec1: number[], vec2: number[]): number {
    const dot_product = vec1.reduce((sum, val, idx) => sum + val * vec2[idx], 0);
    const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    
    return norm1 > 0 && norm2 > 0 ? dot_product / (norm1 * norm2) : 0;
  }

  /**
   * Initialize weight matrix
   */
  private initializeWeights(input_size: number, output_size: number): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (input_size + output_size));
    
    for (let i = 0; i < input_size; i++) {
      const row: number[] = [];
      for (let j = 0; j < output_size; j++) {
        row.push((Math.random() * 2 - 1) * limit);
      }
      weights.push(row);
    }
    
    return weights;
  }

  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }
}

/**
 * Temporal Attention Layer for weighting temporal features
 */
export class TemporalAttentionLayer {
  private input_dim: number;
  private hidden_dim: number;
  private query_weights: number[][];
  private key_weights: number[][];
  private value_weights: number[][];
  private output_weights: number[][];

  constructor(input_dim: number, hidden_dim: number) {
    this.input_dim = input_dim;
    this.hidden_dim = hidden_dim;
    
    // Validate dimensions
    if (this.input_dim <= 0 || this.hidden_dim <= 0) {
      throw new Error('Input and hidden dimensions must be positive');
    }
    
    // Initialize attention weights
    this.query_weights = this.initializeWeights(input_dim, hidden_dim);
    this.key_weights = this.initializeWeights(input_dim, hidden_dim);
    this.value_weights = this.initializeWeights(input_dim, hidden_dim);
    this.output_weights = this.initializeWeights(hidden_dim, hidden_dim);
  }

  /**
   * Forward pass through temporal attention
   */
  public forward(
    temporal_sequences: number[][][] // [node][time][feature]
  ): { output: number[][][]; attention: number[][] } {
    const num_nodes = temporal_sequences.length;
    const sequence_length = temporal_sequences[0].length;
    
    const output: number[][][] = [];
    const attention_weights: number[][] = [];
    
    for (let node = 0; node < num_nodes; node++) {
      const node_sequence = temporal_sequences[node];
      
      // Compute queries, keys, and values
      const queries = node_sequence.map(features => 
        this.matrixVectorMultiply(this.query_weights, features)
      );
      const keys = node_sequence.map(features => 
        this.matrixVectorMultiply(this.key_weights, features)
      );
      const values = node_sequence.map(features => 
        this.matrixVectorMultiply(this.value_weights, features)
      );
      
      // Compute attention scores
      const attention_scores: number[] = [];
      for (let t = 0; t < sequence_length; t++) {
        let total_score = 0;
        for (let s = 0; s < sequence_length; s++) {
          const score = this.computeAttentionScore(queries[t], keys[s]);
          total_score += score;
        }
        attention_scores.push(total_score);
      }
      
      // Apply softmax to get attention weights
      const node_attention = this.softmax(attention_scores);
      attention_weights.push(node_attention);
      
      // Apply attention to values
      const attended_sequence: number[][] = [];
      for (let t = 0; t < sequence_length; t++) {
        const attended_features = Array(this.hidden_dim).fill(0);
        
        for (let s = 0; s < sequence_length; s++) {
          const weight = node_attention[s];
          for (let d = 0; d < this.hidden_dim; d++) {
            attended_features[d] += weight * values[s][d];
          }
        }
        
        // Apply output transformation
        const output_features = this.matrixVectorMultiply(
          this.output_weights,
          attended_features
        );
        attended_sequence.push(output_features);
      }
      
      output.push(attended_sequence);
    }
    
    return { output, attention: attention_weights };
  }

  /**
   * Compute attention score between query and key
   */
  private computeAttentionScore(query: number[], key: number[]): number {
    const dot_product = query.reduce((sum, val, idx) => sum + val * key[idx], 0);
    return dot_product / Math.sqrt(this.hidden_dim); // Scaled dot-product attention
  }

  /**
   * Softmax activation function
   */
  private softmax(values: number[]): number[] {
    const max_val = Math.max(...values);
    const exp_values = values.map(v => Math.exp(v - max_val));
    const sum_exp = exp_values.reduce((sum, val) => sum + val, 0);
    
    return exp_values.map(val => sum_exp > 0 ? val / sum_exp : 0);
  }

  /**
   * Initialize weight matrix
   */
  private initializeWeights(input_size: number, output_size: number): number[][] {
    const weights: number[][] = [];
    const limit = Math.sqrt(6 / (input_size + output_size));
    
    for (let i = 0; i < input_size; i++) {
      const row: number[] = [];
      for (let j = 0; j < output_size; j++) {
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
}