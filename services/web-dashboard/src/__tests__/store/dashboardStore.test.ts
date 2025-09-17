import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '@/store/dashboardStore';
import { renderHook, act } from '@testing-library/react';

describe('DashboardStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.updateSensorReadings([]);
      result.current.updateRiskAssessments([]);
      result.current.updateHexapodStatuses([]);
      result.current.updateAlerts([]);
      result.current.setSelectedSensors([]);
      result.current.setRiskThreshold(0.5);
      result.current.setViewMode('3d');
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    expect(result.current.viewMode).toBe('3d');
    expect(result.current.riskThreshold).toBe(0.5);
    expect(result.current.animationSpeed).toBe(1.0);
    expect(result.current.showAlerts).toBe(true);
    expect(result.current.showSensorHealth).toBe(true);
    expect(result.current.sensorReadings).toEqual([]);
    expect(result.current.riskAssessments).toEqual([]);
    expect(result.current.hexapodStatuses).toEqual([]);
    expect(result.current.alerts).toEqual([]);
  });

  it('updates sensor readings', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const mockReadings = [
      {
        sensor_id: 'SENSOR-001',
        timestamp: new Date(),
        location: {
          latitude: -23.5505,
          longitude: 46.6333,
          elevation: 1250,
          utm_x: 500000,
          utm_y: 7400000,
          mine_grid_x: 100,
          mine_grid_y: 200
        },
        measurements: { temperature: 25.5 },
        quality_flags: { valid: true },
        battery_level: 85,
        signal_strength: 90
      }
    ];

    act(() => {
      result.current.updateSensorReadings(mockReadings);
    });

    expect(result.current.sensorReadings).toEqual(mockReadings);
    expect(result.current.lastUpdate).toBeInstanceOf(Date);
  });

  it('updates risk assessments', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const mockAssessments = [
      {
        assessment_id: 'RISK-001',
        timestamp: new Date(),
        spatial_extent: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        },
        risk_probability: 0.75,
        confidence_interval: [0.65, 0.85] as [number, number],
        time_to_failure: 3600,
        contributing_factors: ['rainfall', 'vibration'],
        alert_level: 3 as const,
        recommended_actions: ['evacuate personnel'],
        explanation: 'High risk detected'
      }
    ];

    act(() => {
      result.current.updateRiskAssessments(mockAssessments);
    });

    expect(result.current.riskAssessments).toEqual(mockAssessments);
  });

  it('updates hexapod statuses', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const mockStatuses = [
      {
        pod_id: 'HEX-001',
        location: {
          latitude: -23.5505,
          longitude: 46.6333,
          elevation: 1250,
          utm_x: 500000,
          utm_y: 7400000,
          mine_grid_x: 100,
          mine_grid_y: 200
        },
        operational_status: 'active' as const,
        sensor_health: {
          tilt: 'healthy' as const,
          accelerometer: 'healthy' as const
        },
        last_communication: new Date(),
        power_status: {
          battery_level: 85,
          solar_charging: true,
          estimated_runtime: 720
        }
      }
    ];

    act(() => {
      result.current.updateHexapodStatuses(mockStatuses);
    });

    expect(result.current.hexapodStatuses).toEqual(mockStatuses);
  });

  it('updates alerts', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const mockAlerts = [
      {
        id: 'ALERT-001',
        timestamp: new Date(),
        level: 3 as const,
        title: 'High Risk Detected',
        description: 'Risk level exceeded threshold',
        location: {
          latitude: -23.5505,
          longitude: 46.6333,
          elevation: 1250,
          utm_x: 500000,
          utm_y: 7400000,
          mine_grid_x: 100,
          mine_grid_y: 200
        },
        status: 'active' as const,
        actions_taken: ['personnel evacuation']
      }
    ];

    act(() => {
      result.current.updateAlerts(mockAlerts);
    });

    expect(result.current.alerts).toEqual(mockAlerts);
  });

  it('sets selected time range', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const start = new Date(Date.now() - 60 * 60 * 1000);
    const end = new Date();

    act(() => {
      result.current.setSelectedTimeRange(start, end);
    });

    expect(result.current.selectedTimeRange.start).toEqual(start);
    expect(result.current.selectedTimeRange.end).toEqual(end);
  });

  it('sets selected sensors', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const sensorIds = ['SENSOR-001', 'SENSOR-002'];

    act(() => {
      result.current.setSelectedSensors(sensorIds);
    });

    expect(result.current.selectedSensors).toEqual(sensorIds);
  });

  it('sets risk threshold', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    act(() => {
      result.current.setRiskThreshold(0.8);
    });

    expect(result.current.riskThreshold).toBe(0.8);
  });

  it('sets view mode', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    act(() => {
      result.current.setViewMode('2d');
    });

    expect(result.current.viewMode).toBe('2d');
  });

  it('sets animation speed', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    act(() => {
      result.current.setAnimationSpeed(2.0);
    });

    expect(result.current.animationSpeed).toBe(2.0);
  });

  it('toggles alerts visibility', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const initialState = result.current.showAlerts;

    act(() => {
      result.current.toggleAlerts();
    });

    expect(result.current.showAlerts).toBe(!initialState);
  });

  it('toggles sensor health visibility', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const initialState = result.current.showSensorHealth;

    act(() => {
      result.current.toggleSensorHealth();
    });

    expect(result.current.showSensorHealth).toBe(!initialState);
  });

  it('gets active sensors within time range', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const mockReadings = [
      {
        sensor_id: 'SENSOR-001',
        timestamp: oneHourAgo, // Within range
        location: {
          latitude: -23.5505,
          longitude: 46.6333,
          elevation: 1250,
          utm_x: 500000,
          utm_y: 7400000,
          mine_grid_x: 100,
          mine_grid_y: 200
        },
        measurements: { temperature: 25.5 },
        quality_flags: { valid: true },
        battery_level: 85,
        signal_strength: 90
      },
      {
        sensor_id: 'SENSOR-002',
        timestamp: twoHoursAgo, // Outside range
        location: {
          latitude: -23.5515,
          longitude: 46.6343,
          elevation: 1280,
          utm_x: 500100,
          utm_y: 7400100,
          mine_grid_x: 150,
          mine_grid_y: 250
        },
        measurements: { temperature: 26.0 },
        quality_flags: { valid: true },
        battery_level: 75,
        signal_strength: 85
      }
    ];

    act(() => {
      result.current.updateSensorReadings(mockReadings);
      result.current.setSelectedTimeRange(oneHourAgo, now);
    });

    const activeSensors = result.current.getActiveSensors();
    expect(activeSensors).toHaveLength(1);
    expect(activeSensors[0].sensor_id).toBe('SENSOR-001');
  });

  it('gets active alerts', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const mockAlerts = [
      {
        id: 'ALERT-001',
        timestamp: new Date(),
        level: 3 as const,
        title: 'Active Alert',
        description: 'This is active',
        location: {
          latitude: -23.5505,
          longitude: 46.6333,
          elevation: 1250,
          utm_x: 500000,
          utm_y: 7400000,
          mine_grid_x: 100,
          mine_grid_y: 200
        },
        status: 'active' as const,
        actions_taken: []
      },
      {
        id: 'ALERT-002',
        timestamp: new Date(),
        level: 2 as const,
        title: 'Resolved Alert',
        description: 'This is resolved',
        location: {
          latitude: -23.5515,
          longitude: 46.6343,
          elevation: 1280,
          utm_x: 500100,
          utm_y: 7400100,
          mine_grid_x: 150,
          mine_grid_y: 250
        },
        status: 'resolved' as const,
        actions_taken: []
      }
    ];

    act(() => {
      result.current.updateAlerts(mockAlerts);
    });

    const activeAlerts = result.current.getActiveAlerts();
    expect(activeAlerts).toHaveLength(1);
    expect(activeAlerts[0].id).toBe('ALERT-001');
  });

  it('gets current risk level', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const mockAssessments = [
      {
        assessment_id: 'RISK-001',
        timestamp: now, // Latest
        spatial_extent: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        },
        risk_probability: 0.8,
        confidence_interval: [0.7, 0.9] as [number, number],
        contributing_factors: [],
        alert_level: 3 as const,
        recommended_actions: [],
        explanation: 'Latest assessment'
      },
      {
        assessment_id: 'RISK-002',
        timestamp: oneMinuteAgo, // Older
        spatial_extent: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        },
        risk_probability: 0.5,
        confidence_interval: [0.4, 0.6] as [number, number],
        contributing_factors: [],
        alert_level: 2 as const,
        recommended_actions: [],
        explanation: 'Older assessment'
      }
    ];

    act(() => {
      result.current.updateRiskAssessments(mockAssessments);
    });

    const currentRiskLevel = result.current.getCurrentRiskLevel();
    expect(currentRiskLevel).toBe(0.8); // Should return the latest assessment
  });

  it('returns 0 risk level when no assessments', () => {
    const { result } = renderHook(() => useDashboardStore());
    
    const currentRiskLevel = result.current.getCurrentRiskLevel();
    expect(currentRiskLevel).toBe(0);
  });
});