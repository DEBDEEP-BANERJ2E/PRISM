import {
  SpatialGraphConstructor,
  GraphAttentionLayer,
  GraphAttentionNetwork,
  GraphFeaturePropagation
} from '../../models/GraphNeuralNetwork';

describe('GraphNeuralNetwork - Simple Tests', () => {
  describe('GraphAttentionLayer', () => {
    it('should create and process basic input', () => {
      const layer = new GraphAttentionLayer(4, 8, 2, 0.1);
      
      const mockNodeFeatures = [
        [1.0, 0.5, 0.2, 0.8],
        [0.3, 1.0, 0.7, 0.4],
        [0.6, 0.2, 1.0, 0.9]
      ];

      const mockAdjacencyMatrix = [
        [1, 1, 0],
        [1, 1, 1],
        [0, 1, 1]
      ];

      const result = layer.forward(mockNodeFeatures, mockAdjacencyMatrix);

      expect(result.output).toBeDefined();
      expect(result.attention).toBeDefined();
      expect(result.output.length).toBe(3);
      expect(result.attention.length).toBe(2); // num_heads
    });

    it('should produce valid attention weights', () => {
      const layer = new GraphAttentionLayer(3, 4, 1, 0.0);
      
      const features = [
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0]
      ];

      const adjacency = [
        [1, 1],
        [1, 1]
      ];

      const result = layer.forward(features, adjacency);

      // Check attention weights sum to 1
      for (const headAttention of result.attention) {
        for (let i = 0; i < headAttention.length; i++) {
          const rowSum = headAttention[i].reduce((sum, weight) => sum + weight, 0);
          expect(rowSum).toBeCloseTo(1.0, 5);
        }
      }
    });
  });

  describe('GraphAttentionNetwork', () => {
    it('should create network and make predictions', () => {
      const network = new GraphAttentionNetwork(
        3,    // input_dim
        [4],  // hidden_dims
        1,    // output_dim
        2,    // num_heads
        0.1   // dropout_rate
      );

      const features = [
        [1.0, 0.5, 0.2],
        [0.3, 1.0, 0.7],
        [0.6, 0.2, 1.0]
      ];

      const adjacency = [
        [1, 1, 0],
        [1, 1, 1],
        [0, 1, 1]
      ];

      const result = network.forward(features, adjacency);

      expect(result.node_predictions.size).toBe(3);
      expect(result.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result.risk_probability).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should handle single node', () => {
      const network = new GraphAttentionNetwork(2, [3], 1, 1, 0.0);
      
      const features = [[1.0, 0.5]];
      const adjacency = [[1]];

      const result = network.forward(features, adjacency);

      expect(result.node_predictions.size).toBe(1);
      expect(result.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result.risk_probability).toBeLessThanOrEqual(1);
    });
  });

  describe('GraphFeaturePropagation', () => {
    it('should propagate features correctly', () => {
      const propagation = new GraphFeaturePropagation(10, 1e-3, 0.5);

      const features = [
        [1.0, 0.0], // Labeled
        [0.0, 1.0], // Labeled
        [0.5, 0.5], // Unlabeled
        [0.3, 0.7]  // Unlabeled
      ];

      const adjacency = [
        [1, 1, 1, 0],
        [1, 1, 0, 1],
        [1, 0, 1, 1],
        [0, 1, 1, 1]
      ];

      const labeledMask = [true, true, false, false];

      const result = propagation.propagateFeatures(features, adjacency, labeledMask);

      expect(result.length).toBe(4);
      expect(result[0]).toEqual(features[0]); // Labeled nodes unchanged
      expect(result[1]).toEqual(features[1]); // Labeled nodes unchanged
      expect(result[2]).not.toEqual(features[2]); // Unlabeled nodes changed
      expect(result[3]).not.toEqual(features[3]); // Unlabeled nodes changed
    });
  });

  describe('SpatialGraphConstructor - Basic', () => {
    it('should create empty graph from empty input', () => {
      const constructor = new SpatialGraphConstructor();
      const graph = constructor.constructGraph([], []);

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
      expect(graph.adjacency_matrix.length).toBe(0);
      expect(graph.node_features.length).toBe(0);
    });

    it('should handle basic graph construction parameters', () => {
      const constructor = new SpatialGraphConstructor({
        spatial_threshold: 1000,
        k_nearest_neighbors: 3,
        include_slope_segments: true,
        include_sensors: true
      });

      expect(constructor).toBeDefined();
    });
  });

  describe('Mathematical Functions', () => {
    it('should compute softmax correctly', () => {
      const layer = new GraphAttentionLayer(2, 2, 1, 0.0);
      
      // Access private method through any cast for testing
      const softmax = (layer as any).softmax([1.0, 2.0, 3.0]);
      
      expect(softmax.length).toBe(3);
      expect(softmax.reduce((sum: number, val: number) => sum + val, 0)).toBeCloseTo(1.0, 5);
      expect(softmax[2]).toBeGreaterThan(softmax[1]);
      expect(softmax[1]).toBeGreaterThan(softmax[0]);
    });

    it('should compute leaky ReLU correctly', () => {
      const layer = new GraphAttentionLayer(2, 2, 1, 0.0);
      
      const leakyReLU = (layer as any).leakyReLU;
      
      expect(leakyReLU(1.0)).toBe(1.0);
      expect(leakyReLU(-1.0)).toBe(-0.2); // alpha = 0.2
      expect(leakyReLU(0.0)).toBe(0.0);
    });

    it('should compute ELU correctly', () => {
      const layer = new GraphAttentionLayer(2, 2, 1, 0.0);
      
      const elu = (layer as any).elu;
      
      expect(elu(1.0)).toBe(1.0);
      expect(elu(0.0)).toBe(0.0);
      expect(elu(-1.0)).toBeCloseTo(-0.632, 2); // 1 * (e^(-1) - 1)
    });
  });

  describe('Matrix Operations', () => {
    it('should perform matrix-vector multiplication', () => {
      const layer = new GraphAttentionLayer(3, 2, 1, 0.0);
      
      const matrix = [
        [1, 2, 3],
        [4, 5, 6]
      ];
      const vector = [1, 2, 3];
      
      const result = (layer as any).matrixVectorMultiply(matrix, vector);
      
      expect(result).toEqual([14, 32]); // [1*1+2*2+3*3, 4*1+5*2+6*3]
    });

    it('should handle empty matrices gracefully', () => {
      const layer = new GraphAttentionLayer(2, 2, 1, 0.0);
      
      const result = (layer as any).matrixVectorMultiply([], []);
      
      expect(result).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle disconnected graph', () => {
      const network = new GraphAttentionNetwork(2, [3], 1, 1, 0.0);
      
      const features = [
        [1.0, 0.0],
        [0.0, 1.0]
      ];

      // Disconnected graph (no edges)
      const adjacency = [
        [1, 0],
        [0, 1]
      ];

      const result = network.forward(features, adjacency);

      expect(result.node_predictions.size).toBe(2);
      expect(result.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result.risk_probability).toBeLessThanOrEqual(1);
    });

    it('should handle uniform features', () => {
      const network = new GraphAttentionNetwork(2, [2], 1, 1, 0.0);
      
      const features = [
        [0.5, 0.5],
        [0.5, 0.5],
        [0.5, 0.5]
      ];

      const adjacency = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ];

      const result = network.forward(features, adjacency);

      expect(result.node_predictions.size).toBe(3);
      // All predictions should be similar for uniform input
      const predictions = Array.from(result.node_predictions.values());
      const variance = predictions.reduce((sum, pred) => 
        sum + Math.pow(pred - result.risk_probability, 2), 0) / predictions.length;
      expect(variance).toBeLessThan(0.1); // Low variance expected
    });
  });
});