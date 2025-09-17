import { ExplainableAI, ExplanationRequest, ExplanationResult, NaturalLanguageExplanation } from './ExplainableAI';
import { ModelPipeline } from './ModelPipeline';
import { BaseModel, TrainingData } from './BaselineModels';

export interface ExplanationServiceConfig {
  default_explanation_type: 'shap' | 'lime' | 'both';
  num_lime_samples: number;
  cache_explanations: boolean;
  max_cache_size: number;
}

export interface BatchExplanationRequest {
  instances: number[][];
  feature_names: string[];
  model_name: string;
  explanation_type?: 'shap' | 'lime' | 'both';
}

export interface BatchExplanationResult {
  explanations: ExplanationResult[];
  summary_statistics: {
    avg_risk_level: string;
    most_important_features: string[];
    confidence_distribution: { [key: string]: number };
  };
}

export interface ExplanationCache {
  [key: string]: {
    result: ExplanationResult;
    timestamp: number;
    access_count: number;
  };
}

/**
 * Service for managing explainable AI functionality across the PRISM system
 */
export class ExplanationService {
  private explainableAI: ExplainableAI;
  private modelPipeline: ModelPipeline;
  private config: ExplanationServiceConfig;
  private explanationCache: ExplanationCache = {};
  private backgroundData?: TrainingData;

  constructor(
    modelPipeline: ModelPipeline,
    config: ExplanationServiceConfig = {
      default_explanation_type: 'shap',
      num_lime_samples: 1000,
      cache_explanations: true,
      max_cache_size: 100
    }
  ) {
    this.explainableAI = new ExplainableAI();
    this.modelPipeline = modelPipeline;
    this.config = config;
  }

  /**
   * Set background data for SHAP explanations
   */
  public setBackgroundData(data: TrainingData): void {
    this.backgroundData = data;
  }

  /**
   * Explain a single prediction
   */
  public async explainPrediction(
    modelName: string,
    instance: number[],
    featureNames: string[],
    explanationType?: 'shap' | 'lime' | 'both'
  ): Promise<ExplanationResult> {
    // Check cache first
    const cacheKey = this.generateCacheKey(modelName, instance, explanationType);
    if (this.config.cache_explanations && this.explanationCache[cacheKey]) {
      const cached = this.explanationCache[cacheKey];
      cached.access_count++;
      return cached.result;
    }

    // Get model from pipeline
    const model = await this.getModel(modelName);
    
    // Create explanation request
    const request: ExplanationRequest = {
      model,
      instance,
      feature_names: featureNames,
      background_data: this.backgroundData || undefined,
      explanation_type: explanationType || this.config.default_explanation_type,
      num_samples: this.config.num_lime_samples
    };

    // Generate explanation
    const result = await this.explainableAI.explainPrediction(request);

    // Cache result if enabled
    if (this.config.cache_explanations) {
      this.cacheExplanation(cacheKey, result);
    }

    return result;
  }

  /**
   * Explain multiple predictions in batch
   */
  public async explainBatch(request: BatchExplanationRequest): Promise<BatchExplanationResult> {
    const explanations: ExplanationResult[] = [];
    
    // Process each instance
    for (const instance of request.instances) {
      try {
        const explanation = await this.explainPrediction(
          request.model_name,
          instance,
          request.feature_names,
          request.explanation_type
        );
        explanations.push(explanation);
      } catch (error) {
        console.error('Failed to explain instance:', error);
        // Continue with other instances
      }
    }

    // Generate summary statistics
    const summaryStats = this.generateSummaryStatistics(explanations);

    return {
      explanations,
      summary_statistics: summaryStats
    };
  }

  /**
   * Get ensemble explanation combining multiple models
   */
  public async explainEnsemble(
    instance: number[],
    featureNames: string[],
    modelNames: string[]
  ): Promise<{
    ensemble_explanation: ExplanationResult;
    individual_explanations: { [modelName: string]: ExplanationResult };
  }> {
    const individualExplanations: { [modelName: string]: ExplanationResult } = {};
    
    // Get explanations from each model
    for (const modelName of modelNames) {
      try {
        const explanation = await this.explainPrediction(modelName, instance, featureNames);
        individualExplanations[modelName] = explanation;
      } catch (error) {
        console.error(`Failed to explain with model ${modelName}:`, error);
      }
    }

    // Create ensemble explanation by averaging feature attributions
    const ensembleExplanation = this.combineExplanations(
      Object.values(individualExplanations),
      featureNames,
      instance
    );

    return {
      ensemble_explanation: ensembleExplanation,
      individual_explanations: individualExplanations
    };
  }

  /**
   * Generate natural language explanation for operational context
   */
  public async generateOperationalExplanation(
    modelName: string,
    instance: number[],
    featureNames: string[],
    operationalContext: {
      location: string;
      current_operations: string[];
      personnel_count: number;
      equipment_value: number;
    }
  ): Promise<{
    explanation: ExplanationResult;
    operational_impact: {
      personnel_risk: string;
      equipment_risk: string;
      operational_recommendations: string[];
      estimated_cost_impact: number;
    };
  }> {
    // Get base explanation
    const explanation = await this.explainPrediction(modelName, instance, featureNames);
    
    // Generate operational impact assessment
    const operationalImpact = this.assessOperationalImpact(
      explanation.natural_language_explanation,
      operationalContext
    );

    return {
      explanation,
      operational_impact: operationalImpact
    };
  }

  /**
   * Get feature importance trends over time
   */
  public async analyzeFeatureImportanceTrends(
    modelName: string,
    timeSeriesData: { timestamp: Date; features: number[] }[],
    featureNames: string[]
  ): Promise<{
    feature_trends: { [featureName: string]: { timestamps: Date[]; importance_values: number[] } };
    trend_analysis: string[];
    risk_evolution: { timestamp: Date; risk_level: string; key_factors: string[] }[];
  }> {
    const featureTrends: { [featureName: string]: { timestamps: Date[]; importance_values: number[] } } = {};
    const riskEvolution: { timestamp: Date; risk_level: string; key_factors: string[] }[] = [];
    
    // Initialize trend tracking
    featureNames.forEach(name => {
      featureTrends[name] = { timestamps: [], importance_values: [] };
    });

    // Analyze each time point
    for (const dataPoint of timeSeriesData) {
      try {
        const explanation = await this.explainPrediction(modelName, dataPoint.features, featureNames);
        
        // Track feature importance over time
        explanation.shap_explanation?.feature_attributions.forEach(attr => {
          if (featureTrends[attr.feature_name]) {
            featureTrends[attr.feature_name].timestamps.push(dataPoint.timestamp);
            featureTrends[attr.feature_name].importance_values.push(attr.importance);
          }
        });

        // Track risk evolution
        riskEvolution.push({
          timestamp: dataPoint.timestamp,
          risk_level: explanation.natural_language_explanation.risk_level,
          key_factors: explanation.natural_language_explanation.key_factors.slice(0, 3)
        });
      } catch (error) {
        console.error('Failed to analyze time point:', error);
      }
    }

    // Generate trend analysis
    const trendAnalysis = this.generateTrendAnalysis(featureTrends, riskEvolution);

    return {
      feature_trends: featureTrends,
      trend_analysis: trendAnalysis,
      risk_evolution: riskEvolution
    };
  }

  /**
   * Clear explanation cache
   */
  public clearCache(): void {
    this.explanationCache = {};
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hit_rate: number;
    most_accessed: string[];
  } {
    const entries = Object.entries(this.explanationCache);
    const totalAccess = entries.reduce((sum, [_, entry]) => sum + entry.access_count, 0);
    const hitRate = totalAccess > 0 ? entries.length / totalAccess : 0;
    
    const mostAccessed = entries
      .sort((a, b) => b[1].access_count - a[1].access_count)
      .slice(0, 5)
      .map(([key, _]) => key);

    return {
      size: entries.length,
      hit_rate: hitRate,
      most_accessed: mostAccessed
    };
  }

  /**
   * Private helper methods
   */
  private async getModel(modelName: string): Promise<BaseModel> {
    // Try to get model from pipeline
    try {
      await this.modelPipeline.predict(modelName, [0]); // Test prediction
      
      // Create a wrapper class that extends BaseModel
      class ModelPipelineWrapper extends BaseModel {
        constructor(private pipeline: ModelPipeline, private name: string) {
          super();
          this.trained = true;
          this.feature_names = [];
        }
        
        async predict(features: number[]) {
          return this.pipeline.predict(this.name, features);
        }
        
        async train(): Promise<void> {
          throw new Error('Training not supported through pipeline wrapper');
        }
        
        async evaluate(): Promise<any> {
          throw new Error('Evaluation not supported through pipeline wrapper');
        }
      }
      
      return new ModelPipelineWrapper(this.modelPipeline, modelName);
    } catch (error) {
      throw new Error(`Model ${modelName} not found in pipeline`);
    }
  }

  private generateCacheKey(
    modelName: string,
    instance: number[],
    explanationType?: string
  ): string {
    const instanceHash = instance.map(x => x.toFixed(4)).join(',');
    return `${modelName}_${explanationType || 'default'}_${instanceHash}`;
  }

  private cacheExplanation(key: string, result: ExplanationResult): void {
    // Remove oldest entries if cache is full
    if (Object.keys(this.explanationCache).length >= this.config.max_cache_size) {
      const oldestKey = Object.entries(this.explanationCache)
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      delete this.explanationCache[oldestKey];
    }

    this.explanationCache[key] = {
      result,
      timestamp: Date.now(),
      access_count: 1
    };
  }

  private generateSummaryStatistics(explanations: ExplanationResult[]): {
    avg_risk_level: string;
    most_important_features: string[];
    confidence_distribution: { [key: string]: number };
  } {
    if (explanations.length === 0) {
      return {
        avg_risk_level: 'Unknown',
        most_important_features: [],
        confidence_distribution: {}
      };
    }

    // Calculate average risk level
    const riskLevels = explanations.map(e => e.natural_language_explanation.risk_level);
    const riskCounts = riskLevels.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    const avgRiskLevel = Object.entries(riskCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Find most important features across all explanations
    const featureImportance: { [feature: string]: number } = {};
    explanations.forEach(explanation => {
      const attributions = explanation.shap_explanation?.feature_attributions || 
                          explanation.lime_explanation?.feature_attributions || [];
      attributions.forEach(attr => {
        featureImportance[attr.feature_name] = 
          (featureImportance[attr.feature_name] || 0) + attr.importance;
      });
    });

    const mostImportantFeatures = Object.entries(featureImportance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature, _]) => feature);

    // Calculate confidence distribution
    const confidenceDistribution: { [key: string]: number } = {
      'High': 0,
      'Medium': 0,
      'Low': 0
    };

    explanations.forEach(explanation => {
      const confidence = explanation.natural_language_explanation.confidence_description;
      if (confidence.includes('High')) confidenceDistribution['High']++;
      else if (confidence.includes('Moderate')) confidenceDistribution['Medium']++;
      else confidenceDistribution['Low']++;
    });

    return {
      avg_risk_level: avgRiskLevel,
      most_important_features: mostImportantFeatures,
      confidence_distribution: confidenceDistribution
    };
  }

  private combineExplanations(
    explanations: ExplanationResult[],
    _featureNames: string[],
    _instance: number[]
  ): ExplanationResult {
    if (explanations.length === 0) {
      throw new Error('No explanations to combine');
    }

    // Average the feature attributions
    const combinedAttributions: { [feature: string]: { importance: number; contribution: number; confidence: number } } = {};
    
    explanations.forEach(explanation => {
      const attributions = explanation.shap_explanation?.feature_attributions || 
                          explanation.lime_explanation?.feature_attributions || [];
      attributions.forEach(attr => {
        if (!combinedAttributions[attr.feature_name]) {
          combinedAttributions[attr.feature_name] = { importance: 0, contribution: 0, confidence: 0 };
        }
        combinedAttributions[attr.feature_name].importance += attr.importance / explanations.length;
        combinedAttributions[attr.feature_name].contribution += attr.contribution / explanations.length;
        combinedAttributions[attr.feature_name].confidence += attr.confidence / explanations.length;
      });
    });

    // Create combined explanation
    const avgPrediction = explanations.reduce((sum, e) => {
      return sum + (e.shap_explanation?.prediction || e.lime_explanation?.prediction || 0);
    }, 0) / explanations.length;

    // Use the first explanation as template and update with combined values
    const template = explanations[0];
    
    return {
      ...template,
      natural_language_explanation: {
        ...template.natural_language_explanation,
        summary: `Ensemble prediction: ${Math.round(avgPrediction * 100)}% risk probability based on ${explanations.length} models`,
        technical_details: `Combined explanation from ${explanations.length} models using weighted averaging`
      }
    };
  }

  private assessOperationalImpact(
    explanation: NaturalLanguageExplanation,
    context: {
      location: string;
      current_operations: string[];
      personnel_count: number;
      equipment_value: number;
    }
  ): {
    personnel_risk: string;
    equipment_risk: string;
    operational_recommendations: string[];
    estimated_cost_impact: number;
  } {
    const riskMultiplier = {
      'Low': 0.1,
      'Medium': 0.3,
      'High': 0.6,
      'Critical': 0.9
    }[explanation.risk_level] || 0.5;

    const personnelRisk = context.personnel_count > 10 ? 
      `High risk to ${context.personnel_count} personnel` :
      `Moderate risk to ${context.personnel_count} personnel`;

    const equipmentRisk = context.equipment_value > 1000000 ?
      `Significant equipment at risk (${context.equipment_value.toLocaleString()})` :
      `Equipment at risk (${context.equipment_value.toLocaleString()})`;

    const operationalRecommendations = [
      ...explanation.recommendations,
      `Coordinate with ${context.current_operations.join(', ')} operations`,
      `Establish safety perimeter around ${context.location}`
    ];

    const estimatedCostImpact = context.equipment_value * riskMultiplier + 
                               context.personnel_count * 10000 * riskMultiplier; // $10k per person risk

    return {
      personnel_risk: personnelRisk,
      equipment_risk: equipmentRisk,
      operational_recommendations: operationalRecommendations,
      estimated_cost_impact: estimatedCostImpact
    };
  }

  private generateTrendAnalysis(
    featureTrends: { [featureName: string]: { timestamps: Date[]; importance_values: number[] } },
    riskEvolution: { timestamp: Date; risk_level: string; key_factors: string[] }[]
  ): string[] {
    const analysis: string[] = [];

    // Analyze feature trends
    Object.entries(featureTrends).forEach(([feature, trend]) => {
      if (trend.importance_values.length > 1) {
        const firstValue = trend.importance_values[0];
        const lastValue = trend.importance_values[trend.importance_values.length - 1];
        const change = ((lastValue - firstValue) / firstValue) * 100;
        
        if (Math.abs(change) > 20) {
          analysis.push(`${feature} importance has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`);
        }
      }
    });

    // Analyze risk evolution
    if (riskEvolution.length > 1) {
      const firstRisk = riskEvolution[0].risk_level;
      const lastRisk = riskEvolution[riskEvolution.length - 1].risk_level;
      
      if (firstRisk !== lastRisk) {
        analysis.push(`Risk level has changed from ${firstRisk} to ${lastRisk}`);
      }
    }

    return analysis;
  }
}