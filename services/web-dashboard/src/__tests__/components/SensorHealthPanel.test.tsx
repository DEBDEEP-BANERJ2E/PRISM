import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SensorHealthPanel from '@/components/monitoring/SensorHealthPanel';
import { useDashboardStore } from '@/store/dashboardStore';

// Mock the store
vi.mock('@/store/dashboardStore');

const mockUseDashboardStore = vi.mocked(useDashboardStore);

const darkTheme = createTheme({ palette: { mode: 'dark' } });

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={darkTheme}>
    {children}
  </ThemeProvider>
);

describe('SensorHealthPanel', () => {
  const mockHexapodStatuses = [
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
        accelerometer: 'healthy' as const,
        piezometer: 'healthy' as const,
        temperature: 'healthy' as const,
        humidity: 'healthy' as const,
        strain: 'healthy' as const
      },
      last_communication: new Date(Date.now() - 5 * 60 * 1000),
      power_status: {
        battery_level: 85,
        solar_charging: true,
        estimated_runtime: 720
      }
    },
    {
      pod_id: 'HEX-002',
      location: {
        latitude: -23.5515,
        longitude: 46.6343,
        elevation: 1280,
        utm_x: 500100,
        utm_y: 7400100,
        mine_grid_x: 150,
        mine_grid_y: 250
      },
      operational_status: 'error' as const,
      sensor_health: {
        tilt: 'critical' as const,
        accelerometer: 'healthy' as const,
        piezometer: 'warning' as const,
        temperature: 'healthy' as const,
        humidity: 'healthy' as const,
        strain: 'critical' as const
      },
      last_communication: new Date(Date.now() - 60 * 60 * 1000),
      power_status: {
        battery_level: 15,
        solar_charging: false,
        estimated_runtime: 30
      }
    }
  ];

  beforeEach(() => {
    mockUseDashboardStore.mockReturnValue({
      hexapodStatuses: mockHexapodStatuses,
      sensorReadings: [],
      showSensorHealth: true
    } as any);
  });

  it('renders when showSensorHealth is true', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('Sensor Health')).toBeInTheDocument();
  });

  it('does not render when showSensorHealth is false', () => {
    mockUseDashboardStore.mockReturnValue({
      hexapodStatuses: mockHexapodStatuses,
      sensorReadings: [],
      showSensorHealth: false
    } as any);

    const { container } = render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays health statistics', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('displays correct active sensor count', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    // Should show 1 active sensor (HEX-001)
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays correct error sensor count', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    // Should show 1 error sensor (HEX-002)
    const errorCounts = screen.getAllByText('1');
    expect(errorCounts.length).toBeGreaterThan(0);
  });

  it('displays network health percentage', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    // Should show 50% health (1 active out of 2 total)
    expect(screen.getByText('Network Health: 50%')).toBeInTheDocument();
  });

  it('displays sensor list with correct count', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('Hexapod Sensors (2)')).toBeInTheDocument();
  });

  it('displays individual sensor information', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('HEX-001')).toBeInTheDocument();
    expect(screen.getByText('HEX-002')).toBeInTheDocument();
  });

  it('displays sensor status chips', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('displays battery levels', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
  });

  it('displays location coordinates', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('100.0, 200.0')).toBeInTheDocument();
    expect(screen.getByText('150.0, 250.0')).toBeInTheDocument();
  });

  it('displays last communication time', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText(/Last seen: .* ago/)).toBeInTheDocument();
  });

  it('displays solar charging indicator', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('Solar')).toBeInTheDocument();
  });

  it('handles empty sensor list', () => {
    mockUseDashboardStore.mockReturnValue({
      hexapodStatuses: [],
      sensorReadings: [],
      showSensorHealth: true
    } as any);

    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    expect(screen.getByText('No sensors detected')).toBeInTheDocument();
  });

  it('displays sensor health badges for unhealthy sensors', () => {
    render(
      <TestWrapper>
        <SensorHealthPanel />
      </TestWrapper>
    );

    // HEX-002 has 2 unhealthy sensors (tilt: critical, strain: critical)
    // Should show badge with count
    const badges = screen.getAllByText('2');
    expect(badges.length).toBeGreaterThan(0);
  });
});