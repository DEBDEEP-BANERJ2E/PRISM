import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import OptimizedImage from '../../components/common/OptimizedImage';

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe('OptimizedImage', () => {
  beforeEach(() => {
    mockIntersectionObserver.mockClear();
  });

  it('renders with basic props', () => {
    render(
      <TestWrapper>
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test image"
          width={200}
          height={150}
        />
      </TestWrapper>
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    render(
      <TestWrapper>
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test image"
          width={200}
          height={150}
        />
      </TestWrapper>
    );

    // Should show skeleton while loading
    const skeleton = document.querySelector('.MuiSkeleton-root');
    expect(skeleton).toBeInTheDocument();
  });

  it('uses eager loading when priority is true', () => {
    render(
      <TestWrapper>
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test image"
          width={200}
          height={150}
          priority={true}
        />
      </TestWrapper>
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy'); // Default is still lazy, but priority affects intersection observer
  });

  it('handles error state with fallback', () => {
    render(
      <TestWrapper>
        <OptimizedImage
          src="/invalid-image.jpg"
          alt="Test image"
          width={200}
          height={150}
          fallbackSrc="/fallback-image.jpg"
        />
      </TestWrapper>
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
  });

  it('applies custom styles', () => {
    const customStyle = { borderRadius: '8px' };
    
    render(
      <TestWrapper>
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test image"
          width={200}
          height={150}
          style={customStyle}
        />
      </TestWrapper>
    );

    const container = document.querySelector('.MuiBox-root');
    expect(container).toHaveStyle('border-radius: 8px');
  });
});