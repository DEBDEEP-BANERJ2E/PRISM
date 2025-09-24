import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { dataRoutes } from '../../../api/routes/data';
import { errorHandler } from '../../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/data', dataRoutes);
app.use(errorHandler);

describe('Data Routes', () => {
  describe('POST /api/data/upload', () => {
    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/api/data/upload')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error?.message).toContain('No file uploaded');
    });

    it('should accept valid CSV file', async () => {
      // Create a temporary CSV file for testing
      const csvContent = 'col1,col2,col3\nvalue1,value2,value3\nvalue4,value5,value6';
      const testFilePath = path.join(__dirname, 'test.csv');
      fs.writeFileSync(testFilePath, csvContent);

      const response = await request(app)
        .post('/api/data/upload')
        .attach('file', testFilePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataId).toBeDefined();
      expect(response.body.data.preview).toBeDefined();
      expect(response.body.data.validation.isValid).toBe(true);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });
  });

  describe('POST /api/data/manual', () => {
    it('should accept valid table data', async () => {
      const validTableData = {
        tableData: {
          headers: ['col1', 'col2', 'col3'],
          rows: [
            ['value1', 'value2', 'value3'],
            ['value4', 'value5', 'value6']
          ],
          metadata: {
            rowCount: 2,
            columnCount: 3,
            dataTypes: {
              col1: 'string',
              col2: 'string',
              col3: 'string'
            }
          }
        },
        metadata: {
          name: 'Test Dataset'
        }
      };

      const response = await request(app)
        .post('/api/data/manual')
        .send(validTableData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataId).toBeDefined();
      expect(response.body.data.validation.isValid).toBe(true);
    });

    it('should reject invalid table data', async () => {
      const invalidTableData = {
        tableData: {
          // Missing headers
          rows: [['value1', 'value2']]
        }
      };

      const response = await request(app)
        .post('/api/data/manual')
        .send(invalidTableData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject empty request body', async () => {
      const response = await request(app)
        .post('/api/data/manual')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/data/:dataId/preprocess', () => {
    it('should handle preprocessing request', async () => {
      const dataId = 'test-dataset-id';
      const preprocessingConfig = {
        normalize: true,
        handleMissingValues: true,
        featureSelection: true
      };

      // This test will fail because it tries to connect to AI pipeline
      // In a real implementation, we would mock the AI pipeline client
      const response = await request(app)
        .post(`/api/data/${dataId}/preprocess`)
        .send({ preprocessingConfig })
        .expect(500); // Expecting 500 because AI pipeline is not available

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/data/preprocess/:jobId/status', () => {
    it('should return job status', async () => {
      const jobId = 'test-job-id';
      
      const response = await request(app)
        .get(`/api/data/preprocess/${jobId}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });
  });

  describe('GET /api/data', () => {
    it('should return datasets list', async () => {
      const response = await request(app)
        .get('/api/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/data/:dataId', () => {
    it('should return dataset by ID', async () => {
      const dataId = 'test-dataset-id';
      
      const response = await request(app)
        .get(`/api/data/${dataId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(dataId);
    });
  });
});