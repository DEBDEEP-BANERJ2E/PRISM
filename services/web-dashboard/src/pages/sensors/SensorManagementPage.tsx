import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  CircularProgress
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
  LocationOn,
  Thermostat,
  Opacity,
  Speed,
  GpsFixed,
  Vibration
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface SensorData {
  temp: number;
  hum: number;
  pres: number;
  acc: [number, number, number];
  gyro: [number, number, number];
  ang: [number, number, number];
  lat: number;
  lon: number;
  spd: number;
}

interface Sensor {
  id: string;
  name: string;
  type: 'temperature' | 'humidity' | 'pressure' | 'accelerometer' | 'gyroscope' | 'angle' | 'gps' | 'speed';
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
  rawData?: SensorData;
}

interface ChartDataPoint {
  time: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  accX?: number;
  accY?: number;
  accZ?: number;
  gyroX?: number;
  gyroY?: number;
  gyroZ?: number;
  angleX?: number;
  angleY?: number;
  angleZ?: number;
  speed?: number;
}

const SensorManagementPage: React.FC = () => {
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch sensor data from the API with fallback to mock data
  const fetchSensorData = async () => {
    try {
      setLoading(true);
      setError(null);

      let rawData: SensorData;

      try {
        const response = await fetch('https://7f21bedfb63c.ngrok-free.app/');
        if (!response.ok) {
          throw Error(`HTTP error! status: ${response.status}`);
        }
        rawData = await response.json();
      } catch (fetchError) {
        // Fallback to mock data when API is not available
        console.warn('API not available, using mock data:', fetchError);
        rawData = {
          temp: 32.40 + (Math.random() - 0.5) * 5,
          hum: 53.80 + (Math.random() - 0.5) * 10,
          pres: 992.80 + (Math.random() - 0.5) * 20,
          acc: [
            -0.03 + (Math.random() - 0.5) * 0.1,
            -0.01 + (Math.random() - 0.5) * 0.1,
            1.01 + (Math.random() - 0.5) * 0.2
          ],
          gyro: [
            -0.19 + (Math.random() - 0.5) * 2,
            -1.01 + (Math.random() - 0.5) * 2,
            -0.06 + (Math.random() - 0.5) * 2
          ],
          ang: [
            -15.25 + (Math.random() - 0.5) * 30,
            -80.61 + (Math.random() - 0.5) * 30,
            -27.03 + (Math.random() - 0.5) * 30
          ],
          lat: 22.572599 + (Math.random() - 0.5) * 0.001,
          lon: 88.363899 + (Math.random() - 0.5) * 0.001,
          spd: Math.random() * 10
        };
      }

      // Transform raw sensor data into sensor objects
      const sensorList: Sensor[] = [
        {
          id: 'TEMP001',
          name: 'Temperature Sensor',
          type: 'temperature',
          status: rawData.temp > 35 ? 'warning' : 'active',
          location: `Lat: ${rawData.lat.toFixed(4)}, Lon: ${rawData.lon.toFixed(4)}`,
          coordinates: { lat: rawData.lat, lng: rawData.lon },
          batteryLevel: Math.floor(Math.random() * 40) + 60, // Random battery level
          signalStrength: Math.floor(Math.random() * 30) + 70, // Random signal strength
          lastReading: 'Just now',
          value: rawData.temp,
          unit: '°C',
          calibrationDate: '2024-01-15',
          maintenanceDate: '2024-03-01',
          rawData: rawData
        },
        {
          id: 'HUM001',
          name: 'Humidity Sensor',
          type: 'humidity',
          status: rawData.hum > 80 ? 'warning' : 'active',
          location: `Lat: ${rawData.lat.toFixed(4)}, Lon: ${rawData.lon.toFixed(4)}`,
          coordinates: { lat: rawData.lat, lng: rawData.lon },
          batteryLevel: Math.floor(Math.random() * 40) + 60,
          signalStrength: Math.floor(Math.random() * 30) + 70,
          lastReading: 'Just now',
          value: rawData.hum,
          unit: '%',
          calibrationDate: '2024-01-10',
          maintenanceDate: '2024-02-28',
          rawData: rawData
        },
        {
          id: 'PRES001',
          name: 'Pressure Sensor',
          type: 'pressure',
          status: rawData.pres < 980 || rawData.pres > 1020 ? 'warning' : 'active',
          location: `Lat: ${rawData.lat.toFixed(4)}, Lon: ${rawData.lon.toFixed(4)}`,
          coordinates: { lat: rawData.lat, lng: rawData.lon },
          batteryLevel: Math.floor(Math.random() * 40) + 60,
          signalStrength: Math.floor(Math.random() * 30) + 70,
          lastReading: 'Just now',
          value: rawData.pres,
          unit: 'hPa',
          calibrationDate: '2024-01-20',
          maintenanceDate: '2024-03-05',
          rawData: rawData
        },
        {
          id: 'ACC001',
          name: 'Accelerometer',
          type: 'accelerometer',
          status: Math.abs(rawData.acc[0]) > 2 || Math.abs(rawData.acc[1]) > 2 || Math.abs(rawData.acc[2] - 9.8) > 1 ? 'warning' : 'active',
          location: `Lat: ${rawData.lat.toFixed(4)}, Lon: ${rawData.lon.toFixed(4)}`,
          coordinates: { lat: rawData.lat, lng: rawData.lon },
          batteryLevel: Math.floor(Math.random() * 40) + 60,
          signalStrength: Math.floor(Math.random() * 30) + 70,
          lastReading: 'Just now',
          value: Math.sqrt(rawData.acc[0] ** 2 + rawData.acc[1] ** 2 + rawData.acc[2] ** 2),
          unit: 'm/s²',
          calibrationDate: '2024-01-05',
          maintenanceDate: '2024-02-25',
          rawData: rawData
        },
        {
          id: 'GYRO001',
          name: 'Gyroscope',
          type: 'gyroscope',
          status: Math.abs(rawData.gyro[0]) > 10 || Math.abs(rawData.gyro[1]) > 10 || Math.abs(rawData.gyro[2]) > 10 ? 'warning' : 'active',
          location: `Lat: ${rawData.lat.toFixed(4)}, Lon: ${rawData.lon.toFixed(4)}`,
          coordinates: { lat: rawData.lat, lng: rawData.lon },
          batteryLevel: Math.floor(Math.random() * 40) + 60,
          signalStrength: Math.floor(Math.random() * 30) + 70,
          lastReading: 'Just now',
          value: Math.sqrt(rawData.gyro[0] ** 2 + rawData.gyro[1] ** 2 + rawData.gyro[2] ** 2),
          unit: '°/s',
          calibrationDate: '2024-01-12',
          maintenanceDate: '2024-03-10',
          rawData: rawData
        },
        {
          id: 'ANG001',
          name: 'Angle Sensor',
          type: 'angle',
          status: Math.abs(rawData.ang[0]) > 45 || Math.abs(rawData.ang[1]) > 45 || Math.abs(rawData.ang[2]) > 45 ? 'warning' : 'active',
          location: `Lat: ${rawData.lat.toFixed(4)}, Lon: ${rawData.lon.toFixed(4)}`,
          coordinates: { lat: rawData.lat, lng: rawData.lon },
          batteryLevel: Math.floor(Math.random() * 40) + 60,
          signalStrength: Math.floor(Math.random() * 30) + 70,
          lastReading: 'Just now',
          value: Math.sqrt(rawData.ang[0] ** 2 + rawData.ang[1] ** 2 + rawData.ang[2] ** 2),
          unit: '°',
          calibrationDate: '2024-01-18',
          maintenanceDate: '2024-03-15',
          rawData: rawData
        },
        {
          id: 'GPS001',
          name: 'GPS Module',
          type: 'gps',
          status: 'active',
          location: `Lat: ${rawData.lat.toFixed(4)}, Lon: ${rawData.lon.toFixed(4)}`,
          coordinates: { lat: rawData.lat, lng: rawData.lon },
          batteryLevel: Math.floor(Math.random() * 40) + 60,
          signalStrength: Math.floor(Math.random() * 30) + 70,
          lastReading: 'Just now',
          value: rawData.spd,
          unit: 'km/h',
          calibrationDate: '2024-01-25',
          maintenanceDate: '2024-04-01',
          rawData: rawData
        },
        {
          id: 'SPD001',
          name: 'Speed Sensor',
          type: 'speed',
          status: rawData.spd > 50 ? 'warning' : 'active',
          location: `Lat: ${rawData.lat.toFixed(4)}, Lon: ${rawData.lon.toFixed(4)}`,
          coordinates: { lat: rawData.lat, lng: rawData.lon },
          batteryLevel: Math.floor(Math.random() * 40) + 60,
          signalStrength: Math.floor(Math.random() * 30) + 70,
          lastReading: 'Just now',
          value: rawData.spd,
          unit: 'km/h',
          calibrationDate: '2024-01-30',
          maintenanceDate: '2024-04-05',
          rawData: rawData
        }
      ];

      setSensors(sensorList);
      setLastUpdate(new Date());

      // Update chart data
      const chartPoint: ChartDataPoint = {
        time: new Date().toLocaleTimeString(),
        temperature: rawData.temp,
        humidity: rawData.hum,
        pressure: rawData.pres,
        accX: rawData.acc[0],
        accY: rawData.acc[1],
        accZ: rawData.acc[2],
        gyroX: rawData.gyro[0],
        gyroY: rawData.gyro[1],
        gyroZ: rawData.gyro[2],
        angleX: rawData.ang[0],
        angleY: rawData.ang[1],
        angleZ: rawData.ang[2],
        speed: rawData.spd
      };

      setChartData(prev => [...prev.slice(-19), chartPoint]); // Keep last 20 points

    } catch (err) {
      const errorMessage = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Failed to fetch sensor data';
      setError(errorMessage);
      console.error('Error fetching sensor data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and set up polling
  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent re-renders

  // Memoize the fetch function to prevent unnecessary re-renders
  const memoizedFetchSensorData = useCallback(() => {
    fetchSensorData();
  }, []);

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return <Thermostat />;
      case 'humidity': return <Opacity />;
      case 'pressure': return <Speed />;
      case 'accelerometer': return <Vibration />;
      case 'gyroscope': return <Timeline />;
      case 'angle': return <Timeline />;
      case 'gps': return <GpsFixed />;
      case 'speed': return <Speed />;
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

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading sensor data...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          <Typography variant="h6">Error Loading Sensor Data</Typography>
          <Typography variant="body2">{error}</Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={fetchSensorData}
            startIcon={<Refresh />}
          >
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

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
            {lastUpdate && (
              <Typography variant="caption" color="text.secondary">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={memoizedFetchSensorData}
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

        {/* Real-time Sensor Charts */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Grid container spacing={3}>
              {/* Temperature & Humidity Chart */}
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Temperature & Humidity
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip />
                        <Line
                          type="monotone"
                          dataKey="temperature"
                          stroke="#ff6b35"
                          strokeWidth={2}
                          name="Temperature (°C)"
                        />
                        <Line
                          type="monotone"
                          dataKey="humidity"
                          stroke="#00a8ff"
                          strokeWidth={2}
                          name="Humidity (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Pressure Chart */}
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Atmospheric Pressure
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Pressure (hPa)', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip />
                        <Area
                          type="monotone"
                          dataKey="pressure"
                          stroke="#00ff88"
                          fill="rgba(0, 255, 136, 0.1)"
                          name="Pressure (hPa)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Accelerometer Chart */}
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Accelerometer (m/s²)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Acceleration (m/s²)', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip />
                        <Line
                          type="monotone"
                          dataKey="accX"
                          stroke="#ff1744"
                          strokeWidth={2}
                          name="X-Axis"
                        />
                        <Line
                          type="monotone"
                          dataKey="accY"
                          stroke="#00e676"
                          strokeWidth={2}
                          name="Y-Axis"
                        />
                        <Line
                          type="monotone"
                          dataKey="accZ"
                          stroke="#2196f3"
                          strokeWidth={2}
                          name="Z-Axis"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Gyroscope Chart */}
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Gyroscope (°/s)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Angular Velocity (°/s)', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip />
                        <Line
                          type="monotone"
                          dataKey="gyroX"
                          stroke="#ff9800"
                          strokeWidth={2}
                          name="X-Axis"
                        />
                        <Line
                          type="monotone"
                          dataKey="gyroY"
                          stroke="#9c27b0"
                          strokeWidth={2}
                          name="Y-Axis"
                        />
                        <Line
                          type="monotone"
                          dataKey="gyroZ"
                          stroke="#607d8b"
                          strokeWidth={2}
                          name="Z-Axis"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Angle Chart */}
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Orientation Angles (°)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Angle (°)', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip />
                        <Line
                          type="monotone"
                          dataKey="angleX"
                          stroke="#e91e63"
                          strokeWidth={2}
                          name="X-Axis"
                        />
                        <Line
                          type="monotone"
                          dataKey="angleY"
                          stroke="#3f51b5"
                          strokeWidth={2}
                          name="Y-Axis"
                        />
                        <Line
                          type="monotone"
                          dataKey="angleZ"
                          stroke="#ff5722"
                          strokeWidth={2}
                          name="Z-Axis"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Speed Chart */}
              <Grid item xs={12} md={6}>
                <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Speed (km/h)
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip />
                        <Bar
                          dataKey="speed"
                          fill="#4caf50"
                          name="Speed (km/h)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
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
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <RechartsTooltip />
                      <Area
                        type="monotone"
                        dataKey="temperature"
                        stroke="#ff6b35"
                        fill="rgba(255, 107, 53, 0.1)"
                        name="Temperature (°C)"
                      />
                      <Area
                        type="monotone"
                        dataKey="humidity"
                        stroke="#00a8ff"
                        fill="rgba(0, 168, 255, 0.1)"
                        name="Humidity (%)"
                      />
                      <Area
                        type="monotone"
                        dataKey="pressure"
                        stroke="#00ff88"
                        fill="rgba(0, 255, 136, 0.1)"
                        name="Pressure (hPa)"
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