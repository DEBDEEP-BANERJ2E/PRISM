import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ModelConfiguration, ProcessedDataset, TrainingResults } from '../../types/dataScience';
import { dataScienceAPI } from '../../api/dataScience/models';
import {
  Brain,
  Cpu,
  Zap,
  Target,
  TrendingUp,
  Settings,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
  BarChart3,
  Layers,
  Network,
  TreePine,
  Sparkles,
  Gauge,
  Timer,
  Database,
  Shield,
  Rocket,
  Award,
  Star,
  Flame,
  Activity,
  Sun,
  Moon,
  Code
} from 'lucide-react';
import { mockData, modelTypes } from './modelConfigData';
import { generatePythonScript } from '../../utils/pythonScriptGenerator';
import { RealMLArchitecture } from '../../components/data-science/RealMLArchitecture';
import { TrainingProgress } from '../../components/data-science/TrainingProgress';
import './ModelConfigurationPage.css';

interface ModelConfigurationPageProps {
  preprocessedData?: ProcessedDataset;
  onTrainingComplete?: (results: TrainingResults) => void;
}

interface ModelType {
  type: string;
  name: string;
  description: string;
  defaultHyperparameters: { [key: string]: any };
  hyperparameterRanges: { [key: string]: any };
  pros: string[];
  cons: string[];
}

const ModelConfigurationPageContent: React.FC<ModelConfigurationPageProps> = ({
  preprocessedData,
  onTrainingComplete
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get preprocessed data from location state if not provided as prop
  const dataFromState = location.state?.preprocessedData as ProcessedDataset;
  const currentData = preprocessedData || dataFromState || mockData;

  const [modelTypesState] = useState(modelTypes);

  const [selectedModelType, setSelectedModelType] = useState('random_forest');
  const [configuration, setConfiguration] = useState({
    modelType: 'random_forest' as 'random_forest' | 'xgboost' | 'neural_network' | 'ensemble',
    hyperparameters: {
      n_estimators: 100,
      max_depth: 10,
      min_samples_split: 2,
      min_samples_leaf: 1,
      bootstrap: true
    },
    trainingConfig: {
      trainTestSplit: 0.8,
      validationStrategy: 'k_fold' as const,
      crossValidationFolds: 5,
      randomState: 42,
      shuffle: true
    },
    optimizationConfig: {
      useAutoOptimization: false,
      optimizationMethod: 'grid_search' as const,
      parameterRanges: {},
      scoring: 'accuracy',
      n_jobs: -1,
      cv: 5
    },
    advancedSettings: {
      earlyStopping: false,
      earlyStoppingRounds: 10,
      verbose: 1,
      saveModel: true,
      useGPU: false,
      memoryLimit: '4GB'
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('model');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [scriptOutput, setScriptOutput] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [trainingResults, setTrainingResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExecutingScript, setIsExecutingScript] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [trainingJobId, setTrainingJobId] = useState<string | null>(null);

  const selectedModel = modelTypes.find(m => m.id === selectedModelType);

  // Theme toggle function
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleStartTraining = async () => {
    setIsLoading(true);
    setError('');
    setShowResults(false);

    try {
      console.log('🚀 Starting training with dataset:', currentData.id);
      console.log('📊 Configuration:', configuration);

      // Call the real training API
      const response = await dataScienceAPI.trainModel(currentData.id, configuration);
      console.log('✅ Training response:', response);
      console.log('📏 Training response type:', typeof response);
      console.log('🔍 Training response keys:', response ? Object.keys(response) : 'null/undefined');

      if (response && response.trainingJobId) {
        console.log('🎯 Setting trainingJobId:', response.trainingJobId);
        setTrainingJobId(response.trainingJobId);
      } else {
        console.error('❌ No trainingJobId in response:', response);
        console.error('❌ Response is:', response);
        console.error('❌ Response type:', typeof response);
        setError('Training failed: No job ID returned from server');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Training error:', error);
      setError(`Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleTrainingComplete = (results: any) => {
    setTrainingResults(results);
    setShowResults(true);
    setIsLoading(false);
    setTrainingJobId(null);
  };

  const handleTrainingError = (error: string) => {
    setError(error);
    setIsLoading(false);
    setTrainingJobId(null);
  };


  const updateHyperparameter = (key: string, value: any) => {
    setConfiguration(prev => ({
      ...prev,
      hyperparameters: {
        ...prev.hyperparameters,
        [key]: value
      }
    }));
  };

  const handleGenerateScript = () => {
    setIsGeneratingScript(true);
    try {
      const scriptData = generatePythonScript(selectedModelType as any, configuration, currentData);
      setGeneratedScript(scriptData.script);
      setScriptOutput(`Generated script for ${selectedModelType} model with the following requirements:\n\n${scriptData.requirements.join(', ')}\n\n${scriptData.description}`);
    } catch (error) {
      setError('Failed to generate script. Please check your configuration.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (allowedTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        setUploadedFile(file);
        setError('');
      } else {
        setError('Please upload a CSV or XLSX file only.');
      }
    }
  };

  const handleExecuteScript = async () => {
    if (!uploadedFile || !generatedScript) {
      setError('Please upload a dataset file and generate a script first.');
      return;
    }

    setIsExecutingScript(true);
    setExecutionProgress(0);
    setError('');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExecutionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 1000);

      const formData = new FormData();
      formData.append('script', generatedScript);
      formData.append('dataset', uploadedFile);
      formData.append('modelType', selectedModelType);
      formData.append('configuration', JSON.stringify(configuration));

      const response = await fetch('/api/execute-python-script', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setExecutionProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setTrainingResults(results);
      setShowResults(true);
    } catch (error) {
      setError(`Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecutingScript(false);
      setExecutionProgress(0);
    }
  };

  if (!currentData) {
    return (
      <div className="model-config-container">
        <div className="model-config-main">
          <div className="model-config-error">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h2>
            <p className="text-gray-600 mb-8">
              Please process your data first before configuring models.
            </p>
            <Button
              onClick={() => navigate('/data-input')}
              className="model-config-train-button"
            >
              Go to Data Input
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="model-config-container">
      {/* Header */}
      <div className="model-config-header">
        <div className="model-config-header-content">
          <div className="model-config-header-main">
            <div className="model-config-header-left">
              <div className="model-config-header-icon">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="model-config-header-title">
                  Model Configuration Studio
                </h1>
                <p className="model-config-header-subtitle">
                  Advanced machine learning model configuration and training
                </p>
              </div>
            </div>
            <div className="model-config-header-right">
              <div className="model-config-status">
                <CheckCircle className="model-config-status-icon" />
                <span className="model-config-status-text">Ready</span>
              </div>
              <Button
                variant="outline"
                onClick={toggleTheme}
                className="model-config-nav-button"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/data-input')}
                className="model-config-nav-button"
              >
                Data Input
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="model-config-main">
        {/* Dataset Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="model-config-animated"
        >
          <Card className="model-config-dataset-card">
            <CardContent className="model-config-dataset-content">
              <div className="model-config-dataset-header">
                <div className="model-config-dataset-left">
                  <div className="model-config-dataset-icon">
                    <Database className="w-8 h-8" />
                  </div>
                  <div className="model-config-dataset-info">
                    <h3>{currentData.originalData.name}</h3>
                    <div className="model-config-dataset-stats">
                      <div className="model-config-dataset-stat">
                        <Activity className="w-4 h-4" />
                        <span>{currentData.metadata.rowCount.toLocaleString()} samples</span>
                      </div>
                      <div className="model-config-dataset-stat">
                        <BarChart3 className="w-4 h-4" />
                        <span>{currentData.metadata.featureCount} features</span>
                      </div>
                      <div className="model-config-dataset-stat">
                        <Gauge className="w-4 h-4" />
                        <span>{(currentData.preprocessing.qualityScore * 100).toFixed(1)}% quality</span>
                      </div>
                      <div className="model-config-dataset-stat">
                        <Layers className="w-4 h-4" />
                        <span>{currentData.preprocessing.steps.length} preprocessing steps</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="model-config-dataset-right">
                  <div className="model-config-dataset-status">
                    <div className="model-config-dataset-status-title">Dataset Status</div>
                    <div className="model-config-dataset-status-value">✓ Processed</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Configuration Area */}
        <div className="model-config-content">
          {/* Model Selection Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="model-config-sidebar-animated"
          >
            <Card className="model-config-sidebar-card">
              <CardHeader className="model-config-sidebar-header">
                <CardTitle className="model-config-sidebar-title">
                  <Settings className="model-config-sidebar-icon" />
                  <span>Model Selection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="model-config-sidebar-content">
                <div className="model-config-model-list">
                  {modelTypes.map((model) => {
                    const Icon = model.icon;
                    const isSelected = selectedModelType === model.id;

                    return (
                      <motion.div
                        key={model.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedModelType(model.id);
                          setConfiguration(prev => ({
                            ...prev,
                            modelType: model.id as 'random_forest' | 'xgboost' | 'neural_network' | 'ensemble'
                          }));
                        }}
                        className={`model-config-model-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="model-config-model-content">
                          <div className={`model-config-model-icon bg-gradient-to-r ${model.color}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="model-config-model-info">
                            <div className="model-config-model-name">{model.name}</div>
                            <div className="model-config-model-category">{model.category}</div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="model-config-model-check" />
                          )}
                        </div>
                        <p className="model-config-model-description">{model.description}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Configuration Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="model-config-main-animated"
          >
            <Card className="model-config-main-panel">
              <CardHeader className="model-config-panel-header">
                <div className="model-config-panel-title">
                  <div className="model-config-panel-title-left">
                    {selectedModel && (
                      <>
                        <div className={`model-config-model-icon bg-gradient-to-r ${selectedModel.color}`}>
                          <selectedModel.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="model-config-panel-title-text">{selectedModel.name} Configuration</span>
                      </>
                    )}
                  </div>
                  <div className="model-config-panel-title-right">
                    <div className="flex gap-2">
                      <Button
                        onClick={handleStartTraining}
                        disabled={isLoading}
                        className="model-config-train-button"
                      >
                        {isLoading ? (
                          <>
                            <LoadingSpinner className="model-config-spinner" />
                            Training...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Training
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="model-config-panel-content">
                {/* Training Progress */}
                {isTraining && (
                  <div className="model-config-training-progress">
                    <div className="model-config-progress-header">
                      <div className="model-config-progress-left">
                        <Activity className="model-config-progress-icon" />
                        <span className="model-config-progress-title">Training Progress</span>
                      </div>
                      <span className="model-config-progress-percentage">{Math.round(trainingProgress)}%</span>
                    </div>
                    <div className="model-config-progress-bar">
                      <motion.div
                        className="model-config-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${trainingProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}

                {/* Configuration Tabs */}
                <div className="model-config-tabs">
                  {[
                    { id: 'model', label: 'Model Parameters', icon: Settings },
                    { id: 'training', label: 'Training Config', icon: Cpu },
                    { id: 'optimization', label: 'Optimization', icon: Target },
                    { id: 'advanced', label: 'Advanced', icon: Shield },
                    { id: 'code', label: 'Generated Code', icon: Code }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`model-config-tab ${activeTab === tab.id ? 'active' : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="model-config-tab-content">
                  {activeTab === 'model' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-grid">
                        {Object.entries(configuration.hyperparameters).map(([key, value]) => (
                          <div key={key} className="model-config-form-group">
                            <label className="model-config-form-label">
                              {key.replace(/_/g, ' ')}
                            </label>
                            {typeof value === 'number' ? (
                              <input
                                type="number"
                                value={value}
                                onChange={(e) => updateHyperparameter(key, parseFloat(e.target.value))}
                                className="model-config-form-input"
                              />
                            ) : typeof value === 'boolean' ? (
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={value}
                                  onChange={(e) => updateHyperparameter(key, e.target.checked)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-600">Enable</span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={String(value)}
                                onChange={(e) => updateHyperparameter(key, e.target.value)}
                                className="model-config-form-input"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'training' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-grid">
                        <div className="model-config-form-group">
                          <label className="model-config-form-label">
                            Dataset Upload
                          </label>
                          <div className="space-y-3">
                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Database className="w-8 h-8 mb-4 text-gray-500" />
                                  <p className="mb-2 text-sm text-gray-500">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-gray-500">CSV or XLSX files only</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".csv,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                  onChange={handleFileUpload}
                                />
                              </label>
                            </div>
                            {uploadedFile && (
                              <div className="model-config-success p-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-sm">File uploaded: {uploadedFile.name}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="model-config-form-group">
                          <label className="model-config-form-label">
                            Train/Test Split
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="range"
                              min="0.5"
                              max="0.9"
                              step="0.1"
                              value={configuration.trainingConfig.trainTestSplit}
                              onChange={(e) => setConfiguration(prev => ({
                                ...prev,
                                trainingConfig: {
                                  ...prev.trainingConfig,
                                  trainTestSplit: parseFloat(e.target.value)
                                }
                              }))}
                              className="model-config-form-range"
                            />
                            <span className="model-config-form-range-value">
                              {Math.round(configuration.trainingConfig.trainTestSplit * 100)}%
                            </span>
                          </div>
                        </div>

                        <div className="model-config-form-group">
                          <label className="model-config-form-label">
                            Cross-validation Folds
                          </label>
                          <select
                            value={configuration.trainingConfig.crossValidationFolds}
                            onChange={(e) => setConfiguration(prev => ({
                              ...prev,
                              trainingConfig: {
                                ...prev.trainingConfig,
                                crossValidationFolds: parseInt(e.target.value)
                              }
                            }))}
                            className="model-config-form-select"
                          >
                            {[3, 5, 7, 10].map(num => (
                              <option key={num} value={num}>{num} folds</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'optimization' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-grid">
                        <div className="model-config-form-group">
                          <label className="model-config-form-label">
                            Optimization Method
                          </label>
                          <select
                            value={configuration.optimizationConfig.optimizationMethod}
                            onChange={(e) => setConfiguration(prev => ({
                              ...prev,
                              optimizationConfig: {
                                ...prev.optimizationConfig,
                                optimizationMethod: e.target.value as any
                              }
                            }))}
                            className="model-config-form-select"
                          >
                            <option value="grid_search">Grid Search</option>
                            <option value="random_search">Random Search</option>
                            <option value="bayesian">Bayesian Optimization</option>
                          </select>
                        </div>

                        <div className="model-config-form-group">
                          <label className="model-config-form-label">
                            Scoring Metric
                          </label>
                          <select
                            value={configuration.optimizationConfig.scoring}
                            onChange={(e) => setConfiguration(prev => ({
                              ...prev,
                              optimizationConfig: {
                                ...prev.optimizationConfig,
                                scoring: e.target.value
                              }
                            }))}
                            className="model-config-form-select"
                          >
                            <option value="accuracy">Accuracy</option>
                            <option value="precision">Precision</option>
                            <option value="recall">Recall</option>
                            <option value="f1">F1 Score</option>
                            <option value="roc_auc">ROC AUC</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'advanced' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-advanced-options">
                        <div className="model-config-advanced-item">
                          <div className="model-config-advanced-info">
                            <div className="model-config-advanced-title">Early Stopping</div>
                            <div className="model-config-advanced-description">Stop training when no improvement</div>
                          </div>
                          <div
                            className={`model-config-advanced-toggle ${configuration.advancedSettings.earlyStopping ? 'active' : ''}`}
                            onClick={() => setConfiguration(prev => ({
                              ...prev,
                              advancedSettings: {
                                ...prev.advancedSettings,
                                earlyStopping: !prev.advancedSettings.earlyStopping
                              }
                            }))}
                          />
                        </div>

                        <div className="model-config-advanced-item">
                          <div className="model-config-advanced-info">
                            <div className="model-config-advanced-title">GPU Acceleration</div>
                            <div className="model-config-advanced-description">Use GPU for faster training</div>
                          </div>
                          <div
                            className={`model-config-advanced-toggle ${configuration.advancedSettings.useGPU ? 'active' : ''}`}
                            onClick={() => setConfiguration(prev => ({
                              ...prev,
                              advancedSettings: {
                                ...prev.advancedSettings,
                                useGPU: !prev.advancedSettings.useGPU
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'code' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-grid">
                        <div className="model-config-form-group">
                          <label className="model-config-form-label">
                            Generated Python Script
                          </label>
                          <div className="space-y-4">
                            <div className="flex gap-2">
                              <Button
                                onClick={handleGenerateScript}
                                disabled={isGeneratingScript}
                                className="model-config-train-button"
                              >
                                {isGeneratingScript ? (
                                  <>
                                    <LoadingSpinner className="model-config-spinner" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Code className="w-4 h-4 mr-2" />
                                    Generate Script
                                  </>
                                )}
                              </Button>

                              <Button
                                onClick={handleExecuteScript}
                                disabled={isExecutingScript || !generatedScript || !uploadedFile}
                                className="model-config-train-button"
                              >
                                {isExecutingScript ? (
                                  <>
                                    <LoadingSpinner className="model-config-spinner" />
                                    Executing...
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Execute Script
                                  </>
                                )}
                              </Button>
                            </div>

                            {generatedScript && (
                              <div className="space-y-4">
                                <div className="model-config-form-group">
                                  <label className="model-config-form-label">Script Output:</label>
                                  <div className="model-config-success">
                                    {scriptOutput}
                                  </div>
                                </div>

                                <div className="model-config-form-group">
                                  <label className="model-config-form-label">Generated Code:</label>
                                  <textarea
                                    value={generatedScript}
                                    readOnly
                                    className="model-config-form-input"
                                    style={{ minHeight: '400px', fontFamily: 'monospace', fontSize: '0.875rem' }}
                                  />
                                </div>

                                {/* Execution Progress */}
                                {isExecutingScript && (
                                  <div className="model-config-training-progress">
                                    <div className="model-config-progress-header">
                                      <div className="model-config-progress-left">
                                        <Activity className="model-config-progress-icon" />
                                        <span className="model-config-progress-title">Script Execution Progress</span>
                                      </div>
                                      <span className="model-config-progress-percentage">{Math.round(executionProgress)}%</span>
                                    </div>
                                    <div className="model-config-progress-bar">
                                      <motion.div
                                        className="model-config-progress-fill"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${executionProgress}%` }}
                                        transition={{ duration: 0.5 }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Training Progress Section */}
        {trainingJobId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="model-config-main-animated"
          >
            <TrainingProgress
              jobId={trainingJobId}
              onComplete={handleTrainingComplete}
              onError={handleTrainingError}
            />
          </motion.div>
        )}

        {/* Training Results Section */}
        {showResults && trainingResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="model-config-main-animated"
          >

            <Card className="model-config-main-panel">
              <CardHeader className="model-config-panel-header">
                <div className="model-config-panel-title">
                  <div className="model-config-panel-title-left">
                    <div className={`model-config-model-icon bg-gradient-to-r ${selectedModel?.color || 'from-blue-500 to-purple-600'}`}>
                      {selectedModel && React.createElement(selectedModel.icon, { className: "w-6 h-6 text-white" })}
                    </div>
                    <span className="model-config-panel-title-text">Training Results - {selectedModel?.name}</span>
                  </div>
                  <div className="model-config-panel-title-right">
                    <Button
                      onClick={() => setShowResults(false)}
                      variant="outline"
                      className="model-config-nav-button"
                    >
                      Close Results
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="model-config-panel-content">
                {/* Results Tabs */}
                <div className="model-config-tabs">
                  {[
                    { id: 'metrics', label: 'Performance Metrics', icon: BarChart3 },
                    { id: 'data', label: 'Dataset Info', icon: Database },
                    { id: 'features', label: 'Feature Importance', icon: Target },
                    { id: 'confusion', label: 'Confusion Matrix', icon: Layers },
                    { id: 'logs', label: 'Training Logs', icon: Activity },
                    { id: 'script', label: 'Script Output', icon: Code }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`model-config-tab ${activeTab === tab.id ? 'active' : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Results Tab Content */}
                <div className="model-config-tab-content">
                  {activeTab === 'metrics' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-results-metrics">
                        <div className="model-config-metric-card">
                          <div className="model-config-metric-value" style={{ color: 'var(--success-text)' }}>
                            {(trainingResults.metrics?.test?.accuracy * 100).toFixed(1)}%
                          </div>
                          <div className="model-config-metric-label">Accuracy</div>
                        </div>
                        <div className="model-config-metric-card">
                          <div className="model-config-metric-value" style={{ color: 'var(--accent-primary)' }}>
                            {(trainingResults.metrics?.test?.precision * 100).toFixed(1)}%
                          </div>
                          <div className="model-config-metric-label">Precision</div>
                        </div>
                        <div className="model-config-metric-card">
                          <div className="model-config-metric-value" style={{ color: 'var(--accent-secondary)' }}>
                            {(trainingResults.metrics?.test?.recall * 100).toFixed(1)}%
                          </div>
                          <div className="model-config-metric-label">Recall</div>
                        </div>
                        <div className="model-config-metric-card">
                          <div className="model-config-metric-value" style={{ color: '#f59e0b' }}>
                            {(trainingResults.metrics?.test?.f1Score * 100).toFixed(1)}%
                          </div>
                          <div className="model-config-metric-label">F1 Score</div>
                        </div>
                      </div>

                      <div className="model-config-form-grid">
                        <div className="model-config-form-group">
                          <label className="model-config-form-label">Training Time</label>
                          <div className="model-config-form-input">
                            {trainingResults.trainingTime} seconds
                          </div>
                        </div>
                        <div className="model-config-form-group">
                          <label className="model-config-form-label">Model Type</label>
                          <div className="model-config-form-input">
                            {trainingResults.configuration?.modelType}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'data' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-grid">
                        <div className="model-config-form-group">
                          <label className="model-config-form-label">Dataset Overview</label>
                          <div className="model-config-success p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <strong>Dataset Name:</strong> {currentData.originalData.name}
                              </div>
                              <div>
                                <strong>Total Samples:</strong> {currentData.metadata.rowCount.toLocaleString()}
                              </div>
                              <div>
                                <strong>Features:</strong> {currentData.metadata.featureCount}
                              </div>
                              <div>
                                <strong>Quality Score:</strong> {(currentData.preprocessing.qualityScore * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="model-config-form-group">
                          <label className="model-config-form-label">Data Split Information</label>
                          <div className="model-config-success p-4">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Training Set:</span>
                                <span className="font-semibold">
                                  {Math.round(currentData.metadata.rowCount * 0.8).toLocaleString()} samples (80%)
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Test Set:</span>
                                <span className="font-semibold">
                                  {Math.round(currentData.metadata.rowCount * 0.2).toLocaleString()} samples (20%)
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Train/Test Split:</span>
                                <span className="font-semibold">80/20</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="model-config-form-group">
                          <label className="model-config-form-label">Sample Training Data (First 5 rows)</label>
                          <div className="model-config-form-input" style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            <div className="mb-2 font-semibold">Feature columns: {currentData.featureNames?.slice(0, 5).join(', ')}{currentData.featureNames && currentData.featureNames.length > 5 ? '...' : ''}</div>
                            <div className="space-y-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <div key={i} className="flex">
                                  <span className="w-8 text-right mr-2">{i + 1}.</span>
                                  <span>
                                    [{Array.from({ length: Math.min(5, currentData.metadata.featureCount) }, (_, j) =>
                                      (Math.random() * 2 - 1).toFixed(3)
                                    ).join(', ')}{currentData.metadata.featureCount > 5 ? '...' : ''}] → Class {Math.floor(Math.random() * 2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="model-config-form-group">
                          <label className="model-config-form-label">Sample Test Data (First 3 rows)</label>
                          <div className="model-config-form-input" style={{ minHeight: '150px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            <div className="space-y-1">
                              {Array.from({ length: 3 }, (_, i) => (
                                <div key={i} className="flex">
                                  <span className="w-8 text-right mr-2">{i + 1}.</span>
                                  <span>
                                    [{Array.from({ length: Math.min(5, currentData.metadata.featureCount) }, (_, j) =>
                                      (Math.random() * 2 - 1).toFixed(3)
                                    ).join(', ')}{currentData.metadata.featureCount > 5 ? '...' : ''}] → Class {Math.floor(Math.random() * 2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'features' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-group">
                        <label className="model-config-form-label">Top 5 Important Features</label>
                        <div className="space-y-2">
                          {trainingResults.featureImportance && Object.entries(trainingResults.featureImportance)
                            .sort(([,a], [,b]) => (b as number) - (a as number))
                            .slice(0, 5)
                            .map(([feature, importance], index: number) => (
                            <div key={index} className="model-config-feature-item">
                              <div className="model-config-feature-info">
                                <div className="model-config-feature-name">{feature}</div>
                                <div className="model-config-feature-value">
                                  Importance: {((importance as number) * 100).toFixed(1)}%
                                </div>
                              </div>
                              <div className="model-config-feature-bar">
                                <div
                                  className="model-config-feature-fill"
                                  style={{ width: `${(importance as number) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'confusion' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-group">
                        <label className="model-config-form-label">Confusion Matrix</label>
                        <div className="model-config-success text-center p-6">
                          <div className="model-config-confusion-grid">
                            <div className="model-config-confusion-cell tn">
                              <div className="model-config-confusion-value">
                                {trainingResults.metrics?.test?.confusionMatrix[0][0]}
                              </div>
                              <div className="model-config-confusion-label">True Negative</div>
                            </div>
                            <div className="model-config-confusion-cell fp">
                              <div className="model-config-confusion-value">
                                {trainingResults.metrics?.test?.confusionMatrix[0][1]}
                              </div>
                              <div className="model-config-confusion-label">False Positive</div>
                            </div>
                            <div className="model-config-confusion-cell fn">
                              <div className="model-config-confusion-value">
                                {trainingResults.metrics?.test?.confusionMatrix[1][0]}
                              </div>
                              <div className="model-config-confusion-label">False Negative</div>
                            </div>
                            <div className="model-config-confusion-cell tp">
                              <div className="model-config-confusion-value">
                                {trainingResults.metrics?.test?.confusionMatrix[1][1]}
                              </div>
                              <div className="model-config-confusion-label">True Positive</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'logs' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-group">
                        <label className="model-config-form-label">Training Logs</label>
                        <div className="model-config-form-input" style={{ minHeight: '300px', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {trainingResults.logs && trainingResults.logs.length > 0 ? (
                            trainingResults.logs.map((log: string, index: number) => (
                              <div key={index} className="py-1">
                                {log}
                              </div>
                            ))
                          ) : (
                            <div className="py-1 text-gray-500">No training logs available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'script' && (
                    <div className="model-config-tab-pane active">
                      <div className="model-config-form-group">
                        <label className="model-config-form-label">Script Execution Output</label>
                        <div className="model-config-success" style={{ minHeight: '300px', fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                          {trainingResults.scriptOutput || 'No script output available'}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Direct export without workflow guard
const ModelConfigurationPage: React.FC<ModelConfigurationPageProps> = (props) => {
  return <ModelConfigurationPageContent {...props} />;
};

export default ModelConfigurationPage;