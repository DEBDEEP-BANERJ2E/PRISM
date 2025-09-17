import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { loggingMiddleware } from './middleware/logging';
import logger from './utils/logger';
import { config } from './config';
import { initializeDatabase } from './database';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(loggingMiddleware);

// Routes
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    
    const port = config.port;
    app.listen(port, () => {
      logger.info(`PRISM User Management Service listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;