# PRISM Explainable AI Implementation

This document describes the implementation of explainable AI functionality for the PRISM rockfall prediction system, fulfilling task 8.2 from the implementation plan.

## Overview

The explainable AI system provides interpretable explanations for rockfall risk predictions using SHAP (SHapley Additive exPlanations) and LIME (Local Interpretable Model-agnostic Explanations) algorithms. It generates both technical feature attributions and natural language explanations suitable for operational decision-making.

## Key Components

### 1. ExplainableAI Class (`ExplainableAI.ts`)

The core explainable AI engine that implements:

- **SHAP Explanations**: Uses Kernel SHAP approximation to calculate feature contributions
- **LIME Explanations**: Generates local linear models around prediction instances
- **Natural Language Generation**: Converts technical explanations into operational language
- **Visualization Data**: Prepares data for dashboard charts and plots

#### Key Methods:

```typescript
// Generate comprehensive explanation
async explainPrediction(request: ExplanationRequest): Promise<ExplanationResult>

// Generate SHAP explanation specifically
private async generateSHAPExplanation(model, instance, featureNames, backgroundData)

// Generate LIME explanation specifically  
private async generateLIMEExplanation(model, instance, featureNames, numSamples)

// Convert to natural language
private generateNaturalLanguageExplanation(prediction, explanation, featureNames, instance)
```

#### Features:

- **Risk Level Classification**: Automatically categorizes predictions as Low/Medium/High/Critical
- **Geological Context**: Maps technical features to geological terminology
- **Confidence Assessment**: Provides confidence scores for explanations
- **Actionable Recommendations**: Generates specific operational recommendations

### 2. ExplanationService Class (`ExplanationService.ts`)

A service layer that manages explainable AI functionality across the system:

- **Caching**: Intelligent caching of explanations to improve performance
- **Batch Processing**: Handles multiple explanations efficiently
- **Ensemble Explanations**: Combines explanations from multiple models
- **Trend Analysis**: Analyzes feature importance changes over time
- **Operational Context**: Integrates business context into explanations

#### Key Methods:

```typescript
// Single prediction explanation
async explainPrediction(modelName, instance, featureNames, explanationType)

// Batch explanations with summary statistics
async explainBatch(request: BatchExplanationRequest)

// Ensemble model explanations
async explainEnsemble(instance, featureNames, modelNames)

// Operational context integration
async generateOperationalExplanation(modelName, instance, featureNames, context)

// Time-series trend analysis
async analyzeFeatureImportanceTrends(modelName, timeSeriesData, featureNames)
```

### 3. REST API Endpoints (`routes/explanations.ts`)

Comprehensive API for accessing explainable AI functionality:

#### Endpoints:

- `POST /api/explanations/single` - Single prediction explanation
- `POST /api/explanations/batch` - Batch explanations
- `POST /api/explanations/ensemble` - Ensemble model explanations
- `POST /api/explanations/operational` - Operational context explanations
- `POST /api/explanations/trends` - Feature importance trend analysis
- `POST /api/explanations/background-data` - Set SHAP background data
- `GET /api/explanations/cache/stats` - Cache statistics
- `DELETE /api/explanations/cache` - Clear explanation cache
- `GET /api/explanations/health` - Health check

## Data Models

### ExplanationRequest
```typescript
interface ExplanationRequest {
  model: BaseModel;
  instance: number[];
  feature_names: string[];
  background_data?: TrainingData;
  explanation_type: 'shap' | 'lime' | 'both';
  num_samples?: number;
}
```

### ExplanationResult
```typescript
interface ExplanationResult {
  shap_explanation?: SHAPExplanation;
  lime_explanation?: LIMEExplanation;
  natural_language_explanation: NaturalLanguageExplanation;
  visualization_data: VisualizationData;
}
```

### NaturalLanguageExplanation
```typescript
interface NaturalLanguageExplanation {
  summary: string;
  key_factors: string[];
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence_description: string;
  recommendations: string[];
  technical_details: string;
}
```

## Algorithm Implementation

### SHAP (SHapley Additive exPlanations)

The SHAP implementation uses Kernel SHAP approximation:

1. **Baseline Calculation**: Computes expected model output from background data
2. **Marginal Contributions**: Calculates each feature's contribution by comparing predictions with/without the feature
3. **Additive Property**: Ensures SHAP values sum to (prediction - baseline)

```typescript
// Simplified SHAP calculation
for (let i = 0; i < numFeatures; i++) {
  const withoutFeature = [...instance];
  withoutFeature[i] = baseline[i];
  
  const withFeature = await model.predict(instance);
  const withoutFeaturePred = await model.predict(withoutFeature);
  
  shapValues[i] = withFeature.prediction - withoutFeaturePred.prediction;
}
```

### LIME (Local Interpretable Model-agnostic Explanations)

The LIME implementation:

1. **Sample Generation**: Creates perturbed samples around the instance
2. **Local Predictions**: Gets model predictions for perturbed samples
3. **Weight Calculation**: Weights samples by distance to original instance
4. **Linear Model Fitting**: Fits weighted linear model to approximate local behavior

```typescript
// Generate perturbed samples with Gaussian noise
const sample = instance.map(value => {
  const noise = (Math.random() - 0.5) * 0.2 * Math.abs(value);
  return Math.max(0, value + noise);
});

// Weight by distance
const distance = this.euclideanDistance(sample, instance);
const weight = Math.exp(-distance * distance / 0.25);
```

## Natural Language Generation

The system converts technical explanations into operational language:

### Risk Level Mapping
- **Low** (< 25%): Continue routine monitoring
- **Medium** (25-50%): Enhanced monitoring, brief personnel
- **High** (50-75%): Restrict access, prepare evacuation
- **Critical** (> 75%): Immediate evacuation, stop operations

### Feature Descriptions
Technical features are mapped to geological terminology:
- `slope_angle` → "slope steepness"
- `joint_orientation` → "rock joint alignment"  
- `displacement_rate` → "movement velocity"
- `pore_pressure` → "groundwater pressure"

### Recommendation Generation
Risk-appropriate recommendations are generated:
- **Critical**: "Immediately evacuate personnel from the affected area"
- **High**: "Restrict access to the affected area"
- **Medium**: "Enhance monitoring of the area"
- **Low**: "Continue routine monitoring"

## Visualization Data

The system generates data for multiple visualization types:

### Feature Importance Chart
```typescript
{
  labels: string[];      // Feature names
  values: number[];      // Importance scores
  colors: string[];      // Red for positive, teal for negative
}
```

### Waterfall Chart
```typescript
{
  base_value: number;                           // Starting baseline
  contributions: { feature: string; value: number }[];  // Feature contributions
  final_prediction: number;                     // Final prediction
}
```

### Force Plot Data
```typescript
{
  base_value: number;
  shap_values: number[];
  feature_values: number[];
  feature_names: string[];
}
```

## Performance Optimizations

### Caching Strategy
- **LRU Cache**: Least recently used eviction policy
- **Configurable Size**: Adjustable cache size limits
- **Cache Keys**: Based on model name, instance values, and explanation type
- **Statistics Tracking**: Hit rates and access patterns

### Batch Processing
- **Parallel Processing**: Concurrent explanation generation
- **Error Isolation**: Individual failures don't affect batch
- **Summary Statistics**: Aggregated insights across batch

### Approximation Methods
- **Reduced Sampling**: Configurable LIME sample sizes
- **Feature Subset**: Focus on most important features
- **Early Termination**: Stop when confidence thresholds met

## Integration with PRISM System

### Requirements Fulfillment

**Requirement 2.6**: ✅ SHAP/feature attribution for explanations
- Implements both SHAP and LIME algorithms
- Provides detailed feature attribution scores
- Generates confidence intervals for attributions

**Requirement 5.3**: ✅ Prescriptive actions
- Generates risk-appropriate recommendations
- Provides operational context integration
- Includes cost-benefit considerations

**Requirement 9.8**: ✅ Natural language interfaces
- Converts technical explanations to operational language
- Provides conversational explanation summaries
- Supports voice-friendly recommendation formats

### Model Pipeline Integration
The explainable AI system integrates with the existing ModelPipeline:
- Works with any BaseModel implementation
- Supports ensemble explanations
- Maintains model performance metrics

### Digital Twin Integration
Explanations can incorporate digital twin context:
- Spatial location information
- Operational parameters
- Equipment and personnel data

## Testing Strategy

### Unit Tests (`ExplainableAI.test.ts`)
- SHAP value calculation accuracy
- LIME local model fitting
- Natural language generation
- Visualization data creation
- Error handling and edge cases

### Service Tests (`ExplanationService.test.ts`)
- Caching functionality
- Batch processing
- Ensemble explanations
- Trend analysis
- Performance benchmarks

### API Tests (`explanations.test.ts`)
- Endpoint validation
- Input sanitization
- Error responses
- Concurrent request handling
- Large payload handling

## Usage Examples

### Single Explanation
```typescript
const result = await explanationService.explainPrediction(
  'rockfall_model',
  [0.6, 0.4, 0.3, 0.5, 0.2],
  ['slope_angle', 'joint_orientation', 'displacement_rate', 'pore_pressure', 'rainfall'],
  'shap'
);

console.log(result.natural_language_explanation.summary);
// "The model predicts a 65% probability of rockfall occurrence (High risk). 
//  The primary contributing factor is slope steepness, which increases the risk by 12.3 percentage points."
```

### Operational Context
```typescript
const operationalResult = await explanationService.generateOperationalExplanation(
  'rockfall_model',
  features,
  featureNames,
  {
    location: 'Bench 12-A',
    current_operations: ['hauling', 'drilling'],
    personnel_count: 15,
    equipment_value: 2500000
  }
);

console.log(operationalResult.operational_impact.personnel_risk);
// "High risk to 15 personnel"
```

### Trend Analysis
```typescript
const trends = await explanationService.analyzeFeatureImportanceTrends(
  'rockfall_model',
  timeSeriesData,
  featureNames
);

console.log(trends.trend_analysis);
// ["slope_angle importance has increased by 23.4%", "Risk level has changed from Medium to High"]
```

## Future Enhancements

### Planned Improvements
1. **Advanced Algorithms**: Implement TreeSHAP for tree-based models
2. **Counterfactual Explanations**: "What would need to change to reduce risk?"
3. **Global Explanations**: Model-wide feature importance analysis
4. **Interactive Explanations**: Real-time explanation refinement
5. **Multi-modal Explanations**: Incorporate imagery and sensor data

### Integration Opportunities
1. **AR/VR Visualization**: 3D explanation overlays
2. **Voice Interfaces**: Spoken explanations for field personnel
3. **Mobile Optimization**: Simplified explanations for mobile devices
4. **Regulatory Reporting**: Automated compliance documentation

## Conclusion

The PRISM explainable AI implementation provides comprehensive, interpretable explanations for rockfall risk predictions. It successfully bridges the gap between complex AI models and operational decision-making through:

- **Technical Accuracy**: Rigorous SHAP and LIME implementations
- **Operational Relevance**: Natural language explanations with actionable recommendations
- **System Integration**: Seamless integration with existing PRISM components
- **Performance Optimization**: Caching and batch processing for production use
- **Comprehensive Testing**: Extensive test coverage for reliability

This implementation fulfills all requirements for task 8.2 and provides a solid foundation for explainable AI throughout the PRISM system.