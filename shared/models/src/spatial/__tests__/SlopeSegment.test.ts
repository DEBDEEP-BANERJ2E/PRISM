import { SlopeSegment, SlopeSegmentSchema, type Polygon, type JointOrientation } from '../SlopeSegment';
import { SpatialLocation } from '../SpatialLocation';

describe('SlopeSegment', () => {
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

  const validJointOrientations: JointOrientation[] = [
    {
      dip: 65,
      dip_direction: 120,
      strike: 30,
      persistence: 0.8,
      roughness: 'rough',
      aperture: 2.5,
      filling: 'clay'
    },
    {
      dip: 45,
      dip_direction: 200,
      strike: 110
    }
  ];

  const validSlopeData = {
    id: 'slope-001',
    geometry: validPolygon,
    slope_angle: 45,
    aspect: 135,
    curvature: -0.02,
    rock_type: 'granite' as const,
    joint_orientations: validJointOrientations,
    stability_rating: 'fair' as const,
    bench_number: 5,
    geological_unit: 'Granite Formation A',
    weathering_grade: 'moderately_weathered' as const,
    discontinuity_spacing: 1.5,
    rqd: 75,
    ucs: 150
  };

  describe('constructor and validation', () => {
    it('should create a valid SlopeSegment with required fields', () => {
      const slope = new SlopeSegment(validSlopeData);
      
      expect(slope.id).toBe('slope-001');
      expect(slope.slope_angle).toBe(45);
      expect(slope.aspect).toBe(135);
      expect(slope.curvature).toBe(-0.02);
      expect(slope.rock_type).toBe('granite');
      expect(slope.stability_rating).toBe('fair');
      expect(slope.joint_orientations).toHaveLength(2);
      expect(slope.centroid).toBeInstanceOf(SpatialLocation);
      expect(slope.area).toBeGreaterThan(0);
      expect(slope.perimeter).toBeGreaterThan(0);
    });

    it('should throw error for invalid slope angle', () => {
      const invalidData = { ...validSlopeData, slope_angle: 95 };
      expect(() => new SlopeSegment(invalidData)).toThrow();
    });

    it('should throw error for invalid aspect', () => {
      const invalidData = { ...validSlopeData, aspect: 365 };
      expect(() => new SlopeSegment(invalidData)).toThrow();
    });

    it('should throw error for invalid rock type', () => {
      const invalidData = { ...validSlopeData, rock_type: 'invalid_rock' as any };
      expect(() => new SlopeSegment(invalidData)).toThrow();
    });

    it('should throw error for invalid stability rating', () => {
      const invalidData = { ...validSlopeData, stability_rating: 'invalid_rating' as any };
      expect(() => new SlopeSegment(invalidData)).toThrow();
    });

    it('should accept optional fields', () => {
      const dataWithOptionals = {
        ...validSlopeData,
        height: 25.5,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const slope = new SlopeSegment(dataWithOptionals);
      expect(slope.height).toBe(25.5);
      expect(slope.created_at).toBeInstanceOf(Date);
      expect(slope.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('joint orientation validation', () => {
    it('should validate joint orientations correctly', () => {
      const validJoint: JointOrientation = {
        dip: 45,
        dip_direction: 120,
        strike: 30
      };

      expect(() => SlopeSegmentSchema.parse({
        ...validSlopeData,
        joint_orientations: [validJoint]
      })).not.toThrow();
    });

    it('should reject invalid dip angle', () => {
      const invalidJoint = {
        dip: 95, // Invalid: > 90
        dip_direction: 120,
        strike: 30
      };

      expect(() => SlopeSegmentSchema.parse({
        ...validSlopeData,
        joint_orientations: [invalidJoint]
      })).toThrow();
    });

    it('should reject invalid dip direction', () => {
      const invalidJoint = {
        dip: 45,
        dip_direction: 365, // Invalid: > 360
        strike: 30
      };

      expect(() => SlopeSegmentSchema.parse({
        ...validSlopeData,
        joint_orientations: [invalidJoint]
      })).toThrow();
    });
  });

  describe('geometric calculations', () => {
    it('should calculate centroid correctly', () => {
      const slope = new SlopeSegment(validSlopeData);
      
      expect(slope.centroid).toBeDefined();
      expect(slope.centroid!.latitude).toBeCloseTo(45.5236, 3);
      expect(slope.centroid!.longitude).toBeCloseTo(-122.676, 3);
    });

    it('should calculate area correctly', () => {
      const slope = new SlopeSegment(validSlopeData);
      
      expect(slope.area).toBeGreaterThan(0);
      expect(typeof slope.area).toBe('number');
    });

    it('should calculate perimeter correctly', () => {
      const slope = new SlopeSegment(validSlopeData);
      
      expect(slope.perimeter).toBeGreaterThan(0);
      expect(typeof slope.perimeter).toBe('number');
    });
  });

  describe('stability calculations', () => {
    it('should calculate stability factor', () => {
      const slope = new SlopeSegment(validSlopeData);
      const stabilityFactor = slope.calculateStabilityFactor();
      
      expect(stabilityFactor).toBeGreaterThan(0);
      expect(stabilityFactor).toBeLessThanOrEqual(1);
    });

    it('should reduce stability factor for steep slopes', () => {
      const steepSlope = new SlopeSegment({
        ...validSlopeData,
        slope_angle: 80
      });
      
      const gentleSlope = new SlopeSegment({
        ...validSlopeData,
        slope_angle: 30
      });

      expect(steepSlope.calculateStabilityFactor()).toBeLessThan(gentleSlope.calculateStabilityFactor());
    });

    it('should reduce stability factor for poor rock quality', () => {
      const poorRock = new SlopeSegment({
        ...validSlopeData,
        rqd: 25,
        weathering_grade: 'completely_weathered' as const
      });
      
      const goodRock = new SlopeSegment({
        ...validSlopeData,
        rqd: 90,
        weathering_grade: 'fresh' as const
      });

      expect(poorRock.calculateStabilityFactor()).toBeLessThan(goodRock.calculateStabilityFactor());
    });
  });

  describe('spatial operations', () => {
    it('should check if point is contained within slope segment', () => {
      const slope = new SlopeSegment(validSlopeData);
      
      // Point inside the polygon
      const insidePoint = new SpatialLocation({
        latitude: 45.5236,
        longitude: -122.676,
        elevation: 105
      });
      
      // Point outside the polygon
      const outsidePoint = new SpatialLocation({
        latitude: 45.5250,
        longitude: -122.6750,
        elevation: 105
      });

      expect(slope.containsPoint(insidePoint)).toBe(true);
      expect(slope.containsPoint(outsidePoint)).toBe(false);
    });

    it('should find dominant joint orientation', () => {
      const slope = new SlopeSegment(validSlopeData);
      const dominantJoint = slope.getDominantJointOrientation();
      
      expect(dominantJoint).toBeDefined();
      expect(dominantJoint!.dip).toBeDefined();
      expect(dominantJoint!.dip_direction).toBeDefined();
    });

    it('should return null for no joint orientations', () => {
      const slopeWithoutJoints = new SlopeSegment({
        ...validSlopeData,
        joint_orientations: []
      });
      
      expect(slopeWithoutJoints.getDominantJointOrientation()).toBeNull();
    });
  });

  describe('GeoJSON conversion', () => {
    it('should convert to GeoJSON Feature', () => {
      const slope = new SlopeSegment(validSlopeData);
      const geojson = slope.toGeoJSON();
      
      expect(geojson.type).toBe('Feature');
      expect(geojson.geometry).toEqual(validPolygon);
      expect(geojson.properties.id).toBe('slope-001');
      expect(geojson.properties.slope_angle).toBe(45);
      expect(geojson.properties.rock_type).toBe('granite');
      expect(geojson.properties.stability_factor).toBeDefined();
      expect(geojson.properties.centroid).toBeDefined();
    });

    it('should create from GeoJSON Feature', () => {
      const geojson = {
        type: 'Feature',
        geometry: validPolygon,
        properties: {
          id: 'slope-002',
          slope_angle: 50,
          aspect: 180,
          curvature: 0.01,
          rock_type: 'limestone',
          joint_orientations: validJointOrientations,
          stability_rating: 'good',
          bench_number: 3
        }
      };

      const slope = SlopeSegment.fromGeoJSON(geojson);
      
      expect(slope.id).toBe('slope-002');
      expect(slope.slope_angle).toBe(50);
      expect(slope.aspect).toBe(180);
      expect(slope.rock_type).toBe('limestone');
      expect(slope.stability_rating).toBe('good');
      expect(slope.bench_number).toBe(3);
    });

    it('should throw error for invalid GeoJSON', () => {
      const invalidGeoJSON = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {}
      };

      expect(() => SlopeSegment.fromGeoJSON(invalidGeoJSON)).toThrow();
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const createdAt = new Date('2023-01-01T00:00:00Z');
      const updatedAt = new Date('2023-01-02T00:00:00Z');
      
      const slope = new SlopeSegment({
        ...validSlopeData,
        height: 30,
        created_at: createdAt,
        updated_at: updatedAt
      });

      const json = slope.toJSON();
      
      expect(json.id).toBe('slope-001');
      expect(json.slope_angle).toBe(45);
      expect(json.height).toBe(30);
      expect(json.created_at).toEqual(createdAt);
      expect(json.updated_at).toEqual(updatedAt);
      expect(json.centroid).toBeDefined();
    });

    it('should handle undefined optional fields', () => {
      const slope = new SlopeSegment(validSlopeData);
      const json = slope.toJSON();
      
      expect(json.height).toBeUndefined();
      expect(json.created_at).toBeUndefined();
      expect(json.updated_at).toBeUndefined();
    });
  });

  describe('validation methods', () => {
    it('should validate correct data', () => {
      expect(() => SlopeSegment.validate(validSlopeData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidData = { ...validSlopeData, slope_angle: 'invalid' };
      expect(() => SlopeSegment.validate(invalidData)).toThrow();
    });

    it('should validate RQD range', () => {
      const invalidRQD = { ...validSlopeData, rqd: 150 }; // > 100
      expect(() => SlopeSegment.validate(invalidRQD)).toThrow();
    });

    it('should validate UCS positive value', () => {
      const invalidUCS = { ...validSlopeData, ucs: -50 };
      expect(() => SlopeSegment.validate(invalidUCS)).toThrow();
    });
  });
});