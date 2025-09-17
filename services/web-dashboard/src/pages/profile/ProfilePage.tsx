import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';
import { Person } from '@mui/icons-material';

const ProfilePage: React.FC = () => {
  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Profile
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your profile and preferences
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              backdropFilter: 'blur(10px)', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CardContent>
                <Box textAlign="center">
                  <Person sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    User Profile
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Profile management features coming soon...
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;