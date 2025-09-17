import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDataStore } from '@/store/dataStore';
import { Alert, Sensor, RiskAssessment } from '@/types';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

const mockAlert: Alert = {
  id: '1',
  title: 'High Risk Alert',
  message: 'Elevated risk detected in sector A',
  level: 'high',
  timestamp: '2024-01-01T10:00:00Z',
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    elevation: 100,
    utm_x: 0,
    utm_y: 0,
    mine_grid_x: 0,
    mine_grid_y: 0,
  },
  acknowledged: false,
  risk_assessment: {
    assessment_id: '1',
    timestamp: '2024-01-01T10:00:00Z',
    spatial_extent: {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    },
    risk_probability: 0.75,
    confidence_interval: [0.65, 0.85],
    contributing_factors: ['rainfall', 'vibration'],
    alert_level: 3,
    recommended_actions: ['evacuate personnel'],
    explanation: 'High risk due to recent rainfall',
  },
};

const mockSensor: Sensor = {
  id: '1',
  name: 'Sensor A1',
  type: 'tiltmeter',
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    elevation: 100,
    utm_x: 0,
    utm_y: 0,
    mine_grid_x: 0,
    mine_grid_y: 0,
  },
  status: 'online',
  battery_level: 85,
  signal_strength: 90,
  last_reading: '2024-01-01T10:00:00Z',
  installation_date: '2024-01-01T00:00:00Z',
};

describe('DataStore', () => {
  beforeEach(() => {
    // Reset store state
    useDataStore.setState({
      alerts: [],
      sensors: [],
      riskAssessments: [],
      isOnline: true,
      lastSync: null,
      isLoading: false,
    });
    
    // Clear AsyncStorage
    AsyncStorage.clear();
    
    // Reset fetch mock
    mockFetch.mockClear();
  });

  describe('fetchData', () => {
    it('should fetch data successfully when online', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockAlert]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockSensor]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      const { fetchData } = useDataStore.getState();
      await fetchData();

      const state = useDataStore.getState();
      expect(state.alerts).toEqual([mockAlert]);
      expect(state.sensors).toEqual([mockSensor]);
      expect(state.isLoading).toBe(false);
      expect(state.lastSync).toBeTruthy();
    });

    it('should load cached data when offline', async () => {
      // Set offline state
      useDataStore.setState({ isOnline: false });

      const cachedData = {
        alerts: [mockAlert],
        sensors: [mockSensor],
        riskAssessments: [],
        lastSync: '2024-01-01T09:00:00Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(cachedData)
      );

      const { fetchData } = useDataStore.getState();
      await fetchData();

      const state = useDataStore.getState();
      expect(state.alerts).toEqual([mockAlert]);
      expect(state.sensors).toEqual([mockSensor]);
      expect(state.lastSync).toBe('2024-01-01T09:00:00Z');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fallback to cached data on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const cachedData = {
        alerts: [mockAlert],
        sensors: [],
        riskAssessments: [],
        lastSync: '2024-01-01T09:00:00Z',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(cachedData)
      );

      const { fetchData } = useDataStore.getState();
      await fetchData();

      const state = useDataStore.getState();
      expect(state.alerts).toEqual([mockAlert]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('acknowledgeAlert', () => {
    beforeEach(() => {
      useDataStore.setState({
        alerts: [mockAlert],
        isOnline: true,
      });
    });

    it('should acknowledge alert locally and sync with server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { acknowledgeAlert } = useDataStore.getState();
      await acknowledgeAlert('1');

      const state = useDataStore.getState();
      const acknowledgedAlert = state.alerts.find(a => a.id === '1');
      
      expect(acknowledgedAlert?.acknowledged).toBe(true);
      expect(acknowledgedAlert?.acknowledged_at).toBeTruthy();
      expect(acknowledgedAlert?.acknowledged_by).toBe('current_user');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/alerts/1/acknowledge',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should acknowledge alert locally when offline', async () => {
      useDataStore.setState({ isOnline: false });

      const { acknowledgeAlert } = useDataStore.getState();
      await acknowledgeAlert('1');

      const state = useDataStore.getState();
      const acknowledgedAlert = state.alerts.find(a => a.id === '1');
      
      expect(acknowledgedAlert?.acknowledged).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle server error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Server error'));

      const { acknowledgeAlert } = useDataStore.getState();
      await acknowledgeAlert('1');

      const state = useDataStore.getState();
      const acknowledgedAlert = state.alerts.find(a => a.id === '1');
      
      // Should still be acknowledged locally
      expect(acknowledgedAlert?.acknowledged).toBe(true);
    });
  });

  describe('saveCachedData and loadCachedData', () => {
    it('should save and load cached data correctly', async () => {
      const testData = {
        alerts: [mockAlert],
        sensors: [mockSensor],
        riskAssessments: [],
        lastSync: '2024-01-01T10:00:00Z',
      };

      useDataStore.setState(testData);

      const { saveCachedData } = useDataStore.getState();
      await saveCachedData();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_data',
        JSON.stringify(testData)
      );

      // Reset state
      useDataStore.setState({
        alerts: [],
        sensors: [],
        riskAssessments: [],
        lastSync: null,
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(testData)
      );

      const { loadCachedData } = useDataStore.getState();
      await loadCachedData();

      const state = useDataStore.getState();
      expect(state.alerts).toEqual([mockAlert]);
      expect(state.sensors).toEqual([mockSensor]);
      expect(state.lastSync).toBe('2024-01-01T10:00:00Z');
    });

    it('should handle missing cached data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const { loadCachedData } = useDataStore.getState();
      await loadCachedData();

      const state = useDataStore.getState();
      expect(state.alerts).toEqual([]);
      expect(state.sensors).toEqual([]);
    });
  });

  describe('setOnlineStatus', () => {
    it('should update online status and sync when coming online', async () => {
      const syncDataSpy = jest.spyOn(useDataStore.getState(), 'syncData');
      
      const { setOnlineStatus } = useDataStore.getState();
      setOnlineStatus(true);

      expect(useDataStore.getState().isOnline).toBe(true);
      expect(syncDataSpy).toHaveBeenCalled();
    });

    it('should update online status without syncing when going offline', () => {
      const syncDataSpy = jest.spyOn(useDataStore.getState(), 'syncData');
      
      const { setOnlineStatus } = useDataStore.getState();
      setOnlineStatus(false);

      expect(useDataStore.getState().isOnline).toBe(false);
      expect(syncDataSpy).not.toHaveBeenCalled();
    });
  });
});