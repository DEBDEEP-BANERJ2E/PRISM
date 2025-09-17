import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';
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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ArrowBack,
  Email,
  Business,
  LocationOn,
  Phone,
  CheckCircle,
  Star,
  Notifications,
  Speed,
  Security,
  Analytics,
  Engineering
} from '@mui/icons-material';

const WaitlistPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const controls = useAnimation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    phone: '',
    country: '',
    mineType: '',
    companySize: '',
    currentSafetySolution: '',
    interests: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // GSAP Animations
    gsap.fromTo('.waitlist-form',
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    );

    gsap.fromTo('.benefit-item',
      { opacity: 0, x: -30 },
      {
        opacity: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        delay: 0.3
      }
    );

    controls.start('visible');
  }, [controls]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, you would send this data to your backend
      console.log('Waitlist submission:', formData);
      
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: <Star />,
      title: 'Early Access',
      description: 'Be among the first to experience PRISM\'s revolutionary technology'
    },
    {
      icon: <Speed />,
      title: 'Priority Onboarding',
      description: 'Skip the queue and get faster implementation when we launch'
    },
    {
      icon: <Analytics />,
      title: 'Beta Testing',
      description: 'Help shape the future of mining safety with exclusive beta access'
    },
    {
      icon: <Security />,
      title: 'Special Pricing',
      description: 'Exclusive early-bird pricing for waitlist members'
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

  if (isSubmitted) {
    return (
      <MuiBox
        sx={{
          minHeight: '100vh',
          overflow: 'auto',
          background: `
            radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%),
            linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Card
              sx={{
                textAlign: 'center',
                p: 6,
                background: alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
              }}
            >
              <CheckCircle 
                sx={{ 
                  fontSize: 80, 
                  color: theme.palette.success.main, 
                  mb: 3 
                }} 
              />
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Welcome to the Waitlist!
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Thank you for joining the PRISM waitlist. We'll keep you updated on our progress 
                and notify you as soon as early access becomes available.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                You'll receive a confirmation email shortly with more details about what to expect.
              </Typography>
              <MuiBox display="flex" gap={2} justifyContent="center">
                <Button
                  variant="contained"
                  onClick={() => navigate('/')}
                  sx={{ px: 4 }}
                >
                  Back to Home
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/pricing')}
                  sx={{ px: 4 }}
                >
                  View Pricing
                </Button>
              </MuiBox>
            </Card>
          </motion.div>
        </Container>
      </MuiBox>
    );
  }

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
            Join PRISM Waitlist
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => navigate('/login')}
            sx={{ mr: 2 }}
          >
            Login
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/pricing')}
          >
            Pricing
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6} alignItems="flex-start">
          {/* Left Side - Benefits */}
          <Grid item xs={12} md={5}>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={controls}
            >
              <Typography
                variant="h3"
                fontWeight="bold"
                gutterBottom
                sx={{
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 3
                }}
              >
                Be First in Line
              </Typography>
              
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Join thousands of mining professionals who are waiting for the future of rockfall prediction.
              </Typography>

              <List>
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    className="benefit-item"
                    variants={itemVariants}
                  >
                    <ListItem sx={{ px: 0, py: 2 }}>
                      <ListItemIcon>
                        <MuiBox
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {React.cloneElement(benefit.icon, { sx: { color: 'white' } })}
                        </MuiBox>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="h6" fontWeight="bold">
                            {benefit.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {benefit.description}
                          </Typography>
                        }
                        sx={{ ml: 2 }}
                      />
                    </ListItem>
                  </motion.div>
                ))}
              </List>

              <Paper
                sx={{
                  p: 3,
                  mt: 4,
                  background: alpha(theme.palette.primary.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                }}
              >
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Stay Updated
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  We'll send you exclusive updates about PRISM's development, 
                  beta testing opportunities, and launch announcements.
                </Typography>
              </Paper>
            </motion.div>
          </Grid>

          {/* Right Side - Form */}
          <Grid item xs={12} md={7}>
            <motion.div className="waitlist-form">
              <Card
                sx={{
                  p: 4,
                  background: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  Join the Waitlist
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Fill out the form below to secure your spot in line for early access to PRISM.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        required
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        required
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        InputProps={{
                          startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Company Name"
                        required
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        InputProps={{
                          startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Job Title"
                        required
                        value={formData.jobTitle}
                        onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        InputProps={{
                          startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Country</InputLabel>
                        <Select
                          value={formData.country}
                          label="Country"
                          onChange={(e) => handleInputChange('country', e.target.value)}
                        >
                          <MenuItem value="US">United States</MenuItem>
                          <MenuItem value="CA">Canada</MenuItem>
                          <MenuItem value="AU">Australia</MenuItem>
                          <MenuItem value="BR">Brazil</MenuItem>
                          <MenuItem value="CL">Chile</MenuItem>
                          <MenuItem value="PE">Peru</MenuItem>
                          <MenuItem value="ZA">South Africa</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Mine Type</InputLabel>
                        <Select
                          value={formData.mineType}
                          label="Mine Type"
                          onChange={(e) => handleInputChange('mineType', e.target.value)}
                        >
                          <MenuItem value="open-pit">Open-pit</MenuItem>
                          <MenuItem value="underground">Underground</MenuItem>
                          <MenuItem value="quarry">Quarry</MenuItem>
                          <MenuItem value="surface">Surface Mining</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Company Size</InputLabel>
                        <Select
                          value={formData.companySize}
                          label="Company Size"
                          onChange={(e) => handleInputChange('companySize', e.target.value)}
                        >
                          <MenuItem value="1-50">1-50 employees</MenuItem>
                          <MenuItem value="51-200">51-200 employees</MenuItem>
                          <MenuItem value="201-1000">201-1000 employees</MenuItem>
                          <MenuItem value="1000+">1000+ employees</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Current Safety Solution (Optional)"
                        multiline
                        rows={3}
                        value={formData.currentSafetySolution}
                        onChange={(e) => handleInputChange('currentSafetySolution', e.target.value)}
                        placeholder="Tell us about your current rockfall monitoring or safety systems..."
                      />
                    </Grid>
                  </Grid>

                  <MuiBox mt={4}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={isSubmitting}
                      sx={{
                        py: 2,
                        fontSize: '1.1rem',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`,
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <CircularProgress size={24} sx={{ mr: 2 }} />
                          Joining Waitlist...
                        </>
                      ) : (
                        'Join Waitlist'
                      )}
                    </Button>
                  </MuiBox>

                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ display: 'block', textAlign: 'center', mt: 2 }}
                  >
                    By joining the waitlist, you agree to receive updates about PRISM. 
                    You can unsubscribe at any time.
                  </Typography>
                </form>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </MuiBox>
  );
};

export default WaitlistPage;