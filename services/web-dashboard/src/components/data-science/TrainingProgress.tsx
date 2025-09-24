import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Button } from '../common/Button';
import { Progress } from '../common/Progress';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';
import { TrainingResults, TrainingMetrics } from '../../types/dataScience';
const dataScienceAPI = {
  getModelTypes: async () => {
    console.log('Mock getModelTypes called');
    return { data: [] };
  },
  validateConfiguration: async (config: any) => {
    console.log('Mock validateConfiguration called with config:', config);
    return { data: { isValid: true } };
  },
  trainModel: async (config: any) => {
    console.log('Mock trainModel called with config:', config);
    return { data: { jobId: 'mock-job-id' } };
  },
  getTrainingStatus: async (jobId: string) => {
    console.log(`Mock getTrainingStatus called for jobId: ${jobId}`);
    return { data: { status: 'completed', progress: 100, logs: [] } };
  },
  getTrainingProgress: async (jobId: string) => {
    console.log(`Mock getTrainingProgress called for jobId: ${jobId}`);
    return { data: { 
      status: 'completed' as 'queued' | 'training' | 'validating' | 'completed' | 'failed', 
      progress: 100, 
      logs: [], 
      currentMetrics: {
        loss: 0.05,
        accuracy: 0.95,
        timestamp: new Date()
      },
      error: ''
    } };
  },
  getTrainingResults: async (jobId: string) => {
    console.log(`Mock getTrainingResults called for jobId: ${jobId}`);
    return { data: { 
      id: 'mock-result-id',
      modelId: 'mock-model-id',
      configuration: {
        modelType: 'random_forest' as 'random_forest' | 'xgboost' | 'neural_network' | 'ensemble',
        hyperparameters: {},
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'holdout' as 'holdout' | 'k_fold' | 'stratified'
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      },
      metrics: {
        training: {
          accuracy: 0.95,
          precision: 0.92,
          recall: 0.94,
          f1Score: 0.93,
          rocAuc: 0.96,
          confusionMatrix: [[90, 10], [5, 95]],
          classificationReport: {
            'class1': { precision: 0.92, recall: 0.94, f1Score: 0.93 }
          }
        },
        validation: {
          folds: 5,
          scores: [0.94, 0.95, 0.93, 0.96, 0.94],
          meanScore: 0.944,
          stdScore: 0.01,
          metrics: []
        },
        test: {
          accuracy: 0.93,
          precision: 0.91,
          recall: 0.92,
          f1Score: 0.91,
          rocAuc: 0.94,
          confusionMatrix: [[88, 12], [8, 92]],
          classificationReport: {
            'class1': { precision: 0.91, recall: 0.92, f1Score: 0.91 }
          }
        }
      },
      trainingTime: 120,
      artifacts: {
        modelPath: '/models/mock-model-id.pkl',
        configPath: '/configs/mock-model-id.json',
        metricsPath: '/metrics/mock-model-id.json'
      },
      createdAt: new Date()
    } };
  },
};

interface TrainingProgressProps {
  jobId: string;
  onComplete: (results: TrainingResults) => void;
  onError: (error: string) => void;
}

interface TrainingStatus {
  status: 'queued' | 'training' | 'validating' | 'completed' | 'failed';
  progress: number;
  currentMetrics?: TrainingMetrics;
  logs: string[];
  error?: string;
}

export const TrainingProgress: React.FC<TrainingProgressProps> = ({
  jobId,
  onComplete,
  onError
}) => {
  const [status, setStatus] = useState<TrainingStatus>({
    status: 'queued',
    progress: 0,
    logs: [],
  });
  const [isPolling, setIsPolling] = useState(true);
  const [startTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const timeRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isPolling) {
      // Poll for progress updates
      intervalRef.current = setInterval(async () => {
        try {
          const response = await dataScienceAPI.getTrainingProgress(jobId);
          const newStatus = response.data;
          setStatus(newStatus);

          if (newStatus.status === 'completed') {
            setIsPolling(false);
            // Get final results
            const resultsResponse = await dataScienceAPI.getTrainingResults(jobId);
            onComplete(resultsResponse.data);
          } else if (newStatus.status === 'failed') {
            setIsPolling(false);
            onError(newStatus.error || 'Training failed');
          }
        } catch (error: any) {
          console.error('Failed to get training progress:', error);
          setIsPolling(false);
          onError(`Failed to get training progress: ${error.message}`);
        }
      }, 2000); // Poll every 2 seconds

      // Update elapsed time
      timeRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeRef.current) clearInterval(timeRef.current);
    };
  }, [isPolling, jobId, startTime, onComplete, onError]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-gray-100 text-gray-800';
      case 'training':
        return 'bg-blue-100 text-blue-800';
      case 'validating':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return '⏳';
      case 'training':
        return '🔄';
      case 'validating':
        return '✅';
      case 'completed':
        return '🎉';
      case 'failed':
        return '❌';
      default:
        return '📊';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Model Training in Progress</h1>
        <p className="text-gray-600">
          Training your machine learning model with the configured parameters
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <span className="text-2xl">{getStatusIcon(status.status)}</span>
              <span>Training Status</span>
            </CardTitle>
            <Badge className={getStatusColor(status.status)}>
              {status.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">{status.progress}%</span>
            </div>
            <Progress value={status.progress} className="w-full" />
          </div>

          {/* Time and Job Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-gray-600">Elapsed Time</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {status.logs.length}
              </div>
              <div className="text-sm text-blue-600">Log Entries</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600 truncate">
                {jobId.split('_')[1] || 'N/A'}
              </div>
              <div className="text-sm text-purple-600">Job ID</div>
            </div>
          </div>

          {/* Current Metrics */}
          {status.currentMetrics && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-medium text-green-800 mb-3">Current Training Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {status.currentMetrics.epoch !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">
                      {status.currentMetrics.epoch}
                    </div>
                    <div className="text-xs text-green-600">Epoch</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700">
                    {status.currentMetrics.loss.toFixed(4)}
                  </div>
                  <div className="text-xs text-green-600">Loss</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700">
                    {(status.currentMetrics.accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-green-600">Accuracy</div>
                </div>
                {status.currentMetrics.validationAccuracy !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">
                      {(status.currentMetrics.validationAccuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-green-600">Val Accuracy</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {status.error && (
            <Alert variant="destructive">
              <h4 className="font-semibold mb-2">Training Error</h4>
              <p>{status.error}</p>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Training Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Training Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {status.logs.length > 0 ? (
              status.logs.map((log, index) => (
                <div key={index} className="mb-1">
                  <span className="text-gray-500">
                    [{new Date().toLocaleTimeString()}]
                  </span>{' '}
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">Waiting for training logs...</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Phases */}
      <Card>
        <CardHeader>
          <CardTitle>Training Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { phase: 'queued', label: 'Queued', description: 'Waiting for resources' },
              { phase: 'training', label: 'Training', description: 'Model learning from data' },
              { phase: 'validating', label: 'Validating', description: 'Evaluating model performance' },
              { phase: 'completed', label: 'Completed', description: 'Training finished successfully' }
            ].map((phase, index) => {
              const isActive = status.status === phase.phase;
              const isCompleted = ['queued', 'training', 'validating'].indexOf(status.status) > 
                                 ['queued', 'training', 'validating'].indexOf(phase.phase);
              
              return (
                <div key={phase.phase} className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {phase.label}
                    </div>
                    <div className="text-sm text-gray-500">{phase.description}</div>
                  </div>
                  {isActive && (
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Button */}
      {status.status !== 'completed' && status.status !== 'failed' && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setIsPolling(false);
              onError('Training cancelled by user');
            }}
          >
            Cancel Training
          </Button>
        </div>
      )}
    </div>
  );
};

export default TrainingProgress;