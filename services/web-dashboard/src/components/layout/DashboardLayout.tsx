import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Tooltip,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Timeline,
  Sensors,
  Warning,
  Settings,
  Map,
  Analytics,
  Notifications,
  ViewInAr,
  Terrain,
  WifiTetheringError,
  CheckCircle
} from '@mui/icons-material';
import { useDashboardStore } from '@/store/dashboardStore';
import { format } from 'date-fns';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {
    viewMode,
    showAlerts,
    showSensorHealth,
    isConnected,
    lastUpdate,
    getActiveAlerts,
    getCurrentRiskLevel,
    setViewMode,
    toggleAlerts,
    toggleSensorHealth
  } = useDashboardStore();
  
  const activeAlerts = getActiveAlerts();
  const currentRiskLevel = getCurrentRiskLevel();
  
  const navigationItems = [
    {
      text: 'Overview',
      icon: <Dashboard />,
      path: '/',
      badge: null
    },
    {
      text: 'Risk Analysis',
      icon: <Analytics />,
      path: '/risk',
      badge: currentRiskLevel > 0.7 ? 'HIGH' : null
    },
    {
      text: 'Sensor Network',
      icon: <Sensors />,
      path: '/sensors',
      badge: null
    },
    {
      text: 'Alerts',
      icon: <Warning />,
      path: '/alerts',
      badge: activeAlerts.length > 0 ? activeAlerts.length : null
    },
    {
      text: 'Timeline',
      icon: <Timeline />,
      path: '/timeline',
      badge: null
    },
    {
      text: '3D Visualization',
      icon: <ViewInAr />,
      path: '/3d',
      badge: null
    }
  ];
  
  const getRiskLevelColor = (risk: number) => {
    if (risk < 0.25) return '#4caf50';
    if (risk < 0.5) return '#ff9800';
    if (risk < 0.75) return '#ff5722';
    return '#f44336';
  };
  
  const getRiskLevelText = (risk: number) => {
    if (risk < 0.25) return 'LOW';
    if (risk < 0.5) return 'MEDIUM';
    if (risk < 0.75) return 'HIGH';
    return 'CRITICAL';
  };
  
  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(true)}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
            <Terrain sx={{ fontSize: 32, color: '#00ff88' }} />
            <Typography variant="h6" noWrap component="div">
              PRISM - Rockfall Prediction System
            </Typography>
          </Box>
          
          {/* Status Indicators */}
          <Box display="flex" alignItems="center" gap={2}>
            {/* Connection Status */}
            <Tooltip title={isConnected ? 'Connected' : 'Disconnected'}>
              <Box display="flex" alignItems="center" gap={1}>
                {isConnected ? (
                  <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                ) : (
                  <WifiTetheringError sx={{ color: '#f44336', fontSize: 20 }} />
                )}
                <Typography variant="body2">
                  {isConnected ? 'Online' : 'Offline'}
                </Typography>
              </Box>
            </Tooltip>
            
            {/* Risk Level */}
            <Chip
              label={`Risk: ${getRiskLevelText(currentRiskLevel)}`}
              sx={{
                backgroundColor: getRiskLevelColor(currentRiskLevel),
                color: 'white',
                fontWeight: 'bold'
              }}
            />
            
            {/* Active Alerts */}
            <Tooltip title="Active Alerts">
              <Badge badgeContent={activeAlerts.length} color="error">
                <IconButton color="inherit">
                  <Notifications />
                </IconButton>
              </Badge>
            </Tooltip>
            
            {/* Last Update */}
            {lastUpdate && (
              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                Updated: {format(lastUpdate, 'HH:mm:ss')}
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            background: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
            color: 'white',
            borderRight: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        <Toolbar />
        
        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          {/* View Mode Controls */}
          <Box p={2}>
            <Typography variant="subtitle2" mb={2}>
              View Mode
            </Typography>
            <Box display="flex" gap={1} mb={2}>
              {(['2d', '3d', 'hybrid'] as const).map((mode) => (
                <Chip
                  key={mode}
                  label={mode.toUpperCase()}
                  onClick={() => setViewMode(mode)}
                  variant={viewMode === mode ? 'filled' : 'outlined'}
                  color={viewMode === mode ? 'primary' : 'default'}
                  size="small"
                />
              ))}
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={showAlerts}
                  onChange={toggleAlerts}
                  color="primary"
                />
              }
              label="Show Alerts"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={showSensorHealth}
                  onChange={toggleSensorHealth}
                  color="primary"
                />
              }
              label="Sensor Health"
            />
          </Box>
          
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          
          {/* Navigation Items */}
          <List>
            {navigationItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 255, 136, 0.1)'
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: 'white' }}>
                    {item.badge ? (
                      <Badge
                        badgeContent={item.badge}
                        color={typeof item.badge === 'number' ? 'error' : 'warning'}
                      >
                        {item.icon}
                      </Badge>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          
          {/* Settings */}
          <List>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemIcon sx={{ color: 'white' }}>
                  <Settings />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
        }}
      >
        <Toolbar />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ height: 'calc(100% - 64px)' }}
        >
          {children}
        </motion.div>
      </Box>
    </Box>
  );
};

export default DashboardLayout;