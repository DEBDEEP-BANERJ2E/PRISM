import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TerrainVisualization from '@/components/3D/TerrainVisualization';
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

describe('TerrainVisualization', () => {
  beforeEach(() => {
    mockUseDashboardStore.mockReturnValue({
      riskHeatmap: null,
      hexapodStatuses: [
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
          last_communication: new Date(),
          power_status: {
            battery_level: 85,
            solar_charging: true,
            estimated_runtime: 720
          }
        }
      ],
      sensorReadings: [],
      animationSpeed: 1.0,
      riskThreshold: 0.5
    } as any);
  });

  it('renders the 3D canvas', () => {
    render(
      <TestWrapper>
        <TerrainVisualization />
      </TestWrapper>
    );

    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('renders camera controls', () => {
    render(
      <TestWrapper>
        <TerrainVisualization />
      </TestWrapper>
    );

    expect(screen.getByTestId('perspective-camera')).toBeInTheDocument();
    expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
  });

  it('renders environment lighting', () => {
    render(
      <TestWrapper>
        <TerrainVisualization />
      </TestWrapper>
    );

    expect(screen.getByTestId('environment')).toBeInTheDocument();
  });

  it('applies motion animation on mount', () => {
    const { container } = render(
      <TestWrapper>
        <TerrainVisualization />
      </TestWrapper>
    );

    // Check that the motion div is present
    const motionDiv = container.firstChild;
    expect(motionDiv).toBeInTheDocument();
  });

  it('handles empty hexapod statuses', () => {
    mockUseDashboardStore.mockReturnValue({
      riskHeatmap: null,
      hexapodStatuses: [],
      sensorReadings: [],
      animationSpeed: 1.0,
      riskThreshold: 0.5
    } as any);

    render(
      <TestWrapper>
        <TerrainVisualization />
      </TestWrapper>
    );

    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('handles different operational statuses', () => {
    mockUseDashboardStore.mockReturnValue({
      riskHeatmap: null,
      hexapodStatuses: [
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
          operational_status: 'error' as const,
          sensor_health: {},
          last_communication: new Date(),
          power_status: {
            battery_level: 15,
            solar_charging: false,
            estimated_runtime: 30
          }
        }
      ],
      sensorReadings: [],
      animationSpeed: 1.0,
      riskThreshold: 0.5
    } as any);

    render(
      <TestWrapper>
        <TerrainVisualization />
      </TestWrapper>
    );

    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });
});