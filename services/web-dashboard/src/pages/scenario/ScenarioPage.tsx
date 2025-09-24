import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { gsap } from 'gsap';
import { CircularProgress } from '@mui/material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Container,
  useTheme,
  alpha,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Slider,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Timeline,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Save,
  Share,
  Download,
  Warning,
  CheckCircle,
  Error,
  Info,
  TrendingUp,
  TrendingDown,
  Assessment,
  Engineering,
  Science,
  Terrain,
  WaterDrop,
  Air,
  Thermostat
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar
} from 'recharts';

// --- Data Science Scenario Page Content Integration ---
import WorkflowGuard from '../../components/workflow/WorkflowGuard';
import { Scenario as ScenarioDS } from '../../types/dataScience';
import { Scenario, sampleScenarios } from './scenarioData';

interface ScenarioPageWrapperProps {
  trainedModels?: any[];
  analyticsData?: any;
}

const ScenarioPageContentCombined: React.FC<ScenarioPageWrapperProps> = (props) => {
  // Scenario page content - using the existing scenario interface
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Load scenarios on component mount
  useEffect(() => {
    setScenarios(sampleScenarios);
  }, []);

  const handleRunScenario = async (scenario: Scenario) => {
    setIsRunning(true);
    setSelectedScenario(scenario);

    // Simulate scenario execution
    setTimeout(() => {
      const mockResults = {
        riskLevel: Math.random() * 100,
        timeToFailure: Math.random() * 24,
        affectedArea: Math.random() * 1000,
        confidence: Math.random() * 100
      };
      setResults(mockResults);
      setIsRunning(false);
      setSelectedScenario({ ...scenario, status: 'completed' });
    }, 3000);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Scenario Planning
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Scenarios
              </Typography>
              <List>
                {scenarios.map((scenario) => (
                  <ListItem
                    key={scenario.id}
                    button
                    onClick={() => setSelectedScenario(scenario)}
                    selected={selectedScenario?.id === scenario.id}
                  >
                    <ListItemText
                      primary={scenario.name}
                      secondary={scenario.description}
                    />
                    <Chip
                      label={scenario.status}
                      color={scenario.status === 'completed' ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedScenario && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedScenario.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedScenario.description}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                  Parameters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Rainfall (mm)"
                      type="number"
                      value={selectedScenario.parameters.rainfall}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Temperature (°C)"
                      type="number"
                      value={selectedScenario.parameters.temperature}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Blast Intensity"
                      type="number"
                      value={selectedScenario.parameters.blastIntensity}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Groundwater Level"
                      type="number"
                      value={selectedScenario.parameters.groundwaterLevel}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrow />}
                    onClick={() => handleRunScenario(selectedScenario)}
                    disabled={isRunning}
                  >
                    {isRunning ? 'Running...' : 'Run Scenario'}
                  </Button>
                </Box>

                {results && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Results
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Risk Level"
                          value={`${results.riskLevel.toFixed(1)}%`}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Time to Failure (hours)"
                          value={results.timeToFailure.toFixed(1)}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Affected Area (m²)"
                          value={results.affectedArea.toFixed(0)}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Confidence"
                          value={`${results.confidence.toFixed(1)}%`}
                          InputProps={{ readOnly: true }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

const ScenarioPage: React.FC<ScenarioPageWrapperProps> = (props) => {
  return <ScenarioPageContentCombined {...props} />;
};

export default ScenarioPage;

// removed export of undefined UI component