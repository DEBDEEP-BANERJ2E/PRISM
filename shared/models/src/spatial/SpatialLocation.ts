import proj4 from 'proj4';
import { z } from 'zod';

// Define coordinate system projections
const WGS84 = 'EPSG:4326';
const UTM_ZONE_33N = '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs'; // Example UTM zone
const MINE_GRID = '+proj=tmerc +lat_0=0 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'; // Custom mine grid

// Validation schema for SpatialLocation
export const SpatialLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevation: z.number(),
  utm_x: z.number().optional(),
  utm_y: z.number().optional(),
  mine_grid_x: z.number().optional(),
  mine_grid_y: z.number().optional(),
  coordinate_system: z.string().optional().default('WGS84'),
  accuracy: z.number().positive().optional(),
  timestamp: z.date().optional()
});

export type SpatialLocationData = z.infer<typeof SpatialLocationSchema>;

// Input type for constructor (coordinate_system is optional)
export type SpatialLocationInput = Omit<SpatialLocationData, 'coordinate_system'> & {
  coordinate_system?: string;
};

export class SpatialLocation {
  public readonly latitude: number;
  public readonly longitude: number;
  public readonly elevation: number;
  public readonly utm_x?: number;
  public readonly utm_y?: number;
  public readonly mine_grid_x?: number;
  public readonly mine_grid_y?: number;
  public readonly coordinate_system: string;
  public readonly accuracy?: number;
  public readonly timestamp?: Date;

  constructor(data: SpatialLocationInput) {
    const validated = SpatialLocationSchema.parse(data);
    
    this.latitude = validated.latitude;
    this.longitude = validated.longitude;
    this.elevation = validated.elevation;
    this.coordinate_system = validated.coordinate_system;
    this.accuracy = validated.accuracy;
    this.timestamp = validated.timestamp;

    // Auto-calculate UTM and mine grid coordinates if not provided
    if (!validated.utm_x || !validated.utm_y) {
      const utmCoords = this.toUTM();
      this.utm_x = validated.utm_x || utmCoords.x;
      this.utm_y = validated.utm_y || utmCoords.y;
    } else {
      this.utm_x = validated.utm_x;
      this.utm_y = validated.utm_y;
    }

    if (!validated.mine_grid_x || !validated.mine_grid_y) {
      const mineCoords = this.toMineGrid();
      this.mine_grid_x = validated.mine_grid_x || mineCoords.x;
      this.mine_grid_y = validated.mine_grid_y || mineCoords.y;
    } else {
      this.mine_grid_x = validated.mine_grid_x;
      this.mine_grid_y = validated.mine_grid_y;
    }
  }

  /**
   * Convert WGS84 coordinates to UTM
   */
  public toUTM(): { x: number; y: number; zone: string } {
    const utmCoords = proj4(WGS84, UTM_ZONE_33N, [this.longitude, this.latitude]);
    return {
      x: utmCoords[0],
      y: utmCoords[1],
      zone: '33N'
    };
  }

  /**
   * Convert WGS84 coordinates to mine grid system
   */
  public toMineGrid(): { x: number; y: number } {
    const mineCoords = proj4(WGS84, MINE_GRID, [this.longitude, this.latitude]);
    return {
      x: mineCoords[0],
      y: mineCoords[1]
    };
  }

  /**
   * Calculate distance to another spatial location in meters
   */
  public distanceTo(other: SpatialLocation): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = this.latitude * Math.PI / 180;
    const lat2Rad = other.latitude * Math.PI / 180;
    const deltaLatRad = (other.latitude - this.latitude) * Math.PI / 180;
    const deltaLonRad = (other.longitude - this.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate bearing to another spatial location in degrees
   */
  public bearingTo(other: SpatialLocation): number {
    const lat1Rad = this.latitude * Math.PI / 180;
    const lat2Rad = other.latitude * Math.PI / 180;
    const deltaLonRad = (other.longitude - this.longitude) * Math.PI / 180;

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    const bearingRad = Math.atan2(y, x);
    return ((bearingRad * 180 / Math.PI) + 360) % 360;
  }

  /**
   * Validate spatial data integrity
   */
  public static validate(data: unknown): SpatialLocationData {
    return SpatialLocationSchema.parse(data);
  }

  /**
   * Check if coordinates are within valid bounds
   */
  public isValid(): boolean {
    return this.latitude >= -90 && this.latitude <= 90 &&
           this.longitude >= -180 && this.longitude <= 180;
  }

  /**
   * Convert to GeoJSON Point
   */
  public toGeoJSON(): {
    type: 'Point';
    coordinates: [number, number, number];
    properties: Record<string, any>;
  } {
    return {
      type: 'Point',
      coordinates: [this.longitude, this.latitude, this.elevation],
      properties: {
        utm_x: this.utm_x,
        utm_y: this.utm_y,
        mine_grid_x: this.mine_grid_x,
        mine_grid_y: this.mine_grid_y,
        coordinate_system: this.coordinate_system,
        accuracy: this.accuracy,
        timestamp: this.timestamp?.toISOString()
      }
    };
  }

  /**
   * Create from GeoJSON Point
   */
  public static fromGeoJSON(geojson: any): SpatialLocation {
    if (geojson.type !== 'Point' || !Array.isArray(geojson.coordinates)) {
      throw new Error('Invalid GeoJSON Point format');
    }

    const [longitude, latitude, elevation = 0] = geojson.coordinates;
    const properties = geojson.properties || {};

    return new SpatialLocation({
      latitude,
      longitude,
      elevation,
      utm_x: properties.utm_x,
      utm_y: properties.utm_y,
      mine_grid_x: properties.mine_grid_x,
      mine_grid_y: properties.mine_grid_y,
      coordinate_system: properties.coordinate_system || 'WGS84',
      accuracy: properties.accuracy,
      timestamp: properties.timestamp ? new Date(properties.timestamp) : undefined
    });
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): SpatialLocationData {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      elevation: this.elevation,
      utm_x: this.utm_x,
      utm_y: this.utm_y,
      mine_grid_x: this.mine_grid_x,
      mine_grid_y: this.mine_grid_y,
      coordinate_system: this.coordinate_system,
      accuracy: this.accuracy,
      timestamp: this.timestamp
    };
  }
}