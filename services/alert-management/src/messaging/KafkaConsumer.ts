import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { logger } from '../utils/logger';
import { config } from '../config';

export type MessageHandler = (message: EachMessagePayload) => Promise<void>;

export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private messageHandlers: Map<string, MessageHandler>;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.consumer = this.kafka.consumer({
      groupId: config.kafka.groupId,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576,
      minBytes: 1,
      maxBytes: 10485760,
      maxWaitTimeInMs: 5000
    });

    this.messageHandlers = new Map();
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      
      // Set up error handling
      this.consumer.on('consumer.crash', (error) => {
        logger.error('Kafka consumer crashed:', error);
        this.handleConsumerCrash(error);
      });

      this.consumer.on('consumer.disconnect', () => {
        logger.warn('Kafka consumer disconnected');
        this.isConnected = false;
      });

      this.consumer.on('consumer.connect', () => {
        logger.info('Kafka consumer connected');
        this.isConnected = true;
      });

      logger.info('Kafka consumer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a topic with message handler
   */
  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Kafka consumer not connected');
      }

      // Subscribe to topic
      await this.consumer.subscribe({ topic, fromBeginning: false });
      
      // Store handler
      this.messageHandlers.set(topic, handler);

      logger.info(`Subscribed to Kafka topic: ${topic}`);
    } catch (error) {
      logger.error(`Failed to subscribe to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Kafka consumer not connected');
      }

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        }
      });

      logger.info('Kafka consumer started consuming messages');
    } catch (error) {
      logger.error('Failed to start consuming messages:', error);
      throw error;
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    try {
      logger.debug(`Received message from topic ${topic}, partition ${partition}, offset ${message.offset}`);

      // Get handler for topic
      const handler = this.messageHandlers.get(topic);
      if (!handler) {
        logger.warn(`No handler found for topic: ${topic}`);
        return;
      }

      // Process message with retry logic
      await this.processMessageWithRetry(payload, handler);

    } catch (error) {
      logger.error(`Error handling message from topic ${topic}:`, error);
      
      // In production, you might want to send failed messages to a dead letter queue
      await this.handleMessageError(payload, error);
    }
  }

  /**
   * Process message with retry logic
   */
  private async processMessageWithRetry(
    payload: EachMessagePayload,
    handler: MessageHandler,
    maxRetries: number = 3
  ): Promise<void> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        await handler(payload);
        return; // Success, exit retry loop
      } catch (error) {
        attempt++;
        logger.warn(`Message processing attempt ${attempt} failed:`, error);
        
        if (attempt >= maxRetries) {
          throw error; // Max retries exceeded
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await this.sleep(delay);
      }
    }
  }

  /**
   * Handle message processing error
   */
  private async handleMessageError(payload: EachMessagePayload, error: any): Promise<void> {
    const { topic, partition, message } = payload;
    
    // Log error details
    logger.error('Message processing failed:', {
      topic,
      partition,
      offset: message.offset,
      key: message.key?.toString(),
      error: error.message,
      stack: error.stack
    });

    // In production, you might want to:
    // 1. Send to dead letter queue
    // 2. Store in error database
    // 3. Send alert to monitoring system
    // 4. Implement circuit breaker pattern
  }

  /**
   * Handle consumer crash
   */
  private async handleConsumerCrash(error: any): Promise<void> {
    logger.error('Kafka consumer crashed, attempting to reconnect:', error);
    
    this.isConnected = false;
    
    // Attempt to reconnect after delay
    setTimeout(async () => {
      try {
        await this.reconnect();
      } catch (reconnectError) {
        logger.error('Failed to reconnect after crash:', reconnectError);
      }
    }, 5000);
  }

  /**
   * Reconnect to Kafka
   */
  private async reconnect(): Promise<void> {
    try {
      logger.info('Attempting to reconnect Kafka consumer...');
      
      // Disconnect first
      await this.disconnect();
      
      // Wait a bit
      await this.sleep(2000);
      
      // Reconnect
      await this.connect();
      
      // Re-subscribe to all topics
      const topics = Array.from(this.messageHandlers.keys());
      for (const topic of topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }
      
      // Start consuming again
      await this.startConsuming();
      
      logger.info('Kafka consumer reconnected successfully');
    } catch (error) {
      logger.error('Failed to reconnect Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Get consumer status
   */
  getStatus(): {
    connected: boolean;
    subscribedTopics: string[];
    groupId: string;
  } {
    return {
      connected: this.isConnected,
      subscribedTopics: Array.from(this.messageHandlers.keys()),
      groupId: config.kafka.groupId
    };
  }

  /**
   * Get consumer metrics
   */
  async getMetrics(): Promise<any> {
    try {
      // In production, you would implement proper metrics collection
      return {
        connected: this.isConnected,
        subscribedTopics: this.messageHandlers.size,
        // Add more metrics as needed
      };
    } catch (error) {
      logger.error('Error getting consumer metrics:', error);
      return null;
    }
  }

  /**
   * Pause consumption for a topic
   */
  async pauseTopic(topic: string): Promise<void> {
    try {
      // For simplicity, pause all partitions for the topic
      // In production, you would get actual partition assignments
      const partitions = [{ topic, partition: 0 }];
      this.consumer.pause(partitions);
      logger.info(`Paused consumption for topic: ${topic}`);
    } catch (error) {
      logger.error(`Error pausing topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Resume consumption for a topic
   */
  async resumeTopic(topic: string): Promise<void> {
    try {
      // For simplicity, resume all partitions for the topic
      // In production, you would get actual partition assignments
      const partitions = [{ topic, partition: 0 }];
      this.consumer.resume(partitions);
      logger.info(`Resumed consumption for topic: ${topic}`);
    } catch (error) {
      logger.error(`Error resuming topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Commit current offsets
   */
  async commitOffsets(): Promise<void> {
    try {
      await this.consumer.commitOffsets([]);
      logger.debug('Committed Kafka offsets');
    } catch (error) {
      logger.error('Error committing offsets:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.consumer.disconnect();
        this.isConnected = false;
        logger.info('Kafka consumer disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Kafka consumer...');
      
      // Stop consuming
      await this.consumer.stop();
      
      // Commit any pending offsets
      await this.commitOffsets();
      
      // Disconnect
      await this.disconnect();
      
      logger.info('Kafka consumer shut down successfully');
    } catch (error) {
      logger.error('Error during Kafka consumer shutdown:', error);
      throw error;
    }
  }
}