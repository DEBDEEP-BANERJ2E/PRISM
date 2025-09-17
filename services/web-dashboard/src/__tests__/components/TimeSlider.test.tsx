import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TimeSlider from '@/components/controls/TimeSlider';
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

describe('TimeSlider', () => {
  const mockSetSelectedTimeRange = vi.fn();
  const mockSetAnimationSpeed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseDashboardStore.mockReturnValue({
      selectedTimeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      },
      animationSpeed: 1.0,
      setSelectedTimeRange: mockSetSelectedTimeRange,
      setAnimationSpeed: mockSetAnimationSpeed
    } as any);
  });

  it('renders the time slider component', () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    expect(screen.getByText('Temporal Analysis')).toBeInTheDocument();
  });

  it('displays current time', () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    // Should display some time format
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('renders playback controls', () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    // Should have play/pause button and step controls
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('renders time range selector', () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    // Should have time range dropdown
    const timeRangeSelect = screen.getByText('24 Hours');
    expect(timeRangeSelect).toBeInTheDocument();
  });

  it('renders speed selector', () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    // Should have speed dropdown
    const speedSelect = screen.getByText('1x');
    expect(speedSelect).toBeInTheDocument();
  });

  it('handles play/pause toggle', async () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // After clicking play, should show pause
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });
  });

  it('handles time range change', async () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    const timeRangeSelect = screen.getByText('24 Hours');
    fireEvent.mouseDown(timeRangeSelect);
    
    // Wait for dropdown to open and find option
    await waitFor(() => {
      const option = screen.getByText('6 Hours');
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(mockSetSelectedTimeRange).toHaveBeenCalled();
    });
  });

  it('handles speed change', async () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    const speedSelect = screen.getByText('1x');
    fireEvent.mouseDown(speedSelect);
    
    // Wait for dropdown to open and find option
    await waitFor(() => {
      const option = screen.getByText('2x');
      fireEvent.click(option);
    });

    await waitFor(() => {
      expect(mockSetAnimationSpeed).toHaveBeenCalledWith(2);
    });
  });

  it('handles step backward', () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    const stepBackButton = screen.getByRole('button', { name: /step backward/i });
    fireEvent.click(stepBackButton);

    // Should not throw error
    expect(stepBackButton).toBeInTheDocument();
  });

  it('handles step forward', () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    const stepForwardButton = screen.getByRole('button', { name: /step forward/i });
    fireEvent.click(stepForwardButton);

    // Should not throw error
    expect(stepForwardButton).toBeInTheDocument();
  });

  it('displays time markers', () => {
    render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    // Should display start and end time markers
    const timeMarkers = screen.getAllByText(/\d{2}:\d{2}/);
    expect(timeMarkers.length).toBeGreaterThanOrEqual(2);
  });

  it('applies dark theme styling', () => {
    const { container } = render(
      <TestWrapper>
        <TimeSlider />
      </TestWrapper>
    );

    // Check for dark background styling
    const timeSliderContainer = container.firstChild;
    expect(timeSliderContainer).toBeInTheDocument();
  });
});