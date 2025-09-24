import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { FeatureImportanceData } from '../../types/dataScience';

interface FeatureImportanceChartProps {
  data: FeatureImportanceData;
  maxFeatures?: number;
}

const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({
  data,
  maxFeatures = 15
}) => {
  const theme = useTheme();
  
  const topFeatures = data.features.slice(0, maxFeatures);
  const summaryFeatures = data.features.slice(0, 5);

  // Generate colors for bars based on importance
  const getBarColor = (importance: number, index: number) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.info.main
    ];
    
    if (index < 3) {
      return colors[index];
    }
    
    // Fade color based on importance
    const alpha = Math.max(0.3, importance);
    return `${theme.palette.primary.main}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
  };

  return (
    <Grid container spacing={3}>
      {/* Main Chart */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Feature Importance
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Method: {data.method.toUpperCase()} | Total Features: {data.totalFeatures}
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFeatures} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'Importance']}
                    labelFormatter={(label) => `Feature: ${label}`}
                  />
                  <Bar dataKey="importance">
                    {topFeatures.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getBarColor(entry.importance, index)} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Summary Panel */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Features Summary
            </Typography>
            <List dense>
              {summaryFeatures.map((feature, index) => (
                <ListItem key={feature.name} sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" noWrap sx={{ maxWidth: '60%' }}>
                          {index + 1}. {feature.name}
                        </Typography>
                        <Chip 
                          label={`${(feature.importance * 100).toFixed(1)}%`}
                          size="small"
                          color={index < 3 ? 'primary' : 'default'}
                          variant={index < 3 ? 'filled' : 'outlined'}
                        />
                      </Box>
                    }
                    secondary={`Rank: ${feature.rank}`}
                  />
                </ListItem>
              ))}
            </List>
            
            {/* Feature Importance Distribution */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Importance Distribution
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Top 3 Features
                  </Typography>
                  <Typography variant="body2">
                    {(summaryFeatures.slice(0, 3).reduce((sum, f) => sum + f.importance, 0) * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Top 5 Features
                  </Typography>
                  <Typography variant="body2">
                    {(summaryFeatures.reduce((sum, f) => sum + f.importance, 0) * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    All Features
                  </Typography>
                  <Typography variant="body2">
                    {(data.features.reduce((sum, f) => sum + f.importance, 0) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Feature Insights */}
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Insights
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.features[0] && (
                <Box>
                  <Typography variant="body2" color="primary" fontWeight="medium">
                    Most Important Feature
                  </Typography>
                  <Typography variant="body2">
                    {data.features[0].name} contributes {(data.features[0].importance * 100).toFixed(1)}% 
                    to model predictions
                  </Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="body2" color="secondary" fontWeight="medium">
                  Feature Concentration
                </Typography>
                <Typography variant="body2">
                  {summaryFeatures.length > 0 && (
                    summaryFeatures.slice(0, 3).reduce((sum, f) => sum + f.importance, 0) > 0.5
                      ? 'High concentration in top 3 features'
                      : 'Well-distributed importance across features'
                  )}
                </Typography>
              </Box>

              {data.method === 'shap' && (
                <Box>
                  <Typography variant="body2" color="info.main" fontWeight="medium">
                    SHAP Analysis
                  </Typography>
                  <Typography variant="body2">
                    Feature importance calculated using SHAP values for better interpretability
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default FeatureImportanceChart;