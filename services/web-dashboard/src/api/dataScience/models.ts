import axios from 'axios';
import { APIResponse, ModelConfiguration, TrainingResults, ValidationResult } from '../../types/dataScience';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance for data science backend
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 300000, // 5 minutes for long operations
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
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
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
    const response = await apiClient.get('/data-science/model-types');
    return response.data;
  },
  
  validateConfiguration: async (configuration: ModelConfiguration) => {
    const response = await apiClient.post('/data-science/validate-configuration', { configuration });
    return response.data;
  },
  
  trainModel: async (datasetId: string, configuration: ModelConfiguration) => {
    const response = await apiClient.post('/data-science/train', { datasetId, configuration });
    return response.data;
  },
  
  getTrainingStatus: async (jobId: string) => {
    const response = await apiClient.get(`/data-science/training/${jobId}/status`);
    return response.data;
  },
  
  getTrainingProgress: async (jobId: string) => {
    const response = await apiClient.get(`/data-science/training/${jobId}/progress`);
    return response.data;
  },
  
  getTrainingResults: async (jobId: string) => {
    const response = await apiClient.get(`/data-science/training/${jobId}/results`);
    return response.data;
  },
  
  getModels: async () => {
    const response = await apiClient.get('/data-science/models');
    return response.data;
  }
};