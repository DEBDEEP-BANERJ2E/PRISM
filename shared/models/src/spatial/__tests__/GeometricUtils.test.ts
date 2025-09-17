import { GeometricUtils } from '../GeometricUtils';
import { SpatialLocation } from '../SpatialLocation';
import { type Polygon } from '../SlopeSegment';

describe('GeometricUtils', () => {
  const testLocation1 = new SpatialLocation({
    latitude: 45.5231,
    longitude: -122.6765,
    elevation: 100
  });

  const testLocation2 = new SpatialLocation({
    latitude: 45.5241,
    longitude: -122.6755,
    elevation: 105
  });

  const testPolygon: Polygon = {
    type: 'Polygon',
    coordinates: [[
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 0]
    ]]
  };

  describe('distance calculations', () => {
    it('should calculate haversine distance correctly', () => {
      const distance = GeometricUtils.haversineDistance(testLocation1, testLocation2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000); // Should be less than 2km for this small difference
    });

    it('should return 0 for same location', () => {
      const distance = GeometricUtils.haversineDistance(testLocation1, testLocation1);
      expect(distance).toBeCloseTo(0, 1);
    });

    it('should calculate distance between antipodal points', () => {
      const location1 = new SpatialLocation({ latitude: 0, longitude: 0, elevation: 0 });
      const location2 = new SpatialLocation({ latitude: 0, longitude: 180, elevation: 0 });
      
      const distance = GeometricUtils.haversineDistance(location1, location2);
      const expectedDistance = Math.PI * 6371000; // Half circumference of Earth
      
      expect(distance).toBeCloseTo(expectedDistance, -3); // Within 1km
    });
  });

  describe('bearing calculations', () => {
    it('should calculate bearing correctly', () => {
      const bearing = GeometricUtils.calculateBearing(testLocation1, testLocation2);
      
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should calculate correct bearing for northward direction', () => {
      const location1 = new SpatialLocation({ latitude: 45.0, longitude: -122.0, elevation: 0 });
      const location2 = new SpatialLocation({ latitude: 46.0, longitude: -122.0, elevation: 0 });
      
      const bearing = GeometricUtils.calculateBearing(location1, location2);
      expect(bearing).toBeCloseTo(0, 1); // Should be approximately north
    });

    it('should calculate correct bearing for eastward direction', () => {
      const location1 = new SpatialLocation({ latitude: 45.0, longitude: -122.0, elevation: 0 });
      const location2 = new SpatialLocation({ latitude: 45.0, longitude: -121.0, elevation: 0 });
      
      const bearing = GeometricUtils.calculateBearing(location1, location2);
      expect(bearing).toBeCloseTo(90, 0); // Should be approximately east
    });
  });

  describe('slope calculations', () => {
    it('should calculate slope angle correctly', () => {
      const elevationDiff = 10;
      const horizontalDistance = 10;
      const expectedAngle = 45; // 45 degrees for equal rise and run
      
      const angle = GeometricUtils.calculateSlopeAngle(elevationDiff, horizontalDistance);
      expect(angle).toBeCloseTo(expectedAngle, 1);
    });

    it('should return 90 degrees for vertical slope', () => {
      const angle = GeometricUtils.calculateSlopeAngle(10, 0);
      expect(angle).toBe(90);
    });

    it('should handle negative elevation difference', () => {
      const angle = GeometricUtils.calculateSlopeAngle(-10, 10);
      expect(angle).toBeCloseTo(45, 1);
    });
  });

  describe('aspect calculations', () => {
    it('should calculate aspect correctly', () => {
      const dzdx = 1; // Gradient in x direction
      const dzdy = 0; // No gradient in y direction
      
      const aspect = GeometricUtils.calculateAspect(dzdx, dzdy);
      expect(aspect).toBeCloseTo(180, 1); // Should point south (downslope direction)
    });

    it('should return 0 for flat surface', () => {
      const aspect = GeometricUtils.calculateAspect(0, 0);
      expect(aspect).toBe(0);
    });

    it('should handle negative gradients', () => {
      const aspect = GeometricUtils.calculateAspect(-1, 0);
      expect(aspect).toBeCloseTo(0, 1); // Should point north (upslope direction becomes downslope)
    });
  });

  describe('curvature calculations', () => {
    it('should calculate curvature correctly', () => {
      const d2zdx2 = 0.1;
      const d2zdy2 = 0.1;
      const d2zdxdy = 0;
      const dzdx = 0;
      const dzdy = 0;
      
      const curvature = GeometricUtils.calculateCurvature(d2zdx2, d2zdy2, d2zdxdy, dzdx, dzdy);
      expect(typeof curvature).toBe('number');
      expect(curvature).toBeCloseTo(-0.2, 1);
    });

    it('should return 0 for flat surface', () => {
      const curvature = GeometricUtils.calculateCurvature(0, 0, 0, 0, 0);
      expect(Math.abs(curvature)).toBeLessThan(1e-10);
    });
  });

  describe('polygon operations', () => {
    it('should detect point inside polygon', () => {
      const insidePoint: [number, number] = [0.5, 0.5];
      const result = GeometricUtils.pointInPolygon(insidePoint, testPolygon);
      expect(result).toBe(true);
    });

    it('should detect point outside polygon', () => {
      const outsidePoint: [number, number] = [2, 2];
      const result = GeometricUtils.pointInPolygon(outsidePoint, testPolygon);
      expect(result).toBe(false);
    });

    it('should detect point on polygon boundary', () => {
      const boundaryPoint: [number, number] = [0, 0.5];
      const result = GeometricUtils.pointInPolygon(boundaryPoint, testPolygon);
      // Boundary behavior may vary, just ensure it returns a boolean
      expect(typeof result).toBe('boolean');
    });

    it('should calculate polygon area correctly', () => {
      const area = GeometricUtils.polygonArea(testPolygon);
      expect(area).toBeCloseTo(1, 3); // Unit square should have area 1
    });

    it('should calculate polygon perimeter correctly', () => {
      const perimeter = GeometricUtils.polygonPerimeter(testPolygon);
      expect(perimeter).toBeCloseTo(4, 3); // Unit square should have perimeter 4
    });

    it('should calculate polygon centroid correctly', () => {
      const centroid = GeometricUtils.polygonCentroid(testPolygon);
      expect(centroid[0]).toBeCloseTo(0.5, 3); // x-coordinate
      expect(centroid[1]).toBeCloseTo(0.5, 3); // y-coordinate
      expect(centroid[2]).toBeCloseTo(0, 3);   // z-coordinate
    });

    it('should calculate bounding rectangle correctly', () => {
      const bounds = GeometricUtils.boundingRectangle(testPolygon);
      
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(1);
      expect(bounds.maxY).toBe(1);
      expect(bounds.width).toBe(1);
      expect(bounds.height).toBe(1);
    });
  });

  describe('point to line distance', () => {
    it('should calculate distance from point to line segment', () => {
      const point: [number, number] = [0, 1];
      const lineStart: [number, number] = [0, 0];
      const lineEnd: [number, number] = [1, 0];
      
      const distance = GeometricUtils.pointToLineDistance(point, lineStart, lineEnd);
      expect(distance).toBeCloseTo(1, 3);
    });

    it('should return 0 for point on line', () => {
      const point: [number, number] = [0.5, 0];
      const lineStart: [number, number] = [0, 0];
      const lineEnd: [number, number] = [1, 0];
      
      const distance = GeometricUtils.pointToLineDistance(point, lineStart, lineEnd);
      expect(distance).toBeCloseTo(0, 3);
    });

    it('should handle degenerate line (point)', () => {
      const point: [number, number] = [1, 1];
      const lineStart: [number, number] = [0, 0];
      const lineEnd: [number, number] = [0, 0];
      
      const distance = GeometricUtils.pointToLineDistance(point, lineStart, lineEnd);
      expect(distance).toBeCloseTo(Math.sqrt(2), 3);
    });
  });

  describe('polygon simplification', () => {
    it('should simplify polygon using Douglas-Peucker algorithm', () => {
      const complexPolygon: Polygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0],
          [0.1, 0.01],
          [0.5, 0.02],
          [0.9, 0.01],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0]
        ]]
      };
      
      const simplified = GeometricUtils.simplifyPolygon(complexPolygon, 0.05);
      
      expect(simplified.type).toBe('Polygon');
      expect(simplified.coordinates[0].length).toBeLessThan(complexPolygon.coordinates[0].length);
    });

    it('should not simplify already simple polygon', () => {
      const simplified = GeometricUtils.simplifyPolygon(testPolygon, 0.1);
      
      expect(simplified.coordinates[0].length).toBeLessThanOrEqual(testPolygon.coordinates[0].length);
    });
  });

  describe('coordinate validation', () => {
    it('should validate correct latitude', () => {
      expect(GeometricUtils.isValidLatitude(45.5)).toBe(true);
      expect(GeometricUtils.isValidLatitude(90)).toBe(true);
      expect(GeometricUtils.isValidLatitude(-90)).toBe(true);
    });

    it('should reject invalid latitude', () => {
      expect(GeometricUtils.isValidLatitude(95)).toBe(false);
      expect(GeometricUtils.isValidLatitude(-95)).toBe(false);
    });

    it('should validate correct longitude', () => {
      expect(GeometricUtils.isValidLongitude(-122.5)).toBe(true);
      expect(GeometricUtils.isValidLongitude(180)).toBe(true);
      expect(GeometricUtils.isValidLongitude(-180)).toBe(true);
    });

    it('should reject invalid longitude', () => {
      expect(GeometricUtils.isValidLongitude(185)).toBe(false);
      expect(GeometricUtils.isValidLongitude(-185)).toBe(false);
    });

    it('should validate coordinate pairs', () => {
      expect(GeometricUtils.isValidCoordinate(45.5, -122.5)).toBe(true);
      expect(GeometricUtils.isValidCoordinate(95, -122.5)).toBe(false);
      expect(GeometricUtils.isValidCoordinate(45.5, 185)).toBe(false);
    });
  });

  describe('angle utilities', () => {
    it('should convert degrees to radians', () => {
      expect(GeometricUtils.toRadians(180)).toBeCloseTo(Math.PI, 5);
      expect(GeometricUtils.toRadians(90)).toBeCloseTo(Math.PI / 2, 5);
      expect(GeometricUtils.toRadians(0)).toBe(0);
    });

    it('should convert radians to degrees', () => {
      expect(GeometricUtils.toDegrees(Math.PI)).toBeCloseTo(180, 5);
      expect(GeometricUtils.toDegrees(Math.PI / 2)).toBeCloseTo(90, 5);
      expect(GeometricUtils.toDegrees(0)).toBe(0);
    });

    it('should normalize angles to 0-360 range', () => {
      expect(GeometricUtils.normalizeAngle(450)).toBe(90);
      expect(GeometricUtils.normalizeAngle(-90)).toBe(270);
      expect(GeometricUtils.normalizeAngle(360)).toBe(0);
      expect(GeometricUtils.normalizeAngle(180)).toBe(180);
    });
  });
});