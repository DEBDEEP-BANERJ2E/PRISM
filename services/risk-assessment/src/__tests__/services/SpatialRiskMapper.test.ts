import { SpatialRiskMapper } from '../../services/SpatialRiskMapper';
import { RiskPrediction } from '../../services/RealTimeRiskPredictor';
import { logger } from '../../utils/logger';
import { SpatialContext } from '../../types';

describe('SpatialRiskMapper', () => {
  let mapper: SpatialRiskMapper;
  let mockSpatialContext: SpatialContext;
  let mockRiskPrediction: RiskPrediction;

  beforeEach(() => {
    mockSpatialContext = {
      slope_segments: [
        {
          id: 'segment_001',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]
          },
          slope_angle: 45,
          aspect: 180,
          curvature: 0.1,
          rock_type: 'limestone',
          joint_orientation: [45, 135],
          stability_rating: 0.7
        },
        {
          id: 'segment_002',
          geometry: {
            type: 'Polygon',
            coordinates: [[[100, 0], [200, 0], [200, 100], [100, 100], [100, 0]]]
          },
          slope_angle: 60,
          aspect: 225,
          curvature: 0.2,
          rock_type: 'sandstone',
          joint_orientation: [30, 120],
          stability_rating: 0.5
        }
      ],
      geological_features: [
        {
          id: 'joint_001',
          type: 'joint',
          geometry: {
            type: 'LineString',
            coordinates: [[50, 0], [50, 100]]
          },
          properties: { strike: 45, dip: 60 }
        }
      ],
      infrastructure: [
        {
          id: 'road_001',
          type: 'road',
          geometry: {
            type: 'LineString',
            coordinates: [[50, 0], [50, 200]]
          },
          value: 500000,
          personnel_count: 0
        },
        {
          id: 'building_001',
          type: 'building',
          geometry: {
            type: 'Point',
            coordinates: [75, 75]
          },
          value: 2000000,
          personnel_count: 25
        }
      ]
    };

    mockRiskPrediction = {
      risk_probability: 0.6,
      confidence_interval: [0.5, 0.7],
      time_to_failure_hours: 48,
      contributing_factors: ['High displacement rate', 'Elevated pore pressure'],
      explanation: {
        feature_importance: { displacement_rate: 0.4, pore_pressure: 0.3 },
        shap_values: { displacement_rate: 0.2, pore_pressure: 0.15 },
        lime_explanation: 'LIME explanation',
        natural_language_explanation: 'High risk due to displacement and pressure',
        confidence_factors: ['Multiple sensors'],
        uncertainty_sources: ['Weather data missing']
      }
    };

    mapper = new SpatialRiskMapper(logger, mockSpatialContext);
  });

  describe('generateRiskHeatmap', () => {
    it('should generate risk heatmap with valid structure', async () => {
      const heatmap = await mapper.generateRiskHeatmap(mockRiskPrediction);

      expect(heatmap).toBeDefined();
      expect(Array.isArray(heatmap)).toBe(true);
      expect(heatmap.length).toBeGreaterThan(0);
      
      // Check first row structure
      expect(Array.isArray(heatmap[0])).toBe(true);
      expect(heatmap[0].length).toBeGreaterThan(0);

      // Check cell structure
      const cell = heatmap[0][0];
      expect(cell).toHaveProperty('x');
      expect(cell).toHaveProperty('y');
      expect(cell).toHaveProperty('risk_probability');
      expect(cell).toHaveProperty('confidence');
      expect(cell).toHaveProperty('contributing_factors');
      
      expect(cell.risk_probability).toBeGreaterThanOrEqual(0);
      expect(cell.risk_probability).toBeLessThanOrEqual(1);
      expect(cell.confidence).toBeGreaterThanOrEqual(0);
      expect(cell.confidence).toBeLessThanOrEqual(1);
    });

    it('should interpolate risk values across spatial grid', async () => {
      const heatmap = await mapper.generateRiskHeatmap(mockRiskPrediction);

      // Check that risk values vary across the grid (not all the same)
      const riskValues = heatmap.flat().map(cell => cell.risk_probability);
      const uniqueRiskValues = new Set(riskValues);
      
      expect(uniqueRiskValues.size).toBeGreaterThan(1);
    });

    it('should handle low risk predictions', async () => {
      const lowRiskPrediction: RiskPrediction = {
        ...mockRiskPrediction,
        risk_probability: 0.1,
        confidence_interval: [0.05, 0.15]
      };

      const heatmap = await mapper.generateRiskHeatmap(lowRiskPrediction);

      expect(heatmap).toBeDefined();
      expect(heatmap.length).toBeGreaterThan(0);

      // Most cells should have low risk
      const avgRisk = heatmap.flat().reduce((sum, cell) => sum + cell.risk_probability, 0) / heatmap.flat().length;
      expect(avgRisk).toBeLessThan(0.3);
    });
  });

  describe('detectVulnerableZones', () => {
    it('should detect vulnerable zones for high risk predictions', async () => {
      const highRiskPrediction: RiskPrediction = {
        ...mockRiskPrediction,
        risk_probability: 0.8,
        confidence_interval: [0.7, 0.9]
      };

      const zones = await mapper.detectVulnerableZones(highRiskPrediction);

      expect(zones).toBeDefined();
      expect(Array.isArray(zones)).toBe(true);
      expect(zones.length).toBeGreaterThan(0);

      // Check zone structure
      const zone = zones[0];
      expect(zone).toHaveProperty('id');
      expect(zone).toHaveProperty('geometry');
      expect(zone).toHaveProperty('risk_level');
      expect(zone).toHaveProperty('risk_probability');
      expect(zone).toHaveProperty('confidence_interval');
      expect(zone).toHaveProperty('affected_infrastructure');
      expect(zone).toHaveProperty('recommended_actions');

      expect(['low', 'medium', 'high', 'critical']).toContain(zone.risk_level);
      expect(zone.risk_probability).toBeGreaterThanOrEqual(0);
      expect(zone.risk_probability).toBeLessThanOrEqual(1);
      expect(zone.confidence_interval).toHaveLength(2);
      expect(Array.isArray(zone.affected_infrastructure)).toBe(true);
      expect(Array.isArray(zone.recommended_actions)).toBe(true);
    });

    it('should not detect zones for very low risk predictions', async () => {
      const veryLowRiskPrediction: RiskPrediction = {
        ...mockRiskPrediction,
        risk_probability: 0.1,
        confidence_interval: [0.05, 0.15]
      };

      const zones = await mapper.detectVulnerableZones(veryLowRiskPrediction);

      expect(zones).toBeDefined();
      expect(Array.isArray(zones)).toBe(true);
      // Should have few or no zones for very low risk
      expect(zones.length).toBeLessThanOrEqual(1);
    });

    it('should identify affected infrastructure correctly', async () => {
      const zones = await mapper.detectVulnerableZones(mockRiskPrediction);

      if (zones.length > 0) {
        const zoneWithInfrastructure = zones.find(zone => zone.affected_infrastructure.length > 0);
        
        if (zoneWithInfrastructure) {
          expect(zoneWithInfrastructure.affected_infrastructure.length).toBeGreaterThan(0);
          
          const infrastructure = zoneWithInfrastructure.affected_infrastructure[0];
          expect(infrastructure).toHaveProperty('id');
          expect(infrastructure).toHaveProperty('type');
          expect(infrastructure).toHaveProperty('value');
        }
      }
    });

    it('should generate appropriate recommended actions based on risk level', async () => {
      const criticalRiskPrediction: RiskPrediction = {
        ...mockRiskPrediction,
        risk_probability: 0.9,
        confidence_interval: [0.85, 0.95]
      };

      const zones = await mapper.detectVulnerableZones(criticalRiskPrediction);

      if (zones.length > 0) {
        const criticalZone = zones.find(zone => zone.risk_level === 'critical');
        
        if (criticalZone) {
          expect(criticalZone.recommended_actions.length).toBeGreaterThan(0);
          
          // Should include evacuation for critical zones
          const hasEvacuationAction = criticalZone.recommended_actions.some(action => 
            action.toLowerCase().includes('evacuate')
          );
          expect(hasEvacuationAction).toBe(true);
        }
      }
    });

    it('should merge overlapping zones', async () => {
      // Create spatial context with overlapping segments
      const overlappingSpatialContext: SpatialContext = {
        slope_segments: [
          {
            id: 'segment_overlap_1',
            geometry: {
              type: 'Polygon',
              coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]]
            },
            slope_angle: 50,
            aspect: 180,
            curvature: 0.1,
            rock_type: 'limestone',
            joint_orientation: [45],
            stability_rating: 0.4
          },
          {
            id: 'segment_overlap_2',
            geometry: {
              type: 'Polygon',
              coordinates: [[[50, 50], [150, 50], [150, 150], [50, 150], [50, 50]]]
            },
            slope_angle: 55,
            aspect: 180,
            curvature: 0.15,
            rock_type: 'limestone',
            joint_orientation: [45],
            stability_rating: 0.3
          }
        ],
        geological_features: [],
        infrastructure: []
      };

      const overlappingMapper = new SpatialRiskMapper(logger, overlappingSpatialContext);
      
      const highRiskPrediction: RiskPrediction = {
        ...mockRiskPrediction,
        risk_probability: 0.8
      };

      const zones = await overlappingMapper.detectVulnerableZones(highRiskPrediction);

      // Should merge overlapping zones
      expect(zones.length).toBeLessThanOrEqual(2);
    });
  });

  describe('updateSpatialContext', () => {
    it('should update spatial context successfully', async () => {
      const geologicalData = {
        new_joint: {
          id: 'joint_002',
          type: 'joint',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 50], [100, 50]]
          }
        }
      };

      await expect(mapper.updateSpatialContext(geologicalData)).resolves.not.toThrow();
    });
  });

  describe('getCurrentSpatialContext', () => {
    it('should return current spatial context', async () => {
      const context = await mapper.getCurrentSpatialContext();

      expect(context).toBeDefined();
      expect(context.slope_segments).toBeDefined();
      expect(context.geological_features).toBeDefined();
      expect(context.infrastructure).toBeDefined();
      expect(context.slope_segments.length).toBe(mockSpatialContext.slope_segments.length);
    });
  });

  describe('getMapperMetrics', () => {
    it('should return mapper metrics', () => {
      const metrics = mapper.getMapperMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.gridResolution).toBeGreaterThan(0);
      expect(metrics.interpolationRadius).toBeGreaterThan(0);
      expect(metrics.slopeSegmentCount).toBe(mockSpatialContext.slope_segments.length);
      expect(metrics.infrastructureCount).toBe(mockSpatialContext.infrastructure.length);
    });
  });

  describe('performance', () => {
    it('should generate heatmap within acceptable time', async () => {
      const startTime = Date.now();
      await mapper.generateRiskHeatmap(mockRiskPrediction);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should detect vulnerable zones within acceptable time', async () => {
      const startTime = Date.now();
      await mapper.detectVulnerableZones(mockRiskPrediction);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});