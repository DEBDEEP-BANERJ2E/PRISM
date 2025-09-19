import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 200,
            p: 2
          }}
        >
          <Alert severity="info" sx={{ maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>
              3D Visualization Unavailable
            </Typography>
            <Typography variant="body2">
              The 3D visualization couldn't load. This might be due to browser compatibility or WebGL support.
            </Typography>
          </Alert>
        </Box>
      );
    }

    return <>{this.props.children}</>;
  }
}

export default ErrorBoundary;