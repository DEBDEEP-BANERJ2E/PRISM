import {
  DCRNN,
  GraphWaveNet,
  TemporalGraphNetwork,
  DiffusionConvolutionalLayer,
  GRUCell,
  TemporalConvolutionalLayer,
  TemporalAttentionLayer,
  type SpatioTemporalGraph,
  type TemporalSequence
} from '../../models/SpatioTemporalModels';

describe('SpatioTemporalModels', () => {
  let mockSpatioTemporalGraph: SpatioTemporalGraph;

  beforeEach(() => {
    // Create mock spatio-temporal graph
    const nodes = ['node_0', 'node_1', 'node_2'];
    const spatial_adjacency = [
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 1]
    ];
    
    const node_sequences = new Map<string, TemporalSequence>();
    
    // Create temporal sequences for each node
    for (let i = 0; i < nodes.length; i++) {
      const timestamps = Array.from({ length: 10 }, (_, t) => 
        new Date(Date.now() - (9 - t) * 60000) // 10 time steps, 1 minute apart
      );
      
      const feature_sequences = Array.from({ length: 10 }, (_, t) => [
        Math.sin(t * 0.1 + i), // Temporal pattern
        Math.cos(t * 0.1 + i),
        0.5 + 0.3 * Math.random(), // Random component
        i * 0.1 // Node-specific offset
      ]);
      
      node_sequences.set(nodes[i], {
        node_id: nodes[i],
        timestamps,
        feature_sequences,
        sequence_length: 10
      });
    }
    
    mockSpatioTemporalGraph = {
      nodes,
      spatial_adjacency,
      temporal_length: 10,
      node_sequences,
      edge_weights: spatial_adjacency
    };
  });

  describe('DiffusionConvolutionalLayer', () => {
    it('should create and process spatial features', () => {
      const layer = new DiffusionConvolutionalLayer(4, 8, 2);
      
      const node_features = [
        [1.0, 0.5, 0.2, 0.8],
        [0.3, 1.0, 0.7, 0.4],
        [0.6, 0.2, 1.0, 0.9]
      ];
      
      const adjacency_matrix = [
        [1, 1, 0],
        [1, 1, 1],
        [0, 1, 1]
      ];
      
      const result = layer.forward(node_features, adjacency_matrix);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(3); // Same number of nodes
      expect(result[0].length).toBe(8); // Output dimension
      
      // Check that all outputs are non-negative (ReLU activation)
      for (const node_output of result) {
        for (const value of node_output) {
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should handle single node input', () => {
      const layer = new DiffusionConvolutionalLayer(3, 5, 1);
      
      const node_features = [[1.0, 0.5, 0.2]];
      const adjacency_matrix = [[1]];
      
      const result = layer.forward(node_features, adjacency_matrix);
      
      expect(result.length).toBe(1);
      expect(result[0].length).toBe(5);
    });

    it('should handle disconnected graph', () => {
      const layer = new DiffusionConvolutionalLayer(2, 3, 2);
      
      const node_features = [
        [1.0, 0.0],
        [0.0, 1.0]
      ];
      
      // Disconnected graph
      const adjacency_matrix = [
        [1, 0],
        [0, 1]
      ];
      
      const result = layer.forward(node_features, adjacency_matrix);
      
      expect(result.length).toBe(2);
      expect(result[0].length).toBe(3);
      expect(result[1].length).toBe(3);
    });
  });

  describe('GRUCell', () => {
    it('should process input and hidden state', () => {
      const gru = new GRUCell(4, 6);
      
      const input = [1.0, 0.5, 0.2, 0.8];
      const hidden_state = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
      
      const new_hidden = gru.forward(input, hidden_state);
      
      expect(new_hidden).toBeDefined();
      expect(new_hidden.length).toBe(6);
      
      // Check that hidden state values are bounded
      for (const value of new_hidden) {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('should handle zero input', () => {
      const gru = new GRUCell(3, 4);
      
      const input = [0, 0, 0];
      const hidden_state = [0, 0, 0, 0];
      
      const new_hidden = gru.forward(input, hidden_state);
      
      expect(new_hidden.length).toBe(4);
      expect(new_hidden.every(val => Number.isFinite(val))).toBe(true);
    });

    it('should maintain hidden state dimensions', () => {
      const gru = new GRUCell(5, 8);
      
      const input = [1, 2, 3, 4, 5];
      let hidden_state = Array(8).fill(0);
      
      // Process multiple time steps
      for (let t = 0; t < 5; t++) {
        hidden_state = gru.forward(input, hidden_state);
        expect(hidden_state.length).toBe(8);
      }
    });
  });

  describe('TemporalConvolutionalLayer', () => {
    it('should apply dilated convolution to temporal sequence', () => {
      const layer = new TemporalConvolutionalLayer(4, 6, 2, 1);
      
      const temporal_sequence = [
        [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]], // t=0
        [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1]], // t=1
        [[0, 0, 1, 0], [0, 0, 1, 0], [1, 0, 0, 0]], // t=2
        [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1]]  // t=3
      ];
      
      const result = layer.forward(temporal_sequence);
      
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].length).toBe(3); // Number of nodes
      expect(result[0][0].length).toBe(6); // Output dimension
    });

    it('should handle different dilation rates', () => {
      const layer1 = new TemporalConvolutionalLayer(3, 4, 2, 1);
      const layer2 = new TemporalConvolutionalLayer(3, 4, 2, 2);
      
      const sequence = Array.from({ length: 8 }, (_, t) => [
        [Math.sin(t), Math.cos(t), t * 0.1],
        [Math.cos(t), Math.sin(t), t * 0.2]
      ]);
      
      const result1 = layer1.forward(sequence);
      const result2 = layer2.forward(sequence);
      
      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBeGreaterThan(0);
      
      // Different dilation should produce different results
      expect(result1.length).not.toBe(result2.length);
    });
  });

  describe('TemporalAttentionLayer', () => {
    it('should compute attention weights for temporal sequences', () => {
      const layer = new TemporalAttentionLayer(4, 6);
      
      const temporal_sequences = [
        [ // Node 0
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1]
        ],
        [ // Node 1
          [0.5, 0.5, 0, 0],
          [0, 0.5, 0.5, 0],
          [0, 0, 0.5, 0.5],
          [0.5, 0, 0, 0.5]
        ]
      ];
      
      const { output, attention } = layer.forward(temporal_sequences);
      
      expect(output).toBeDefined();
      expect(attention).toBeDefined();
      expect(output.length).toBe(2); // Number of nodes
      expect(attention.length).toBe(2); // Number of nodes
      
      // Check attention weights sum to 1
      for (const node_attention of attention) {
        const sum = node_attention.reduce((s, w) => s + w, 0);
        expect(sum).toBeCloseTo(1.0, 5);
      }
      
      // Check output dimensions
      expect(output[0].length).toBe(4); // Sequence length
      expect(output[0][0].length).toBe(6); // Hidden dimension
    });

    it('should handle uniform sequences', () => {
      const layer = new TemporalAttentionLayer(2, 3);
      
      const uniform_sequences = [
        [[1, 1], [1, 1], [1, 1]],
        [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5]]
      ];
      
      const { output, attention } = layer.forward(uniform_sequences);
      
      expect(output.length).toBe(2);
      expect(attention.length).toBe(2);
      
      // Uniform sequences should have uniform attention
      for (const node_attention of attention) {
        const expected_weight = 1.0 / node_attention.length;
        for (const weight of node_attention) {
          expect(weight).toBeCloseTo(expected_weight, 2);
        }
      }
    });
  });

  describe('DCRNN', () => {
    it('should create and make predictions', () => {
      const dcrnn = new DCRNN(4, 8, 1, 2, 2);
      
      const result = dcrnn.forward(mockSpatioTemporalGraph, 3);
      
      expect(result).toBeDefined();
      expect(result.node_predictions.size).toBe(3);
      expect(result.temporal_attention.size).toBe(3);
      expect(result.spatial_attention.size).toBe(3);
      expect(result.forecast_horizon).toBe(3);
      expect(result.confidence_intervals.size).toBe(3);
      expect(result.explanation.length).toBeGreaterThan(0);
      
      // Check prediction values are probabilities
      for (const predictions of result.node_predictions.values()) {
        for (const pred of predictions) {
          expect(pred).toBeGreaterThanOrEqual(0);
          expect(pred).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should handle single time step', () => {
      const single_step_graph = {
        ...mockSpatioTemporalGraph,
        temporal_length: 1
      };
      
      // Update sequences to have only one time step
      for (const [node_id, sequence] of single_step_graph.node_sequences.entries()) {
        single_step_graph.node_sequences.set(node_id, {
          ...sequence,
          timestamps: [sequence.timestamps[0]],
          feature_sequences: [sequence.feature_sequences[0]],
          sequence_length: 1
        });
      }
      
      const dcrnn = new DCRNN(4, 6, 1, 1, 1);
      const result = dcrnn.forward(single_step_graph, 1);
      
      expect(result.node_predictions.size).toBe(3);
      expect(result.forecast_horizon).toBe(1);
    });

    it('should produce consistent results for same input', () => {
      const dcrnn = new DCRNN(4, 6, 1, 2, 1);
      
      const result1 = dcrnn.forward(mockSpatioTemporalGraph, 2);
      const result2 = dcrnn.forward(mockSpatioTemporalGraph, 2);
      
      // Results should be deterministic (same random seed)
      expect(result1.node_predictions.size).toBe(result2.node_predictions.size);
      expect(result1.forecast_horizon).toBe(result2.forecast_horizon);
    });
  });

  describe('GraphWaveNet', () => {
    it('should create and make multi-scale predictions', () => {
      const wavenet = new GraphWaveNet(4, 8, 1, 4, 8);
      
      const result = wavenet.forward(mockSpatioTemporalGraph, 2);
      
      expect(result).toBeDefined();
      expect(result.node_predictions.size).toBe(3);
      expect(result.temporal_attention.size).toBe(3);
      expect(result.spatial_attention.size).toBe(3);
      expect(result.forecast_horizon).toBe(2);
      expect(result.explanation.length).toBeGreaterThan(0);
      
      // Check predictions are valid probabilities
      for (const predictions of result.node_predictions.values()) {
        for (const pred of predictions) {
          expect(pred).toBeGreaterThanOrEqual(0);
          expect(pred).toBeLessThanOrEqual(1);
        }
      }
    });

    it('should handle different dilation patterns', () => {
      const wavenet1 = new GraphWaveNet(4, 6, 1, 3, 4);
      const wavenet2 = new GraphWaveNet(4, 6, 1, 3, 16);
      
      const result1 = wavenet1.forward(mockSpatioTemporalGraph, 1);
      const result2 = wavenet2.forward(mockSpatioTemporalGraph, 1);
      
      expect(result1.node_predictions.size).toBe(3);
      expect(result2.node_predictions.size).toBe(3);
      
      // Different max dilation should potentially produce different results
      expect(result1.explanation).toBeDefined();
      expect(result2.explanation).toBeDefined();
    });

    it('should generate meaningful explanations', () => {
      const wavenet = new GraphWaveNet(4, 8, 1, 6, 16);
      
      const result = wavenet.forward(mockSpatioTemporalGraph, 3);
      
      expect(result.explanation.length).toBeGreaterThan(0);
      expect(result.explanation.some(exp => exp.includes('Multi-scale') || exp.includes('predictions'))).toBe(true);
    });
  });

  describe('TemporalGraphNetwork', () => {
    it('should create and make long-term predictions', () => {
      const tgn = new TemporalGraphNetwork(4, 8, 1, 3);
      
      const result = tgn.forward(mockSpatioTemporalGraph, 12);
      
      expect(result).toBeDefined();
      expect(result.node_predictions.size).toBe(3);
      expect(result.temporal_attention.size).toBe(3);
      expect(result.spatial_attention.size).toBe(3);
      expect(result.forecast_horizon).toBe(12);
      expect(result.explanation.length).toBeGreaterThan(0);
      
      // Check long-term predictions
      for (const predictions of result.node_predictions.values()) {
        expect(predictions.length).toBe(12);
        for (const pred of predictions) {
          expect(pred).toBeGreaterThanOrEqual(0);
          expect(pred).toBeLessThanOrEqual(1);
        }
      }
      
      // Check confidence intervals increase with forecast horizon
      for (const intervals of result.confidence_intervals.values()) {
        expect(intervals.length).toBe(12);
        
        // Later intervals should generally be wider (higher uncertainty)
        const early_width = intervals[0][1] - intervals[0][0];
        const late_width = intervals[11][1] - intervals[11][0];
        expect(late_width).toBeGreaterThanOrEqual(early_width);
      }
    });

    it('should handle short sequences', () => {
      const short_graph = {
        ...mockSpatioTemporalGraph,
        temporal_length: 3
      };
      
      // Update sequences to have only 3 time steps
      for (const [node_id, sequence] of short_graph.node_sequences.entries()) {
        short_graph.node_sequences.set(node_id, {
          ...sequence,
          timestamps: sequence.timestamps.slice(0, 3),
          feature_sequences: sequence.feature_sequences.slice(0, 3),
          sequence_length: 3
        });
      }
      
      const tgn = new TemporalGraphNetwork(4, 6, 1, 2);
      const result = tgn.forward(short_graph, 5);
      
      expect(result.node_predictions.size).toBe(3);
      expect(result.forecast_horizon).toBe(5);
    });

    it('should generate long-term explanations', () => {
      const tgn = new TemporalGraphNetwork(4, 8, 1, 4);
      
      const result = tgn.forward(mockSpatioTemporalGraph, 24);
      
      expect(result.explanation.length).toBeGreaterThan(0);
      expect(result.explanation.some(exp => exp.includes('Long-term'))).toBe(true);
      expect(result.explanation.some(exp => exp.includes('24 time steps'))).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should work with realistic spatio-temporal data', () => {
      // Create more realistic data with trends and patterns
      const realistic_graph = { ...mockSpatioTemporalGraph };
      
      // Add realistic temporal patterns
      for (const [node_id, sequence] of realistic_graph.node_sequences.entries()) {
        const node_index = parseInt(node_id.split('_')[1]);
        const new_sequences: number[][] = [];
        
        for (let t = 0; t < 20; t++) {
          // Add trend, seasonality, and noise
          const trend = t * 0.01;
          const seasonal = 0.1 * Math.sin(2 * Math.PI * t / 10);
          const noise = 0.05 * (Math.random() - 0.5);
          const base_value = 0.5 + trend + seasonal + noise;
          
          new_sequences.push([
            base_value,
            base_value * 0.8 + 0.1 * Math.random(),
            0.3 + 0.2 * Math.sin(t * 0.2 + node_index),
            node_index * 0.1 + 0.05 * Math.random()
          ]);
        }
        
        realistic_graph.node_sequences.set(node_id, {
          ...sequence,
          feature_sequences: new_sequences,
          sequence_length: 20,
          timestamps: Array.from({ length: 20 }, (_, t) => 
            new Date(Date.now() - (19 - t) * 300000) // 5-minute intervals
          )
        });
      }
      
      realistic_graph.temporal_length = 20;
      
      // Test all models with realistic data
      const dcrnn = new DCRNN(4, 16, 1, 3, 2);
      const wavenet = new GraphWaveNet(4, 16, 1, 8, 32);
      const tgn = new TemporalGraphNetwork(4, 16, 1, 4);
      
      const dcrnn_result = dcrnn.forward(realistic_graph, 6);
      const wavenet_result = wavenet.forward(realistic_graph, 6);
      const tgn_result = tgn.forward(realistic_graph, 12);
      
      // All models should produce valid results
      expect(dcrnn_result.node_predictions.size).toBe(3);
      expect(wavenet_result.node_predictions.size).toBe(3);
      expect(tgn_result.node_predictions.size).toBe(3);
      
      // Check that models produce different predictions (they use different architectures)
      const dcrnn_pred = Array.from(dcrnn_result.node_predictions.values())[0][0];
      const wavenet_pred = Array.from(wavenet_result.node_predictions.values())[0][0];
      const tgn_pred = Array.from(tgn_result.node_predictions.values())[0][0];
      
      // Predictions should be valid probabilities
      expect(dcrnn_pred).toBeGreaterThanOrEqual(0);
      expect(dcrnn_pred).toBeLessThanOrEqual(1);
      expect(wavenet_pred).toBeGreaterThanOrEqual(0);
      expect(wavenet_pred).toBeLessThanOrEqual(1);
      expect(tgn_pred).toBeGreaterThanOrEqual(0);
      expect(tgn_pred).toBeLessThanOrEqual(1);
    });

    it('should handle edge cases gracefully', () => {
      // Test with minimal graph
      const minimal_graph: SpatioTemporalGraph = {
        nodes: ['single_node'],
        spatial_adjacency: [[1]],
        temporal_length: 2,
        node_sequences: new Map([
          ['single_node', {
            node_id: 'single_node',
            timestamps: [new Date(), new Date(Date.now() + 60000)],
            feature_sequences: [[1, 0, 0, 0], [0, 1, 0, 0]],
            sequence_length: 2
          }]
        ]),
        edge_weights: [[1]]
      };
      
      const dcrnn = new DCRNN(4, 4, 1, 1, 1);
      const result = dcrnn.forward(minimal_graph, 1);
      
      expect(result.node_predictions.size).toBe(1);
      expect(result.node_predictions.get('node_0')).toBeDefined();
    });

    it('should maintain performance with larger graphs', () => {
      // Create larger graph for performance testing
      const large_nodes = Array.from({ length: 10 }, (_, i) => `node_${i}`);
      const large_adjacency = Array(10).fill(null).map((_, i) =>
        Array(10).fill(null).map((_, j) => 
          Math.abs(i - j) <= 2 ? 1 : 0 // Connect nodes within distance 2
        )
      );
      
      const large_sequences = new Map<string, TemporalSequence>();
      for (let i = 0; i < 10; i++) {
        large_sequences.set(`node_${i}`, {
          node_id: `node_${i}`,
          timestamps: Array.from({ length: 15 }, (_, t) => new Date(Date.now() - (14 - t) * 60000)),
          feature_sequences: Array.from({ length: 15 }, (_, t) => [
            Math.sin(t * 0.1 + i * 0.2),
            Math.cos(t * 0.1 + i * 0.2),
            0.5 + 0.3 * Math.random(),
            i * 0.05
          ]),
          sequence_length: 15
        });
      }
      
      const large_graph: SpatioTemporalGraph = {
        nodes: large_nodes,
        spatial_adjacency: large_adjacency,
        temporal_length: 15,
        node_sequences: large_sequences,
        edge_weights: large_adjacency
      };
      
      const start_time = Date.now();
      
      const dcrnn = new DCRNN(4, 8, 1, 2, 2);
      const result = dcrnn.forward(large_graph, 3);
      
      const end_time = Date.now();
      const processing_time = end_time - start_time;
      
      expect(result.node_predictions.size).toBe(10);
      expect(processing_time).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});