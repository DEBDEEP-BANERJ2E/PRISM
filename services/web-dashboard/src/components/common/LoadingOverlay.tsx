import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  LinearProgress,
  Card,
  CardContent
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  progress?: number;
  variant?: 'backdrop' | 'inline' | 'card';
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Loading...',
  progress,
  variant = 'backdrop',
  size = 'medium',
  showProgress = false
}) => {
  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { size: 24, typography: 'body2' };
      case 'large':
        return { size: 60, typography: 'h6' };
      default:
        return { size: 40, typography: 'body1' };
    }
  };

  const { size: spinnerSize, typography } = getSizeProps();

  const LoadingContent = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          textAlign: 'center'
        }}
      >
        <CircularProgress
          size={spinnerSize}
          thickness={4}
          sx={{
            color: 'primary.main'
          }}
        />
        
        <Box sx={{ minWidth: 200 }}>
          <Typography variant={typography as any} color="text.primary" gutterBottom>
            {message}
          </Typography>
          
          {showProgress && typeof progress === 'number' && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
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
                {Math.round(progress)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );

  if (variant === 'backdrop') {
    return (
      <AnimatePresence>
        {open && (
          <Backdrop
            open={open}
            sx={{
              color: '#fff',
              zIndex: (theme) => theme.zIndex.drawer + 1,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)'
            }}
          >
            <LoadingContent />
          </Backdrop>
        )}
      </AnimatePresence>
    );
  }

  if (variant === 'card') {
    return (
      <AnimatePresence>
        {open && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(2px)',
              zIndex: 10
            }}
          >
            <Card
              sx={{
                minWidth: 300,
                backgroundColor: 'background.paper',
                boxShadow: (theme) => theme.shadows[8]
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <LoadingContent />
              </CardContent>
            </Card>
          </Box>
        )}
      </AnimatePresence>
    );
  }

  // Inline variant
  return (
    <AnimatePresence>
      {open && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            minHeight: 200
          }}
        >
          <LoadingContent />
        </Box>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;