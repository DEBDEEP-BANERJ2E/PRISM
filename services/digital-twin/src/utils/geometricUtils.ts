import { Vector3 } from 'three';
import { Point3D, Triangle, GeometricAnalysis } from '../types/geometry';

export class GeometricUtils {
  /**
   * Calculate the distance between two 3D points
   */
  static distance(p1: Point3D, p2: Point3D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate the normal vector for a triangle
   */
  static calculateTriangleNormal(triangle: Triangle): Vector3 {
    const [v1, v2, v3] = triangle.vertices;
    
    const edge1 = new Vector3(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const edge2 = new Vector3(v3.x - v1.x, v3.y - v1.y, v3.z - v1.z);
    
    const normal = new Vector3();
    normal.crossVectors(edge1, edge2);
    normal.normalize();
    
    return normal;
  }

  /**
   * Calculate the area of a triangle
   */
  static calculateTriangleArea(triangle: Triangle): number {
    const [v1, v2, v3] = triangle.vertices;
    
    const edge1 = new Vector3(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const edge2 = new Vector3(v3.x - v1.x, v3.y - v1.y, v3.z - v1.z);
    
    const cross = new Vector3();
    cross.crossVectors(edge1, edge2);
    
    return cross.length() * 0.5;
  }

  /**
   * Calculate slope angle from normal vector (in degrees)
   */
  static calculateSlope(normal: Vector3): number {
    // Slope is the angle between the normal and the vertical (z-axis)
    const vertical = new Vector3(0, 0, 1);
    const angle = normal.angleTo(vertical);
    return (angle * 180 / Math.PI); // Convert to degrees - this IS the slope angle
  }

  /**
   * Calculate aspect (direction of steepest descent) from normal vector (in degrees from north)
   */
  static calculateAspect(normal: Vector3): number {
    // Project normal onto horizontal plane
    const horizontal = new Vector3(normal.x, normal.y, 0);
    horizontal.normalize();
    
    // Calculate angle from north (positive y-axis)
    const north = new Vector3(0, 1, 0);
    let angle = Math.atan2(horizontal.x, horizontal.y) * 180 / Math.PI;
    
    // Ensure angle is between 0 and 360
    if (angle < 0) angle += 360;
    
    return angle;
  }

  /**
   * Calculate curvature at a point using neighboring vertices
   */
  static calculateCurvature(
    center: Point3D,
    neighbors: Point3D[],
    centerNormal: Vector3
  ): { mean: number; gaussian: number; principal1: number; principal2: number } {
    if (neighbors.length < 3) {
      return { mean: 0, gaussian: 0, principal1: 0, principal2: 0 };
    }

    // Simplified curvature calculation using discrete differential geometry
    // This is a basic implementation - in production, you'd use more sophisticated methods
    
    let totalCurvature = 0;
    let angleDeficit = 0;
    
    for (let i = 0; i < neighbors.length; i++) {
      const p1 = neighbors[i];
      const p2 = neighbors[(i + 1) % neighbors.length];
      
      // Calculate edge vectors
      const edge1 = new Vector3(p1.x - center.x, p1.y - center.y, p1.z - center.z);
      const edge2 = new Vector3(p2.x - center.x, p2.y - center.y, p2.z - center.z);
      
      // Calculate angle between edges
      const angle = edge1.angleTo(edge2);
      angleDeficit += angle;
      
      // Estimate curvature contribution
      const edgeLength = (edge1.length() + edge2.length()) / 2;
      if (edgeLength > 0) {
        totalCurvature += angle / edgeLength;
      }
    }
    
    // Gaussian curvature approximation using angle deficit
    const gaussianCurvature = (2 * Math.PI - angleDeficit) / this.calculateLocalArea(center, neighbors);
    
    // Mean curvature approximation
    const meanCurvature = totalCurvature / neighbors.length;
    
    // Principal curvatures (simplified)
    const discriminant = Math.max(0, meanCurvature * meanCurvature - gaussianCurvature);
    const principal1 = meanCurvature + Math.sqrt(discriminant);
    const principal2 = meanCurvature - Math.sqrt(discriminant);
    
    return {
      mean: meanCurvature,
      gaussian: gaussianCurvature,
      principal1,
      principal2
    };
  }

  /**
   * Calculate local area around a vertex
   */
  private static calculateLocalArea(center: Point3D, neighbors: Point3D[]): number {
    let area = 0;
    
    for (let i = 0; i < neighbors.length; i++) {
      const p1 = neighbors[i];
      const p2 = neighbors[(i + 1) % neighbors.length];
      
      // Calculate triangle area
      const triangle: Triangle = {
        vertices: [center, p1, p2],
        normal: new Vector3(),
        area: 0
      };
      
      area += this.calculateTriangleArea(triangle);
    }
    
    return area;
  }

  /**
   * Calculate surface roughness using standard deviation of elevations
   */
  static calculateRoughness(points: Point3D[], windowSize: number = 1.0): number {
    if (points.length < 2) return 0;
    
    // Calculate mean elevation
    const meanZ = points.reduce((sum, p) => sum + p.z, 0) / points.length;
    
    // Calculate standard deviation
    const variance = points.reduce((sum, p) => sum + Math.pow(p.z - meanZ, 2), 0) / points.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Perform geometric analysis on a surface patch
   */
  static analyzeGeometry(
    center: Point3D,
    neighbors: Point3D[],
    normal: Vector3
  ): GeometricAnalysis {
    const slope = this.calculateSlope(normal);
    const aspect = this.calculateAspect(normal);
    const curvature = this.calculateCurvature(center, neighbors, normal);
    const roughness = this.calculateRoughness([center, ...neighbors]);
    
    // Simple stability classification based on slope
    let stabilityFactor = 1.0;
    let classification: 'stable' | 'marginally_stable' | 'unstable' = 'stable';
    
    if (slope > 70) {
      stabilityFactor = 0.3;
      classification = 'unstable';
    } else if (slope > 45) {
      stabilityFactor = 0.6;
      classification = 'marginally_stable';
    } else {
      stabilityFactor = 0.9;
      classification = 'stable';
    }
    
    // Adjust for curvature (concave surfaces are less stable)
    if (curvature.mean < -0.1) {
      stabilityFactor *= 0.8;
    }
    
    return {
      slope,
      aspect,
      curvature,
      roughness,
      stability: {
        factor: stabilityFactor,
        classification
      }
    };
  }

  /**
   * Check if a point is inside a bounding box
   */
  static isPointInBoundingBox(
    point: Point3D,
    min: Point3D,
    max: Point3D
  ): boolean {
    return (
      point.x >= min.x && point.x <= max.x &&
      point.y >= min.y && point.y <= max.y &&
      point.z >= min.z && point.z <= max.z
    );
  }

  /**
   * Calculate centroid of a triangle
   */
  static calculateCentroid(vertices: Point3D[]): Point3D {
    const sum = vertices.reduce(
      (acc, vertex) => ({
        x: acc.x + vertex.x,
        y: acc.y + vertex.y,
        z: acc.z + vertex.z
      }),
      { x: 0, y: 0, z: 0 }
    );
    
    return {
      x: sum.x / vertices.length,
      y: sum.y / vertices.length,
      z: sum.z / vertices.length
    };
  }
}