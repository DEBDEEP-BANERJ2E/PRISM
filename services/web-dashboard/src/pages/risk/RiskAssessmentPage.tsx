import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Assessment,
  ViewInAr,
  Timeline,
  Map,
  Refresh,
  Download,
  Settings,
  Warning,
  CheckCircle,
  Error,
  Info,
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious
} from '@mui/icons-material';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// 3D Terrain Component
const TerrainMesh: React.FC<{ riskData: any; timeStep: number }> = ({ riskData, timeStep }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Generate terrain geometry
  const geometry = new THREE.PlaneGeometry(20, 20, 50, 50);
  const vertices = geometry.attributes.position.array as Float32Array;
  
  // Apply height map and risk coloring
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    
    // Generate height based on noise function
    const height = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 2 + 
                   Math.random() * 0.5;
    vertices[i + 2] = height;
  }
  
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color="#4a5568"
        wireframe={false}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
};

// Risk Heatmap Overlay
const RiskHeatmap: React.FC<{ riskLevel: number; position: [number, number, number] }> = ({ 
  riskLevel, 
  position 
}) => {
  const getColor = (risk: number) => {
    if (risk > 0.8) return '#ff4444';
    if (risk > 0.6) return '#ff8800';
    if (risk > 0.4) return '#ffcc00';
    return '#44ff44';
  };

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial
        color={getColor(riskLevel)}
        transparent
        opacity={0.7}
      />
      <Html distanceFactor={10}>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}
        >
          Risk: {(riskLevel * 100).toFixed(1)}%
        </div>
      </Html>
    </mesh>
  );
};

// Sensor Markers
const SensorMarker: React.FC<{ position: [number, number, number]; status: string; id: string }> = ({ 
  position, 
  status, 
  id 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#00ff88';
      case 'warning': return '#ff8800';
      case 'error': return '#ff4444';
      default: return '#666666';
    }
  };

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 1]} />
        <meshStandardMaterial color={getStatusColor(status)} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color={getStatusColor(status)} emissive={getStatusColor(status)} emissiveIntensity={0.3} />
      </mesh>
      <Html distanceFactor={15}>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '10px'
          }}
        >
          {id}
        </div>
      </Html>
    </group>
  );
};

const RiskAssessmentPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'3d' | 'map' | 'timeline'>('3d');
  const [timeStep, setTimeStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState(0.7);
  const [selectedSector, setSelectedSector] = useState('all');
  const [predictionHorizon, setPredictionHorizon] = useState(24);

  // Mock data
  const riskZones = [
    { id: 'Z1', position: [2, 1, 3] as [number, number, number], risk: 0.85, sector: 'A' },
    { id: 'Z2', position: [-3, 1, 1] as [number, number, number], risk: 0.65, sector: 'B' },
    { id: 'Z3', position: [1, 1, -2] as [number, number, number], risk: 0.45, sector: 'A' },
    { id: 'Z4', position: [-1, 1, -4] as [number, number, number], risk: 0.92, sector: 'C' }
  ];

  const sensors = [
    { id: 'S001', position: [3, 0, 2] as [number, number, number], status: 'active' },
    { id: 'S002', position: [-2, 0, 3] as [number, number, number], status: 'warning' },
    { id: 'S003', position: [0, 0, -3] as [number, number, number], status: 'active' },
    { id: 'S004', position: [-4, 0, -1] as [number, number, number], status: 'error' }
  ];

  const riskMetrics = [
    { label: 'Overall Risk Level', value: 'High', color: 'error', percentage: 78 },
    { label: 'Prediction Confidence', value: '94.2%', color: 'success', percentage: 94 },
    { label: 'Time to Critical', value: '6.5 hours', color: 'warning', percentage: 65 },
    { label: 'Affected Area', value: '2.3 km²', color: 'info', percentage: 45 }
  ];

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeStepChange = (event: Event, newValue: number | number[]) => {
    setTimeStep(newValue as number);
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
              Risk Assessment
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Real-time slope stability analysis and prediction
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="3d">
                <ViewInAr sx={{ mr: 1 }} />
                3D View
              </ToggleButton>
              <ToggleButton value="map">
                <Map sx={{ mr: 1 }} />
                Map View
              </ToggleButton>
              <ToggleButton value="timeline">
                <Timeline sx={{ mr: 1 }} />
                Timeline
              </ToggleButton>
            </ToggleButtonGroup>
            
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Download />}
            >
              Export
            </Button>
          </Box>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Risk Metrics */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Grid container spacing={2}>
              {riskMetrics.map((metric, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card
                    sx={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {metric.label}
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {metric.value}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={metric.percentage}
                        color={metric.color as any}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Grid>

        {/* Main Visualization */}
        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                height: 600
              }}
            >
              <CardContent sx={{ height: '100%', p: 0 }}>
                {viewMode === '3d' && (
                  <Canvas
                    camera={{ position: [10, 10, 10], fov: 60 }}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[10, 10, 5]} intensity={1} />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} />
                    
                    <TerrainMesh riskData={{}} timeStep={timeStep} />
                    
                    {riskZones.map((zone) => (
                      <RiskHeatmap
                        key={zone.id}
                        riskLevel={zone.risk}
                        position={zone.position}
                      />
                    ))}
                    
                    {sensors.map((sensor) => (
                      <SensorMarker
                        key={sensor.id}
                        position={sensor.position}
                        status={sensor.status}
                        id={sensor.id}
                      />
                    ))}
                    
                    <OrbitControls enablePan enableZoom enableRotate />
                    <Environment preset="sunset" />
                  </Canvas>
                )}
                
                {viewMode === 'map' && (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    bgcolor="rgba(255, 255, 255, 0.05)"
                  >
                    <Typography variant="h6" color="text.secondary">
                      2D Map View - Coming Soon
                    </Typography>
                  </Box>
                )}
                
                {viewMode === 'timeline' && (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    bgcolor="rgba(255, 255, 255, 0.05)"
                  >
                    <Typography variant="h6" color="text.secondary">
                      Timeline Analysis - Coming Soon
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Controls Panel */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                height: 600
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Analysis Controls
                </Typography>
                
                {/* Time Controls */}
                <Box mb={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Time Navigation
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <IconButton size="small">
                      <SkipPrevious />
                    </IconButton>
                    <IconButton size="small" onClick={handlePlayPause}>
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>
                    <IconButton size="small">
                      <SkipNext />
                    </IconButton>
                  </Box>
                  <Slider
                    value={timeStep}
                    onChange={handleTimeStepChange}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}h`}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Risk Threshold */}
                <Box mb={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Risk Threshold: {(riskThreshold * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={riskThreshold}
                    onChange={(e, value) => setRiskThreshold(value as number)}
                    min={0}
                    max={1}
                    step={0.01}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Sector Filter */}
                <Box mb={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Sector</InputLabel>
                    <Select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      label="Sector"
                    >
                      <MenuItem value="all">All Sectors</MenuItem>
                      <MenuItem value="A">Sector A</MenuItem>
                      <MenuItem value="B">Sector B</MenuItem>
                      <MenuItem value="C">Sector C</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Prediction Horizon */}
                <Box mb={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Prediction Horizon</InputLabel>
                    <Select
                      value={predictionHorizon}
                      onChange={(e) => setPredictionHorizon(e.target.value as number)}
                      label="Prediction Horizon"
                    >
                      <MenuItem value={6}>6 Hours</MenuItem>
                      <MenuItem value={12}>12 Hours</MenuItem>
                      <MenuItem value={24}>24 Hours</MenuItem>
                      <MenuItem value={48}>48 Hours</MenuItem>
                      <MenuItem value={72}>72 Hours</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Active Alerts */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Active Alerts
                  </Typography>
                  <Alert severity="error" sx={{ mb: 1, fontSize: '0.8rem' }}>
                    Critical risk in Zone Z4
                  </Alert>
                  <Alert severity="warning" sx={{ mb: 1, fontSize: '0.8rem' }}>
                    Sensor S002 needs attention
                  </Alert>
                  <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                    Prediction model updated
                  </Alert>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RiskAssessmentPage;