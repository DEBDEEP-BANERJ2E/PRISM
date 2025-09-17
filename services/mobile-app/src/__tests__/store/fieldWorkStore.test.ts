import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFieldWorkStore } from '@/store/fieldWorkStore';
import { MaintenanceTask, IncidentReport } from '@/types';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

const mockTask: MaintenanceTask = {
  id: '1',
  title: 'Calibrate Tiltmeter',
  description: 'Perform routine calibration of tiltmeter sensor',
  sensor_id: 'sensor_1',
  sensor_name: 'Tiltmeter A1',
  sensor_location: {
    latitude: 37.7749,
    longitude: -122.4194,
    elevation: 100,
    utm_x: 0,
    utm_y: 0,
    mine_grid_x: 0,
    mine_grid_y: 0,
  },
  priority: 'medium',
  status: 'pending',
  due_date: '2024-01-15T10:00:00Z',
  estimated_duration: 60,
  instructions: 'Follow calibration procedure in manual',
  required_tools: ['multimeter', 'calibration kit'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockIncident: IncidentReport = {
  id: '1',
  title: 'Sensor Malfunction',
  description: 'Sensor showing erratic readings',
  severity: 'medium',
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    elevation: 100,
    utm_x: 0,
    utm_y: 0,
    mine_grid_x: 0,
    mine_grid_y: 0,
  },
  timestamp: '2024-01-01T10:00:00Z',
  reported_by: 'technician_1',
  status: 'open',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
};

describe('FieldWorkStore', () => {
  beforeEach(() => {
    // Reset store state
    useFieldWorkStore.setState({
      maintenanceTasks: [],
      incidentReports: [],
      isOnline: true,
      isLoading: false,
      lastSync: null,
    });
    
    // Clear AsyncStorage
    AsyncStorage.clear();
    
    // Reset fetch mock
    mockFetch.mockClear();
  });

  describe('fetchMaintenanceTasks', () => {
    it('should fetch tasks and reports successfully when online', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockTask]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockIncident]),
        });

      const { fetchMaintenanceTasks } = useFieldWorkStore.getState();
      await fetchMaintenanceTasks();

      const state = useFieldWorkStore.getState();
      expect(state.maintenanceTasks).toEqual([mockTask]);
      expect(state.incidentReports).toEqual([mockIncident]);
      expect(state.isLoading).toBe(false);
      expect(state.lastSync).toBeTruthy();
    });

    it('should load cached data when offline', async () => {
      // Set offline state
      useFieldWorkStore.setState({ isOnline: false });

      const cachedData = {
        maintenanceTasks: [mockTask],
        incidentReports: [mockIncident],
        lastSync: '2024-01-01T09:00:00Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(cachedData)
      );

      const { fetchMaintenanceTasks } = useFieldWorkStore.getState();
      await fetchMaintenanceTasks();

      const state = useFieldWorkStore.getState();
      expect(state.maintenanceTasks).toEqual([mockTask]);
      expect(state.incidentReports).toEqual([mockIncident]);
      expect(state.lastSync).toBe('2024-01-01T09:00:00Z');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fallback to cached data on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const cachedData = {
        maintenanceTasks: [mockTask],
        incidentReports: [],
        lastSync: '2024-01-01T09:00:00Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(cachedData)
      );

      const { fetchMaintenanceTasks } = useFieldWorkStore.getState();
      await fetchMaintenanceTasks();

      const state = useFieldWorkStore.getState();
      expect(state.maintenanceTasks).toEqual([mockTask]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('updateTaskStatus', () => {
    beforeEach(() => {
      useFieldWorkStore.setState({
        maintenanceTasks: [mockTask],
        isOnline: true,
      });
    });

    it('should update task status locally and sync with server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { updateTaskStatus } = useFieldWorkStore.getState();
      await updateTaskStatus('1', 'in_progress', {
        started_at: '2024-01-01T11:00:00Z',
      });

      const state = useFieldWorkStore.getState();
      const updatedTask = state.maintenanceTasks.find(t => t.id === '1');
      
      expect(updatedTask?.status).toBe('in_progress');
      expect(updatedTask?.started_at).toBe('2024-01-01T11:00:00Z');
      expect(updatedTask?.updated_at).toBeTruthy();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/maintenance/tasks/1',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should store offline action when offline', async () => {
      useFieldWorkStore.setState({ isOnline: false });

      const { updateTaskStatus } = useFieldWorkStore.getState();
      await updateTaskStatus('1', 'in_progress');

      const state = useFieldWorkStore.getState();
      const updatedTask = state.maintenanceTasks.find(t => t.id === '1');
      
      expect(updatedTask?.status).toBe('in_progress');
      expect(mockFetch).not.toHaveBeenCalled();

      // Check if offline action was stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_field_actions',
        expect.stringContaining('update_task')
      );
    });

    it('should handle server error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Server error'));

      const { updateTaskStatus } = useFieldWorkStore.getState();
      await updateTaskStatus('1', 'in_progress');

      const state = useFieldWorkStore.getState();
      const updatedTask = state.maintenanceTasks.find(t => t.id === '1');
      
      // Should still be updated locally
      expect(updatedTask?.status).toBe('in_progress');

      // Should store offline action for later sync
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_field_actions',
        expect.stringContaining('update_task')
      );
    });
  });

  describe('createIncidentReport', () => {
    it('should create incident report locally and sync with server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { createIncidentReport } = useFieldWorkStore.getState();
      await createIncidentReport({
        title: 'Test Incident',
        description: 'Test description',
        severity: 'high',
      });

      const state = useFieldWorkStore.getState();
      expect(state.incidentReports).toHaveLength(1);
      expect(state.incidentReports[0].title).toBe('Test Incident');
      expect(state.incidentReports[0].severity).toBe('high');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/incidents',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should create incident report offline', async () => {
      useFieldWorkStore.setState({ isOnline: false });

      const { createIncidentReport } = useFieldWorkStore.getState();
      await createIncidentReport({
        title: 'Offline Incident',
        description: 'Created while offline',
        severity: 'medium',
      });

      const state = useFieldWorkStore.getState();
      expect(state.incidentReports).toHaveLength(1);
      expect(state.incidentReports[0].title).toBe('Offline Incident');
      expect(mockFetch).not.toHaveBeenCalled();

      // Check if offline action was stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_field_actions',
        expect.stringContaining('create_incident')
      );
    });
  });

  describe('syncOfflineData', () => {
    it('should sync offline actions when coming online', async () => {
      const offlineActions = [
        {
          id: 'update_task_1',
          type: 'update_task',
          data: { taskId: '1', status: 'completed' },
          timestamp: '2024-01-01T12:00:00Z',
        },
        {
          id: 'create_incident_1',
          type: 'create_incident',
          data: mockIncident,
          timestamp: '2024-01-01T12:05:00Z',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(offlineActions)
      );

      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Task update
        .mockResolvedValueOnce({ ok: true }) // Incident creation
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // Fetch tasks
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // Fetch incidents

      const { syncOfflineData } = useFieldWorkStore.getState();
      await syncOfflineData();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/maintenance/tasks/1',
        expect.objectContaining({ method: 'PATCH' })
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/incidents',
        expect.objectContaining({ method: 'POST' })
      );

      // Should clear offline actions after successful sync
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_field_actions');
    });

    it('should not sync when offline', async () => {
      useFieldWorkStore.setState({ isOnline: false });

      const { syncOfflineData } = useFieldWorkStore.getState();
      await syncOfflineData();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('setOnlineStatus', () => {
    it('should update online status and sync when coming online', () => {
      const syncDataSpy = jest.spyOn(useFieldWorkStore.getState(), 'syncOfflineData');
      
      const { setOnlineStatus } = useFieldWorkStore.getState();
      setOnlineStatus(true);

      expect(useFieldWorkStore.getState().isOnline).toBe(true);
      expect(syncDataSpy).toHaveBeenCalled();
    });

    it('should update online status without syncing when going offline', () => {
      const syncDataSpy = jest.spyOn(useFieldWorkStore.getState(), 'syncOfflineData');
      
      const { setOnlineStatus } = useFieldWorkStore.getState();
      setOnlineStatus(false);

      expect(useFieldWorkStore.getState().isOnline).toBe(false);
      expect(syncDataSpy).not.toHaveBeenCalled();
    });
  });
});