import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import { useDashboardStore } from '../store/dashboardStore';
import DashboardLayout from '../components/layout/DashboardLayout';
import TerrainVisualization from '../components/3D/TerrainVisualization';
import MapboxView from '../components/map/MapboxView';
import TimeSlider from '../components/controls/TimeSlider';
import SensorHealthPanel from '../components/monitoring/SensorHealthPanel';
import { HexapodStatus, SensorReading, RiskAssessment, AlertEvent } from '../types';

const Dashboard: React.FC = () => {
  const {
    viewMode,
    showSensorHealth,
    updateHexapodStatuses,
    updateSensorReadings,
    updateRiskAssessments,
    updateAlerts,
    setConnected
  } = useDashboardStore();
  
  // Mock data initialization
  useEffect(() => {
    // Simulate initial data load
    const mockHexapodStatuses: HexapodStatus[] = [
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
        operational_status: 'active',
        sensor_health: {
          tilt: 'healthy',
          accelerometer: 'healthy',
          piezometer: 'healthy',
          temperature: 'healthy',
          humidity: 'healthy',
          strain: 'warning'
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
        operational_status: 'maintenance',
        sensor_health: {
          tilt: 'healthy',
          accelerometer: 'critical',
          piezometer: 'healthy',
          temperature: 'healthy',
          humidity: 'healthy',
          strain: 'healthy'
        },
        last_communication: new Date(Date.now() - 15 * 60 * 1000),
        power_status: {
          battery_level: 45,
          solar_charging: false,
          estimated_runtime: 180
        }
      },
      {
        pod_id: 'HEX-003',
        location: {
          latitude: -23.5525,
          longitude: 46.6353,
          elevation: 1320,
          utm_x: 500200,
          utm_y: 7400200,
          mine_grid_x: 200,
          mine_grid_y: 300
        },
        operational_status: 'error',
        sensor_health: {
          tilt: 'critical',
          accelerometer: 'healthy',
          piezometer: 'warning',
          temperature: 'healthy',
          humidity: 'healthy',
          strain: 'critical'
        },
        last_communication: new Date(Date.now() - 60 * 60 * 1000),
        power_status: {
          battery_level: 15,
          solar_charging: false,
          estimated_runtime: 30
        }
      }
    ];
    
    const mockAlerts: AlertEvent[] = [
      {
        id: 'ALERT-001',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        level: 3,
        title: 'High Risk Zone Detected',
        description: 'Elevated displacement rates detected in Sector 7',
        location: {
          latitude: -23.5515,
          longitude: 46.6343,
          elevation: 1280,
          utm_x: 500100,
          utm_y: 7400100,
          mine_grid_x: 150,
          mine_grid_y: 250
        },
        status: 'active',
        actions_taken: ['Personnel evacuation initiated', 'Equipment relocated']
      },
      {
        id: 'ALERT-002',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        level: 2,
        title: 'Sensor Communication Lost',
        description: 'HEX-003 has not reported for 60 minutes',
        location: {
          latitude: -23.5525,
          longitude: 46.6353,
          elevation: 1320,
          utm_x: 500200,
          utm_y: 7400200,
          mine_grid_x: 200,
          mine_grid_y: 300
        },
        status: 'acknowledged',
        actions_taken: ['Maintenance team dispatched']
      }
    ];
    
    updateHexapodStatuses(mockHexapodStatuses);
    updateAlerts(mockAlerts);
    setConnected(true);
  }, [updateHexapodStatuses, updateAlerts, setConnected]);
  
  return (
    <DashboardLayout>
      <Box sx={{ height: '100%', position: 'relative' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Main Visualization Area */}
          <Grid
            item
            xs={showSensorHealth ? 9 : 12}
            sx={{ height: '100%', position: 'relative' }}
          >
            {viewMode === '3d' ? (
              <TerrainVisualization />
            ) : viewMode === '2d' ? (
              <MapboxView height="100%" showControls={true} interactive={true} />
            ) : (
              // Hybrid view - split screen
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ height: '50%', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <TerrainVisualization />
                </Box>
                <Box sx={{ height: '50%' }}>
                  <MapboxView height="100%" showControls={false} interactive={true} />
                </Box>
              </Box>
            )}
            
            {/* Time Slider Overlay */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
            >
              <TimeSlider />
            </Box>
          </Grid>
          
          {/* Sensor Health Panel */}
          {showSensorHealth && (
            <Grid item xs={3} sx={{ height: '100%' }}>
              <SensorHealthPanel sx={{ height: '100%' }} />
            </Grid>
          )}
        </Grid>
        
        {/* Risk Level Indicator */}
        <motion.div
          style={{
            position: 'absolute',
            top: 20,
            right: showSensorHealth ? 'calc(25% + 20px)' : '20px',
            zIndex: 10
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          <Card
            sx={{
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              minWidth: 200
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" mb={1}>
                Current Risk Level
              </Typography>
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    color: '#ff5722',
                    fontWeight: 'bold',
                    textShadow: '0 0 10px rgba(255, 87, 34, 0.5)'
                  }}
                >
                  HIGH
                </Typography>
              </motion.div>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                72% Probability
              </Typography>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </DashboardLayout>
  );
};

export default Dashboard;