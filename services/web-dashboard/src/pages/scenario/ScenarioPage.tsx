import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Container,
  useTheme,
  alpha,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Slider,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Timeline,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Save,
  Share,
  Download,
  Warning,
  CheckCircle,
  Error,
  Info,
  TrendingUp,
  TrendingDown,
  Assessment,
  Engineering,
  Science,
  Terrain,
  WaterDrop,
  Air,
  Thermostat
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar
} from 'recharts';

interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: {
    rainfall: number;
    temperature: number;
    blastIntensity: number;
    groundwaterLevel: number;
    slopeAngle: number;
  };
  results: {
    riskLevel: number;
    timeToFailure: number;
    affectedArea: number;
    confidence: number;
  };
  status: 'draft' | 'running' | 'completed' | 'failed';
}

const ScenarioPage: React.FC = () => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useAnimation();

  // Sample scenarios
  const sampleScenarios: Scenario[] = [
    {
      id: '1',
      name: 'Heavy Rainfall Event',
      description: 'Simulating impact of 100mm rainfall over 24 hours',
      parameters: {
        rainfall: 100,
        temperature: 15,
        blastIntensity: 0,
        groundwaterLevel: 85,
        slopeAngle: 45
      },
      results: {
        riskLevel: 0.85,
        timeToFailure: 72,
        affectedArea: 2500,
        confidence: 0.92
      },
      status: 'completed'
    },
    {
      id: '2',
      name: 'Post-Blast Analysis',
      description: 'Risk assessment after major blast operation',
      parameters: {
        rainfall: 5,
        temperature: 22,
        blastIntensity: 8.5,
        groundwaterLevel: 60,
        slopeAngle: 50
      },
      results: {
        riskLevel: 0.75,
        timeToFailure: 48,
        affectedArea: 1800,
        confidence: 0.88
      },
      status: 'completed'
    },
    {
      id: '3',
      name: 'Extreme Weather Scenario',
      description: 'Combined high temperature and rainfall stress test',
      parameters: {
        rainfall: 150,
        temperature: 35,
        blastIntensity: 3.0,
        groundwaterLevel: 95,
        slopeAngle: 42
      },
      results: {
        riskLevel: 0.95,
        timeToFailure: 24,
        affectedArea: 4200,
        confidence: 0.85
      },
      status: 'running'
    }
  ];

  // Sample prediction data
  const predictionData = [
    { time: '0h', baseline: 0.3, scenario1: 0.3, scenario2: 0.3, scenario3: 0.3 },
    { time: '6h', baseline: 0.32, scenario1: 0.45, scenario2: 0.38, scenario3: 0.55 },
    { time: '12h', baseline: 0.35, scenario1: 0.62, scenario2: 0.48, scenario3: 0.72 },
    { time: '18h', baseline: 0.38, scenario1: 0.75, scenario2: 0.58, scenario3: 0.85 },
    { time: '24h', baseline: 0.40, scenario1: 0.85, scenario2: 0.65, scenario3: 0.95 },
    { time: '30h', baseline: 0.42, scenario1: 0.88, scenario2: 0.70, scenario3: 0.98 },
    { time: '36h', baseline: 0.45, scenario1: 0.90, scenario2: 0.75, scenario3: 0.99 }
  ];

  const steps = [
    'Define Scenario',
    'Set Parameters',
    'Run Simulation',
    'Analyze Results'
  ];

  useEffect(() => {
    setScenarios(sampleScenarios);
    
    // Animated background
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Array<{
          x: number;
          y: number;
          vx: number;
          vy: number;
          size: number;
          opacity: number;
          color: string;
        }> = [];

        // Create particles representing data points
        for (let i = 0; i < 30; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.4 + 0.1,
            color: Math.random() > 0.5 ? theme.palette.primary.main : theme.palette.secondary.main
          });
        }

        const animate = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

            // Draw connections
            particles.forEach((otherParticle, otherIndex) => {
              if (index !== otherIndex) {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                  ctx.beginPath();
                  ctx.moveTo(particle.x, particle.y);
                  ctx.lineTo(otherParticle.x, otherParticle.y);
                  ctx.strokeStyle = `rgba(0, 255, 136, ${0.1 * (1 - distance / 100)})`;
                  ctx.lineWidth = 1;
                  ctx.stroke();
                }
              }
            });

            // Draw particle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color.replace('rgb', 'rgba').replace(')', `, ${particle.opacity})`);
            ctx.fill();
          });

          requestAnimationFrame(animate);
        };

        animate();
      }
    }

    controls.start("visible");
  }, [controls, theme]);

  const runScenario = async (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setIsRunning(true);
    setProgress(0);

    // Simulate scenario execution
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        position: 'relative',
        background: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)
        `
      }}
    >
      {/* Animated Background Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Box mb={4} textAlign="center">
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
              Scenario Planning
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Predictive modeling and what-if analysis for risk assessment
            </Typography>
          </Box>
        </motion.div>

        <Grid container spacing={3}>
          {/* Scenario Builder */}
          <Grid item xs={12} lg={4}>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={controls}
            >
              <Card
                sx={{
                  background: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  height: 'fit-content'
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Scenario Builder
                  </Typography>
                  
                  <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((label, index) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                        <StepContent>
                          {index === 0 && (
                            <Box>
                              <TextField
                                fullWidth
                                label="Scenario Name"
                                variant="outlined"
                                size="small"
                                sx={{ mb: 2 }}
                              />
                              <TextField
                                fullWidth
                                label="Description"
                                variant="outlined"
                                size="small"
                                multiline
                                rows={3}
                                sx={{ mb: 2 }}
                              />
                            </Box>
                          )}
                          
                          {index === 1 && (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                Environmental Parameters
                              </Typography>
                              
                              <Box mb={2}>
                                <Typography variant="body2" gutterBottom>
                                  Rainfall (mm/24h): 50
                                </Typography>
                                <Slider
                                  defaultValue={50}
                                  min={0}
                                  max={200}
                                  valueLabelDisplay="auto"
                                  size="small"
                                />
                              </Box>
                              
                              <Box mb={2}>
                                <Typography variant="body2" gutterBottom>
                                  Temperature (°C): 20
                                </Typography>
                                <Slider
                                  defaultValue={20}
                                  min={-10}
                                  max={50}
                                  valueLabelDisplay="auto"
                                  size="small"
                                />
                              </Box>
                              
                              <Box mb={2}>
                                <Typography variant="body2" gutterBottom>
                                  Blast Intensity: 5.0
                                </Typography>
                                <Slider
                                  defaultValue={5}
                                  min={0}
                                  max={10}
                                  step={0.1}
                                  valueLabelDisplay="auto"
                                  size="small"
                                />
                              </Box>
                            </Box>
                          )}
                          
                          {index === 2 && (
                            <Box>
                              <Alert severity="info" sx={{ mb: 2 }}>
                                Simulation will analyze slope stability under specified conditions
                              </Alert>
                              {isRunning && (
                                <Box>
                                  <Typography variant="body2" gutterBottom>
                                    Running simulation... {progress}%
                                  </Typography>
                                  <LinearProgress variant="determinate" value={progress} />
                                </Box>
                              )}
                            </Box>
                          )}
                          
                          {index === 3 && (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                Simulation Results
                              </Typography>
                              <List dense>
                                <ListItem>
                                  <ListItemIcon>
                                    <Assessment color="primary" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary="Risk Level"
                                    secondary="85% - High Risk"
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemIcon>
                                    <Timeline color="warning" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary="Time to Failure"
                                    secondary="72 hours"
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemIcon>
                                    <Terrain color="error" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary="Affected Area"
                                    secondary="2,500 m²"
                                  />
                                </ListItem>
                              </List>
                            </Box>
                          )}
                          
                          <Box mt={2}>
                            <Button
                              variant="contained"
                              onClick={() => setActiveStep(prev => Math.min(prev + 1, steps.length - 1))}
                              disabled={activeStep === steps.length - 1}
                              size="small"
                            >
                              {activeStep === steps.length - 1 ? 'Complete' : 'Next'}
                            </Button>
                            <Button
                              onClick={() => setActiveStep(prev => Math.max(prev - 1, 0))}
                              disabled={activeStep === 0}
                              size="small"
                              sx={{ ml: 1 }}
                            >
                              Back
                            </Button>
                          </Box>
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Visualization and Results */}
          <Grid item xs={12} lg={8}>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={controls}
            >
              <Grid container spacing={2}>
                {/* Prediction Chart */}
                <Grid item xs={12}>
                  <motion.div variants={itemVariants}>
                    <Card
                      sx={{
                        background: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        height: 400
                      }}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6">
                            Risk Prediction Comparison
                          </Typography>
                          <Box>
                            <Tooltip title="Run All Scenarios">
                              <IconButton color="primary">
                                <PlayArrow />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Export Results">
                              <IconButton color="secondary">
                                <Download />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={predictionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                            <XAxis dataKey="time" stroke={theme.palette.text.secondary} />
                            <YAxis stroke={theme.palette.text.secondary} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                borderRadius: 8
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="baseline"
                              stroke={theme.palette.info.main}
                              strokeWidth={2}
                              name="Baseline"
                            />
                            <Line
                              type="monotone"
                              dataKey="scenario1"
                              stroke={theme.palette.warning.main}
                              strokeWidth={2}
                              name="Heavy Rainfall"
                            />
                            <Line
                              type="monotone"
                              dataKey="scenario2"
                              stroke={theme.palette.success.main}
                              strokeWidth={2}
                              name="Post-Blast"
                            />
                            <Line
                              type="monotone"
                              dataKey="scenario3"
                              stroke={theme.palette.error.main}
                              strokeWidth={2}
                              name="Extreme Weather"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                {/* Scenario Cards */}
                <Grid item xs={12}>
                  <motion.div variants={itemVariants}>
                    <Typography variant="h6" gutterBottom>
                      Saved Scenarios
                    </Typography>
                    <Grid container spacing={2}>
                      {scenarios.map((scenario) => (
                        <Grid item xs={12} md={4} key={scenario.id}>
                          <Card
                            sx={{
                              background: alpha(theme.palette.background.paper, 0.8),
                              backdropFilter: 'blur(20px)',
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`
                              }
                            }}
                            onClick={() => runScenario(scenario)}
                          >
                            <CardContent>
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                <Typography variant="h6" gutterBottom>
                                  {scenario.name}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={scenario.status}
                                  color={
                                    scenario.status === 'completed' ? 'success' :
                                    scenario.status === 'running' ? 'warning' :
                                    scenario.status === 'failed' ? 'error' : 'default'
                                  }
                                />
                              </Box>
                              
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {scenario.description}
                              </Typography>
                              
                              {scenario.status === 'completed' && (
                                <Box mt={2}>
                                  <Box display="flex" justifyContent="space-between" mb={1}>
                                    <Typography variant="caption">Risk Level</Typography>
                                    <Typography variant="caption" color="error.main">
                                      {(scenario.results.riskLevel * 100).toFixed(1)}%
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={scenario.results.riskLevel * 100}
                                    color="error"
                                    sx={{ height: 4, borderRadius: 2 }}
                                  />
                                  
                                  <Box display="flex" justifyContent="space-between" mt={2}>
                                    <Typography variant="caption">
                                      TTF: {scenario.results.timeToFailure}h
                                    </Typography>
                                    <Typography variant="caption">
                                      Area: {scenario.results.affectedArea}m²
                                    </Typography>
                                  </Box>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </motion.div>
                </Grid>
              </Grid>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ScenarioPage;