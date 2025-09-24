import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../middleware/validation';
import { APIResponse, Scenario } from '../../types';
import { scenarioService } from '../../services/ScenarioService';
import { logger } from '../../utils/logger';

const router = Router();

// Create scenario
router.post('/', validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenarioData = req.body as Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>;

    logger.info('Scenario creation requested:', {
      name: scenarioData.name,
      modelId: scenarioData.modelId
    });

    const scenario = await scenarioService.createScenario(scenarioData);

    const response: APIResponse = {
      success: true,
      data: scenario,
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// Execute scenario
router.post('/:scenarioId/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scenarioId } = req.params;

    logger.info('Scenario execution requested:', { scenarioId });

    const result = await scenarioService.executeScenario(scenarioId);

    const response: APIResponse = {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get scenario results (jobId is the execution job ID)
router.get('/results/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    const results = await scenarioService.getScenarioResults(jobId);

    const response: APIResponse = {
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get scenario by ID
router.get('/:scenarioId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scenarioId } = req.params;

    const scenario = scenarioService.getScenario(scenarioId);
    
    if (!scenario) {
      res.status(404).json({
        success: false,
        error: {
          code: 'SCENARIO_NOT_FOUND',
          message: `Scenario not found: ${scenarioId}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const response: APIResponse = {
      success: true,
      data: scenario,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// List scenarios
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modelId, name } = req.query;

    logger.info('Scenarios list requested:', { modelId, name });

    const scenarios = scenarioService.listScenarios({
      modelId: modelId as string,
      name: name as string
    });

    const response: APIResponse = {
      success: true,
      data: {
        scenarios,
        total: scenarios.length,
        filters: { modelId, name }
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Update scenario
router.put('/:scenarioId', validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scenarioId } = req.params;
    const updates = req.body;

    logger.info('Scenario update requested:', { scenarioId, updates });

    const updatedScenario = await scenarioService.updateScenario(scenarioId, updates);

    const response: APIResponse = {
      success: true,
      data: updatedScenario,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Delete scenario
router.delete('/:scenarioId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scenarioId } = req.params;

    logger.info('Scenario deletion requested:', { scenarioId });

    const deleted = scenarioService.deleteScenario(scenarioId);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: {
          code: 'SCENARIO_NOT_FOUND',
          message: `Scenario not found: ${scenarioId}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const response: APIResponse = {
      success: true,
      data: {
        message: 'Scenario deleted successfully',
        scenarioId
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Compare scenarios
router.post('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scenarioIds } = req.body;

    if (!Array.isArray(scenarioIds) || scenarioIds.length < 2) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'At least 2 scenario IDs are required for comparison'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    logger.info('Scenario comparison requested:', { scenarioIds });

    const comparison = await scenarioService.compareScenarios(scenarioIds);

    const response: APIResponse = {
      success: true,
      data: comparison,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Generate scenario template
router.get('/template/:modelId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modelId } = req.params;

    logger.info('Scenario template requested:', { modelId });

    const template = await scenarioService.generateScenarioTemplate(modelId);

    const response: APIResponse = {
      success: true,
      data: template,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as scenarioRoutes };