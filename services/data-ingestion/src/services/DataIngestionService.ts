import { DataValidator } from './DataValidator';
import { MQTTService } from './MQTTService';
import { LoRaWANService } from './LoRaWANService';
import { HTTPIngestionService } from './HTTPIngestionService';
import { KafkaProducer } from './KafkaProducer';
import { IngestionStats } from '../types';
import logger from '../utils/logger';

export class DataIngestionService {
  private dataValidator: DataValidator;
  private kafkaProducer: KafkaProducer;
  private mqttService: MQTTService;
  private lorawanService: LoRaWANService;
  private httpService: HTTPIngestionService;
  private isInitialized = false;

  constructor() {
    // Initialize core services
    this.dataValidator = new DataValidator();
    this.kafkaProducer = new KafkaProducer();
    
    // Initialize protocol-specific services
    this.mqttService = new MQTTService(this.dataValidator, this.kafkaProducer);
    this.lorawanService = new LoRaWANService(this.dataValidator, this.kafkaProducer);
    this.httpService = new HTTPIngestionService(this.dataValidator, this.kafkaProducer);
  }

  /**
   * Initialize all data ingestion services
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Data Ingestion Service...');

      // Initialize Kafka producer first (required by other services)
      await this.kafkaProducer.initialize();
      logger.info('Kafka producer initialized');

      // Initialize MQTT service
      await this.mqttService.initialize();
      logger.info('MQTT service initialized');

      this.isInitialized = true;
      logger.info('Data Ingestion Service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Data Ingestion Service', { error });
      throw error;
    }
  }

  /**
   * Get the data validator instance
   */
  public getDataValidator(): DataValidator {
    return this.dataValidator;
  }

  /**
   * Get the Kafka producer instance
   */
  public getKafkaProducer(): KafkaProducer {
    return this.kafkaProducer;
  }

  /**
   * Get the MQTT service instance
   */
  public getMQTTService(): MQTTService {
    return this.mqttService;
  }

  /**
   * Get the LoRaWAN service instance
   */
  public getLoRaWANService(): LoRaWANService {
    return this.lorawanService;
  }

  /**
   * Get the HTTP ingestion service instance
   */
  public getHTTPService(): HTTPIngestionService {
    return this.httpService;
  }

  /**
   * Check if the service is initialized
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get health status of all services
   */
  public getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      kafka: boolean;
      mqtt: boolean;
      validator: boolean;
    };
    timestamp: Date;
  } {
    const kafkaHealthy = this.kafkaProducer.isConnectedToKafka();
    const mqttHealthy = this.mqttService.isConnectedToMQTT();
    const validatorHealthy = true; // Validator is always healthy if instantiated

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    
    if (kafkaHealthy && mqttHealthy && validatorHealthy) {
      overall = 'healthy';
    } else if (kafkaHealthy || mqttHealthy) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services: {
        kafka: kafkaHealthy,
        mqtt: mqttHealthy,
        validator: validatorHealthy
      },
      timestamp: new Date()
    };
  }

  /**
   * Get aggregated statistics from all ingestion sources
   */
  public getAggregatedStats(): {
    mqtt: IngestionStats[];
    lorawan: IngestionStats[];
    http: IngestionStats[];
    summary: {
      totalRecords: number;
      totalProcessed: number;
      totalRejected: number;
      overallSuccessRate: number;
      averageProcessingTime: number;
    };
  } {
    const mqttStats = this.mqttService.getStats();
    const lorawanStats = this.lorawanService.getStats();
    const httpStats = this.httpService.getStats();

    // Calculate summary statistics
    const allStats = [...mqttStats, ...lorawanStats, ...httpStats];
    
    const totalRecords = allStats.reduce((sum, stat) => sum + stat.recordsReceived, 0);
    const totalProcessed = allStats.reduce((sum, stat) => sum + stat.recordsProcessed, 0);
    const totalRejected = allStats.reduce((sum, stat) => sum + stat.recordsRejected, 0);
    const averageProcessingTime = allStats.length > 0 
      ? allStats.reduce((sum, stat) => sum + stat.averageProcessingTimeMs, 0) / allStats.length 
      : 0;

    return {
      mqtt: mqttStats,
      lorawan: lorawanStats,
      http: httpStats,
      summary: {
        totalRecords,
        totalProcessed,
        totalRejected,
        overallSuccessRate: totalRecords > 0 ? totalProcessed / totalRecords : 0,
        averageProcessingTime
      }
    };
  }

  /**
   * Get data validator cache statistics
   */
  public getValidatorCacheStats(): { size: number; memoryUsage: number } {
    return this.dataValidator.getCacheStats();
  }

  /**
   * Gracefully shutdown all services
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down Data Ingestion Service...');

    try {
      // Disconnect from MQTT
      await this.mqttService.disconnect();
      logger.info('MQTT service disconnected');

      // Disconnect from Kafka
      await this.kafkaProducer.disconnect();
      logger.info('Kafka producer disconnected');

      this.isInitialized = false;
      logger.info('Data Ingestion Service shutdown complete');

    } catch (error) {
      logger.error('Error during Data Ingestion Service shutdown', { error });
      throw error;
    }
  }

  /**
   * Restart all services (useful for configuration changes)
   */
  public async restart(): Promise<void> {
    logger.info('Restarting Data Ingestion Service...');
    
    await this.shutdown();
    await this.initialize();
    
    logger.info('Data Ingestion Service restarted successfully');
  }

  /**
   * Test connectivity to all external services
   */
  public async testConnectivity(): Promise<{
    kafka: { connected: boolean; error?: string };
    mqtt: { connected: boolean; error?: string };
  }> {
    const results = {
      kafka: { connected: false, error: undefined as string | undefined },
      mqtt: { connected: false, error: undefined as string | undefined }
    };

    // Test Kafka connectivity
    try {
      results.kafka.connected = this.kafkaProducer.isConnectedToKafka();
      if (!results.kafka.connected) {
        results.kafka.error = 'Not connected to Kafka';
      }
    } catch (error) {
      results.kafka.error = error instanceof Error ? error.message : 'Unknown Kafka error';
    }

    // Test MQTT connectivity
    try {
      results.mqtt.connected = this.mqttService.isConnectedToMQTT();
      if (!results.mqtt.connected) {
        results.mqtt.error = 'Not connected to MQTT broker';
      }
    } catch (error) {
      results.mqtt.error = error instanceof Error ? error.message : 'Unknown MQTT error';
    }

    return results;
  }

  /**
   * Send test message through all protocols (for testing purposes)
   */
  public async sendTestMessages(): Promise<{
    kafka: { success: boolean; error?: string };
    mqtt: { success: boolean; error?: string };
  }> {
    const results = {
      kafka: { success: false, error: undefined as string | undefined },
      mqtt: { success: false, error: undefined as string | undefined }
    };

    const testData = {
      sensor_id: 'TEST_SENSOR_001',
      timestamp: new Date(),
      sensor_type: 'test' as const,
      measurements: {
        test_value: { value: 42, unit: 'test' }
      },
      processing_timestamp: new Date()
    };

    // Test Kafka
    try {
      await this.kafkaProducer.sendProcessedSensorData([testData]);
      results.kafka.success = true;
    } catch (error) {
      results.kafka.error = error instanceof Error ? error.message : 'Unknown Kafka error';
    }

    // Test MQTT
    try {
      await this.mqttService.publish('prism/test', testData);
      results.mqtt.success = true;
    } catch (error) {
      results.mqtt.error = error instanceof Error ? error.message : 'Unknown MQTT error';
    }

    return results;
  }
}