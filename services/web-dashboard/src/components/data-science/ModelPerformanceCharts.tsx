import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { ModelMetrics } from '../../types/dataScience';

interface ModelPerformanceChartsProps {
  metrics: ModelMetrics;
  trainingHistory?: {
    epochs: number[];
    trainingLoss: number[];
    validationLoss: number[];
    trainingAccuracy: number[];
    validationAccuracy: number[];
  };
}

const ModelPerformanceCharts: React.FC<ModelPerformanceChartsProps> = ({
  metrics,
  trainingHistory
}) => {
  const theme = useTheme();

  // Generate ROC curve data
  const generateROCData = () => {
    const points = [];
    for (let i = 0; i <= 100; i++) {
      const fpr = i / 100;
      const tpr = Math.min(1, fpr + (metrics.rocAuc - 0.5) * 2 * (1 - fpr));
      points.push({ fpr, tpr, baseline: fpr });
    }
    return points;
  };

  // Format confusion matrix for display
  const renderConfusionMatrix = () => {
    const matrix = metrics.confusionMatrix;
    const total = matrix.flat().reduce((sum, val) => sum + val, 0);
    
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, maxWidth: 200 }}>
        {matrix.flat().map((value, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 60,
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderRadius: 1,
              fontWeight: 'bold',
              opacity: 0.3 + (value / total) * 0.7
            }}
          >
            {value}
          </Box>
        ))}
      </Box>
    );
  };

  // Format training history data
  const formatTrainingHistory = () => {
    if (!trainingHistory) return [];
    
    return trainingHistory.epochs.map((epoch, index) => ({
      epoch,
      trainingLoss: trainingHistory.trainingLoss[index],
      validationLoss: trainingHistory.validationLoss[index],
      trainingAccuracy: trainingHistory.trainingAccuracy[index],
      validationAccuracy: trainingHistory.validationAccuracy[index]
    }));
  };

  return (
    <Grid container spacing={3}>
      {/* Metrics Summary */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Chip 
                label={`Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`}
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`Precision: ${(metrics.precision * 100).toFixed(1)}%`}
                color="secondary"
                variant="outlined"
              />
              <Chip 
                label={`Recall: ${(metrics.recall * 100).toFixed(1)}%`}
                color="success"
                variant="outlined"
              />
              <Chip 
                label={`F1 Score: ${(metrics.f1Score * 100).toFixed(1)}%`}
                color="warning"
                variant="outlined"
              />
              <Chip 
                label={`ROC AUC: ${metrics.rocAuc.toFixed(3)}`}
                color="info"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* ROC Curve */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ROC Curve
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generateROCData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="fpr" 
                    label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -10 }} 
                  />
                  <YAxis 
                    label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft' }} 
                  />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="tpr" 
                    stroke={theme.palette.primary.main} 
                    strokeWidth={2}
                    dot={false}
                    name="ROC Curve"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="baseline" 
                    stroke={theme.palette.grey[400]} 
                    strokeDasharray="5 5"
                    dot={false}
                    name="Random Classifier"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              AUC: {metrics.rocAuc.toFixed(3)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Confusion Matrix */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Confusion Matrix
            </Typography>
            <Box sx={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2
            }}>
              {renderConfusionMatrix()}
              <Box sx={{ display: 'flex', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                <Box>Predicted →</Box>
                <Box>↓ Actual</Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Training History */}
      {trainingHistory && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Training History
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatTrainingHistory()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" />
                    <YAxis yAxisId="loss" orientation="left" />
                    <YAxis yAxisId="accuracy" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="loss"
                      type="monotone" 
                      dataKey="trainingLoss" 
                      stroke={theme.palette.error.main} 
                      name="Training Loss"
                    />
                    <Line 
                      yAxisId="loss"
                      type="monotone" 
                      dataKey="validationLoss" 
                      stroke={theme.palette.warning.main} 
                      name="Validation Loss"
                    />
                    <Line 
                      yAxisId="accuracy"
                      type="monotone" 
                      dataKey="trainingAccuracy" 
                      stroke={theme.palette.primary.main} 
                      name="Training Accuracy"
                    />
                    <Line 
                      yAxisId="accuracy"
                      type="monotone" 
                      dataKey="validationAccuracy" 
                      stroke={theme.palette.secondary.main} 
                      name="Validation Accuracy"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Classification Report */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Classification Report
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, minWidth: 400 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Class</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Precision</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Recall</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>F1-Score</Typography>
                
                {Object.entries(metrics.classificationReport).map(([className, classMetrics]) => (
                  <React.Fragment key={className}>
                    <Typography variant="body2">{className}</Typography>
                    <Typography variant="body2">{classMetrics.precision.toFixed(3)}</Typography>
                    <Typography variant="body2">{classMetrics.recall.toFixed(3)}</Typography>
                    <Typography variant="body2">{classMetrics.f1Score.toFixed(3)}</Typography>
                  </React.Fragment>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ModelPerformanceCharts;