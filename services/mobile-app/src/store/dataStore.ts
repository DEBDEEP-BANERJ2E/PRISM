import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert, Sensor, RiskAssessment, CachedData } from '@/types';

interface DataState {
  alerts: Alert[];
  sensors: Sensor[];
  riskAssessments: RiskAssessment[];
  isOnline: boolean;
  lastSync: string | null;
  isLoading: boolean;
  
  // Actions
  fetchData: () => Promise<void>;
  syncData: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  loadCachedData: () => Promise<void>;
  saveCachedData: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
}

const CACHED_DATA_KEY = 'cached_data';

export const useDataStore = create<DataState>((set, get) => ({
  alerts: [],
  sensors: [],
  riskAssessments: [],
  isOnline: true,
  lastSync: null,
  isLoading: false,

  fetchData: async () => {
    const { isOnline } = get();
    
    if (!isOnline) {
      // Load from cache when offline
      await get().loadCachedData();
      return;
    }

    set({ isLoading: true });

    try {
      // Fetch alerts
      const alertsResponse = await fetch('http://localhost:3000/api/alerts');
      const alerts = await alertsResponse.json();

      // Fetch sensors
      const sensorsResponse = await fetch('http://localhost:3000/api/sensors');
      const sensors = await sensorsResponse.json();

      // Fetch risk assessments
      const riskResponse = await fetch('http://localhost:3000/api/risk-assessments');
      const riskAssessments = await riskResponse.json();

      const now = new Date().toISOString();

      set({
        alerts,
        sensors,
        riskAssessments,
        lastSync: now,
        isLoading: false,
      });

      // Cache the data
      await get().saveCachedData();
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to cached data
      await get().loadCachedData();
      set({ isLoading: false });
    }
  },

  syncData: async () => {
    const { isOnline } = get();
    
    if (!isOnline) {
      console.log('Cannot sync while offline');
      return;
    }

    await get().fetchData();
  },

  acknowledgeAlert: async (alertId: string) => {
    const { alerts, isOnline } = get();
    
    // Update local state immediately
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId
        ? {
            ...alert,
            acknowledged: true,
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: 'current_user', // Replace with actual user
          }
        : alert
    );

    set({ alerts: updatedAlerts });

    // Save to cache
    await get().saveCachedData();

    // Sync with server if online
    if (isOnline) {
      try {
        await fetch(`http://localhost:3000/api/alerts/${alertId}/acknowledge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            acknowledged_at: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('Error acknowledging alert on server:', error);
        // The local state is already updated, so the change will sync later
      }
    }
  },

  loadCachedData: async () => {
    try {
      const cachedDataString = await AsyncStorage.getItem(CACHED_DATA_KEY);
      if (cachedDataString) {
        const cachedData: CachedData = JSON.parse(cachedDataString);
        set({
          alerts: cachedData.alerts || [],
          sensors: cachedData.sensors || [],
          riskAssessments: cachedData.riskAssessments || [],
          lastSync: cachedData.lastSync,
        });
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  },

  saveCachedData: async () => {
    try {
      const { alerts, sensors, riskAssessments, lastSync } = get();
      const cachedData: CachedData = {
        alerts,
        sensors,
        riskAssessments,
        lastSync: lastSync || new Date().toISOString(),
      };
      await AsyncStorage.setItem(CACHED_DATA_KEY, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error saving cached data:', error);
    }
  },

  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
    
    // Auto-sync when coming back online
    if (isOnline) {
      get().syncData();
    }
  },
}));

// Initialize network status monitoring
NetInfo.addEventListener(state => {
  useDataStore.getState().setOnlineStatus(state.isConnected ?? false);
});