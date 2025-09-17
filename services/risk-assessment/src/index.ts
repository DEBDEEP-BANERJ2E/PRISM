import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import { RiskAssessmentService } from './services/RiskAssessmentService';
import { SpatialContext } from './types';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Initialize spatial context (in real implementation, load from database)
const initialSpatialContext: SpatialContext = {
  slope_segments: [
    {
      id: 'segment_001',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]
      },
      slope_angle: 45,
      aspect: 180,
      curvature: 0.1,
      rock_type: 'limestone',
      joint_orientation: [45, 135],
      stability_rating: 0.7
    }
  ],
  geological_features: [],
  infrastructure: [
    {
      id: 'road_001',
      type: 'road',
      geometry: {
        type: 'LineString',
        coordinates: [[50, 0], [50, 200]]
      },
      value: 500000,
      personnel_count: 0
    }
  ]
};

// Initialize risk assessment service
const riskAssessmentService = new RiskAssessmentService(logger, initialSpatialContext);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await riskAssessmentService.getHealthStatus();
    const statusCode = health.isHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await riskAssessmentService.getServiceMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// Manual prediction endpoint for testing
app.post('/predict', async (req, res) => {
  try {
    const { sensor_data } = req.body;
    
    if (!sensor_data || !Array.isArray(sensor_data)) {
      return res.status(400).json({ error: 'sensor_data array is required' });
    }

    const startTime = Date.now();
    const prediction = await riskAssessmentService.generateManualPrediction(sensor_data);
    const processingTime = Date.now() - startTime;

    prediction.processing_time_ms = processingTime;

    res.json(prediction);
  } catch (error) {
    logger.error('Manual prediction error:', error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await riskAssessmentService.stop();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    // Start risk assessment service
    await riskAssessmentService.start();

    // Start HTTP server
    app.listen(config.port, () => {
      logger.info(`Risk Assessment Service listening on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  startServer();
}

export { app, riskAssessmentService };