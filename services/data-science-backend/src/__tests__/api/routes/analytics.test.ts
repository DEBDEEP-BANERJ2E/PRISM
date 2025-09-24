import request from 'supertest';
import express from 'express';
import { modelRoutes } from '../../../api/routes/models';
import { errorHandler } from '../../../middleware/errorHandler';

// Mock the AI Pipeline client
jest.mock('../../../services/aiPipelineClient', () => ({
  aiPipelineClient: {
    getModelAnalytics: jest.fn(),
    getModelMetrics: jest.fn(),
    getDataDistributions: jest.fn(),
    compareModels: jest.fn(),
    exportAnalytics: jest.fn(),
    getFeatureImportance: jest.fn()
  }
}));

import { aiPipelineClient } from '../../../services/aiPipelineClient';

const app = express();
app.use(express.json());
app.use('/api/models', modelRoutes);
app.use(errorHandler);

describe('Analytics API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/models/:modelId/analytics', () => {
    it('should return comprehensive analytics data', async () => {
      const mockAnalytics = {
        modelPerformance: {
          accuracy: 0.92,
          precision: 0.89,
          recall: 0.91,
          f1Score: 0.90,
          rocAuc: 0.94
        },
        featureImportance: {
          features: [
            { name: 'feature_1', importance: 0.35, rank: 1 },
            { name: 'feature_2', importance: 0.28, rank: 2 }
          ],
          method: 'built_in',
          totalFeatures: 10
        },
        dataDistributions: {
          numerical: {},
          categorical: {},
          correlations: { matrix: [], features: [], strongCorrelations: [] }
        }
      };

      (aiPipelineClient.getModelAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/models/test-model-id/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
      expect(aiPipelineClient.getModelAnalytics).toHaveBeenCalledWith('test-model-id');
    });

    it('should handle analytics retrieval errors', async () => {
      (aiPipelineClient.getModelAnalytics as jest.Mock).mockRejectedValue(
        new Error('Analytics service unavailable')
      );

      const response = await request(app)
        .get('/api/models/test-model-id/analytics')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Analytics service unavailable');
    });
  });

  describe('GET /api/models/:modelId/metrics', () => {
    it('should return model performance metrics', async () => {
      const mockMetrics = {
        accuracy: 0.92,
        precision: 0.89,
        recall: 0.91,
        f1Score: 0.90,
        rocAuc: 0.94,
        confusionMatrix: [[45, 5], [3, 47]]
      };

      (aiPipelineClient.getModelMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/models/test-model-id/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMetrics);
    });
  });

  describe('GET /api/models/:modelId/data-distributions', () => {
    it('should return data distribution information', async () => {
      const mockDistributions = {
        numerical: {
          feature_1: {
            histogram: { bins: [0, 1, 2], counts: [10, 20, 15] },
            statistics: { mean: 1.2, std: 0.8 }
          }
        },
        categorical: {},
        correlations: {
          matrix: [[1.0, 0.7], [0.7, 1.0]],
          features: ['feature_1', 'feature_2'],
          strongCorrelations: []
        }
      };

      (aiPipelineClient.getDataDistributions as jest.Mock).mockResolvedValue(mockDistributions);

      const response = await request(app)
        .get('/api/models/test-model-id/data-distributions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDistributions);
    });
  });

  describe('POST /api/models/compare', () => {
    it('should compare multiple models', async () => {
      const mockComparison = {
        models: [
          { id: 'model1', name: 'Model 1', type: 'random_forest' },
          { id: 'model2', name: 'Model 2', type: 'xgboost' }
        ],
        comparison: {
          bestModel: 'model1',
          metricComparison: {
            accuracy: { model1: 0.92, model2: 0.89 }
          },
          rankings: {
            accuracy: ['model1', 'model2']
          }
        }
      };

      (aiPipelineClient.compareModels as jest.Mock).mockResolvedValue(mockComparison);

      const response = await request(app)
        .post('/api/models/compare')
        .send({ modelIds: ['model1', 'model2'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockComparison);
      expect(aiPipelineClient.compareModels).toHaveBeenCalledWith(['model1', 'model2']);
    });

    it('should validate model IDs for comparison', async () => {
      const response = await request(app)
        .post('/api/models/compare')
        .send({ modelIds: ['model1'] })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing modelIds', async () => {
      const response = await request(app)
        .post('/api/models/compare')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/models/:modelId/export', () => {
    it('should export analytics data as JSON', async () => {
      const mockAnalytics = {
        modelPerformance: { accuracy: 0.92 },
        featureImportance: { features: [] }
      };

      (aiPipelineClient.exportAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/models/test-model-id/export?format=json')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
    });

    it('should export analytics data as CSV', async () => {
      const mockCSV = 'metric,value\naccuracy,0.92';

      (aiPipelineClient.exportAnalytics as jest.Mock).mockResolvedValue(mockCSV);

      const response = await request(app)
        .get('/api/models/test-model-id/export?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('analytics_test-model-id.csv');
    });

    it('should default to JSON format when no format specified', async () => {
      const mockAnalytics = { modelPerformance: { accuracy: 0.92 } };

      (aiPipelineClient.exportAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/models/test-model-id/export')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/models/:modelId/feature-importance', () => {
    it('should return feature importance data', async () => {
      const mockFeatureImportance = {
        feature_1: 0.35,
        feature_2: 0.28,
        feature_3: 0.22
      };

      (aiPipelineClient.getFeatureImportance as jest.Mock).mockResolvedValue(mockFeatureImportance);

      const response = await request(app)
        .get('/api/models/test-model-id/feature-importance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.featureImportance).toEqual(mockFeatureImportance);
    });
  });
});