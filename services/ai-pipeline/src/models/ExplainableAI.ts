import { BaseModel, TrainingData } from './BaselineModels';

export interface FeatureAttribution {
  feature_name: string;
  importance: number;
  contribution: number;
  confidence: number;
}

export interface SHAPExplanation {
  base_value: number;
  feature_attributions: FeatureAttribution[];
  prediction: number;
  expected_value: number;
  shap_values: number[];
}

export interface LIMEExplanation {
  feature_attributions: FeatureAttribution[];
  prediction: number;
  local_model_score: number;
  intercept: number;
  used_features: string[];
}

export interface NaturalLanguageExplanation {
  summary: string;
  key_factors: string[];
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence_description: string;
  recommendations: string[];
  technical_details: string;
}

export interface ExplanationRequest {
  model: BaseModel;
  instance: number[];
  feature_names: string[];
  background_data?: TrainingData | undefined;
  explanation_type: 'shap' | 'lime' | 'both';
  num_samples?: number;
}

export interface ExplanationResult {
  shap_explanation?: SHAPExplanation | undefined;
  lime_explanation?: LIMEExplanation | undefined;
  natural_language_explanation: NaturalLanguageExplanation;
  visualization_data: VisualizationData;
}

export interface VisualizationData {
  feature_importance_chart: {
    labels: string[];
    values: number[];
    colors: string[];
  };
  waterfall_chart: {
    base_value: number;
    contributions: { feature: string; value: number }[];
    final_prediction: number;
  };
  force_plot_data: {
    base_value: number;
    shap_values: number[];
    feature_values: number[];
    feature_names: string[];
  };
}

/**
 * Explainable AI service implementing SHAP and LIME algorithms
 * for model interpretability in rockfall prediction
 */
export class ExplainableAI {
  private static readonly RISK_THRESHOLDS = {
    LOW: 0.25,
    MEDIUM: 0.5,
    HIGH: 0.75
  };

  private static readonly GEOLOGICAL_FEATURE_DESCRIPTIONS: { [key: string]: string } = {
    'slope_angle': 'slope steepness',
    'joint_orientation': 'rock joint alignment',
    'displacement_rate': 'movement velocity',
    'pore_pressure': 'groundwater pressure',
    'rainfall_accumulation': 'recent precipitation',
    'temperature_variation': 'thermal stress',
    'vibration_intensity': 'seismic activity',
    'strain_rate': 'rock deformation rate'
  };

  /**
   * Generate comprehensive explanation for a model prediction
   */
  public async explainPrediction(request: ExplanationRequest): Promise<ExplanationResult> {
    const prediction = await request.model.predict(request.instance);
    
    let shapExplanation: SHAPExplanation | undefined;
    let limeExplanation: LIMEExplanation | undefined;

    // Generate SHAP explanation
    if (request.explanation_type === 'shap' || request.explanation_type === 'both') {
      shapExplanation = await this.generateSHAPExplanation(
        request.model,
        request.instance,
        request.feature_names,
        request.background_data
      );
    }

    // Generate LIME explanation
    if (request.explanation_type === 'lime' || request.explanation_type === 'both') {
      limeExplanation = await this.generateLIMEExplanation(
        request.model,
        request.instance,
        request.feature_names,
        request.num_samples || 1000
      );
    }

    // Generate natural language explanation
    const naturalLanguageExplanation = this.generateNaturalLanguageExplanation(
      prediction.prediction,
      shapExplanation || limeExplanation!,
      request.feature_names,
      request.instance
    );

    // Generate visualization data
    const visualizationData = this.generateVisualizationData(
      shapExplanation || limeExplanation!,
      prediction.prediction
    );

    return {
      shap_explanation: shapExplanation,
      lime_explanation: limeExplanation,
      natural_language_explanation: naturalLanguageExplanation,
      visualization_data: visualizationData
    };
  }

  /**
   * Generate SHAP (SHapley Additive exPlanations) explanation
   */
  private async generateSHAPExplanation(
    model: BaseModel,
    instance: number[],
    featureNames: string[],
    backgroundData?: TrainingData
  ): Promise<SHAPExplanation> {
    // Get base prediction (expected value)
    const baseValue = backgroundData 
      ? await this.calculateExpectedValue(model, backgroundData)
      : 0.5; // Default baseline for risk probability

    // Calculate SHAP values using approximation method
    const shapValues = await this.calculateSHAPValues(model, instance, featureNames, backgroundData);
    
    // Get current prediction
    const prediction = await model.predict(instance);

    // Create feature attributions
    const featureAttributions: FeatureAttribution[] = featureNames.map((name, index) => ({
      feature_name: name,
      importance: Math.abs(shapValues[index]),
      contribution: shapValues[index],
      confidence: this.calculateFeatureConfidence(shapValues[index], prediction.confidence)
    }));

    return {
      base_value: baseValue,
      feature_attributions: featureAttributions,
      prediction: prediction.prediction,
      expected_value: baseValue,
      shap_values: shapValues
    };
  }

  /**
   * Generate LIME (Local Interpretable Model-agnostic Explanations) explanation
   */
  private async generateLIMEExplanation(
    model: BaseModel,
    instance: number[],
    featureNames: string[],
    numSamples: number
  ): Promise<LIMEExplanation> {
    // Generate perturbed samples around the instance
    const perturbedSamples = this.generatePerturbedSamples(instance, numSamples);
    
    // Get predictions for perturbed samples
    const predictions: number[] = [];
    for (const sample of perturbedSamples) {
      const pred = await model.predict(sample);
      predictions.push(pred.prediction);
    }

    // Fit local linear model
    const localModel = this.fitLocalLinearModel(perturbedSamples, predictions, instance);
    
    // Get current prediction
    const prediction = await model.predict(instance);

    // Create feature attributions from local model coefficients
    const featureAttributions: FeatureAttribution[] = featureNames.map((name, index) => ({
      feature_name: name,
      importance: Math.abs(localModel.coefficients[index]),
      contribution: localModel.coefficients[index] * instance[index],
      confidence: this.calculateFeatureConfidence(localModel.coefficients[index], prediction.confidence)
    }));

    return {
      feature_attributions: featureAttributions,
      prediction: prediction.prediction,
      local_model_score: localModel.score,
      intercept: localModel.intercept,
      used_features: featureNames
    };
  }

  /**
   * Generate natural language explanation of the prediction
   */
  private generateNaturalLanguageExplanation(
    prediction: number,
    explanation: SHAPExplanation | LIMEExplanation,
    featureNames: string[],
    instance: number[]
  ): NaturalLanguageExplanation {
    const riskLevel = this.determineRiskLevel(prediction);
    
    // Sort features by importance
    const sortedFeatures = explanation.feature_attributions
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5); // Top 5 most important features

    // Generate summary
    const summary = this.generateSummary(prediction, riskLevel, sortedFeatures);
    
    // Generate key factors
    const keyFactors = this.generateKeyFactors(sortedFeatures, instance, featureNames);
    
    // Generate confidence description
    const confidenceDescription = this.generateConfidenceDescription(
      sortedFeatures.reduce((sum, f) => sum + f.confidence, 0) / sortedFeatures.length
    );
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(riskLevel, sortedFeatures, prediction);
    
    // Generate technical details
    const technicalDetails = this.generateTechnicalDetails(explanation, prediction);

    return {
      summary,
      key_factors: keyFactors,
      risk_level: riskLevel,
      confidence_description: confidenceDescription,
      recommendations,
      technical_details: technicalDetails
    };
  }

  /**
   * Generate visualization data for dashboards
   */
  private generateVisualizationData(
    explanation: SHAPExplanation | LIMEExplanation,
    prediction: number
  ): VisualizationData {
    const sortedFeatures = explanation.feature_attributions
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    // Feature importance chart
    const featureImportanceChart = {
      labels: sortedFeatures.map(f => f.feature_name),
      values: sortedFeatures.map(f => f.importance),
      colors: sortedFeatures.map(f => f.contribution > 0 ? '#ff6b6b' : '#4ecdc4')
    };

    // Waterfall chart for SHAP
    const baseValue = 'base_value' in explanation ? explanation.base_value : 0.5;
    const waterfallChart = {
      base_value: baseValue,
      contributions: sortedFeatures.map(f => ({
        feature: f.feature_name,
        value: f.contribution
      })),
      final_prediction: prediction
    };

    // Force plot data
    const forcePlotData = {
      base_value: baseValue,
      shap_values: 'shap_values' in explanation ? explanation.shap_values : 
                   sortedFeatures.map(f => f.contribution),
      feature_values: sortedFeatures.map((_, i) => i), // Placeholder - would need actual values
      feature_names: sortedFeatures.map(f => f.feature_name)
    };

    return {
      feature_importance_chart: featureImportanceChart,
      waterfall_chart: waterfallChart,
      force_plot_data: forcePlotData
    };
  }

  /**
   * Calculate SHAP values using Kernel SHAP approximation
   */
  private async calculateSHAPValues(
    model: BaseModel,
    instance: number[],
    _featureNames: string[],
    backgroundData?: TrainingData
  ): Promise<number[]> {
    const numFeatures = instance.length;
    const shapValues: number[] = new Array(numFeatures).fill(0);
    
    // Use background mean if available, otherwise use zeros
    const baseline = backgroundData 
      ? this.calculateFeatureMeans(backgroundData)
      : new Array(numFeatures).fill(0);

    // Calculate marginal contributions for each feature
    for (let i = 0; i < numFeatures; i++) {
      // Create instance with feature i set to baseline
      const withoutFeature = [...instance];
      withoutFeature[i] = baseline[i];
      
      // Get predictions
      const withFeature = await model.predict(instance);
      const withoutFeaturePred = await model.predict(withoutFeature);
      
      // SHAP value is the marginal contribution
      shapValues[i] = withFeature.prediction - withoutFeaturePred.prediction;
    }

    return shapValues;
  }

  /**
   * Generate perturbed samples for LIME
   */
  private generatePerturbedSamples(instance: number[], numSamples: number): number[][] {
    const samples: number[][] = [];
    
    for (let i = 0; i < numSamples; i++) {
      const sample = instance.map(value => {
        // Add Gaussian noise (10% of the value)
        const noise = (Math.random() - 0.5) * 0.2 * Math.abs(value);
        return Math.max(0, value + noise); // Ensure non-negative values
      });
      samples.push(sample);
    }
    
    return samples;
  }

  /**
   * Fit local linear model for LIME
   */
  private fitLocalLinearModel(
    samples: number[][],
    predictions: number[],
    instance: number[]
  ): { coefficients: number[]; intercept: number; score: number } {
    const numFeatures = instance.length;
    const numSamples = samples.length;
    
    // Calculate weights based on distance to instance
    const weights = samples.map(sample => {
      const distance = this.euclideanDistance(sample, instance);
      return Math.exp(-distance * distance / 0.25); // Kernel width = 0.5
    });
    
    // Simple weighted linear regression
    const coefficients = new Array(numFeatures).fill(0);
    let intercept = 0;
    
    // Calculate weighted means
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    const weightedPredMean = predictions.reduce((sum, pred, i) => sum + pred * weights[i], 0) / weightSum;
    
    // Calculate coefficients using normal equations (simplified)
    for (let j = 0; j < numFeatures; j++) {
      const weightedFeatureMean = samples.reduce((sum, sample, i) => sum + sample[j] * weights[i], 0) / weightSum;
      
      let numerator = 0;
      let denominator = 0;
      
      for (let i = 0; i < numSamples; i++) {
        const featureDiff = samples[i][j] - weightedFeatureMean;
        const predDiff = predictions[i] - weightedPredMean;
        numerator += weights[i] * featureDiff * predDiff;
        denominator += weights[i] * featureDiff * featureDiff;
      }
      
      coefficients[j] = denominator > 0 ? numerator / denominator : 0;
    }
    
    // Calculate intercept
    intercept = weightedPredMean - coefficients.reduce((sum, coef, j) => {
      const weightedFeatureMean = samples.reduce((sum, sample, i) => sum + sample[j] * weights[i], 0) / weightSum;
      return sum + coef * weightedFeatureMean;
    }, 0);
    
    // Calculate R² score
    const score = this.calculateR2Score(samples, predictions, coefficients, intercept, weights);
    
    return { coefficients, intercept, score };
  }

  /**
   * Helper methods
   */
  private async calculateExpectedValue(model: BaseModel, backgroundData: TrainingData): Promise<number> {
    let sum = 0;
    for (const features of backgroundData.features) {
      const pred = await model.predict(features);
      sum += pred.prediction;
    }
    return sum / backgroundData.features.length;
  }

  private calculateFeatureMeans(data: TrainingData): number[] {
    const numFeatures = data.features[0].length;
    const means = new Array(numFeatures).fill(0);
    
    for (const features of data.features) {
      for (let i = 0; i < numFeatures; i++) {
        means[i] += features[i];
      }
    }
    
    return means.map(sum => sum / data.features.length);
  }

  private calculateFeatureConfidence(contribution: number, modelConfidence: number): number {
    // Confidence decreases with smaller absolute contributions
    const contributionWeight = Math.min(1, Math.abs(contribution) * 2);
    return modelConfidence * contributionWeight;
  }

  private determineRiskLevel(prediction: number): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (prediction < ExplainableAI.RISK_THRESHOLDS.LOW) return 'Low';
    if (prediction < ExplainableAI.RISK_THRESHOLDS.MEDIUM) return 'Medium';
    if (prediction < ExplainableAI.RISK_THRESHOLDS.HIGH) return 'High';
    return 'Critical';
  }

  private generateSummary(
    prediction: number,
    riskLevel: string,
    topFeatures: FeatureAttribution[]
  ): string {
    const percentage = Math.round(prediction * 100);
    const topFactor = topFeatures[0];
    const factorDescription = ExplainableAI.GEOLOGICAL_FEATURE_DESCRIPTIONS[topFactor.feature_name] || topFactor.feature_name;
    
    return `The model predicts a ${percentage}% probability of rockfall occurrence (${riskLevel} risk). ` +
           `The primary contributing factor is ${factorDescription}, which ${topFactor.contribution > 0 ? 'increases' : 'decreases'} ` +
           `the risk by ${Math.abs(topFactor.contribution * 100).toFixed(1)} percentage points.`;
  }

  private generateKeyFactors(
    topFeatures: FeatureAttribution[],
    instance: number[],
    featureNames: string[]
  ): string[] {
    return topFeatures.map(feature => {
      const featureIndex = featureNames.indexOf(feature.feature_name);
      const value = featureIndex >= 0 ? instance[featureIndex] : 0;
      const description = ExplainableAI.GEOLOGICAL_FEATURE_DESCRIPTIONS[feature.feature_name] || feature.feature_name;
      const impact = feature.contribution > 0 ? 'increasing' : 'decreasing';
      
      return `${description.charAt(0).toUpperCase() + description.slice(1)} (${value.toFixed(2)}) is ${impact} risk by ${Math.abs(feature.contribution * 100).toFixed(1)}%`;
    });
  }

  private generateConfidenceDescription(averageConfidence: number): string {
    if (averageConfidence > 0.8) return 'High confidence - prediction is well-supported by multiple consistent factors';
    if (averageConfidence > 0.6) return 'Moderate confidence - prediction is supported but some uncertainty remains';
    if (averageConfidence > 0.4) return 'Low confidence - prediction has significant uncertainty';
    return 'Very low confidence - prediction should be interpreted with caution';
  }

  private generateRecommendations(
    riskLevel: string,
    topFeatures: FeatureAttribution[],
    _prediction: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Risk-level based recommendations
    switch (riskLevel) {
      case 'Critical':
        recommendations.push('Immediately evacuate personnel from the affected area');
        recommendations.push('Stop all operations in the vicinity');
        recommendations.push('Activate emergency response protocols');
        break;
      case 'High':
        recommendations.push('Restrict access to the affected area');
        recommendations.push('Increase monitoring frequency');
        recommendations.push('Prepare evacuation procedures');
        break;
      case 'Medium':
        recommendations.push('Enhance monitoring of the area');
        recommendations.push('Brief personnel on increased risk');
        recommendations.push('Review operational procedures');
        break;
      case 'Low':
        recommendations.push('Continue routine monitoring');
        recommendations.push('Document current conditions');
        break;
    }
    
    // Feature-specific recommendations
    const topRiskFactor = topFeatures.find(f => f.contribution > 0);
    if (topRiskFactor) {
      switch (topRiskFactor.feature_name) {
        case 'pore_pressure':
          recommendations.push('Consider drainage measures to reduce groundwater pressure');
          break;
        case 'rainfall_accumulation':
          recommendations.push('Monitor weather forecasts and adjust operations accordingly');
          break;
        case 'displacement_rate':
          recommendations.push('Install additional displacement monitoring equipment');
          break;
        case 'vibration_intensity':
          recommendations.push('Review blasting procedures and timing');
          break;
      }
    }
    
    return recommendations;
  }

  private generateTechnicalDetails(
    explanation: SHAPExplanation | LIMEExplanation,
    prediction: number
  ): string {
    const method = 'shap_values' in explanation ? 'SHAP' : 'LIME';
    const numFeatures = explanation.feature_attributions.length;
    const topContribution = Math.max(...explanation.feature_attributions.map(f => Math.abs(f.contribution)));
    
    return `Analysis performed using ${method} explainability method. ` +
           `Evaluated ${numFeatures} features with maximum individual contribution of ${(topContribution * 100).toFixed(2)}%. ` +
           `Model prediction: ${(prediction * 100).toFixed(1)}% risk probability.`;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  private calculateR2Score(
    samples: number[][],
    predictions: number[],
    coefficients: number[],
    intercept: number,
    weights: number[]
  ): number {
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    const weightedMean = predictions.reduce((sum, pred, i) => sum + pred * weights[i], 0) / weightSum;
    
    let totalSumSquares = 0;
    let residualSumSquares = 0;
    
    for (let i = 0; i < samples.length; i++) {
      const predicted = intercept + coefficients.reduce((sum, coef, j) => sum + coef * samples[i][j], 0);
      const actual = predictions[i];
      
      totalSumSquares += weights[i] * Math.pow(actual - weightedMean, 2);
      residualSumSquares += weights[i] * Math.pow(actual - predicted, 2);
    }
    
    return totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
  }
}