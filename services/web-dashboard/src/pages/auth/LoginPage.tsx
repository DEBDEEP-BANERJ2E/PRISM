import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Chip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Security,
  Terrain,
  Analytics
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = (location.state as any)?.from?.pathname || '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  const demoLogin = async (role: 'admin' | 'operator' | 'viewer') => {
    const demoCredentials = {
      admin: { email: 'admin@prism.com', password: 'admin123' },
      operator: { email: 'operator@prism.com', password: 'operator123' },
      viewer: { email: 'viewer@prism.com', password: 'viewer123' }
    };
    
    const creds = demoCredentials[role];
    setEmail(creds.email);
    setPassword(creds.password);
    
    try {
      await login(creds.email, creds.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Demo login failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background: `
            radial-gradient(circle at 20% 80%, #00ff88 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, #ff6b35 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, #00ff88 0%, transparent 50%)
          `
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card
          sx={{
            maxWidth: 480,
            width: '100%',
            mx: 2,
            backdropFilter: 'blur(20px)',
            background: 'rgba(26, 26, 26, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box textAlign="center" mb={4}>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                    mb: 2,
                    boxShadow: '0 10px 30px rgba(0, 255, 136, 0.3)'
                  }}
                >
                  <Terrain sx={{ fontSize: 40, color: 'white' }} />
                </Box>
              </motion.div>
              
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                PRISM
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Predictive Rockfall Intelligence & Safety Management
              </Typography>
            </Box>

            {/* Demo Login Options */}
            <Box mb={3}>
              <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
                Quick Demo Access:
              </Typography>
              <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                <Chip
                  label="Admin Demo"
                  onClick={() => demoLogin('admin')}
                  sx={{ cursor: 'pointer' }}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label="Operator Demo"
                  onClick={() => demoLogin('operator')}
                  sx={{ cursor: 'pointer' }}
                  color="secondary"
                  variant="outlined"
                />
                <Chip
                  label="Viewer Demo"
                  onClick={() => demoLogin('viewer')}
                  sx={{ cursor: 'pointer' }}
                  color="default"
                  variant="outlined"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Or sign in manually
              </Typography>
            </Divider>

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00cc6a, #00aa55)'
                  }
                }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Features */}
            <Box mt={4}>
              <Typography variant="body2" color="text.secondary" textAlign="center" mb={2}>
                Advanced Mining Safety Platform
              </Typography>
              <Box display="flex" justifyContent="center" gap={3}>
                <Box textAlign="center">
                  <Security color="primary" sx={{ mb: 1 }} />
                  <Typography variant="caption" display="block">
                    AI Prediction
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Analytics color="primary" sx={{ mb: 1 }} />
                  <Typography variant="caption" display="block">
                    Real-time Analytics
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Terrain color="primary" sx={{ mb: 1 }} />
                  <Typography variant="caption" display="block">
                    3D Visualization
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default LoginPage;