import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Avatar,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Sensors,
  Battery1Bar,
  Battery3Bar,
  BatteryFull,
  SignalWifi4Bar,
  SignalWifiOff,
  Settings,
  Edit,
  Delete,
  Add,
  Refresh,
  Download,
  Warning,
  CheckCircle,
  Error,
  Info,
  Timeline,
  LocationOn
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Sensor {
  id: string;
  name: string;
  type: 'displacement' | 'tilt' | 'strain' | 'piezometer' | 'accelerometer' | 'temperature';
  status: 'active' | 'warning' | 'error' | 'offline';
  location: string;
  coordinates: { lat: number; lng: number };
  batteryLevel: number;
  signalStrength: number;
  lastReading: string;
  value: number;
  unit: string;
  calibrationDate: string;
  maintenanceDate: string;
}

const SensorManagementPage: React.FC = () => {
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Mock sensor data
  const sensors: Sensor[] = [
    {
      id: 'S001',
      name: 'Displacement Sensor Alpha',
      type: 'displacement',
      status: 'active',
      location: 'Sector A - Bench 1',
      coordinates: { lat: -23.5505, lng: -46.6333 },
      batteryLevel: 85,
      signalStrength: 92,
      lastReading: '2 minutes ago',
      value: 2.3,
      unit: 'mm',
      calibrationDate: '2024-01-15',
      maintenanceDate: '2024-03-01'
    },
    {
      id: 'S002',
      name: 'Tilt Sensor Beta',
      type: 'tilt',
      status: 'warning',
      location: 'Sector B - Bench 3',
      coordinates: { lat: -23.5515, lng: -46.6343 },
      batteryLevel: 45,
      signalStrength: 78,
      lastReading: '5 minutes ago',
      value: 1.2,
      unit: 'degrees',
      calibrationDate: '2024-01-10',
      maintenanceDate: '2024-02-28'
    },
    {
      id: 'S003',
      name: 'Strain Gauge Gamma',
      type: 'strain',
      status: 'active',
      location: 'Sector C - Bench 2',
      coordinates: { lat: -23.5525, lng: -46.6353 },
      batteryLevel: 92,
      signalStrength: 88,
      lastReading: '1 minute ago',
      value: 156.7,
      unit: 'με',
      calibrationDate: '2024-01-20',
      maintenanceDate: '2024-03-05'
    },
    {
      id: 'S004',
      name: 'Piezometer Delta',
      type: 'piezometer',
      status: 'error',
      location: 'Sector A - Bench 4',
      coordinates: { lat: -23.5535, lng: -46.6363 },
      batteryLevel: 12,
      signalStrength: 0,
      lastReading: '2 hours ago',
      value: 0,
      unit: 'kPa',
      calibrationDate: '2024-01-05',
      maintenanceDate: '2024-02-25'
    }
  ];

  // Mock time series data
  const generateTimeSeriesData = () => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      data.push({
        time: `${i}:00`,
        value: Math.random() * 10 + Math.sin(i * 0.5) * 5,
        threshold: 8
      });
    }
    return data;
  };

  const timeSeriesData = generateTimeSeriesData();

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'displacement': return <LocationOn />;
      case 'tilt': return <Timeline />;
      case 'strain': return <Sensors />;
      case 'piezometer': return <Info />;
      case 'accelerometer': return <Timeline />;
      case 'temperature': return <Sensors />;
      default: return <Sensors />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'offline': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      case 'offline': return <Info color="disabled" />;
      default: return <Info />;
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 60) return <BatteryFull color="success" />;
    if (level > 30) return <Battery3Bar color="warning" />;
    return <Battery1Bar color="error" />;
  };

  const getSignalIcon = (strength: number) => {
    if (strength > 0) return <SignalWifi4Bar color="success" />;
    return <SignalWifiOff color="error" />;
  };

  const filteredSensors = sensors.filter(sensor => {
    const statusMatch = filterStatus === 'all' || sensor.status === filterStatus;
    const typeMatch = filterType === 'all' || sensor.type === filterType;
    return statusMatch && typeMatch;
  });

  const handleSensorClick = (sensor: Sensor) => {
    setSelectedSensor(sensor);
    setDialogOpen(true);
    setEditMode(false);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedSensor(null);
    setEditMode(false);
  };

  const sensorStats = {
    total: sensors.length,
    active: sensors.filter(s => s.status === 'active').length,
    warning: sensors.filter(s => s.status === 'warning').length,
    error: sensors.filter(s => s.status === 'error').length,
    offline: sensors.filter(s => s.status === 'offline').length
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Sensor Management
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Monitor and manage all sensor nodes across the mine site
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
            >
              Export Data
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
            >
              Add Sensor
            </Button>
          </Box>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Sensor Statistics */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <Sensors />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {sensorStats.total}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Sensors
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <CheckCircle />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {sensorStats.active}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'warning.main' }}>
                        <Warning />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {sensorStats.warning}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Warning
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'error.main' }}>
                        <Error />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {sensorStats.error}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Error
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: 'grey.600' }}>
                        <Info />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {sensorStats.offline}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Offline
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </motion.div>
        </Grid>

        {/* Filters and Sensor Table */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <CardContent>
                {/* Filters */}
                <Box display="flex" gap={2} mb={3}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                      <MenuItem value="offline">Offline</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      label="Type"
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="displacement">Displacement</MenuItem>
                      <MenuItem value="tilt">Tilt</MenuItem>
                      <MenuItem value="strain">Strain</MenuItem>
                      <MenuItem value="piezometer">Piezometer</MenuItem>
                      <MenuItem value="accelerometer">Accelerometer</MenuItem>
                      <MenuItem value="temperature">Temperature</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Sensor Table */}
                <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Sensor</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Battery</TableCell>
                        <TableCell>Signal</TableCell>
                        <TableCell>Last Reading</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSensors.map((sensor) => (
                        <TableRow
                          key={sensor.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleSensorClick(sensor)}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                {getSensorIcon(sensor.type)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {sensor.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {sensor.id}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={sensor.type}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(sensor.status)}
                              <Chip
                                label={sensor.status}
                                size="small"
                                color={getStatusColor(sensor.status) as any}
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>{sensor.location}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getBatteryIcon(sensor.batteryLevel)}
                              <Typography variant="body2">
                                {sensor.batteryLevel}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getSignalIcon(sensor.signalStrength)}
                              <Typography variant="body2">
                                {sensor.signalStrength}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{sensor.lastReading}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {sensor.value} {sensor.unit}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditMode(true); handleSensorClick(sensor); }}>
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Settings">
                                <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                                  <Settings />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Sensor Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {editMode ? 'Edit Sensor' : 'Sensor Details'}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {selectedSensor && getStatusIcon(selectedSensor.status)}
              <Chip
                label={selectedSensor?.status}
                size="small"
                color={selectedSensor ? getStatusColor(selectedSensor.status) as any : 'default'}
              />
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedSensor && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Sensor Name"
                  value={selectedSensor.name}
                  disabled={!editMode}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Location"
                  value={selectedSensor.location}
                  disabled={!editMode}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Calibration Date"
                  value={selectedSensor.calibrationDate}
                  disabled={!editMode}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Maintenance Date"
                  value={selectedSensor.maintenanceDate}
                  disabled={!editMode}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box mb={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recent Readings (24h)
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <RechartsTooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#00ff88"
                        fill="rgba(0, 255, 136, 0.1)"
                      />
                      <Line
                        type="monotone"
                        dataKey="threshold"
                        stroke="#ff6b35"
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
                
                <Box display="flex" gap={2} mb={2}>
                  <Box flex={1}>
                    <Typography variant="body2" color="text.secondary">
                      Battery Level
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedSensor.batteryLevel}
                      color={selectedSensor.batteryLevel > 30 ? 'success' : 'error'}
                      sx={{ height: 8, borderRadius: 4, mt: 1 }}
                    />
                    <Typography variant="caption">
                      {selectedSensor.batteryLevel}%
                    </Typography>
                  </Box>
                  
                  <Box flex={1}>
                    <Typography variant="body2" color="text.secondary">
                      Signal Strength
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={selectedSensor.signalStrength}
                      color="primary"
                      sx={{ height: 8, borderRadius: 4, mt: 1 }}
                    />
                    <Typography variant="caption">
                      {selectedSensor.signalStrength}%
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancel
          </Button>
          {editMode ? (
            <Button variant="contained" onClick={handleCloseDialog}>
              Save Changes
            </Button>
          ) : (
            <Button variant="contained" onClick={() => setEditMode(true)}>
              Edit Sensor
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SensorManagementPage;