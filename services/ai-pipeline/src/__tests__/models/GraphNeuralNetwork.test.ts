import {
  SpatialGraphConstructor,
  GraphAttentionLayer,
  GraphAttentionNetwork,
  GraphFeaturePropagation
} from '../../models/GraphNeuralNetwork';
import { SlopeSegment } from '../../../../../shared/models/src/spatial/SlopeSegment';
import { SensorReading } from '../../../../../shared/models/src/sensor/SensorReading';

describe.skip('SpatialGraphConstructor', () => {
  let constructor: SpatialGraphConstructor;
  let mockSensors: SensorReading[];
  let mockSlopeSegments: SlopeSegment[];

  beforeEach(() => {
    constructor = new SpatialGraphConstructor({
      spatial_threshold: 1000,
      k_nearest_neighbors: 3,
      include_slope_segments: true,
      include_sensors: true
    });

    // Create mock sensor readings
    mockSensors = [
      new SensorReading({
        sensor_id: 'sensor_1',
        timestamp: new Date(),
        location: {
          latitude: 45.0,
          longitude: -120.0,
          elevation: 1000
        },
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 0.5, unit: 'degrees' },
          tilt_y: { value: 0.3, unit: 'degrees' }
        },
        battery_level: 85,
        signal_strength: -70
      }),
      new SensorReading({
        sensor_id: 'sensor_2',
        timestamp: new Date(),
        location: {
          latitude: 45.001,
          longitude: -120.001,
          elevation: 1010
        },
        sensor_type: 'accelerometer',
        measurements: {
          accel_x: { value: 0.1, unit: 'm/s²' },
          accel_y: { value: 0.2, unit: 'm/s²' },
          accel_z: { value: 9.8, unit: 'm/s²' }
        },
        battery_level: 92,
        signal_strength: -65
      }),
      new SensorReading({
        sensor_id: 'sensor_3',
        timestamp: new Date(),
        location: {
          latitude: 45.002,
          longitude: -120.002,
          elevation: 1020
        },
        sensor_type: 'piezometer',
        measurements: {
          pressure: { value: 150, unit: 'kPa' }
        },
        battery_level: 78,
        signal_strength: -75
      })
    ];

    // Create mock slope segments
    mockSlopeSegments = [
      new SlopeSegment({
        id: 'segment_1',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-120.0, 45.0, 1000],
            [-120.001, 45.0, 1000],
            [-120.001, 45.001, 1010],
            [-120.0, 45.001, 1010],
            [-120.0, 45.0, 1000]
          ]]
        },
        slope_angle: 45,
        aspect: 180,
        curvature: 0.1,
        rock_type: 'granite',
        joint_orientations: [{
          dip: 60,
          dip_direction: 170,
          strike: 80
        }],
        stability_rating: 'good',
        rqd: 75,
        ucs: 120
      }),
      new SlopeSegment({
        id: 'segment_2',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-120.001, 45.001, 1010],
            [-120.002, 45.001, 1010],
            [-120.002, 45.002, 1020],
            [-120.001, 45.002, 1020],
            [-120.001, 45.001, 1010]
          ]]
        },
        slope_angle: 50,
        aspect: 185,
        curvature: 0.2,
        rock_type: 'granite',
        joint_orientations: [{
          dip: 65,
          dip_direction: 175,
          strike: 85
        }],
        stability_rating: 'fair',
        rqd: 65,
        ucs: 100
      })
    ];
  });

  describe('constructGraph', () => {
    it('should construct a spatial graph with sensors and slope segments', () => {
      const graph = constructor.constructGraph(mockSensors, mockSlopeSegments);

      expect(graph.nodes.size).toBe(5); // 3 sensors + 2 slope segments
      expect(graph.edges.size).toBeGreaterThan(0);
      expect(graph.adjacency_matrix.length).toBe(5);
      expect(graph.node_features.length).toBe(5);
    });

    it('should create nodes with correct types and features', () => {
      const graph = constructor.constructGraph(mockSensors, mockSlopeSegments);

      // Check sensor nodes
      const sensorNode = graph.nodes.get('sensor_1');
      expect(sensorNode).toBeDefined();
      expect(sensorNode!.type).toBe('sensor');
      expect(sensorNode!.features.length).toBeGreaterThan(0);
      expect(sensorNode!.metadata.sensor_type).toBe('tilt');

      // Check slope segment nodes
      const segmentNode = graph.nodes.get('segment_1');
      expect(segmentNode).toBeDefined();
      expect(segmentNode!.type).toBe('slope_segment');
      expect(segmentNode!.features.length).toBeGreaterThan(0);
      expect(segmentNode!.metadata.rock_type).toBe('granite');
    });

    it('should create edges with appropriate weights', () => {
      const graph = constructor.constructGraph(mockSensors, mockSlopeSegments);

      const edges = Array.from(graph.edges.values());
      expect(edges.length).toBeGreaterThan(0);

      // Check edge properties
      const edge = edges[0];
      expect(edge.weight).toBeGreaterThan(0);
      expect(edge.weight).toBeLessThanOrEqual(1);
      expect(['spatial', 'geological', 'structural']).toContain(edge.edge_type);
      expect(edge.distance).toBeGreaterThan(0);
    });

    it('should respect spatial threshold constraints', () => {
      const restrictiveConstructor = new SpatialGraphConstructor({
        spatial_threshold: 50, // Very small threshold
        k_nearest_neighbors: 3
      });

      const graph = restrictiveConstructor.constructGraph(mockSensors, mockSlopeSegments);
      
      // Should have fewer edges due to restrictive threshold
      expect(graph.edges.size).toBeLessThan(10);
    });

    it('should handle empty input gracefully', () => {
      const graph = constructor.constructGraph([], []);

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
      expect(graph.adjacency_matrix.length).toBe(0);
      expect(graph.node_features.length).toBe(0);
    });
  });

  describe('feature extraction', () => {
    it('should extract sensor features correctly', () => {
      const graph = constructor.constructGraph([mockSensors[0]], []);
      const sensorNode = graph.nodes.get('sensor_1');

      expect(sensorNode).toBeDefined();
      expect(sensorNode!.features).toContain(85); // battery_level
      expect(sensorNode!.features).toContain(-70); // signal_strength
      expect(sensorNode!.features).toContain(1000); // elevation
    });

    it('should extract slope segment features correctly', () => {
      const graph = constructor.constructGraph([], [mockSlopeSegments[0]]);
      const segmentNode = graph.nodes.get('segment_1');

      expect(segmentNode).toBeDefined();
      expect(segmentNode!.features).toContain(45); // slope_angle
      expect(segmentNode!.features).toContain(180); // aspect
      expect(segmentNode!.features).toContain(75); // rqd
      expect(segmentNode!.features).toContain(120); // ucs
    });
  });
});

describe('GraphAttentionLayer', () => {
  let layer: GraphAttentionLayer;
  let mockNodeFeatures: number[][];
  let mockAdjacencyMatrix: number[][];

  beforeEach(() => {
    layer = new GraphAttentionLayer(4, 8, 2, 0.1);

    mockNodeFeatures = [
      [1.0, 0.5, 0.2, 0.8],
      [0.3, 1.0, 0.7, 0.4],
      [0.6, 0.2, 1.0, 0.9],
      [0.8, 0.9, 0.1, 1.0]
    ];

    mockAdjacencyMatrix = [
      [1, 1, 0, 1],
      [1, 1, 1, 0],
      [0, 1, 1, 1],
      [1, 0, 1, 1]
    ];
  });

  describe('forward', () => {
    it('should process input through attention mechanism', () => {
      const result = layer.forward(mockNodeFeatures, mockAdjacencyMatrix);

      expect(result.output).toBeDefined();
      expect(result.attention).toBeDefined();
      expect(result.output.length).toBe(4); // Same number of nodes
      expect(result.output[0].length).toBe(16); // 8 features * 2 heads
      expect(result.attention.length).toBe(2); // Number of heads
    });

    it('should produce attention weights that sum to 1', () => {
      const result = layer.forward(mockNodeFeatures, mockAdjacencyMatrix);

      for (const headAttention of result.attention) {
        for (let i = 0; i < headAttention.length; i++) {
          const rowSum = headAttention[i].reduce((sum, weight) => sum + weight, 0);
          expect(rowSum).toBeCloseTo(1.0, 5);
        }
      }
    });

    it('should respect adjacency matrix constraints', () => {
      const result = layer.forward(mockNodeFeatures, mockAdjacencyMatrix);

      for (const headAttention of result.attention) {
        for (let i = 0; i < headAttention.length; i++) {
          for (let j = 0; j < headAttention[i].length; j++) {
            if (mockAdjacencyMatrix[i][j] === 0 && i !== j) {
              expect(headAttention[i][j]).toBeCloseTo(0, 5);
            }
          }
        }
      }
    });

    it('should handle single node input', () => {
      const singleNodeFeatures = [[1.0, 0.5, 0.2, 0.8]];
      const singleNodeAdjacency = [[1]];

      const result = layer.forward(singleNodeFeatures, singleNodeAdjacency);

      expect(result.output.length).toBe(1);
      expect(result.attention[0][0][0]).toBeCloseTo(1.0, 5);
    });
  });
});

describe('GraphAttentionNetwork', () => {
  let network: GraphAttentionNetwork;
  let mockNodeFeatures: number[][];
  let mockAdjacencyMatrix: number[][];

  beforeEach(() => {
    network = new GraphAttentionNetwork(
      4,    // input_dim
      [8],  // hidden_dims
      1,    // output_dim
      2,    // num_heads
      0.1   // dropout_rate
    );

    mockNodeFeatures = [
      [1.0, 0.5, 0.2, 0.8],
      [0.3, 1.0, 0.7, 0.4],
      [0.6, 0.2, 1.0, 0.9],
      [0.8, 0.9, 0.1, 1.0]
    ];

    mockAdjacencyMatrix = [
      [1, 1, 0, 1],
      [1, 1, 1, 0],
      [0, 1, 1, 1],
      [1, 0, 1, 1]
    ];
  });

  describe('forward', () => {
    it('should produce valid prediction results', () => {
      const result = network.forward(mockNodeFeatures, mockAdjacencyMatrix);

      expect(result.node_predictions.size).toBe(4);
      expect(result.node_embeddings.size).toBe(4);
      expect(result.attention_weights.size).toBe(4);
      expect(result.risk_probability).toBeGreaterThanOrEqual(0);
      expect(result.risk_probability).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should produce predictions in valid probability range', () => {
      const result = network.forward(mockNodeFeatures, mockAdjacencyMatrix);

      for (const prediction of result.node_predictions.values()) {
        expect(prediction).toBeGreaterThanOrEqual(0);
        expect(prediction).toBeLessThanOrEqual(1);
      }
    });

    it('should generate meaningful explanations', () => {
      const result = network.forward(mockNodeFeatures, mockAdjacencyMatrix);

      expect(result.explanation.length).toBeGreaterThan(0);
      expect(result.explanation[0]).toMatch(/RISK:/);
    });

    it('should handle different risk levels appropriately', () => {
      // Test with high-risk features (all values close to 1)
      const highRiskFeatures = [
        [1.0, 1.0, 1.0, 1.0],
        [0.9, 0.9, 0.9, 0.9],
        [0.8, 0.8, 0.8, 0.8],
        [1.0, 1.0, 1.0, 1.0]
      ];

      const highRiskResult = network.forward(highRiskFeatures, mockAdjacencyMatrix);

      // Test with low-risk features (all values close to 0)
      const lowRiskFeatures = [
        [0.1, 0.1, 0.1, 0.1],
        [0.0, 0.0, 0.0, 0.0],
        [0.2, 0.2, 0.2, 0.2],
        [0.1, 0.1, 0.1, 0.1]
      ];

      const lowRiskResult = network.forward(lowRiskFeatures, mockAdjacencyMatrix);

      // High risk should generally produce higher predictions
      expect(highRiskResult.risk_probability).toBeGreaterThanOrEqual(lowRiskResult.risk_probability);
    });
  });
});

describe('GraphFeaturePropagation', () => {
  let propagation: GraphFeaturePropagation;
  let mockFeatures: number[][];
  let mockAdjacencyMatrix: number[][];
  let mockLabeledMask: boolean[];

  beforeEach(() => {
    propagation = new GraphFeaturePropagation(50, 1e-4, 0.2);

    mockFeatures = [
      [1.0, 0.0], // Labeled
      [0.0, 1.0], // Labeled
      [0.5, 0.5], // Unlabeled
      [0.3, 0.7]  // Unlabeled
    ];

    mockAdjacencyMatrix = [
      [1, 1, 1, 0],
      [1, 1, 0, 1],
      [1, 0, 1, 1],
      [0, 1, 1, 1]
    ];

    mockLabeledMask = [true, true, false, false];
  });

  describe('propagateFeatures', () => {
    it('should propagate features through the graph', () => {
      const result = propagation.propagateFeatures(
        mockFeatures,
        mockAdjacencyMatrix,
        mockLabeledMask
      );

      expect(result.length).toBe(4);
      expect(result[0].length).toBe(2);

      // Labeled nodes should remain unchanged
      expect(result[0]).toEqual(mockFeatures[0]);
      expect(result[1]).toEqual(mockFeatures[1]);

      // Unlabeled nodes should be influenced by neighbors
      expect(result[2]).not.toEqual(mockFeatures[2]);
      expect(result[3]).not.toEqual(mockFeatures[3]);
    });

    it('should converge to stable solution', () => {
      const result1 = propagation.propagateFeatures(
        mockFeatures,
        mockAdjacencyMatrix,
        mockLabeledMask
      );

      const result2 = propagation.propagateFeatures(
        result1,
        mockAdjacencyMatrix,
        mockLabeledMask
      );

      // Results should be very similar after convergence
      for (let i = 0; i < result1.length; i++) {
        for (let j = 0; j < result1[i].length; j++) {
          expect(Math.abs(result1[i][j] - result2[i][j])).toBeLessThan(0.01);
        }
      }
    });

    it('should handle disconnected components', () => {
      const disconnectedAdjacency = [
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 1, 1],
        [0, 0, 1, 1]
      ];

      const result = propagation.propagateFeatures(
        mockFeatures,
        disconnectedAdjacency,
        mockLabeledMask
      );

      expect(result.length).toBe(4);
      // Should still produce valid results
      for (const nodeFeatures of result) {
        for (const feature of nodeFeatures) {
          expect(Number.isFinite(feature)).toBe(true);
        }
      }
    });

    it('should preserve labeled node values', () => {
      const result = propagation.propagateFeatures(
        mockFeatures,
        mockAdjacencyMatrix,
        mockLabeledMask
      );

      // Labeled nodes should remain exactly the same
      expect(result[0]).toEqual(mockFeatures[0]);
      expect(result[1]).toEqual(mockFeatures[1]);
    });
  });
});

describe('Integration Tests', () => {
  it('should work end-to-end from graph construction to prediction', () => {
    // Create test data
    const sensors = [
      new SensorReading({
        sensor_id: 'test_sensor_1',
        timestamp: new Date(),
        location: { latitude: 45.0, longitude: -120.0, elevation: 1000 },
        sensor_type: 'tilt',
        measurements: { tilt_x: { value: 0.5, unit: 'degrees' } },
        battery_level: 85
      }),
      new SensorReading({
        sensor_id: 'test_sensor_2',
        timestamp: new Date(),
        location: { latitude: 45.001, longitude: -120.001, elevation: 1010 },
        sensor_type: 'accelerometer',
        measurements: { accel_x: { value: 0.1, unit: 'm/s²' } },
        battery_level: 90
      })
    ];

    const segments = [
      new SlopeSegment({
        id: 'test_segment_1',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-120.0, 45.0, 1000],
            [-120.001, 45.0, 1000],
            [-120.001, 45.001, 1010],
            [-120.0, 45.001, 1010],
            [-120.0, 45.0, 1000]
          ]]
        },
        slope_angle: 45,
        aspect: 180,
        curvature: 0.1,
        rock_type: 'granite',
        joint_orientations: [{ dip: 60, dip_direction: 170, strike: 80 }],
        stability_rating: 'good'
      })
    ];

    // Construct graph
    const constructor = new SpatialGraphConstructor();
    const graph = constructor.constructGraph(sensors, segments);

    // Create and run GNN
    const network = new GraphAttentionNetwork(
      graph.node_features[0].length,
      [16, 8],
      1,
      4,
      0.1
    );

    const result = network.forward(graph.node_features, graph.adjacency_matrix);

    // Verify results
    expect(result.node_predictions.size).toBe(3); // 2 sensors + 1 segment
    expect(result.risk_probability).toBeGreaterThanOrEqual(0);
    expect(result.risk_probability).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('should handle large graphs efficiently', () => {
    // Create larger test dataset
    const sensors: SensorReading[] = [];
    const segments: SlopeSegment[] = [];

    // Generate 20 sensors
    for (let i = 0; i < 20; i++) {
      sensors.push(new SensorReading({
        sensor_id: `sensor_${i}`,
        timestamp: new Date(),
        location: {
          latitude: 45.0 + i * 0.001,
          longitude: -120.0 + i * 0.001,
          elevation: 1000 + i * 10
        },
        sensor_type: 'tilt',
        measurements: { tilt_x: { value: Math.random(), unit: 'degrees' } },
        battery_level: 80 + Math.random() * 20
      }));
    }

    // Generate 10 slope segments
    for (let i = 0; i < 10; i++) {
      const lat = 45.0 + i * 0.002;
      const lon = -120.0 + i * 0.002;
      const elev = 1000 + i * 20;

      segments.push(new SlopeSegment({
        id: `segment_${i}`,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lon, lat, elev],
            [lon + 0.001, lat, elev],
            [lon + 0.001, lat + 0.001, elev + 10],
            [lon, lat + 0.001, elev + 10],
            [lon, lat, elev]
          ]]
        },
        slope_angle: 40 + Math.random() * 20,
        aspect: Math.random() * 360,
        curvature: Math.random() * 0.5,
        rock_type: 'granite',
        joint_orientations: [{ dip: 60, dip_direction: 170, strike: 80 }],
        stability_rating: 'good'
      }));
    }

    const startTime = Date.now();

    // Construct graph
    const constructor = new SpatialGraphConstructor({
      k_nearest_neighbors: 5,
      spatial_threshold: 2000
    });
    const graph = constructor.constructGraph(sensors, segments);

    // Run GNN
    const network = new GraphAttentionNetwork(
      graph.node_features[0].length,
      [32, 16],
      1,
      4,
      0.1
    );

    const result = network.forward(graph.node_features, graph.adjacency_matrix);

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Should complete within reasonable time (less than 5 seconds)
    expect(processingTime).toBeLessThan(5000);
    expect(result.node_predictions.size).toBe(30); // 20 sensors + 10 segments
  });
});