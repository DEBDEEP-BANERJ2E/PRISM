"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlopeSegment = exports.SlopeSegmentSchema = exports.StabilityRatingSchema = exports.RockTypeSchema = exports.JointOrientationSchema = exports.PolygonSchema = void 0;
const zod_1 = require("zod");
const SpatialLocation_1 = require("./SpatialLocation");
// Polygon geometry type
exports.PolygonSchema = zod_1.z.object({
    type: zod_1.z.literal('Polygon'),
    coordinates: zod_1.z.array(zod_1.z.array(zod_1.z.array(zod_1.z.number()).min(2).max(3)))
});
// Joint orientation schema
exports.JointOrientationSchema = zod_1.z.object({
    dip: zod_1.z.number().min(0).max(90), // Dip angle in degrees
    dip_direction: zod_1.z.number().min(0).max(360), // Dip direction in degrees
    strike: zod_1.z.number().min(0).max(360), // Strike in degrees
    persistence: zod_1.z.number().min(0).max(1).optional(), // Joint persistence (0-1)
    roughness: zod_1.z.enum(['very_rough', 'rough', 'slightly_rough', 'smooth', 'slickensided']).optional(),
    aperture: zod_1.z.number().min(0).optional(), // Joint aperture in mm
    filling: zod_1.z.string().optional() // Joint filling material
});
// Rock type enumeration
exports.RockTypeSchema = zod_1.z.enum([
    'granite', 'basalt', 'limestone', 'sandstone', 'shale', 'quartzite',
    'gneiss', 'schist', 'slate', 'marble', 'dolomite', 'conglomerate',
    'breccia', 'tuff', 'andesite', 'rhyolite', 'other'
]);
// Stability rating enumeration
exports.StabilityRatingSchema = zod_1.z.enum([
    'very_poor', 'poor', 'fair', 'good', 'very_good'
]);
// SlopeSegment validation schema
exports.SlopeSegmentSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    geometry: exports.PolygonSchema,
    slope_angle: zod_1.z.number().min(0).max(90),
    aspect: zod_1.z.number().min(0).max(360),
    curvature: zod_1.z.number(),
    rock_type: exports.RockTypeSchema,
    joint_orientations: zod_1.z.array(exports.JointOrientationSchema),
    stability_rating: exports.StabilityRatingSchema,
    centroid: SpatialLocation_1.SpatialLocationSchema.optional(),
    area: zod_1.z.number().positive().optional(),
    perimeter: zod_1.z.number().positive().optional(),
    height: zod_1.z.number().positive().optional(),
    bench_number: zod_1.z.number().int().positive().optional(),
    geological_unit: zod_1.z.string().optional(),
    weathering_grade: zod_1.z.enum(['fresh', 'slightly_weathered', 'moderately_weathered', 'highly_weathered', 'completely_weathered']).optional(),
    discontinuity_spacing: zod_1.z.number().positive().optional(), // Average spacing in meters
    rqd: zod_1.z.number().min(0).max(100).optional(), // Rock Quality Designation percentage
    ucs: zod_1.z.number().positive().optional(), // Unconfined Compressive Strength in MPa
    created_at: zod_1.z.date().optional(),
    updated_at: zod_1.z.date().optional()
});
class SlopeSegment {
    constructor(data) {
        const validated = exports.SlopeSegmentSchema.parse(data);
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
            this.centroid = new SpatialLocation_1.SpatialLocation(validated.centroid);
        }
        else {
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
    calculateCentroid() {
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
        return new SpatialLocation_1.SpatialLocation({
            longitude: x / count,
            latitude: y / count,
            elevation: z / count
        });
    }
    /**
     * Calculate the area of the polygon in square meters
     */
    calculateArea() {
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
    calculatePerimeter() {
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
    calculateStabilityFactor() {
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
            stabilityFactor *= weatheringFactors[this.weathering_grade];
        }
        return Math.max(0, Math.min(1, stabilityFactor));
    }
    /**
     * Check if a point is within this slope segment
     */
    containsPoint(location) {
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
    getDominantJointOrientation() {
        if (this.joint_orientations.length === 0)
            return null;
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
    static validate(data) {
        return exports.SlopeSegmentSchema.parse(data);
    }
    /**
     * Convert to GeoJSON Feature
     */
    toGeoJSON() {
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
    static fromGeoJSON(geojson) {
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
            centroid: properties.centroid ? SpatialLocation_1.SpatialLocation.fromGeoJSON(properties.centroid) : undefined,
            created_at: properties.created_at ? new Date(properties.created_at) : undefined,
            updated_at: properties.updated_at ? new Date(properties.updated_at) : undefined
        });
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
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
exports.SlopeSegment = SlopeSegment;
//# sourceMappingURL=SlopeSegment.js.map