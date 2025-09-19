import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Sensors,
  Battery1Bar,
  Battery2Bar,
  Battery3Bar,
  BatteryFull,
  SignalWifi1Bar,
  SignalWifi2Bar,
  SignalWifi3Bar,
  SignalWifi4Bar,
  Warning,
  Error,
  CheckCircle,
  Refresh,
  LocationOn,
  Timeline
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { useDashboardStore } from '../../store/dashboardStore';
import { HexapodStatus } from '../../types';

interface SensorHealthPanelProps {
  className?: string;
}

const SensorHealthPanel: React.FC<SensorHealthPanelProps> = ({ className }) => {
  const { hexapodStatuses, sensorReadings, showSensorHealth } = useDashboardStore();
  
  const healthStats = useMemo(() => {
    const total = hexapodStatuses.length;
    const active = hexapodStatuses.filter(h => h.operational_status === 'active').length;
    const warning = hexapodStatuses.filter(h => h.operational_status === 'maintenance').length;
    const error = hexapodStatuses.filter(h => h.operational_status === 'error').length;
    const offline = hexapodStatuses.filter(h => h.operational_status === 'inactive').length;
    
    return { total, active, warning, error, offline };
  }, [hexapodStatuses]);
  
  const getBatteryIcon = (level: number) => {
    if (level > 75) return <BatteryFull color="success" />;
    if (level > 50) return <Battery3Bar color="warning" />;
    if (level > 25) return <Battery2Bar color="warning" />;
    return <Battery1Bar color="error" />;
  };
  
  const getSignalIcon = (strength: number) => {
    if (strength > 75) return <SignalWifi4Bar color="success" />;
    if (strength > 50) return <SignalWifi3Bar color="warning" />;
    if (strength > 25) return <SignalWifi2Bar color="warning" />;
    return <SignalWifi1Bar color="error" />;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'error': return 'error';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle color="success" />;
      case 'maintenance': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      case 'inactive': return <Sensors color="disabled" />;
      default: return <Sensors />;
    }
  };
  
  if (!showSensorHealth) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className={className}
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          sx={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            height: '100%',
            overflow: 'auto'
          }}
        >
          <CardContent>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Sensors />
                <Typography variant="h6">Sensor Health</Typography>
              </Box>
              <Tooltip title="Refresh">
                <IconButton size="small" sx={{ color: 'white' }}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Health Overview */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {healthStats.active}
                  </Typography>
                  <Typography variant="caption">Active</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {healthStats.error}
                  </Typography>
                  <Typography variant="caption">Errors</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {healthStats.warning}
                  </Typography>
                  <Typography variant="caption">Maintenance</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="text.secondary">
                    {healthStats.offline}
                  </Typography>
                  <Typography variant="caption">Offline</Typography>
                </Box>
              </Grid>
            </Grid>
            
            {/* Overall Health Bar */}
            <Box mb={3}>
              <Typography variant="body2" mb={1}>
                Network Health: {Math.round((healthStats.active / healthStats.total) * 100)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(healthStats.active / healthStats.total) * 100}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: healthStats.active / healthStats.total > 0.8 ? '#4caf50' : 
                                   healthStats.active / healthStats.total > 0.6 ? '#ff9800' : '#f44336'
                  }
                }}
              />
            </Box>
            
            {/* Sensor List */}
            <Typography variant="subtitle2" mb={2}>
              Hexapod Sensors ({hexapodStatuses.length})
            </Typography>
            
            <List dense>
              {hexapodStatuses.map((hexapod) => (
                <motion.div
                  key={hexapod.pod_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ListItem
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: 1,
                      mb: 1,
                      border: hexapod.operational_status === 'error' ? '1px solid #f44336' :
                             hexapod.operational_status === 'maintenance' ? '1px solid #ff9800' :
                             '1px solid transparent'
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={
                          Object.values(hexapod.sensor_health).filter(h => h !== 'healthy').length
                        }
                        color="error"
                        invisible={Object.values(hexapod.sensor_health).every(h => h === 'healthy')}
                      >
                        <Avatar
                          sx={{
                            backgroundColor: 
                              hexapod.operational_status === 'active' ? '#4caf50' :
                              hexapod.operational_status === 'maintenance' ? '#ff9800' :
                              hexapod.operational_status === 'error' ? '#f44336' : '#666666',
                            width: 32,
                            height: 32
                          }}
                        >
                          {getStatusIcon(hexapod.operational_status)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {hexapod.pod_id}
                          </Typography>
                          <Chip
                            label={hexapod.operational_status}
                            size="small"
                            color={getStatusColor(hexapod.operational_status) as any}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="rgba(255,255,255,0.7)">
                            Last seen: {formatDistanceToNow(hexapod.last_communication)} ago
                          </Typography>
                          <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              {getBatteryIcon(hexapod.power_status.battery_level)}
                              <Typography variant="caption">
                                {hexapod.power_status.battery_level}%
                              </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <LocationOn sx={{ fontSize: 16 }} />
                              <Typography variant="caption">
                                {hexapod.location.mine_grid_x.toFixed(1)}, {hexapod.location.mine_grid_y.toFixed(1)}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton size="small" sx={{ color: 'white' }}>
                            <Timeline />
                          </IconButton>
                        </Tooltip>
                        {hexapod.power_status.solar_charging && (
                          <Chip
                            label="Solar"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 16 }}
                          />
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                </motion.div>
              ))}
            </List>
            
            {hexapodStatuses.length === 0 && (
              <Box textAlign="center" py={4}>
                <Sensors sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
                <Typography variant="body2" color="rgba(255,255,255,0.7)" mt={1}>
                  No sensors detected
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default SensorHealthPanel;