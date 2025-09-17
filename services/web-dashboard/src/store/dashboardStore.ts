import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  DashboardState, 
  SensorReading, 
  RiskAssessment, 
  HexapodStatus, 
  AlertEvent,
  RiskHeatmapData,
  TimeSeriesData
} from '@/types';

interface DashboardStore extends DashboardState {
  // Data
  sensorReadings: SensorReading[];
  riskAssessments: RiskAssessment[];
  hexapodStatuses: HexapodStatus[];
  alerts: AlertEvent[];
  riskHeatmap: RiskHeatmapData | null;
  timeSeriesData: TimeSeriesData[];
  
  // Loading states
  isLoading: boolean;
  isConnected: boolean;
  lastUpdate: Date | null;
  
  // Actions
  updateSensorReadings: (readings: SensorReading[]) => void;
  updateRiskAssessments: (assessments: RiskAssessment[]) => void;
  updateHexapodStatuses: (statuses: HexapodStatus[]) => void;
  updateAlerts: (alerts: AlertEvent[]) => void;
  updateRiskHeatmap: (heatmap: RiskHeatmapData) => void;
  updateTimeSeriesData: (data: TimeSeriesData[]) => void;
  
  setSelectedTimeRange: (start: Date, end: Date) => void;
  setSelectedSensors: (sensorIds: string[]) => void;
  setRiskThreshold: (threshold: number) => void;
  setViewMode: (mode: '2d' | '3d' | 'hybrid') => void;
  setAnimationSpeed: (speed: number) => void;
  toggleAlerts: () => void;
  toggleSensorHealth: () => void;
  
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;
  
  // Computed values
  getActiveSensors: () => SensorReading[];
  getActiveAlerts: () => AlertEvent[];
  getCurrentRiskLevel: () => number;
  getFilteredTimeSeriesData: () => TimeSeriesData[];
}

export const useDashboardStore = create<DashboardStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    selectedTimeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      end: new Date()
    },
    selectedSensors: [],
    riskThreshold: 0.5,
    viewMode: '3d',
    animationSpeed: 1.0,
    showAlerts: true,
    showSensorHealth: true,
    
    // Data
    sensorReadings: [],
    riskAssessments: [],
    hexapodStatuses: [],
    alerts: [],
    riskHeatmap: null,
    timeSeriesData: [],
    
    // Loading states
    isLoading: false,
    isConnected: false,
    lastUpdate: null,
    
    // Actions
    updateSensorReadings: (readings) => set({ 
      sensorReadings: readings, 
      lastUpdate: new Date() 
    }),
    
    updateRiskAssessments: (assessments) => set({ 
      riskAssessments: assessments, 
      lastUpdate: new Date() 
    }),
    
    updateHexapodStatuses: (statuses) => set({ 
      hexapodStatuses: statuses, 
      lastUpdate: new Date() 
    }),
    
    updateAlerts: (alerts) => set({ 
      alerts: alerts, 
      lastUpdate: new Date() 
    }),
    
    updateRiskHeatmap: (heatmap) => set({ 
      riskHeatmap: heatmap, 
      lastUpdate: new Date() 
    }),
    
    updateTimeSeriesData: (data) => set({ 
      timeSeriesData: data, 
      lastUpdate: new Date() 
    }),
    
    setSelectedTimeRange: (start, end) => set({ 
      selectedTimeRange: { start, end } 
    }),
    
    setSelectedSensors: (sensorIds) => set({ 
      selectedSensors: sensorIds 
    }),
    
    setRiskThreshold: (threshold) => set({ 
      riskThreshold: threshold 
    }),
    
    setViewMode: (mode) => set({ 
      viewMode: mode 
    }),
    
    setAnimationSpeed: (speed) => set({ 
      animationSpeed: speed 
    }),
    
    toggleAlerts: () => set((state) => ({ 
      showAlerts: !state.showAlerts 
    })),
    
    toggleSensorHealth: () => set((state) => ({ 
      showSensorHealth: !state.showSensorHealth 
    })),
    
    setLoading: (loading) => set({ isLoading: loading }),
    setConnected: (connected) => set({ isConnected: connected }),
    
    // Computed values
    getActiveSensors: () => {
      const { sensorReadings, selectedTimeRange } = get();
      return sensorReadings.filter(reading => 
        reading.timestamp >= selectedTimeRange.start && 
        reading.timestamp <= selectedTimeRange.end
      );
    },
    
    getActiveAlerts: () => {
      const { alerts } = get();
      return alerts.filter(alert => alert.status === 'active');
    },
    
    getCurrentRiskLevel: () => {
      const { riskAssessments } = get();
      if (riskAssessments.length === 0) return 0;
      
      const latest = riskAssessments.reduce((latest, current) => 
        current.timestamp > latest.timestamp ? current : latest
      );
      
      return latest.risk_probability;
    },
    
    getFilteredTimeSeriesData: () => {
      const { timeSeriesData, selectedTimeRange, selectedSensors } = get();
      return timeSeriesData.filter(data => 
        data.timestamp >= selectedTimeRange.start && 
        data.timestamp <= selectedTimeRange.end &&
        (selectedSensors.length === 0 || selectedSensors.includes(data.sensor_id))
      );
    }
  }))
);