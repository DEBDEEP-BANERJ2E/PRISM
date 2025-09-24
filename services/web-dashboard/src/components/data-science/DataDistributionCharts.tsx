import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import { useTheme, alpha } from '@mui/material/styles';
import { DistributionData } from '../../types/dataScience';

interface DataDistributionChartsProps {
  data: DistributionData;
  maxFeatures?: number;
}

const DataDistributionCharts: React.FC<DataDistributionChartsProps> = ({
  data,
  maxFeatures = 6
}) => {
  const theme = useTheme();
  
  const numericalFeatures = Object.keys(data.numerical).slice(0, maxFeatures);
  const categoricalFeatures = Object.keys(data.categorical).slice(0, maxFeatures);

  // Format histogram data for charts
  const formatHistogramData = (histogram: any) => {
    return histogram.bins.map((bin: number, index: number) => ({
      bin: bin.toFixed(2),
      count: histogram.counts[index],
      binValue: bin
    }));
  };

  // Render correlation matrix as a heatmap-style grid
  const renderCorrelationMatrix = () => {
    const { matrix, features } = data.correlations;
    
    return (
      <Box sx={{ overflowX: 'auto' }}>
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: `120px repeat(${features.length}, 60px)`,
            gap: 1,
            minWidth: 400
          }}
        >
          {/* Header row */}
          <Box />
          {features.map(feature => (
            <Typography 
              key={feature} 
              variant="caption" 
              sx={{ 
                transform: 'rotate(-45deg)',
                transformOrigin: 'left bottom',
                fontSize: '0.7rem',
                height: 40,
                display: 'flex',
                alignItems: 'flex-end'
              }}
            >
              {feature}
            </Typography>
          ))}
          
          {/* Data rows */}
          {features.map((rowFeature, rowIndex) => (
            <React.Fragment key={rowFeature}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', pr: 1 }}>
                {rowFeature}
              </Typography>
              {features.map((colFeature, colIndex) => {
                const correlation = matrix[rowIndex][colIndex];
                const absCorr = Math.abs(correlation);
                const color = correlation > 0 ? theme.palette.primary.main : theme.palette.error.main;
                
                return (
                  <Box
                    key={`${rowIndex}-${colIndex}`}
                    sx={{
                      height: 40,
                      backgroundColor: alpha(color, absCorr * 0.8),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 0.5,
                      color: absCorr > 0.5 ? 'white' : 'text.primary'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                      {correlation.toFixed(2)}
                    </Typography>
                  </Box>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Grid container spacing={3}>
      {/* Numerical Feature Distributions */}
      {numericalFeatures.map((feature) => (
        <Grid item xs={12} md={6} lg={4} key={feature}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {feature} Distribution
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formatHistogramData(data.numerical[feature].histogram)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="bin" 
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Count']}
                      labelFormatter={(label) => `Bin: ${label}`}
                    />
                    <Bar dataKey="count" fill={theme.palette.secondary.main} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              
              {/* Statistics Summary */}
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip 
                  label={`μ: ${data.numerical[feature].statistics.mean.toFixed(2)}`}
                  size="small"
                  variant="outlined"
                />
                <Chip 
                  label={`σ: ${data.numerical[feature].statistics.std.toFixed(2)}`}
                  size="small"
                  variant="outlined"
                />
                <Chip 
                  label={`Skew: ${data.numerical[feature].statistics.skewness.toFixed(2)}`}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {/* Box Plot Info */}
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Min: {data.numerical[feature].boxplot.min} | 
                  Q1: {data.numerical[feature].boxplot.q1} | 
                  Median: {data.numerical[feature].boxplot.median} | 
                  Q3: {data.numerical[feature].boxplot.q3} | 
                  Max: {data.numerical[feature].boxplot.max}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Categorical Feature Distributions */}
      {categoricalFeatures.map((feature) => (
        <Grid item xs={12} md={6} lg={4} key={feature}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {feature} Categories
              </Typography>
              <Box sx={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={Object.entries(data.categorical[feature].counts).map(([category, count]) => ({
                      category,
                      count,
                      percentage: data.categorical[feature].percentages[category]
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="category" 
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'count' ? value : `${value.toFixed(1)}%`,
                        name === 'count' ? 'Count' : 'Percentage'
                      ]}
                    />
                    <Bar dataKey="count" fill={theme.palette.primary.main} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Correlation Matrix */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Feature Correlations
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Correlation matrix showing relationships between numerical features
              </Typography>
            </Box>
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderCorrelationMatrix()}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Strong Correlations Table */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Strong Correlations
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature 1</TableCell>
                    <TableCell>Feature 2</TableCell>
                    <TableCell align="right">Correlation</TableCell>
                    <TableCell>Strength</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.correlations.strongCorrelations.map((corr, index) => {
                    const absCorr = Math.abs(corr.correlation);
                    const strength = absCorr > 0.8 ? 'Very Strong' : 
                                   absCorr > 0.6 ? 'Strong' : 
                                   absCorr > 0.4 ? 'Moderate' : 'Weak';
                    const color = absCorr > 0.7 ? 'error' : 
                                 absCorr > 0.5 ? 'warning' : 'primary';
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{corr.feature1}</TableCell>
                        <TableCell>{corr.feature2}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={corr.correlation.toFixed(3)}
                            size="small"
                            color={color}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={strength}
                            size="small"
                            color={color}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default DataDistributionCharts;