import React from 'react';
import { RadioGroup, RadioGroupItem } from '../common/RadioGroup';
import { Label } from '../common/Label';
import { Slider } from '../common/Slider';

interface ValidationSettingsProps {
  validationStrategy: 'holdout' | 'k_fold' | 'stratified';
  crossValidationFolds?: number;
  onStrategyChange: (strategy: 'holdout' | 'k_fold' | 'stratified') => void;
  onFoldsChange: (folds: number) => void;
}

export const ValidationSettings: React.FC<ValidationSettingsProps> = ({
  validationStrategy,
  crossValidationFolds = 5,
  onStrategyChange,
  onFoldsChange
}) => {
  const validationStrategies = [
    {
      value: 'holdout',
      label: 'Holdout Validation',
      description: 'Simple train/test split. Fast but less robust.',
      icon: '📊',
      pros: ['Fast training', 'Simple to understand'],
      cons: ['Less reliable', 'Sensitive to data split']
    },
    {
      value: 'k_fold',
      label: 'K-Fold Cross Validation',
      description: 'Data split into K folds, trained K times. More robust.',
      icon: '🔄',
      pros: ['More reliable metrics', 'Uses all data for training'],
      cons: ['Longer training time', 'K times more computation']
    },
    {
      value: 'stratified',
      label: 'Stratified Validation',
      description: 'Maintains class distribution across folds. Best for imbalanced data.',
      icon: '⚖️',
      pros: ['Handles class imbalance', 'Consistent class distribution'],
      cons: ['Slightly more complex', 'Requires labeled data']
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          Choose Validation Strategy
        </h4>
        
        <RadioGroup
          value={validationStrategy}
          onValueChange={(value) => onStrategyChange(value as any)}
          className="space-y-4"
        >
          {validationStrategies.map((strategy) => (
            <div key={strategy.value} className="space-y-2">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value={strategy.value} id={strategy.value} />
                <Label htmlFor={strategy.value} className="flex items-center space-x-2 cursor-pointer">
                  <span className="text-lg">{strategy.icon}</span>
                  <span className="font-medium">{strategy.label}</span>
                </Label>
              </div>
              
              {validationStrategy === strategy.value && (
                <div className="ml-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 mb-3">
                    {strategy.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium text-green-700 mb-1">Advantages:</h5>
                      <ul className="text-xs text-green-600 space-y-1">
                        {strategy.pros.map((pro, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium text-orange-700 mb-1">Considerations:</h5>
                      <ul className="text-xs text-orange-600 space-y-1">
                        {strategy.cons.map((con, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-orange-500 rounded-full mr-2"></span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* K-Fold Configuration */}
      {(validationStrategy === 'k_fold' || validationStrategy === 'stratified') && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium text-gray-700">
                Number of Folds
              </Label>
              <span className="text-sm font-medium text-blue-600">
                {crossValidationFolds} folds
              </span>
            </div>
            
            <Slider
              value={[crossValidationFolds]}
              onValueChange={(value) => onFoldsChange(value[0])}
              min={2}
              max={10}
              step={1}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>2 folds</span>
              <span>5 folds (recommended)</span>
              <span>10 folds</span>
            </div>
          </div>

          {/* Fold Visualization */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">
              Cross-Validation Visualization
            </h5>
            
            <div className="space-y-2">
              {Array.from({ length: crossValidationFolds }, (_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 w-12">
                    Fold {i + 1}:
                  </span>
                  <div className="flex-1 flex">
                    {Array.from({ length: crossValidationFolds }, (_, j) => (
                      <div
                        key={j}
                        className={`flex-1 h-4 border-r border-white ${
                          j === i 
                            ? 'bg-red-400' // Test fold
                            : 'bg-blue-400' // Training folds
                        }`}
                        title={j === i ? 'Test Data' : 'Training Data'}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded mr-2"></div>
                <span className="text-gray-600">Training Data</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded mr-2"></div>
                <span className="text-gray-600">Test Data</span>
              </div>
            </div>
          </div>

          {/* Training Time Estimate */}
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-yellow-800">
                <strong>Training Time:</strong> Approximately {crossValidationFolds}x longer than holdout validation
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h5 className="text-sm font-medium text-blue-800 mb-2">💡 Recommendations:</h5>
        <div className="text-sm text-blue-700 space-y-1">
          {validationStrategy === 'holdout' && (
            <p>Good for quick experiments and large datasets. Consider cross-validation for more reliable results.</p>
          )}
          {validationStrategy === 'k_fold' && (
            <p>Excellent choice for most scenarios. 5-fold is typically sufficient, 10-fold for smaller datasets.</p>
          )}
          {validationStrategy === 'stratified' && (
            <p>Perfect for classification with imbalanced classes. Ensures each fold has representative samples.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationSettings;