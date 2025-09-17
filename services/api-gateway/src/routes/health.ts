import { Router } from 'express';
import { createClient } from 'redis';
import { config } from '../config';
import logger from '../utils/logger';

const router = Router();
const redisClient = createClient({ url: config.redis.url });

// Health check endpoint
router.get('/', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    services: {
      redis: 'unknown',
      dataIngestion: 'unknown',
      digitalTwin: 'unknown',
      aiPipeline: 'unknown',
      alertManagement: 'unknown',
      userManagement: 'unknown'
    }
  };
  
  try {
    // Check Redis connection
    await redisClient.ping();
    healthCheck.services.redis = 'healthy';
  } catch (error) {
    healthCheck.services.redis = 'unhealthy';
    healthCheck.status = 'degraded';
  }
  
  // Check downstream services
  const serviceChecks = Object.entries(config.services).map(async ([name, url]) => {
    try {
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        timeout: 5000 
      });
      
      if (response.ok) {
        healthCheck.services[name as keyof typeof healthCheck.services] = 'healthy';
      } else {
        healthCheck.services[name as keyof typeof healthCheck.services] = 'unhealthy';
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.services[name as keyof typeof healthCheck.services] = 'unhealthy';
      healthCheck.status = 'degraded';
    }
  });
  
  await Promise.all(serviceChecks);
  
  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await redisClient.ping();
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Critical dependencies unavailable'
    });
  }
});

// Liveness check
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export { router as healthRouter };