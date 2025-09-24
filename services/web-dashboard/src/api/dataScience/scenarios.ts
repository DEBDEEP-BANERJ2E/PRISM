import { APIResponse, Scenario, ScenarioResults } from '../../types/dataScience';

const API_BASE_URL = import.meta.env.VITE_DATA_SCIENCE_API_URL || 'http://localhost:3001';

import { Router } from 'express';

const router = Router();

// Create a new scenario
router.post('/', async (req, res, next) => {
  try {
    const { scenarioData } = req.body;
    const response = await scenarioRoutes.createScenario(scenarioData);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Execute a scenario
router.post('/:scenarioId/execute', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const response = await scenarioRoutes.executeScenario(scenarioId);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get scenario execution results
router.get('/results/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const response = await scenarioRoutes.getScenarioResults(jobId);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get scenario by ID
router.get('/:scenarioId', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const response = await scenarioRoutes.getScenario(scenarioId);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// List scenarios with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const filters = req.query;
    const response = await scenarioRoutes.listScenarios(filters);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Update scenario
router.put('/:scenarioId', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { updates } = req.body;
    const response = await scenarioRoutes.updateScenario(scenarioId, updates);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Delete scenario
router.delete('/:scenarioId', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const response = await scenarioRoutes.deleteScenario(scenarioId);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Compare multiple scenarios
router.post('/compare', async (req, res, next) => {
  try {
    const { scenarioIds } = req.body;
    const response = await scenarioRoutes.compareScenarios(scenarioIds);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Generate scenario template based on model parameters
router.get('/template/:modelId', async (req, res, next) => {
  try {
    const { modelId } = req.params;
    const response = await scenarioRoutes.getScenarioTemplate(modelId);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as scenarioRouter };

// Scenario API client
class ScenarioAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    const url = `${API_BASE_URL}/api/scenarios${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async createScenario(scenarioData: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIResponse<Scenario>> {
    return this.request<Scenario>('/', {
      method: 'POST',
      body: JSON.stringify(scenarioData),
    });
  }

  async executeScenario(scenarioId: string): Promise<APIResponse<{ jobId: string; estimatedDuration: number }>> {
    return this.request<{ jobId: string; estimatedDuration: number }>(`/${scenarioId}/execute`, {
      method: 'POST',
    });
  }

  async getScenarioResults(jobId: string): Promise<APIResponse<ScenarioResults>> {
    return this.request<ScenarioResults>(`/results/${jobId}`);
  }

  async getScenario(scenarioId: string): Promise<APIResponse<Scenario>> {
    return this.request<Scenario>(`/${scenarioId}`);
  }

  async listScenarios(filters?: { modelId?: string; name?: string }): Promise<APIResponse<{
    scenarios: Scenario[];
    total: number;
    filters?: { modelId?: string; name?: string };
  }>> {
    const params = new URLSearchParams();
    if (filters?.modelId) params.append('modelId', filters.modelId);
    if (filters?.name) params.append('name', filters.name);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/?${queryString}` : '/';
    
    return this.request<{
      scenarios: Scenario[];
      total: number;
      filters?: { modelId?: string; name?: string };
    }>(endpoint);
  }

  async updateScenario(scenarioId: string, updates: Partial<Omit<Scenario, 'id' | 'createdAt'>>): Promise<APIResponse<Scenario>> {
    return this.request<Scenario>(`/${scenarioId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteScenario(scenarioId: string): Promise<APIResponse<{ message: string; scenarioId: string }>> {
    return this.request<{ message: string; scenarioId: string }>(`/${scenarioId}`, {
      method: 'DELETE',
    });
  }

  async compareScenarios(scenarioIds: string[]): Promise<APIResponse<{
    scenarios: Scenario[];
    results: ScenarioResults[];
    comparison: {
      riskLevels: { [scenarioId: string]: string };
      confidenceScores: { [scenarioId: string]: number };
      recommendations: { [scenarioId: string]: string[] };
      bestScenario: string;
      worstScenario: string;
    };
  }>> {
    return this.request<{
      scenarios: Scenario[];
      results: ScenarioResults[];
      comparison: {
        riskLevels: { [scenarioId: string]: string };
        confidenceScores: { [scenarioId: string]: number };
        recommendations: { [scenarioId: string]: string[] };
        bestScenario: string;
        worstScenario: string;
      };
    }>('/compare', {
      method: 'POST',
      body: JSON.stringify({ scenarioIds }),
    });
  }

  async getScenarioTemplate(modelId: string): Promise<APIResponse<{
    parameters: { [key: string]: any };
    suggestedConditions: any[];
    parameterRanges: { [key: string]: { min: any; max: any; default: any } };
  }>> {
    return this.request<{
      parameters: { [key: string]: any };
      suggestedConditions: any[];
      parameterRanges: { [key: string]: { min: any; max: any; default: any } };
    }>(`/template/${modelId}`);
  }
}

export const scenarioRoutes = new ScenarioAPI();
export const scenarioAPI = scenarioRoutes;