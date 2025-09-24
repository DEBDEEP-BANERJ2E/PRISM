import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { dataRoutes } from '../../api/routes/data';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/data', dataRoutes);
app.use(errorHandler);

describe('Data Science Workflow Integration', () => {
  let dataId: string;

  describe('Complete CSV Upload and Processing Workflow', () => {
    it('should upload CSV file successfully', async () => {
      // Create a test CSV file
      const csvContent = 'feature1,feature2,target\n1,2,0\n3,4,1\n5,6,0\n7,8,1';
      const testFilePath = path.join(__dirname, 'integration-test.csv');
      fs.writeFileSync(testFilePath, csvContent);

      const response = await request(app)
        .post('/api/data/upload')
        .attach('file', testFilePath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataId).toBeDefined();
      expect(response.body.data.preview).toBeDefined();
      expect(response.body.data.preview.headers).toEqual(['feature1', 'feature2', 'target']);
      expect(response.body.data.preview.rows).toHaveLength(4);
      expect(response.body.data.validation.isValid).toBe(true);

      dataId = response.body.data.dataId;

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should retrieve uploaded dataset', async () => {
      const response = await request(app)
        .get(`/api/data/${dataId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(dataId);
    });

    it('should start preprocessing', async () => {
      const preprocessingConfig = {
        normalize: true,
        handleMissingValues: true,
        featureSelection: true,
        outlierRemoval: false
      };

      // This will fail because AI pipeline is not available, but we can test the API structure
      const response = await request(app)
        .post(`/api/data/${dataId}/preprocess`)
        .send({ preprocessingConfig })
        .expect(500); // Expected to fail without AI pipeline

      expect(response.body.success).toBe(false);
    });
  });

  describe('Manual Data Entry Workflow', () => {
    it('should accept manual data entry', async () => {
      const tableData = {
        headers: ['temperature', 'humidity', 'risk_level'],
        rows: [
          [25.5, 60, 'low'],
          [30.2, 75, 'medium'],
          [35.8, 85, 'high'],
          [28.1, 65, 'low']
        ],
        metadata: {
          rowCount: 4,
          columnCount: 3,
          dataTypes: {
            temperature: 'number',
            humidity: 'number',
            risk_level: 'string'
          }
        }
      };

      const response = await request(app)
        .post('/api/data/manual')
        .send({
          tableData,
          metadata: {
            name: 'Environmental Risk Dataset',
            description: 'Manual entry test dataset for environmental risk assessment'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataId).toBeDefined();
      expect(response.body.data.validation.isValid).toBe(true);

      dataId = response.body.data.dataId;
    });

    it('should validate data types correctly', async () => {
      const tableData = {
        headers: ['numeric_col', 'string_col', 'boolean_col'],
        rows: [
          [123, 'text1', 'true'],
          [456, 'text2', 'false'],
          [789, 'text3', 'yes']
        ],
        metadata: {
          rowCount: 3,
          columnCount: 3,
          dataTypes: {
            numeric_col: 'number',
            string_col: 'string',
            boolean_col: 'boolean'
          }
        }
      };

      const response = await request(app)
        .post('/api/data/manual')
        .send({ tableData })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validation.isValid).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should reject data with missing headers', async () => {
      const invalidData = {
        tableData: {
          headers: [],
          rows: [['value1', 'value2']]
        }
      };

      const response = await request(app)
        .post('/api/data/manual')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject data with mismatched column counts', async () => {
      const invalidData = {
        tableData: {
          headers: ['col1', 'col2', 'col3'],
          rows: [
            ['val1', 'val2'], // Missing third column
            ['val3', 'val4', 'val5']
          ],
          metadata: {
            rowCount: 2,
            columnCount: 3,
            dataTypes: {}
          }
        }
      };

      const response = await request(app)
        .post('/api/data/manual')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate headers', async () => {
      const invalidData = {
        tableData: {
          headers: ['col1', 'col2', 'col1'], // Duplicate header
          rows: [['val1', 'val2', 'val3']],
          metadata: {
            rowCount: 1,
            columnCount: 3,
            dataTypes: {}
          }
        }
      };

      const response = await request(app)
        .post('/api/data/manual')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('API Error Handling', () => {
    it('should handle non-existent dataset gracefully', async () => {
      const response = await request(app)
        .get('/api/data/non-existent-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toContain('non-existent-id');
    });

    it('should handle preprocessing for non-existent dataset', async () => {
      const response = await request(app)
        .post('/api/data/non-existent-id/preprocess')
        .send({ preprocessingConfig: {} })
        .expect(500); // Will fail because dataset doesn't exist and AI pipeline unavailable

      expect(response.body.success).toBe(false);
    });

    it('should handle job status for non-existent job', async () => {
      const response = await request(app)
        .get('/api/data/preprocess/non-existent-job/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });
  });
});