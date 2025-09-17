import mqtt, { MqttClient } from 'mqtt';
import { SensorReading, SensorReadingInput } from '@prism/shared-models';
import { config } from '../config';
import { DataValidator } from './DataValidator';
import { KafkaProducer } from './KafkaProducer';
import { MQTTMessage, IngestionStats } from '../types';
import logger from '../utils/logger';

export class MQTTService {
  private client: MqttClient | null = null;
  private dataValidator: DataValidator;
  private kafkaProducer: KafkaProducer;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private stats: IngestionStats[] = [];

  constructor(dataValidator: DataValidator, kafkaProducer: KafkaProducer) {
    this.dataValidator = dataValidator;
    this.kafkaProducer = kafkaProducer;
  }

  /**
   * Initialize MQTT connection and subscribe to topics
   */
  public async initialize(): Promise<void> {
    try {
      const options: mqtt.IClientOptions = {
        clientId: config.mqtt.clientId,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 5000,
        keepalive: 60
      };

      if (config.mqtt.username && config.mqtt.password) {
        options.username = config.mqtt.username;
        options.password = config.mqtt.password;
      }

      this.client = mqtt.connect(config.mqtt.brokerUrl, options);

      this.client.on('connect', () => {
        logger.info('Connected to MQTT broker', { brokerUrl: config.mqtt.brokerUrl });
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToTopics();
      });

      this.client.on('error', (error) => {
        logger.error('MQTT connection error', { error: error.message });
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('MQTT connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.info('Attempting to reconnect to MQTT broker', { 
          attempt: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts 
        });

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('Max MQTT reconnection attempts reached');
          this.client?.end();
        }
      });

      this.client.on('message', (topic, payload, packet) => {
        this.handleMessage({
          topic,
          payload,
          qos: packet.qos,
          retain: packet.retain,
          timestamp: new Date()
        });
      });

    } catch (error) {
      logger.error('Failed to initialize MQTT service', { error });
      throw error;
    }
  }

  /**
   * Subscribe to configured MQTT topics
   */
  private subscribeToTopics(): void {
    if (!this.client || !this.isConnected) {
      logger.warn('Cannot subscribe to topics: MQTT client not connected');
      return;
    }

    const topics = [
      config.mqtt.topics.sensorData,
      config.mqtt.topics.hexapodStatus,
      config.mqtt.topics.alerts
    ];

    topics.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          logger.error('Failed to subscribe to MQTT topic', { topic, error: error.message });
        } else {
          logger.info('Subscribed to MQTT topic', { topic });
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(message: MQTTMessage): Promise<void> {
    const startTime = Date.now();
    let recordsReceived = 0;
    let recordsProcessed = 0;
    let recordsRejected = 0;

    try {
      logger.debug('Received MQTT message', { 
        topic: message.topic, 
        payloadSize: message.payload.length 
      });

      // Parse message payload
      const payloadStr = message.payload.toString();
      let data: any;

      try {
        data = JSON.parse(payloadStr);
      } catch (parseError) {
        logger.error('Failed to parse MQTT message payload', { 
          topic: message.topic, 
          payload: payloadStr,
          error: parseError 
        });
        return;
      }

      // Determine message type based on topic
      if (message.topic.includes('/sensors/')) {
        await this.processSensorData(data, message.topic);
        recordsReceived = Array.isArray(data) ? data.length : 1;
      } else if (message.topic.includes('/hexapods/')) {
        await this.processHexapodStatus(data, message.topic);
        recordsReceived = 1;
      } else if (message.topic.includes('/alerts')) {
        await this.processAlert(data, message.topic);
        recordsReceived = 1;
      }

      recordsProcessed = recordsReceived; // Assume all processed for now

    } catch (error) {
      logger.error('Error processing MQTT message', { 
        topic: message.topic, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      recordsRejected = recordsReceived;
    } finally {
      // Record statistics
      const processingTime = Date.now() - startTime;
      this.recordStats('mqtt', recordsReceived, recordsProcessed, recordsRejected, processingTime);
    }
  }

  /**
   * Process sensor data from MQTT message
   */
  private async processSensorData(data: any, topic: string): Promise<void> {
    try {
      // Extract sensor ID from topic (e.g., prism/sensors/SENSOR_001/data)
      const topicParts = topic.split('/');
      const sensorId = topicParts[topicParts.length - 2];

      // Handle both single readings and arrays
      const readings = Array.isArray(data) ? data : [data];
      
      // Add sensor ID if not present in data
      const enrichedReadings = readings.map(reading => ({
        ...reading,
        sensor_id: reading.sensor_id || sensorId,
        timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
        processing_timestamp: new Date()
      }));

      // Validate readings
      const validation = this.dataValidator.validateBatch(enrichedReadings);
      
      if (validation.validReadings.length > 0) {
        // Send valid readings to Kafka
        await this.kafkaProducer.sendSensorReadings(validation.validReadings);
        
        logger.info('Processed sensor data from MQTT', {
          topic,
          sensorId,
          validReadings: validation.validReadings.length,
          invalidReadings: validation.invalidReadings.length,
          averageQuality: validation.metrics.averageQualityScore.toFixed(2)
        });
      }

      if (validation.invalidReadings.length > 0) {
        logger.warn('Invalid sensor readings received via MQTT', {
          topic,
          sensorId,
          invalidCount: validation.invalidReadings.length,
          errors: validation.invalidReadings.map(r => r.validation.errors).flat()
        });
      }

    } catch (error) {
      logger.error('Failed to process sensor data from MQTT', { topic, error });
      throw error;
    }
  }

  /**
   * Process hexapod status from MQTT message
   */
  private async processHexapodStatus(data: any, topic: string): Promise<void> {
    try {
      // Extract hexapod ID from topic
      const topicParts = topic.split('/');
      const hexapodId = topicParts[topicParts.length - 2];

      const statusData = {
        ...data,
        pod_id: data.pod_id || hexapodId,
        last_communication: new Date(),
        processing_timestamp: new Date()
      };

      // Send to Kafka for further processing
      await this.kafkaProducer.sendHexapodStatus(statusData);

      logger.info('Processed hexapod status from MQTT', { topic, hexapodId });

    } catch (error) {
      logger.error('Failed to process hexapod status from MQTT', { topic, error });
      throw error;
    }
  }

  /**
   * Process alert from MQTT message
   */
  private async processAlert(data: any, topic: string): Promise<void> {
    try {
      const alertData = {
        ...data,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        processing_timestamp: new Date()
      };

      // Send to Kafka for alert processing
      await this.kafkaProducer.sendAlert(alertData);

      logger.info('Processed alert from MQTT', { topic, alertLevel: data.level });

    } catch (error) {
      logger.error('Failed to process alert from MQTT', { topic, error });
      throw error;
    }
  }

  /**
   * Publish message to MQTT topic
   */
  public async publish(topic: string, message: any, options?: mqtt.IClientPublishOptions): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, options || { qos: 1 }, (error) => {
        if (error) {
          logger.error('Failed to publish MQTT message', { topic, error: error.message });
          reject(error);
        } else {
          logger.debug('Published MQTT message', { topic, payloadSize: payload.length });
          resolve();
        }
      });
    });
  }

  /**
   * Record ingestion statistics
   */
  private recordStats(
    source: 'mqtt' | 'lorawan' | 'http' | 'batch',
    recordsReceived: number,
    recordsProcessed: number,
    recordsRejected: number,
    processingTimeMs: number
  ): void {
    const stats: IngestionStats = {
      timestamp: new Date(),
      source,
      recordsReceived,
      recordsProcessed,
      recordsRejected,
      averageProcessingTimeMs: processingTimeMs,
      errorRate: recordsReceived > 0 ? recordsRejected / recordsReceived : 0,
      qualityMetrics: {
        totalRecords: recordsReceived,
        validRecords: recordsProcessed,
        invalidRecords: recordsRejected,
        averageQualityScore: 0, // Will be updated by validator
        batteryLowCount: 0,
        communicationErrorCount: 0,
        staleDataCount: 0,
        duplicateCount: 0
      }
    };

    this.stats.push(stats);

    // Keep only last 1000 stats entries
    if (this.stats.length > 1000) {
      this.stats = this.stats.slice(-1000);
    }
  }

  /**
   * Get connection status
   */
  public isConnectedToMQTT(): boolean {
    return this.isConnected;
  }

  /**
   * Get ingestion statistics
   */
  public getStats(): IngestionStats[] {
    return [...this.stats];
  }

  /**
   * Disconnect from MQTT broker
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, {}, () => {
          logger.info('Disconnected from MQTT broker');
          this.isConnected = false;
          resolve();
        });
      });
    }
  }
}