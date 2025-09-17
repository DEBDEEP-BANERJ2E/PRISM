import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MaintenanceTask, IncidentReport, SpatialLocation } from '@/types';

interface FieldWorkState {
  maintenanceTasks: MaintenanceTask[];
  incidentReports: IncidentReport[];
  isOnline: boolean;
  isLoading: boolean;
  lastSync: string | null;
  
  // Actions
  fetchMaintenanceTasks: () => Promise<void>;
  updateTaskStatus: (taskId: string, status: string, metadata?: any) => Promise<void>;
  createIncidentReport: (report: Partial<IncidentReport>) => Promise<void>;
  syncOfflineData: () => Promise<void>;
  loadCachedFieldData: () => Promise<void>;
  saveCachedFieldData: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
}

const FIELD_DATA_KEY = 'field_work_data';
const OFFLINE_ACTIONS_KEY = 'offline_field_actions';

interface OfflineAction {
  id: string;
  type: 'update_task' | 'create_incident';
  data: any;
  timestamp: string;
}

export const useFieldWorkStore = create<FieldWorkState>((set, get) => ({
  maintenanceTasks: [],
  incidentReports: [],
  isOnline: true,
  isLoading: false,
  lastSync: null,

  fetchMaintenanceTasks: async () => {
    const { isOnline } = get();
    
    if (!isOnline) {
      await get().loadCachedFieldData();
      return;
    }

    set({ isLoading: true });

    try {
      // Fetch maintenance tasks
      const tasksResponse = await fetch('http://localhost:3000/api/maintenance/tasks');
      const tasks = await tasksResponse.json();

      // Fetch incident reports
      const reportsResponse = await fetch('http://localhost:3000/api/incidents');
      const reports = await reportsResponse.json();

      const now = new Date().toISOString();

      set({
        maintenanceTasks: tasks,
        incidentReports: reports,
        lastSync: now,
        isLoading: false,
      });

      // Cache the data
      await get().saveCachedFieldData();
    } catch (error) {
      console.error('Error fetching field work data:', error);
      // Fallback to cached data
      await get().loadCachedFieldData();
      set({ isLoading: false });
    }
  },

  updateTaskStatus: async (taskId: string, status: string, metadata?: any) => {
    const { maintenanceTasks, isOnline } = get();
    
    // Update local state immediately
    const updatedTasks = maintenanceTasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            status,
            ...metadata,
            updated_at: new Date().toISOString(),
          }
        : task
    );

    set({ maintenanceTasks: updatedTasks });

    // Save to cache
    await get().saveCachedFieldData();

    // Sync with server if online
    if (isOnline) {
      try {
        await fetch(`http://localhost:3000/api/maintenance/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
            ...metadata,
          }),
        });
      } catch (error) {
        console.error('Error updating task on server:', error);
        // Store offline action for later sync
        await get().storeOfflineAction({
          id: `update_task_${taskId}_${Date.now()}`,
          type: 'update_task',
          data: { taskId, status, metadata },
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // Store offline action
      await get().storeOfflineAction({
        id: `update_task_${taskId}_${Date.now()}`,
        type: 'update_task',
        data: { taskId, status, metadata },
        timestamp: new Date().toISOString(),
      });
    }
  },

  createIncidentReport: async (report: Partial<IncidentReport>) => {
    const { incidentReports, isOnline } = get();
    
    const newReport: IncidentReport = {
      id: `incident_${Date.now()}`,
      title: report.title || '',
      description: report.description || '',
      severity: report.severity || 'medium',
      location: report.location || {
        latitude: 0,
        longitude: 0,
        elevation: 0,
        utm_x: 0,
        utm_y: 0,
        mine_grid_x: 0,
        mine_grid_y: 0,
      },
      timestamp: report.timestamp || new Date().toISOString(),
      reported_by: report.reported_by || 'current_user',
      status: report.status || 'open',
      photos: report.photos || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update local state
    set({ incidentReports: [...incidentReports, newReport] });

    // Save to cache
    await get().saveCachedFieldData();

    // Sync with server if online
    if (isOnline) {
      try {
        await fetch('http://localhost:3000/api/incidents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newReport),
        });
      } catch (error) {
        console.error('Error creating incident report on server:', error);
        // Store offline action for later sync
        await get().storeOfflineAction({
          id: `create_incident_${newReport.id}`,
          type: 'create_incident',
          data: newReport,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // Store offline action
      await get().storeOfflineAction({
        id: `create_incident_${newReport.id}`,
        type: 'create_incident',
        data: newReport,
        timestamp: new Date().toISOString(),
      });
    }
  },

  syncOfflineData: async () => {
    const { isOnline } = get();
    
    if (!isOnline) {
      console.log('Cannot sync while offline');
      return;
    }

    try {
      const offlineActionsString = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
      if (!offlineActionsString) return;

      const offlineActions: OfflineAction[] = JSON.parse(offlineActionsString);
      
      for (const action of offlineActions) {
        try {
          if (action.type === 'update_task') {
            const { taskId, status, metadata } = action.data;
            await fetch(`http://localhost:3000/api/maintenance/tasks/${taskId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status,
                ...metadata,
              }),
            });
          } else if (action.type === 'create_incident') {
            await fetch('http://localhost:3000/api/incidents', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(action.data),
            });
          }
        } catch (error) {
          console.error(`Error syncing offline action ${action.id}:`, error);
          // Keep the action for next sync attempt
          continue;
        }
      }

      // Clear synced offline actions
      await AsyncStorage.removeItem(OFFLINE_ACTIONS_KEY);
      
      // Refresh data from server
      await get().fetchMaintenanceTasks();
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  },

  loadCachedFieldData: async () => {
    try {
      const cachedDataString = await AsyncStorage.getItem(FIELD_DATA_KEY);
      if (cachedDataString) {
        const cachedData = JSON.parse(cachedDataString);
        set({
          maintenanceTasks: cachedData.maintenanceTasks || [],
          incidentReports: cachedData.incidentReports || [],
          lastSync: cachedData.lastSync,
        });
      }
    } catch (error) {
      console.error('Error loading cached field data:', error);
    }
  },

  saveCachedFieldData: async () => {
    try {
      const { maintenanceTasks, incidentReports, lastSync } = get();
      const cachedData = {
        maintenanceTasks,
        incidentReports,
        lastSync: lastSync || new Date().toISOString(),
      };
      await AsyncStorage.setItem(FIELD_DATA_KEY, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error saving cached field data:', error);
    }
  },

  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
    
    // Auto-sync when coming back online
    if (isOnline) {
      get().syncOfflineData();
    }
  },

  // Helper method to store offline actions
  storeOfflineAction: async (action: OfflineAction) => {
    try {
      const existingActionsString = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
      const existingActions: OfflineAction[] = existingActionsString 
        ? JSON.parse(existingActionsString) 
        : [];
      
      const updatedActions = [...existingActions, action];
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(updatedActions));
    } catch (error) {
      console.error('Error storing offline action:', error);
    }
  },
}));

// Initialize network status monitoring
NetInfo.addEventListener(state => {
  useFieldWorkStore.getState().setOnlineStatus(state.isConnected ?? false);
});