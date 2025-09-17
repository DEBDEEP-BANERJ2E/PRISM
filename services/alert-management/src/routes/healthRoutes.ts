import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'alert-management',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * Readiness check endpoint
 * GET /health/ready
 */
router.get('/ready', (req: Request, res: Response) => {
  // In a real implementation, you would check:
  // - Database connectivity
  // - Kafka connectivity
  // - Redis connectivity
  // - External service dependencies
  
  const checks = {
    database: 'healthy', // Would check actual database connection
    kafka: 'healthy',    // Would check Kafka connection
    redis: 'healthy',    // Would check Redis connection
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };
  
  const isReady = Object.values(checks).every(check => 
    typeof check === 'string' ? check === 'healthy' : true
  );
  
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString()
  });
});

/**
 * Liveness check endpoint
 * GET /health/live
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export { router as healthRoutes };