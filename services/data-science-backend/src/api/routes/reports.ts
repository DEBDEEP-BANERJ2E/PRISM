import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ReportService } from '../../services/ReportService';
import { validateReportGeneration } from '../../validation/reportValidation';
import { logger } from '../../utils/logger';

const router = Router();
const reportService = new ReportService();

// Generate report
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { analyticsData, configuration, metadata } = req.body;
    
    // Validate request
    const validation = validateReportGeneration(req.body);
    if (!validation.isValid) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid report generation request',
        details: validation.errors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const reportId = randomUUID();
    
    // Start report generation (async)
    const estimatedTime = reportService.estimateGenerationTime(analyticsData, configuration);
    reportService.generateReport(reportId, analyticsData, configuration, metadata);

    res.json({
      reportId,
      estimatedGenerationTime: estimatedTime
    });

  } catch (error) {
    logger.error('Error starting report generation:', error);
    res.status(500).json({
      code: 'REPORT_GENERATION_ERROR',
      message: 'Failed to start report generation',
      timestamp: new Date().toISOString()
    });
  }
});

// Check generation status
router.get('/:reportId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const status = await reportService.getGenerationStatus(reportId);
    
    if (!status) {
      res.status(404).json({
        code: 'REPORT_NOT_FOUND',
        message: 'Report not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json(status);

  } catch (error) {
    logger.error('Error getting report status:', error);
    res.status(500).json({
      code: 'STATUS_ERROR',
      message: 'Failed to get report status',
      timestamp: new Date().toISOString()
    });
  }
});

// Download report
router.get('/:reportId/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    const reportFile = await reportService.getReportFile(reportId);
    
    if (!reportFile) {
      res.status(404).json({
        code: 'REPORT_NOT_FOUND',
        message: 'Report file not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.setHeader('Content-Type', reportFile.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${reportFile.filename}"`);
    res.send(reportFile.buffer);

  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({
      code: 'DOWNLOAD_ERROR',
      message: 'Failed to download report',
      timestamp: new Date().toISOString()
    });
  }
});

// Get report history
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const history = await reportService.getReportHistory(
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(history);

  } catch (error) {
    logger.error('Error getting report history:', error);
    res.status(500).json({
      code: 'HISTORY_ERROR',
      message: 'Failed to get report history',
      timestamp: new Date().toISOString()
    });
  }
});

// Get report templates
router.get('/templates', async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await reportService.getReportTemplates();
    res.json(templates);

  } catch (error) {
    logger.error('Error getting report templates:', error);
    res.status(500).json({
      code: 'TEMPLATES_ERROR',
      message: 'Failed to get report templates',
      timestamp: new Date().toISOString()
    });
  }
});

// Create custom template
router.post('/templates', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate template data
    if (!req.body.name || typeof req.body.name !== 'string') {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Template name is required and must be a string',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!req.body.sections || !Array.isArray(req.body.sections) || req.body.sections.length === 0) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Template must have at least one section',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const template = await reportService.createTemplate(req.body);
    res.status(201).json(template);

  } catch (error) {
    logger.error('Error creating report template:', error);
    res.status(500).json({
      code: 'TEMPLATE_CREATION_ERROR',
      message: 'Failed to create report template',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;