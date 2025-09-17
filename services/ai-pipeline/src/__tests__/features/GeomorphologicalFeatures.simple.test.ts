import { GeomorphologicalFeatureExtractor, DEMData } from '../../features/GeomorphologicalFeatures';

// Simple mock types for testing
interface MockSpatialLocation {
  latitude: number;
  longitude: number;
  elevation: number;
  utm_x: number;
  utm_y: number;
  mine_grid_x: number;
  mine_grid_y: number;
}

describe('GeomorphologicalFeatureExtractor (Simple)', () => {
  let extractor: GeomorphologicalFeatureExtractor;
  let mockDEMData: DEMData[];
  let mockLocation: MockSpatialLocation;

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
      const features = extractor.extractFeatures(mockDEMData, mockLocation as any);

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
      // Create a simple slope: elevation increases by 1m per 1m horizontally
      // Center the DEM around the location coordinates (20, 20)
      const slopeDEM: DEMData[] = [
        { x: 19, y: 19, elevation: 100 },
        { x: 20, y: 19, elevation: 101 },
        { x: 21, y: 19, elevation: 102 },
        { x: 19, y: 20, elevation: 100 },
        { x: 20, y: 20, elevation: 101 },
        { x: 21, y: 20, elevation: 102 },
        { x: 19, y: 21, elevation: 100 },
        { x: 20, y: 21, elevation: 101 },
        { x: 21, y: 21, elevation: 102 }
      ];

      const features = extractor.extractFeatures(slopeDEM, mockLocation as any);
      
      // Expected slope should be greater than 0 for sloped terrain
      expect(features.slope).toBeGreaterThan(0);
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

      const features = extractor.extractFeatures(flatDEM, mockLocation as any);
      
      expect(features.slope).toBe(0);
      expect(Math.abs(features.curvature)).toBeLessThan(0.1);
      expect(features.roughness).toBe(0);
    });

    it('should handle empty DEM data gracefully', () => {
      const features = extractor.extractFeatures([], mockLocation as any);
      
      expect(features.slope).toBe(0);
      expect(features.aspect).toBeGreaterThanOrEqual(0);
      expect(Math.abs(features.curvature)).toBeLessThan(0.1);
      expect(features.roughness).toBe(0);
    });

    it('should calculate roughness for irregular terrain', () => {
      // Create irregular terrain centered around location (20, 20)
      const irregularDEM: DEMData[] = [
        { x: 19, y: 19, elevation: 95 },
        { x: 20, y: 19, elevation: 105 },
        { x: 21, y: 19, elevation: 98 },
        { x: 19, y: 20, elevation: 102 },
        { x: 20, y: 20, elevation: 100 },
        { x: 21, y: 20, elevation: 107 },
        { x: 19, y: 21, elevation: 99 },
        { x: 20, y: 21, elevation: 103 },
        { x: 21, y: 21, elevation: 96 }
      ];

      const features = extractor.extractFeatures(irregularDEM, mockLocation as any);
      
      expect(features.roughness).toBeGreaterThanOrEqual(0);
      expect(features.elevationVariance).toBeGreaterThan(0);
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
      const features = extractor.extractFeatures(largeDEM, mockLocation as any);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      expect(features).toBeDefined();
    });
  });
});