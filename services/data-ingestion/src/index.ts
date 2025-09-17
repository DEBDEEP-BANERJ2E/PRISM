import express from 'express';
import cors from 'cors';
import { config } from './config';
import { DataIngestionService } from './services/DataIngestionService';
import { healthRouter } from './routes/health';
import logger from './utils/logger';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize data ingestion service
const dataIngestionService = new DataIngestionService();

// Health check routes
app.use('/health', healthRouter);

// Data ingestion routes
app.use('/api/v1/ingest', dataIngestionService.getHTTPService().createRouter());
app.use('/api/v1/lorawan', dataIngestionService.getLoRaWANService().createRouter());

// Service status endpoint
app.get('/api/v1/status', (req, res) => {
  const health = dataIngestionService.getHealthStatus();
  const stats = dataIngestionService.getAggregatedStats();
  const cacheStats = dataIngestionService.getValidatorCacheStats();

  res.json({
    health,
    stats,
    cacheStats,
    timestamp: new Date().toISOString()
  });
});

// Test connectivity endpoint
app.get('/api/v1/test-connectivity', async (req, res) => {
  try {
    const connectivity = await dataIngestionService.testConnectivity();
    res.json({
      status: 'success',
      connectivity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error testing connectivity', { error });
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send test messages endpoint (for development/testing)
app.post('/api/v1/test-messages', async (req, res) => {
  try {
    const results = await dataIngestionService.sendTestMessages();
    res.json({
      status: 'success',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error sending test messages', { error });
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack, url: req.url });
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize data ingestion service
    await dataIngestionService.initialize();
    logger.info('Data ingestion service initialized successfully');

    // Start HTTP server
    const port = config.port;
    const server = app.listen(port, () => {
      logger.info(`PRISM Data Ingestion Service listening on port ${port}`, {
        environment: config.nodeEnv,
        endpoints: {
          health: `/health`,
          ingest: `/api/v1/ingest`,
          lorawan: `/api/v1/lorawan`,
          status: `/api/v1/status`
        }
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      server.close(async () => {
        try {
          await dataIngestionService.shutdown();
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', { error });
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;