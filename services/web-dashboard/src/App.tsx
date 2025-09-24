import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AnimatePresence } from 'framer-motion';

// Pages - Lazy loaded for performance
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const AppBriefPage = React.lazy(() => import('./pages/AppBriefPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const WaitlistPage = React.lazy(() => import('./pages/WaitlistPage'));
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const DataInputPage = React.lazy(() => import('./pages/data-input/DataInputPage'));
const ModelConfigurationPage = React.lazy(() => import('./pages/models-config/ModelConfigurationPage'));
const AnalyticsPage = React.lazy(() => import('./pages/analytics/AnalyticsPage'));
const ReportsPage = React.lazy(() => import('./pages/reports/ReportsPage'));
const ScenarioPage = React.lazy(() => import('./pages/scenario/ScenarioPage'));
const RiskAssessmentPage = React.lazy(() => import('./pages/risk/RiskAssessmentPage'));
const SensorManagementPage = React.lazy(() => import('./pages/sensors/SensorManagementPage'));
const AlertsPage = React.lazy(() => import('./pages/alerts/AlertsPage'));
const DigitalTwinPage = React.lazy(() => import('./pages/digital-twin/DigitalTwinPage'));
const SettingsPage = React.lazy(() => import('./pages/settings/SettingsPage'));
const ProfilePage = React.lazy(() => import('./pages/profile/ProfilePage'));

// Layout and Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';
import NotificationSystem from './components/common/NotificationSystem';
import LoadingOverlay from './components/common/LoadingOverlay';

// Create dark theme for the dashboard
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff88',
      dark: '#00cc6a',
      light: '#33ff9a'
    },
    secondary: {
      main: '#ff6b35',
      dark: '#cc5529',
      light: '#ff8a5c'
    },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(26, 26, 26, 0.9)'
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)'
    },
    error: {
      main: '#f44336'
    },
    warning: {
      main: '#ff9800'
    },
    success: {
      main: '#4caf50'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700
    },
    h2: {
      fontWeight: 600
    },
    h3: {
      fontWeight: 600
    },
    h4: {
      fontWeight: 600
    },
    h5: {
      fontWeight: 500
    },
    h6: {
      fontWeight: 500
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Custom scrollbar styles
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 255, 136, 0.5)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(0, 255, 136, 0.7)',
            },
          },
          // Apply to all scrollable elements
          '*::-webkit-scrollbar': {
            width: '8px',
          },
          '*::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
          },
          '*::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 255, 136, 0.5)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(0, 255, 136, 0.7)',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6
        }
      }
    }
  }
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000 // 30 seconds
    }
  }
});

const App: React.FC = () => {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <NotificationSystem />
            <AnimatePresence mode="wait">
              <Suspense fallback={<LoadingOverlay open={true} message="Loading application..." />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/brief" element={<AppBriefPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/waitlist" element={<WaitlistPage />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* Protected Routes */}
                  <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/app/home" replace />} />
                    <Route path="home" element={<HomePage />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="data-input" element={<DataInputPage />} />
                    <Route path="model-config" element={<ModelConfigurationPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="scenario" element={<ScenarioPage />} />
                    <Route path="risk" element={<RiskAssessmentPage />} />
                    <Route path="sensors" element={<SensorManagementPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="digital-twin" element={<DigitalTwinPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;