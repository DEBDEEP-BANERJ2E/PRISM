import request from 'supertest';
import express from 'express';
import { scenarioRoutes } from '../../../api/routes/scenarios';
import { errorHandler } from '../../../middleware/errorHandler';

// Mock the scenario service
jest.mock('../../../services/ScenarioService', () => ({
  scenarioService: {
    createScenario: jest.fn(),
    executeScenario: jest.fn(),
    getScenarioResults: jest.fn(),
    getScenario: jest.fn(),
    listScenarios: jest.fn(),
    updateScenario: jest.fn(),
    deleteScenario: jest.fn(),
    compareScenarios: jest.fn(),
    generateScenarioTemplate: jest.fn()
  }
}));

import { scenarioService } from '../../../services/ScenarioService';

const app = express();
app.use(express.json());
app.use('/api/scenarios', scenarioRoutes);
app.use(errorHandler);

describe('Scenario Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/scenarios', () => {
    it('should create a scenario successfully', async () => {
      const mockScenario = {
        id: 'scenario-123',
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (scenarioService.createScenario as jest.Mock).mockResolvedValue(mockScenario);

      const scenarioData = {
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      };

      const response = await request(app)
        .post('/api/scenarios')
        .send(scenarioData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'scenario-123',
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      });
      expect(scenarioService.createScenario).toHaveBeenCalledWith(scenarioData);
    });

    it('should handle scenario creation errors', async () => {
      (scenarioService.createScenario as jest.Mock).mockRejectedValue(
        new Error('Validation failed')
      );

      const scenarioData = {
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      };

      const response = await request(app)
        .post('/api/scenarios')
        .send(scenarioData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/scenarios/:scenarioId/execute', () => {
    it('should execute a scenario successfully', async () => {
      const mockResult = {
        jobId: 'job-123',
        estimatedDuration: 120
      };

      (scenarioService.executeScenario as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/scenarios/scenario-123/execute')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(scenarioService.executeScenario).toHaveBeenCalledWith('scenario-123');
    });

    it('should handle execution errors', async () => {
      (scenarioService.executeScenario as jest.Mock).mockRejectedValue(
        new Error('Scenario not found')
      );

      const response = await request(app)
        .post('/api/scenarios/non-existent/execute')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/scenarios/results/:jobId', () => {
    it('should get scenario results successfully', async () => {
      const mockResults = {
        scenarioId: 'scenario-123',
        predictions: [],
        riskAssessment: {
          overallRisk: 'low',
          riskScore: 0.3,
          factors: [],
          recommendations: [],
          validUntil: new Date()
        },
        confidence: 0.85,
        sensitivity: {
          parameters: [],
          mostSensitiveParameters: [],
          stabilityScore: 0.9
        },
        recommendations: [],
        executedAt: new Date()
      };

      (scenarioService.getScenarioResults as jest.Mock).mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/scenarios/results/job-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        scenarioId: 'scenario-123',
        predictions: [],
        confidence: 0.85
      });
      expect(scenarioService.getScenarioResults).toHaveBeenCalledWith('job-123');
    });
  });

  describe('GET /api/scenarios/:scenarioId', () => {
    it('should get scenario by ID successfully', async () => {
      const mockScenario = {
        id: 'scenario-123',
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (scenarioService.getScenario as jest.Mock).mockReturnValue(mockScenario);

      const response = await request(app)
        .get('/api/scenarios/scenario-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'scenario-123',
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123'
      });
      expect(scenarioService.getScenario).toHaveBeenCalledWith('scenario-123');
    });

    it('should return 404 for non-existent scenario', async () => {
      (scenarioService.getScenario as jest.Mock).mockReturnValue(undefined);

      const response = await request(app)
        .get('/api/scenarios/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCENARIO_NOT_FOUND');
    });
  });

  describe('GET /api/scenarios', () => {
    it('should list scenarios successfully', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          name: 'Scenario 1',
          description: 'First scenario',
          modelId: 'model-123',
          parameters: { param1: 1.0 },
          conditions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (scenarioService.listScenarios as jest.Mock).mockReturnValue(mockScenarios);

      const response = await request(app)
        .get('/api/scenarios')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scenarios).toHaveLength(1);
      expect(response.body.data.scenarios[0]).toMatchObject({
        id: 'scenario-1',
        name: 'Scenario 1',
        modelId: 'model-123'
      });
      expect(response.body.data.total).toBe(1);
      expect(scenarioService.listScenarios).toHaveBeenCalledWith({});
    });

    it('should filter scenarios by modelId', async () => {
      const mockScenarios = [
        {
          id: 'scenario-1',
          name: 'Scenario 1',
          modelId: 'model-123',
          parameters: { param1: 1.0 },
          conditions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (scenarioService.listScenarios as jest.Mock).mockReturnValue(mockScenarios);

      const response = await request(app)
        .get('/api/scenarios?modelId=model-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(scenarioService.listScenarios).toHaveBeenCalledWith({
        modelId: 'model-123',
        name: undefined
      });
    });
  });

  describe('PUT /api/scenarios/:scenarioId', () => {
    it('should update scenario successfully', async () => {
      const mockUpdatedScenario = {
        id: 'scenario-123',
        name: 'Updated Scenario',
        description: 'Updated description',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (scenarioService.updateScenario as jest.Mock).mockResolvedValue(mockUpdatedScenario);

      const updates = {
        name: 'Updated Scenario',
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/api/scenarios/scenario-123')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: 'scenario-123',
        name: 'Updated Scenario',
        description: 'Updated description'
      });
      expect(scenarioService.updateScenario).toHaveBeenCalledWith('scenario-123', updates);
    });
  });

  describe('DELETE /api/scenarios/:scenarioId', () => {
    it('should delete scenario successfully', async () => {
      (scenarioService.deleteScenario as jest.Mock).mockReturnValue(true);

      const response = await request(app)
        .delete('/api/scenarios/scenario-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Scenario deleted successfully');
      expect(scenarioService.deleteScenario).toHaveBeenCalledWith('scenario-123');
    });

    it('should return 404 for non-existent scenario', async () => {
      (scenarioService.deleteScenario as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .delete('/api/scenarios/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SCENARIO_NOT_FOUND');
    });
  });

  describe('POST /api/scenarios/compare', () => {
    it('should compare scenarios successfully', async () => {
      const mockComparison = {
        scenarios: [],
        results: [],
        comparison: {
          riskLevels: {},
          confidenceScores: {},
          recommendations: {},
          bestScenario: 'scenario-1',
          worstScenario: 'scenario-2'
        }
      };

      (scenarioService.compareScenarios as jest.Mock).mockResolvedValue(mockComparison);

      const response = await request(app)
        .post('/api/scenarios/compare')
        .send({ scenarioIds: ['scenario-1', 'scenario-2'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockComparison);
      expect(scenarioService.compareScenarios).toHaveBeenCalledWith(['scenario-1', 'scenario-2']);
    });

    it('should validate minimum scenario count', async () => {
      const response = await request(app)
        .post('/api/scenarios/compare')
        .send({ scenarioIds: ['scenario-1'] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('GET /api/scenarios/template/:modelId', () => {
    it('should generate scenario template successfully', async () => {
      const mockTemplate = {
        parameters: { param1: 1.0, param2: 2.0 },
        suggestedConditions: [],
        parameterRanges: {
          param1: { min: 0, max: 2, default: 1 },
          param2: { min: 0, max: 4, default: 2 }
        }
      };

      (scenarioService.generateScenarioTemplate as jest.Mock).mockResolvedValue(mockTemplate);

      const response = await request(app)
        .get('/api/scenarios/template/model-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTemplate);
      expect(scenarioService.generateScenarioTemplate).toHaveBeenCalledWith('model-123');
    });
  });
});