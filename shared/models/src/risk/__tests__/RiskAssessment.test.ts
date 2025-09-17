import { RiskAssessment, RiskAssessmentSchema, type ContributingFactor, type RecommendedAction } from '../RiskAssessment';
import { type Polygon } from '../../spatial';

describe('RiskAssessment', () => {
  const validPolygon: Polygon = {
    type: 'Polygon',
    coordinates: [[
      [-122.6765, 45.5231, 100],
      [-122.6755, 45.5231, 105],
      [-122.6755, 45.5241, 110],
      [-122.6765, 45.5241, 108],
      [-122.6765, 45.5231, 100]
    ]]
  };

  const validContributingFactors: ContributingFactor[] = [
    {
      factor_name: 'rainfall_24h',
      importance: 0.8,
      description: 'Heavy rainfall in last 24 hours',
      measurement_value: 45.2,
      measurement_unit: 'mm',
      threshold_exceeded: true
    },
    {
      factor_name: 'slope_angle',
      importance: 0.6,
      description: 'Steep slope angle',
      measurement_value: 65,
      measurement_unit: 'degrees',
      threshold_exceeded: false
    }
  ];

  const validRecommendedActions: RecommendedAction[] = [
    {
      action_id: 'ACT001',
      action_type: 'immediate',
      priority: 'critical',
      description: 'Evacuate personnel from affected area',
      estimated_cost: 5000,
      estimated_duration_hours: 2,
      required_personnel: ['safety_officer', 'site_supervisor'],
      equipment_needed: ['barriers', 'warning_signs'],
      safety_requirements: ['hard_hats', 'high_vis_vests'],
      expected_risk_reduction: 0.9
    },
    {
      action_id: 'ACT002',
      action_type: 'preventive',
      priority: 'high',
      description: 'Install additional drainage',
      estimated_cost: 25000,
      estimated_duration_hours: 48,
      required_personnel: [],
      equipment_needed: [],
      safety_requirements: [],
      expected_risk_reduction: 0.4
    }
  ];

  const validRiskAssessmentData = {
    assessment_id: 'RISK001',
    timestamp: new Date('2023-01-01T12:00:00Z'),
    spatial_extent: validPolygon,
    risk_probability: 0.75,
    confidence_interval: {
      lower: 0.65,
      upper: 0.85,
      confidence_level: 0.95
    },
    risk_level: 'high' as const,
    time_to_failure_hours: 24,
    time_to_failure_confidence: {
      lower: 0.5,
      upper: 0.9,
      confidence_level: 0.90
    },
    contributing_factors: validContributingFactors,
    recommended_actions: validRecommendedActions,
    explanation: 'High risk due to recent heavy rainfall and steep slope conditions',
    model_version: '2.1.0',
    data_sources: ['sensor_network', 'weather_station', 'satellite_imagery'],
    affected_infrastructure: ['haul_road_A', 'power_line_B'],
    potential_consequences: ['equipment_damage', 'road_closure', 'personnel_injury']
  };

  describe('constructor and validation', () => {
    it('should create a valid RiskAssessment with required fields', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      
      expect(assessment.assessment_id).toBe('RISK001');
      expect(assessment.risk_probability).toBe(0.75);
      expect(assessment.risk_level).toBe('high');
      expect(assessment.contributing_factors).toHaveLength(2);
      expect(assessment.recommended_actions).toHaveLength(2);
      expect(assessment.created_at).toBeInstanceOf(Date);
      expect(assessment.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for invalid risk probability', () => {
      const invalidData = { ...validRiskAssessmentData, risk_probability: 1.5 };
      expect(() => new RiskAssessment(invalidData)).toThrow();
    });

    it('should throw error for invalid confidence interval', () => {
      const invalidData = {
        ...validRiskAssessmentData,
        confidence_interval: { lower: 0.8, upper: 0.6, confidence_level: 0.95 } // lower > upper
      };
      expect(() => new RiskAssessment(invalidData)).toThrow();
    });

    it('should throw error for invalid risk level', () => {
      const invalidData = { ...validRiskAssessmentData, risk_level: 'invalid_level' as any };
      expect(() => new RiskAssessment(invalidData)).toThrow();
    });

    it('should accept optional centroid', () => {
      const dataWithCentroid = {
        ...validRiskAssessmentData,
        centroid: {
          latitude: 45.5236,
          longitude: -122.676,
          elevation: 106
        }
      };
      
      const assessment = new RiskAssessment(dataWithCentroid);
      expect(assessment.centroid).toBeDefined();
      expect(assessment.centroid!.latitude).toBe(45.5236);
    });
  });

  describe('validity and status checks', () => {
    it('should return true for valid assessment without expiry', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      expect(assessment.isValid()).toBe(true);
    });

    it('should return false for expired assessment', () => {
      const expiredData = {
        ...validRiskAssessmentData,
        expires_at: new Date(Date.now() - 3600000) // 1 hour ago
      };
      
      const assessment = new RiskAssessment(expiredData);
      expect(assessment.isValid()).toBe(false);
    });

    it('should detect critical risk correctly', () => {
      const criticalAssessment = new RiskAssessment({
        ...validRiskAssessmentData,
        risk_level: 'critical'
      });
      
      expect(criticalAssessment.isCritical()).toBe(true);
    });

    it('should detect high probability as critical', () => {
      const highProbAssessment = new RiskAssessment({
        ...validRiskAssessmentData,
        risk_probability: 0.85
      });
      
      expect(highProbAssessment.isCritical()).toBe(true);
    });

    it('should detect when immediate action is required', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      expect(assessment.requiresImmediateAction()).toBe(true); // Has immediate action
    });
  });

  describe('action management', () => {
    it('should get most critical action', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const criticalAction = assessment.getMostCriticalAction();
      
      expect(criticalAction).toBeDefined();
      expect(criticalAction!.priority).toBe('critical');
      expect(criticalAction!.action_id).toBe('ACT001');
    });

    it('should get actions by type', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const immediateActions = assessment.getActionsByType('immediate');
      const preventiveActions = assessment.getActionsByType('preventive');
      
      expect(immediateActions).toHaveLength(1);
      expect(preventiveActions).toHaveLength(1);
      expect(immediateActions[0].action_id).toBe('ACT001');
      expect(preventiveActions[0].action_id).toBe('ACT002');
    });

    it('should calculate total estimated cost', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const totalCost = assessment.getTotalEstimatedCost();
      
      expect(totalCost).toBe(30000); // 5000 + 25000
    });

    it('should calculate expected risk reduction', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const riskReduction = assessment.getExpectedRiskReduction();
      
      expect(riskReduction).toBe(0.9); // Maximum of 0.9 and 0.4
    });
  });

  describe('contributing factors analysis', () => {
    it('should get top contributing factors', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const topFactors = assessment.getTopContributingFactors(1);
      
      expect(topFactors).toHaveLength(1);
      expect(topFactors[0].factor_name).toBe('rainfall_24h');
      expect(topFactors[0].importance).toBe(0.8);
    });

    it('should limit number of top factors', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const topFactors = assessment.getTopContributingFactors(5);
      
      expect(topFactors.length).toBeLessThanOrEqual(5);
      expect(topFactors.length).toBe(2); // Only 2 factors in test data
    });
  });

  describe('infrastructure and consequences', () => {
    it('should check if infrastructure is affected', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      
      expect(assessment.isInfrastructureAffected('haul_road_A')).toBe(true);
      expect(assessment.isInfrastructureAffected('nonexistent_road')).toBe(false);
    });
  });

  describe('time-based methods', () => {
    it('should calculate age correctly', () => {
      const pastTime = new Date(Date.now() - 7200000); // 2 hours ago
      const assessment = new RiskAssessment({
        ...validRiskAssessmentData,
        timestamp: pastTime
      });
      
      const age = assessment.getAgeHours();
      expect(age).toBeCloseTo(2, 1);
    });

    it('should detect stale assessments', () => {
      const oldTime = new Date(Date.now() - 86400000 * 2); // 2 days ago
      const assessment = new RiskAssessment({
        ...validRiskAssessmentData,
        timestamp: oldTime
      });
      
      expect(assessment.isStale()).toBe(true);
      expect(assessment.isStale(72)).toBe(false); // 72 hour threshold
    });
  });

  describe('risk scoring', () => {
    it('should calculate risk score correctly', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const score = assessment.getRiskScore();
      
      expect(score).toBeGreaterThan(75); // Base 75% + adjustments
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should adjust score for short time to failure', () => {
      const urgentAssessment = new RiskAssessment({
        ...validRiskAssessmentData,
        time_to_failure_hours: 12 // Less than 24 hours
      });
      
      const normalAssessment = new RiskAssessment({
        ...validRiskAssessmentData,
        time_to_failure_hours: 72 // More than 24 hours
      });
      
      expect(urgentAssessment.getRiskScore()).toBeGreaterThan(normalAssessment.getRiskScore());
    });
  });

  describe('summary generation', () => {
    it('should create comprehensive summary', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const summary = assessment.getSummary();
      
      expect(summary.assessment_id).toBe('RISK001');
      expect(summary.risk_level).toBe('high');
      expect(summary.risk_probability).toBe(0.75);
      expect(summary.requires_immediate_action).toBe(true);
      expect(summary.top_factors).toContain('rainfall_24h');
      expect(summary.critical_actions).toBe(1);
      expect(summary.total_cost).toBe(30000);
      expect(summary.is_valid).toBe(true);
    });
  });

  describe('GeoJSON conversion', () => {
    it('should convert to GeoJSON Feature', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const geojson = assessment.toGeoJSON();
      
      expect(geojson.type).toBe('Feature');
      expect(geojson.geometry).toEqual(validPolygon);
      expect(geojson.properties.assessment_id).toBe('RISK001');
      expect(geojson.properties.risk_level).toBe('high');
      expect(geojson.properties.risk_probability).toBe(0.75);
      expect(geojson.properties.requires_immediate_action).toBe(true);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const assessment = new RiskAssessment(validRiskAssessmentData);
      const json = assessment.toJSON();
      
      expect(json.assessment_id).toBe('RISK001');
      expect(json.risk_probability).toBe(0.75);
      expect(json.contributing_factors).toHaveLength(2);
      expect(json.recommended_actions).toHaveLength(2);
    });

    it('should create from JSON', () => {
      const json = {
        ...validRiskAssessmentData,
        timestamp: '2023-01-01T12:00:00.000Z',
        expires_at: '2023-01-02T12:00:00.000Z',
        created_at: '2023-01-01T12:00:01.000Z'
      };
      
      const assessment = RiskAssessment.fromJSON(json);
      
      expect(assessment.assessment_id).toBe('RISK001');
      expect(assessment.timestamp).toEqual(new Date('2023-01-01T12:00:00.000Z'));
      expect(assessment.expires_at).toEqual(new Date('2023-01-02T12:00:00.000Z'));
      expect(assessment.created_at).toEqual(new Date('2023-01-01T12:00:01.000Z'));
    });
  });

  describe('validation methods', () => {
    it('should validate correct data', () => {
      expect(() => RiskAssessment.validate(validRiskAssessmentData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidData = { ...validRiskAssessmentData, assessment_id: '' };
      expect(() => RiskAssessment.validate(invalidData)).toThrow();
    });

    it('should validate contributing factor constraints', () => {
      const invalidFactorData = {
        ...validRiskAssessmentData,
        contributing_factors: [{
          factor_name: 'test',
          importance: 1.5 // > 1.0
        }]
      };
      
      expect(() => RiskAssessment.validate(invalidFactorData)).toThrow();
    });

    it('should validate recommended action constraints', () => {
      const invalidActionData = {
        ...validRiskAssessmentData,
        recommended_actions: [{
          action_id: 'test',
          action_type: 'immediate',
          priority: 'critical',
          description: 'test',
          estimated_cost: -100 // Negative cost
        }]
      };
      
      expect(() => RiskAssessment.validate(invalidActionData)).toThrow();
    });
  });
});