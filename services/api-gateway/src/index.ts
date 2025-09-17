import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { integrationsRouter } from './routes/integrations';
import { docsRouter } from './routes/docs';
import logger from './utils/logger';
import { config } from './config';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(loggingMiddleware);

// Health check (no auth required)
app.use('/health', healthRouter);

// API documentation (no auth required)
app.use('/docs', docsRouter);

// Authentication routes (no auth required)
app.use('/auth', authRouter);

// Protected routes with authentication
app.use('/api', authMiddleware);

// External system integration routes
app.use('/api/integrations', integrationsRouter);

// Service proxies
const serviceProxies = {
  '/api/data-ingestion': {
    target: config.services.dataIngestion,
    changeOrigin: true,
    pathRewrite: { '^/api/data-ingestion': '' }
  },
  '/api/digital-twin': {
    target: config.services.digitalTwin,
    changeOrigin: true,
    pathRewrite: { '^/api/digital-twin': '' }
  },
  '/api/ai-pipeline': {
    target: config.services.aiPipeline,
    changeOrigin: true,
    pathRewrite: { '^/api/ai-pipeline': '' }
  },
  '/api/alert-management': {
    target: config.services.alertManagement,
    changeOrigin: true,
    pathRewrite: { '^/api/alert-management': '' }
  },
  '/api/user-management': {
    target: config.services.userManagement,
    changeOrigin: true,
    pathRewrite: { '^/api/user-management': '' }
  }
};

// Create proxy middleware for each service
Object.entries(serviceProxies).forEach(([path, options]) => {
  app.use(path, createProxyMiddleware({
    ...options,
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${path}:`, err);
      res.status(502).json({ error: 'Service temporarily unavailable' });
    },
    onProxyReq: (proxyReq, req) => {
      // Add user context to proxied requests
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.userId);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-Mine-Site', req.user.mineSite || '');
      }
    }
  }));
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const port = config.port;
app.listen(port, () => {
  logger.info(`PRISM API Gateway listening on port ${port}`);
  logger.info('Available services:', Object.keys(serviceProxies));
});

export default app;