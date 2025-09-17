import React, { useEffect, useRef, useState } from 'react';
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
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp,
  Analytics,
  Timeline,
  Assessment,
  Speed,
  Warning,
  CheckCircle,
  ShowChart,
  BarChart,
  PieChart,
  ScatterPlot
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useAnimation();

  // Sample data for charts
  const riskTrendData = [
    { time: '00:00', risk: 0.2, displacement: 0.5, vibration: 0.3 },
    { time: '04:00', risk: 0.3, displacement: 0.7, vibration: 0.4 },
    { time: '08:00', risk: 0.6, displacement: 1.2, vibration: 0.8 },
    { time: '12:00', risk: 0.8, displacement: 1.8, vibration: 1.2 },
    { time: '16:00', risk: 0.7, displacement: 1.5, vibration: 1.0 },
    { time: '20:00', risk: 0.4, displacement: 0.9, vibration: 0.6 },
    { time: '24:00', risk: 0.2, displacement: 0.4, vibration: 0.2 }
  ];

  const sectorRiskData = [
    { sector: 'A-1', risk: 0.8, incidents: 12, sensors: 24 },
    { sector: 'A-2', risk: 0.6, incidents: 8, sensors: 18 },
    { sector: 'B-1', risk: 0.9, incidents: 15, sensors: 32 },
    { sector: 'B-2', risk: 0.4, incidents: 5, sensors: 16 },
    { sector: 'C-1', risk: 0.7, incidents: 10, sensors: 28 },
    { sector: 'C-2', risk: 0.3, incidents: 3, sensors: 12 }
  ];

  const alertDistribution = [
    { name: 'Critical', value: 15, color: '#f44336' },
    { name: 'High', value: 32, color: '#ff9800' },
    { name: 'Medium', value: 48, color: '#2196f3' },
    { name: 'Low', value: 25, color: '#4caf50' }
  ];

  const performanceMetrics = [
    { metric: 'Prediction Accuracy', value: 94.2, target: 95, color: '#4caf50' },
    { metric: 'Response Time', value: 87.5, target: 90, color: '#ff9800' },
    { metric: 'System Uptime', value: 99.8, target: 99.5, color: '#4caf50' },
    { metric: 'Data Quality', value: 96.3, target: 95, color: '#4caf50' }
  ];

  const radarData = [
    { subject: 'Accuracy', A: 94, B: 90, fullMark: 100 },
    { subject: 'Speed', A: 87, B: 85, fullMark: 100 },
    { subject: 'Reliability', A: 99, B: 95, fullMark: 100 },
    { subject: 'Coverage', A: 92, B: 88, fullMark: 100 },
    { subject: 'Efficiency', A: 89, B: 85, fullMark: 100 }
  ];

  useEffect(() => {
    // Animate canvas background
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
        }> = [];

        // Create particles
        for (let i = 0; i < 50; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.1
          });
        }

        const animate = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 136, ${particle.opacity})`;
            ctx.fill();
          });

          requestAnimationFrame(animate);
        };

        animate();
      }
    }

    controls.start("visible");
  }, [controls]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
              Advanced Analytics
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Real-time insights and predictive intelligence
            </Typography>
          </Box>
        </motion.div>

        {/* Controls */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <Card
            sx={{
              mb: 4,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                  <Tab icon={<ShowChart />} label="Trends" />
                  <Tab icon={<BarChart />} label="Performance" />
                  <Tab icon={<PieChart />} label="Distribution" />
                  <Tab icon={<ScatterPlot />} label="Correlation" />
                </Tabs>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Time Range</InputLabel>
                  <Select
                    value={timeRange}
                    label="Time Range"
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <MenuItem value="1d">Last 24 Hours</MenuItem>
                    <MenuItem value="7d">Last 7 Days</MenuItem>
                    <MenuItem value="30d">Last 30 Days</MenuItem>
                    <MenuItem value="90d">Last 90 Days</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tab Panels */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          {/* Trends Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
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
                      <Typography variant="h6" gutterBottom>
                        Risk Trend Analysis
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={riskTrendData}>
                          <defs>
                            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="displacementGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={theme.palette.warning.main} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={theme.palette.warning.main} stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                          <XAxis dataKey="time" stroke={theme.palette.text.secondary} />
                          <YAxis stroke={theme.palette.text.secondary} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: alpha(theme.palette.background.paper, 0.9),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                              borderRadius: 8
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="risk"
                            stroke={theme.palette.error.main}
                            fillOpacity={1}
                            fill="url(#riskGradient)"
                            name="Risk Level"
                          />
                          <Area
                            type="monotone"
                            dataKey="displacement"
                            stroke={theme.palette.warning.main}
                            fillOpacity={1}
                            fill="url(#displacementGradient)"
                            name="Displacement (mm)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} lg={4}>
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
                      <Typography variant="h6" gutterBottom>
                        Alert Distribution
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <RechartsPieChart>
                          <Pie
                            data={alertDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {alertDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Performance Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      background: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(20px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        System Performance Metrics
                      </Typography>
                      {performanceMetrics.map((metric, index) => (
                        <Box key={index} mb={3}>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">{metric.metric}</Typography>
                            <Typography variant="body2" color={metric.color}>
                              {metric.value}% / {metric.target}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={metric.value}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: alpha(metric.color, 0.2),
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: metric.color,
                                borderRadius: 4
                              }
                            }}
                          />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={6}>
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
                      <Typography variant="h6" gutterBottom>
                        Performance Radar
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke={alpha(theme.palette.text.primary, 0.2)} />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: theme.palette.text.secondary }} />
                          <PolarRadiusAxis tick={{ fill: theme.palette.text.secondary }} />
                          <Radar
                            name="Current"
                            dataKey="A"
                            stroke={theme.palette.primary.main}
                            fill={theme.palette.primary.main}
                            fillOpacity={0.3}
                          />
                          <Radar
                            name="Target"
                            dataKey="B"
                            stroke={theme.palette.secondary.main}
                            fill={theme.palette.secondary.main}
                            fillOpacity={0.3}
                          />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Distribution Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
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
                      <Typography variant="h6" gutterBottom>
                        Risk Distribution by Sector
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <RechartsBarChart data={sectorRiskData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                          <XAxis dataKey="sector" stroke={theme.palette.text.secondary} />
                          <YAxis stroke={theme.palette.text.secondary} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: alpha(theme.palette.background.paper, 0.9),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                              borderRadius: 8
                            }}
                          />
                          <Legend />
                          <Bar dataKey="risk" fill={theme.palette.error.main} name="Risk Level" />
                          <Bar dataKey="incidents" fill={theme.palette.warning.main} name="Incidents" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Correlation Tab */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
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
                      <Typography variant="h6" gutterBottom>
                        Risk vs Sensor Correlation
                      </Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <ScatterChart data={sectorRiskData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                          <XAxis dataKey="sensors" name="Sensors" stroke={theme.palette.text.secondary} />
                          <YAxis dataKey="risk" name="Risk" stroke={theme.palette.text.secondary} />
                          <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            contentStyle={{
                              backgroundColor: alpha(theme.palette.background.paper, 0.9),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                              borderRadius: 8
                            }}
                          />
                          <Scatter fill={theme.palette.primary.main} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </TabPanel>
        </motion.div>
      </Container>
    </Box>
  );
};

export default AnalyticsPage;