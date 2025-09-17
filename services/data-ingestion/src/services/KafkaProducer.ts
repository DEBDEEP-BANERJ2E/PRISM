import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { SensorReading } from '@prism/shared-models';
import { config } from '../config';
import logger from '../utils/logger';

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000
    });
  }

  /**
   * Initialize Kafka producer connection
   */
  public async initialize(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Connected to Kafka', { brokers: config.kafka.brokers });
    } catch (error) {
      logger.error('Failed to connect to Kafka', { error });
      throw error;
    }
  }

  /**
   * Send sensor readings to Kafka
   */
  public async sendSensorReadings(readings: SensorReading[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const messages = readings.map(reading => ({
        key: reading.sensor_id,
        value: JSON.stringify(reading.toJSON()),
        timestamp: reading.timestamp.getTime().toString(),
        headers: {
          sensor_type: reading.sensor_type,
          quality_score: reading.getQualityScore().toString(),
          processing_timestamp: reading.processing_timestamp?.getTime().toString() || Date.now().toString()
        }
      }));

      const record: ProducerRecord = {
        topic: config.kafka.topics.rawSensorData,
        messages
      };

      await this.producer.send(record);

      logger.debug('Sent sensor readings to Kafka', {
        topic: config.kafka.topics.rawSensorData,
        count: readings.length,
        sensors: readings.map(r => r.sensor_id)
      });

    } catch (error) {
      logger.error('Failed to send sensor readings to Kafka', { error, count: readings.length });
      throw error;
    }
  }

  /**
   * Send processed sensor data to Kafka
   */
  public async sendProcessedSensorData(data: any[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const messages = data.map(item => ({
        key: item.sensor_id || item.id,
        value: JSON.stringify(item),
        timestamp: Date.now().toString()
      }));

      const record: ProducerRecord = {
        topic: config.kafka.topics.processedSensorData,
        messages
      };

      await this.producer.send(record);

      logger.debug('Sent processed sensor data to Kafka', {
        topic: config.kafka.topics.processedSensorData,
        count: data.length
      });

    } catch (error) {
      logger.error('Failed to send processed sensor data to Kafka', { error, count: data.length });
      throw error;
    }
  }

  /**
   * Send hexapod status to Kafka
   */
  public async sendHexapodStatus(status: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const record: ProducerRecord = {
        topic: 'hexapod-status',
        messages: [{
          key: status.pod_id,
          value: JSON.stringify(status),
          timestamp: Date.now().toString(),
          headers: {
            pod_id: status.pod_id,
            operational_status: status.operational_status || 'unknown'
          }
        }]
      };

      await this.producer.send(record);

      logger.debug('Sent hexapod status to Kafka', {
        topic: 'hexapod-status',
        podId: status.pod_id
      });

    } catch (error) {
      logger.error('Failed to send hexapod status to Kafka', { error, podId: status.pod_id });
      throw error;
    }
  }

  /**
   * Send alert to Kafka
   */
  public async sendAlert(alert: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const record: ProducerRecord = {
        topic: config.kafka.topics.alerts,
        messages: [{
          key: alert.id || alert.alert_id,
          value: JSON.stringify(alert),
          timestamp: Date.now().toString(),
          headers: {
            alert_level: alert.level?.toString() || '0',
            alert_type: alert.type || 'unknown'
          }
        }]
      };

      await this.producer.send(record);

      logger.debug('Sent alert to Kafka', {
        topic: config.kafka.topics.alerts,
        alertId: alert.id,
        level: alert.level
      });

    } catch (error) {
      logger.error('Failed to send alert to Kafka', { error, alertId: alert.id });
      throw error;
    }
  }

  /**
   * Send device event to Kafka
   */
  public async sendDeviceEvent(event: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const record: ProducerRecord = {
        topic: 'device-events',
        messages: [{
          key: event.devEUI || event.deviceName,
          value: JSON.stringify(event),
          timestamp: Date.now().toString(),
          headers: {
            event_type: event.type,
            device_name: event.deviceName || 'unknown'
          }
        }]
      };

      await this.producer.send(record);

      logger.debug('Sent device event to Kafka', {
        topic: 'device-events',
        eventType: event.type,
        deviceName: event.deviceName
      });

    } catch (error) {
      logger.error('Failed to send device event to Kafka', { error, eventType: event.type });
      throw error;
    }
  }

  /**
   * Send batch data processing result to Kafka
   */
  public async sendBatchProcessingResult(result: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const record: ProducerRecord = {
        topic: 'batch-processing-results',
        messages: [{
          key: result.batchId || result.id,
          value: JSON.stringify(result),
          timestamp: Date.now().toString(),
          headers: {
            batch_id: result.batchId,
            processing_status: result.status || 'unknown',
            records_processed: result.recordsProcessed?.toString() || '0'
          }
        }]
      };

      await this.producer.send(record);

      logger.debug('Sent batch processing result to Kafka', {
        topic: 'batch-processing-results',
        batchId: result.batchId,
        status: result.status
      });

    } catch (error) {
      logger.error('Failed to send batch processing result to Kafka', { error, batchId: result.batchId });
      throw error;
    }
  }

  /**
   * Send data quality metrics to Kafka
   */
  public async sendDataQualityMetrics(metrics: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    try {
      const record: ProducerRecord = {
        topic: 'data-quality-metrics',
        messages: [{
          key: `${metrics.source}_${Date.now()}`,
          value: JSON.stringify(metrics),
          timestamp: Date.now().toString(),
          headers: {
            source: metrics.source,
            metric_type: 'quality_assessment'
          }
        }]
      };

      await this.producer.send(record);

      logger.debug('Sent data quality metrics to Kafka', {
        topic: 'data-quality-metrics',
        source: metrics.source
      });

    } catch (error) {
      logger.error('Failed to send data quality metrics to Kafka', { error, source: metrics.source });
      throw error;
    }
  }

  /**
   * Check if producer is connected
   */
  public isConnectedToKafka(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from Kafka
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from Kafka');
    }
  }

  /**
   * Send transaction (for batch operations)
   */
  public async sendTransaction(records: ProducerRecord[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer not connected');
    }

    const transaction = await this.producer.transaction();

    try {
      for (const record of records) {
        await transaction.send(record);
      }
      
      await transaction.commit();
      
      logger.debug('Committed Kafka transaction', { recordCount: records.length });
    } catch (error) {
      await transaction.abort();
      logger.error('Aborted Kafka transaction', { error, recordCount: records.length });
      throw error;
    }
  }
}