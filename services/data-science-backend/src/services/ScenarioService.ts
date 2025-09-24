import { 
  Scenario, 
  ScenarioResults, 
  ScenarioCondition, 
  RiskAssessment, 
  SensitivityAnalysis,
  PredictionResult,
  ValidationResult,
  ValidationError 
} from '../types';
import { aiPipelineClient } from './aiPipelineClient';
import { logger } from '../utils/logger';

/**
 * Service for managing scenario planning and execution
 */
export class ScenarioService {
  private scenarios: Map<string, Scenario> = new Map();
  private scenarioResults: Map<string, ScenarioResults> = new Map();

  /**
   * Create a new scenario
   */
  async createScenario(scenarioData: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scenario> {
    const validation = this.validateScenario(scenarioData);
    if (!validation.isValid) {
      throw new Error(`Scenario validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const scenario: Scenario = {
      ...scenarioData,
      id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.scenarios.set(scenario.id, scenario);
    
    logger.info('Scenario created:', {
      scenarioId: scenario.id,
      name: scenario.name,
      modelId: scenario.modelId
    });

    return scenario;
  }

  /**
   * Execute a scenario and generate results
   */
  async executeScenario(scenarioId: string): Promise<{ jobId: string; estimatedDuration: number }> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    logger.info('Executing scenario:', {
      scenarioId,
      name: scenario.name,
      modelId: scenario.modelId
    });

    // Prepare scenario configuration for AI pipeline
    const scenarioConfig = {
      scenarioId,
      modelId: scenario.modelId,
      parameters: scenario.parameters,
      conditions: scenario.conditions,
      analysisType: 'comprehensive' // Include risk assessment and sensitivity analysis
    };

    try {
      const result = await aiPipelineClient.executeScenario(scenarioConfig);
      
      logger.info('Scenario execution started:', {
        scenarioId,
        jobId: result.jobId,
        estimatedDuration: result.estimatedDuration
      });

      return result;
    } catch (error: any) {
      logger.error('Scenario execution failed:', {
        scenarioId,
        error: error.message
      });
      throw new Error(`Failed to execute scenario: ${error.message}`);
    }
  }

  /**
   * Get scenario execution results
   */
  async getScenarioResults(jobId: string): Promise<ScenarioResults> {
    try {
      const rawResults = await aiPipelineClient.getScenarioResults(jobId);
      
      // Process and enhance the results
      const scenarioResults: ScenarioResults = {
        scenarioId: rawResults.scenarioId,
        predictions: this.processPredictions(rawResults.predictions),
        riskAssessment: this.calculateRiskAssessment(rawResults),
        confidence: rawResults.confidence || 0.85,
        sensitivity: this.performSensitivityAnalysis(rawResults),
        recommendations: this.generateRecommendations(rawResults),
        executedAt: new Date()
      };

      // Cache the results
      this.scenarioResults.set(scenarioResults.scenarioId, scenarioResults);

      logger.info('Scenario results processed:', {
        scenarioId: scenarioResults.scenarioId,
        predictionsCount: scenarioResults.predictions.length,
        overallRisk: scenarioResults.riskAssessment.overallRisk
      });

      return scenarioResults;
    } catch (error: any) {
      logger.error('Failed to get scenario results:', {
        jobId,
        error: error.message
      });
      throw new Error(`Failed to retrieve scenario results: ${error.message}`);
    }
  }

  /**
   * Get scenario by ID
   */
  getScenario(scenarioId: string): Scenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  /**
   * List scenarios with optional filtering
   */
  listScenarios(filters?: { modelId?: string; name?: string }): Scenario[] {
    let scenarios = Array.from(this.scenarios.values());

    if (filters?.modelId) {
      scenarios = scenarios.filter(s => s.modelId === filters.modelId);
    }

    if (filters?.name) {
      scenarios = scenarios.filter(s => 
        s.name.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }

    return scenarios.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Update scenario
   */
  async updateScenario(scenarioId: string, updates: Partial<Omit<Scenario, 'id' | 'createdAt'>>): Promise<Scenario> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const updatedScenario: Scenario = {
      ...scenario,
      ...updates,
      updatedAt: new Date()
    };

    // Validate the updated scenario
    const validation = this.validateScenario(updatedScenario);
    if (!validation.isValid) {
      throw new Error(`Scenario validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.scenarios.set(scenarioId, updatedScenario);

    logger.info('Scenario updated:', {
      scenarioId,
      updates: Object.keys(updates)
    });

    return updatedScenario;
  }

  /**
   * Delete scenario
   */
  deleteScenario(scenarioId: string): boolean {
    const deleted = this.scenarios.delete(scenarioId);
    this.scenarioResults.delete(scenarioId);

    if (deleted) {
      logger.info('Scenario deleted:', { scenarioId });
    }

    return deleted;
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(scenarioIds: string[]): Promise<{
    scenarios: Scenario[];
    results: ScenarioResults[];
    comparison: {
      riskLevels: { [scenarioId: string]: string };
      confidenceScores: { [scenarioId: string]: number };
      recommendations: { [scenarioId: string]: string[] };
      bestScenario: string;
      worstScenario: string;
    };
  }> {
    const scenarios = scenarioIds.map(id => this.scenarios.get(id)).filter(Boolean) as Scenario[];
    const results = scenarioIds.map(id => this.scenarioResults.get(id)).filter(Boolean) as ScenarioResults[];

    if (scenarios.length !== scenarioIds.length) {
      throw new Error('Some scenarios not found');
    }

    // Calculate comparison metrics
    const riskLevels: { [scenarioId: string]: string } = {};
    const confidenceScores: { [scenarioId: string]: number } = {};
    const recommendations: { [scenarioId: string]: string[] } = {};

    results.forEach(result => {
      riskLevels[result.scenarioId] = result.riskAssessment.overallRisk;
      confidenceScores[result.scenarioId] = result.confidence;
      recommendations[result.scenarioId] = result.recommendations;
    });

    // Find best and worst scenarios based on risk and confidence
    const sortedByRisk = results.sort((a, b) => {
      const riskOrder = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
      return riskOrder[a.riskAssessment.overallRisk] - riskOrder[b.riskAssessment.overallRisk];
    });

    const bestScenario = sortedByRisk[0]?.scenarioId || '';
    const worstScenario = sortedByRisk[sortedByRisk.length - 1]?.scenarioId || '';

    return {
      scenarios,
      results,
      comparison: {
        riskLevels,
        confidenceScores,
        recommendations,
        bestScenario,
        worstScenario
      }
    };
  }

  /**
   * Generate scenario template based on model parameters
   */
  async generateScenarioTemplate(modelId: string): Promise<{
    parameters: { [key: string]: any };
    suggestedConditions: ScenarioCondition[];
    parameterRanges: { [key: string]: { min: any; max: any; default: any } };
  }> {
    try {
      // Get model information to understand available parameters
      const modelAnalytics = await aiPipelineClient.getModelAnalytics(modelId);
      
      const parameters: { [key: string]: any } = {};
      const suggestedConditions: ScenarioCondition[] = [];
      const parameterRanges: { [key: string]: { min: any; max: any; default: any } } = {};

      // Extract feature information from model analytics
      if (modelAnalytics.featureImportance) {
        Object.keys(modelAnalytics.featureImportance).forEach(feature => {
          const importance = modelAnalytics.featureImportance[feature];
          
          // Set default parameter values
          parameters[feature] = 0;
          
          // Create parameter ranges based on data distributions
          if (modelAnalytics.dataDistributions?.numerical?.[feature]) {
            const stats = modelAnalytics.dataDistributions.numerical[feature].statistics;
            parameterRanges[feature] = {
              min: stats.mean - 2 * stats.std,
              max: stats.mean + 2 * stats.std,
              default: stats.mean
            };
            parameters[feature] = stats.mean;
          } else {
            parameterRanges[feature] = {
              min: 0,
              max: 100,
              default: 50
            };
            parameters[feature] = 50;
          }

          // Suggest conditions for important features
          if (importance > 0.1) {
            suggestedConditions.push({
              parameter: feature,
              operator: 'greater_than',
              value: parameters[feature],
              weight: importance
            });
          }
        });
      }

      return {
        parameters,
        suggestedConditions,
        parameterRanges
      };
    } catch (error: any) {
      logger.error('Failed to generate scenario template:', {
        modelId,
        error: error.message
      });
      throw new Error(`Failed to generate scenario template: ${error.message}`);
    }
  }

  /**
   * Validate scenario data
   */
  private validateScenario(scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!scenario.name || scenario.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Scenario name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!scenario.modelId || scenario.modelId.trim().length === 0) {
      errors.push({
        field: 'modelId',
        message: 'Model ID is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!scenario.parameters || Object.keys(scenario.parameters).length === 0) {
      errors.push({
        field: 'parameters',
        message: 'At least one parameter is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Validate conditions
    scenario.conditions?.forEach((condition, index) => {
      if (!condition.parameter) {
        errors.push({
          field: `conditions[${index}].parameter`,
          message: 'Condition parameter is required',
          code: 'REQUIRED_FIELD'
        });
      }

      if (!['equals', 'greater_than', 'less_than', 'between'].includes(condition.operator)) {
        errors.push({
          field: `conditions[${index}].operator`,
          message: 'Invalid condition operator',
          code: 'INVALID_VALUE'
        });
      }

      if (condition.value === undefined || condition.value === null) {
        errors.push({
          field: `conditions[${index}].value`,
          message: 'Condition value is required',
          code: 'REQUIRED_FIELD'
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process raw predictions into structured format
   */
  private processPredictions(rawPredictions: any[]): PredictionResult[] {
    return rawPredictions.map((pred, index) => ({
      id: `pred_${Date.now()}_${index}`,
      input: pred.input || {},
      prediction: pred.prediction,
      confidence: pred.confidence || 0.5,
      probability: pred.probability,
      timestamp: new Date()
    }));
  }

  /**
   * Calculate risk assessment from scenario results
   */
  private calculateRiskAssessment(rawResults: any): RiskAssessment {
    const predictions = rawResults.predictions || [];
    const avgPrediction = predictions.reduce((sum: number, pred: any) => sum + (pred.prediction || 0), 0) / predictions.length;
    
    // Determine risk level based on prediction values
    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    let riskScore: number;

    if (avgPrediction < 0.3) {
      overallRisk = 'low';
      riskScore = avgPrediction;
    } else if (avgPrediction < 0.6) {
      overallRisk = 'medium';
      riskScore = avgPrediction;
    } else if (avgPrediction < 0.8) {
      overallRisk = 'high';
      riskScore = avgPrediction;
    } else {
      overallRisk = 'critical';
      riskScore = avgPrediction;
    }

    // Extract risk factors from feature importance
    const factors = Object.entries(rawResults.featureImportance || {}).map(([factor, impact]) => ({
      factor,
      impact: impact as number,
      confidence: 0.8 // Default confidence
    }));

    return {
      overallRisk,
      riskScore,
      factors,
      recommendations: this.generateRiskRecommendations(overallRisk, factors),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
    };
  }

  /**
   * Perform sensitivity analysis
   */
  private performSensitivityAnalysis(rawResults: any): SensitivityAnalysis {
    const parameters = Object.keys(rawResults.parameters || {});
    const baseValue = rawResults.basePrediction || 0.5;

    const analysisParams = parameters.map(param => {
      const currentValue = rawResults.parameters[param];
      const testValues = [
        currentValue * 0.8,
        currentValue * 0.9,
        currentValue,
        currentValue * 1.1,
        currentValue * 1.2
      ];

      // Simulate impact (in real implementation, this would come from the AI pipeline)
      const impacts = testValues.map(value => {
        const deviation = Math.abs(value - currentValue) / currentValue;
        return baseValue + (Math.random() - 0.5) * deviation;
      });

      return {
        parameter: param,
        baseValue: currentValue,
        testValues,
        impacts
      };
    });

    // Find most sensitive parameters
    const mostSensitiveParameters = analysisParams
      .sort((a, b) => {
        const aVariance = Math.max(...a.impacts) - Math.min(...a.impacts);
        const bVariance = Math.max(...b.impacts) - Math.min(...b.impacts);
        return bVariance - aVariance;
      })
      .slice(0, 3)
      .map(p => p.parameter);

    // Calculate stability score
    const totalVariance = analysisParams.reduce((sum, param) => {
      const variance = Math.max(...param.impacts) - Math.min(...param.impacts);
      return sum + variance;
    }, 0);
    const stabilityScore = Math.max(0, 1 - totalVariance / parameters.length);

    return {
      parameters: analysisParams,
      mostSensitiveParameters,
      stabilityScore
    };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(rawResults: any): string[] {
    const recommendations: string[] = [];
    const avgPrediction = rawResults.predictions?.reduce((sum: number, pred: any) => sum + (pred.prediction || 0), 0) / (rawResults.predictions?.length || 1);

    if (avgPrediction > 0.7) {
      recommendations.push('High risk detected. Consider implementing additional safety measures.');
      recommendations.push('Monitor key risk factors more frequently.');
    } else if (avgPrediction > 0.4) {
      recommendations.push('Moderate risk level. Review current safety protocols.');
      recommendations.push('Consider preventive maintenance in high-risk areas.');
    } else {
      recommendations.push('Risk level is acceptable under current conditions.');
      recommendations.push('Continue regular monitoring and maintenance schedules.');
    }

    // Add feature-specific recommendations
    if (rawResults.featureImportance) {
      const topFeatures = Object.entries(rawResults.featureImportance)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 2);

      topFeatures.forEach(([feature, importance]) => {
        recommendations.push(`Pay special attention to ${feature} (${((importance as number) * 100).toFixed(1)}% impact on risk).`);
      });
    }

    return recommendations;
  }

  /**
   * Generate risk-specific recommendations
   */
  private generateRiskRecommendations(riskLevel: string, _factors: any[]): string[] {
    const recommendations: string[] = [];

    switch (riskLevel) {
      case 'critical':
        recommendations.push('IMMEDIATE ACTION REQUIRED: Evacuate area and implement emergency protocols.');
        recommendations.push('Contact emergency response team immediately.');
        break;
      case 'high':
        recommendations.push('Implement enhanced monitoring and safety measures.');
        recommendations.push('Consider temporary restrictions in high-risk areas.');
        break;
      case 'medium':
        recommendations.push('Increase monitoring frequency and review safety protocols.');
        recommendations.push('Prepare contingency plans for potential escalation.');
        break;
      case 'low':
        recommendations.push('Maintain current monitoring and safety procedures.');
        recommendations.push('Continue regular inspections and maintenance.');
        break;
    }

    return recommendations;
  }
}

// Singleton instance
export const scenarioService = new ScenarioService();