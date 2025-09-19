import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { ViewInAr, Terrain, Engineering } from '@mui/icons-material';

const Scene3DFallback: React.FC = () => {
  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(255,107,53,0.1) 100%)',
        borderRadius: 2,
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
            radial-gradient(circle at 20% 20%, #00ff88 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, #ff6b35 0%, transparent 50%)
          `
        }}
      />

      <Card
        sx={{
          maxWidth: 400,
          textAlign: 'center',
          background: 'rgba(26, 26, 26, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 255, 136, 0.2)'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <ViewInAr sx={{ fontSize: 40, color: 'primary.main' }} />
            <Terrain sx={{ fontSize: 40, color: 'secondary.main' }} />
            <Engineering sx={{ fontSize: 40, color: 'info.main' }} />
          </Box>
          
          <Typography variant="h5" gutterBottom sx={{ color: 'primary.main' }}>
            3D Mine Visualization
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Interactive 3D visualization of the mining environment with:
          </Typography>
          
          <Box sx={{ textAlign: 'left', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • Real-time sensor network monitoring
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Dynamic rockfall simulation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Open-pit mine terrain modeling
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Risk assessment visualization
            </Typography>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Loading 3D environment... Please ensure WebGL is enabled in your browser.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Scene3DFallback;