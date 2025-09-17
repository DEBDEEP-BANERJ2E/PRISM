import { SpatialLocation } from './SpatialLocation';
import { Polygon } from './SlopeSegment';

/**
 * Utility functions for geometric calculations and transformations
 */
export class GeometricUtils {
  
  /**
   * Calculate the great circle distance between two points using Haversine formula
   */
  public static haversineDistance(point1: SpatialLocation, point2: SpatialLocation): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = point1.latitude * Math.PI / 180;
    const lat2Rad = point2.latitude * Math.PI / 180;
    const deltaLatRad = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLonRad = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate bearing between two points
   */
  public static calculateBearing(from: SpatialLocation, to: SpatialLocation): number {
    const lat1Rad = from.latitude * Math.PI / 180;
    const lat2Rad = to.latitude * Math.PI / 180;
    const deltaLonRad = (to.longitude - from.longitude) * Math.PI / 180;

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    const bearingRad = Math.atan2(y, x);
    return ((bearingRad * 180 / Math.PI) + 360) % 360;
  }

  /**
   * Calculate slope angle from elevation difference and horizontal distance
   */
  public static calculateSlopeAngle(elevationDiff: number, horizontalDistance: number): number {
    if (horizontalDistance === 0) return 90;
    return Math.atan(Math.abs(elevationDiff) / horizontalDistance) * 180 / Math.PI;
  }

  /**
   * Calculate aspect (direction of steepest descent) from gradient components
   */
  public static calculateAspect(dzdx: number, dzdy: number): number {
    if (dzdx === 0 && dzdy === 0) return 0;
    let aspect = Math.atan2(-dzdy, -dzdx) * 180 / Math.PI;
    if (aspect < 0) aspect += 360;
    return aspect;
  }

  /**
   * Calculate curvature from second derivatives
   */
  public static calculateCurvature(d2zdx2: number, d2zdy2: number, d2zdxdy: number, dzdx: number, dzdy: number): number {
    const p = dzdx;
    const q = dzdy;
    const r = d2zdx2;
    const s = d2zdxdy;
    const t = d2zdy2;

    const denominator = Math.pow(1 + p * p + q * q, 1.5);
    if (denominator === 0) return 0;

    return -(r * (1 + q * q) - 2 * p * q * s + t * (1 + p * p)) / denominator;
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  public static pointInPolygon(point: [number, number], polygon: Polygon): boolean {
    const [x, y] = point;
    const vertices = polygon.coordinates[0]; // Exterior ring
    let inside = false;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const [xi, yi] = vertices[i];
      const [xj, yj] = vertices[j];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Calculate polygon area using shoelace formula
   */
  public static polygonArea(polygon: Polygon): number {
    const vertices = polygon.coordinates[0];
    let area = 0;

    for (let i = 0; i < vertices.length - 1; i++) {
      const [x1, y1] = vertices[i];
      const [x2, y2] = vertices[i + 1];
      area += (x1 * y2 - x2 * y1);
    }

    return Math.abs(area) / 2;
  }

  /**
   * Calculate polygon perimeter
   */
  public static polygonPerimeter(polygon: Polygon): number {
    const vertices = polygon.coordinates[0];
    let perimeter = 0;

    for (let i = 0; i < vertices.length - 1; i++) {
      const [x1, y1] = vertices[i];
      const [x2, y2] = vertices[i + 1];
      perimeter += Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    return perimeter;
  }

  /**
   * Calculate polygon centroid
   */
  public static polygonCentroid(polygon: Polygon): [number, number, number] {
    const vertices = polygon.coordinates[0];
    let x = 0, y = 0, z = 0;
    let count = 0;

    // Exclude the last vertex as it's the same as the first (closing vertex)
    for (let i = 0; i < vertices.length - 1; i++) {
      const vertex = vertices[i];
      if (vertex.length >= 2) {
        x += vertex[0];
        y += vertex[1];
        z += vertex[2] || 0;
        count++;
      }
    }

    return [x / count, y / count, z / count];
  }

  /**
   * Calculate minimum bounding rectangle of a polygon
   */
  public static boundingRectangle(polygon: Polygon): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } {
    const vertices = polygon.coordinates[0];
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const [x, y] of vertices) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Calculate distance from point to line segment
   */
  public static pointToLineDistance(
    point: [number, number],
    lineStart: [number, number],
    lineEnd: [number, number]
  ): number {
    const [px, py] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;

    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      // Line segment is a point
      return Math.sqrt(A * A + B * B);
    }

    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));

    const xx = x1 + param * C;
    const yy = y1 + param * D;

    const dx = px - xx;
    const dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Simplify polygon using Douglas-Peucker algorithm
   */
  public static simplifyPolygon(polygon: Polygon, tolerance: number): Polygon {
    const vertices = polygon.coordinates[0];
    const simplified = this.douglasPeucker(vertices, tolerance);
    
    return {
      type: 'Polygon',
      coordinates: [simplified]
    };
  }

  private static douglasPeucker(points: number[][], tolerance: number): number[][] {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let maxIndex = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
      const distance = this.pointToLineDistance(
        [points[i][0], points[i][1]],
        [points[0][0], points[0][1]],
        [points[end][0], points[end][1]]
      );

      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
      
      return left.slice(0, -1).concat(right);
    } else {
      return [points[0], points[end]];
    }
  }

  /**
   * Validate coordinate bounds
   */
  public static isValidLatitude(lat: number): boolean {
    return lat >= -90 && lat <= 90;
  }

  public static isValidLongitude(lon: number): boolean {
    return lon >= -180 && lon <= 180;
  }

  public static isValidCoordinate(lat: number, lon: number): boolean {
    return this.isValidLatitude(lat) && this.isValidLongitude(lon);
  }

  /**
   * Convert degrees to radians
   */
  public static toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  /**
   * Convert radians to degrees
   */
  public static toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }

  /**
   * Normalize angle to 0-360 range
   */
  public static normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
  }
}