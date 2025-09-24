import { ScenarioService } from '../../services/ScenarioService';

// Mock the AI pipeline client
jest.mock('../../services/aiPipelineClient', () => ({
  aiPipelineClient: {
    executeScenario: jest.fn().mockResolvedValue({
      jobId: 'test-job-123',
      estimatedDuration: 120
    }),
    getScenarioResults: jest.fn().mockResolvedValue({
      scenarioId: 'test-scenario-123',
      predictions: [
        {
          id: 'pred-1',
          input: { param1: 1.0, param2: 2.0 },
          prediction: 0.75,
          confidence: 0.85,
          timestamp: new Date()
        }
      ],
      confidence: 0.85,
      featureImportance: {
        param1: 0.6,
        param2: 0.4
      },
      basePrediction: 0.5,
      parameters: {
        param1: 1.0,
        param2: 2.0
      }
    }),
    getModelAnalytics: jest.fn().mockResolvedValue({
      featureImportance: {
        param1: 0.6,
        param2: 0.4,
        param3: 0.2
      },
      dataDistributions: {
        numerical: {
          param1: {
            statistics: { mean: 1.0, std: 0.5 }
          },
          param2: {
            statistics: { mean: 2.0, std: 1.0 }
          }
        }
      }
    })
  }
}));

describe('ScenarioService', () => {
  let scenarioService: ScenarioService;

  beforeEach(() => {
    scenarioService = new ScenarioService();
  });

  describe('createScenario', () => {
    it('should create a valid scenario', async () => {
      const scenarioData = {
        name: 'Test Scenario',
        description: 'A test scenario for unit testing',
        modelId: 'model-123',
        parameters: { param1: 1.0, param2: 2.0 },
        conditions: [
          {
            parameter: 'param1',
            operator: 'greater_than' as const,
            value: 0.5,
            weight: 1.0
          }
        ]
      };

      const scenario = await scenarioService.createScenario(scenarioData);

      expect(scenario).toMatchObject({
        name: 'Test Scenario',
        description: 'A test scenario for unit testing',
        modelId: 'model-123',
        parameters: { param1: 1.0, param2: 2.0 }
      });
      expect(scenario.id).toBeDefined();
      expect(scenario.createdAt).toBeInstanceOf(Date);
      expect(scenario.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid scenario data', async () => {
      const invalidScenarioData = {
        name: '', // Empty name should cause validation error
        description: 'Invalid scenario',
        modelId: 'model-123',
        parameters: {},
        conditions: []
      };

      await expect(scenarioService.createScenario(invalidScenarioData))
        .rejects.toThrow('Scenario validation failed');
    });

    it('should validate required fields', async () => {
      const scenarioWithoutName = {
        description: 'Test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      };

      await expect(scenarioService.createScenario(scenarioWithoutName as any))
        .rejects.toThrow('Scenario name is required');
    });

    it('should validate conditions', async () => {
      const scenarioWithInvalidCondition = {
        name: 'Test Scenario',
        description: 'Test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: [
          {
            parameter: '', // Empty parameter should cause validation error
            operator: 'greater_than' as const,
            value: 0.5
          }
        ]
      };

      await expect(scenarioService.createScenario(scenarioWithInvalidCondition))
        .rejects.toThrow('Condition parameter is required');
    });
  });

  describe('executeScenario', () => {
    it('should execute a scenario successfully', async () => {
      // First create a scenario
      const scenarioData = {
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0, param2: 2.0 },
        conditions: []
      };

      const scenario = await scenarioService.createScenario(scenarioData);
      
      // Then execute it
      const result = await scenarioService.executeScenario(scenario.id);

      expect(result).toEqual({
        jobId: 'test-job-123',
        estimatedDuration: 120
      });
    });

    it('should throw error for non-existent scenario', async () => {
      await expect(scenarioService.executeScenario('non-existent-id'))
        .rejects.toThrow('Scenario not found: non-existent-id');
    });
  });

  describe('getScenarioResults', () => {
    it('should process and return scenario results', async () => {
      const results = await scenarioService.getScenarioResults('test-job-123');

      expect(results).toMatchObject({
        scenarioId: 'test-scenario-123',
        confidence: 0.85
      });
      expect(results.predictions).toHaveLength(1);
      expect(results.riskAssessment).toBeDefined();
      expect(results.sensitivity).toBeDefined();
      expect(results.recommendations).toBeDefined();
      expect(results.executedAt).toBeInstanceOf(Date);
    });
  });

  describe('listScenarios', () => {
    it('should return empty list initially', () => {
      const scenarios = scenarioService.listScenarios();
      expect(scenarios).toEqual([]);
    });

    it('should return created scenarios', async () => {
      const scenarioData = {
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      };

      await scenarioService.createScenario(scenarioData);
      const scenarios = scenarioService.listScenarios();

      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Test Scenario');
    });

    it('should filter scenarios by modelId', async () => {
      const scenario1Data = {
        name: 'Scenario 1',
        description: 'First scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      };

      const scenario2Data = {
        name: 'Scenario 2',
        description: 'Second scenario',
        modelId: 'model-456',
        parameters: { param1: 2.0 },
        conditions: []
      };

      await scenarioService.createScenario(scenario1Data);
      await scenarioService.createScenario(scenario2Data);

      const filteredScenarios = scenarioService.listScenarios({ modelId: 'model-123' });
      expect(filteredScenarios).toHaveLength(1);
      expect(filteredScenarios[0].name).toBe('Scenario 1');
    });
  });

  describe('updateScenario', () => {
    it('should update scenario successfully', async () => {
      const scenarioData = {
        name: 'Original Name',
        description: 'Original description',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      };

      const scenario = await scenarioService.createScenario(scenarioData);
      
      const updates = {
        name: 'Updated Name',
        description: 'Updated description'
      };

      const updatedScenario = await scenarioService.updateScenario(scenario.id, updates);

      expect(updatedScenario.name).toBe('Updated Name');
      expect(updatedScenario.description).toBe('Updated description');
      expect(updatedScenario.updatedAt.getTime()).toBeGreaterThanOrEqual(scenario.updatedAt.getTime());
    });

    it('should throw error for non-existent scenario', async () => {
      await expect(scenarioService.updateScenario('non-existent-id', { name: 'New Name' }))
        .rejects.toThrow('Scenario not found: non-existent-id');
    });
  });

  describe('deleteScenario', () => {
    it('should delete scenario successfully', async () => {
      const scenarioData = {
        name: 'Test Scenario',
        description: 'A test scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      };

      const scenario = await scenarioService.createScenario(scenarioData);
      const deleted = scenarioService.deleteScenario(scenario.id);

      expect(deleted).toBe(true);
      expect(scenarioService.getScenario(scenario.id)).toBeUndefined();
    });

    it('should return false for non-existent scenario', () => {
      const deleted = scenarioService.deleteScenario('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('generateScenarioTemplate', () => {
    it('should generate scenario template from model analytics', async () => {
      const template = await scenarioService.generateScenarioTemplate('model-123');

      expect(template).toMatchObject({
        parameters: expect.any(Object),
        suggestedConditions: expect.any(Array),
        parameterRanges: expect.any(Object)
      });

      // Check that parameters are set based on feature importance
      expect(Object.keys(template.parameters)).toContain('param1');
      expect(Object.keys(template.parameters)).toContain('param2');
      
      // Check parameter ranges are calculated
      expect(template.parameterRanges.param1).toMatchObject({
        min: expect.any(Number),
        max: expect.any(Number),
        default: expect.any(Number)
      });
    });
  });

  describe('compareScenarios', () => {
    it('should compare multiple scenarios', async () => {
      // Create two scenarios
      const scenario1Data = {
        name: 'Scenario 1',
        description: 'First scenario',
        modelId: 'model-123',
        parameters: { param1: 1.0 },
        conditions: []
      };

      const scenario2Data = {
        name: 'Scenario 2',
        description: 'Second scenario',
        modelId: 'model-123',
        parameters: { param1: 2.0 },
        conditions: []
      };

      const scenario1 = await scenarioService.createScenario(scenario1Data);
      const scenario2 = await scenarioService.createScenario(scenario2Data);

      // Mock scenario results (normally would be set after execution)
      const mockResults1 = {
        scenarioId: scenario1.id,
        predictions: [],
        riskAssessment: { overallRisk: 'low' as const, riskScore: 0.3, factors: [], recommendations: [], validUntil: new Date() },
        confidence: 0.8,
        sensitivity: { parameters: [], mostSensitiveParameters: [], stabilityScore: 0.9 },
        recommendations: [],
        executedAt: new Date()
      };

      const mockResults2 = {
        scenarioId: scenario2.id,
        predictions: [],
        riskAssessment: { overallRisk: 'high' as const, riskScore: 0.7, factors: [], recommendations: [], validUntil: new Date() },
        confidence: 0.9,
        sensitivity: { parameters: [], mostSensitiveParameters: [], stabilityScore: 0.8 },
        recommendations: [],
        executedAt: new Date()
      };

      // Manually set results for testing
      (scenarioService as any).scenarioResults.set(scenario1.id, mockResults1);
      (scenarioService as any).scenarioResults.set(scenario2.id, mockResults2);

      const comparison = await scenarioService.compareScenarios([scenario1.id, scenario2.id]);

      expect(comparison.scenarios).toHaveLength(2);
      expect(comparison.results).toHaveLength(2);
      expect(comparison.comparison.bestScenario).toBe(scenario1.id); // Lower risk
      expect(comparison.comparison.worstScenario).toBe(scenario2.id); // Higher risk
    });

    it('should throw error for non-existent scenarios', async () => {
      await expect(scenarioService.compareScenarios(['non-existent-1', 'non-existent-2']))
        .rejects.toThrow('Some scenarios not found');
    });
  });
});