import { Router, Request, Response } from 'express';
import { AlertManagementService, AlertFilter } from '../services/AlertManagementService';
import { AlertInput } from '@prism/shared-models/risk';
import { logger } from '../utils/logger';

export function alertRoutes(alertService: AlertManagementService): Router {
  const router = Router();

  /**
   * Create a new alert
   * POST /api/alerts
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const alertInput: AlertInput = req.body;
      
      // Validate required fields
      if (!alertInput.alert_id || !alertInput.alert_type || !alertInput.severity || 
          !alertInput.title || !alertInput.message || !alertInput.triggered_at) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['alert_id', 'alert_type', 'severity', 'title', 'message', 'triggered_at']
        });
      }

      const alert = await alertService.createAlert(alertInput);
      
      res.status(201).json({
        success: true,
        data: alert.toJSON()
      });
    } catch (error) {
      logger.error('Error creating alert:', error);
      res.status(500).json({
        error: 'Failed to create alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get alerts with filtering and pagination
   * GET /api/alerts
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      // Build filter from query parameters
      const filter: AlertFilter = {};
      
      if (req.query.status) {
        filter.status = Array.isArray(req.query.status) 
          ? req.query.status as any[]
          : [req.query.status as any];
      }
      
      if (req.query.severity) {
        filter.severity = Array.isArray(req.query.severity)
          ? req.query.severity as any[]
          : [req.query.severity as any];
      }
      
      if (req.query.alertType) {
        filter.alertType = Array.isArray(req.query.alertType)
          ? req.query.alertType as any[]
          : [req.query.alertType as any];
      }
      
      if (req.query.startDate) {
        filter.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filter.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.sourceId) {
        filter.sourceId = req.query.sourceId as string;
      }
      
      if (req.query.acknowledged !== undefined) {
        filter.acknowledged = req.query.acknowledged === 'true';
      }
      
      if (req.query.resolved !== undefined) {
        filter.resolved = req.query.resolved === 'true';
      }
      
      if (req.query.suppressed !== undefined) {
        filter.suppressed = req.query.suppressed === 'true';
      }
      
      if (req.query.tags) {
        filter.tags = Array.isArray(req.query.tags)
          ? req.query.tags as string[]
          : [req.query.tags as string];
      }
      
      // Location filter
      if (req.query.lat && req.query.lon && req.query.radius) {
        filter.location = {
          latitude: parseFloat(req.query.lat as string),
          longitude: parseFloat(req.query.lon as string),
          radius: parseFloat(req.query.radius as string)
        };
      }

      const result = await alertService.getAlerts(filter, page, limit);
      
      res.json({
        success: true,
        data: result.alerts.map(alert => alert.toJSON()),
        pagination: {
          page: result.page,
          limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      logger.error('Error getting alerts:', error);
      res.status(500).json({
        error: 'Failed to get alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get alert by ID
   * GET /api/alerts/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const alertId = req.params.id;
      const alert = await alertService.getAlerts({ sourceId: alertId }, 1, 1);
      
      if (alert.alerts.length === 0) {
        return res.status(404).json({
          error: 'Alert not found',
          alertId
        });
      }
      
      res.json({
        success: true,
        data: alert.alerts[0].toJSON()
      });
    } catch (error) {
      logger.error('Error getting alert by ID:', error);
      res.status(500).json({
        error: 'Failed to get alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Acknowledge an alert
   * POST /api/alerts/:id/acknowledge
   */
  router.post('/:id/acknowledge', async (req: Request, res: Response) => {
    try {
      const alertId = req.params.id;
      const { acknowledgedBy } = req.body;
      
      if (!acknowledgedBy) {
        return res.status(400).json({
          error: 'Missing required field: acknowledgedBy'
        });
      }

      const alert = await alertService.acknowledgeAlert(alertId, acknowledgedBy);
      
      res.json({
        success: true,
        data: alert.toJSON(),
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      res.status(500).json({
        error: 'Failed to acknowledge alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Resolve an alert
   * POST /api/alerts/:id/resolve
   */
  router.post('/:id/resolve', async (req: Request, res: Response) => {
    try {
      const alertId = req.params.id;
      const { resolvedBy, resolution } = req.body;
      
      if (!resolvedBy) {
        return res.status(400).json({
          error: 'Missing required field: resolvedBy'
        });
      }

      const alert = await alertService.resolveAlert(alertId, resolvedBy, resolution);
      
      res.json({
        success: true,
        data: alert.toJSON(),
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      logger.error('Error resolving alert:', error);
      res.status(500).json({
        error: 'Failed to resolve alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Suppress an alert
   * POST /api/alerts/:id/suppress
   */
  router.post('/:id/suppress', async (req: Request, res: Response) => {
    try {
      const alertId = req.params.id;
      const { suppressedBy, durationMinutes } = req.body;
      
      if (!suppressedBy || !durationMinutes) {
        return res.status(400).json({
          error: 'Missing required fields: suppressedBy, durationMinutes'
        });
      }

      const alert = await alertService.suppressAlert(alertId, suppressedBy, durationMinutes);
      
      res.json({
        success: true,
        data: alert.toJSON(),
        message: 'Alert suppressed successfully'
      });
    } catch (error) {
      logger.error('Error suppressing alert:', error);
      res.status(500).json({
        error: 'Failed to suppress alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get alert statistics
   * GET /api/alerts/stats
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      // Build filter from query parameters (same as GET /alerts)
      const filter: AlertFilter = {};
      
      if (req.query.status) {
        filter.status = Array.isArray(req.query.status) 
          ? req.query.status as any[]
          : [req.query.status as any];
      }
      
      if (req.query.severity) {
        filter.severity = Array.isArray(req.query.severity)
          ? req.query.severity as any[]
          : [req.query.severity as any];
      }
      
      if (req.query.startDate) {
        filter.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filter.endDate = new Date(req.query.endDate as string);
      }

      const stats = await alertService.getAlertStats(filter);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting alert stats:', error);
      res.status(500).json({
        error: 'Failed to get alert statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get active alerts requiring attention
   * GET /api/alerts/active
   */
  router.get('/active', async (req: Request, res: Response) => {
    try {
      const alerts = await alertService.getActiveAlerts();
      
      res.json({
        success: true,
        data: alerts.map(alert => alert.getSummary()),
        count: alerts.length
      });
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      res.status(500).json({
        error: 'Failed to get active alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Bulk operations on alerts
   * POST /api/alerts/bulk
   */
  router.post('/bulk', async (req: Request, res: Response) => {
    try {
      const { operation, alertIds, params } = req.body;
      
      if (!operation || !alertIds || !Array.isArray(alertIds)) {
        return res.status(400).json({
          error: 'Missing required fields: operation, alertIds (array)'
        });
      }

      const results = [];
      
      for (const alertId of alertIds) {
        try {
          let result;
          
          switch (operation) {
            case 'acknowledge':
              if (!params?.acknowledgedBy) {
                throw new Error('acknowledgedBy required for acknowledge operation');
              }
              result = await alertService.acknowledgeAlert(alertId, params.acknowledgedBy);
              break;
              
            case 'resolve':
              if (!params?.resolvedBy) {
                throw new Error('resolvedBy required for resolve operation');
              }
              result = await alertService.resolveAlert(alertId, params.resolvedBy, params.resolution);
              break;
              
            case 'suppress':
              if (!params?.suppressedBy || !params?.durationMinutes) {
                throw new Error('suppressedBy and durationMinutes required for suppress operation');
              }
              result = await alertService.suppressAlert(alertId, params.suppressedBy, params.durationMinutes);
              break;
              
            default:
              throw new Error(`Unsupported operation: ${operation}`);
          }
          
          results.push({
            alertId,
            success: true,
            data: result.getSummary()
          });
        } catch (error) {
          results.push({
            alertId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      res.json({
        success: failureCount === 0,
        data: results,
        summary: {
          total: alertIds.length,
          successful: successCount,
          failed: failureCount
        }
      });
    } catch (error) {
      logger.error('Error in bulk operation:', error);
      res.status(500).json({
        error: 'Failed to perform bulk operation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}