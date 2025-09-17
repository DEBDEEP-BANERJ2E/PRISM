import { SpatialFeatureExtractor, JointData, DrainageFeature, MiningFeature } from '../../features/SpatialFeatures';
// import { SpatialLocation } from '../../../../shared/models/src/spatial';

describe.skip('SpatialFeatureExtractor', () => {
  let extractor: SpatialFeatureExtractor;
  let mockLocation: SpatialLocation;
  let mockDEMData: Array<{x: number, y: number, elevation: number}>;

  beforeEach(() => {
    extractor = new SpatialFeatureExtractor(1000);
    
    mockLocation = {
      latitude: -23.5,
      longitude: 133.5,
      elevation: 100,
      utm_x: 500000,
      utm_y: 7500000,
      mine_grid_x: 1000,
      mine_grid_y: 2000
    };

    // Create simple DEM data
    mockDEMData = [];
    for (let x = 499900; x <= 500100; x += 20) {
      for (let y = 7499900; y <= 7500100; y += 20) {
        mockDEMData.push({
          x: x,
          y: y,
          elevation: 100 + (x - 500000) * 0.01 + (y - 7500000) * 0.005
        });
      }
    }
  });

  describe('extractFeatures', () => {
    it('should extract basic spatial features', () => {
      const joints: JointData[] = [
        {
          location: { ...mockLocation, utm_x: 500050, utm_y: 7500050 },
          strike: 45,
          dip: 60,
          length: 10,
          aperture: 2,
          roughness: 0.7,
          infilling: 'clay',
          is_major: true
        }
      ];

      const drainage: DrainageFeature[] = [
        {
          location: { ...mockLocation, utm_x: 500100, utm_y: 7500100 },
          type: 'channel',
          seasonal: false
        }
      ];

      const miningFeatures: MiningFeature[] = [
        {
          location: { ...mockLocation, utm_x: 500200, utm_y: 7500200 },
          type: 'haul_road',
          last_activity: new Date(),
          intensity: 0.8
        }
      ];

      const sensorLocations: SpatialLocation[] = [
        { ...mockLocation, utm_x: 500025, utm_y: 7500025 },
        { ...mockLocation, utm_x: 500075, utm_y: 7500075 }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        joints,
        drainage,
        miningFeatures,
        sensorLocations
      );

      expect(features).toHaveProperty('distance_to_nearest_joint');
      expect(features).toHaveProperty('distance_to_water_source');
      expect(features).toHaveProperty('distance_to_road');
      expect(features).toHaveProperty('slope_position_index');
      expect(features).toHaveProperty('joint_density_500m');
      expect(features).toHaveProperty('sensor_density_100m');
      expect(features).toHaveProperty('blast_proximity_score');

      expect(typeof features.distance_to_nearest_joint).toBe('number');
      expect(typeof features.slope_position_index).toBe('number');
      expect(typeof features.joint_density_500m).toBe('number');
    });

    it('should calculate distances correctly', () => {
      const nearbyJoint: JointData[] = [
        {
          location: { ...mockLocation, utm_x: 500100, utm_y: 7500000 }, // 100m east
          strike: 45,
          dip: 60,
          length: 10,
          aperture: 2,
          roughness: 0.7,
          infilling: 'clay',
          is_major: false
        }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        nearbyJoint,
        [],
        [],
        []
      );

      expect(features.distance_to_nearest_joint).toBeCloseTo(100, 0);
    });

    it('should calculate joint density correctly', () => {
      const joints: JointData[] = [];
      
      // Create 10 joints within 500m radius
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * 2 * Math.PI;
        const distance = 400; // Within 500m radius
        joints.push({
          location: {
            ...mockLocation,
            utm_x: mockLocation.utm_x + Math.cos(angle) * distance,
            utm_y: mockLocation.utm_y + Math.sin(angle) * distance
          },
          strike: 45 + i * 10,
          dip: 60,
          length: 5,
          aperture: 1,
          roughness: 0.5,
          infilling: 'none',
          is_major: false
        });
      }

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        joints,
        [],
        [],
        []
      );

      const expectedDensity = 10 / (Math.PI * 0.5 * 0.5); // 10 joints per km²
      expect(features.joint_density_500m).toBeCloseTo(expectedDensity, 1);
    });

    it('should calculate slope position index', () => {
      // Create DEM with clear elevation gradient
      const slopeDEM = [
        { x: 499950, y: 7500000, elevation: 90 },  // Lower
        { x: 500000, y: 7500000, elevation: 100 }, // Middle
        { x: 500050, y: 7500000, elevation: 110 }  // Higher
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        slopeDEM,
        [],
        [],
        [],
        []
      );

      expect(features.slope_position_index).toBeGreaterThanOrEqual(0);
      expect(features.slope_position_index).toBeLessThanOrEqual(1);
      expect(features.slope_position_index).toBeCloseTo(0.5, 1); // Middle position
    });

    it('should calculate sensor density', () => {
      const sensorLocations: SpatialLocation[] = [];
      
      // Create 5 sensors within 100m radius
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * 2 * Math.PI;
        const distance = 80; // Within 100m radius
        sensorLocations.push({
          ...mockLocation,
          utm_x: mockLocation.utm_x + Math.cos(angle) * distance,
          utm_y: mockLocation.utm_y + Math.sin(angle) * distance
        });
      }

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        [],
        [],
        [],
        sensorLocations
      );

      const expectedDensity = 5 / (Math.PI * 0.1 * 0.1); // 5 sensors per km²
      expect(features.sensor_density_100m).toBeCloseTo(expectedDensity, 1);
    });

    it('should calculate topographic wetness index', () => {
      // Create DEM representing a valley (low TWI) vs ridge (high TWI)
      const valleyDEM = [
        { x: 499950, y: 7500000, elevation: 110 },
        { x: 500000, y: 7500000, elevation: 90 },  // Valley bottom
        { x: 500050, y: 7500000, elevation: 110 }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        valleyDEM,
        [],
        [],
        [],
        []
      );

      expect(features.topographic_wetness_index).toBeGreaterThan(0);
    });

    it('should calculate joint orientation favorability', () => {
      const slopeSegment = {
        id: 'test_segment',
        geometry: { coordinates: [] },
        slope_angle: 45,
        aspect: 90, // East-facing
        curvature: 0,
        rock_type: 'granite',
        joint_orientation: [45, 135],
        stability_rating: 0.7
      };

      const favorableJoint: JointData[] = [
        {
          location: { ...mockLocation, utm_x: 500050, utm_y: 7500000 },
          strike: 90, // Same as slope aspect
          dip: 45,   // Same as slope angle
          length: 10,
          aperture: 2,
          roughness: 0.7,
          infilling: 'clay',
          is_major: true
        }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        favorableJoint,
        [],
        [],
        [],
        slopeSegment
      );

      expect(features.joint_orientation_favorability).toBeGreaterThan(0);
    });

    it('should calculate blast proximity score', () => {
      const blastFeatures: MiningFeature[] = [
        {
          location: { ...mockLocation, utm_x: 500050, utm_y: 7500050 }, // Close blast
          type: 'blast_hole',
          intensity: 1.0,
          last_activity: new Date()
        },
        {
          location: { ...mockLocation, utm_x: 500500, utm_y: 7500500 }, // Distant blast
          type: 'blast_hole',
          intensity: 0.5,
          last_activity: new Date()
        }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        [],
        [],
        blastFeatures,
        []
      );

      expect(features.blast_proximity_score).toBeGreaterThan(0);
      expect(features.blast_proximity_score).toBeLessThanOrEqual(1);
    });

    it('should calculate rock mass rating', () => {
      const joints: JointData[] = [
        {
          location: { ...mockLocation, utm_x: 500010, utm_y: 7500010 },
          strike: 45,
          dip: 60,
          length: 2,     // Short joint
          aperture: 0.5, // Tight aperture
          roughness: 0.9, // Rough surface
          infilling: 'none',
          is_major: false
        },
        {
          location: { ...mockLocation, utm_x: 500020, utm_y: 7500020 },
          strike: 135,
          dip: 70,
          length: 20,    // Long joint
          aperture: 5,   // Wide aperture
          roughness: 0.3, // Smooth surface
          infilling: 'clay',
          is_major: true
        }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        joints,
        [],
        [],
        []
      );

      expect(features.rock_mass_rating).toBeGreaterThan(0);
      expect(features.rock_mass_rating).toBeLessThanOrEqual(100);
    });

    it('should handle empty input data', () => {
      const features = extractor.extractFeatures(
        mockLocation,
        [],
        [],
        [],
        [],
        []
      );

      expect(features.distance_to_nearest_joint).toBe(Infinity);
      expect(features.distance_to_water_source).toBe(Infinity);
      expect(features.joint_density_500m).toBe(0);
      expect(features.sensor_density_100m).toBe(0);
      expect(features.blast_proximity_score).toBe(0);
    });

    it('should calculate drainage area', () => {
      // Create DEM with higher elevations around the location
      const drainageDEM = [];
      for (let x = 499900; x <= 500100; x += 50) {
        for (let y = 7499900; y <= 7500100; y += 50) {
          const distanceFromCenter = Math.sqrt(
            Math.pow(x - mockLocation.utm_x, 2) + 
            Math.pow(y - mockLocation.utm_y, 2)
          );
          drainageDEM.push({
            x: x,
            y: y,
            elevation: mockLocation.elevation + distanceFromCenter * 0.01
          });
        }
      }

      const features = extractor.extractFeatures(
        mockLocation,
        drainageDEM,
        [],
        [],
        [],
        []
      );

      expect(features.drainage_area).toBeGreaterThan(0);
    });

    it('should calculate terrain ruggedness index', () => {
      // Create rugged terrain
      const ruggedDEM = [];
      for (let i = 0; i < 20; i++) {
        ruggedDEM.push({
          x: mockLocation.utm_x + (Math.random() - 0.5) * 100,
          y: mockLocation.utm_y + (Math.random() - 0.5) * 100,
          elevation: mockLocation.elevation + (Math.random() - 0.5) * 50
        });
      }

      const features = extractor.extractFeatures(
        mockLocation,
        ruggedDEM,
        [],
        [],
        [],
        []
      );

      expect(features.terrain_ruggedness_index).toBeGreaterThan(0);
    });

    it('should calculate operational stress factor', () => {
      const operationalFeatures: MiningFeature[] = [
        {
          location: { ...mockLocation, utm_x: 500050, utm_y: 7500050 },
          type: 'blast_hole',
          intensity: 0.8
        },
        {
          location: { ...mockLocation, utm_x: 500100, utm_y: 7500100 },
          type: 'haul_road',
          intensity: 0.6
        },
        {
          location: { ...mockLocation, utm_x: 500150, utm_y: 7500150 },
          type: 'bench_crest',
          intensity: 0.7
        }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        [],
        [],
        operationalFeatures,
        []
      );

      expect(features.operational_stress_factor).toBeGreaterThan(0);
      expect(features.operational_stress_factor).toBeLessThanOrEqual(1);
      expect(features.blast_proximity_score).toBeGreaterThan(0);
      expect(features.excavation_influence_zone).toBeGreaterThan(0);
      expect(features.haul_road_influence).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle location with no nearby features', () => {
      const remoteLocation: SpatialLocation = {
        ...mockLocation,
        utm_x: 600000, // Far from any features
        utm_y: 8000000
      };

      const features = extractor.extractFeatures(
        remoteLocation,
        mockDEMData,
        [],
        [],
        [],
        []
      );

      expect(features.distance_to_nearest_joint).toBe(Infinity);
      expect(features.joint_density_500m).toBe(0);
      expect(features.sensor_density_100m).toBe(0);
    });

    it('should handle identical elevations in DEM', () => {
      const flatDEM = [
        { x: 499950, y: 7500000, elevation: 100 },
        { x: 500000, y: 7500000, elevation: 100 },
        { x: 500050, y: 7500000, elevation: 100 }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        flatDEM,
        [],
        [],
        [],
        []
      );

      expect(features.slope_position_index).toBe(0.5); // Middle of flat area
      expect(features.terrain_ruggedness_index).toBe(0);
    });

    it('should handle extreme joint characteristics', () => {
      const extremeJoint: JointData[] = [
        {
          location: mockLocation,
          strike: 0,
          dip: 90,
          length: 1000, // Very long
          aperture: 100, // Very wide
          roughness: 0,  // Very smooth
          infilling: 'water',
          is_major: true
        }
      ];

      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        extremeJoint,
        [],
        [],
        []
      );

      expect(features.rock_mass_rating).toBeGreaterThanOrEqual(0);
      expect(features.joint_density_500m).toBeGreaterThan(0);
    });

    it('should validate search radius parameter', () => {
      expect(() => new SpatialFeatureExtractor(0)).toThrow();
      expect(() => new SpatialFeatureExtractor(-100)).toThrow();
    });
  });

  describe('performance', () => {
    it('should process large spatial datasets efficiently', () => {
      // Create large datasets
      const largeJoints: JointData[] = [];
      const largeDrainage: DrainageFeature[] = [];
      const largeMining: MiningFeature[] = [];
      const largeSensors: SpatialLocation[] = [];

      for (let i = 0; i < 1000; i++) {
        largeJoints.push({
          location: {
            ...mockLocation,
            utm_x: mockLocation.utm_x + (Math.random() - 0.5) * 2000,
            utm_y: mockLocation.utm_y + (Math.random() - 0.5) * 2000
          },
          strike: Math.random() * 360,
          dip: Math.random() * 90,
          length: Math.random() * 50,
          aperture: Math.random() * 10,
          roughness: Math.random(),
          infilling: 'clay',
          is_major: Math.random() > 0.8
        });

        largeSensors.push({
          ...mockLocation,
          utm_x: mockLocation.utm_x + (Math.random() - 0.5) * 2000,
          utm_y: mockLocation.utm_y + (Math.random() - 0.5) * 2000
        });
      }

      const startTime = Date.now();
      const features = extractor.extractFeatures(
        mockLocation,
        mockDEMData,
        largeJoints,
        largeDrainage,
        largeMining,
        largeSensors
      );
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(features).toBeDefined();
    });
  });
});