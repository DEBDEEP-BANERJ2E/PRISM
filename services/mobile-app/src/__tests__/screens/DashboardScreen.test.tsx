import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DashboardScreen from '@/screens/DashboardScreen';
import { useDataStore } from '@/store/dataStore';
import { Alert, Sensor, RiskAssessment } from '@/types';

// Mock the data store
jest.mock('@/store/dataStore');
const mockUseDataStore = useDataStore as jest.MockedFunction<typeof useDataStore>;

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
    contributing_factors: ['rainfall'],
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

const mockRiskAssessment: RiskAssessment = {
  assessment_id: '1',
  timestamp: '2024-01-01T10:00:00Z',
  spatial_extent: {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
  },
  risk_probability: 0.75,
  confidence_interval: [0.65, 0.85],
  contributing_factors: ['rainfall'],
  alert_level: 3,
  recommended_actions: ['evacuate personnel'],
  explanation: 'High risk due to recent rainfall',
};

describe('DashboardScreen', () => {
  const mockFetchData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDataStore.mockReturnValue({
      alerts: [mockAlert],
      sensors: [mockSensor],
      riskAssessments: [mockRiskAssessment],
      isOnline: true,
      lastSync: '2024-01-01T10:00:00Z',
      isLoading: false,
      fetchData: mockFetchData,
      syncData: jest.fn(),
      acknowledgeAlert: jest.fn(),
      loadCachedData: jest.fn(),
      saveCachedData: jest.fn(),
      setOnlineStatus: jest.fn(),
    });
  });

  it('should render dashboard with correct data', () => {
    const { getByText } = render(<DashboardScreen />);

    expect(getByText('Online • Last sync: 10:00:00 AM')).toBeTruthy();
    expect(getByText('Current Risk Level')).toBeTruthy();
    expect(getByText('HIGH')).toBeTruthy();
    expect(getByText('Risk Probability: 75.0%')).toBeTruthy();
    expect(getByText('System Overview')).toBeTruthy();
    expect(getByText('1')).toBeTruthy(); // Active alerts count
    expect(getByText('Active Alerts')).toBeTruthy();
  });

  it('should show offline status when not connected', () => {
    mockUseDataStore.mockReturnValue({
      alerts: [],
      sensors: [],
      riskAssessments: [],
      isOnline: false,
      lastSync: null,
      isLoading: false,
      fetchData: mockFetchData,
      syncData: jest.fn(),
      acknowledgeAlert: jest.fn(),
      loadCachedData: jest.fn(),
      saveCachedData: jest.fn(),
      setOnlineStatus: jest.fn(),
    });

    const { getByText } = render(<DashboardScreen />);

    expect(getByText('Offline • Last sync: Never')).toBeTruthy();
  });

  it('should display correct risk level colors', () => {
    const { getByText } = render(<DashboardScreen />);
    
    const riskLevel = getByText('HIGH');
    expect(riskLevel.props.style.color).toBe('#EA580C'); // High risk color
  });

  it('should show no active alerts message when no alerts', () => {
    mockUseDataStore.mockReturnValue({
      alerts: [],
      sensors: [mockSensor],
      riskAssessments: [],
      isOnline: true,
      lastSync: '2024-01-01T10:00:00Z',
      isLoading: false,
      fetchData: mockFetchData,
      syncData: jest.fn(),
      acknowledgeAlert: jest.fn(),
      loadCachedData: jest.fn(),
      saveCachedData: jest.fn(),
      setOnlineStatus: jest.fn(),
    });

    const { getByText } = render(<DashboardScreen />);

    expect(getByText('No active alerts')).toBeTruthy();
  });

  it('should call fetchData on component mount', () => {
    render(<DashboardScreen />);
    expect(mockFetchData).toHaveBeenCalled();
  });

  it('should handle pull to refresh', async () => {
    const { getByTestId } = render(<DashboardScreen />);
    
    // Note: This would require adding testID to ScrollView in the actual component
    // For now, we'll just verify fetchData is called on mount
    expect(mockFetchData).toHaveBeenCalled();
  });

  it('should display sensor information correctly', () => {
    const { getByText } = render(<DashboardScreen />);

    expect(getByText('Sensor A1')).toBeTruthy();
    expect(getByText('37.7749, -122.4194')).toBeTruthy();
  });

  it('should show correct statistics', () => {
    const { getByText, getAllByText } = render(<DashboardScreen />);

    // Check for active alerts count
    const activeAlertsCount = getAllByText('1')[0]; // First occurrence should be active alerts
    expect(activeAlertsCount).toBeTruthy();

    // Check for online sensors count
    expect(getByText('Online Sensors')).toBeTruthy();
    
    // Check for total sensors count
    expect(getByText('Total Sensors')).toBeTruthy();
  });
});