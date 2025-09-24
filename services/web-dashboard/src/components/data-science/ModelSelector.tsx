import React from 'react';
import { Card, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';

interface ModelType {
  type: string;
  name: string;
  description: string;
  defaultHyperparameters: { [key: string]: any };
  hyperparameterRanges: { [key: string]: any };
  pros: string[];
  cons: string[];
}

interface ModelSelectorProps {
  modelTypes: ModelType[];
  selectedType: string;
  onSelect: (type: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  modelTypes,
  selectedType,
  onSelect
}) => {
  const getModelIcon = (type: string) => {
    switch (type) {
      case 'random_forest':
        return '🌳';
      case 'xgboost':
        return '🚀';
      case 'neural_network':
        return '🧠';
      case 'ensemble':
        return '🎯';
      default:
        return '📊';
    }
  };

  const getComplexityLevel = (type: string) => {
    switch (type) {
      case 'random_forest':
        return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
      case 'xgboost':
        return { level: 'High', color: 'bg-orange-100 text-orange-800' };
      case 'neural_network':
        return { level: 'Very High', color: 'bg-red-100 text-red-800' };
      case 'ensemble':
        return { level: 'High', color: 'bg-purple-100 text-purple-800' };
      default:
        return { level: 'Medium', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {modelTypes.map((model) => {
        const isSelected = selectedType === model.type;
        const complexity = getComplexityLevel(model.type);
        
        return (
          <Card
            key={model.type}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              isSelected 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(model.type)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getModelIcon(model.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {model.name}
                    </h3>
                    <Badge className={complexity.color}>
                      {complexity.level} Complexity
                    </Badge>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              <p className="text-gray-600 text-sm mb-4">
                {model.description}
              </p>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-1">Advantages:</h4>
                  <ul className="text-xs text-green-600 space-y-1">
                    {model.pros.slice(0, 2).map((pro, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-orange-700 mb-1">Considerations:</h4>
                  <ul className="text-xs text-orange-600 space-y-1">
                    {model.cons.slice(0, 2).map((con, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-orange-500 rounded-full mr-2"></span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Default Parameters Preview */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Parameters:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(model.defaultHyperparameters)
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                  {Object.keys(model.defaultHyperparameters).length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{Object.keys(model.defaultHyperparameters).length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ModelSelector;