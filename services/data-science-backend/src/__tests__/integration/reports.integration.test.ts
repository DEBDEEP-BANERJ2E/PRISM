import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { dataScienceRoutes } from '../../api/routes';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';
import { AnalyticsData, ReportConfiguration, ReportMetadata } from '../../types/reports';

describe('Reports Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use('/api', dataScienceRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });
  const mockAnalyticsData: AnalyticsData = {
    modelPerformance: [{
      modelId: 'integration-test-model',
      modelType: 'random_forest',
      accuracy: 0.92,
      precision: 0.89,
      recall: 0.94,
      f1Score: 0.91,
      auc: 0.95
    }],
    featureImportance: {
      'slope_angle': 0.35,
      'rock_type': 0.28,
      'weather_condition': 0.22,
      'vibration_level': 0.15
    },
    datasetInfo: {
      totalSamples: 5000,
      featureCount: 15,
      missingValues: 12,
      qualityScore: 0.94
    }
  };

  const mockReportConfig: ReportConfiguration = {
    format: 'pdf',
    includeCharts: true,
    includeRawData: false,
    sections: [
      { id: 'summary', name: 'Executive Summary', enabled: true, order: 1 },
      { id: 'model_performance', name: 'Model Performance', enabled: true, order: 2 },
      { id: 'features', name: 'Feature Analysis', enabled: true, order: 3 }
    ]
  };

  const mockReportMetadata: ReportMetadata = {
    title: 'Integration Test Report',
    author: 'Test Suite',
    version: '1.0',
    description: 'Automated integration test for report generation'
  };

  it('should initiate report generation workflow', async () => {
    // Step 1: Generate report
    const generateResponse = await request(app)
      .post('/api/reports/generate')
      .send({
        analyticsData: mockAnalyticsData,
        configuration: mockReportConfig,
        metadata: mockReportMetadata
      })
      .expect(200);

    expect(generateResponse.body).toHaveProperty('reportId');
    expect(generateResponse.body).toHaveProperty('estimatedGenerationTime');
    expect(typeof generateResponse.body.reportId).toBe('string');
    expect(typeof generateResponse.body.estimatedGenerationTime).toBe('number');

    const reportId = generateResponse.body.reportId;

    // Step 2: Check initial status
    const initialStatusResponse = await request(app)
      .get(`/api/reports/${reportId}/status`)
      .expect(200);

    expect(initialStatusResponse.body.status).toBe('generating');
    expect(initialStatusResponse.body.reportId).toBe(reportId);
    expect(initialStatusResponse.body.progress).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple concurrent report generations', async () => {
    const reportPromises = Array.from({ length: 3 }, (_, i) => 
      request(app)
        .post('/api/reports/generate')
        .send({
          analyticsData: mockAnalyticsData,
          configuration: { ...mockReportConfig, format: 'html' }, // Use HTML for faster generation
          metadata: { ...mockReportMetadata, title: `Concurrent Test Report ${i + 1}` }
        })
    );

    const responses = await Promise.all(reportPromises);

    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reportId');
    });

    // All should have unique report IDs
    const reportIds = responses.map(r => r.body.reportId);
    const uniqueIds = new Set(reportIds);
    expect(uniqueIds.size).toBe(3);
  });

  it('should return report templates', async () => {
    const response = await request(app)
      .get('/api/reports/templates')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    const template = response.body[0];
    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('name');
    expect(template).toHaveProperty('description');
    expect(template).toHaveProperty('sections');
    expect(Array.isArray(template.sections)).toBe(true);
  });

  it('should create custom templates', async () => {
    const customTemplate = {
      name: 'Integration Test Template',
      description: 'A template created during integration testing',
      sections: ['summary', 'model_performance', 'recommendations']
    };

    const response = await request(app)
      .post('/api/reports/templates')
      .send(customTemplate)
      .expect(201);

    expect(response.body.name).toBe(customTemplate.name);
    expect(response.body.description).toBe(customTemplate.description);
    expect(response.body.sections).toEqual(customTemplate.sections);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('createdAt');
  });

  it('should return empty report history initially', async () => {
    const response = await request(app)
      .get('/api/reports/history')
      .expect(200);

    expect(response.body).toHaveProperty('reports');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page');
    expect(response.body).toHaveProperty('limit');
    expect(Array.isArray(response.body.reports)).toBe(true);
  });
});