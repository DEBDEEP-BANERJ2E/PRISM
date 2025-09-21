import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Person,
  Business,
  Email,
  Phone,
  Engineering,
  CheckCircle
} from '@mui/icons-material';

interface LeadData {
  // Step 1: Basic Info
  name: string;
  email: string;
  
  // Step 2: Company Info
  company: string;
  role: string;
  
  // Step 3: Qualification
  mineType: string;
  mineSize: string;
  currentChallenges: string[];
  timeline: string;
  budget: string;
}

interface LeadCaptureFormProps {
  variant?: 'demo' | 'whitepaper' | 'consultation' | 'waitlist';
  onSubmit?: (data: LeadData) => Promise<void>;
  onClose?: () => void;
  title?: string;
  description?: string;
}

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
  variant = 'demo',
  onSubmit,
  onClose,
  title,
  description
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<LeadData>({
    name: '',
    email: '',
    company: '',
    role: '',
    mineType: '',
    mineSize: '',
    currentChallenges: [],
    timeline: '',
    budget: ''
  });

  const steps = ['Contact Info', 'Company Details', 'Requirements'];
  
  const challenges = [
    'Rockfall incidents',
    'Equipment damage',
    'Worker safety concerns',
    'Insurance costs',
    'Regulatory compliance',
    'Operational downtime',
    'Maintenance scheduling',
    'Risk assessment'
  ];

  const getFormTitle = () => {
    if (title) return title;
    
    switch (variant) {
      case 'demo':
        return 'Request a Demo';
      case 'whitepaper':
        return 'Download Technical Whitepaper';
      case 'consultation':
        return 'Schedule Consultation';
      case 'waitlist':
        return 'Join Early Access';
      default:
        return 'Get Started';
    }
  };

  const getFormDescription = () => {
    if (description) return description;
    
    switch (variant) {
      case 'demo':
        return 'See PRISM in action with a personalized demo tailored to your mining operation.';
      case 'whitepaper':
        return 'Get detailed technical specifications and implementation guidelines.';
      case 'consultation':
        return 'Speak with our mining safety experts about your specific challenges.';
      case 'waitlist':
        return 'Be among the first to access our revolutionary rockfall prediction system.';
      default:
        return 'Learn how PRISM can improve safety at your mining operation.';
    }
  };

  const handleInputChange = (field: keyof LeadData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleChallengeToggle = (challenge: string) => {
    setFormData(prev => ({
      ...prev,
      currentChallenges: prev.currentChallenges.includes(challenge)
        ? prev.currentChallenges.filter(c => c !== challenge)
        : [...prev.currentChallenges, challenge]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return formData.name.trim() !== '' && 
               formData.email.trim() !== '' && 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
      case 1:
        return formData.company.trim() !== '' && formData.role.trim() !== '';
      case 2:
        return variant === 'waitlist' || 
               (formData.mineType !== '' && formData.mineSize !== '');
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (onSubmit) {
        await onSubmit(formData);
      }
      
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Paper
        sx={{
          p: 4,
          maxWidth: 500,
          mx: 'auto',
          textAlign: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`
        }}
      >
        <CheckCircle
          sx={{
            fontSize: 64,
            color: theme.palette.success.main,
            mb: 2
          }}
        />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Thank You!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {variant === 'demo' && "We'll contact you within 24 hours to schedule your personalized demo."}
          {variant === 'whitepaper' && "Check your email for the download link to our technical whitepaper."}
          {variant === 'consultation' && "Our team will reach out to schedule your consultation."}
          {variant === 'waitlist' && "You're on the list! We'll notify you when early access becomes available."}
        </Typography>
        {onClose && (
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        )}
      </Paper>
    );
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              InputProps={{
                startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              aria-label="Enter your full name"
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              aria-label="Enter your email address"
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Company Name"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              required
              InputProps={{
                startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              aria-label="Enter your company name"
            />
            <FormControl fullWidth required>
              <InputLabel>Your Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                startAdornment={<Engineering sx={{ mr: 1, color: 'text.secondary' }} />}
                aria-label="Select your role"
              >
                <MenuItem value="Safety Manager">Safety Manager</MenuItem>
                <MenuItem value="Mine Manager">Mine Manager</MenuItem>
                <MenuItem value="Operations Director">Operations Director</MenuItem>
                <MenuItem value="Engineering Manager">Engineering Manager</MenuItem>
                <MenuItem value="Risk Manager">Risk Manager</MenuItem>
                <MenuItem value="CEO/Owner">CEO/Owner</MenuItem>
                <MenuItem value="Consultant">Consultant</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 2:
        if (variant === 'waitlist') {
          return (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" gutterBottom>
                You're almost done!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click submit to join our early access program.
              </Typography>
            </Box>
          );
        }

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Mine Type</InputLabel>
              <Select
                value={formData.mineType}
                onChange={(e) => handleInputChange('mineType', e.target.value)}
                aria-label="Select your mine type"
              >
                <MenuItem value="Open Pit">Open Pit</MenuItem>
                <MenuItem value="Underground">Underground</MenuItem>
                <MenuItem value="Quarry">Quarry</MenuItem>
                <MenuItem value="Surface">Surface</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Mine Size</InputLabel>
              <Select
                value={formData.mineSize}
                onChange={(e) => handleInputChange('mineSize', e.target.value)}
                aria-label="Select your mine size"
              >
                <MenuItem value="Small (< 1M tons/year)">Small (&lt; 1M tons/year)</MenuItem>
                <MenuItem value="Medium (1-10M tons/year)">Medium (1-10M tons/year)</MenuItem>
                <MenuItem value="Large (10-50M tons/year)">Large (10-50M tons/year)</MenuItem>
                <MenuItem value="Very Large (> 50M tons/year)">Very Large (&gt; 50M tons/year)</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Current Challenges (select all that apply):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {challenges.map((challenge) => (
                  <Chip
                    key={challenge}
                    label={challenge}
                    onClick={() => handleChallengeToggle(challenge)}
                    color={formData.currentChallenges.includes(challenge) ? 'primary' : 'default'}
                    variant={formData.currentChallenges.includes(challenge) ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            <FormControl fullWidth>
              <InputLabel>Implementation Timeline</InputLabel>
              <Select
                value={formData.timeline}
                onChange={(e) => handleInputChange('timeline', e.target.value)}
                aria-label="Select implementation timeline"
              >
                <MenuItem value="Immediate (< 3 months)">Immediate (&lt; 3 months)</MenuItem>
                <MenuItem value="Short-term (3-6 months)">Short-term (3-6 months)</MenuItem>
                <MenuItem value="Medium-term (6-12 months)">Medium-term (6-12 months)</MenuItem>
                <MenuItem value="Long-term (> 12 months)">Long-term (&gt; 12 months)</MenuItem>
                <MenuItem value="Exploring options">Exploring options</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Paper
      sx={{
        p: 4,
        maxWidth: 600,
        mx: 'auto',
        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
      }}
    >
      <Typography variant="h4" fontWeight="bold" gutterBottom textAlign="center">
        {getFormTitle()}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
        {getFormDescription()}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        {renderStepContent()}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          onClick={activeStep === 0 ? onClose : handleBack}
          disabled={isSubmitting}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default LeadCaptureForm;