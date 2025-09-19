import React, { useRef, useEffect, useState, useCallback } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, ScaleControl, GeolocateControl } from 'react-map-gl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  useTheme,
  alpha,
  Button,
  Divider
} from '@mui/material';
import {
  Sensors,
  Warning,
  CheckCircle,
  Error,
  Battery3Bar,
  Battery1Bar,
  BatteryFull,
  SignalWifi4Bar,
  SignalWifiOff,
  MyLocation,
  Layers,
  Terrain,
  Close
} from '@mui/icons-material';
import { useDashboardStore } from '../../store/dashboardStore';
import type { HexapodStatus } from '../../types';

// Mapbox access token from environment variables
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoicHJpc20tbWluaW5nIiwiYSI6ImNscXh5ejF4YjBhZGsya3BjcWV4dGZkdGcifQ.example';

interface MapboxViewProps {
  height?: string | number;
  showControls?: boolean;
  interactive?: boolean;
}

const MapboxView: React.FC<MapboxViewProps> = ({ 
  height = '100%', 
  showControls = true, 
  interactive = true 
}) => {
  const theme = useTheme();
  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: 46.6333, // Madagascar coordinates (example mine location)
    latitude: -23.5505,
    zoom: 14,
    pitch: 45,
    bearing: 0
  });
  const [selectedSensor, setSelectedSensor] = useState<HexapodStatus | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/satellite-v9');
  const [showRiskHeatmap, setShowRiskHeatmap] = useState(true);

  const { hexapodStatuses, riskAssessments } = useDashboardStore();

  // Sample mine boundary data
  const mineBoundary = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [46.6200, -23.5400],
        [46.6500, -23.5400],
        [46.6500, -23.5600],
        [46.6200, -23.5600],
        [46.6200, -23.5400]
      ]]
    }
  };

  // Risk heatmap data
  const riskHeatmapData = {
    type: 'FeatureCollection',
    features: riskAssessments.map((assessment, index) => ({
      type: 'Feature',
      properties: {
        risk: assessment.risk_probability,
        sector: assessment.sector_id
      },
      geometry: {
        type: 'Point',
        coordinates: [
          46.6333 + (Math.random() - 0.5) * 0.02,
          -23.5505 + (Math.random() - 0.5) * 0.02
        ]
      }
    }))
  };

  const getSensorStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.palette.success.main;
      case 'warning': return theme.palette.warning.main;
      case 'error': return theme.palette.error.main;
      case 'maintenance': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  const getSensorStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'warning': return <Warning />;
      case 'error': return <Error />;
      default: return <Sensors />;
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 60) return <BatteryFull />;
    if (level > 30) return <Battery3Bar />;
    return <Battery1Bar />;
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return theme.palette.success.main;
    if (level > 30) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const handleSensorClick = useCallback((sensor: HexapodStatus) => {
    setSelectedSensor(sensor);
    // Fly to sensor location
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [sensor.location.longitude, sensor.location.latitude],
        zoom: 16,
        duration: 1000
      });
    }
  }, []);

  const mapStyles = [
    { id: 'satellite', name: 'Satellite', style: 'mapbox://styles/mapbox/satellite-v9' },
    { id: 'terrain', name: 'Terrain', style: 'mapbox://styles/mapbox/outdoors-v12' },
    { id: 'dark', name: 'Dark', style: 'mapbox://styles/mapbox/dark-v11' },
    { id: 'light', name: 'Light', style: 'mapbox://styles/mapbox/light-v11' }
  ];

  // Layer styles
  const mineBoundaryLayer = {
    id: 'mine-boundary',
    type: 'line' as const,
    paint: {
      'line-color': theme.palette.primary.main,
      'line-width': 3,
      'line-opacity': 0.8
    }
  };

  const riskHeatmapLayer = {
    id: 'risk-heatmap',
    type: 'heatmap' as const,
    paint: {
      'heatmap-weight': ['get', 'risk'],
      'heatmap-intensity': 1,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0, 255, 136, 0)',
        0.2, 'rgba(0, 255, 136, 0.2)',
        0.4, 'rgba(255, 235, 59, 0.4)',
        0.6, 'rgba(255, 152, 0, 0.6)',
        0.8, 'rgba(244, 67, 54, 0.8)',
        1, 'rgba(183, 28, 28, 1)'
      ],
      'heatmap-radius': 30,
      'heatmap-opacity': 0.7
    }
  };

  return (
    <Box sx={{ height, position: 'relative', overflow: 'hidden' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        interactive={interactive}
        attributionControl={false}
      >
        {/* Mine Boundary */}
        <Source id="mine-boundary" type="geojson" data={mineBoundary}>
          <Layer {...mineBoundaryLayer} />
        </Source>

        {/* Risk Heatmap */}
        {showRiskHeatmap && (
          <Source id="risk-heatmap" type="geojson" data={riskHeatmapData}>
            <Layer {...riskHeatmapLayer} />
          </Source>
        )}

        {/* Sensor Markers */}
        {hexapodStatuses.map((sensor) => (
          <Marker
            key={sensor.pod_id}
            longitude={sensor.location.longitude}
            latitude={sensor.location.latitude}
            anchor="center"
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: getSensorStatusColor(sensor.operational_status),
                  cursor: 'pointer',
                  border: `2px solid ${theme.palette.background.paper}`,
                  boxShadow: `0 4px 12px ${alpha(getSensorStatusColor(sensor.operational_status), 0.4)}`,
                  '&:hover': {
                    boxShadow: `0 6px 20px ${alpha(getSensorStatusColor(sensor.operational_status), 0.6)}`
                  }
                }}
                onClick={() => handleSensorClick(sensor)}
              >
                {getSensorStatusIcon(sensor.operational_status)}
              </Avatar>
            </motion.div>
          </Marker>
        ))}

        {/* Sensor Popup */}
        <AnimatePresence>
          {selectedSensor && (
            <Popup
              longitude={selectedSensor.location.longitude}
              latitude={selectedSensor.location.latitude}
              anchor="bottom"
              onClose={() => setSelectedSensor(null)}
              closeButton={false}
              maxWidth="320px"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  sx={{
                    background: alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    minWidth: 280
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {selectedSensor.pod_id}
                        </Typography>
                        <Chip
                          size="small"
                          label={selectedSensor.operational_status}
                          color={
                            selectedSensor.operational_status === 'active' ? 'success' :
                            selectedSensor.operational_status === 'warning' ? 'warning' : 'error'
                          }
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => setSelectedSensor(null)}
                        sx={{ mt: -1, mr: -1 }}
                      >
                        <Close />
                      </IconButton>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Battery Status */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getBatteryIcon(selectedSensor.power_status.battery_level)}
                        <Typography variant="body2">Battery</Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={getBatteryColor(selectedSensor.power_status.battery_level)}
                      >
                        {selectedSensor.power_status.battery_level}%
                      </Typography>
                    </Box>

                    {/* Communication Status */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {selectedSensor.last_communication && 
                         (Date.now() - selectedSensor.last_communication.getTime()) < 300000 ? (
                          <SignalWifi4Bar color="success" />
                        ) : (
                          <SignalWifiOff color="error" />
                        )}
                        <Typography variant="body2">Signal</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {selectedSensor.last_communication ? 
                          `${Math.round((Date.now() - selectedSensor.last_communication.getTime()) / 60000)}m ago` :
                          'No signal'
                        }
                      </Typography>
                    </Box>

                    {/* Location */}
                    <Box mb={2}>
                      <Typography variant="caption" color="text.secondary">
                        Location
                      </Typography>
                      <Typography variant="body2">
                        {selectedSensor.location.latitude.toFixed(6)}, {selectedSensor.location.longitude.toFixed(6)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Elevation: {selectedSensor.location.elevation}m
                      </Typography>
                    </Box>

                    {/* Sensor Health */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Sensor Health
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {Object.entries(selectedSensor.sensor_health).map(([sensor, status]) => (
                          <Chip
                            key={sensor}
                            size="small"
                            label={sensor}
                            color={status === 'healthy' ? 'success' : status === 'warning' ? 'warning' : 'error'}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Popup>
          )}
        </AnimatePresence>

        {/* Map Controls */}
        {showControls && (
          <>
            <NavigationControl position="top-right" />
            <ScaleControl position="bottom-left" />
            <GeolocateControl position="top-right" />
          </>
        )}
      </Map>

      {/* Map Style Selector */}
      {showControls && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1000
          }}
        >
          <Card
            sx={{
              background: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Map Style
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {mapStyles.map((style) => (
                  <Button
                    key={style.id}
                    size="small"
                    variant={mapStyle === style.style ? 'contained' : 'outlined'}
                    onClick={() => setMapStyle(style.style)}
                    startIcon={style.id === 'terrain' ? <Terrain /> : <Layers />}
                  >
                    {style.name}
                  </Button>
                ))}
              </Box>
              
              <Box mt={2}>
                <Button
                  size="small"
                  variant={showRiskHeatmap ? 'contained' : 'outlined'}
                  onClick={() => setShowRiskHeatmap(!showRiskHeatmap)}
                  startIcon={<Warning />}
                  color="warning"
                >
                  Risk Heatmap
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Legend */}
      {showControls && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1000
          }}
        >
          <Card
            sx={{
              background: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Legend
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: theme.palette.success.main }}>
                    <CheckCircle sx={{ fontSize: 12 }} />
                  </Avatar>
                  <Typography variant="caption">Active Sensor</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: theme.palette.warning.main }}>
                    <Warning sx={{ fontSize: 12 }} />
                  </Avatar>
                  <Typography variant="caption">Warning</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: theme.palette.error.main }}>
                    <Error sx={{ fontSize: 12 }} />
                  </Avatar>
                  <Typography variant="caption">Error</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 20,
                      height: 4,
                      background: theme.palette.primary.main,
                      borderRadius: 1
                    }}
                  />
                  <Typography variant="caption">Mine Boundary</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default MapboxView;