import axios, { AxiosInstance } from 'axios';
import { ProcessedDataset, ModelConfiguration, TrainingResults } from '../types';
import { logger } from '../utils/logger';

/**
 * Client for communicating with the AI Pipeline service
 */
export class AIPipelineClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.AI_PIPELINE_URL || 'http://localhost:3002';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 5 minutes for long-running operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`🔄 AI Pipeline Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('❌ AI Pipeline Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`✅ AI Pipeline Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('❌ AI Pipeline Response Error:', {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if AI Pipeline service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.error('AI Pipeline health check failed:', error);
      return false;
    }
  }

  /**
   * Send data for preprocessing
   */
  async preprocessData(data: any, config?: any): Promise<{ jobId: string; estimatedDuration: number }> {
    try {
      const response = await this.client.post('/preprocess', {
        data,
        config: config || {
          normalize: true,
          handleMissingValues: true,
          featureSelection: true
        }
      });

      return {
        jobId: response.data.jobId,
        estimatedDuration: response.data.estimatedDuration || 300
      };
    } catch (error: any) {
      logger.error('Data preprocessing request failed:', error);
      throw new Error(`Preprocessing failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get preprocessing job status
   */
  async getPreprocessingStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    result?: ProcessedDataset;
    error?: string;
  }> {
    try {
      const response = await this.client.get(`/preprocess/${jobId}/status`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get preprocessing status:', error);
      throw new Error(`Status check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Start model training
   */
  async trainModel(
    datasetId: string, 
    configuration: ModelConfiguration
  ): Promise<{ trainingJobId: string; estimatedDuration: number }> {
    try {
      const response = await this.client.post('/models/train', {
        datasetId,
        configuration
      });

      return {
        trainingJobId: response.data.trainingJobId,
        estimatedDuration: response.data.estimatedDuration || 1800
      };
    } catch (error: any) {
      logger.error('Model training request failed:', error);
      throw new Error(`Training failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get model training progress
   */
  async getTrainingProgress(trainingJobId: string): Promise<{
    status: 'queued' | 'training' | 'validating' | 'completed' | 'failed';
    progress: number;
    currentMetrics?: any;
    logs: string[];
    error?: string;
  }> {
    try {
      const response = await this.client.get(`/models/train/${trainingJobId}/progress`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get training progress:', error);
      throw new Error(`Progress check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get training results
   */
  async getTrainingResults(trainingJobId: string): Promise<TrainingResults> {
    try {
      const response = await this.client.get(`/models/train/${trainingJobId}/results`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get training results:', error);
      throw new Error(`Results retrieval failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Make predictions using a trained model
   */
  async predict(modelId: string, inputData: any): Promise<{
    predictions: any[];
    confidence: number[];
    modelMetadata: any;
  }> {
    try {
      const response = await this.client.post(`/models/${modelId}/predict`, {
        inputData
      });
      return response.data;
    } catch (error: any) {
      logger.error('Prediction request failed:', error);
      throw new Error(`Prediction failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get feature importance for a model
   */
  async getFeatureImportance(modelId: string): Promise<{ [feature: string]: number }> {
    try {
      const response = await this.client.get(`/models/${modelId}/feature-importance`);
      return response.data.featureImportance;
    } catch (error: any) {
      logger.error('Feature importance request failed:', error);
      throw new Error(`Feature importance failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Execute scenario analysis
   */
  async executeScenario(scenarioConfig: any): Promise<{
    jobId: string;
    estimatedDuration: number;
  }> {
    try {
      const response = await this.client.post('/scenarios/execute', scenarioConfig);
      return {
        jobId: response.data.jobId,
        estimatedDuration: response.data.estimatedDuration || 120
      };
    } catch (error: any) {
      logger.error('Scenario execution request failed:', error);
      throw new Error(`Scenario execution failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get scenario results
   */
  async getScenarioResults(jobId: string): Promise<any> {
    try {
      const response = await this.client.get(`/scenarios/${jobId}/results`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get scenario results:', error);
      throw new Error(`Scenario results failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<any[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.models || [];
    } catch (error: any) {
      logger.error('Failed to get models:', error);
      throw new Error(`Models retrieval failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelId: string): Promise<void> {
    try {
      await this.client.delete(`/models/${modelId}`);
    } catch (error: any) {
      logger.error('Failed to delete model:', error);
      throw new Error(`Model deletion failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get comprehensive analytics for a model
   */
  async getModelAnalytics(modelId: string): Promise<any> {
    try {
      const response = await this.client.get(`/models/${modelId}/analytics`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get model analytics:', error);
      throw new Error(`Analytics retrieval failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(modelId: string): Promise<any> {
    try {
      const response = await this.client.get(`/models/${modelId}/metrics`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get model metrics:', error);
      throw new Error(`Metrics retrieval failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get data distributions for a model's dataset
   */
  async getDataDistributions(modelId: string): Promise<any> {
    try {
      const response = await this.client.get(`/models/${modelId}/data-distributions`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get data distributions:', error);
      throw new Error(`Data distributions failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Compare multiple models
   */
  async compareModels(modelIds: string[]): Promise<any> {
    try {
      const response = await this.client.post('/models/compare', { modelIds });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to compare models:', error);
      throw new Error(`Model comparison failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Export analytics data in various formats
   */
  async exportAnalytics(modelId: string, format: 'json' | 'csv' | 'excel'): Promise<any> {
    try {
      const response = await this.client.get(`/models/${modelId}/export`, {
        params: { format },
        responseType: format === 'json' ? 'json' : 'arraybuffer'
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to export analytics:', error);
      throw new Error(`Analytics export failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Singleton instance
export const aiPipelineClient = new AIPipelineClient();