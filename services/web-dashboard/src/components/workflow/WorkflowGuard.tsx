import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { Lock, ArrowBack } from '@mui/icons-material';
import { useWorkflowStore, WorkflowStep } from '../../store/workflowStore';

interface WorkflowGuardProps {
  children: React.ReactNode;
  requiredStep: WorkflowStep;
  fallbackPath?: string;
}

const STEP_NAMES: Record<WorkflowStep, string> = {
  'data-input': 'Data Input',
  'model-config': 'Model Configuration',
  'analytics': 'Analytics',
  'reports': 'Reports',
  'scenario': 'Scenario Planning',
  'risk-assessment': 'Risk Assessment'
};

const STEP_DEPENDENCIES: Record<WorkflowStep, WorkflowStep[]> = {
  'data-input': [],
  'model-config': ['data-input'],
  'analytics': ['model-config'],
  'reports': ['analytics'],
  'scenario': ['analytics'],
  'risk-assessment': ['analytics']
};

const WorkflowGuard: React.FC<WorkflowGuardProps> = ({
  children,
  requiredStep,
  fallbackPath = '/app/dashboard'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    canNavigateToStep, 
    progress, 
    addNotification,
    getNextAvailableStep 
  } = useWorkflowStore();

  const canAccess = canNavigateToStep(requiredStep);
  const dependencies = STEP_DEPENDENCIES[requiredStep];
  const incompleteDependencies = dependencies.filter(
    dep => !progress.completedSteps.includes(dep)
  );

  useEffect(() => {
    if (!canAccess) {
      // Add notification about blocked access
      addNotification({
        type: 'warning',
        title: 'Access Restricted',
        message: `Please complete the required steps before accessing ${STEP_NAMES[requiredStep]}.`,
        duration: 5000,
        actions: [
          {
            label: 'Go to Dashboard',
            action: () => navigate('/app/dashboard')
          }
        ]
      });
    }
  }, [canAccess, requiredStep, navigate, addNotification]);

  if (canAccess) {
    return <>{children}</>;
  }

  const handleGoBack = () => {
    navigate(fallbackPath);
  };

  const handleGoToNextStep = () => {
    const nextStep = getNextAvailableStep();
    if (nextStep) {
      const stepPaths: Record<WorkflowStep, string> = {
        'data-input': '/app/data-input',
        'model-config': '/app/model-config',
        'analytics': '/app/analytics',
        'reports': '/app/reports',
        'scenario': '/app/scenario',
        'risk-assessment': '/app/risk'
      };
      
      navigate(stepPaths[nextStep]);
    } else {
      navigate('/app/data-input');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        backgroundColor: 'background.default'
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Lock
            sx={{
              fontSize: 64,
              color: 'warning.main',
              mb: 2
            }}
          />
          
          <Typography variant="h5" gutterBottom>
            Access Restricted
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            You need to complete the following steps before accessing{' '}
            <strong>{STEP_NAMES[requiredStep]}</strong>:
          </Typography>

          <Box sx={{ mb: 3 }}>
            {incompleteDependencies.map((dep, index) => (
              <Typography
                key={dep}
                variant="body2"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  mb: 1,
                  p: 1,
                  backgroundColor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: 'warning.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  {index + 1}
                </Box>
                {STEP_NAMES[dep]}
              </Typography>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleGoBack}
            >
              Go Back
            </Button>
            <Button
              variant="contained"
              onClick={handleGoToNextStep}
              color="primary"
            >
              Start Workflow
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Complete the workflow steps in order to unlock all features.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkflowGuard;