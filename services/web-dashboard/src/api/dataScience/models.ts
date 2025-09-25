import axios from 'axios';
import { APIResponse, ModelConfiguration, TrainingResults, ValidationResult } from '../../types/dataScience';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance for data science backend
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    console.log(`📦 Response Data:`, response.data);
    console.log(`📏 Response Data Type:`, typeof response.data);
    return response.data;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      message: error.message
    });

    // Transform error for consistent handling
    const message = error.response?.data?.error?.message ||
                   error.response?.data?.message ||
                   error.message ||
                   'An unexpected error occurred';

    throw new Error(message);
  }
);

// Export the dataScienceAPI for use in components
export const dataScienceAPI = {
  getModelTypes: async () => {
    return await apiClient.get('/api/data-science/model-types');
  },

  validateConfiguration: async (configuration: ModelConfiguration) => {
    return await apiClient.post('/api/data-science/validate-configuration', { configuration });
  },

  trainModel: async (datasetId: string, configuration: ModelConfiguration) => {
    return await apiClient.post('/models/train', { datasetId, configuration });
  },

  getTrainingStatus: async (jobId: string) => {
    return await apiClient.get(`/models/train/${jobId}/progress`);
  },

  getTrainingProgress: async (jobId: string) => {
    return await apiClient.get(`/models/train/${jobId}/progress`);
  },

  getTrainingResults: async (jobId: string) => {
    return await apiClient.get(`/models/train/${jobId}/results`);
  },

  getModels: async () => {
    return await apiClient.get('/models');
  }
};