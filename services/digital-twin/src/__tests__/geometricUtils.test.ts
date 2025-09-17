import { Vector3 } from 'three';
import { GeometricUtils } from '../utils/geometricUtils';
import { Point3D, Triangle } from '../types/geometry';

describe('GeometricUtils', () => {
  describe('distance', () => {
    it('should calculate distance between two points correctly', () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 3, y: 4, z: 0 };
      
      const distance = GeometricUtils.distance(p1, p2);
      expect(distance).toBeCloseTo(5.0, 5);
    });

    it('should handle 3D distance calculation', () => {
      const p1: Point3D = { x: 1, y: 1, z: 1 };
      const p2: Point3D = { x: 4, y: 5, z: 5 };
      
      const distance = GeometricUtils.distance(p1, p2);
      expect(distance).toBeCloseTo(Math.sqrt(41), 5);
    });
  });

  describe('calculateTriangleNormal', () => {
    it('should calculate normal for a horizontal triangle', () => {
      const triangle: Triangle = {
        vertices: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 }
        ],
        normal: new Vector3(),
        area: 0
      };

      const normal = GeometricUtils.calculateTriangleNormal(triangle);
      
      expect(normal.x).toBeCloseTo(0, 5);
      expect(normal.y).toBeCloseTo(0, 5);
      expect(normal.z).toBeCloseTo(1, 5);
    });

    it('should calculate normal for a vertical triangle', () => {
      const triangle: Triangle = {
        vertices: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 0, z: 1 }
        ],
        normal: new Vector3(),
        area: 0
      };

      const normal = GeometricUtils.calculateTriangleNormal(triangle);
      
      expect(normal.x).toBeCloseTo(0, 5);
      expect(normal.y).toBeCloseTo(-1, 5);
      expect(normal.z).toBeCloseTo(0, 5);
    });
  });

  describe('calculateTriangleArea', () => {
    it('should calculate area of a right triangle', () => {
      const triangle: Triangle = {
        vertices: [
          { x: 0, y: 0, z: 0 },
          { x: 3, y: 0, z: 0 },
          { x: 0, y: 4, z: 0 }
        ],
        normal: new Vector3(),
        area: 0
      };

      const area = GeometricUtils.calculateTriangleArea(triangle);
      expect(area).toBeCloseTo(6.0, 5);
    });

    it('should calculate area of an equilateral triangle', () => {
      const side = 2;
      const height = side * Math.sqrt(3) / 2;
      
      const triangle: Triangle = {
        vertices: [
          { x: 0, y: 0, z: 0 },
          { x: side, y: 0, z: 0 },
          { x: side / 2, y: height, z: 0 }
        ],
        normal: new Vector3(),
        area: 0
      };

      const area = GeometricUtils.calculateTriangleArea(triangle);
      const expectedArea = (side * height) / 2;
      expect(area).toBeCloseTo(expectedArea, 5);
    });
  });

  describe('calculateSlope', () => {
    it('should return 0 degrees for horizontal surface', () => {
      const normal = new Vector3(0, 0, 1);
      const slope = GeometricUtils.calculateSlope(normal);
      expect(slope).toBeCloseTo(0, 5);
    });

    it('should return 90 degrees for vertical surface', () => {
      const normal = new Vector3(1, 0, 0);
      const slope = GeometricUtils.calculateSlope(normal);
      expect(slope).toBeCloseTo(90, 5);
    });

    it('should return 45 degrees for 45-degree slope', () => {
      const normal = new Vector3(0, Math.sqrt(2)/2, Math.sqrt(2)/2);
      normal.normalize();
      const slope = GeometricUtils.calculateSlope(normal);
      expect(slope).toBeCloseTo(45, 1);
    });
  });

  describe('calculateAspect', () => {
    it('should return 0 degrees for north-facing slope', () => {
      const normal = new Vector3(0, 1, 1);
      normal.normalize();
      const aspect = GeometricUtils.calculateAspect(normal);
      expect(aspect).toBeCloseTo(0, 5);
    });

    it('should return 90 degrees for east-facing slope', () => {
      const normal = new Vector3(1, 0, 1);
      normal.normalize();
      const aspect = GeometricUtils.calculateAspect(normal);
      expect(aspect).toBeCloseTo(90, 5);
    });

    it('should return 180 degrees for south-facing slope', () => {
      const normal = new Vector3(0, -1, 1);
      normal.normalize();
      const aspect = GeometricUtils.calculateAspect(normal);
      expect(aspect).toBeCloseTo(180, 5);
    });

    it('should return 270 degrees for west-facing slope', () => {
      const normal = new Vector3(-1, 0, 1);
      normal.normalize();
      const aspect = GeometricUtils.calculateAspect(normal);
      expect(aspect).toBeCloseTo(270, 5);
    });
  });

  describe('calculateRoughness', () => {
    it('should return 0 for perfectly flat surface', () => {
      const points: Point3D[] = [
        { x: 0, y: 0, z: 5 },
        { x: 1, y: 0, z: 5 },
        { x: 0, y: 1, z: 5 },
        { x: 1, y: 1, z: 5 }
      ];

      const roughness = GeometricUtils.calculateRoughness(points);
      expect(roughness).toBeCloseTo(0, 5);
    });

    it('should return positive value for rough surface', () => {
      const points: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 1 },
        { x: 0, y: 1, z: 2 },
        { x: 1, y: 1, z: 3 }
      ];

      const roughness = GeometricUtils.calculateRoughness(points);
      expect(roughness).toBeGreaterThan(0);
    });
  });

  describe('analyzeGeometry', () => {
    it('should classify flat surface as stable', () => {
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const neighbors: Point3D[] = [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 }
      ];
      const normal = new Vector3(0, 0, 1);

      const analysis = GeometricUtils.analyzeGeometry(center, neighbors, normal);
      
      expect(analysis.slope).toBeCloseTo(0, 1);
      expect(analysis.stability.classification).toBe('stable');
      expect(analysis.stability.factor).toBeGreaterThan(0.8);
    });

    it('should classify steep surface as unstable', () => {
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const neighbors: Point3D[] = [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 2 }, // Very steep
        { x: -1, y: 0, z: 0 },
        { x: 0, y: -1, z: 2 }
      ];
      const normal = new Vector3(0.95, 0, 0.31); // ~72 degree slope
      normal.normalize();

      const analysis = GeometricUtils.analyzeGeometry(center, neighbors, normal);
      
      expect(analysis.slope).toBeGreaterThan(70);
      expect(analysis.stability.classification).toBe('unstable');
      expect(analysis.stability.factor).toBeLessThan(0.5);
    });
  });

  describe('isPointInBoundingBox', () => {
    it('should return true for point inside bounding box', () => {
      const point: Point3D = { x: 5, y: 5, z: 5 };
      const min: Point3D = { x: 0, y: 0, z: 0 };
      const max: Point3D = { x: 10, y: 10, z: 10 };

      const result = GeometricUtils.isPointInBoundingBox(point, min, max);
      expect(result).toBe(true);
    });

    it('should return false for point outside bounding box', () => {
      const point: Point3D = { x: 15, y: 5, z: 5 };
      const min: Point3D = { x: 0, y: 0, z: 0 };
      const max: Point3D = { x: 10, y: 10, z: 10 };

      const result = GeometricUtils.isPointInBoundingBox(point, min, max);
      expect(result).toBe(false);
    });

    it('should return true for point on bounding box boundary', () => {
      const point: Point3D = { x: 10, y: 10, z: 10 };
      const min: Point3D = { x: 0, y: 0, z: 0 };
      const max: Point3D = { x: 10, y: 10, z: 10 };

      const result = GeometricUtils.isPointInBoundingBox(point, min, max);
      expect(result).toBe(true);
    });
  });

  describe('calculateCentroid', () => {
    it('should calculate centroid of triangle correctly', () => {
      const vertices: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 0, y: 3, z: 0 }
      ];

      const centroid = GeometricUtils.calculateCentroid(vertices);
      
      expect(centroid.x).toBeCloseTo(1, 5);
      expect(centroid.y).toBeCloseTo(1, 5);
      expect(centroid.z).toBeCloseTo(0, 5);
    });

    it('should calculate centroid of square correctly', () => {
      const vertices: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 2, y: 2, z: 0 },
        { x: 0, y: 2, z: 0 }
      ];

      const centroid = GeometricUtils.calculateCentroid(vertices);
      
      expect(centroid.x).toBeCloseTo(1, 5);
      expect(centroid.y).toBeCloseTo(1, 5);
      expect(centroid.z).toBeCloseTo(0, 5);
    });
  });
});