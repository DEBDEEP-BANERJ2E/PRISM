import React, { useState } from 'react';
import { Switch } from '../common/Switch';
import { Label } from '../common/Label';
import { Input } from '../common/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../common/Select';
import { Slider } from '../common/Slider';
import { Badge } from '../common/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../common/Tabs';

interface ModelType {
  type: string;
  name: string;
  description: string;
  defaultHyperparameters: { [key: string]: any };
  hyperparameterRanges: { [key: string]: any };
  pros: string[];
  cons: string[];
}

interface OptimizationConfig {
  useAutoOptimization: boolean;
  optimizationMethod?: 'grid_search' | 'random_search' | 'bayesian';
  parameterRanges?: { [key: string]: any[] };
}

interface HyperparameterTunerProps {
  modelType: string;
  modelTypeInfo?: ModelType;
  hyperparameters: { [key: string]: any };
  optimizationConfig: OptimizationConfig;
  onHyperparametersChange: (params: { [key: string]: any }) => void;
  onOptimizationConfigChange: (config: OptimizationConfig) => void;
}

export const HyperparameterTuner: React.FC<HyperparameterTunerProps> = ({
  modelType,
  modelTypeInfo,
  hyperparameters,
  optimizationConfig,
  onHyperparametersChange,
  onOptimizationConfigChange
}) => {
  const [activeTab, setActiveTab] = useState('manual');

  const handleParameterChange = (key: string, value: any) => {
    onHyperparametersChange({
      ...hyperparameters,
      [key]: value
    });
  };

  const handleOptimizationToggle = (enabled: boolean) => {
    onOptimizationConfigChange({
      ...optimizationConfig,
      useAutoOptimization: enabled
    });
    setActiveTab(enabled ? 'auto' : 'manual');
  };

  const renderParameterInput = (key: string, value: any, range?: any) => {
    // Handle different parameter types
    if (range?.options) {
      // Dropdown for categorical parameters
      return (
        <Select
          value={String(value)}
          onValueChange={(newValue) => handleParameterChange(key, newValue)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {range.options.map((option: any) => (
              <SelectItem key={option} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (typeof value === 'boolean') {
      // Switch for boolean parameters
      return (
        <Switch
          checked={value}
          onCheckedChange={(checked) => handleParameterChange(key, checked)}
        />
      );
    }

    if (typeof value === 'number' && range?.min !== undefined && range?.max !== undefined) {
      // Slider for numeric parameters with range
      return (
        <div className="space-y-2">
          <Slider
            value={[value]}
            onValueChange={(values) => handleParameterChange(key, values[0])}
            min={range.min}
            max={range.max}
            step={range.step || 1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{range.min}</span>
            <span className="font-medium">{value}</span>
            <span>{range.max}</span>
          </div>
        </div>
      );
    }

    if (Array.isArray(value)) {
      // Special handling for arrays (like neural network layers)
      return (
        <div className="space-y-2">
          <Input
            value={value.join(', ')}
            onChange={(e) => {
              const arrayValue = e.target.value
                .split(',')
                .map(v => parseInt(v.trim()))
                .filter(v => !isNaN(v));
              handleParameterChange(key, arrayValue);
            }}
            placeholder="e.g., 100, 50, 25"
          />
          <p className="text-xs text-gray-500">
            Comma-separated values for layer sizes
          </p>
        </div>
      );
    }

    // Default input for other types
    return (
      <Input
        type={typeof value === 'number' ? 'number' : 'text'}
        value={String(value)}
        onChange={(e) => {
          const newValue = typeof value === 'number' 
            ? parseFloat(e.target.value) || 0
            : e.target.value;
          handleParameterChange(key, newValue);
        }}
      />
    );
  };

  const getParameterDescription = (key: string, modelType: string) => {
    const descriptions: { [model: string]: { [param: string]: string } } = {
      random_forest: {
        n_estimators: 'Number of trees in the forest. More trees = better performance but slower training.',
        max_depth: 'Maximum depth of trees. Controls overfitting vs underfitting.',
        min_samples_split: 'Minimum samples required to split an internal node.',
        min_samples_leaf: 'Minimum samples required to be at a leaf node.',
        random_state: 'Random seed for reproducible results.'
      },
      xgboost: {
        n_estimators: 'Number of boosting rounds. More rounds = better performance but risk of overfitting.',
        learning_rate: 'Step size shrinkage. Lower values require more estimators.',
        max_depth: 'Maximum tree depth. Controls model complexity.',
        subsample: 'Fraction of samples used for training each tree.',
        colsample_bytree: 'Fraction of features used for training each tree.',
        random_state: 'Random seed for reproducible results.'
      },
      neural_network: {
        hidden_layers: 'Architecture of hidden layers. Each number represents layer size.',
        activation: 'Activation function for hidden layers.',
        learning_rate: 'Step size for gradient descent optimization.',
        batch_size: 'Number of samples per gradient update.',
        epochs: 'Number of training iterations over the entire dataset.',
        dropout: 'Fraction of neurons to randomly drop during training.',
        random_state: 'Random seed for reproducible results.'
      },
      ensemble: {
        models: 'List of base models to combine.',
        voting: 'Voting strategy: hard (majority) or soft (probability averaging).',
        weights: 'Relative weights for each model. Leave null for equal weights.'
      }
    };

    return descriptions[modelType]?.[key] || 'Parameter configuration option.';
  };

  if (!modelTypeInfo) {
    return (
      <div className="text-center py-8 text-gray-500">
        Select a model type to configure hyperparameters
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optimization Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Hyperparameter Optimization</h4>
          <p className="text-sm text-gray-600">
            Choose between manual tuning or automated optimization
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Label htmlFor="auto-optimization" className="text-sm">
            Auto Optimization
          </Label>
          <Switch
            id="auto-optimization"
            checked={optimizationConfig.useAutoOptimization}
            onCheckedChange={handleOptimizationToggle}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Tuning</TabsTrigger>
          <TabsTrigger value="auto">Auto Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(hyperparameters).map(([key, value]) => {
              const range = modelTypeInfo.hyperparameterRanges[key];
              
              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      {typeof value === 'object' ? 'Array' : typeof value}
                    </Badge>
                  </div>
                  
                  {renderParameterInput(key, value, range)}
                  
                  <p className="text-xs text-gray-500">
                    {getParameterDescription(key, modelType)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reset to Defaults */}
          <div className="flex justify-center">
            <button
              onClick={() => onHyperparametersChange(modelTypeInfo.defaultHyperparameters)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Reset to Default Values
            </button>
          </div>
        </TabsContent>

        <TabsContent value="auto" className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center mb-4">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <h4 className="text-lg font-semibold text-blue-900">
                Automated Hyperparameter Optimization
              </h4>
            </div>
            
            <p className="text-blue-800 mb-6">
              Let the system automatically find the best hyperparameters for your model using advanced optimization techniques.
            </p>

            {/* Optimization Method Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-blue-900 mb-2 block">
                  Optimization Method
                </Label>
                <Select
                  value={optimizationConfig.optimizationMethod || 'grid_search'}
                  onValueChange={(method) => 
                    onOptimizationConfigChange({
                      ...optimizationConfig,
                      optimizationMethod: method as any
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid_search">Grid Search</SelectItem>
                    <SelectItem value="random_search">Random Search</SelectItem>
                    <SelectItem value="bayesian">Bayesian Optimization</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Method Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-3 rounded border-2 ${
                  optimizationConfig.optimizationMethod === 'grid_search' 
                    ? 'border-blue-400 bg-blue-100' 
                    : 'border-gray-200 bg-white'
                }`}>
                  <h5 className="font-medium text-sm mb-1">Grid Search</h5>
                  <p className="text-xs text-gray-600">
                    Exhaustive search over parameter grid. Thorough but slow.
                  </p>
                </div>
                
                <div className={`p-3 rounded border-2 ${
                  optimizationConfig.optimizationMethod === 'random_search' 
                    ? 'border-blue-400 bg-blue-100' 
                    : 'border-gray-200 bg-white'
                }`}>
                  <h5 className="font-medium text-sm mb-1">Random Search</h5>
                  <p className="text-xs text-gray-600">
                    Random sampling of parameters. Faster and often effective.
                  </p>
                </div>
                
                <div className={`p-3 rounded border-2 ${
                  optimizationConfig.optimizationMethod === 'bayesian' 
                    ? 'border-blue-400 bg-blue-100' 
                    : 'border-gray-200 bg-white'
                }`}>
                  <h5 className="font-medium text-sm mb-1">Bayesian</h5>
                  <p className="text-xs text-gray-600">
                    Smart search using previous results. Most efficient.
                  </p>
                </div>
              </div>
            </div>

            {/* Parameter Ranges Preview */}
            <div className="mt-6">
              <h5 className="text-sm font-medium text-blue-900 mb-3">
                Parameters to Optimize:
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(modelTypeInfo.hyperparameterRanges).map(([key, range]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Estimated Time */}
            <div className="mt-6 p-3 bg-yellow-50 rounded border border-yellow-200">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-yellow-800">
                  <strong>Estimated Time:</strong> 2-10x longer than manual training depending on method
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HyperparameterTuner;