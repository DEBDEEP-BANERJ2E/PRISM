import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001']
  },
  
  services: {
    dataIngestion: process.env.DATA_INGESTION_URL || 'http://data-ingestion:3001',
    digitalTwin: process.env.DIGITAL_TWIN_URL || 'http://digital-twin:3002',
    aiPipeline: process.env.AI_PIPELINE_URL || 'http://ai-pipeline:3003',
    alertManagement: process.env.ALERT_MANAGEMENT_URL || 'http://alert-management:3004',
    userManagement: process.env.USER_MANAGEMENT_URL || 'http://user-management:3005'
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
};