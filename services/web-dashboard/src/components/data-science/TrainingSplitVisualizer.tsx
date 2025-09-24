import React from 'react';
import { Slider } from '../common/Slider';

interface TrainingSplitVisualizerProps {
  totalSamples: number;
  trainTestSplit: number;
  onSplitChange: (split: number) => void;
}

export const TrainingSplitVisualizer: React.FC<TrainingSplitVisualizerProps> = ({
  totalSamples,
  trainTestSplit,
  onSplitChange
}) => {
  const trainingSamples = Math.floor(totalSamples * trainTestSplit);
  const testSamples = totalSamples - trainingSamples;
  const trainingPercentage = Math.round(trainTestSplit * 100);
  const testPercentage = 100 - trainingPercentage;

  return (
    <div className="space-y-6">
      {/* Split Ratio Slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">
            Training / Test Split Ratio
          </label>
          <span className="text-sm text-gray-500">
            {trainingPercentage}% / {testPercentage}%
          </span>
        </div>
        <Slider
          value={[trainTestSplit]}
          onValueChange={(value) => onSplitChange(value[0])}
          min={0.1}
          max={0.9}
          step={0.05}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>10% Training</span>
          <span>50% Training</span>
          <span>90% Training</span>
        </div>
      </div>

      {/* Visual Representation */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Data Split Visualization</h4>
        
        {/* Pie Chart Style Visualization */}
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Training Data Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="20"
                strokeDasharray={`${trainTestSplit * 251.2} 251.2`}
                className="transition-all duration-300"
              />
              {/* Test Data Arc */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#EF4444"
                strokeWidth="20"
                strokeDasharray={`${(1 - trainTestSplit) * 251.2} 251.2`}
                strokeDashoffset={`-${trainTestSplit * 251.2}`}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {totalSamples.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Total Samples</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend and Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-blue-900">Training Set</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {trainingSamples.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">
              {trainingPercentage}% of total data
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-red-900">Test Set</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {testSamples.toLocaleString()}
            </div>
            <div className="text-sm text-red-600">
              {testPercentage}% of total data
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h5>
          <div className="text-sm text-gray-600 space-y-1">
            {trainTestSplit < 0.6 && (
              <div className="flex items-center text-orange-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Small training set may lead to underfitting
              </div>
            )}
            {trainTestSplit > 0.85 && (
              <div className="flex items-center text-orange-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Small test set may not provide reliable evaluation
              </div>
            )}
            {trainTestSplit >= 0.7 && trainTestSplit <= 0.8 && (
              <div className="flex items-center text-green-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Good balance for most machine learning tasks
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingSplitVisualizer;