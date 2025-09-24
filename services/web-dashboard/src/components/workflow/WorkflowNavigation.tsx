import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Typography,
  Chip,
  Tooltip,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  Upload,
  Settings,
  Analytics,
  Description,
  Science,
  Assessment,
  CheckCircle,
  Lock,
  RadioButtonUnchecked
} from '@mui/icons-material';
import { useWorkflowStore, WorkflowStep } from '../../store/workflowStore';

const WORKFLOW_STEPS_CONFIG = [
  {
    key: 'data-input' as WorkflowStep,
    label: 'Data Input',
    description: 'Upload and preprocess data',
    icon: Upload,
    path: '/app/data-input'
  },
  {
    key: 'model-config' as WorkflowStep,
    label: 'Model Configuration',
    description: 'Configure and train ML models',
    icon: Settings,
    path: '/app/model-config'
  },
  {
    key: 'analytics' as WorkflowStep,
    label: 'Analytics',
    description: 'View model performance and insights',
    icon: Analytics,
    path: '/app/analytics'
  },
  {
    key: 'reports' as WorkflowStep,
    label: 'Reports',
    description: 'Generate comprehensive reports',
    icon: Description,
    path: '/app/reports'
  },
  {
    key: 'scenario' as WorkflowStep,
    label: 'Scenario Planning',
    description: 'Run predictive scenarios',
    icon: Science,
    path: '/app/scenario'
  },
  {
    key: 'risk-assessment' as WorkflowStep,
    label: 'Risk Assessment',
    description: 'Assess and manage risks',
    icon: Assessment,
    path: '/app/risk'
  }
];

interface WorkflowNavigationProps {
  compact?: boolean;
  showProgress?: boolean;
}

const WorkflowNavigation: React.FC<WorkflowNavigationProps> = ({
  compact = false,
  showProgress = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    progress,
    canNavigateToStep,
    setCurrentStep,
    isLoading,
    addNotification
  } = useWorkflowStore();

  const currentStepIndex = WORKFLOW_STEPS_CONFIG.findIndex(
    step => step.path === location.pathname
  );

  const handleStepClick = (step: WorkflowStep, path: string) => {
    if (!canNavigateToStep(step)) {
      addNotification({
        type: 'warning',
        title: 'Navigation Blocked',
        message: 'Please complete the previous steps before proceeding.',
        duration: 3000
      });
      return;
    }

    if (isLoading('navigation')) {
      return;
    }

    setCurrentStep(step);
    navigate(path);
  };

  const getStepStatus = (step: WorkflowStep) => {
    if (progress.completedSteps.includes(step)) {
      return 'completed';
    }
    if (progress.currentStep === step) {
      return 'active';
    }
    if (canNavigateToStep(step)) {
      return 'available';
    }
    return 'locked';
  };

  const getStepIcon = (stepConfig: typeof WORKFLOW_STEPS_CONFIG[0], status: string) => {
    const IconComponent = stepConfig.icon;
    
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'active':
        return <IconComponent color="primary" />;
      case 'available':
        return <RadioButtonUnchecked color="action" />;
      case 'locked':
        return <Lock color="disabled" />;
      default:
        return <IconComponent />;
    }
  };

  const completionPercentage = (progress.completedSteps.length / WORKFLOW_STEPS_CONFIG.length) * 100;

  if (compact) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Workflow Progress
          </Typography>
          <Chip
            label={`${progress.completedSteps.length}/${WORKFLOW_STEPS_CONFIG.length}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        
        {showProgress && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3
                }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round(completionPercentage)}% Complete
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {WORKFLOW_STEPS_CONFIG.map((stepConfig) => {
            const status = getStepStatus(stepConfig.key);
            const isClickable = status === 'available' || status === 'completed' || status === 'active';
            
            return (
              <Tooltip
                key={stepConfig.key}
                title={
                  status === 'locked' 
                    ? 'Complete previous steps to unlock'
                    : stepConfig.description
                }
              >
                <Chip
                  icon={getStepIcon(stepConfig, status)}
                  label={stepConfig.label}
                  size="small"
                  clickable={isClickable}
                  onClick={() => isClickable && handleStepClick(stepConfig.key, stepConfig.path)}
                  color={status === 'active' ? 'primary' : 'default'}
                  variant={status === 'completed' ? 'filled' : 'outlined'}
                  sx={{
                    opacity: status === 'locked' ? 0.5 : 1,
                    cursor: isClickable ? 'pointer' : 'not-allowed'
                  }}
                />
              </Tooltip>
            );
          })}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Science Workflow
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Follow these steps to complete your data science analysis
        </Typography>
        
        {showProgress && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress: {progress.completedSteps.length} of {WORKFLOW_STEPS_CONFIG.length} steps completed
              </Typography>
              <Typography variant="body2" color="primary.main" fontWeight="medium">
                {Math.round(completionPercentage)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4
                }
              }}
            />
          </Box>
        )}
      </Box>

      <Stepper
        activeStep={currentStepIndex}
        orientation="vertical"
        sx={{
          '& .MuiStepConnector-line': {
            borderColor: 'divider'
          }
        }}
      >
        {WORKFLOW_STEPS_CONFIG.map((stepConfig, index) => {
          const status = getStepStatus(stepConfig.key);
          const isClickable = status === 'available' || status === 'completed' || status === 'active';
          
          return (
            <Step key={stepConfig.key} completed={status === 'completed'}>
              <StepButton
                onClick={() => isClickable && handleStepClick(stepConfig.key, stepConfig.path)}
                disabled={!isClickable}
                sx={{
                  textAlign: 'left',
                  '& .MuiStepLabel-label': {
                    fontSize: '1rem',
                    fontWeight: status === 'active' ? 600 : 400
                  }
                }}
              >
                <StepLabel
                  StepIconComponent={() => getStepIcon(stepConfig, status)}
                  optional={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {stepConfig.description}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={status.charAt(0).toUpperCase() + status.slice(1)}
                          size="small"
                          color={
                            status === 'completed' ? 'success' :
                            status === 'active' ? 'primary' :
                            status === 'available' ? 'default' : 'default'
                          }
                          variant={status === 'locked' ? 'outlined' : 'filled'}
                        />
                      </Box>
                    </Box>
                  }
                >
                  {stepConfig.label}
                </StepLabel>
              </StepButton>
            </Step>
          );
        })}
      </Stepper>
    </Paper>
  );
};

export default WorkflowNavigation;