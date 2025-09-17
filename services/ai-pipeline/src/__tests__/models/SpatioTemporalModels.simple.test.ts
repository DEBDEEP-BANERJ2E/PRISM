import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import {
  DiffusionConvolutionalLayer,
  GRUCell,
  TemporalConvolutionalLayer
} from '../../models/SpatioTemporalModels';

describe('SpatioTemporalModels - Simple Tests', () => {
  describe('DiffusionConvolutionalLayer', () => {
    it('should create and process basic input', () => {
      const layer = new DiffusionConvolutionalLayer(4, 8, 2);

      const node_features = [
        [1.0, 0.5, 0.2, 0.8],
        [0.3, 1.0, 0.7, 0.4]
      ];

      const adjacency_matrix = [
        [1, 1],
        [1, 1]
      ];

      const result = layer.forward(node_features, adjacency_matrix);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].length).toBe(8); // Output dimension

      // All outputs should be non-negative (ReLU)
      for (const node_output of result) {
        for (const value of node_output) {
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('GRUCell', () => {
    it('should process basic input', () => {
      const gru = new GRUCell(3, 4);

      const input = [1.0, 0.5, 0.2];
      const hidden_state = [0.1, 0.2, 0.3, 0.4];

      const new_hidden = gru.forward(input, hidden_state);

      expect(new_hidden).toBeDefined();
      expect(new_hidden.length).toBe(4);

      // Values should be finite
      for (const value of new_hidden) {
        expect(Number.isFinite(value)).toBe(true);
      }
    });
  });

  describe('TemporalConvolutionalLayer', () => {
    it('should handle basic temporal sequence', () => {
      const layer = new TemporalConvolutionalLayer(3, 4, 2, 1);

      const temporal_sequence = [
        [[1, 0, 0], [0, 1, 0]], // t=0
        [[0, 1, 0], [1, 0, 0]], // t=1
        [[0, 0, 1], [0, 0, 1]]  // t=2
      ];

      const result = layer.forward(temporal_sequence);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      if (result.length > 0) {
        expect(result[0].length).toBe(2); // Number of nodes
        expect(result[0][0].length).toBe(4); // Output dimension
      }
    });

    it('should handle empty sequence', () => {
      const layer = new TemporalConvolutionalLayer(3, 4, 2, 1);

      const empty_sequence: number[][][] = [];

      const result = layer.forward(empty_sequence);

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });
});