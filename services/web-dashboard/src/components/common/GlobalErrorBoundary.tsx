import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ErrorOutline,
  Refresh,
  BugReport,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { useWorkflowStore } from '../../store/workflowStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // In production, send to monitoring service (e.g., Sentry, LogRocket)
    console.error('Global Error Boundary caught an error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Add error to workflow store for user notification
    try {
      const workflowStore = useWorkflowStore.getState();
      workflowStore.addNotification({
        type: 'error',
        title: 'Application Error',
        message: 'An unexpected error occurred. The development team has been notified.',
        duration: 10000,
        actions: [
          {
            label: 'Reload Page',
            action: () => window.location.reload()
          }
        ]
      });
    } catch (storeError) {
      console.error('Failed to add error notification to store:', storeError);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  private reportBug = () => {
    const { error, errorInfo } = this.state;
    const bugReport = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // In production, integrate with bug tracking system
    console.log('Bug report:', bugReport);
    
    // For now, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share with the development team.');
      })
      .catch(() => {
        alert('Failed to copy error details. Please manually report the issue.');
      });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            backgroundColor: 'background.default'
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ErrorOutline 
                  sx={{ 
                    fontSize: 48, 
                    color: 'error.main', 
                    mr: 2 
                  }} 
                />
                <Box>
                  <Typography variant="h5" gutterBottom>
                    Oops! Something went wrong
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    We encountered an unexpected error. Don't worry, we've been notified and are working on a fix.
                  </Typography>
                </Box>
              </Box>

              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Error Details</AlertTitle>
                {this.state.error?.message || 'An unknown error occurred'}
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleReload}
                  color="primary"
                >
                  Reload Page
                </Button>
                <Button
                  variant="outlined"
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<BugReport />}
                  onClick={this.reportBug}
                  color="secondary"
                >
                  Report Bug
                </Button>
              </Box>

              <Box>
                <Button
                  variant="text"
                  size="small"
                  onClick={this.toggleDetails}
                  endIcon={this.state.showDetails ? <ExpandLess /> : <ExpandMore />}
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                </Button>
                
                <Collapse in={this.state.showDetails}>
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      backgroundColor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Error Stack:
                    </Typography>
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 200,
                        overflow: 'auto',
                        color: 'text.secondary'
                      }}
                    >
                      {this.state.error?.stack}
                    </Typography>
                    
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                          Component Stack:
                        </Typography>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: 200,
                            overflow: 'auto',
                            color: 'text.secondary'
                          }}
                        >
                          {this.state.errorInfo.componentStack}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Collapse>
              </Box>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;