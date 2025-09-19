import React, { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import ErrorBoundary from './ErrorBoundary';
import Scene3DFallback from './Scene3DFallback';

// Lazy load the 3D scene to reduce initial bundle size
const Scene3D = lazy(() => import('./Scene3D').catch(() => ({ default: Scene3DFallback })));

const LazyScene3D: React.FC = () => {
  return (
    <ErrorBoundary fallback={<Scene3DFallback />}>
      <Suspense
        fallback={
          <Box
            sx={{
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(26, 26, 26, 0.5)',
              borderRadius: 2
            }}
          >
            <CircularProgress size={60} sx={{ color: 'primary.main' }} />
          </Box>
        }
      >
        <Scene3D />
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyScene3D;