import { Router, Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../middleware/validation';
import { ModelTrainingError } from '../../errors/DataScienceErrors';
import { APIResponse, ModelConfiguration, ValidationResult } from '../../types';
import { aiPipelineClient } from '../../services/aiPipelineClient';
import { logger } from '../../utils/logger';

const router = Router();

// Validate model configuration
router.post('/validate-config', validateRequest, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { configuration } = req.body as { configuration: ModelConfiguration };

        if (!configuration) {
            throw new ModelTrainingError(['Missing configuration parameter']);
        }

        // Validate configuration
        const validation = validateModelConfiguration(configuration);

        const response: APIResponse = {
            success: true,
            data: validation,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get available model types and their default configurations
router.get('/types', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const modelTypes = getAvailableModelTypes();

        const response: APIResponse = {
            success: true,
            data: {
                modelTypes
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Start model training
router.post('/train', validateRequest, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { dataId, configuration } = req.body as { dataId: string; configuration: ModelConfiguration };

        if (!dataId || !configuration) {
            throw new ModelTrainingError(['Missing required parameters: dataId or configuration']);
        }

        // Validate configuration before training
        const validation = validateModelConfiguration(configuration);
        if (!validation.isValid) {
            throw new ModelTrainingError(validation.errors.map(e => e.message));
        }

        logger.info('Model training requested:', {
            dataId,
            modelType: configuration.modelType,
            useAutoOptimization: configuration.optimizationConfig.useAutoOptimization,
            trainTestSplit: configuration.trainingConfig.trainTestSplit,
            validationStrategy: configuration.trainingConfig.validationStrategy
        });

        // Start training in AI Pipeline
        const result = await aiPipelineClient.trainModel(dataId, configuration);

        const response: APIResponse = {
            success: true,
            data: {
                trainingJobId: result.trainingJobId,
                estimatedDuration: result.estimatedDuration,
                configuration
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get training progress
router.get('/train/:trainingJobId/progress', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { trainingJobId } = req.params;

        // Get progress from AI Pipeline
        const progress = await aiPipelineClient.getTrainingProgress(trainingJobId);

        const response: APIResponse = {
            success: true,
            data: progress,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get training results
router.get('/train/:trainingJobId/results', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { trainingJobId } = req.params;

        // Get results from AI Pipeline
        const results = await aiPipelineClient.getTrainingResults(trainingJobId);

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

// Get model by ID
router.get('/:modelId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelId } = req.params;

        // TODO: Implement model retrieval from database
        const response: APIResponse = {
            success: true,
            data: {
                id: modelId,
                name: `Model ${modelId}`,
                // Add other model properties
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// List models
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        // Get models from AI Pipeline
        const models = await aiPipelineClient.getModels();

        const response: APIResponse = {
            success: true,
            data: {
                models,
                total: models.length
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Delete model
router.delete('/:modelId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelId } = req.params;

        logger.info('Model deletion requested:', { modelId });

        // Delete from AI Pipeline
        await aiPipelineClient.deleteModel(modelId);

        const response: APIResponse = {
            success: true,
            data: {
                message: 'Model deleted successfully',
                modelId
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Make predictions
router.post('/:modelId/predict', validateRequest, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelId } = req.params;
        const { inputData } = req.body;

        logger.info('Prediction requested:', { modelId, inputCount: inputData?.length });

        // Make prediction using AI Pipeline
        const predictions = await aiPipelineClient.predict(modelId, inputData);

        const response: APIResponse = {
            success: true,
            data: predictions,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get feature importance
router.get('/:modelId/feature-importance', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelId } = req.params;

        // Get feature importance from AI Pipeline
        const featureImportance = await aiPipelineClient.getFeatureImportance(modelId);

        const response: APIResponse = {
            success: true,
            data: {
                featureImportance
            },
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get comprehensive analytics for a model
router.get('/:modelId/analytics', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelId } = req.params;

        logger.info('Analytics requested for model:', { modelId });

        // Get analytics data from AI Pipeline
        const analytics = await aiPipelineClient.getModelAnalytics(modelId);

        const response: APIResponse = {
            success: true,
            data: analytics,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get model performance metrics
router.get('/:modelId/metrics', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelId } = req.params;

        // Get performance metrics from AI Pipeline
        const metrics = await aiPipelineClient.getModelMetrics(modelId);

        const response: APIResponse = {
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get data distributions for a model's dataset
router.get('/:modelId/data-distributions', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelId } = req.params;

        // Get data distributions from AI Pipeline
        const distributions = await aiPipelineClient.getDataDistributions(modelId);

        const response: APIResponse = {
            success: true,
            data: distributions,
            timestamp: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Compare multiple models
router.post('/compare', validateRequest, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelIds } = req.body as { modelIds: string[] };

        if (!modelIds || !Array.isArray(modelIds) || modelIds.length < 2) {
            throw new ModelTrainingError(['At least 2 model IDs required for comparison']);
        }

        logger.info('Model comparison requested:', { modelIds });

        // Get comparison data from AI Pipeline
        const comparison = await aiPipelineClient.compareModels(modelIds);

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

// Export analytics data
router.get('/:modelId/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { modelId } = req.params;
        const { format = 'json' } = req.query as { format?: 'json' | 'csv' | 'excel' };

        logger.info('Analytics export requested:', { modelId, format });

        // Get export data from AI Pipeline
        const exportData = await aiPipelineClient.exportAnalytics(modelId, format);

        if (format === 'json') {
            const response: APIResponse = {
                success: true,
                data: exportData,
                timestamp: new Date().toISOString()
            };
            res.json(response);
        } else {
            // For CSV/Excel, return the file directly
            res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="analytics_${modelId}.${format}"`);
            res.send(exportData);
        }
    } catch (error) {
        next(error);
    }
});

// Helper functions for model configuration validation and defaults
function validateModelConfiguration(config: ModelConfiguration): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate model type
    const validModelTypes = ['random_forest', 'xgboost', 'neural_network', 'ensemble'];
    if (!validModelTypes.includes(config.modelType)) {
        errors.push({
            field: 'modelType',
            message: `Invalid model type. Must be one of: ${validModelTypes.join(', ')}`,
            code: 'INVALID_MODEL_TYPE',
            value: config.modelType
        });
    }

    // Validate training configuration
    if (config.trainingConfig.trainTestSplit < 0.1 || config.trainingConfig.trainTestSplit > 0.9) {
        errors.push({
            field: 'trainingConfig.trainTestSplit',
            message: 'Train/test split must be between 0.1 and 0.9',
            code: 'INVALID_SPLIT_RATIO',
            value: config.trainingConfig.trainTestSplit
        });
    }

    // Validate cross-validation folds if using k_fold
    if (config.trainingConfig.validationStrategy === 'k_fold') {
        if (!config.trainingConfig.crossValidationFolds || config.trainingConfig.crossValidationFolds < 2) {
            errors.push({
                field: 'trainingConfig.crossValidationFolds',
                message: 'Cross-validation folds must be at least 2 for k_fold validation',
                code: 'INVALID_CV_FOLDS',
                value: config.trainingConfig.crossValidationFolds
            });
        }
    }

    // Validate hyperparameters based on model type
    const hyperparameterValidation = validateHyperparameters(config.modelType, config.hyperparameters);
    errors.push(...hyperparameterValidation.errors);
    warnings.push(...hyperparameterValidation.warnings);

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

function validateHyperparameters(modelType: string, hyperparameters: { [key: string]: any }): { errors: any[], warnings: any[] } {
    const errors: any[] = [];
    const warnings: any[] = [];

    switch (modelType) {
        case 'random_forest':
            if (hyperparameters.n_estimators && (hyperparameters.n_estimators < 10 || hyperparameters.n_estimators > 1000)) {
                warnings.push({
                    field: 'hyperparameters.n_estimators',
                    message: 'n_estimators outside recommended range (10-1000)',
                    code: 'HYPERPARAMETER_WARNING',
                    value: hyperparameters.n_estimators
                });
            }
            if (hyperparameters.max_depth && hyperparameters.max_depth > 50) {
                warnings.push({
                    field: 'hyperparameters.max_depth',
                    message: 'max_depth very high, may cause overfitting',
                    code: 'HYPERPARAMETER_WARNING',
                    value: hyperparameters.max_depth
                });
            }
            break;

        case 'xgboost':
            if (hyperparameters.learning_rate && (hyperparameters.learning_rate <= 0 || hyperparameters.learning_rate > 1)) {
                errors.push({
                    field: 'hyperparameters.learning_rate',
                    message: 'learning_rate must be between 0 and 1',
                    code: 'INVALID_HYPERPARAMETER',
                    value: hyperparameters.learning_rate
                });
            }
            break;

        case 'neural_network':
            if (hyperparameters.hidden_layers && !Array.isArray(hyperparameters.hidden_layers)) {
                errors.push({
                    field: 'hyperparameters.hidden_layers',
                    message: 'hidden_layers must be an array of integers',
                    code: 'INVALID_HYPERPARAMETER',
                    value: hyperparameters.hidden_layers
                });
            }
            break;
    }

    return { errors, warnings };
}

function getAvailableModelTypes() {
    return [
        {
            type: 'random_forest',
            name: 'Random Forest',
            description: 'Ensemble method using multiple decision trees. Good for most tabular data problems.',
            defaultHyperparameters: {
                n_estimators: 100,
                max_depth: null,
                min_samples_split: 2,
                min_samples_leaf: 1,
                random_state: 42
            },
            hyperparameterRanges: {
                n_estimators: { min: 10, max: 1000, step: 10 },
                max_depth: { min: 1, max: 50, step: 1 },
                min_samples_split: { min: 2, max: 20, step: 1 },
                min_samples_leaf: { min: 1, max: 20, step: 1 }
            },
            pros: ['Handles mixed data types', 'Resistant to overfitting', 'Feature importance'],
            cons: ['Can be slow on large datasets', 'Less interpretable than single trees']
        },
        {
            type: 'xgboost',
            name: 'XGBoost',
            description: 'Gradient boosting framework optimized for speed and performance.',
            defaultHyperparameters: {
                n_estimators: 100,
                learning_rate: 0.1,
                max_depth: 6,
                subsample: 1.0,
                colsample_bytree: 1.0,
                random_state: 42
            },
            hyperparameterRanges: {
                n_estimators: { min: 50, max: 1000, step: 50 },
                learning_rate: { min: 0.01, max: 0.3, step: 0.01 },
                max_depth: { min: 3, max: 15, step: 1 },
                subsample: { min: 0.5, max: 1.0, step: 0.1 },
                colsample_bytree: { min: 0.5, max: 1.0, step: 0.1 }
            },
            pros: ['High performance', 'Handles missing values', 'Built-in regularization'],
            cons: ['Requires hyperparameter tuning', 'Can overfit with small datasets']
        },
        {
            type: 'neural_network',
            name: 'Neural Network',
            description: 'Multi-layer perceptron for complex pattern recognition.',
            defaultHyperparameters: {
                hidden_layers: [100, 50],
                activation: 'relu',
                learning_rate: 0.001,
                batch_size: 32,
                epochs: 100,
                dropout: 0.2,
                random_state: 42
            },
            hyperparameterRanges: {
                learning_rate: { min: 0.0001, max: 0.1, step: 0.0001 },
                batch_size: { options: [16, 32, 64, 128] },
                epochs: { min: 50, max: 500, step: 50 },
                dropout: { min: 0.0, max: 0.5, step: 0.1 }
            },
            pros: ['Handles complex patterns', 'Flexible architecture', 'Good for large datasets'],
            cons: ['Requires more data', 'Longer training time', 'Less interpretable']
        },
        {
            type: 'ensemble',
            name: 'Ensemble',
            description: 'Combines multiple models for improved performance and robustness.',
            defaultHyperparameters: {
                models: ['random_forest', 'xgboost'],
                voting: 'soft',
                weights: null
            },
            hyperparameterRanges: {
                voting: { options: ['hard', 'soft'] }
            },
            pros: ['Best overall performance', 'Reduces overfitting', 'Robust predictions'],
            cons: ['Longer training time', 'More complex', 'Harder to interpret']
        }
    ];
}

export { router as modelRoutes };