import { 
  AnalyticsData, 
  ReportConfiguration, 
  ReportMetadata, 
  ReportStatus,
  ReportTemplate,
  ReportHistoryItem
} from '../../types/dataScience';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_DATA_SCIENCE_API_URL || 'http://localhost:3001/api';

interface ReportGenerationRequest {
  analyticsData: AnalyticsData;
  configuration: ReportConfiguration;
  metadata: ReportMetadata;
}

interface ReportGenerationResponse {
  reportId: string;
  estimatedGenerationTime: number;
}

interface ReportHistoryResponse {
  reports: ReportHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Create axios instance for reports API
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export the reportsAPI for use in components
export const reportsAPI = {
  getTemplates: async () => {
    const response = await apiClient.get('/reports/templates');
    return response.data;
  },
  
  generateReport: async (request: ReportGenerationRequest) => {
    const response = await apiClient.post('/reports/generate', request);
    return response.data;
  },
  
  getReportStatus: async (reportId: string) => {
    const response = await apiClient.get(`/reports/${reportId}/status`);
    return response.data;
  },
  
  getReportContent: async (reportId: string) => {
    const response = await apiClient.get(`/reports/${reportId}/content`);
    return response.data;
  },
  
  getReportHistory: async (page: number = 1, limit: number = 10) => {
    const response = await apiClient.get(`/reports/history?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  deleteReport: async (reportId: string) => {
    const response = await apiClient.delete(`/reports/${reportId}`);
    return response.data;
  }
};
