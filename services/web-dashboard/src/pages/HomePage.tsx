import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Divider,
  Container,
  useTheme,
  alpha
} from '@mui/material';
import {
  Dashboard,
  Assessment,
  Sensors,
  Warning,
  Analytics,
  ViewInAr,
  TrendingUp,
  Security,
  Speed,
  ArrowForward,
  CheckCircle,
  Error,
  Info,
  Terrain,
  Engineering,
  Timeline,
  Assessment as ReportsIcon
} from '@mui/icons-material';
import { useAuthStore } from '@/store/authStore';

const HomePage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const theme = useTheme();
  const heroRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    // GSAP Hero Animation
    if (heroRef.current) {
      gsap.fromTo(heroRef.current, 
        { 
          opacity: 0, 
          y: 50,
          scale: 0.9
        },
        { 
          opacity: 1, 
          y: 0,
          scale: 1,
          duration: 1.2,
          ease: "power3.out"
        }
      );
    }

    // Floating particles animation
    if (particlesRef.current) {
      const particles = particlesRef.current.children;
      Array.from(particles).forEach((particle, index) => {
        gsap.to(particle, {
          y: "random(-20, 20)",
          x: "random(-15, 15)",
          rotation: "random(-180, 180)",
          duration: "random(3, 6)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: index * 0.2
        });
      });
    }

    // Trigger stagger animation for cards
    controls.start("visible");
  }, [controls]);

  const quickStats = [
    {
      title: 'Active Sensors',
      value: '247',
      change: '+12',
      color: 'success',
      icon: Sensors
    },
    {
      title: 'Risk Level',
      value: 'Medium',
      change: 'Stable',
      color: 'warning',
      icon: Assessment
    },
    {
      title: 'Active Alerts',
      value: '3',
      change: '-2',
      color: 'error',
      icon: Warning
    },
    {
      title: 'System Health',
      value: '98.5%',
      change: '+0.3%',
      color: 'success',
      icon: Speed
    }
  ];

  const recentAlerts = [
    {
      id: 1,
      type: 'warning',
      title: 'Elevated displacement detected',
      location: 'Sector 7-A',
      time: '2 minutes ago',
      severity: 'Medium'
    },
    {
      id: 2,
      type: 'info',
      title: 'Sensor maintenance scheduled',
      location: 'Sector 12-B',
      time: '1 hour ago',
      severity: 'Low'
    },
    {
      id: 3,
      type: 'success',
      title: 'Risk assessment completed',
      location: 'Sector 3-C',
      time: '3 hours ago',
      severity: 'Info'
    }
  ];

  const quickActions = [
    {
      title: 'Risk Assessment',
      description: 'Real-time slope stability analysis',
      icon: Assessment,
      path: '/app/risk',
      color: 'primary',
      gradient: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)'
    },
    {
      title: 'Analytics',
      description: 'Advanced data insights & trends',
      icon: Analytics,
      path: '/app/analytics',
      color: 'info',
      gradient: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)'
    },
    {
      title: 'Digital Twin',
      description: '3D mine visualization & simulation',
      icon: ViewInAr,
      path: '/app/digital-twin',
      color: 'secondary',
      gradient: 'linear-gradient(135deg, #ff6b35 0%, #cc5529 100%)'
    },
    {
      title: 'Scenario Planning',
      description: 'Predictive modeling & what-if analysis',
      icon: Timeline,
      path: '/app/scenario',
      color: 'warning',
      gradient: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
    },
    {
      title: 'Monitor Sensors',
      description: 'Real-time sensor network status',
      icon: Sensors,
      path: '/app/sensors',
      color: 'success',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)'
    },
    {
      title: 'Reports',
      description: 'Comprehensive safety reports',
      icon: ReportsIcon,
      path: '/app/reports',
      color: 'error',
      gradient: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
    }
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      case 'success': return <CheckCircle color="success" />;
      default: return <Info color="info" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
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
        background: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, ${alpha(theme.palette.info.main, 0.05)} 0%, transparent 50%)
        `,
        position: 'relative'
      }}
    >
      {/* Animated Background Particles */}
      <Box
        ref={particlesRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        {[...Array(20)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              backgroundColor: theme.palette.primary.main,
              borderRadius: '50%',
              opacity: Math.random() * 0.3 + 0.1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </Box>

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        {/* Hero Section */}
        <Box ref={heroRef} mb={6}>
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Typography 
              variant="h2" 
              fontWeight="bold" 
              gutterBottom
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center',
                mb: 2
              }}
            >
              Welcome to PRISM
            </Typography>
            <Typography 
              variant="h5" 
              color="text.secondary" 
              textAlign="center"
              sx={{ mb: 1 }}
            >
              Predictive Rockfall Intelligence & Safety Management
            </Typography>
            <Typography 
              variant="subtitle1" 
              color="text.secondary"
              textAlign="center"
            >
              {user?.minesite} • {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
          </motion.div>
        </Box>

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Grid container spacing={2}>
              {quickStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card
                      sx={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        height: '100%'
                      }}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Icon color={stat.color as any} />
                          <Chip
                            label={stat.change}
                            size="small"
                            color={stat.color as any}
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.title}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        </Grid>

        {/* Quick Actions Grid */}
        <Grid item xs={12}>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Typography variant="h5" fontWeight="bold" gutterBottom textAlign="center" mb={4}>
              Mission Control Center
            </Typography>
            <Grid container spacing={3}>
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <motion.div
                      variants={itemVariants}
                      whileHover={{ 
                        scale: 1.05,
                        rotateY: 5,
                        transition: { duration: 0.3 }
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Card
                        sx={{
                          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
                          backdropFilter: 'blur(20px)',
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          cursor: 'pointer',
                          height: 200,
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                            boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.2)}`,
                            '& .action-icon': {
                              transform: 'scale(1.1) rotate(5deg)',
                            },
                            '& .gradient-overlay': {
                              opacity: 0.8,
                            }
                          }
                        }}
                        onClick={() => navigate(action.path)}
                      >
                        {/* Gradient Overlay */}
                        <Box
                          className="gradient-overlay"
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: action.gradient,
                            opacity: 0.1,
                            transition: 'opacity 0.3s ease',
                            zIndex: 0
                          }}
                        />
                        
                        <CardContent sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          <Avatar
                            className="action-icon"
                            sx={{
                              width: 64,
                              height: 64,
                              mb: 2,
                              background: action.gradient,
                              transition: 'transform 0.3s ease',
                              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
                            }}
                          >
                            <Icon sx={{ fontSize: 32 }} />
                          </Avatar>
                          
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {action.title}
                          </Typography>
                          
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ opacity: 0.8 }}
                          >
                            {action.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          </motion.div>
        </Grid>

        {/* Recent Alerts */}
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
                height: '100%'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    Recent Alerts
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate('/app/alerts')}
                  >
                    View All
                  </Button>
                </Box>
                
                <Box>
                  {recentAlerts.map((alert, index) => (
                    <Box key={alert.id}>
                      <Box display="flex" alignItems="flex-start" gap={2} py={2}>
                        {getAlertIcon(alert.type)}
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {alert.title}
                            </Typography>
                            <Chip
                              label={alert.severity}
                              size="small"
                              color={getSeverityColor(alert.severity) as any}
                              variant="outlined"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {alert.location}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {alert.time}
                          </Typography>
                        </Box>
                      </Box>
                      {index < recentAlerts.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* System Status */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  System Status
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">AI Model Performance</Typography>
                        <Typography variant="body2" color="success.main">94.2%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={94.2}
                        color="success"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Data Processing</Typography>
                        <Typography variant="body2" color="primary.main">87.8%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={87.8}
                        color="primary"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Network Connectivity</Typography>
                        <Typography variant="body2" color="success.main">99.1%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={99.1}
                        color="success"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
};

export default HomePage;