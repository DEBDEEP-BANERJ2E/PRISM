import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Button } from '../common/Button';
import { Progress } from '../common/Progress';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';
import { TrainingResults, TrainingMetrics } from '../../types/dataScience';
import { dataScienceAPI } from '../../api/dataScience/models';

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
  console.log('🎯 TrainingProgress component rendered with jobId:', jobId);

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
          console.log('🔄 Polling for progress with jobId:', jobId);
          const response = await dataScienceAPI.getTrainingProgress(jobId);
          console.log('📊 Progress response:', response);
          console.log('📏 Response type:', typeof response);

          // Defensive check for response
          if (!response) {
            console.error('❌ Response is null/undefined');
            return;
          }

          const newStatus = response.data || response;
          console.log('📦 New status:', newStatus);

          if (!newStatus) {
            console.error('❌ New status is null/undefined');
            return;
          }

          setStatus(newStatus);

          if (newStatus.status === 'completed') {
            console.log('✅ Training completed, fetching results...');
            setIsPolling(false);
            // Get final results
            const resultsResponse = await dataScienceAPI.getTrainingResults(jobId);
            console.log('🎉 Final results:', resultsResponse);
            onComplete(resultsResponse.data || resultsResponse);
          } else if (newStatus.status === 'failed') {
            console.log('❌ Training failed:', newStatus.error);
            setIsPolling(false);
            onError(newStatus.error || 'Training failed');
          }
        } catch (error: any) {
          console.error('❌ Failed to get training progress:', error);
          console.error('❌ Error details:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
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
                {status.currentMetrics.loss !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">
                      {status.currentMetrics.loss.toFixed(4)}
                    </div>
                    <div className="text-xs text-green-600">Loss</div>
                  </div>
                )}
                {status.currentMetrics.accuracy !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">
                      {(status.currentMetrics.accuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-green-600">Accuracy</div>
                  </div>
                )}
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