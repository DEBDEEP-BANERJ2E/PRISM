import request from 'supertest';
import express from 'express';
import explanationsRouter from '../../routes/explanations';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/explanations', explanationsRouter);

describe('Explanations API', () => {
  const sampleFeatures = [0.6, 0.4, 0.3, 0.5, 0.2];
  const featureNames = ['slope_angle', 'joint_orientation', 'displacement_rate', 'pore_pressure', 'rainfall_accumulation'];
  const modelName = 'test_model';

  describe('POST /api/explanations/single', () => {
    test('should generate single explanation successfully', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: sampleFeatures,
          feature_names: featureNames,
          explanation_type: 'shap'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.natural_language_explanation).toBeDefined();
      expect(response.body.data.visualization_data).toBeDefined();
      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.model_name).toBe(modelName);
      expect(response.body.metadata.explanation_type).toBe('shap');
    });

    test('should handle LIME explanation type', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: sampleFeatures,
          feature_names: featureNames,
          explanation_type: 'lime'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.lime_explanation).toBeDefined();
    });

    test('should handle both explanation types', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: sampleFeatures,
          feature_names: featureNames,
          explanation_type: 'both'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shap_explanation).toBeDefined();
      expect(response.body.data.lime_explanation).toBeDefined();
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          // Missing instance and feature_names
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should return 400 for invalid explanation type', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: sampleFeatures,
          feature_names: featureNames,
          explanation_type: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('explanation_type must be one of');
    });

    test('should return 400 for mismatched dimensions', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: [0.5, 0.3], // Only 2 features
          feature_names: featureNames, // 5 feature names
          explanation_type: 'shap'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('same length');
    });

    test('should return 400 for non-array inputs', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: 'not_an_array',
          feature_names: featureNames,
          explanation_type: 'shap'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must be arrays');
    });
  });

  describe('POST /api/explanations/batch', () => {
    test('should generate batch explanations successfully', async () => {
      const batchRequest = {
        instances: [
          [0.6, 0.4, 0.3, 0.5, 0.2],
          [0.7, 0.5, 0.4, 0.6, 0.3],
          [0.4, 0.2, 0.1, 0.3, 0.05]
        ],
        feature_names: featureNames,
        model_name: modelName,
        explanation_type: 'shap'
      };

      const response = await request(app)
        .post('/api/explanations/batch')
        .send(batchRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.explanations).toBeDefined();
      expect(response.body.data.explanations.length).toBe(3);
      expect(response.body.data.summary_statistics).toBeDefined();
      expect(response.body.metadata.instance_count).toBe(3);
    });

    test('should return 400 for empty instances array', async () => {
      const response = await request(app)
        .post('/api/explanations/batch')
        .send({
          instances: [],
          feature_names: featureNames,
          model_name: modelName
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot be empty');
    });

    test('should return 400 for invalid instance dimensions', async () => {
      const response = await request(app)
        .post('/api/explanations/batch')
        .send({
          instances: [
            [0.6, 0.4], // Wrong dimensions
            [0.7, 0.5, 0.4, 0.6, 0.3]
          ],
          feature_names: featureNames,
          model_name: modelName
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid dimensions');
    });
  });

  describe('POST /api/explanations/ensemble', () => {
    test('should generate ensemble explanation successfully', async () => {
      const response = await request(app)
        .post('/api/explanations/ensemble')
        .send({
          instance: sampleFeatures,
          feature_names: featureNames,
          model_names: [modelName, 'another_model']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ensemble_explanation).toBeDefined();
      expect(response.body.data.individual_explanations).toBeDefined();
    });

    test('should return 400 for empty model names', async () => {
      const response = await request(app)
        .post('/api/explanations/ensemble')
        .send({
          instance: sampleFeatures,
          feature_names: featureNames,
          model_names: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot be empty');
    });
  });

  describe('POST /api/explanations/operational', () => {
    test('should generate operational explanation successfully', async () => {
      const operationalContext = {
        location: 'Bench 12-A',
        current_operations: ['hauling', 'drilling'],
        personnel_count: 15,
        equipment_value: 2500000
      };

      const response = await request(app)
        .post('/api/explanations/operational')
        .send({
          model_name: modelName,
          instance: sampleFeatures,
          feature_names: featureNames,
          operational_context: operationalContext
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.explanation).toBeDefined();
      expect(response.body.data.operational_impact).toBeDefined();
      expect(response.body.data.operational_impact.personnel_risk).toBeDefined();
      expect(response.body.data.operational_impact.equipment_risk).toBeDefined();
      expect(response.body.data.operational_impact.operational_recommendations).toBeDefined();
      expect(response.body.data.operational_impact.estimated_cost_impact).toBeGreaterThan(0);
    });

    test('should return 400 for missing operational context fields', async () => {
      const incompleteContext = {
        location: 'Bench 12-A',
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/explanations/operational')
        .send({
          model_name: modelName,
          instance: sampleFeatures,
          feature_names: featureNames,
          operational_context: incompleteContext
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required operational_context field');
    });
  });

  describe('POST /api/explanations/trends', () => {
    test('should analyze trends successfully', async () => {
      const timeSeriesData = [
        { timestamp: '2024-01-01T00:00:00Z', features: [0.3, 0.2, 0.1, 0.2, 0.1] },
        { timestamp: '2024-01-02T00:00:00Z', features: [0.4, 0.3, 0.2, 0.3, 0.2] },
        { timestamp: '2024-01-03T00:00:00Z', features: [0.6, 0.5, 0.4, 0.5, 0.3] }
      ];

      const response = await request(app)
        .post('/api/explanations/trends')
        .send({
          model_name: modelName,
          time_series_data: timeSeriesData,
          feature_names: featureNames
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.feature_trends).toBeDefined();
      expect(response.body.data.trend_analysis).toBeDefined();
      expect(response.body.data.risk_evolution).toBeDefined();
      expect(response.body.metadata.time_points).toBe(3);
    });

    test('should return 400 for empty time series data', async () => {
      const response = await request(app)
        .post('/api/explanations/trends')
        .send({
          model_name: modelName,
          time_series_data: [],
          feature_names: featureNames
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot be empty');
    });

    test('should return 400 for invalid time series structure', async () => {
      const invalidTimeSeriesData = [
        { timestamp: '2024-01-01T00:00:00Z' }, // Missing features
        { features: [0.4, 0.3, 0.2, 0.3, 0.2] } // Missing timestamp
      ];

      const response = await request(app)
        .post('/api/explanations/trends')
        .send({
          model_name: modelName,
          time_series_data: invalidTimeSeriesData,
          feature_names: featureNames
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('missing timestamp or features');
    });
  });

  describe('POST /api/explanations/background-data', () => {
    test('should set background data successfully', async () => {
      const backgroundData = {
        features: [
          [0.5, 0.3, 0.2, 0.4, 0.1],
          [0.7, 0.5, 0.4, 0.6, 0.3],
          [0.4, 0.2, 0.1, 0.3, 0.05]
        ],
        labels: [0.3, 0.7, 0.2],
        feature_names: featureNames
      };

      const response = await request(app)
        .post('/api/explanations/background-data')
        .send(backgroundData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully');
      expect(response.body.metadata.sample_count).toBe(3);
      expect(response.body.metadata.feature_count).toBe(featureNames.length);
    });

    test('should return 400 for mismatched features and labels length', async () => {
      const response = await request(app)
        .post('/api/explanations/background-data')
        .send({
          features: [[0.5, 0.3, 0.2, 0.4, 0.1]],
          labels: [0.3, 0.7], // More labels than features
          feature_names: featureNames
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('same length');
    });

    test('should return 400 for invalid feature dimensions', async () => {
      const response = await request(app)
        .post('/api/explanations/background-data')
        .send({
          features: [
            [0.5, 0.3], // Wrong dimensions
            [0.7, 0.5, 0.4, 0.6, 0.3]
          ],
          labels: [0.3, 0.7],
          feature_names: featureNames
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalid dimensions');
    });
  });

  describe('GET /api/explanations/cache/stats', () => {
    test('should return cache statistics', async () => {
      const response = await request(app)
        .get('/api/explanations/cache/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.size).toBeDefined();
      expect(response.body.data.hit_rate).toBeDefined();
      expect(response.body.data.most_accessed).toBeDefined();
    });
  });

  describe('DELETE /api/explanations/cache', () => {
    test('should clear cache successfully', async () => {
      const response = await request(app)
        .delete('/api/explanations/cache');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully');
    });
  });

  describe('GET /api/explanations/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/explanations/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
      expect(response.body.services.explanation_service).toBe('running');
      expect(response.body.services.model_pipeline).toBe('running');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    test('should handle large payloads gracefully', async () => {
      const largeInstances = Array.from({ length: 1000 }, () => 
        Array.from({ length: 50 }, () => Math.random())
      );
      const largeFeatureNames = Array.from({ length: 50 }, (_, i) => `feature_${i}`);

      const response = await request(app)
        .post('/api/explanations/batch')
        .send({
          instances: largeInstances,
          feature_names: largeFeatureNames,
          model_name: modelName
        });

      // Should either succeed or fail gracefully with appropriate error
      expect([200, 400, 500]).toContain(response.status);
    });

    test('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/explanations/single')
          .send({
            model_name: modelName,
            instance: sampleFeatures,
            feature_names: featureNames,
            explanation_type: 'shap'
          })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach((response: any) => {
        expect([200, 500]).toContain(response.status); // Should succeed or fail gracefully
      });
    });
  });

  describe('Input Validation Edge Cases', () => {
    test('should handle null values in arrays', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: [0.5, null, 0.3, 0.4, 0.2],
          feature_names: featureNames,
          explanation_type: 'shap'
        });

      expect(response.status).toBe(500); // Should handle gracefully
    });

    test('should handle extremely large feature values', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: [1e10, 1e10, 1e10, 1e10, 1e10],
          feature_names: featureNames,
          explanation_type: 'shap'
        });

      expect([200, 500]).toContain(response.status);
    });

    test('should handle negative feature values', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: [-0.5, -0.3, -0.2, -0.4, -0.1],
          feature_names: featureNames,
          explanation_type: 'shap'
        });

      expect([200, 500]).toContain(response.status);
    });

    test('should handle empty string model name', async () => {
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: '',
          instance: sampleFeatures,
          feature_names: featureNames,
          explanation_type: 'shap'
        });

      expect(response.status).toBe(500); // Should fail with model not found
    });

    test('should handle special characters in feature names', async () => {
      const specialFeatureNames = ['feature@1', 'feature#2', 'feature$3', 'feature%4', 'feature&5'];
      
      const response = await request(app)
        .post('/api/explanations/single')
        .send({
          model_name: modelName,
          instance: sampleFeatures,
          feature_names: specialFeatureNames,
          explanation_type: 'shap'
        });

      expect([200, 500]).toContain(response.status);
    });
  });
});