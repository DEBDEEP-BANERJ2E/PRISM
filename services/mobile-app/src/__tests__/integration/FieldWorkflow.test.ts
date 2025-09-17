import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFieldWorkStore } from '@/store/fieldWorkStore';
import { NavigationService } from '@/services/NavigationService';
import { PhotoCaptureService } from '@/services/PhotoCaptureService';
import { MaintenanceTask, IncidentReport, SpatialLocation } from '@/types';

// Mock services
jest.mock('@/services/NavigationService');
jest.mock('@/services/PhotoCaptureService');

const mockNavigationService = NavigationService as jest.Mocked<typeof NavigationService>;
const mockPhotoCaptureService = PhotoCaptureService as jest.Mocked<typeof PhotoCaptureService>;

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

const mockLocation: SpatialLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  elevation: 100,
  utm_x: 0,
  utm_y: 0,
  mine_grid_x: 0,
  mine_grid_y: 0,
};

const mockTask: MaintenanceTask = {
  id: 'task_1',
  title: 'Calibrate Sensor A1',
  description: 'Perform routine calibration',
  sensor_id: 'sensor_1',
  sensor_name: 'Tiltmeter A1',
  sensor_location: mockLocation,
  priority: 'high',
  status: 'pending',
  due_date: '2024-01-15T10:00:00Z',
  estimated_duration: 60,
  instructions: 'Follow calibration procedure',
  required_tools: ['multimeter', 'calibration kit'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Field Workflow Integration Tests', () => {
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
    
    // Reset mocks
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Complete Field Task Workflow', () => {
    it('should complete full task workflow from assignment to completion', async () => {
      // 1. Fetch initial tasks
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockTask]),
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const { fetchMaintenanceTasks, updateTaskStatus } = useFieldWorkStore.getState();
      await fetchMaintenanceTasks();

      let state = useFieldWorkStore.getState();
      expect(state.maintenanceTasks).toHaveLength(1);
      expect(state.maintenanceTasks[0].status).toBe('pending');

      // 2. Navigate to sensor location
      mockNavigationService.getCurrentLocation.mockResolvedValue({
        coords: {
          latitude: 37.7700,
          longitude: -122.4200,
          altitude: 95,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      mockNavigationService.calculateDistance.mockReturnValue(150); // 150 meters away
      mockNavigationService.calculateBearing.mockReturnValue(45); // Northeast
      mockNavigationService.formatDistance.mockReturnValue('150m');
      mockNavigationService.formatBearing.mockReturnValue('NE');

      const currentLocation = await NavigationService.getCurrentLocation();
      expect(currentLocation).toBeTruthy();

      const distance = NavigationService.calculateDistance(
        {
          latitude: currentLocation!.coords.latitude,
          longitude: currentLocation!.coords.longitude,
          elevation: currentLocation!.coords.altitude || 0,
          utm_x: 0,
          utm_y: 0,
          mine_grid_x: 0,
          mine_grid_y: 0,
        },
        mockTask.sensor_location
      );
      expect(distance).toBe(150);

      // 3. Start task when at location
      mockFetch.mockResolvedValueOnce({ ok: true });

      await updateTaskStatus('task_1', 'in_progress', {
        started_at: '2024-01-01T11:00:00Z',
        started_location: {
          latitude: currentLocation!.coords.latitude,
          longitude: currentLocation!.coords.longitude,
          elevation: currentLocation!.coords.altitude || 0,
          utm_x: 0,
          utm_y: 0,
          mine_grid_x: 0,
          mine_grid_y: 0,
        },
      });

      state = useFieldWorkStore.getState();
      const inProgressTask = state.maintenanceTasks.find(t => t.id === 'task_1');
      expect(inProgressTask?.status).toBe('in_progress');
      expect(inProgressTask?.started_at).toBe('2024-01-01T11:00:00Z');
      expect(inProgressTask?.started_location).toBeTruthy();

      // 4. Complete task
      mockFetch.mockResolvedValueOnce({ ok: true });

      await updateTaskStatus('task_1', 'completed', {
        completed_at: '2024-01-01T12:00:00Z',
        completed_location: {
          latitude: currentLocation!.coords.latitude,
          longitude: currentLocation!.coords.longitude,
          elevation: currentLocation!.coords.altitude || 0,
          utm_x: 0,
          utm_y: 0,
          mine_grid_x: 0,
          mine_grid_y: 0,
        },
      });

      state = useFieldWorkStore.getState();
      const completedTask = state.maintenanceTasks.find(t => t.id === 'task_1');
      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.completed_at).toBe('2024-01-01T12:00:00Z');
      expect(completedTask?.completed_location).toBeTruthy();

      // Verify all server calls were made
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial fetch (2) + 2 status updates
    });

    it('should handle offline task workflow with sync when online', async () => {
      // Start offline
      useFieldWorkStore.setState({ isOnline: false });

      // Load cached tasks
      const cachedData = {
        maintenanceTasks: [mockTask],
        incidentReports: [],
        lastSync: '2024-01-01T09:00:00Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(cachedData)
      );

      const { fetchMaintenanceTasks, updateTaskStatus, setOnlineStatus } = useFieldWorkStore.getState();
      await fetchMaintenanceTasks();

      let state = useFieldWorkStore.getState();
      expect(state.maintenanceTasks).toHaveLength(1);

      // Update task status while offline
      await updateTaskStatus('task_1', 'in_progress', {
        started_at: '2024-01-01T11:00:00Z',
      });

      state = useFieldWorkStore.getState();
      const inProgressTask = state.maintenanceTasks.find(t => t.id === 'task_1');
      expect(inProgressTask?.status).toBe('in_progress');

      // Verify offline action was stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_field_actions',
        expect.stringContaining('update_task')
      );

      // Come back online and sync
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{
          id: 'update_task_task_1',
          type: 'update_task',
          data: { taskId: 'task_1', status: 'in_progress' },
          timestamp: '2024-01-01T11:00:00Z',
        }])
      );

      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Sync offline action
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([inProgressTask]) }) // Fetch tasks
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // Fetch incidents

      setOnlineStatus(true);

      // Wait for sync to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify sync occurred
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/maintenance/tasks/task_1',
        expect.objectContaining({ method: 'PATCH' })
      );

      // Verify offline actions were cleared
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_field_actions');
    });
  });

  describe('Incident Reporting Workflow', () => {
    it('should complete full incident reporting workflow with photo', async () => {
      // 1. Get current location
      mockNavigationService.getCurrentLocation.mockResolvedValue({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 100,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const currentLocation = await NavigationService.getCurrentLocation();
      expect(currentLocation).toBeTruthy();

      // 2. Capture photo for incident
      mockPhotoCaptureService.requestPermissions.mockResolvedValue(true);
      mockPhotoCaptureService.capturePhoto.mockResolvedValue({
        id: 'photo_1',
        uri: 'file://photo.jpg',
        timestamp: '2024-01-01T12:00:00Z',
        location: {
          latitude: currentLocation!.coords.latitude,
          longitude: currentLocation!.coords.longitude,
          elevation: currentLocation!.coords.altitude || 0,
          utm_x: 0,
          utm_y: 0,
          mine_grid_x: 0,
          mine_grid_y: 0,
        },
        annotations: 'Sensor damage visible',
      });

      const photo = await PhotoCaptureService.capturePhoto('Sensor damage visible');
      expect(photo).toBeTruthy();
      expect(photo?.annotations).toBe('Sensor damage visible');

      // 3. Upload photo
      mockPhotoCaptureService.uploadPhoto.mockResolvedValue('https://example.com/photo.jpg');
      const photoUrl = await PhotoCaptureService.uploadPhoto(photo!);
      expect(photoUrl).toBe('https://example.com/photo.jpg');

      // 4. Create incident report
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { createIncidentReport } = useFieldWorkStore.getState();
      await createIncidentReport({
        title: 'Sensor Damage',
        description: 'Visible damage to sensor housing',
        severity: 'high',
        location: {
          latitude: currentLocation!.coords.latitude,
          longitude: currentLocation!.coords.longitude,
          elevation: currentLocation!.coords.altitude || 0,
          utm_x: 0,
          utm_y: 0,
          mine_grid_x: 0,
          mine_grid_y: 0,
        },
        photos: [photoUrl],
      });

      const state = useFieldWorkStore.getState();
      expect(state.incidentReports).toHaveLength(1);
      expect(state.incidentReports[0].title).toBe('Sensor Damage');
      expect(state.incidentReports[0].severity).toBe('high');
      expect(state.incidentReports[0].photos).toContain('https://example.com/photo.jpg');

      // Verify server call was made
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

    it('should handle incident reporting while offline', async () => {
      // Set offline
      useFieldWorkStore.setState({ isOnline: false });

      // Get location
      mockNavigationService.getCurrentLocation.mockResolvedValue({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 100,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });

      const currentLocation = await NavigationService.getCurrentLocation();

      // Create incident report offline
      const { createIncidentReport } = useFieldWorkStore.getState();
      await createIncidentReport({
        title: 'Offline Incident',
        description: 'Reported while offline',
        severity: 'medium',
        location: {
          latitude: currentLocation!.coords.latitude,
          longitude: currentLocation!.coords.longitude,
          elevation: currentLocation!.coords.altitude || 0,
          utm_x: 0,
          utm_y: 0,
          mine_grid_x: 0,
          mine_grid_y: 0,
        },
      });

      const state = useFieldWorkStore.getState();
      expect(state.incidentReports).toHaveLength(1);
      expect(state.incidentReports[0].title).toBe('Offline Incident');

      // Verify no server call was made
      expect(mockFetch).not.toHaveBeenCalled();

      // Verify offline action was stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_field_actions',
        expect.stringContaining('create_incident')
      );
    });
  });

  describe('Data Synchronization', () => {
    it('should maintain data consistency across offline/online transitions', async () => {
      const { fetchMaintenanceTasks, updateTaskStatus, createIncidentReport, setOnlineStatus } = useFieldWorkStore.getState();

      // Start with online data
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockTask]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      await fetchMaintenanceTasks();

      let state = useFieldWorkStore.getState();
      expect(state.maintenanceTasks).toHaveLength(1);
      expect(state.lastSync).toBeTruthy();

      // Go offline
      setOnlineStatus(false);

      // Perform offline operations
      await updateTaskStatus('task_1', 'in_progress');
      await createIncidentReport({
        title: 'Offline Incident',
        description: 'Created offline',
        severity: 'low',
        location: mockLocation,
      });

      state = useFieldWorkStore.getState();
      expect(state.maintenanceTasks[0].status).toBe('in_progress');
      expect(state.incidentReports).toHaveLength(1);

      // Verify data was cached
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'field_work_data',
        expect.stringContaining('in_progress')
      );

      // Come back online
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([
          {
            id: 'update_task_1',
            type: 'update_task',
            data: { taskId: 'task_1', status: 'in_progress' },
            timestamp: '2024-01-01T11:00:00Z',
          },
          {
            id: 'create_incident_1',
            type: 'create_incident',
            data: state.incidentReports[0],
            timestamp: '2024-01-01T11:05:00Z',
          },
        ])
      );

      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Sync task update
        .mockResolvedValueOnce({ ok: true }) // Sync incident creation
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ ...mockTask, status: 'in_progress' }]) }) // Fetch updated tasks
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([state.incidentReports[0]]) }); // Fetch incidents

      setOnlineStatus(true);

      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify all offline actions were synced
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/maintenance/tasks/task_1',
        expect.objectContaining({ method: 'PATCH' })
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/incidents',
        expect.objectContaining({ method: 'POST' })
      );

      // Verify offline actions were cleared
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_field_actions');
    });
  });
});