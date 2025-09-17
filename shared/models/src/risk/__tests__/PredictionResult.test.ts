import { PredictionResult, PredictionResultSchema, type FeatureImportance, type ModelPerformance } from '../PredictionResult';

describe('PredictionResult', () => {
  const validFeatureImportance: FeatureImportance[] = [
    {
      feature_name: 'rainfall_24h',
      importance_score: 0.8,
      feature_value: 45.2,
      feature_unit: 'mm',
      contribution_direction: 'positive'
    },
    {
      feature_name: 'slope_angle',
      importance_score: 0.6,
      feature_value: 65,
      feature_unit: 'degrees',
      contribution_direction: 'positive'
    },
    {
      feature_name: 'temperature',
      importance_score: 0.3,
      feature_value: 15.5,
      feature_unit: 'celsius',
      contribution_direction: 'negative'
    }
  ];

  const validModelPerformance: ModelPerformance = {
    accuracy: 0.85,
    precision: 0.82,
    recall: 0.88,
    f1_score: 0.85,
    auc_roc: 0.91,
    rmse: 0.15,
    mae: 0.12,
    r_squared: 0.78,
    cross_validation_score: 0.83,
    training_samples: 10000,
    validation_samples: 2000
  };

  const validPredictionData = {
    prediction_id: 'PRED001',
    timestamp: new Date('2023-01-01T12:00:00Z'),
    prediction_type: 'failure_probability' as const,
    predicted_value: 0.75,
    predicted_unit: 'probability',
    confidence_interval: {
      lower: 0.65,
      upper: 0.85,
      confidence_level: 0.95
    },
    prediction_horizon_hours: 24,
    model_type: 'machine_learning' as const,
    model_name: 'RandomForestClassifier',
    model_version: '2.1.0',
    feature_importance: validFeatureImportance,
    model_performance: validModelPerformance,
    input_features: {
      rainfall_24h: 45.2,
      slope_angle: 65,
      temperature: 15.5,
      humidity: 78
    },
    preprocessing_steps: ['normalization', 'feature_scaling', 'outlier_removal'],
    uncertainty_sources: ['measurement_noise', 'model_uncertainty'],
    validation_status: 'pending' as const,
    related_predictions: [] as string[],
    data_quality_score: 0.92
  };

  describe('constructor and validation', () => {
    it('should create a valid PredictionResult with required fields', () => {
      const prediction = new PredictionResult(validPredictionData);
      
      expect(prediction.prediction_id).toBe('PRED001');
      expect(prediction.predicted_value).toBe(0.75);
      expect(prediction.prediction_type).toBe('failure_probability');
      expect(prediction.model_name).toBe('RandomForestClassifier');
      expect(prediction.feature_importance).toHaveLength(3);
      expect(prediction.created_at).toBeInstanceOf(Date);
      expect(prediction.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for invalid prediction type', () => {
      const invalidData = { ...validPredictionData, prediction_type: 'invalid_type' as any };
      expect(() => new PredictionResult(invalidData)).toThrow();
    });

    it('should throw error for invalid model type', () => {
      const invalidData = { ...validPredictionData, model_type: 'invalid_model' as any };
      expect(() => new PredictionResult(invalidData)).toThrow();
    });

    it('should throw error for invalid confidence interval', () => {
      const invalidData = {
        ...validPredictionData,
        confidence_interval: { lower: 0.8, upper: 0.6, confidence_level: 0.95 } // lower > upper
      };
      expect(() => new PredictionResult(invalidData)).toThrow();
    });

    it('should accept optional location', () => {
      const dataWithLocation = {
        ...validPredictionData,
        location: {
          latitude: 45.5231,
          longitude: -122.6765,
          elevation: 100
        }
      };
      
      const prediction = new PredictionResult(dataWithLocation);
      expect(prediction.location).toBeDefined();
      expect(prediction.location!.latitude).toBe(45.5231);
    });
  });

  describe('validity and validation checks', () => {
    it('should return true for valid prediction within horizon', () => {
      const recentPrediction = new PredictionResult({
        ...validPredictionData,
        timestamp: new Date(Date.now() - 3600000) // 1 hour ago
      });
      
      expect(recentPrediction.isValid()).toBe(true);
    });

    it('should return false for prediction beyond horizon', () => {
      const oldPrediction = new PredictionResult({
        ...validPredictionData,
        timestamp: new Date(Date.now() - 86400000 * 2), // 2 days ago
        prediction_horizon_hours: 24
      });
      
      expect(oldPrediction.isValid()).toBe(false);
    });

    it('should detect validated predictions', () => {
      const validatedPrediction = new PredictionResult({
        ...validPredictionData,
        validation_status: 'validated',
        actual_value: 0.72,
        actual_timestamp: new Date('2023-01-02T12:00:00Z')
      });
      
      expect(validatedPrediction.isValidated()).toBe(true);
    });

    it('should detect non-validated predictions', () => {
      const prediction = new PredictionResult(validPredictionData);
      expect(prediction.isValidated()).toBe(false);
    });
  });

  describe('accuracy calculations', () => {
    it('should calculate accuracy correctly', () => {
      const validatedPrediction = new PredictionResult({
        ...validPredictionData,
        validation_status: 'validated',
        actual_value: 0.72,
        actual_timestamp: new Date('2023-01-02T12:00:00Z')
      });
      
      const accuracy = validatedPrediction.getAccuracy();
      expect(accuracy).toBeDefined();
      expect(accuracy!).toBeCloseTo(0.958, 2); // 1 - |0.75 - 0.72| / 0.72
    });

    it('should return undefined for non-validated predictions', () => {
      const prediction = new PredictionResult(validPredictionData);
      expect(prediction.getAccuracy()).toBeUndefined();
    });

    it('should calculate absolute error correctly', () => {
      const validatedPrediction = new PredictionResult({
        ...validPredictionData,
        validation_status: 'validated',
        actual_value: 0.72,
        actual_timestamp: new Date('2023-01-02T12:00:00Z'),
        related_predictions: []
      });
      
      const error = validatedPrediction.getAbsoluteError();
      expect(error).toBeCloseTo(0.03, 10); // |0.75 - 0.72|
    });

    it('should calculate relative error correctly', () => {
      const validatedPrediction = new PredictionResult({
        ...validPredictionData,
        validation_status: 'validated',
        actual_value: 0.72,
        actual_timestamp: new Date('2023-01-02T12:00:00Z'),
        related_predictions: []
      });
      
      const relativeError = validatedPrediction.getRelativeError();
      expect(relativeError).toBeCloseTo(0.0417, 3); // |0.75 - 0.72| / 0.72
    });

    it('should handle zero actual value for relative error', () => {
      const validatedPrediction = new PredictionResult({
        ...validPredictionData,
        validation_status: 'validated',
        actual_value: 0
      });
      
      expect(validatedPrediction.getRelativeError()).toBeUndefined();
    });
  });

  describe('confidence interval analysis', () => {
    it('should check if actual value is within confidence interval', () => {
      const validatedPrediction = new PredictionResult({
        ...validPredictionData,
        validation_status: 'validated',
        actual_value: 0.72, // Within [0.65, 0.85]
        actual_timestamp: new Date('2023-01-02T12:00:00Z'),
        related_predictions: []
      });
      
      expect(validatedPrediction.isWithinConfidenceInterval()).toBe(true);
    });

    it('should detect when actual value is outside confidence interval', () => {
      const validatedPrediction = new PredictionResult({
        ...validPredictionData,
        validation_status: 'validated',
        actual_value: 0.90, // Outside [0.65, 0.85]
        actual_timestamp: new Date('2023-01-02T12:00:00Z'),
        related_predictions: []
      });
      
      expect(validatedPrediction.isWithinConfidenceInterval()).toBe(false);
    });

    it('should get confidence level as percentage', () => {
      const prediction = new PredictionResult(validPredictionData);
      expect(prediction.getConfidenceLevel()).toBe(95);
    });

    it('should calculate confidence interval width', () => {
      const prediction = new PredictionResult(validPredictionData);
      expect(prediction.getConfidenceWidth()).toBeCloseTo(0.2, 10); // 0.85 - 0.65
    });
  });

  describe('feature importance analysis', () => {
    it('should get top features correctly', () => {
      const prediction = new PredictionResult(validPredictionData);
      const topFeatures = prediction.getTopFeatures(2);
      
      expect(topFeatures).toHaveLength(2);
      expect(topFeatures[0].feature_name).toBe('rainfall_24h');
      expect(topFeatures[1].feature_name).toBe('slope_angle');
    });

    it('should limit number of top features', () => {
      const prediction = new PredictionResult(validPredictionData);
      const topFeatures = prediction.getTopFeatures(10);
      
      expect(topFeatures.length).toBeLessThanOrEqual(10);
      expect(topFeatures.length).toBe(3); // Only 3 features in test data
    });
  });

  describe('time-based methods', () => {
    it('should calculate age correctly', () => {
      const pastTime = new Date(Date.now() - 7200000); // 2 hours ago
      const prediction = new PredictionResult({
        ...validPredictionData,
        timestamp: pastTime
      });
      
      const age = prediction.getAgeHours();
      expect(age).toBeCloseTo(2, 1);
    });

    it('should calculate remaining valid time', () => {
      const recentTime = new Date(Date.now() - 3600000); // 1 hour ago
      const prediction = new PredictionResult({
        ...validPredictionData,
        timestamp: recentTime,
        prediction_horizon_hours: 24
      });
      
      const remaining = prediction.getRemainingValidHours();
      expect(remaining).toBeCloseTo(23, 1);
    });

    it('should detect stale predictions', () => {
      const oldTime = new Date(Date.now() - 86400000 * 2); // 2 days ago
      const prediction = new PredictionResult({
        ...validPredictionData,
        timestamp: oldTime,
        prediction_horizon_hours: 24
      });
      
      expect(prediction.isStale()).toBe(true);
    });
  });

  describe('uncertainty analysis', () => {
    it('should calculate uncertainty score', () => {
      const prediction = new PredictionResult(validPredictionData);
      const uncertainty = prediction.getUncertaintyScore();
      
      expect(uncertainty).toBeGreaterThan(0);
      expect(uncertainty).toBeLessThanOrEqual(1);
    });

    it('should increase uncertainty for wider confidence intervals', () => {
      const wideConfidencePrediction = new PredictionResult({
        ...validPredictionData,
        confidence_interval: {
          lower: 0.1,
          upper: 0.9,
          confidence_level: 0.95
        }
      });
      
      const narrowConfidencePrediction = new PredictionResult({
        ...validPredictionData,
        confidence_interval: {
          lower: 0.7,
          upper: 0.8,
          confidence_level: 0.95
        }
      });
      
      expect(wideConfidencePrediction.getUncertaintyScore())
        .toBeGreaterThan(narrowConfidencePrediction.getUncertaintyScore());
    });

    it('should increase uncertainty for more uncertainty sources', () => {
      const highUncertaintyPrediction = new PredictionResult({
        ...validPredictionData,
        uncertainty_sources: ['measurement_noise', 'model_uncertainty', 'data_drift', 'sensor_failure']
      });
      
      const lowUncertaintyPrediction = new PredictionResult({
        ...validPredictionData,
        uncertainty_sources: ['measurement_noise']
      });
      
      expect(highUncertaintyPrediction.getUncertaintyScore())
        .toBeGreaterThan(lowUncertaintyPrediction.getUncertaintyScore());
    });
  });

  describe('summary generation', () => {
    it('should create comprehensive summary', () => {
      const prediction = new PredictionResult(validPredictionData);
      const summary = prediction.getSummary();
      
      expect(summary.prediction_id).toBe('PRED001');
      expect(summary.prediction_type).toBe('failure_probability');
      expect(summary.predicted_value).toBe(0.75);
      expect(summary.predicted_unit).toBe('probability');
      expect(summary.confidence_level).toBe(95);
      expect(summary.model_name).toBe('RandomForestClassifier');
      expect(summary.is_validated).toBe(false);
      expect(summary.top_features).toContain('rainfall_24h');
    });
  });

  describe('time series conversion', () => {
    it('should convert to time series point', () => {
      const prediction = new PredictionResult(validPredictionData);
      const tsPoint = prediction.toTimeSeriesPoint();
      
      expect(tsPoint.timestamp).toEqual(prediction.timestamp);
      expect(tsPoint.value).toBe(0.75);
      expect(tsPoint.confidence_lower).toBe(0.65);
      expect(tsPoint.confidence_upper).toBe(0.85);
      expect(tsPoint.model).toBe('RandomForestClassifier');
      expect(tsPoint.type).toBe('failure_probability');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const prediction = new PredictionResult(validPredictionData);
      const json = prediction.toJSON();
      
      expect(json.prediction_id).toBe('PRED001');
      expect(json.predicted_value).toBe(0.75);
      expect(json.feature_importance).toHaveLength(3);
      expect(json.model_performance).toEqual(validModelPerformance);
    });

    it('should create from JSON', () => {
      const json = {
        ...validPredictionData,
        timestamp: '2023-01-01T12:00:00.000Z',
        actual_timestamp: '2023-01-02T12:00:00.000Z',
        created_at: '2023-01-01T12:00:01.000Z'
      };
      
      const prediction = PredictionResult.fromJSON(json);
      
      expect(prediction.prediction_id).toBe('PRED001');
      expect(prediction.timestamp).toEqual(new Date('2023-01-01T12:00:00.000Z'));
      expect(prediction.actual_timestamp).toEqual(new Date('2023-01-02T12:00:00.000Z'));
      expect(prediction.created_at).toEqual(new Date('2023-01-01T12:00:01.000Z'));
    });
  });

  describe('validation methods', () => {
    it('should validate correct data', () => {
      expect(() => PredictionResult.validate(validPredictionData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidData = { ...validPredictionData, prediction_id: '' };
      expect(() => PredictionResult.validate(invalidData)).toThrow();
    });

    it('should validate feature importance constraints', () => {
      const invalidFeatureData = {
        ...validPredictionData,
        feature_importance: [{
          feature_name: 'test',
          importance_score: 1.5 // > 1.0
        }]
      };
      
      expect(() => PredictionResult.validate(invalidFeatureData)).toThrow();
    });

    it('should validate model performance constraints', () => {
      const invalidPerformanceData = {
        ...validPredictionData,
        model_performance: {
          accuracy: 1.5 // > 1.0
        }
      };
      
      expect(() => PredictionResult.validate(invalidPerformanceData)).toThrow();
    });
  });

  describe('prediction types', () => {
    const predictionTypes = [
      'displacement', 'failure_probability', 'time_to_failure', 'stability_factor',
      'stress_distribution', 'deformation_rate', 'groundwater_level', 'temperature_trend'
    ];

    predictionTypes.forEach(predictionType => {
      it(`should accept ${predictionType} prediction type`, () => {
        const data = { ...validPredictionData, prediction_type: predictionType as any };
        expect(() => new PredictionResult(data)).not.toThrow();
      });
    });

    it('should reject invalid prediction type', () => {
      const data = { ...validPredictionData, prediction_type: 'invalid_prediction' as any };
      expect(() => new PredictionResult(data)).toThrow();
    });
  });

  describe('model types', () => {
    const modelTypes = ['statistical', 'machine_learning', 'physics_based', 'hybrid', 'ensemble'];

    modelTypes.forEach(modelType => {
      it(`should accept ${modelType} model type`, () => {
        const data = { ...validPredictionData, model_type: modelType as any };
        expect(() => new PredictionResult(data)).not.toThrow();
      });
    });

    it('should reject invalid model type', () => {
      const data = { ...validPredictionData, model_type: 'invalid_model' as any };
      expect(() => new PredictionResult(data)).toThrow();
    });
  });
});