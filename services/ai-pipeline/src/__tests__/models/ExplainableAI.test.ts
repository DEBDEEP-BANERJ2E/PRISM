import { ExplainableAI, ExplanationRequest, FeatureAttribution } from '../../models/ExplainableAI';
import { BaseModel, TrainingData } from '../../models/BaselineModels';

// Mock model for testing
class MockModel extends BaseModel {
  constructor() {
    super();
    this.trained = true;
    this.feature_names = ['slope_angle', 'joint_orientation', 'displacement_rate', 'pore_pressure', 'rainfall_accumulation'];
  }

  async predict(features: number[]): Promise<any> {
    // Simple mock prediction based on feature values
    const riskScore = features.reduce((sum, val, idx) => {
      const weights = [0.3, 0.2, 0.25, 0.15, 0.1]; // Feature weights
      return sum + val * weights[idx];
    }, 0) / features.length;
    
    return {
      prediction: Math.min(1, Math.max(0, riskScore)),
      confidence: 0.8,
      feature_importance: {
        'slope_angle': 0.3,
        'joint_orientation': 0.2,
        'displacement_rate': 0.25,
        'pore_pressure': 0.15,
        'rainfall_accumulation': 0.1
      }
    };
  }

  async train(_data: TrainingData): Promise<void> {
    this.trained = true;
  }

  async evaluate(_data: TrainingData): Promise<any> {
    return { mse: 0.1, mae: 0.08, r2_score: 0.85 };
  }
}

describe('ExplainableAI', () => {
  let explainableAI: ExplainableAI;
  let mockModel: MockModel;
  let sampleFeatures: number[];
  let featureNames: string[];
  let backgroundData: TrainingData;

  beforeEach(() => {
    explainableAI = new ExplainableAI();
    mockModel = new MockModel();
    sampleFeatures = [0.6, 0.4, 0.3, 0.5, 0.2]; // Sample feature values
    featureNames = ['slope_angle', 'joint_orientation', 'displacement_rate', 'pore_pressure', 'rainfall_accumulation'];
    
    // Create sample background data
    backgroundData = {
      features: [
        [0.5, 0.3, 0.2, 0.4, 0.1],
        [0.7, 0.5, 0.4, 0.6, 0.3],
        [0.4, 0.2, 0.1, 0.3, 0.05],
        [0.8, 0.6, 0.5, 0.7, 0.4],
        [0.3, 0.1, 0.05, 0.2, 0.02]
      ],
      labels: [0.3, 0.7, 0.2, 0.8, 0.1],
      feature_names: featureNames
    };
  });

  describe('SHAP Explanations', () => {
    test('should generate SHAP explanation with feature attributions', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        background_data: backgroundData,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(request);

      expect(result.shap_explanation).toBeDefined();
      expect(result.shap_explanation!.feature_attributions).toHaveLength(featureNames.length);
      expect(result.shap_explanation!.base_value).toBeGreaterThanOrEqual(0);
      expect(result.shap_explanation!.prediction).toBeGreaterThanOrEqual(0);
      expect(result.shap_explanation!.prediction).toBeLessThanOrEqual(1);
      expect(result.shap_explanation!.shap_values).toHaveLength(featureNames.length);
    });

    test('should calculate meaningful SHAP values', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        background_data: backgroundData,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(request);
      const shapExplanation = result.shap_explanation!;

      // SHAP values should sum approximately to (prediction - base_value)
      const shapSum = shapExplanation.shap_values.reduce((sum, val) => sum + val, 0);
      const expectedSum = shapExplanation.prediction - shapExplanation.base_value;
      
      // Allow for some numerical tolerance
      expect(Math.abs(shapSum - expectedSum)).toBeLessThan(0.1);
    });

    test('should provide feature attributions with correct structure', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(request);
      const attributions = result.shap_explanation!.feature_attributions;

      attributions.forEach((attr: FeatureAttribution) => {
        expect(attr.feature_name).toBeDefined();
        expect(typeof attr.importance).toBe('number');
        expect(typeof attr.contribution).toBe('number');
        expect(typeof attr.confidence).toBe('number');
        expect(attr.confidence).toBeGreaterThanOrEqual(0);
        expect(attr.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('LIME Explanations', () => {
    test('should generate LIME explanation with local model', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'lime',
        num_samples: 100 // Smaller sample size for testing
      };

      const result = await explainableAI.explainPrediction(request);

      expect(result.lime_explanation).toBeDefined();
      expect(result.lime_explanation!.feature_attributions).toHaveLength(featureNames.length);
      expect(result.lime_explanation!.prediction).toBeGreaterThanOrEqual(0);
      expect(result.lime_explanation!.prediction).toBeLessThanOrEqual(1);
      expect(result.lime_explanation!.local_model_score).toBeGreaterThanOrEqual(0);
      expect(result.lime_explanation!.used_features).toEqual(featureNames);
    });

    test('should generate reasonable local model coefficients', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'lime',
        num_samples: 100
      };

      const result = await explainableAI.explainPrediction(request);
      const limeExplanation = result.lime_explanation!;

      // Check that coefficients are reasonable (not all zero or extremely large)
      const coefficients = limeExplanation.feature_attributions.map(attr => attr.contribution);
      const maxCoeff = Math.max(...coefficients.map(Math.abs));
      const nonZeroCoeffs = coefficients.filter(c => Math.abs(c) > 0.001);

      expect(maxCoeff).toBeLessThan(10); // Reasonable magnitude
      expect(nonZeroCoeffs.length).toBeGreaterThan(0); // At least some non-zero coefficients
    });
  });

  describe('Natural Language Explanations', () => {
    test('should generate comprehensive natural language explanation', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(request);
      const nlExplanation = result.natural_language_explanation;

      expect(nlExplanation.summary).toBeDefined();
      expect(nlExplanation.summary.length).toBeGreaterThan(50); // Meaningful summary
      expect(nlExplanation.key_factors).toBeDefined();
      expect(nlExplanation.key_factors.length).toBeGreaterThan(0);
      expect(nlExplanation.risk_level).toMatch(/^(Low|Medium|High|Critical)$/);
      expect(nlExplanation.confidence_description).toBeDefined();
      expect(nlExplanation.recommendations).toBeDefined();
      expect(nlExplanation.recommendations.length).toBeGreaterThan(0);
      expect(nlExplanation.technical_details).toBeDefined();
    });

    test('should classify risk levels correctly', async () => {
      // Test that risk levels increase with higher feature values
      const lowRiskRequest: ExplanationRequest = {
        model: mockModel,
        instance: [0.1, 0.1, 0.1, 0.1, 0.1],
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      const highRiskRequest: ExplanationRequest = {
        model: mockModel,
        instance: [1.0, 1.0, 1.0, 1.0, 1.0],
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      const lowResult = await explainableAI.explainPrediction(lowRiskRequest);
      const highResult = await explainableAI.explainPrediction(highRiskRequest);

      // Risk level should be valid
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(lowResult.natural_language_explanation.risk_level);
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(highResult.natural_language_explanation.risk_level);
      
      // High risk features should produce higher or equal risk level than low risk features
      const riskLevels = ['Low', 'Medium', 'High', 'Critical'];
      const lowRiskIndex = riskLevels.indexOf(lowResult.natural_language_explanation.risk_level);
      const highRiskIndex = riskLevels.indexOf(highResult.natural_language_explanation.risk_level);
      expect(highRiskIndex).toBeGreaterThanOrEqual(lowRiskIndex);
    });

    test('should provide risk-appropriate recommendations', async () => {
      const highRiskRequest: ExplanationRequest = {
        model: mockModel,
        instance: [1.0, 1.0, 1.0, 1.0, 1.0], // High risk scenario
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(highRiskRequest);
      const recommendations = result.natural_language_explanation.recommendations;

      // Should have recommendations
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should have some operational recommendations
      const hasOperationalRec = recommendations.some(rec => 
        rec.toLowerCase().includes('monitor') || 
        rec.toLowerCase().includes('evacuate') || 
        rec.toLowerCase().includes('restrict') ||
        rec.toLowerCase().includes('operations')
      );
      expect(hasOperationalRec).toBe(true);
    });
  });

  describe('Visualization Data', () => {
    test('should generate complete visualization data', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(request);
      const vizData = result.visualization_data;

      expect(vizData.feature_importance_chart).toBeDefined();
      expect(vizData.feature_importance_chart.labels).toHaveLength(featureNames.length);
      expect(vizData.feature_importance_chart.values).toHaveLength(featureNames.length);
      expect(vizData.feature_importance_chart.colors).toHaveLength(featureNames.length);

      expect(vizData.waterfall_chart).toBeDefined();
      expect(vizData.waterfall_chart.base_value).toBeDefined();
      expect(vizData.waterfall_chart.contributions).toBeDefined();
      expect(vizData.waterfall_chart.final_prediction).toBeDefined();

      expect(vizData.force_plot_data).toBeDefined();
      expect(vizData.force_plot_data.shap_values).toHaveLength(featureNames.length);
      expect(vizData.force_plot_data.feature_names).toEqual(featureNames);
    });

    test('should use appropriate colors for positive/negative contributions', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(request);
      const colors = result.visualization_data.feature_importance_chart.colors;

      // Should have both positive (red-ish) and negative (teal-ish) colors or consistent coloring
      const uniqueColors = [...new Set(colors)];
      expect(uniqueColors.length).toBeGreaterThanOrEqual(1);
      expect(uniqueColors.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Both SHAP and LIME', () => {
    test('should generate both explanations when requested', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'both',
        num_samples: 50 // Smaller for testing
      };

      const result = await explainableAI.explainPrediction(request);

      expect(result.shap_explanation).toBeDefined();
      expect(result.lime_explanation).toBeDefined();
      expect(result.natural_language_explanation).toBeDefined();
      expect(result.visualization_data).toBeDefined();
    });

    test('should handle edge cases gracefully', async () => {
      // Test with zero features
      const zeroFeatures = [0, 0, 0, 0, 0];
      const request: ExplanationRequest = {
        model: mockModel,
        instance: zeroFeatures,
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(request);
      expect(result.natural_language_explanation.risk_level).toBe('Low');
    });

    test('should handle single feature case', async () => {
      const singleFeature = [0.5];
      const singleFeatureName = ['slope_angle'];
      
      const request: ExplanationRequest = {
        model: mockModel,
        instance: singleFeature,
        feature_names: singleFeatureName,
        explanation_type: 'shap'
      };

      const result = await explainableAI.explainPrediction(request);
      expect(result.shap_explanation!.feature_attributions).toHaveLength(1);
      expect(result.natural_language_explanation.key_factors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle model prediction errors gracefully', async () => {
      class ErrorModel extends BaseModel {
        constructor() {
          super();
          this.trained = true;
          this.feature_names = featureNames;
        }
        
        async predict(): Promise<any> { 
          throw new Error('Model prediction failed'); 
        }
        
        async train(): Promise<void> {}
        
        async evaluate(): Promise<any> { 
          return { mse: 0, mae: 0, r2_score: 0 }; 
        }
      }
      
      const errorModel = new ErrorModel();

      const request: ExplanationRequest = {
        model: errorModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      await expect(explainableAI.explainPrediction(request)).rejects.toThrow();
    });

    test('should handle empty feature names', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: [],
        explanation_type: 'shap'
      };

      // Should handle gracefully or throw meaningful error
      await expect(explainableAI.explainPrediction(request)).rejects.toThrow();
    });

    test('should handle mismatched feature dimensions', async () => {
      const request: ExplanationRequest = {
        model: mockModel,
        instance: [0.5, 0.3], // Only 2 features
        feature_names: featureNames, // 5 feature names
        explanation_type: 'shap'
      };

      // Should handle gracefully or throw meaningful error
      await expect(explainableAI.explainPrediction(request)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    test('should complete explanation within reasonable time', async () => {
      const startTime = Date.now();
      
      const request: ExplanationRequest = {
        model: mockModel,
        instance: sampleFeatures,
        feature_names: featureNames,
        explanation_type: 'shap'
      };

      await explainableAI.explainPrediction(request);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds for this simple case
      expect(duration).toBeLessThan(5000);
    });

    test('should handle large feature sets efficiently', async () => {
      const largeFeatureSet = Array.from({ length: 20 }, () => Math.random());
      const largeFeatureNames = Array.from({ length: 20 }, (_, i) => `feature_${i}`);
      
      const request: ExplanationRequest = {
        model: mockModel,
        instance: largeFeatureSet,
        feature_names: largeFeatureNames,
        explanation_type: 'lime',
        num_samples: 100
      };

      const startTime = Date.now();
      const result = await explainableAI.explainPrediction(request);
      const duration = Date.now() - startTime;

      expect(result.lime_explanation!.feature_attributions).toHaveLength(20);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});