import { Router, Request, Response } from 'express';
import { ExplanationService, ExplanationServiceConfig, BatchExplanationRequest } from '../models/ExplanationService';
import { ModelPipeline } from '../models/ModelPipeline';
import { TrainingData } from '../models/BaselineModels';

const router = Router();

// Global explanation service instance
let explanationService: ExplanationService;
let modelPipeline: ModelPipeline;

// Initialize services
const initializeServices = () => {
  if (!modelPipeline) {
    modelPipeline = new ModelPipeline();
  }
  
  if (!explanationService) {
    const config: ExplanationServiceConfig = {
      default_explanation_type: 'shap',
      num_lime_samples: 1000,
      cache_explanations: true,
      max_cache_size: 100
    };
    explanationService = new ExplanationService(modelPipeline, config);
  }
};

/**
 * POST /api/explanations/single
 * Explain a single prediction
 */
router.post('/single', async (req: Request, res: Response) => {
  try {
    initializeServices();

    const {
      model_name,
      instance,
      feature_names,
      explanation_type = 'shap'
    } = req.body;

    // Validate input
    if (!model_name || !instance || !feature_names) {
      return res.status(400).json({
        error: 'Missing required fields: model_name, instance, feature_names'
      });
    }

    if (!Array.isArray(instance) || !Array.isArray(feature_names)) {
      return res.status(400).json({
        error: 'instance and feature_names must be arrays'
      });
    }

    if (instance.length !== feature_names.length) {
      return res.status(400).json({
        error: 'instance and feature_names must have the same length'
      });
    }

    if (!['shap', 'lime', 'both'].includes(explanation_type)) {
      return res.status(400).json({
        error: 'explanation_type must be one of: shap, lime, both'
      });
    }

    // Generate explanation
    const result = await explanationService.explainPrediction(
      model_name,
      instance,
      feature_names,
      explanation_type
    );

    return res.json({
      success: true,
      data: result,
      metadata: {
        model_name,
        explanation_type,
        timestamp: new Date().toISOString(),
        feature_count: feature_names.length
      }
    });

  } catch (error) {
    console.error('Error generating explanation:', error);
    return res.status(500).json({
      error: 'Failed to generate explanation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/explanations/batch
 * Explain multiple predictions in batch
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    initializeServices();

    const batchRequest: BatchExplanationRequest = req.body;

    // Validate input
    if (!batchRequest.instances || !batchRequest.feature_names || !batchRequest.model_name) {
      return res.status(400).json({
        error: 'Missing required fields: instances, feature_names, model_name'
      });
    }

    if (!Array.isArray(batchRequest.instances) || !Array.isArray(batchRequest.feature_names)) {
      return res.status(400).json({
        error: 'instances and feature_names must be arrays'
      });
    }

    if (batchRequest.instances.length === 0) {
      return res.status(400).json({
        error: 'instances array cannot be empty'
      });
    }

    // Validate each instance
    for (let i = 0; i < batchRequest.instances.length; i++) {
      const instance = batchRequest.instances[i];
      if (!Array.isArray(instance) || instance.length !== batchRequest.feature_names.length) {
        return res.status(400).json({
          error: `Instance ${i} has invalid dimensions`
        });
      }
    }

    // Generate batch explanations
    const result = await explanationService.explainBatch(batchRequest);

    return res.json({
      success: true,
      data: result,
      metadata: {
        model_name: batchRequest.model_name,
        explanation_type: batchRequest.explanation_type || 'shap',
        timestamp: new Date().toISOString(),
        instance_count: batchRequest.instances.length,
        feature_count: batchRequest.feature_names.length,
        successful_explanations: result.explanations.length
      }
    });

  } catch (error) {
    console.error('Error generating batch explanations:', error);
    return res.status(500).json({
      error: 'Failed to generate batch explanations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/explanations/ensemble
 * Explain prediction using ensemble of models
 */
router.post('/ensemble', async (req: Request, res: Response) => {
  try {
    initializeServices();

    const {
      instance,
      feature_names,
      model_names
    } = req.body;

    // Validate input
    if (!instance || !feature_names || !model_names) {
      return res.status(400).json({
        error: 'Missing required fields: instance, feature_names, model_names'
      });
    }

    if (!Array.isArray(instance) || !Array.isArray(feature_names) || !Array.isArray(model_names)) {
      return res.status(400).json({
        error: 'instance, feature_names, and model_names must be arrays'
      });
    }

    if (instance.length !== feature_names.length) {
      return res.status(400).json({
        error: 'instance and feature_names must have the same length'
      });
    }

    if (model_names.length === 0) {
      return res.status(400).json({
        error: 'model_names array cannot be empty'
      });
    }

    // Generate ensemble explanation
    const result = await explanationService.explainEnsemble(
      instance,
      feature_names,
      model_names
    );

    return res.json({
      success: true,
      data: result,
      metadata: {
        model_names,
        timestamp: new Date().toISOString(),
        feature_count: feature_names.length,
        successful_models: Object.keys(result.individual_explanations).length
      }
    });

  } catch (error) {
    console.error('Error generating ensemble explanation:', error);
    return res.status(500).json({
      error: 'Failed to generate ensemble explanation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/explanations/operational
 * Generate explanation with operational context
 */
router.post('/operational', async (req: Request, res: Response) => {
  try {
    initializeServices();

    const {
      model_name,
      instance,
      feature_names,
      operational_context
    } = req.body;

    // Validate input
    if (!model_name || !instance || !feature_names || !operational_context) {
      return res.status(400).json({
        error: 'Missing required fields: model_name, instance, feature_names, operational_context'
      });
    }

    if (!Array.isArray(instance) || !Array.isArray(feature_names)) {
      return res.status(400).json({
        error: 'instance and feature_names must be arrays'
      });
    }

    if (instance.length !== feature_names.length) {
      return res.status(400).json({
        error: 'instance and feature_names must have the same length'
      });
    }

    // Validate operational context
    const requiredContextFields = ['location', 'current_operations', 'personnel_count', 'equipment_value'];
    for (const field of requiredContextFields) {
      if (!(field in operational_context)) {
        return res.status(400).json({
          error: `Missing required operational_context field: ${field}`
        });
      }
    }

    // Generate operational explanation
    const result = await explanationService.generateOperationalExplanation(
      model_name,
      instance,
      feature_names,
      operational_context
    );

    return res.json({
      success: true,
      data: result,
      metadata: {
        model_name,
        location: operational_context.location,
        timestamp: new Date().toISOString(),
        feature_count: feature_names.length
      }
    });

  } catch (error) {
    console.error('Error generating operational explanation:', error);
    return res.status(500).json({
      error: 'Failed to generate operational explanation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/explanations/trends
 * Analyze feature importance trends over time
 */
router.post('/trends', async (req: Request, res: Response) => {
  try {
    initializeServices();

    const {
      model_name,
      time_series_data,
      feature_names
    } = req.body;

    // Validate input
    if (!model_name || !time_series_data || !feature_names) {
      return res.status(400).json({
        error: 'Missing required fields: model_name, time_series_data, feature_names'
      });
    }

    if (!Array.isArray(time_series_data) || !Array.isArray(feature_names)) {
      return res.status(400).json({
        error: 'time_series_data and feature_names must be arrays'
      });
    }

    if (time_series_data.length === 0) {
      return res.status(400).json({
        error: 'time_series_data array cannot be empty'
      });
    }

    // Validate time series data structure
    for (let i = 0; i < time_series_data.length; i++) {
      const dataPoint = time_series_data[i];
      if (!dataPoint.timestamp || !dataPoint.features) {
        return res.status(400).json({
          error: `Time series data point ${i} missing timestamp or features`
        });
      }
      
      if (!Array.isArray(dataPoint.features) || dataPoint.features.length !== feature_names.length) {
        return res.status(400).json({
          error: `Time series data point ${i} has invalid features dimensions`
        });
      }
    }

    // Convert timestamp strings to Date objects
    const processedTimeSeriesData = time_series_data.map((dataPoint: any) => ({
      timestamp: new Date(dataPoint.timestamp),
      features: dataPoint.features
    }));

    // Generate trend analysis
    const result = await explanationService.analyzeFeatureImportanceTrends(
      model_name,
      processedTimeSeriesData,
      feature_names
    );

    return res.json({
      success: true,
      data: result,
      metadata: {
        model_name,
        timestamp: new Date().toISOString(),
        time_points: time_series_data.length,
        feature_count: feature_names.length,
        time_range: {
          start: processedTimeSeriesData[0].timestamp.toISOString(),
          end: processedTimeSeriesData[processedTimeSeriesData.length - 1].timestamp.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error analyzing trends:', error);
    return res.status(500).json({
      error: 'Failed to analyze trends',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/explanations/background-data
 * Set background data for SHAP explanations
 */
router.post('/background-data', async (req: Request, res: Response) => {
  try {
    initializeServices();

    const { features, labels, feature_names } = req.body;

    // Validate input
    if (!features || !labels || !feature_names) {
      return res.status(400).json({
        error: 'Missing required fields: features, labels, feature_names'
      });
    }

    if (!Array.isArray(features) || !Array.isArray(labels) || !Array.isArray(feature_names)) {
      return res.status(400).json({
        error: 'features, labels, and feature_names must be arrays'
      });
    }

    if (features.length !== labels.length) {
      return res.status(400).json({
        error: 'features and labels must have the same length'
      });
    }

    if (features.length === 0) {
      return res.status(400).json({
        error: 'features array cannot be empty'
      });
    }

    // Validate feature dimensions
    for (let i = 0; i < features.length; i++) {
      if (!Array.isArray(features[i]) || features[i].length !== feature_names.length) {
        return res.status(400).json({
          error: `Feature row ${i} has invalid dimensions`
        });
      }
    }

    const backgroundData: TrainingData = {
      features,
      labels,
      feature_names
    };

    explanationService.setBackgroundData(backgroundData);

    return res.json({
      success: true,
      message: 'Background data set successfully',
      metadata: {
        sample_count: features.length,
        feature_count: feature_names.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error setting background data:', error);
    return res.status(500).json({
      error: 'Failed to set background data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/explanations/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', (_req: Request, res: Response) => {
  try {
    initializeServices();

    const stats = explanationService.getCacheStats();

    return res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting cache stats:', error);
    return res.status(500).json({
      error: 'Failed to get cache statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/explanations/cache
 * Clear explanation cache
 */
router.delete('/cache', (_req: Request, res: Response) => {
  try {
    initializeServices();

    explanationService.clearCache();

    return res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    return res.status(500).json({
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/explanations/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  try {
    initializeServices();

    return res.json({
      success: true,
      status: 'healthy',
      services: {
        explanation_service: 'running',
        model_pipeline: 'running'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;