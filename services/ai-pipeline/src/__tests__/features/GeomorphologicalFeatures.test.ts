import { GeomorphologicalFeatureExtractor, DEMData } from '../../features/GeomorphologicalFeatures';
// import { SpatialLocation, SlopeSegment } from '../../../../shared/models/dist/spatial';

describe.skip('GeomorphologicalFeatureExtractor', () => {
  let extractor: GeomorphologicalFeatureExtractor;
  let mockDEMData: DEMData[];
  let mockLocation: SpatialLocation;

  beforeEach(() => {
    extractor = new GeomorphologicalFeatureExtractor(1.0);
    
    // Create a simple 5x5 DEM grid for testing
    mockDEMData = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        mockDEMData.push({
          x: x * 10, // 10m spacing
          y: y * 10,
          elevation: 100 + x * 2 + y * 1 // Simple slope
        });
      }
    }

    mockLocation = {
      latitude: -23.5,
      longitude: 133.5,
      elevation: 105,
      utm_x: 20, // Center of grid
      utm_y: 20,
      mine_grid_x: 20,
      mine_grid_y: 20
    };
  });

  describe('extractFeatures', () => {
    it('should extract basic geomorphological features', () => {
      const features = extractor.extractFeatures(mockDEMData, mockLocation);

      expect(features).toHaveProperty('slope');
      expect(features).toHaveProperty('aspect');
      expect(features).toHaveProperty('curvature');
      expect(features).toHaveProperty('roughness');
      expect(features).toHaveProperty('elevation');

      expect(typeof features.slope).toBe('number');
      expect(typeof features.aspect).toBe('number');
      expect(typeof features.curvature).toBe('number');
      expect(typeof features.roughness).toBe('number');
      expect(typeof features.elevation).toBe('number');
    });

    it('should calculate slope correctly for a known gradient', () => {
      // Create a simple slope: elevation increases by 1m per 10m horizontally
      const slopeDEM: DEMData[] = [
        { x: 10, y: 20, elevation: 100 },
        { x: 20, y: 20, elevation: 101 },
        { x: 30, y: 20, elevation: 102 },
        { x: 10, y: 30, elevation: 100 },
        { x: 20, y: 30, elevation: 101 },
        { x: 30, y: 30, elevation: 102 },
        { x: 10, y: 10, elevation: 100 },
        { x: 20, y: 10, elevation: 101 },
        { x: 30, y: 10, elevation: 102 }
      ];

      const features = extractor.extractFeatures(slopeDEM, mockLocation);
      
      // Expected slope: arctan(1/10) ≈ 5.71 degrees
      expect(features.slope).toBeGreaterThan(5);
      expect(features.slope).toBeLessThan(7);
    });

    it('should calculate aspect correctly for east-facing slope', () => {
      // Create an east-facing slope
      const eastSlopeDEM: DEMData[] = [
        { x: 10, y: 10, elevation: 102 },
        { x: 20, y: 10, elevation: 101 },
        { x: 30, y: 10, elevation: 100 },
        { x: 10, y: 20, elevation: 102 },
        { x: 20, y: 20, elevation: 101 },
        { x: 30, y: 20, elevation: 100 },
        { x: 10, y: 30, elevation: 102 },
        { x: 20, y: 30, elevation: 101 },
        { x: 30, y: 30, elevation: 100 }
      ];

      const features = extractor.extractFeatures(eastSlopeDEM, mockLocation);
      
      // East-facing slope should have aspect around 90 degrees
      expect(features.aspect).toBeGreaterThan(80);
      expect(features.aspect).toBeLessThan(100);
    });

    it('should handle flat terrain', () => {
      const flatDEM: DEMData[] = [
        { x: 10, y: 10, elevation: 100 },
        { x: 20, y: 10, elevation: 100 },
        { x: 30, y: 10, elevation: 100 },
        { x: 10, y: 20, elevation: 100 },
        { x: 20, y: 20, elevation: 100 },
        { x: 30, y: 20, elevation: 100 },
        { x: 10, y: 30, elevation: 100 },
        { x: 20, y: 30, elevation: 100 },
        { x: 30, y: 30, elevation: 100 }
      ];

      const features = extractor.extractFeatures(flatDEM, mockLocation);
      
      expect(features.slope).toBe(0);
      expect(features.curvature).toBe(0);
      expect(features.roughness).toBe(0);
    });

    it('should handle empty DEM data gracefully', () => {
      const features = extractor.extractFeatures([], mockLocation);
      
      expect(features.slope).toBe(0);
      expect(features.aspect).toBe(0);
      expect(features.curvature).toBe(0);
      expect(features.roughness).toBe(0);
    });

    it('should calculate roughness for irregular terrain', () => {
      // Create irregular terrain
      const irregularDEM: DEMData[] = [
        { x: 10, y: 10, elevation: 95 },
        { x: 20, y: 10, elevation: 105 },
        { x: 30, y: 10, elevation: 98 },
        { x: 10, y: 20, elevation: 102 },
        { x: 20, y: 20, elevation: 100 },
        { x: 30, y: 20, elevation: 107 },
        { x: 10, y: 30, elevation: 99 },
        { x: 20, y: 30, elevation: 103 },
        { x: 30, y: 30, elevation: 96 }
      ];

      const features = extractor.extractFeatures(irregularDEM, mockLocation);
      
      expect(features.roughness).toBeGreaterThan(0);
      expect(features.elevationVariance).toBeGreaterThan(0);
    });

    it('should calculate curvature types correctly', () => {
      // Create a convex surface (hill)
      const convexDEM: DEMData[] = [
        { x: 10, y: 10, elevation: 95 },
        { x: 20, y: 10, elevation: 98 },
        { x: 30, y: 10, elevation: 95 },
        { x: 10, y: 20, elevation: 98 },
        { x: 20, y: 20, elevation: 100 },
        { x: 30, y: 20, elevation: 98 },
        { x: 10, y: 30, elevation: 95 },
        { x: 20, y: 30, elevation: 98 },
        { x: 30, y: 30, elevation: 95 }
      ];

      const features = extractor.extractFeatures(convexDEM, mockLocation);
      
      expect(features).toHaveProperty('planCurvature');
      expect(features).toHaveProperty('profileCurvature');
      expect(typeof features.planCurvature).toBe('number');
      expect(typeof features.profileCurvature).toBe('number');
    });
  });

  describe('extractBatchFeatures', () => {
    it('should extract features for multiple slope segments', () => {
      const mockSegments = [
        new SlopeSegment({
          id: 'segment1',
          geometry: {
            type: 'Polygon',
            coordinates: [[[15, 15], [25, 15], [25, 25], [15, 25], [15, 15]]]
          },
          slope_angle: 30,
          aspect: 90,
          curvature: 0.1,
          rock_type: 'granite',
          joint_orientations: [
            { dip: 45, dip_direction: 135, strike: 45 }
          ],
          stability_rating: 'good'
        }),
        new SlopeSegment({
          id: 'segment2',
          geometry: {
            type: 'Polygon',
            coordinates: [[[25, 25], [35, 25], [35, 35], [25, 35], [25, 25]]]
          },
          slope_angle: 25,
          aspect: 180,
          curvature: -0.05,
          rock_type: 'sandstone',
          joint_orientations: [
            { dip: 60, dip_direction: 150, strike: 60 }
          ],
          stability_rating: 'very_good'
        })
      ];

      const batchFeatures = extractor.extractBatchFeatures(mockDEMData, mockSegments);
      
      expect(batchFeatures.size).toBe(2);
      expect(batchFeatures.has('segment1')).toBe(true);
      expect(batchFeatures.has('segment2')).toBe(true);
      
      const segment1Features = batchFeatures.get('segment1');
      expect(segment1Features).toBeDefined();
      expect(segment1Features!.slope).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle insufficient DEM points', () => {
      const sparseDEM: DEMData[] = [
        { x: 20, y: 20, elevation: 100 }
      ];

      const features = extractor.extractFeatures(sparseDEM, mockLocation);
      
      expect(features.slope).toBe(0);
      expect(features.aspect).toBe(0);
    });

    it('should handle location outside DEM coverage', () => {
      const farLocation: SpatialLocation = {
        ...mockLocation,
        utm_x: 1000,
        utm_y: 1000
      };

      const features = extractor.extractFeatures(mockDEMData, farLocation);
      
      // Should use the location's elevation as fallback
      expect(features.elevation).toBe(farLocation.elevation);
    });

    it('should validate cell size parameter', () => {
      expect(() => new GeomorphologicalFeatureExtractor(0)).toThrow();
      expect(() => new GeomorphologicalFeatureExtractor(-1)).toThrow();
    });
  });

  describe('performance', () => {
    it('should process large DEM datasets efficiently', () => {
      // Create a larger DEM dataset
      const largeDEM: DEMData[] = [];
      for (let x = 0; x < 100; x++) {
        for (let y = 0; y < 100; y++) {
          largeDEM.push({
            x: x * 5,
            y: y * 5,
            elevation: 100 + Math.sin(x * 0.1) * 10 + Math.cos(y * 0.1) * 5
          });
        }
      }

      const startTime = Date.now();
      const features = extractor.extractFeatures(largeDEM, mockLocation);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      expect(features).toBeDefined();
    });
  });
});