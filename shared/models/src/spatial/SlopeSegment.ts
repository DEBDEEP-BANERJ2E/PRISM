import { z } from 'zod';
import { SpatialLocation, SpatialLocationSchema } from './SpatialLocation';

// Polygon geometry type
export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()).min(2).max(3)))
});

export type Polygon = z.infer<typeof PolygonSchema>;

// Joint orientation schema
export const JointOrientationSchema = z.object({
  dip: z.number().min(0).max(90), // Dip angle in degrees
  dip_direction: z.number().min(0).max(360), // Dip direction in degrees
  strike: z.number().min(0).max(360), // Strike in degrees
  persistence: z.number().min(0).max(1).optional(), // Joint persistence (0-1)
  roughness: z.enum(['very_rough', 'rough', 'slightly_rough', 'smooth', 'slickensided']).optional(),
  aperture: z.number().min(0).optional(), // Joint aperture in mm
  filling: z.string().optional() // Joint filling material
});

export type JointOrientation = z.infer<typeof JointOrientationSchema>;

// Rock type enumeration
export const RockTypeSchema = z.enum([
  'granite', 'basalt', 'limestone', 'sandstone', 'shale', 'quartzite',
  'gneiss', 'schist', 'slate', 'marble', 'dolomite', 'conglomerate',
  'breccia', 'tuff', 'andesite', 'rhyolite', 'other'
]);

export type RockType = z.infer<typeof RockTypeSchema>;

// Stability rating enumeration
export const StabilityRatingSchema = z.enum([
  'very_poor', 'poor', 'fair', 'good', 'very_good'
]);

export type StabilityRating = z.infer<typeof StabilityRatingSchema>;

// SlopeSegment validation schema
export const SlopeSegmentSchema = z.object({
  id: z.string().min(1),
  geometry: PolygonSchema,
  slope_angle: z.number().min(0).max(90),
  aspect: z.number().min(0).max(360),
  curvature: z.number(),
  rock_type: RockTypeSchema,
  joint_orientations: z.array(JointOrientationSchema),
  stability_rating: StabilityRatingSchema,
  centroid: SpatialLocationSchema.optional(),
  area: z.number().positive().optional(),
  perimeter: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bench_number: z.number().int().positive().optional(),
  geological_unit: z.string().optional(),
  weathering_grade: z.enum(['fresh', 'slightly_weathered', 'moderately_weathered', 'highly_weathered', 'completely_weathered']).optional(),
  discontinuity_spacing: z.number().positive().optional(), // Average spacing in meters
  rqd: z.number().min(0).max(100).optional(), // Rock Quality Designation percentage
  ucs: z.number().positive().optional(), // Unconfined Compressive Strength in MPa
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export type SlopeSegmentData = z.infer<typeof SlopeSegmentSchema>;

export class SlopeSegment {
  public readonly id: string;
  public readonly geometry: Polygon;
  public readonly slope_angle: number;
  public readonly aspect: number;
  public readonly curvature: number;
  public readonly rock_type: RockType;
  public readonly joint_orientations: JointOrientation[];
  public readonly stability_rating: StabilityRating;
  public readonly centroid?: SpatialLocation;
  public readonly area?: number;
  public readonly perimeter?: number;
  public readonly height?: number;
  public readonly bench_number?: number;
  public readonly geological_unit?: string;
  public readonly weathering_grade?: 'fresh' | 'slightly_weathered' | 'moderately_weathered' | 'highly_weathered' | 'completely_weathered';
  public readonly discontinuity_spacing?: number;
  public readonly rqd?: number;
  public readonly ucs?: number;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;

  constructor(data: SlopeSegmentData) {
    const validated = SlopeSegmentSchema.parse(data);
    
    this.id = validated.id;
    this.geometry = validated.geometry;
    this.slope_angle = validated.slope_angle;
    this.aspect = validated.aspect;
    this.curvature = validated.curvature;
    this.rock_type = validated.rock_type;
    this.joint_orientations = validated.joint_orientations;
    this.stability_rating = validated.stability_rating;
    this.bench_number = validated.bench_number;
    this.geological_unit = validated.geological_unit;
    this.weathering_grade = validated.weathering_grade;
    this.discontinuity_spacing = validated.discontinuity_spacing;
    this.rqd = validated.rqd;
    this.ucs = validated.ucs;
    this.created_at = validated.created_at;
    this.updated_at = validated.updated_at;

    // Calculate centroid if not provided
    if (validated.centroid) {
      this.centroid = new SpatialLocation(validated.centroid);
    } else {
      this.centroid = this.calculateCentroid();
    }

    // Calculate area and perimeter if not provided
    this.area = validated.area || this.calculateArea();
    this.perimeter = validated.perimeter || this.calculatePerimeter();
    this.height = validated.height;
  }

  /**
   * Calculate the centroid of the polygon geometry
   */
  private calculateCentroid(): SpatialLocation {
    const coordinates = this.geometry.coordinates[0]; // Exterior ring
    let x = 0, y = 0, z = 0;
    let count = 0;

    // Exclude the last vertex as it's the same as the first (closing vertex)
    for (let i = 0; i < coordinates.length - 1; i++) {
      const coord = coordinates[i];
      if (coord.length >= 2) {
        x += coord[0]; // longitude
        y += coord[1]; // latitude
        z += coord[2] || 0; // elevation
        count++;
      }
    }

    return new SpatialLocation({
      longitude: x / count,
      latitude: y / count,
      elevation: z / count
    });
  }

  /**
   * Calculate the area of the polygon in square meters
   */
  private calculateArea(): number {
    const coordinates = this.geometry.coordinates[0];
    let area = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const [x1, y1] = coordinates[i];
      const [x2, y2] = coordinates[i + 1];
      area += (x1 * y2 - x2 * y1);
    }

    return Math.abs(area) / 2;
  }

  /**
   * Calculate the perimeter of the polygon in meters
   */
  private calculatePerimeter(): number {
    const coordinates = this.geometry.coordinates[0];
    let perimeter = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const [x1, y1] = coordinates[i];
      const [x2, y2] = coordinates[i + 1];
      const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      perimeter += distance;
    }

    return perimeter;
  }

  /**
   * Calculate slope stability factor based on joint orientations and rock properties
   */
  public calculateStabilityFactor(): number {
    let stabilityFactor = 1.0;

    // Adjust for slope angle (steeper slopes are less stable)
    stabilityFactor *= Math.cos(this.slope_angle * Math.PI / 180);

    // Adjust for joint orientations (unfavorable orientations reduce stability)
    for (const joint of this.joint_orientations) {
      const angleDiff = Math.abs(joint.dip_direction - this.aspect);
      if (angleDiff < 30 || angleDiff > 330) {
        // Joint dips in same direction as slope face - unfavorable
        stabilityFactor *= 0.7;
      }
    }

    // Adjust for rock quality
    const rqdFactor = this.rqd ? this.rqd / 100 : 0.5;
    stabilityFactor *= rqdFactor;

    // Adjust for weathering
    const weatheringFactors = {
      'fresh': 1.0,
      'slightly_weathered': 0.9,
      'moderately_weathered': 0.7,
      'highly_weathered': 0.5,
      'completely_weathered': 0.3
    };
    
    if (this.weathering_grade && this.weathering_grade in weatheringFactors) {
      stabilityFactor *= weatheringFactors[this.weathering_grade as keyof typeof weatheringFactors];
    }

    return Math.max(0, Math.min(1, stabilityFactor));
  }

  /**
   * Check if a point is within this slope segment
   */
  public containsPoint(location: SpatialLocation): boolean {
    const point = [location.longitude, location.latitude];
    const polygon = this.geometry.coordinates[0];

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (((yi > point[1]) !== (yj > point[1])) &&
          (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Get the dominant joint orientation (most critical for stability)
   */
  public getDominantJointOrientation(): JointOrientation | null {
    if (this.joint_orientations.length === 0) return null;

    // Find joint with orientation most similar to slope aspect
    let dominantJoint = this.joint_orientations[0];
    let minAngleDiff = Math.abs(dominantJoint.dip_direction - this.aspect);

    for (const joint of this.joint_orientations) {
      const angleDiff = Math.abs(joint.dip_direction - this.aspect);
      if (angleDiff < minAngleDiff) {
        minAngleDiff = angleDiff;
        dominantJoint = joint;
      }
    }

    return dominantJoint;
  }

  /**
   * Validate slope segment data
   */
  public static validate(data: unknown): SlopeSegmentData {
    return SlopeSegmentSchema.parse(data);
  }

  /**
   * Convert to GeoJSON Feature
   */
  public toGeoJSON(): {
    type: 'Feature';
    geometry: Polygon;
    properties: Record<string, any>;
  } {
    return {
      type: 'Feature',
      geometry: this.geometry,
      properties: {
        id: this.id,
        slope_angle: this.slope_angle,
        aspect: this.aspect,
        curvature: this.curvature,
        rock_type: this.rock_type,
        joint_orientations: this.joint_orientations,
        stability_rating: this.stability_rating,
        area: this.area,
        perimeter: this.perimeter,
        height: this.height,
        bench_number: this.bench_number,
        geological_unit: this.geological_unit,
        weathering_grade: this.weathering_grade,
        discontinuity_spacing: this.discontinuity_spacing,
        rqd: this.rqd,
        ucs: this.ucs,
        stability_factor: this.calculateStabilityFactor(),
        centroid: this.centroid?.toGeoJSON(),
        created_at: this.created_at?.toISOString(),
        updated_at: this.updated_at?.toISOString()
      }
    };
  }

  /**
   * Create from GeoJSON Feature
   */
  public static fromGeoJSON(geojson: any): SlopeSegment {
    if (geojson.type !== 'Feature' || geojson.geometry.type !== 'Polygon') {
      throw new Error('Invalid GeoJSON Feature format for SlopeSegment');
    }

    const properties = geojson.properties || {};
    
    return new SlopeSegment({
      id: properties.id,
      geometry: geojson.geometry,
      slope_angle: properties.slope_angle,
      aspect: properties.aspect,
      curvature: properties.curvature,
      rock_type: properties.rock_type,
      joint_orientations: properties.joint_orientations || [],
      stability_rating: properties.stability_rating,
      area: properties.area,
      perimeter: properties.perimeter,
      height: properties.height,
      bench_number: properties.bench_number,
      geological_unit: properties.geological_unit,
      weathering_grade: properties.weathering_grade,
      discontinuity_spacing: properties.discontinuity_spacing,
      rqd: properties.rqd,
      ucs: properties.ucs,
      centroid: properties.centroid ? SpatialLocation.fromGeoJSON(properties.centroid) : undefined,
      created_at: properties.created_at ? new Date(properties.created_at) : undefined,
      updated_at: properties.updated_at ? new Date(properties.updated_at) : undefined
    });
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): SlopeSegmentData {
    return {
      id: this.id,
      geometry: this.geometry,
      slope_angle: this.slope_angle,
      aspect: this.aspect,
      curvature: this.curvature,
      rock_type: this.rock_type,
      joint_orientations: this.joint_orientations,
      stability_rating: this.stability_rating,
      centroid: this.centroid?.toJSON(),
      area: this.area,
      perimeter: this.perimeter,
      height: this.height,
      bench_number: this.bench_number,
      geological_unit: this.geological_unit,
      weathering_grade: this.weathering_grade,
      discontinuity_spacing: this.discontinuity_spacing,
      rqd: this.rqd,
      ucs: this.ucs,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}