import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Avatar,
  IconButton
} from '@mui/material';
import {
  Assessment,
  Sensors,
  Warning,
  TrendingUp,
  Speed,
  CheckCircle,
  ArrowBack,
  Download,
  Share,
  Print,
  Security,
  Analytics,
  Engineering,
  ViewInAr,
  Timeline,
  Shield,
  Insights,
  Science,
  Business,
  Group,
  LocationOn,
  Schedule,
  MonetizationOn,
  EmojiObjects,
  BarChart,
  PieChart
} from '@mui/icons-material';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const AppBriefPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useAnimation();

  useEffect(() => {
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
        }> = [];

        // Create floating particles
        for (let i = 0; i < 50; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.5 + 0.2
          });
        }

        const animate = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

            ctx.save();
            ctx.globalAlpha = particle.opacity;
            ctx.fillStyle = theme.palette.primary.main;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });

          requestAnimationFrame(animate);
        };

        animate();
      }
    }

    // GSAP Animations
    gsap.fromTo('.brief-header',
      { opacity: 0, y: -50 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
    );

    gsap.fromTo('.brief-section',
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.brief-content',
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      }
    );

    controls.start('visible');

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [controls, theme]);

  const features = [
    {
      icon: <Assessment />,
      title: 'AI-Powered Risk Assessment',
      description: 'Advanced machine learning algorithms analyze geological data to predict rockfall risks with 94% accuracy.',
      benefits: ['Real-time risk scoring', 'Predictive modeling', 'Historical data analysis']
    },
    {
      icon: <Sensors />,
      title: 'IoT Sensor Network',
      description: 'Comprehensive network of sensors monitoring slope stability, ground movement, and environmental conditions.',
      benefits: ['500+ active sensors', '24/7 monitoring', '99.9% uptime']
    },
    {
      icon: <Warning />,
      title: 'Early Warning System',
      description: 'Automated alerts provide critical time for evacuation and safety measures.',
      benefits: ['15+ minutes early warning', 'Multi-channel alerts', 'Automated responses']
    },
    {
      icon: <ViewInAr />,
      title: 'Digital Twin Technology',
      description: '3D visualization and simulation of mine sites for comprehensive analysis.',
      benefits: ['Real-time 3D models', 'Scenario simulation', 'Virtual inspections']
    }
  ];

  const stats = [
    { value: '94%', label: 'Prediction Accuracy', icon: <TrendingUp />, color: 'primary' },
    { value: '$2M+', label: 'Cost Savings Per Incident', icon: <MonetizationOn />, color: 'success' },
    { value: '15+', label: 'Minutes Early Warning', icon: <Schedule />, color: 'info' },
    { value: '500+', label: 'Active Sensors', icon: <Sensors />, color: 'secondary' },
    { value: '24/7', label: 'Continuous Monitoring', icon: <Speed />, color: 'warning' },
    { value: '99.9%', label: 'System Uptime', icon: <CheckCircle />, color: 'success' }
  ];

  const useCases = [
    {
      title: 'Open-Pit Mining Operations',
      description: 'Comprehensive monitoring of large-scale mining operations with multiple risk zones.',
      icon: <Business />,
      metrics: ['87% incident reduction', '45% operational efficiency increase']
    },
    {
      title: 'Quarry Safety Management',
      description: 'Specialized monitoring for quarry operations with focused safety protocols.',
      icon: <Security />,
      metrics: ['92% safety compliance', '60% faster response times']
    },
    {
      title: 'Construction Site Monitoring',
      description: 'Temporary monitoring solutions for construction projects in unstable terrain.',
      icon: <Engineering />,
      metrics: ['100% incident prevention', '30% project timeline improvement']
    }
  ];

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
        minHeight: '100vh',
        position: 'relative',
        background: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%),
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)
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
        <Box className="brief-header" mb={6}>
          <Box display="flex" alignItems="center" mb={3}>
            <IconButton
              onClick={() => navigate('/')}
              sx={{
                mr: 2,
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <ArrowBack />
            </IconButton>
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              PRISM Technology Brief
            </Typography>
          </Box>
          
          <Typography variant="h5" color="text.secondary" mb={4}>
            Predictive Rockfall Intelligence & Safety Management System
          </Typography>

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={<Download />}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`
                }
              }}
            >
              Download PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<Share />}
              sx={{
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              Share Brief
            </Button>
            <Button
              variant="outlined"
              startIcon={<Print />}
              sx={{
                borderColor: theme.palette.secondary.main,
                color: theme.palette.secondary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.secondary.main, 0.1)
                }
              }}
            >
              Print
            </Button>
          </Box>
        </Box>

        <div className="brief-content">
          {/* Executive Summary */}
          <motion.div
            className="brief-section"
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Card
              sx={{
                mb: 6,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                  Executive Summary
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                  PRISM (Predictive Rockfall Intelligence & Safety Management) is a revolutionary AI-powered system 
                  designed to predict and prevent rockfall incidents in open-pit mining operations. By combining 
                  advanced machine learning algorithms, IoT sensor networks, and real-time monitoring capabilities, 
                  PRISM provides unprecedented safety and operational efficiency improvements.
                </Typography>
                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                  Our system has demonstrated a 94% accuracy rate in predicting rockfall events, providing 15+ minutes 
                  of early warning time, and has resulted in over $2M in cost savings per prevented incident across 
                  our deployed sites.
                </Typography>
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Statistics */}
          <motion.div
            className="brief-section"
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary" mb={3}>
              Key Performance Metrics
            </Typography>
            <Grid container spacing={3} mb={6}>
              {stats.map((stat, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div variants={itemVariants}>
                    <Card
                      sx={{
                        background: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette[stat.color as keyof typeof theme.palette].main, 0.3)}`,
                        textAlign: 'center',
                        height: '100%'
                      }}
                    >
                      <CardContent>
                        <Avatar
                          sx={{
                            bgcolor: theme.palette[stat.color as keyof typeof theme.palette].main,
                            width: 56,
                            height: 56,
                            mx: 'auto',
                            mb: 2
                          }}
                        >
                          {stat.icon}
                        </Avatar>
                        <Typography variant="h3" fontWeight="bold" color={`${stat.color}.main`}>
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          {/* Core Features */}
          <motion.div
            className="brief-section"
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary" mb={3}>
              Core Technology Features
            </Typography>
            <Grid container spacing={4} mb={6}>
              {features.map((feature, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <motion.div variants={itemVariants}>
                    <Card
                      sx={{
                        background: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        height: '100%'
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              mr: 2,
                              width: 48,
                              height: 48
                            }}
                          >
                            {feature.icon}
                          </Avatar>
                          <Typography variant="h6" fontWeight="bold">
                            {feature.title}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {feature.description}
                        </Typography>
                        <List dense>
                          {feature.benefits.map((benefit, idx) => (
                            <ListItem key={idx} sx={{ px: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckCircle color="success" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={benefit}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          {/* Use Cases */}
          <motion.div
            className="brief-section"
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary" mb={3}>
              Industry Applications
            </Typography>
            <Grid container spacing={3} mb={6}>
              {useCases.map((useCase, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <motion.div variants={itemVariants}>
                    <Card
                      sx={{
                        background: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        height: '100%'
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.secondary.main,
                              mr: 2
                            }}
                          >
                            {useCase.icon}
                          </Avatar>
                          <Typography variant="h6" fontWeight="bold">
                            {useCase.title}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {useCase.description}
                        </Typography>
                        <Box>
                          {useCase.metrics.map((metric, idx) => (
                            <Chip
                              key={idx}
                              label={metric}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          {/* Technical Specifications */}
          <motion.div
            className="brief-section"
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Card
              sx={{
                mb: 6,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                  Technical Specifications
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      System Architecture
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon><Analytics color="primary" /></ListItemIcon>
                        <ListItemText
                          primary="Cloud-native microservices architecture"
                          secondary="Scalable, resilient, and highly available"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Science color="primary" /></ListItemIcon>
                        <ListItemText
                          primary="Machine Learning Pipeline"
                          secondary="TensorFlow/PyTorch with real-time inference"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Sensors color="primary" /></ListItemIcon>
                        <ListItemText
                          primary="IoT Integration"
                          secondary="MQTT, LoRaWAN, and cellular connectivity"
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Performance Metrics
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon><Speed color="success" /></ListItemIcon>
                        <ListItemText
                          primary="Response Time: <100ms"
                          secondary="Real-time processing and alerts"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><Shield color="success" /></ListItemIcon>
                        <ListItemText
                          primary="Availability: 99.9%"
                          secondary="Enterprise-grade reliability"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><TrendingUp color="success" /></ListItemIcon>
                        <ListItemText
                          primary="Scalability: 10,000+ sensors"
                          secondary="Horizontal scaling capability"
                        />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>

          {/* ROI Analysis */}
          <motion.div
            className="brief-section"
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Card
              sx={{
                mb: 6,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom color="success.main">
                  Return on Investment
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h2" fontWeight="bold" color="success.main">
                        300%
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        Average ROI
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Within 12 months of deployment
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h2" fontWeight="bold" color="primary.main">
                        $2M+
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        Cost Savings
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Per prevented major incident
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h2" fontWeight="bold" color="warning.main">
                        87%
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        Incident Reduction
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Across all deployed sites
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            className="brief-section"
            variants={containerVariants}
            initial="hidden"
            animate={controls}
          >
            <Card
              sx={{
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
              }}
            >
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                  Ready to Transform Your Mining Operations?
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
                  Contact our team to schedule a personalized demonstration and learn how PRISM 
                  can enhance safety and efficiency at your mining operation.
                </Typography>
                <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                      px: 4,
                      py: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`
                      }
                    }}
                  >
                    Request Live Demo
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      px: 4,
                      py: 2,
                      borderColor: theme.palette.secondary.main,
                      color: theme.palette.secondary.main,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.secondary.main, 0.1)
                      }
                    }}
                  >
                    Contact Sales
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Container>
    </Box>
  );
};

export default AppBriefPage;