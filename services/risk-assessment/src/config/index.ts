import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3005'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Kafka configuration
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'prism-risk-assessment',
    groupId: process.env.KAFKA_GROUP_ID || 'risk-assessment-group'
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'prism_risk_assessment',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },

  // Risk assessment configuration
  riskAssessment: {
    gridResolution: parseInt(process.env.GRID_RESOLUTION || '10'), // meters
    interpolationRadius: parseInt(process.env.INTERPOLATION_RADIUS || '100'), // meters
    predictionTimeout: parseInt(process.env.PREDICTION_TIMEOUT || '1000'), // milliseconds
    maxProcessingTime: parseInt(process.env.MAX_PROCESSING_TIME || '5000'), // milliseconds
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
    riskThresholds: {
      low: parseFloat(process.env.RISK_THRESHOLD_LOW || '0.3'),
      medium: parseFloat(process.env.RISK_THRESHOLD_MEDIUM || '0.5'),
      high: parseFloat(process.env.RISK_THRESHOLD_HIGH || '0.7'),
      critical: parseFloat(process.env.RISK_THRESHOLD_CRITICAL || '0.85')
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  },

  // Health check configuration
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // milliseconds
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000') // milliseconds
  }
};