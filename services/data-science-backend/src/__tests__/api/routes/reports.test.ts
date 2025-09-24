import request from 'supertest';
import express from 'express';
import reportsRouter from '../../../api/routes/reports';
import { AnalyticsData, ReportConfiguration, ReportMetadata } from '../../../types/reports';

describe('Reports API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
  });

  const mockAnalyticsData: AnalyticsData = {
    modelPerformance: [{
      modelId: 'test-model-1',
      modelType: 'random_forest',
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85,
      auc: 0.87
    }],
    featureImportance: {
      'feature1': 0.3,
      'feature2': 0.25,
      'feature3': 0.2
    },
    datasetInfo: {
      totalSamples: 1000,
      featureCount: 10,
      missingValues: 5,
      qualityScore: 0.9
    }
  };

  const mockReportConfig: ReportConfiguration = {
    format: 'pdf',
    includeCharts: true,
    includeRawData: false,
    sections: [
      { id: 'summary', name: 'Executive Summary', enabled: true, order: 1 },
      { id: 'model_performance', name: 'Model Performance', enabled: true, order: 2 }
    ]
  };

  const mockReportMetadata: ReportMetadata = {
    title: 'Test Report',
    author: 'Test User',
    version: '1.0',
    description: 'Test report description'
  };

  describe('POST /api/reports/generate', () => {
    it('should generate a report successfully', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          analyticsData: mockAnalyticsData,
          configuration: mockReportConfig,
          metadata: mockReportMetadata
        })
        .expect(200);

      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('estimatedGenerationTime');
      expect(typeof response.body.reportId).toBe('string');
      expect(typeof response.body.estimatedGenerationTime).toBe('number');
    });

    it('should return 400 for missing analytics data', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          configuration: mockReportConfig,
          metadata: mockReportMetadata
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Invalid report generation request');
    });

    it('should return 400 for invalid configuration', async () => {
      const invalidConfig = { ...mockReportConfig, format: 'invalid' };
      
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          analyticsData: mockAnalyticsData,
          configuration: invalidConfig,
          metadata: mockReportMetadata
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing model performance data', async () => {
      const invalidAnalytics = { ...mockAnalyticsData, modelPerformance: [] };
      
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          analyticsData: invalidAnalytics,
          configuration: mockReportConfig,
          metadata: mockReportMetadata
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/reports/:reportId/status', () => {
    it('should return report status', async () => {
      // First generate a report to get a valid reportId
      const generateResponse = await request(app)
        .post('/api/reports/generate')
        .send({
          analyticsData: mockAnalyticsData,
          configuration: mockReportConfig,
          metadata: mockReportMetadata
        });

      const reportId = generateResponse.body.reportId;
      
      const response = await request(app)
        .get(`/api/reports/${reportId}/status`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('progress');
      expect(response.body).toHaveProperty('reportId');
    });

    it('should return 404 for non-existent report', async () => {
      const reportId = 'non-existent-report';
      
      const response = await request(app)
        .get(`/api/reports/${reportId}/status`)
        .expect(404);

      expect(response.body.code).toBe('REPORT_NOT_FOUND');
    });
  });

  describe('GET /api/reports/:reportId/download', () => {
    it('should return 404 for non-existent report', async () => {
      const reportId = 'non-existent-report';
      
      const response = await request(app)
        .get(`/api/reports/${reportId}/download`)
        .expect(404);

      expect(response.body.code).toBe('REPORT_NOT_FOUND');
    });
  });

  describe('GET /api/reports/history', () => {
    it('should return report history', async () => {
      const response = await request(app)
        .get('/api/reports/history')
        .expect(200);

      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.reports)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/reports/history?page=2&limit=5')
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(5);
    });
  });

  describe('GET /api/reports/templates', () => {
    it('should return available templates', async () => {
      const response = await request(app)
        .get('/api/reports/templates')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const template = response.body[0];
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('sections');
        expect(Array.isArray(template.sections)).toBe(true);
      }
    });
  });

  describe('POST /api/reports/templates', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        name: 'Custom Test Template',
        description: 'A custom template for testing',
        sections: ['summary', 'model_performance']
      };

      const response = await request(app)
        .post('/api/reports/templates')
        .send(newTemplate)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newTemplate.name);
      expect(response.body.description).toBe(newTemplate.description);
      expect(response.body.sections).toEqual(newTemplate.sections);
    });

    it('should return 400 for invalid template data', async () => {
      const invalidTemplate = {
        description: 'Missing name field',
        sections: []
      };

      const response = await request(app)
        .post('/api/reports/templates')
        .send(invalidTemplate)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});