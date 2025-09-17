import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import { AlertManagementService } from './services/AlertManagementService';
import { NotificationService } from './services/NotificationService';
import { PrescriptiveActionEngine } from './services/PrescriptiveActionEngine';
import { EscalationService } from './services/EscalationService';
import { alertRoutes } from './routes/alertRoutes';
import { healthRoutes } from './routes/healthRoutes';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const notificationService = new NotificationService();
const prescriptiveActionEngine = new PrescriptiveActionEngine();
const escalationService = new EscalationService(notificationService);
const alertManagementService = new AlertManagementService(
  notificationService,
  prescriptiveActionEngine,
  escalationService
);

// Routes
app.use('/health', healthRoutes);
app.use('/api/alerts', alertRoutes(alertManagementService));

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

const port = config.port || 3005;

app.listen(port, () => {
  logger.info(`Alert Management Service listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});