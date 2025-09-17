import { Logger } from 'winston';
import { KafkaStreamingPipeline } from './KafkaStreamingPipeline';
import { RealTimeRiskPredictor } from './RealTimeRiskPredictor';
import { SpatialRiskMapper } from './SpatialRiskMapper';
import { SpatialContext, StreamingPredictionResult } from '../types';
import { config } from '../config';

export class RiskAssessmentService {
  private logger: Logger;
  private streamingPipeline: KafkaStreamingPipeline;
  private riskPredictor: RealTimeRiskPredictor;
  private spatialMapper: SpatialRiskMapper;
  private isRunning: boolean = false;

  constructor(logger: Logger, initialSpatialContext: SpatialContext) {
    this.logger = logger;
    
    // Initialize components
    this.riskPredictor = new RealTimeRiskPredictor(logger);
    this.spatialMapper = new SpatialRiskMapper(logger, initialSpatialContext);
    
    // Initialize streaming pipeline
    this.streamingPipeline = new KafkaStreamingPipeline(
      config.kafka,
      this.riskPredictor,
      this.spatialMapper,
      logger
    );
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting Risk Assessment Service...');

      // Start streaming pipeline
      await this.streamingPipeline.start();

      this.isRunning = true;
      this.logger.info('Risk Assessment Service started successfully');

      // Start health monitoring
      this.startHealthMonitoring();

    } catch (error) {
      this.logger.error('Failed to start Risk Assessment Service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Risk Assessment Service...');

      this.isRunning = false;

      // Stop streaming pipeline
      await this.streamingPipeline.stop();

      this.logger.info('Risk Assessment Service stopped successfully');

    } catch (error) {
      this.logger.error('Error stopping Risk Assessment Service:', error);
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const health = await this.getHealthStatus();
        
        if (!health.isHealthy) {
          this.logger.warn('Health check failed:', health);
        } else {
          this.logger.debug('Health check passed');
        }

      } catch (error) {
        this.logger.error('Health check error:', error);
      }
    }, config.healthCheck.interval);
  }

  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    components: {
      streamingPipeline: boolean;
      riskPredictor: boolean;
      spatialMapper: boolean;
    };
    metrics: {
      uptime: number;
      lastPredictionTime?: Date;
      messagesPerSecond: number;
      averageProcessingTime: number;
    };
  }> {
    const streamingHealth = this.streamingPipeline.getHealthStatus();
    const predictorMetrics = this.riskPredictor.getModelMetrics();
    const mapperMetrics = this.spatialMapper.getMapperMetrics();
    const performanceMetrics = await this.streamingPipeline.getPerformanceMetrics();

    const isHealthy = streamingHealth.isRunning && this.isRunning;

    return {
      isHealthy,
      components: {
        streamingPipeline: streamingHealth.isRunning,
        riskPredictor: true, // Always healthy if instantiated
        spatialMapper: mapperMetrics.slopeSegmentCount > 0
      },
      metrics: {
        uptime: process.uptime(),
        lastPredictionTime: predictorMetrics.lastPredictionTime,
        messagesPerSecond: performanceMetrics.messagesPerSecond,
        averageProcessingTime: performanceMetrics.averageProcessingTime
      }
    };
  }

  async getServiceMetrics(): Promise<{
    riskPredictor: ReturnType<RealTimeRiskPredictor['getModelMetrics']>;
    spatialMapper: ReturnType<SpatialRiskMapper['getMapperMetrics']>;
    streamingPipeline: Awaited<ReturnType<KafkaStreamingPipeline['getPerformanceMetrics']>>;
  }> {
    return {
      riskPredictor: this.riskPredictor.getModelMetrics(),
      spatialMapper: this.spatialMapper.getMapperMetrics(),
      streamingPipeline: await this.streamingPipeline.getPerformanceMetrics()
    };
  }

  // Manual prediction endpoint for testing/debugging
  async generateManualPrediction(sensorData: any[]): Promise<StreamingPredictionResult> {
    try {
      const predictionInput = {
        sensor_data: sensorData,
        spatial_context: await this.spatialMapper.getCurrentSpatialContext(),
        timestamp: new Date()
      };

      const prediction = await this.riskPredictor.predictRisk(predictionInput);
      const riskHeatmap = await this.spatialMapper.generateRiskHeatmap(prediction);
      const vulnerableZones = await this.spatialMapper.detectVulnerableZones(prediction);

      return {
        prediction_id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        risk_heatmap: riskHeatmap,
        vulnerable_zones: vulnerableZones,
        overall_risk_level: this.calculateOverallRiskLevel(vulnerableZones),
        model_explanation: prediction.explanation,
        processing_time_ms: 0 // Will be calculated by caller
      };

    } catch (error) {
      this.logger.error('Error generating manual prediction:', error);
      throw error;
    }
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
}