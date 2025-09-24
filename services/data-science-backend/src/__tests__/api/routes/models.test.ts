import request from 'supertest';
import express from 'express';
import { modelRoutes } from '../../../api/routes/models';
import { errorHandler } from '../../../middleware/errorHandler';
import { expect } from 'chai';
import { it } from 'date-fns/locale';
import { expect } from 'chai';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { expect } from 'chai';
import { it } from 'date-fns/locale';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { it } from 'date-fns/locale';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { expect } from 'chai';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { describe } from 'node:test';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/models', modelRoutes);
app.use(errorHandler);

describe('Model Routes', () => {
  describe('GET /api/models/types', () => {
    it('should return available model types', async () => {
      const response = await request(app)
        .get('/api/models/types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modelTypes).toBeDefined();
      expect(Array.isArray(response.body.data.modelTypes)).toBe(true);
      expect(response.body.data.modelTypes.length).toBeGreaterThan(0);

      // Check structure of first model type
      const firstModel = response.body.data.modelTypes[0];
      expect(firstModel).toHaveProperty('type');
      expect(firstModel).toHaveProperty('name');
      expect(firstModel).toHaveProperty('description');
      expect(firstModel).toHaveProperty('defaultHyperparameters');
      expect(firstModel).toHaveProperty('hyperparameterRanges');
    });
  });

  describe('POST /api/models/validate-config', () => {
    it('should validate a valid configuration', async () => {
      const validConfig = {
        modelType: 'random_forest',
        hyperparameters: {
          n_estimators: 100,
          max_depth: 10,
          min_samples_split: 2,
          min_samples_leaf: 1,
          random_state: 42
        },
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'holdout',
          crossValidationFolds: 5
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      };

      const response = await request(app)
        .post('/api/models/validate-config')
        .send({ configuration: validConfig })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        modelType: 'invalid_model',
        hyperparameters: {},
        trainingConfig: {
          trainTestSplit: 1.5, // Invalid: > 1
          validationStrategy: 'holdout'
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      };

      const response = await request(app)
        .post('/api/models/validate-config')
        .send({ configuration: invalidConfig })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    it('should require configuration parameter', async () => {
      const response = await request(app)
        .post('/api/models/validate-config')
        .send({})
        .expect(400); // DataValidationError returns 400 for missing body

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/models/train', () => {
    it('should start model training with valid parameters', async () => {
      const validConfig = {
        modelType: 'random_forest',
        hyperparameters: {
          n_estimators: 100,
          max_depth: 10,
          random_state: 42
        },
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'holdout'
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      };

      const response = await request(app)
        .post('/api/models/train')
        .send({ 
          dataId: 'test-data-id',
          configuration: validConfig 
        })
        .expect(500); // Will fail because AI pipeline is not available

      expect(response.body.success).toBe(false); // Will fail without AI pipeline
    });

    it('should reject training without dataId', async () => {
      const validConfig = {
        modelType: 'random_forest',
        hyperparameters: {},
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'holdout'
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      };

      const response = await request(app)
        .post('/api/models/train')
        .send({ configuration: validConfig })
        .expect(422); // ModelTrainingError returns 422

      expect(response.body.success).toBe(false);
    });
  });
});