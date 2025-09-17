import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { requireRole } from '../middleware/auth';
import { fleetRoutes } from '../integrations/fleet-management';
import { blastRoutes } from '../integrations/blast-planning';
import { waterRoutes } from '../integrations/water-management';
import logger from '../utils/logger';

const router = Router();

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Fleet Management Integration Routes
router.post('/fleet/alert',
  requireRole(['admin', 'engineer', 'operator']),
  [
    body('alertId').isString().notEmpty(),
    body('riskLevel').isFloat({ min: 0, max: 1 }),
    body('affectedArea.coordinates').isArray(),
    body('affectedArea.description').isString().notEmpty(),
    body('recommendedActions').isArray(),
    body('timestamp').isISO8601()
  ],
  handleValidationErrors,
  fleetRoutes.sendAlert
);

router.post('/fleet/reroute',
  requireRole(['admin', 'engineer', 'operator']),
  [
    body('truckIds').isArray().notEmpty(),
    body('avoidanceZone.coordinates').isArray(),
    body('avoidanceZone.radius').isFloat({ min: 0 }),
    body('priority').isIn(['low', 'medium', 'high', 'critical'])
  ],
  handleValidationErrors,
  fleetRoutes.requestReroute
);

router.get('/fleet/trucks',
  requireRole(['admin', 'engineer', 'operator', 'viewer']),
  fleetRoutes.getActiveTrucks
);

router.post('/fleet/stop-operations',
  requireRole(['admin', 'engineer']),
  [
    body('zone.coordinates').isArray(),
    body('zone.description').isString().notEmpty()
  ],
  handleValidationErrors,
  fleetRoutes.stopOperations
);

// Blast Planning Integration Routes
router.post('/blast/assessment',
  requireRole(['admin', 'engineer']),
  [
    body('assessmentId').isString().notEmpty(),
    body('blastId').isString().notEmpty(),
    body('preBlastRisk').isFloat({ min: 0, max: 1 }),
    body('postBlastRisk').isFloat({ min: 0, max: 1 }),
    body('affectedSlopes').isArray(),
    body('recommendations').isArray(),
    body('timestamp').isISO8601()
  ],
  handleValidationErrors,
  blastRoutes.submitAssessment
);

router.post('/blast/optimize',
  requireRole(['admin', 'engineer']),
  [
    body('blastId').isString().notEmpty(),
    body('currentPlan').isObject(),
    body('slopeStabilityData').isObject(),
    body('constraints').isObject()
  ],
  handleValidationErrors,
  blastRoutes.requestOptimization
);

router.get('/blast/upcoming',
  requireRole(['admin', 'engineer', 'operator', 'viewer']),
  [
    query('hours').optional().isInt({ min: 1, max: 168 })
  ],
  handleValidationErrors,
  blastRoutes.getUpcomingBlasts
);

router.post('/blast/postpone',
  requireRole(['admin', 'engineer']),
  [
    body('blastId').isString().notEmpty(),
    body('reason').isString().notEmpty(),
    body('newTime').optional().isISO8601()
  ],
  handleValidationErrors,
  blastRoutes.postponeBlast
);

router.post('/blast/vibration-prediction',
  requireRole(['admin', 'engineer']),
  [
    body('blastId').isString().notEmpty(),
    body('prediction').isObject()
  ],
  handleValidationErrors,
  blastRoutes.submitVibrationPrediction
);

// Water Management Integration Routes
router.post('/water/groundwater',
  requireRole(['admin', 'engineer', 'operator']),
  [
    body('data').isArray().notEmpty(),
    body('data.*.sensorId').isString().notEmpty(),
    body('data.*.location').isObject(),
    body('data.*.measurements').isObject(),
    body('data.*.timestamp').isISO8601()
  ],
  handleValidationErrors,
  waterRoutes.submitGroundwaterData
);

router.post('/water/drainage-recommendation',
  requireRole(['admin', 'engineer']),
  [
    body('recommendationId').isString().notEmpty(),
    body('priority').isIn(['low', 'medium', 'high', 'critical']),
    body('affectedArea').isObject(),
    body('actions').isArray(),
    body('reasoning').isString().notEmpty(),
    body('expectedImpact').isObject(),
    body('timestamp').isISO8601()
  ],
  handleValidationErrors,
  waterRoutes.submitDrainageRecommendation
);

router.post('/water/pumping-control',
  requireRole(['admin', 'engineer', 'operator']),
  [
    body('stationId').isString().notEmpty(),
    body('action').isIn(['start', 'stop', 'adjust_rate']),
    body('reason').isString().notEmpty(),
    body('priority').isIn(['normal', 'urgent', 'emergency']),
    body('targetRate').optional().isFloat({ min: 0 }),
    body('duration').optional().isInt({ min: 1 })
  ],
  handleValidationErrors,
  waterRoutes.controlPumpingStation
);

router.post('/water/water-level-alert',
  requireRole(['admin', 'engineer', 'operator']),
  [
    body('alertId').isString().notEmpty(),
    body('sensorId').isString().notEmpty(),
    body('currentLevel').isFloat(),
    body('thresholdLevel').isFloat(),
    body('trend').isIn(['rising', 'falling', 'stable']),
    body('rateOfChange').isFloat(),
    body('riskAssessment').isObject()
  ],
  handleValidationErrors,
  waterRoutes.sendWaterLevelAlert
);

router.get('/water/pumping-stations',
  requireRole(['admin', 'engineer', 'operator', 'viewer']),
  waterRoutes.getActivePumpingStations
);

router.get('/water/drainage-infrastructure',
  requireRole(['admin', 'engineer', 'operator', 'viewer']),
  waterRoutes.getDrainageInfrastructure
);

router.post('/water/emergency-drainage',
  requireRole(['admin', 'engineer']),
  [
    body('area.coordinates').isArray(),
    body('area.description').isString().notEmpty()
  ],
  handleValidationErrors,
  waterRoutes.requestEmergencyDrainage
);

// Integration health check endpoints
router.get('/health/fleet', async (req, res) => {
  try {
    // Simple health check - attempt to connect to fleet management API
    const response = await fetch(`${process.env.FLEET_MANAGEMENT_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    res.json({
      service: 'fleet-management',
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime: Date.now(),
      statusCode: response.status
    });
  } catch (error) {
    logger.error('Fleet management health check failed:', error);
    res.status(503).json({
      service: 'fleet-management',
      status: 'unhealthy',
      error: 'Connection failed'
    });
  }
});

router.get('/health/blast', async (req, res) => {
  try {
    const response = await fetch(`${process.env.BLAST_PLANNING_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    res.json({
      service: 'blast-planning',
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime: Date.now(),
      statusCode: response.status
    });
  } catch (error) {
    logger.error('Blast planning health check failed:', error);
    res.status(503).json({
      service: 'blast-planning',
      status: 'unhealthy',
      error: 'Connection failed'
    });
  }
});

router.get('/health/water', async (req, res) => {
  try {
    const response = await fetch(`${process.env.WATER_MANAGEMENT_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    res.json({
      service: 'water-management',
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime: Date.now(),
      statusCode: response.status
    });
  } catch (error) {
    logger.error('Water management health check failed:', error);
    res.status(503).json({
      service: 'water-management',
      status: 'unhealthy',
      error: 'Connection failed'
    });
  }
});

// Integration status overview
router.get('/health', async (req, res) => {
  try {
    const services = ['fleet', 'blast', 'water'];
    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/integrations/health/${service}`);
        const data = await response.json();
        return { service, ...data };
      })
    );

    const results = healthChecks.map((check, index) => {
      if (check.status === 'fulfilled') {
        return check.value;
      } else {
        return {
          service: services[index],
          status: 'unhealthy',
          error: 'Health check failed'
        };
      }
    });

    const allHealthy = results.every(result => result.status === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
      overall: allHealthy ? 'healthy' : 'degraded',
      services: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Integration health overview failed:', error);
    res.status(500).json({
      overall: 'unhealthy',
      error: 'Health check system failure'
    });
  }
});

export { router as integrationsRouter };