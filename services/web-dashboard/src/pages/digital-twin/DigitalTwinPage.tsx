import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Plane, Environment, PerspectiveCamera } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import {
  Box as MuiBox,
  Card,
  CardContent,
  Typography,
  Container,
  useTheme,
  alpha,
  Grid,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  ViewInAr,
  Terrain,
  Sensors,
  Warning,
  PlayArrow,
  Pause,
  Refresh,
  Settings,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight
} from '@mui/icons-material';

// 3D Components
function MineTerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const theme = useTheme();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
    }
  });

  // Generate terrain geometry
  const geometry = new THREE.PlaneGeometry(50, 50, 64, 64);
  const vertices = geometry.attributes.position.array as Float32Array;
  
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    vertices[i + 2] = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 3 + Math.random() * 0.5;
  }
  
  geometry.computeVertexNormals();

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
      <meshStandardMaterial
        color={theme.palette.mode === 'dark' ? '#2d2d2d' : '#8d6e63'}
        wireframe={false}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}

function SensorMarker({ position, status, id }: { position: [number, number, number]; status: string; id: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const theme = useTheme();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + parseInt(id)) * 0.2;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.palette.success.main;
      case 'warning': return theme.palette.warning.main;
      case 'error': return theme.palette.error.main;
      default: return theme.palette.info.main;
    }
  };

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.3, 16, 16]}>
        <meshStandardMaterial
          color={getStatusColor(status)}
          emissive={getStatusColor(status)}
          emissiveIntensity={0.3}
        />
      </Sphere>
      <Text
        position={[0, 1, 0]}
        fontSize={0.5}
        color={theme.palette.text.primary}
        anchorX="center"
        anchorY="middle"
      >
        {id}
      </Text>
    </group>
  );
}

function RiskHeatmap({ intensity }: { intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const theme = useTheme();

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <Plane ref={meshRef} args={[20, 20]} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color={intensity > 0.7 ? theme.palette.error.main : intensity > 0.4 ? theme.palette.warning.main : theme.palette.success.main}
        transparent
        opacity={0.4}
      />
    </Plane>
  );
}

function Scene({ sensors, riskLevel, showHeatmap }: { sensors: any[]; riskLevel: number; showHeatmap: boolean }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[20, 15, 20]} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
      
      {/* Environment */}
      <Environment preset="sunset" />
      
      {/* Terrain */}
      <MineTerrainMesh />
      
      {/* Risk Heatmap */}
      {showHeatmap && <RiskHeatmap intensity={riskLevel} />}
      
      {/* Sensors */}
      {sensors.map((sensor) => (
        <SensorMarker
          key={sensor.id}
          position={sensor.position}
          status={sensor.status}
          id={sensor.id}
        />
      ))}
      
      {/* Grid */}
      <gridHelper args={[50, 50, '#444444', '#444444']} position={[0, -5, 0]} />
    </>
  );
}

const DigitalTwinPage: React.FC = () => {
  const theme = useTheme();
  const [riskLevel, setRiskLevel] = useState(0.6);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [viewMode, setViewMode] = useState('3d');
  const [selectedSector, setSelectedSector] = useState('all');

  // Sample sensor data
  const sensors = [
    { id: 'S001', position: [-10, 2, -10] as [number, number, number], status: 'active', battery: 85 },
    { id: 'S002', position: [10, 3, -10] as [number, number, number], status: 'warning', battery: 45 },
    { id: 'S003', position: [-10, 1, 10] as [number, number, number], status: 'active', battery: 92 },
    { id: 'S004', position: [10, 4, 10] as [number, number, number], status: 'error', battery: 12 },
    { id: 'S005', position: [0, 2, 0] as [number, number, number], status: 'active', battery: 78 },
    { id: 'S006', position: [-5, 3, 5] as [number, number, number], status: 'active', battery: 88 }
  ];

  const stats = [
    { label: 'Active Sensors', value: sensors.filter(s => s.status === 'active').length, total: sensors.length },
    { label: 'Risk Level', value: `${(riskLevel * 100).toFixed(1)}%`, color: riskLevel > 0.7 ? 'error' : riskLevel > 0.4 ? 'warning' : 'success' },
    { label: 'Avg Battery', value: `${Math.round(sensors.reduce((acc, s) => acc + s.battery, 0) / sensors.length)}%`, color: 'info' },
    { label: 'Data Quality', value: '94.2%', color: 'success' }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setRiskLevel(prev => {
          const newLevel = prev + (Math.random() - 0.5) * 0.1 * timeSpeed;
          return Math.max(0, Math.min(1, newLevel));
        });
      }, 1000 / timeSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeSpeed]);

  return (
    <MuiBox
      sx={{
        minHeight: '100%',
        background: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)
        `
      }}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <MuiBox mb={4} textAlign="center">
            <Typography
              variant="h3"
              fontWeight="bold"
              gutterBottom
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Digital Twin
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Real-time 3D mine visualization and simulation
            </Typography>
          </MuiBox>
        </motion.div>

        <Grid container spacing={3}>
          {/* 3D Visualization */}
          <Grid item xs={12} lg={8}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card
                sx={{
                  height: 600,
                  background: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ height: '100%', p: 0, position: 'relative' }}>
                  {/* 3D Canvas */}
                  <Canvas
                    shadows
                    style={{ height: '100%', width: '100%' }}
                    gl={{ antialias: true, alpha: true }}
                  >
                    <Suspense fallback={null}>
                      <Scene sensors={sensors} riskLevel={riskLevel} showHeatmap={showHeatmap} />
                    </Suspense>
                  </Canvas>

                  {/* Overlay Controls */}
                  <Paper
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      p: 2,
                      background: alpha(theme.palette.background.paper, 0.9),
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <MuiBox display="flex" gap={1}>
                      <Tooltip title="Play/Pause Simulation">
                        <IconButton onClick={() => setIsPlaying(!isPlaying)} color="primary">
                          {isPlaying ? <Pause /> : <PlayArrow />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset View">
                        <IconButton color="secondary">
                          <Refresh />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Fullscreen">
                        <IconButton color="info">
                          <Fullscreen />
                        </IconButton>
                      </Tooltip>
                    </MuiBox>
                  </Paper>

                  {/* Status Overlay */}
                  <Paper
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                      p: 2,
                      background: alpha(theme.palette.background.paper, 0.9),
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Simulation Status
                    </Typography>
                    <MuiBox display="flex" alignItems="center" gap={1}>
                      <Chip
                        size="small"
                        label={isPlaying ? 'Running' : 'Paused'}
                        color={isPlaying ? 'success' : 'default'}
                        icon={isPlaying ? <PlayArrow /> : <Pause />}
                      />
                      <Typography variant="caption">
                        Speed: {timeSpeed}x
                      </Typography>
                    </MuiBox>
                  </Paper>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Control Panel */}
          <Grid item xs={12} lg={4}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Grid container spacing={2}>
                {/* Stats Cards */}
                {stats.map((stat, index) => (
                  <Grid item xs={6} key={index}>
                    <Card
                      sx={{
                        background: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h6" color={stat.color || 'text.primary'}>
                          {stat.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stat.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {/* Controls */}
                <Grid item xs={12}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Simulation Controls
                      </Typography>
                      
                      <MuiBox mb={3}>
                        <Typography variant="body2" gutterBottom>
                          Time Speed: {timeSpeed}x
                        </Typography>
                        <Slider
                          value={timeSpeed}
                          onChange={(_, value) => setTimeSpeed(value as number)}
                          min={0.1}
                          max={5}
                          step={0.1}
                          marks={[
                            { value: 0.5, label: '0.5x' },
                            { value: 1, label: '1x' },
                            { value: 2, label: '2x' },
                            { value: 5, label: '5x' }
                          ]}
                        />
                      </MuiBox>

                      <MuiBox mb={3}>
                        <Typography variant="body2" gutterBottom>
                          Risk Level: {(riskLevel * 100).toFixed(1)}%
                        </Typography>
                        <Slider
                          value={riskLevel}
                          onChange={(_, value) => setRiskLevel(value as number)}
                          min={0}
                          max={1}
                          step={0.01}
                          color={riskLevel > 0.7 ? 'error' : riskLevel > 0.4 ? 'warning' : 'success'}
                        />
                      </MuiBox>

                      <FormControlLabel
                        control={
                          <Switch
                            checked={showHeatmap}
                            onChange={(e) => setShowHeatmap(e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Show Risk Heatmap"
                      />

                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>View Mode</InputLabel>
                        <Select
                          value={viewMode}
                          label="View Mode"
                          onChange={(e) => setViewMode(e.target.value)}
                        >
                          <MenuItem value="3d">3D Perspective</MenuItem>
                          <MenuItem value="top">Top View</MenuItem>
                          <MenuItem value="side">Side View</MenuItem>
                          <MenuItem value="orbit">Free Orbit</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Sector</InputLabel>
                        <Select
                          value={selectedSector}
                          label="Sector"
                          onChange={(e) => setSelectedSector(e.target.value)}
                        >
                          <MenuItem value="all">All Sectors</MenuItem>
                          <MenuItem value="a">Sector A</MenuItem>
                          <MenuItem value="b">Sector B</MenuItem>
                          <MenuItem value="c">Sector C</MenuItem>
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Sensor Status */}
                <Grid item xs={12}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Sensor Network
                      </Typography>
                      {sensors.map((sensor) => (
                        <MuiBox key={sensor.id} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <MuiBox display="flex" alignItems="center" gap={1}>
                            <Chip
                              size="small"
                              label={sensor.status}
                              color={
                                sensor.status === 'active' ? 'success' :
                                sensor.status === 'warning' ? 'warning' : 'error'
                              }
                            />
                            <Typography variant="body2">{sensor.id}</Typography>
                          </MuiBox>
                          <Typography variant="caption" color="text.secondary">
                            {sensor.battery}%
                          </Typography>
                        </MuiBox>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </MuiBox>
  );
};

export default DigitalTwinPage;