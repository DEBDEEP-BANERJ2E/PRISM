import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3005'),
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'prism_alerts',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  // Redis configuration for caching and deduplication
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  
  // Kafka configuration for event streaming
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'alert-management-service',
    groupId: 'alert-management-group'
  },
  
  // Notification service configurations
  notifications: {
    // Twilio SMS configuration
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER
    },
    
    // Email configuration
    email: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      from: process.env.EMAIL_FROM || 'alerts@prism-system.com'
    },
    
    // Push notification configuration
    push: {
      fcmServerKey: process.env.FCM_SERVER_KEY,
      apnsCertPath: process.env.APNS_CERT_PATH,
      apnsKeyPath: process.env.APNS_KEY_PATH
    },
    
    // Webhook configuration
    webhook: {
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000'),
      retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '1000')
    }
  },
  
  // Alert processing configuration
  alertProcessing: {
    deduplicationWindowMinutes: parseInt(process.env.DEDUPLICATION_WINDOW_MINUTES || '15'),
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    escalationCheckIntervalMinutes: parseInt(process.env.ESCALATION_CHECK_INTERVAL || '5'),
    autoResolveCheckIntervalMinutes: parseInt(process.env.AUTO_RESOLVE_CHECK_INTERVAL || '10'),
    batchProcessingSize: parseInt(process.env.BATCH_PROCESSING_SIZE || '100')
  },
  
  // Fleet management integration
  fleetManagement: {
    apiUrl: process.env.FLEET_MANAGEMENT_API_URL || 'http://localhost:3010',
    apiKey: process.env.FLEET_MANAGEMENT_API_KEY,
    timeout: parseInt(process.env.FLEET_MANAGEMENT_TIMEOUT || '5000')
  },
  
  // Cost-benefit analysis configuration
  costBenefit: {
    defaultOperationalCostPerHour: parseFloat(process.env.DEFAULT_OPERATIONAL_COST_PER_HOUR || '10000'),
    defaultSafetyCostMultiplier: parseFloat(process.env.DEFAULT_SAFETY_COST_MULTIPLIER || '100'),
    defaultEquipmentCostPerHour: parseFloat(process.env.DEFAULT_EQUIPMENT_COST_PER_HOUR || '5000')
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
};