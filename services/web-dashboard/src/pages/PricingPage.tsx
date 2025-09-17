import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Box as MuiBox,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Paper,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import {
  CheckCircle,
  Star,
  Business,
  Engineering,
  Security,
  Analytics,
  Support,
  Cloud,
  Speed,
  Shield,
  ArrowBack,
  ContactSupport
} from '@mui/icons-material';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const controls = useAnimation();

  useEffect(() => {
    // GSAP Animations
    gsap.fromTo('.pricing-card',
      { opacity: 0, y: 50, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.pricing-section',
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      }
    );

    controls.start('visible');

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [controls]);

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$2,999',
      period: '/month',
      description: 'Perfect for small mining operations',
      popular: false,
      features: [
        'Up to 50 sensors',
        'Basic risk assessment',
        'Email alerts',
        'Monthly reports',
        'Standard support',
        'Web dashboard access',
        'Mobile app access',
        'Data retention: 6 months'
      ],
      color: theme.palette.info.main,
      buttonText: 'Start Free Trial'
    },
    {
      name: 'Professional',
      price: '$7,999',
      period: '/month',
      description: 'Ideal for medium-scale operations',
      popular: true,
      features: [
        'Up to 200 sensors',
        'Advanced AI predictions',
        'Real-time SMS & email alerts',
        'Weekly automated reports',
        'Priority support',
        'Advanced analytics dashboard',
        'API access',
        'Custom integrations',
        'Data retention: 2 years',
        'Digital twin visualization',
        'Scenario planning tools'
      ],
      color: theme.palette.primary.main,
      buttonText: 'Most Popular'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large-scale mining enterprises',
      popular: false,
      features: [
        'Unlimited sensors',
        'Custom AI model training',
        'Multi-channel alerts',
        'Real-time reporting',
        '24/7 dedicated support',
        'White-label solutions',
        'On-premise deployment',
        'Custom integrations',
        'Unlimited data retention',
        'Advanced digital twin',
        'Predictive maintenance',
        'Compliance reporting',
        'Training & consultation'
      ],
      color: theme.palette.secondary.main,
      buttonText: 'Contact Sales'
    }
  ];

  const features = [
    {
      icon: <Security />,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and security protocols'
    },
    {
      icon: <Analytics />,
      title: 'Advanced Analytics',
      description: 'AI-powered insights and predictive modeling'
    },
    {
      icon: <Support />,
      title: '24/7 Support',
      description: 'Round-the-clock technical support'
    },
    {
      icon: <Cloud />,
      title: 'Cloud & On-Premise',
      description: 'Flexible deployment options'
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
    <MuiBox
      sx={{
        minHeight: '100vh',
        overflow: 'auto',
        background: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%),
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)
        `
      }}
    >
      {/* Header */}
      <AppBar 
        position="sticky" 
        sx={{ 
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(20px)',
          boxShadow: 'none',
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
        }}
      >
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            PRISM Pricing
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => navigate('/login')}
            sx={{ mr: 2 }}
          >
            Login
          </Button>
          <Button 
            variant="contained" 
            onClick={() => navigate('/waitlist')}
          >
            Join Waitlist
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <MuiBox textAlign="center" mb={8}>
            <Typography
              variant="h2"
              fontWeight="bold"
              gutterBottom
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Choose Your Plan
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}
            >
              Select the perfect PRISM plan for your mining operation. 
              All plans include our core AI-powered rockfall prediction technology.
            </Typography>
            <Chip 
              label="30-Day Free Trial Available" 
              color="primary" 
              sx={{ fontSize: '1rem', py: 2, px: 1 }}
            />
          </MuiBox>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="pricing-section"
          variants={containerVariants}
          initial="hidden"
          animate={controls}
        >
          <Grid container spacing={4} justifyContent="center">
            {pricingPlans.map((plan, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  className="pricing-card"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      position: 'relative',
                      background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
                      backdropFilter: 'blur(20px)',
                      border: plan.popular 
                        ? `2px solid ${plan.color}` 
                        : `1px solid ${alpha(plan.color, 0.3)}`,
                      boxShadow: plan.popular 
                        ? `0 20px 40px ${alpha(plan.color, 0.3)}` 
                        : `0 10px 30px ${alpha(theme.palette.common.black, 0.2)}`,
                      '&:hover': {
                        boxShadow: `0 25px 50px ${alpha(plan.color, 0.4)}`
                      }
                    }}
                  >
                    {plan.popular && (
                      <Chip
                        label="Most Popular"
                        color="primary"
                        icon={<Star />}
                        sx={{
                          position: 'absolute',
                          top: -12,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 1
                        }}
                      />
                    )}
                    
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight="bold" gutterBottom>
                        {plan.name}
                      </Typography>
                      
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        {plan.description}
                      </Typography>
                      
                      <MuiBox my={3}>
                        <Typography
                          variant="h3"
                          fontWeight="bold"
                          sx={{
                            background: `linear-gradient(135deg, ${plan.color} 0%, ${alpha(plan.color, 0.7)} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          {plan.price}
                          <Typography
                            component="span"
                            variant="h6"
                            color="text.secondary"
                          >
                            {plan.period}
                          </Typography>
                        </Typography>
                      </MuiBox>
                      
                      <Button
                        variant={plan.popular ? "contained" : "outlined"}
                        size="large"
                        fullWidth
                        sx={{
                          mb: 3,
                          py: 1.5,
                          background: plan.popular 
                            ? `linear-gradient(135deg, ${plan.color} 0%, ${alpha(plan.color, 0.8)} 100%)`
                            : 'transparent',
                          borderColor: plan.color,
                          color: plan.popular ? 'white' : plan.color,
                          '&:hover': {
                            background: plan.popular 
                              ? `linear-gradient(135deg, ${alpha(plan.color, 0.9)} 0%, ${alpha(plan.color, 0.7)} 100%)`
                              : alpha(plan.color, 0.1),
                            transform: 'translateY(-2px)'
                          }
                        }}
                        onClick={() => {
                          if (plan.name === 'Enterprise') {
                            // Contact sales logic
                            window.open('mailto:sales@prism.com?subject=Enterprise Plan Inquiry');
                          } else {
                            navigate('/login');
                          }
                        }}
                      >
                        {plan.buttonText}
                      </Button>
                      
                      <List dense>
                        {plan.features.map((feature, featureIndex) => (
                          <ListItem key={featureIndex} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircle 
                                sx={{ 
                                  fontSize: 20, 
                                  color: plan.color 
                                }} 
                              />
                            </ListItemIcon>
                            <ListItemText 
                              primary={feature}
                              primaryTypographyProps={{
                                variant: 'body2'
                              }}
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

        {/* Features Section */}
        <MuiBox mt={12}>
          <Typography
            variant="h3"
            textAlign="center"
            gutterBottom
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              mb: 6,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Why Choose PRISM?
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Paper
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      background: alpha(theme.palette.background.paper, 0.6),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: `0 15px 35px ${alpha(theme.palette.primary.main, 0.2)}`
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <MuiBox
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2
                      }}
                    >
                      {React.cloneElement(feature.icon, { sx: { fontSize: 32, color: 'white' } })}
                    </MuiBox>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </MuiBox>

        {/* FAQ Section */}
        <MuiBox mt={12} textAlign="center">
          <Typography
            variant="h4"
            fontWeight="bold"
            gutterBottom
            sx={{ mb: 4 }}
          >
            Have Questions?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Our team is here to help you choose the right plan for your mining operation.
          </Typography>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ContactSupport />}
            onClick={() => window.open('mailto:support@prism.com?subject=Pricing Inquiry')}
            sx={{
              px: 4,
              py: 2,
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                transform: 'translateY(-2px)'
              }
            }}
          >
            Contact Sales Team
          </Button>
        </MuiBox>
      </Container>
    </MuiBox>
  );
};

export default PricingPage;