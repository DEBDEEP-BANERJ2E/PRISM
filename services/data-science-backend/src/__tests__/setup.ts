// Test setup file
import { logger } from '../utils/logger';

// Suppress logs during testing
logger.silent = true;

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';