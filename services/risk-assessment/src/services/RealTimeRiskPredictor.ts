import { Logger } from 'winston';
import { RiskPredictionInput, ModelExplanation, EnvironmentalData } from '../types';

export interface RiskPrediction {
  risk_probability: number;
  confidence_interval: [number, number];
  time_to_failure_hours?: number;
  contributing_factors: string[];
  explanation: ModelExplanation;
}

export class RealTimeRiskPredictor {
  private logger: Logger;
  private environmentalContext?: EnvironmentalData;
  private modelWeights: Map<string, number> = new Map();
  private featureScalers: Map<string, { mean: number; std: number }> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeModel();
  }

  private initializeModel(): void {
    // Initialize model weights (in real implementation, load from trained model)
    this.modelWeights.set('displacement_rate', 0.35);
    this.modelWeights.set('acceleration', 0.25);
    this.modelWeights.set('pore_pressure', 0.20);
    this.modelWeights.set('rainfall_accumulation', 0.15);
    this.modelWeights.set('temperature_variation', 0.05);

    // Initialize feature scalers (in real implementation, load from training data)
    this.featureScalers.set('displacement_rate', { mean: 0.5, std: 0.2 });
    this.featureScalers.set('acceleration', { mean: 0.1, std: 0.05 });
    this.featureScalers.set('pore_pressure', { mean: 50, std: 20 });
    this.featureScalers.set('rainfall_accumulation', { mean: 10, std: 15 });
    this.featureScalers.set('temperature_variation', { mean: 5, std: 3 });
  }

  async predictRisk(input: RiskPredictionInput): Promise<RiskPrediction> {
    const startTime = Date.now();

    try {
      // Extract features from sensor data
      const features = this.extractFeatures(input);

      // Normalize features
      const normalizedFeatures = this.normalizeFeatures(features);

      // Calculate risk probability using ensemble approach
      const riskProbability = this.calculateRiskProbability(normalizedFeatures);

      // Calculate confidence interval
      const confidenceInterval = this.calculateConfidenceInterval(normalizedFeatures, riskProbability);

      // Estimate time to failure
      const timeToFailure = this.estimateTimeToFailure(normalizedFeatures, riskProbability);

      // Identify contributing factors
      const contributingFactors = this.identifyContributingFactors(normalizedFeatures);

      // Generate model explanation
      const explanation = await this.generateExplanation(normalizedFeatures, riskProbability);

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Risk prediction completed in ${processingTime}ms`);

      return {
        risk_probability: riskProbability,
        confidence_interval: confidenceInterval,
        time_to_failure_hours: timeToFailure,
        contributing_factors: contributingFactors,
        explanation
      };

    } catch (error) {
      this.logger.error('Error in risk prediction:', error);
      throw error;
    }
  }

  private extractFeatures(input: RiskPredictionInput): Map<string, number> {
    const features = new Map<string, number>();

    // Extract temporal features from sensor data
    const displacementReadings = input.sensor_data
      .filter(sensor => sensor.measurements.displacement !== undefined)
      .map(sensor => sensor.measurements.displacement);

    if (displacementReadings.length > 1) {
      // Calculate displacement rate (simplified)
      const displacementRate = this.calculateRate(displacementReadings);
      features.set('displacement_rate', displacementRate);

      // Calculate acceleration
      const acceleration = this.calculateAcceleration(displacementReadings);
      features.set('acceleration', acceleration);
    }

    // Extract pore pressure features
    const porePressureReadings = input.sensor_data
      .filter(sensor => sensor.measurements.pore_pressure !== undefined)
      .map(sensor => sensor.measurements.pore_pressure);

    if (porePressureReadings.length > 0) {
      const avgPorePressure = porePressureReadings.reduce((a, b) => a + b, 0) / porePressureReadings.length;
      features.set('pore_pressure', avgPorePressure);
    }

    // Extract environmental features
    if (this.environmentalContext) {
      features.set('rainfall_accumulation', this.environmentalContext.rainfall_mm);
      features.set('temperature_variation', Math.abs(this.environmentalContext.temperature_c - 20)); // Deviation from 20°C
    }

    // Extract spatial features
    const slopeAngles = input.spatial_context.slope_segments.map(segment => segment.slope_angle);
    if (slopeAngles.length > 0) {
      const maxSlopeAngle = Math.max(...slopeAngles);
      features.set('max_slope_angle', maxSlopeAngle);
    }

    return features;
  }

  private normalizeFeatures(features: Map<string, number>): Map<string, number> {
    const normalized = new Map<string, number>();

    for (const [featureName, value] of features) {
      const scaler = this.featureScalers.get(featureName);
      if (scaler) {
        const normalizedValue = (value - scaler.mean) / scaler.std;
        normalized.set(featureName, normalizedValue);
      } else {
        normalized.set(featureName, value);
      }
    }

    return normalized;
  }

  private calculateRiskProbability(features: Map<string, number>): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [featureName, value] of features) {
      const weight = this.modelWeights.get(featureName) || 0.1;
      weightedSum += value * weight;
      totalWeight += weight;
    }

    // Apply sigmoid activation to get probability
    const logit = weightedSum / totalWeight;
    const probability = 1 / (1 + Math.exp(-logit));

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, probability));
  }

  private calculateConfidenceInterval(features: Map<string, number>, riskProbability: number): [number, number] {
    // Simplified confidence calculation based on feature uncertainty
    const featureUncertainty = this.calculateFeatureUncertainty(features);
    const confidenceWidth = featureUncertainty * 0.2; // 20% of uncertainty as confidence width

    const lowerBound = Math.max(0, riskProbability - confidenceWidth);
    const upperBound = Math.min(1, riskProbability + confidenceWidth);

    return [lowerBound, upperBound];
  }

  private estimateTimeToFailure(features: Map<string, number>, riskProbability: number): number | undefined {
    if (riskProbability < 0.3) {
      return undefined; // No meaningful time to failure for low risk
    }

    const displacementRate = Math.abs(features.get('displacement_rate') || 0);
    const acceleration = Math.abs(features.get('acceleration') || 0);

    // Always provide time to failure for high risk scenarios
    if (riskProbability > 0.5) {
      // Simplified time to failure calculation
      // In real implementation, use physics-based models
      const criticalDisplacement = 10; // mm
      const currentRate = Math.max(displacementRate, 0.1);
      
      let timeToFailure: number;
      if (acceleration > 0.01) {
        // Accelerating displacement
        timeToFailure = Math.sqrt(2 * criticalDisplacement / acceleration);
      } else {
        // Constant rate displacement
        timeToFailure = criticalDisplacement / currentRate;
      }

      // Convert to hours and apply uncertainty
      return Math.max(1, timeToFailure * 24); // Minimum 1 hour
    }

    return undefined;
  }

  private identifyContributingFactors(features: Map<string, number>): string[] {
    const factors: string[] = [];

    // Identify significant contributing factors
    for (const [featureName, value] of features) {
      const weight = this.modelWeights.get(featureName) || 0;
      const contribution = Math.abs(value * weight);

      if (contribution > 0.1) { // Threshold for significance
        factors.push(this.getFactorDescription(featureName, value));
      }
    }

    return factors.sort((a, b) => b.length - a.length); // Sort by description length (proxy for importance)
  }

  private getFactorDescription(featureName: string, value: number): string {
    const descriptions: Record<string, (val: number) => string> = {
      'displacement_rate': (val) => val > 0 ? `Increasing displacement rate (${val.toFixed(2)} mm/day)` : 'Stable displacement',
      'acceleration': (val) => val > 0 ? `Accelerating movement (${val.toFixed(3)} mm/day²)` : 'Constant movement rate',
      'pore_pressure': (val) => val > 1 ? `Elevated pore pressure (${val.toFixed(1)} kPa)` : 'Normal pore pressure',
      'rainfall_accumulation': (val) => val > 1 ? `Recent rainfall (${val.toFixed(1)} mm)` : 'Dry conditions',
      'temperature_variation': (val) => val > 1 ? `Temperature fluctuations (±${val.toFixed(1)}°C)` : 'Stable temperature'
    };

    const descriptionFn = descriptions[featureName];
    return descriptionFn ? descriptionFn(value) : `${featureName}: ${value.toFixed(2)}`;
  }

  private async generateExplanation(features: Map<string, number>, riskProbability: number): Promise<ModelExplanation> {
    // Calculate feature importance (SHAP-like values)
    const featureImportance: Record<string, number> = {};
    const shapValues: Record<string, number> = {};

    for (const [featureName, value] of features) {
      const weight = this.modelWeights.get(featureName) || 0;
      const importance = Math.abs(value * weight);
      featureImportance[featureName] = importance;
      shapValues[featureName] = value * weight; // Simplified SHAP value
    }

    // Generate natural language explanation
    const naturalLanguageExplanation = this.generateNaturalLanguageExplanation(features, riskProbability);

    // Identify confidence factors
    const confidenceFactors = this.identifyConfidenceFactors(features);

    // Identify uncertainty sources
    const uncertaintySources = this.identifyUncertaintySources(features);

    return {
      feature_importance: featureImportance,
      shap_values: shapValues,
      lime_explanation: 'LIME explanation would be generated here', // Placeholder
      natural_language_explanation: naturalLanguageExplanation,
      confidence_factors: confidenceFactors,
      uncertainty_sources: uncertaintySources
    };
  }

  private generateNaturalLanguageExplanation(features: Map<string, number>, riskProbability: number): string {
    const riskLevel = riskProbability > 0.7 ? 'high' : riskProbability > 0.4 ? 'moderate' : 'low';
    
    let explanation = `The model predicts a ${riskLevel} risk of rockfall (${(riskProbability * 100).toFixed(1)}% probability). `;

    // Add key contributing factors
    const topFactors = Array.from(features.entries())
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 3);

    if (topFactors.length > 0) {
      explanation += 'Key factors include: ';
      explanation += topFactors.map(([name, value]) => 
        this.getFactorDescription(name, value)
      ).join(', ');
      explanation += '. ';
    }

    // Add recommendations based on risk level
    if (riskProbability > 0.7) {
      explanation += 'Immediate action recommended: evacuate personnel and restrict access to the area.';
    } else if (riskProbability > 0.4) {
      explanation += 'Increased monitoring recommended with potential access restrictions.';
    } else {
      explanation += 'Continue routine monitoring with current protocols.';
    }

    return explanation;
  }

  private identifyConfidenceFactors(features: Map<string, number>): string[] {
    const factors: string[] = [];

    // High confidence factors
    if (features.has('displacement_rate') && features.has('acceleration')) {
      factors.push('Multiple displacement measurements available');
    }
    if (features.has('pore_pressure')) {
      factors.push('Pore pressure data available');
    }
    if (this.environmentalContext) {
      factors.push('Environmental context included');
    }

    return factors;
  }

  private identifyUncertaintySources(features: Map<string, number>): string[] {
    const sources: string[] = [];

    // Uncertainty sources
    if (!features.has('displacement_rate')) {
      sources.push('Limited displacement data');
    }
    if (!features.has('pore_pressure')) {
      sources.push('No pore pressure measurements');
    }
    if (!this.environmentalContext) {
      sources.push('Missing environmental data');
    }

    return sources;
  }

  private calculateRate(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression for rate calculation
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private calculateAcceleration(values: number[]): number {
    if (values.length < 3) return 0;

    // Calculate second derivative (acceleration)
    const rates: number[] = [];
    for (let i = 1; i < values.length; i++) {
      rates.push(values[i] - values[i - 1]);
    }

    return this.calculateRate(rates);
  }

  private calculateFeatureUncertainty(features: Map<string, number>): number {
    // Simplified uncertainty calculation
    const uncertainties: number[] = [];

    for (const [featureName, value] of features) {
      const scaler = this.featureScalers.get(featureName);
      if (scaler) {
        // Uncertainty based on how far from mean the value is
        const normalizedDistance = Math.abs(value - scaler.mean) / scaler.std;
        uncertainties.push(normalizedDistance);
      }
    }

    return uncertainties.length > 0 
      ? uncertainties.reduce((a, b) => a + b, 0) / uncertainties.length 
      : 0.5; // Default uncertainty
  }

  async updateEnvironmentalContext(environmentalData: EnvironmentalData): Promise<void> {
    this.environmentalContext = environmentalData;
    this.logger.debug('Updated environmental context for risk prediction');
  }

  // Model performance monitoring
  public getModelMetrics(): {
    lastPredictionTime?: Date;
    averageProcessingTime: number;
    featureCount: number;
  } {
    return {
      averageProcessingTime: 0, // Track in real implementation
      featureCount: this.modelWeights.size
    };
  }
}