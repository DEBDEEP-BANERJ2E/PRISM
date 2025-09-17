import { SpatialLocation } from '../../../../shared/models/src/spatial/SpatialLocation';
import { SlopeSegment } from '../../../../shared/models/src/spatial/SlopeSegment';
import { SensorReading } from '../../../../shared/models/src/sensor/SensorReading';

/**
 * Graph node representing either a sensor or slope segment
 */
export interface GraphNode {
  id: string;
  type: 'sensor' | 'slope_segment';
  location: SpatialLocation;
  features: number[];
  metadata: Record<string, any>;
}

/**
 * Graph edge representing spatial or functional relationships
 */
export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  edge_type: 'spatial' | 'geological' | 'hydrological' | 'structural';
  distance?: number;
  attributes: Record<string, any>;
}

/**
 * Graph structure for spatial sensor networks
 */
export interface SpatialGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  adjacency_matrix: number[][];
  node_features: number[][];
  edge_features: number[][];
}

/**
 * Graph construction parameters
 */
export interface GraphConstructionParams {
  spatial_threshold: number; // Maximum distance for spatial connections (meters)
  geological_similarity_threshold: number; // Threshold for geological connections
  k_nearest_neighbors: number; // Number of nearest neighbors to connect
  include_slope_segments: boolean;
  include_sensors: boolean;
  edge_weight_decay: number; // Distance decay factor for edge weights
}

/**
 * Graph Neural Network prediction result
 */
export interface GNNPredictionResult {
  node_predictions: Map<string, number>;
  node_embeddings: Map<string, number[]>;
  attention_weights: Map<string, Map<string, number>>;
  risk_probability: number;
  confidence: number;
  explanation: string[];
}

/**
 * Graph construction utility for spatial sensor networks
 */
export class SpatialGraphConstructor {
  private params: GraphConstructionParams;

  constructor(params: Partial<GraphConstructionParams> = {}) {
    this.params = {
      spatial_threshold: 500, // 500 meters default
      geological_similarity_threshold: 0.7,
      k_nearest_neighbors: 5,
      include_slope_segments: true,
      include_sensors: true,
      edge_weight_decay: 0.1,
      ...params
    };
  }

  /**
   * Construct spatial graph from sensors and slope segments
   */
  public constructGraph(
    sensors: SensorReading[],
    slopeSegments: SlopeSegment[]
  ): SpatialGraph {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();

    // Add sensor nodes
    if (this.params.include_sensors) {
      for (const sensor of sensors) {
        if (sensor.location) {
          const node: GraphNode = {
            id: sensor.sensor_id,
            type: 'sensor',
            location: sensor.location,
            features: this.extractSensorFeatures(sensor),
            metadata: {
              sensor_type: sensor.sensor_type,
              battery_level: sensor.battery_level,
              quality_score: sensor.getQualityScore(),
              timestamp: sensor.timestamp
            }
          };
          nodes.set(sensor.sensor_id, node);
        }
      }
    }

    // Add slope segment nodes
    if (this.params.include_slope_segments) {
      for (const segment of slopeSegments) {
        if (segment.centroid) {
          const node: GraphNode = {
            id: segment.id,
            type: 'slope_segment',
            location: segment.centroid,
            features: this.extractSlopeFeatures(segment),
            metadata: {
              rock_type: segment.rock_type,
              stability_rating: segment.stability_rating,
              slope_angle: segment.slope_angle,
              area: segment.area
            }
          };
          nodes.set(segment.id, node);
        }
      }
    }

    // Construct edges
    this.constructEdges(nodes, edges);

    // Build adjacency matrix and feature matrices
    const { adjacency_matrix, node_features, edge_features } = 
      this.buildMatrices(nodes, edges);

    return {
      nodes,
      edges,
      adjacency_matrix,
      node_features,
      edge_features
    };
  }

  /**
   * Extract features from sensor readings
   */
  private extractSensorFeatures(sensor: SensorReading): number[] {
    const features: number[] = [];

    // Basic sensor features
    features.push(sensor.battery_level || 0);
    features.push(sensor.signal_strength || -100);
    features.push(sensor.getQualityScore());
    features.push(sensor.temperature || 20);

    // Measurement features
    const measurements = Object.values(sensor.measurements);
    for (let i = 0; i < 10; i++) { // Pad to 10 measurements
      if (i < measurements.length) {
        features.push(measurements[i].value);
      } else {
        features.push(0);
      }
    }

    // Temporal features
    features.push(sensor.getAge() / 1000); // Age in seconds
    features.push(sensor.timestamp.getHours()); // Hour of day
    features.push(sensor.timestamp.getDay()); // Day of week

    // Location features
    if (sensor.location) {
      features.push(sensor.location.elevation);
      features.push(sensor.location.latitude);
      features.push(sensor.location.longitude);
    } else {
      features.push(0, 0, 0);
    }

    return features;
  }

  /**
   * Extract features from slope segments
   */
  private extractSlopeFeatures(segment: SlopeSegment): number[] {
    const features: number[] = [];

    // Geometric features
    features.push(segment.slope_angle);
    features.push(segment.aspect);
    features.push(segment.curvature);
    features.push(segment.area || 0);
    features.push(segment.perimeter || 0);
    features.push(segment.height || 0);

    // Rock properties
    features.push(this.encodeRockType(segment.rock_type));
    features.push(this.encodeStabilityRating(segment.stability_rating));
    features.push(segment.rqd || 50); // Default RQD
    features.push(segment.ucs || 50); // Default UCS
    features.push(segment.discontinuity_spacing || 1);

    // Joint orientation features
    const dominantJoint = segment.getDominantJointOrientation();
    if (dominantJoint) {
      features.push(dominantJoint.dip);
      features.push(dominantJoint.dip_direction);
      features.push(dominantJoint.strike);
      features.push(dominantJoint.persistence || 0.5);
    } else {
      features.push(0, 0, 0, 0);
    }

    // Stability factor
    features.push(segment.calculateStabilityFactor());

    // Location features
    if (segment.centroid) {
      features.push(segment.centroid.elevation);
      features.push(segment.centroid.latitude);
      features.push(segment.centroid.longitude);
    } else {
      features.push(0, 0, 0);
    }

    return features;
  }

  /**
   * Construct edges between nodes based on spatial and geological relationships
   */
  private constructEdges(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>
  ): void {
    const nodeArray = Array.from(nodes.values());

    for (let i = 0; i < nodeArray.length; i++) {
      const nodeA = nodeArray[i];
      const neighbors: Array<{ node: GraphNode; distance: number }> = [];

      // Find potential neighbors
      for (let j = i + 1; j < nodeArray.length; j++) {
        const nodeB = nodeArray[j];
        const distance = nodeA.location.distanceTo(nodeB.location);

        if (distance <= this.params.spatial_threshold) {
          neighbors.push({ node: nodeB, distance });
        }
      }

      // Sort by distance and take k nearest neighbors
      neighbors.sort((a, b) => a.distance - b.distance);
      const kNearest = neighbors.slice(0, this.params.k_nearest_neighbors);

      // Create edges
      for (const neighbor of kNearest) {
        const edgeId = `${nodeA.id}-${neighbor.node.id}`;
        const weight = this.calculateEdgeWeight(nodeA, neighbor.node, neighbor.distance);
        const edgeType = this.determineEdgeType(nodeA, neighbor.node);

        const edge: GraphEdge = {
          source: nodeA.id,
          target: neighbor.node.id,
          weight,
          edge_type: edgeType,
          distance: neighbor.distance,
          attributes: {
            spatial_similarity: this.calculateSpatialSimilarity(nodeA, neighbor.node),
            geological_similarity: this.calculateGeologicalSimilarity(nodeA, neighbor.node)
          }
        };

        edges.set(edgeId, edge);
      }
    }
  }

  /**
   * Calculate edge weight based on distance and node properties
   */
  private calculateEdgeWeight(
    nodeA: GraphNode,
    nodeB: GraphNode,
    distance: number
  ): number {
    // Distance-based weight with exponential decay
    const spatialWeight = Math.exp(-this.params.edge_weight_decay * distance / 100);

    // Type-based weight adjustment
    let typeWeight = 1.0;
    if (nodeA.type === nodeB.type) {
      typeWeight = 1.2; // Same type nodes have stronger connections
    } else {
      typeWeight = 0.8; // Different type nodes have weaker connections
    }

    // Geological similarity weight
    const geologicalWeight = this.calculateGeologicalSimilarity(nodeA, nodeB);

    return spatialWeight * typeWeight * geologicalWeight;
  }

  /**
   * Determine edge type based on node properties
   */
  private determineEdgeType(nodeA: GraphNode, nodeB: GraphNode): GraphEdge['edge_type'] {
    if (nodeA.type === 'sensor' && nodeB.type === 'sensor') {
      return 'spatial';
    } else if (nodeA.type === 'slope_segment' && nodeB.type === 'slope_segment') {
      return 'geological';
    } else {
      return 'structural'; // Sensor to slope segment
    }
  }

  /**
   * Calculate spatial similarity between nodes
   */
  private calculateSpatialSimilarity(nodeA: GraphNode, nodeB: GraphNode): number {
    const elevationDiff = Math.abs(nodeA.location.elevation - nodeB.location.elevation);
    const maxElevationDiff = 100; // meters
    return Math.max(0, 1 - elevationDiff / maxElevationDiff);
  }

  /**
   * Calculate geological similarity between nodes
   */
  private calculateGeologicalSimilarity(nodeA: GraphNode, nodeB: GraphNode): number {
    if (nodeA.type !== 'slope_segment' || nodeB.type !== 'slope_segment') {
      return 0.5; // Default similarity for non-geological nodes
    }

    const rockTypeA = nodeA.metadata.rock_type;
    const rockTypeB = nodeB.metadata.rock_type;
    
    if (rockTypeA === rockTypeB) {
      return 1.0;
    } else {
      // Simple geological similarity based on rock type groups
      const similarRockGroups = [
        ['granite', 'gneiss', 'quartzite'],
        ['limestone', 'dolomite', 'marble'],
        ['sandstone', 'conglomerate', 'breccia'],
        ['shale', 'slate', 'schist']
      ];

      for (const group of similarRockGroups) {
        if (group.includes(rockTypeA) && group.includes(rockTypeB)) {
          return 0.7;
        }
      }

      return 0.3; // Different rock types
    }
  }

  /**
   * Build adjacency matrix and feature matrices
   */
  private buildMatrices(
    nodes: Map<string, GraphNode>,
    edges: Map<string, GraphEdge>
  ): {
    adjacency_matrix: number[][];
    node_features: number[][];
    edge_features: number[][];
  } {
    const nodeArray = Array.from(nodes.values());
    const n = nodeArray.length;

    // Initialize adjacency matrix
    const adjacency_matrix = Array(n).fill(null).map(() => Array(n).fill(0));

    // Node ID to index mapping
    const nodeIdToIndex = new Map<string, number>();
    nodeArray.forEach((node, index) => {
      nodeIdToIndex.set(node.id, index);
    });

    // Fill adjacency matrix
    for (const edge of edges.values()) {
      const sourceIndex = nodeIdToIndex.get(edge.source);
      const targetIndex = nodeIdToIndex.get(edge.target);
      
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        adjacency_matrix[sourceIndex][targetIndex] = edge.weight;
        adjacency_matrix[targetIndex][sourceIndex] = edge.weight; // Undirected graph
      }
    }

    // Build node features matrix
    const node_features = nodeArray.map(node => node.features);

    // Build edge features matrix (simplified)
    const edge_features: number[][] = [];
    for (const edge of edges.values()) {
      edge_features.push([
        edge.weight,
        edge.distance || 0,
        edge.attributes.spatial_similarity || 0,
        edge.attributes.geological_similarity || 0
      ]);
    }

    return { adjacency_matrix, node_features, edge_features };
  }

  /**
   * Encode rock type as numerical value
   */
  private encodeRockType(rockType: string): number {
    const rockTypeMap: Record<string, number> = {
      'granite': 1, 'basalt': 2, 'limestone': 3, 'sandstone': 4,
      'shale': 5, 'quartzite': 6, 'gneiss': 7, 'schist': 8,
      'slate': 9, 'marble': 10, 'dolomite': 11, 'conglomerate': 12,
      'breccia': 13, 'tuff': 14, 'andesite': 15, 'rhyolite': 16,
      'other': 0
    };
    return rockTypeMap[rockType] || 0;
  }

  /**
   * Encode stability rating as numerical value
   */
  private encodeStabilityRating(rating: string): number {
    const ratingMap: Record<string, number> = {
      'very_poor': 1,
      'poor': 2,
      'fair': 3,
      'good': 4,
      'very_good': 5
    };
    return ratingMap[rating] || 3;
  }
}
/**

 * Graph Attention Network (GAT) layer implementation
 */
export class GraphAttentionLayer {
  private input_dim: number;
  private output_dim: number;
  private num_heads: number;
  private dropout_rate: number;
  private weights: number[][][]; // [head][input_dim][output_dim]
  private attention_weights: number[][];

  constructor(
    input_dim: number,
    output_dim: number,
    num_heads: number = 8,
    dropout_rate: number = 0.1
  ) {
    this.input_dim = input_dim;
    this.output_dim = output_dim;
    this.num_heads = num_heads;
    this.dropout_rate = dropout_rate;

    // Initialize weights randomly (in practice, would use proper initialization)
    this.weights = this.initializeWeights();
    this.attention_weights = this.initializeAttentionWeights();
    
    // Note: dropout_rate is used conceptually but not implemented in this simplified version
    if (this.dropout_rate > 0) {
      // Dropout would be applied during training
    }
  }

  /**
   * Forward pass through GAT layer
   */
  public forward(
    node_features: number[][],
    adjacency_matrix: number[][]
  ): { output: number[][]; attention: number[][][] } {
    const head_outputs: number[][][] = [];
    const head_attentions: number[][][] = [];

    // Process each attention head
    for (let head = 0; head < this.num_heads; head++) {
      const { output, attention } = this.processAttentionHead(
        node_features,
        adjacency_matrix,
        head
      );
      head_outputs.push(output);
      head_attentions.push(attention);
    }

    // Concatenate or average head outputs
    const final_output = this.combineHeadOutputs(head_outputs);
    
    return {
      output: final_output,
      attention: head_attentions
    };
  }

  /**
   * Process single attention head
   */
  private processAttentionHead(
    node_features: number[][],
    adjacency_matrix: number[][],
    head_index: number
  ): { output: number[][]; attention: number[][] } {
    
    // Linear transformation for each node
    const transformed_features = node_features.map(features =>
      this.matrixVectorMultiply(this.weights[head_index], features)
    );

    // Compute attention coefficients
    const attention_matrix = this.computeAttentionCoefficients(
      transformed_features,
      adjacency_matrix,
      head_index
    );

    // Apply attention to aggregate neighbor features
    const output = this.aggregateWithAttention(
      transformed_features,
      attention_matrix
    );

    return { output, attention: attention_matrix };
  }

  /**
   * Compute attention coefficients between nodes
   */
  private computeAttentionCoefficients(
    transformed_features: number[][],
    adjacency_matrix: number[][],
    head_index: number
  ): number[][] {
    const attention_matrix: number[][] = Array(transformed_features.length)
      .fill(null)
      .map(() => Array(transformed_features.length).fill(0));

    for (let i = 0; i < transformed_features.length; i++) {
      const attention_scores: number[] = [];
      
      for (let j = 0; j < transformed_features.length; j++) {
        if (adjacency_matrix[i][j] > 0 || i === j) {
          // Compute attention score using concatenated features
          const concat_features = [
            ...transformed_features[i],
            ...transformed_features[j]
          ];
          
          const attention_score = this.computeAttentionScore(
            concat_features,
            head_index
          );
          attention_scores.push(attention_score);
        } else {
          attention_scores.push(-Infinity); // Mask non-connected nodes
        }
      }

      // Apply softmax to get attention weights
      const softmax_weights = this.softmax(attention_scores);
      for (let j = 0; j < transformed_features.length; j++) {
        attention_matrix[i][j] = softmax_weights[j];
      }
    }

    return attention_matrix;
  }

  /**
   * Compute attention score for a pair of nodes
   */
  private computeAttentionScore(features: number[], head_index: number): number {
    // Simple linear attention mechanism
    let score = 0;
    for (let i = 0; i < features.length && i < this.attention_weights[head_index].length; i++) {
      score += features[i] * this.attention_weights[head_index][i];
    }
    return this.leakyReLU(score);
  }

  /**
   * Aggregate neighbor features using attention weights
   */
  private aggregateWithAttention(
    transformed_features: number[][],
    attention_matrix: number[][]
  ): number[][] {
    const output: number[][] = [];

    for (let i = 0; i < transformed_features.length; i++) {
      const aggregated_features = Array(this.output_dim).fill(0);
      
      for (let j = 0; j < transformed_features.length; j++) {
        const attention_weight = attention_matrix[i][j];
        
        for (let k = 0; k < this.output_dim; k++) {
          aggregated_features[k] += attention_weight * transformed_features[j][k];
        }
      }

      // Apply activation function
      output.push(aggregated_features.map(x => this.elu(x)));
    }

    return output;
  }

  /**
   * Combine outputs from multiple attention heads
   */
  private combineHeadOutputs(head_outputs: number[][][]): number[][] {
    const num_nodes = head_outputs[0].length;
    const combined_output: number[][] = [];

    for (let i = 0; i < num_nodes; i++) {
      const combined_features: number[] = [];
      
      // Concatenate features from all heads
      for (const head_output of head_outputs) {
        combined_features.push(...head_output[i]);
      }
      
      combined_output.push(combined_features);
    }

    return combined_output;
  }

  /**
   * Initialize weight matrices
   */
  private initializeWeights(): number[][][] {
    const weights: number[][][] = [];
    
    for (let head = 0; head < this.num_heads; head++) {
      const head_weights: number[][] = [];
      
      for (let i = 0; i < this.input_dim; i++) {
        const row: number[] = [];
        for (let j = 0; j < this.output_dim; j++) {
          // Xavier initialization
          const limit = Math.sqrt(6 / (this.input_dim + this.output_dim));
          row.push((Math.random() * 2 - 1) * limit);
        }
        head_weights.push(row);
      }
      
      weights.push(head_weights);
    }

    return weights;
  }

  /**
   * Initialize attention weight vectors
   */
  private initializeAttentionWeights(): number[][] {
    const attention_weights: number[][] = [];
    
    for (let head = 0; head < this.num_heads; head++) {
      const head_attention: number[] = [];
      const attention_dim = this.output_dim * 2; // Concatenated features
      
      for (let i = 0; i < attention_dim; i++) {
        head_attention.push((Math.random() * 2 - 1) * 0.1);
      }
      
      attention_weights.push(head_attention);
    }

    return attention_weights;
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
   * Softmax activation function
   */
  private softmax(values: number[]): number[] {
    const max_val = Math.max(...values.filter(v => v !== -Infinity));
    const exp_values = values.map(v => v === -Infinity ? 0 : Math.exp(v - max_val));
    const sum_exp = exp_values.reduce((sum, val) => sum + val, 0);
    
    return exp_values.map(val => sum_exp > 0 ? val / sum_exp : 0);
  }

  /**
   * Leaky ReLU activation function
   */
  private leakyReLU(x: number, alpha: number = 0.2): number {
    return x > 0 ? x : alpha * x;
  }

  /**
   * ELU activation function
   */
  private elu(x: number, alpha: number = 1.0): number {
    return x > 0 ? x : alpha * (Math.exp(x) - 1);
  }
}

/**
 * Multi-layer Graph Attention Network
 */
export class GraphAttentionNetwork {
  private layers: GraphAttentionLayer[];
  private output_layer: GraphAttentionLayer;
  private dropout_rate: number;

  constructor(
    input_dim: number,
    hidden_dims: number[],
    output_dim: number,
    num_heads: number = 8,
    dropout_rate: number = 0.1
  ) {
    this.dropout_rate = dropout_rate;
    this.layers = [];

    // Create hidden layers
    let current_dim = input_dim;
    for (const hidden_dim of hidden_dims) {
      this.layers.push(new GraphAttentionLayer(
        current_dim,
        hidden_dim,
        num_heads,
        dropout_rate
      ));
      current_dim = hidden_dim * num_heads; // Concatenated heads
    }

    // Create output layer (single head for final prediction)
    this.output_layer = new GraphAttentionLayer(
      current_dim,
      output_dim,
      1, // Single head for output
      dropout_rate
    );
  }

  /**
   * Forward pass through the entire network
   */
  public forward(
    node_features: number[][],
    adjacency_matrix: number[][]
  ): GNNPredictionResult {
    let current_features = node_features;
    const all_attentions: number[][][][] = [];

    // Pass through hidden layers
    for (const layer of this.layers) {
      const { output, attention } = layer.forward(current_features, adjacency_matrix);
      current_features = this.applyDropout(output);
      all_attentions.push(attention);
    }

    // Pass through output layer
    const { output: final_output, attention: final_attention } = 
      this.output_layer.forward(current_features, adjacency_matrix);
    all_attentions.push(final_attention);

    // Generate predictions and explanations
    return this.generatePredictions(
      final_output,
      all_attentions
    );
  }

  /**
   * Generate final predictions and explanations
   */
  private generatePredictions(
    node_outputs: number[][],
    all_attentions: number[][][][]
  ): GNNPredictionResult {
    const node_predictions = new Map<string, number>();
    const node_embeddings = new Map<string, number[]>();
    const attention_weights = new Map<string, Map<string, number>>();

    // Process each node
    for (let i = 0; i < node_outputs.length; i++) {
      const node_id = `node_${i}`;
      
      // Node prediction (sigmoid activation for probability)
      const prediction = this.sigmoid(node_outputs[i][0]);
      node_predictions.set(node_id, prediction);
      
      // Node embedding
      node_embeddings.set(node_id, [...node_outputs[i]]);
      
      // Attention weights from final layer
      const node_attention = new Map<string, number>();
      const final_attention = all_attentions[all_attentions.length - 1][0]; // First head of final layer
      
      for (let j = 0; j < final_attention[i].length; j++) {
        if (final_attention[i][j] > 0.01) { // Only significant attention weights
          node_attention.set(`node_${j}`, final_attention[i][j]);
        }
      }
      
      attention_weights.set(node_id, node_attention);
    }

    // Calculate overall risk probability
    const predictions_array = Array.from(node_predictions.values());
    const risk_probability = predictions_array.reduce((sum, pred) => sum + pred, 0) / predictions_array.length;
    
    // Calculate confidence based on prediction variance
    const variance = predictions_array.reduce((sum, pred) => 
      sum + Math.pow(pred - risk_probability, 2), 0) / predictions_array.length;
    const confidence = Math.max(0, 1 - Math.sqrt(variance));

    // Generate explanations
    const explanation = this.generateExplanation(
      node_predictions,
      attention_weights,
      risk_probability
    );

    return {
      node_predictions,
      node_embeddings,
      attention_weights,
      risk_probability,
      confidence,
      explanation
    };
  }

  /**
   * Generate human-readable explanations
   */
  private generateExplanation(
    node_predictions: Map<string, number>,
    attention_weights: Map<string, Map<string, number>>,
    overall_risk: number
  ): string[] {
    const explanations: string[] = [];

    // Overall risk assessment
    if (overall_risk > 0.7) {
      explanations.push("HIGH RISK: Multiple indicators suggest elevated rockfall probability");
    } else if (overall_risk > 0.4) {
      explanations.push("MODERATE RISK: Some concerning patterns detected in sensor network");
    } else {
      explanations.push("LOW RISK: Sensor network indicates stable conditions");
    }

    // Identify high-risk nodes
    const high_risk_nodes = Array.from(node_predictions.entries())
      .filter(([_, prediction]) => prediction > 0.6)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3);

    if (high_risk_nodes.length > 0) {
      explanations.push(`Critical nodes identified: ${high_risk_nodes.map(([id, _]) => id).join(', ')}`);
    }

    // Attention-based explanations
    const strong_connections = Array.from(attention_weights.entries())
      .flatMap(([source, targets]) =>
        Array.from(targets.entries()).map(([target, weight]) => ({ source, target, weight }))
      )
      .filter(conn => conn.weight > 0.3)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    if (strong_connections.length > 0) {
      explanations.push("Strong spatial correlations detected between: " +
        strong_connections.map(conn => `${conn.source}-${conn.target}`).join(', '));
    }

    return explanations;
  }

  /**
   * Apply dropout to features
   */
  private applyDropout(features: number[][]): number[][] {
    if (this.dropout_rate === 0) return features;
    
    return features.map(node_features =>
      node_features.map(feature =>
        Math.random() > this.dropout_rate ? feature / (1 - this.dropout_rate) : 0
      )
    );
  }

  /**
   * Sigmoid activation function
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}

/**
 * Graph-based feature propagation algorithm
 */
export class GraphFeaturePropagation {
  private max_iterations: number;
  private convergence_threshold: number;
  private alpha: number; // Propagation strength

  constructor(
    max_iterations: number = 100,
    convergence_threshold: number = 1e-6,
    alpha: number = 0.1
  ) {
    this.max_iterations = max_iterations;
    this.convergence_threshold = convergence_threshold;
    this.alpha = alpha;
  }

  /**
   * Propagate features through the graph using iterative algorithm
   */
  public propagateFeatures(
    initial_features: number[][],
    adjacency_matrix: number[][],
    labeled_mask: boolean[]
  ): number[][] {
    const num_nodes = initial_features.length;
    const feature_dim = initial_features[0].length;
    
    // Initialize propagated features
    let current_features = initial_features.map(features => [...features]);
    let previous_features = initial_features.map(features => [...features]);

    // Normalize adjacency matrix
    const normalized_adjacency = this.normalizeAdjacencyMatrix(adjacency_matrix);

    // Iterative propagation
    for (let iter = 0; iter < this.max_iterations; iter++) {
      // Propagate features
      for (let i = 0; i < num_nodes; i++) {
        if (!labeled_mask[i]) { // Only update unlabeled nodes
          for (let d = 0; d < feature_dim; d++) {
            let propagated_value = 0;
            
            // Aggregate from neighbors
            for (let j = 0; j < initial_features.length; j++) {
              propagated_value += normalized_adjacency[i][j] * previous_features[j][d];
            }
            
            // Update with propagation
            current_features[i][d] = (1 - this.alpha) * initial_features[i][d] + 
                                   this.alpha * propagated_value;
          }
        }
      }

      // Check convergence
      const max_change = this.calculateMaxChange(current_features, previous_features);
      if (max_change < this.convergence_threshold) {
        break;
      }

      // Update for next iteration
      previous_features = current_features.map(features => [...features]);
    }

    return current_features;
  }

  /**
   * Normalize adjacency matrix using symmetric normalization
   */
  private normalizeAdjacencyMatrix(adjacency_matrix: number[][]): number[][] {
    const num_nodes = adjacency_matrix.length;
    const degrees = adjacency_matrix.map(row => 
      Math.sqrt(row.reduce((sum, val) => sum + val, 0))
    );

    const normalized: number[][] = Array(num_nodes)
      .fill(null)
      .map(() => Array(num_nodes).fill(0));

    for (let i = 0; i < adjacency_matrix.length; i++) {
      for (let j = 0; j < adjacency_matrix.length; j++) {
        if (degrees[i] > 0 && degrees[j] > 0) {
          normalized[i][j] = adjacency_matrix[i][j] / (degrees[i] * degrees[j]);
        }
      }
    }

    return normalized;
  }

  /**
   * Calculate maximum change between feature matrices
   */
  private calculateMaxChange(current: number[][], previous: number[][]): number {
    let max_change = 0;
    
    for (let i = 0; i < current.length; i++) {
      for (let j = 0; j < current[i].length; j++) {
        const change = Math.abs(current[i][j] - previous[i][j]);
        max_change = Math.max(max_change, change);
      }
    }

    return max_change;
  }
}