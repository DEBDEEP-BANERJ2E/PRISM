import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { Logger } from 'winston';
import { RiskPredictionInput, StreamingPredictionResult, SensorData } from '../types';
import { RealTimeRiskPredictor } from './RealTimeRiskPredictor';
import { SpatialRiskMapper } from './SpatialRiskMapper';

export class KafkaStreamingPipeline {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private riskPredictor: RealTimeRiskPredictor;
  private spatialMapper: SpatialRiskMapper;
  private logger: Logger;
  private isRunning: boolean = false;

  constructor(
    kafkaConfig: { brokers: string[] },
    riskPredictor: RealTimeRiskPredictor,
    spatialMapper: SpatialRiskMapper,
    logger: Logger
  ) {
    this.kafka = new Kafka({
      clientId: 'prism-risk-assessment',
      brokers: kafkaConfig.brokers,
    });

    this.consumer = this.kafka.consumer({ 
      groupId: 'risk-assessment-group',
      maxWaitTimeInMs: 100, // Sub-second processing
      sessionTimeout: 6000,
      heartbeatInterval: 1000
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000
    });

    this.riskPredictor = riskPredictor;
    this.spatialMapper = spatialMapper;
    this.logger = logger;
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.producer.connect();

      // Subscribe to sensor data topics
      await this.consumer.subscribe({
        topics: [
          'sensor-data-stream',
          'environmental-data-stream',
          'geological-updates-stream'
        ],
        fromBeginning: false
      });

      this.isRunning = true;
      this.logger.info('Kafka streaming pipeline started');

      // Start consuming messages
      await this.consumer.run({
        eachMessage: this.processMessage.bind(this),
        partitionsConsumedConcurrently: 3 // Parallel processing
      });

    } catch (error) {
      this.logger.error('Failed to start Kafka streaming pipeline:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.consumer.disconnect();
    await this.producer.disconnect();
    this.logger.info('Kafka streaming pipeline stopped');
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { topic, partition, message } = payload;
      
      if (!message.value) {
        this.logger.warn('Received empty message');
        return;
      }

      const messageData = JSON.parse(message.value.toString());
      
      // Process different message types
      switch (topic) {
        case 'sensor-data-stream':
          await this.processSensorData(messageData);
          break;
        case 'environmental-data-stream':
          await this.processEnvironmentalData(messageData);
          break;
        case 'geological-updates-stream':
          await this.processGeologicalUpdates(messageData);
          break;
        default:
          this.logger.warn(`Unknown topic: ${topic}`);
      }

      const processingTime = Date.now() - startTime;
      
      // Log performance metrics
      if (processingTime > 1000) { // Log if processing takes more than 1 second
        this.logger.warn(`Slow message processing: ${processingTime}ms for topic ${topic}`);
      }

    } catch (error) {
      this.logger.error('Error processing message:', error);
      // Continue processing other messages
    }
  }

  private async processSensorData(sensorData: SensorData[]): Promise<void> {
    try {
      // Aggregate recent sensor data for prediction
      const predictionInput: RiskPredictionInput = {
        sensor_data: sensorData,
        spatial_context: await this.spatialMapper.getCurrentSpatialContext(),
        timestamp: new Date()
      };

      // Generate real-time risk prediction
      const prediction = await this.riskPredictor.predictRisk(predictionInput);

      // Generate spatial risk heatmap
      const riskHeatmap = await this.spatialMapper.generateRiskHeatmap(prediction);

      // Detect vulnerable zones
      const vulnerableZones = await this.spatialMapper.detectVulnerableZones(prediction);

      // Create streaming result
      const result: StreamingPredictionResult = {
        prediction_id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        risk_heatmap: riskHeatmap,
        vulnerable_zones: vulnerableZones,
        overall_risk_level: this.calculateOverallRiskLevel(vulnerableZones),
        model_explanation: prediction.explanation,
        processing_time_ms: Date.now() - predictionInput.timestamp.getTime()
      };

      // Publish results to output topics
      await this.publishResults(result);

      this.logger.debug(`Processed sensor data batch: ${sensorData.length} sensors`);

    } catch (error) {
      this.logger.error('Error processing sensor data:', error);
      throw error;
    }
  }

  private async processEnvironmentalData(environmentalData: any): Promise<void> {
    // Update environmental context for risk predictions
    await this.riskPredictor.updateEnvironmentalContext(environmentalData);
    this.logger.debug('Updated environmental context');
  }

  private async processGeologicalUpdates(geologicalData: any): Promise<void> {
    // Update spatial context with new geological information
    await this.spatialMapper.updateSpatialContext(geologicalData);
    this.logger.debug('Updated geological context');
  }

  private async publishResults(result: StreamingPredictionResult): Promise<void> {
    const messages = [
      {
        topic: 'risk-predictions-stream',
        messages: [{
          key: result.prediction_id,
          value: JSON.stringify(result),
          timestamp: result.timestamp.getTime().toString()
        }]
      }
    ];

    // Publish high-risk alerts to separate topic for immediate processing
    if (result.overall_risk_level === 'high' || result.overall_risk_level === 'critical') {
      messages.push({
        topic: 'high-risk-alerts-stream',
        messages: [{
          key: `alert_${result.prediction_id}`,
          value: JSON.stringify({
            prediction_id: result.prediction_id,
            risk_level: result.overall_risk_level,
            vulnerable_zones: result.vulnerable_zones.filter(zone => 
              zone.risk_level === 'high' || zone.risk_level === 'critical'
            ),
            timestamp: result.timestamp
          }),
          timestamp: result.timestamp.getTime().toString()
        }]
      });
    }

    await this.producer.sendBatch({ topicMessages: messages });
  }

  private calculateOverallRiskLevel(vulnerableZones: any[]): 'low' | 'medium' | 'high' | 'critical' {
    if (vulnerableZones.some(zone => zone.risk_level === 'critical')) {
      return 'critical';
    }
    if (vulnerableZones.some(zone => zone.risk_level === 'high')) {
      return 'high';
    }
    if (vulnerableZones.some(zone => zone.risk_level === 'medium')) {
      return 'medium';
    }
    return 'low';
  }

  // Health check method
  public getHealthStatus(): { isRunning: boolean; lastProcessedTime?: Date } {
    return {
      isRunning: this.isRunning,
      lastProcessedTime: new Date() // In real implementation, track actual last processed time
    };
  }

  // Performance metrics
  public async getPerformanceMetrics(): Promise<{
    messagesPerSecond: number;
    averageProcessingTime: number;
    errorRate: number;
  }> {
    // In real implementation, collect and return actual metrics
    return {
      messagesPerSecond: 0,
      averageProcessingTime: 0,
      errorRate: 0
    };
  }
}