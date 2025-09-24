import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Select } from '../common/Select';
import { Slider } from '../common/Slider';
import { Progress } from '../common/Progress';
import { 
  Scenario, 
  ScenarioCondition, 
  TrainingResults,
  AnalyticsData 
} from '../../types/dataScience';
import { scenarioAPI } from '../../api/dataScience/scenarios';

interface ScenarioBuilderProps {
  availableModels: TrainingResults[];
  analyticsData?: AnalyticsData;
  onScenarioCreate: (scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => void;
  loading: boolean;
}

interface ParameterTemplate {
  parameters: { [key: string]: any };
  suggestedConditions: ScenarioCondition[];
  parameterRanges: { [key: string]: { min: any; max: any; default: any } };
}

export const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({
  availableModels,
  analyticsData,
  onScenarioCreate,
  loading
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [parameters, setParameters] = useState<{ [key: string]: any }>({});
  const [conditions, setConditions] = useState<ScenarioCondition[]>([]);
  const [parameterTemplate, setParameterTemplate] = useState<ParameterTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (selectedModelId) {
      loadParameterTemplate(selectedModelId);
    }
  }, [selectedModelId]);

  const loadParameterTemplate = async (modelId: string) => {
    try {
      setTemplateLoading(true);
      const response = await scenarioAPI.getScenarioTemplate(modelId);
      if (response.success && response.data) {
        setParameterTemplate(response.data);
        setParameters(response.data.parameters);
        setConditions(response.data.suggestedConditions);
      }
    } catch (error: any) {
      console.error('Failed to load parameter template:', error);
      // Fallback to basic parameters if template loading fails
      setParameterTemplate({
        parameters: {},
        suggestedConditions: [],
        parameterRanges: {}
      });
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleConditionAdd = () => {
    const newCondition: ScenarioCondition = {
      parameter: '',
      operator: 'greater_than',
      value: 0,
      weight: 1
    };
    setConditions(prev => [...prev, newCondition]);
  };

  const handleConditionUpdate = (index: number, field: keyof ScenarioCondition, value: any) => {
    setConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    ));
  };

  const handleConditionRemove = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const validateScenario = (): string[] => {
    const errors: string[] = [];

    if (!scenarioName.trim()) {
      errors.push('Scenario name is required');
    }

    if (!selectedModelId) {
      errors.push('Please select a model');
    }

    if (Object.keys(parameters).length === 0) {
      errors.push('At least one parameter is required');
    }

    conditions.forEach((condition, index) => {
      if (!condition.parameter) {
        errors.push(`Condition ${index + 1}: Parameter is required`);
      }
      if (condition.value === undefined || condition.value === null) {
        errors.push(`Condition ${index + 1}: Value is required`);
      }
    });

    return errors;
  };

  const handleCreateScenario = () => {
    const errors = validateScenario();
    setValidationErrors(errors);

    if (errors.length === 0) {
      const scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'> = {
        name: scenarioName,
        description: scenarioDescription,
        modelId: selectedModelId,
        parameters,
        conditions
      };

      onScenarioCreate(scenario);

      // Reset form
      setScenarioName('');
      setScenarioDescription('');
      setParameters({});
      setConditions([]);
      setSelectedModelId('');
      setParameterTemplate(null);
    }
  };

  const handleLoadPreset = (presetType: 'conservative' | 'moderate' | 'aggressive') => {
    if (!parameterTemplate) return;

    const presets = {
      conservative: 0.7, // Use 70% of max values
      moderate: 1.0,     // Use default values
      aggressive: 1.3    // Use 130% of default values
    };

    const multiplier = presets[presetType];
    const newParameters: { [key: string]: any } = {};

    Object.keys(parameterTemplate.parameters).forEach(param => {
      const range = parameterTemplate.parameterRanges[param];
      if (range) {
        const value = range.default * multiplier;
        newParameters[param] = Math.max(range.min, Math.min(range.max, value));
      }
    });

    setParameters(newParameters);
    setScenarioName(`${presetType.charAt(0).toUpperCase() + presetType.slice(1)} Scenario`);
    setScenarioDescription(`Auto-generated ${presetType} scenario with ${presetType} parameter values.`);
  };

  return (
    <div className="scenario-builder">
      <div className="scenario-builder__header">
        <h2>Create New Scenario</h2>
        <p>Configure parameters and conditions to simulate different scenarios.</p>
      </div>

      {validationErrors.length > 0 && (
        <Card className="scenario-builder__errors">
          <h3>Please fix the following errors:</h3>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="scenario-builder__form">
        <Card className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="scenario-name">Scenario Name *</label>
            <input
              id="scenario-name"
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Enter scenario name"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="scenario-description">Description</label>
            <textarea
              id="scenario-description"
              value={scenarioDescription}
              onChange={(e) => setScenarioDescription(e.target.value)}
              placeholder="Describe the scenario and its purpose"
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="model-select">Select Model *</label>
            <Select
              id="model-select"
              value={selectedModelId}
              onChange={setSelectedModelId}
              options={availableModels.map(model => ({
                value: model.id,
                label: `${model.configuration.modelType} - ${new Date(model.createdAt).toLocaleDateString()}`
              }))}
              placeholder="Choose a trained model"
            />
          </div>

          {selectedModelId && (
            <div className="preset-buttons">
              <h4>Quick Presets</h4>
              <div className="preset-button-group">
                <button
                  type="button"
                  onClick={() => handleLoadPreset('conservative')}
                  className="preset-button conservative"
                  disabled={templateLoading}
                >
                  Conservative
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('moderate')}
                  className="preset-button moderate"
                  disabled={templateLoading}
                >
                  Moderate
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('aggressive')}
                  className="preset-button aggressive"
                  disabled={templateLoading}
                >
                  Aggressive
                </button>
              </div>
            </div>
          )}
        </Card>

        {templateLoading && (
          <Card className="form-section">
            <div className="loading-template">
              <Progress value={50} />
              <p>Loading parameter template...</p>
            </div>
          </Card>
        )}

        {parameterTemplate && !templateLoading && (
          <Card className="form-section">
            <h3>Parameters</h3>
            <p>Adjust the input parameters for your scenario:</p>
            
            <div className="parameters-grid">
              {Object.keys(parameterTemplate.parameters).map(paramName => {
                const range = parameterTemplate.parameterRanges[paramName];
                const currentValue = parameters[paramName] || range?.default || 0;

                return (
                  <div key={paramName} className="parameter-control">
                    <label htmlFor={`param-${paramName}`}>
                      {paramName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    
                    {range && typeof range.min === 'number' ? (
                      <div className="slider-control">
                        <Slider
                          id={`param-${paramName}`}
                          min={range.min}
                          max={range.max}
                          value={currentValue}
                          onChange={(value) => handleParameterChange(paramName, value)}
                          step={0.01}
                        />
                        <div className="slider-info">
                          <span>Min: {range.min.toFixed(2)}</span>
                          <span>Current: {currentValue.toFixed(2)}</span>
                          <span>Max: {range.max.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <input
                        id={`param-${paramName}`}
                        type="number"
                        value={currentValue}
                        onChange={(e) => handleParameterChange(paramName, parseFloat(e.target.value) || 0)}
                        className="form-input"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="form-section">
          <h3>Conditions</h3>
          <p>Define specific conditions for this scenario:</p>
          
          {conditions.map((condition, index) => (
            <div key={index} className="condition-row">
              <Select
                value={condition.parameter}
                onChange={(value) => handleConditionUpdate(index, 'parameter', value)}
                options={Object.keys(parameters).map(param => ({
                  value: param,
                  label: param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                }))}
                placeholder="Select parameter"
              />
              
              <Select
                value={condition.operator}
                onChange={(value) => handleConditionUpdate(index, 'operator', value)}
                options={[
                  { value: 'equals', label: 'Equals' },
                  { value: 'greater_than', label: 'Greater Than' },
                  { value: 'less_than', label: 'Less Than' },
                  { value: 'between', label: 'Between' }
                ]}
              />
              
              <input
                type="number"
                value={condition.value}
                onChange={(e) => handleConditionUpdate(index, 'value', parseFloat(e.target.value) || 0)}
                placeholder="Value"
                className="form-input"
              />
              
              <input
                type="number"
                value={condition.weight || 1}
                onChange={(e) => handleConditionUpdate(index, 'weight', parseFloat(e.target.value) || 1)}
                placeholder="Weight"
                className="form-input"
                min="0"
                max="1"
                step="0.1"
              />
              
              <button
                type="button"
                onClick={() => handleConditionRemove(index)}
                className="remove-condition-btn"
                aria-label="Remove condition"
              >
                ×
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={handleConditionAdd}
            className="add-condition-btn"
          >
            + Add Condition
          </button>
        </Card>

        <div className="scenario-builder__actions">
          <button
            type="button"
            onClick={handleCreateScenario}
            disabled={loading || templateLoading}
            className="create-scenario-btn primary"
          >
            {loading ? 'Creating...' : 'Create Scenario'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setScenarioName('');
              setScenarioDescription('');
              setParameters({});
              setConditions([]);
              setSelectedModelId('');
              setParameterTemplate(null);
              setValidationErrors([]);
            }}
            className="reset-form-btn secondary"
          >
            Reset Form
          </button>
        </div>
      </div>
    </div>
  );
};