import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'prism_data',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true'
  },

  // MQTT configuration
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: process.env.MQTT_CLIENT_ID || 'prism-data-ingestion',
    topics: {
      sensorData: process.env.MQTT_SENSOR_TOPIC || 'prism/sensors/+/data',
      hexapodStatus: process.env.MQTT_HEXAPOD_TOPIC || 'prism/hexapods/+/status',
      alerts: process.env.MQTT_ALERTS_TOPIC || 'prism/alerts'
    }
  },

  // LoRaWAN configuration
  lorawan: {
    gatewayUrl: process.env.LORAWAN_GATEWAY_URL || 'http://localhost:8080',
    applicationId: process.env.LORAWAN_APP_ID || 'prism-sensors',
    apiKey: process.env.LORAWAN_API_KEY,
    webhookSecret: process.env.LORAWAN_WEBHOOK_SECRET
  },

  // Kafka configuration
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'prism-data-ingestion',
    topics: {
      rawSensorData: process.env.KAFKA_RAW_SENSOR_TOPIC || 'raw-sensor-data',
      processedSensorData: process.env.KAFKA_PROCESSED_SENSOR_TOPIC || 'processed-sensor-data',
      alerts: process.env.KAFKA_ALERTS_TOPIC || 'alerts'
    }
  },

  // Data validation configuration
  validation: {
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '1000'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50') * 1024 * 1024, // 50MB default
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'csv,json,xml').split(','),
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '365')
  },

  // Quality assurance thresholds
  qualityThresholds: {
    minBatteryLevel: parseFloat(process.env.MIN_BATTERY_LEVEL || '20'),
    maxSignalStrengthDb: parseFloat(process.env.MAX_SIGNAL_STRENGTH_DB || '-50'),
    maxDataAge: parseInt(process.env.MAX_DATA_AGE_MINUTES || '30') * 60 * 1000, // milliseconds
    minQualityScore: parseFloat(process.env.MIN_QUALITY_SCORE || '0.7')
  }
};