import { SlopeSegment } from '../../../../shared/models/dist/spatial';

export interface GeomorphologicalFeatures {
  slope: number;
  aspect: number;
  curvature: number;
  planCurvature: number;
  profileCurvature: number;
  roughness: number;
  elevation: number;
  elevationVariance: number;
}

export interface DEMData {
  x: number;
  y: number;
  elevation: number;
}

export class GeomorphologicalFeatureExtractor {
  private readonly cellSize: number;

  constructor(cellSize: number = 1.0) {
    this.cellSize = cellSize;
  }

  /**
   * Extract geomorphological features from DEM data
   */
  public extractFeatures(demData: DEMData[], location: any, windowSize: number = 3): GeomorphologicalFeatures {
    const localDEM = this.extractLocalDEM(demData, location, windowSize);
    
    return {
      slope: this.calculateSlope(localDEM),
      aspect: this.calculateAspect(localDEM),
      curvature: this.calculateCurvature(localDEM),
      planCurvature: this.calculatePlanCurvature(localDEM),
      profileCurvature: this.calculateProfileCurvature(localDEM),
      roughness: this.calculateRoughness(localDEM),
      elevation: location.elevation,
      elevationVariance: this.calculateElevationVariance(localDEM)
    };
  }

  /**
   * Extract local DEM window around a location
   */
  private extractLocalDEM(demData: DEMData[], location: any, windowSize: number): number[][] {
    const halfWindow = Math.floor(windowSize / 2);
    const localDEM: number[][] = [];

    for (let i = -halfWindow; i <= halfWindow; i++) {
      const row: number[] = [];
      for (let j = -halfWindow; j <= halfWindow; j++) {
        const x = (location.utm_x || 0) + j * this.cellSize;
        const y = (location.utm_y || 0) + i * this.cellSize;
        
        // Find closest DEM point
        const closestPoint = this.findClosestDEMPoint(demData, x, y);
        row.push(closestPoint ? closestPoint.elevation : location.elevation);
      }
      localDEM.push(row);
    }

    return localDEM;
  }

  /**
   * Find closest DEM point to given coordinates
   */
  private findClosestDEMPoint(demData: DEMData[], x: number, y: number): DEMData | null {
    let closest: DEMData | null = null;
    let minDistance = Infinity;

    for (const point of demData) {
      const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closest = point;
      }
    }

    return closest;
  }

  /**
   * Calculate slope using Horn's method
   */
  private calculateSlope(dem: number[][]): number {
    if (dem.length < 3 || dem[0].length < 3) {
      return 0;
    }

    const center = Math.floor(dem.length / 2);
    
    // Horn's method for slope calculation
    const dz_dx = ((dem[center-1][center+1] + 2*dem[center][center+1] + dem[center+1][center+1]) -
                   (dem[center-1][center-1] + 2*dem[center][center-1] + dem[center+1][center-1])) / (8 * this.cellSize);
    
    const dz_dy = ((dem[center+1][center-1] + 2*dem[center+1][center] + dem[center+1][center+1]) -
                   (dem[center-1][center-1] + 2*dem[center-1][center] + dem[center-1][center+1])) / (8 * this.cellSize);

    return Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy)) * (180 / Math.PI);
  }

  /**
   * Calculate aspect using Horn's method
   */
  private calculateAspect(dem: number[][]): number {
    if (dem.length < 3 || dem[0].length < 3) {
      return 0;
    }

    const center = Math.floor(dem.length / 2);
    
    const dz_dx = ((dem[center-1][center+1] + 2*dem[center][center+1] + dem[center+1][center+1]) -
                   (dem[center-1][center-1] + 2*dem[center][center-1] + dem[center+1][center-1])) / (8 * this.cellSize);
    
    const dz_dy = ((dem[center+1][center-1] + 2*dem[center+1][center] + dem[center+1][center+1]) -
                   (dem[center-1][center-1] + 2*dem[center-1][center] + dem[center-1][center+1])) / (8 * this.cellSize);

    let aspect = Math.atan2(dz_dy, -dz_dx) * (180 / Math.PI);
    
    // Convert to compass bearing (0-360 degrees)
    if (aspect < 0) {
      aspect += 360;
    }

    return aspect;
  }

  /**
   * Calculate mean curvature
   */
  private calculateCurvature(dem: number[][]): number {
    if (dem.length < 3 || dem[0].length < 3) {
      return 0;
    }

    const center = Math.floor(dem.length / 2);
    const z = dem[center][center];
    
    // Second derivatives
    const zxx = (dem[center][center-1] - 2*z + dem[center][center+1]) / (this.cellSize * this.cellSize);
    const zyy = (dem[center-1][center] - 2*z + dem[center+1][center]) / (this.cellSize * this.cellSize);
    const zxy = (dem[center-1][center-1] - dem[center-1][center+1] - dem[center+1][center-1] + dem[center+1][center+1]) / (4 * this.cellSize * this.cellSize);

    // First derivatives
    const zx = (dem[center][center+1] - dem[center][center-1]) / (2 * this.cellSize);
    const zy = (dem[center+1][center] - dem[center-1][center]) / (2 * this.cellSize);

    const p = zx * zx + zy * zy;
    const q = p + 1;

    // Mean curvature
    return -((1 + zy*zy) * zxx - 2*zx*zy*zxy + (1 + zx*zx) * zyy) / (2 * Math.pow(q, 1.5));
  }

  /**
   * Calculate plan curvature (curvature perpendicular to slope direction)
   */
  private calculatePlanCurvature(dem: number[][]): number {
    if (dem.length < 3 || dem[0].length < 3) {
      return 0;
    }

    const center = Math.floor(dem.length / 2);
    const z = dem[center][center];
    
    // Second derivatives
    const zxx = (dem[center][center-1] - 2*z + dem[center][center+1]) / (this.cellSize * this.cellSize);
    const zyy = (dem[center-1][center] - 2*z + dem[center+1][center]) / (this.cellSize * this.cellSize);
    const zxy = (dem[center-1][center-1] - dem[center-1][center+1] - dem[center+1][center-1] + dem[center+1][center+1]) / (4 * this.cellSize * this.cellSize);

    // First derivatives
    const zx = (dem[center][center+1] - dem[center][center-1]) / (2 * this.cellSize);
    const zy = (dem[center+1][center] - dem[center-1][center]) / (2 * this.cellSize);

    const p = zx * zx + zy * zy;
    const q = p + 1;

    if (p === 0) return 0;

    // Plan curvature
    return (zx*zx * zyy - 2*zx*zy*zxy + zy*zy * zxx) / (p * Math.pow(q, 0.5));
  }

  /**
   * Calculate profile curvature (curvature parallel to slope direction)
   */
  private calculateProfileCurvature(dem: number[][]): number {
    if (dem.length < 3 || dem[0].length < 3) {
      return 0;
    }

    const center = Math.floor(dem.length / 2);
    const z = dem[center][center];
    
    // Second derivatives
    const zxx = (dem[center][center-1] - 2*z + dem[center][center+1]) / (this.cellSize * this.cellSize);
    const zyy = (dem[center-1][center] - 2*z + dem[center+1][center]) / (this.cellSize * this.cellSize);
    const zxy = (dem[center-1][center-1] - dem[center-1][center+1] - dem[center+1][center-1] + dem[center+1][center+1]) / (4 * this.cellSize * this.cellSize);

    // First derivatives
    const zx = (dem[center][center+1] - dem[center][center-1]) / (2 * this.cellSize);
    const zy = (dem[center+1][center] - dem[center-1][center]) / (2 * this.cellSize);

    const p = zx * zx + zy * zy;
    const q = p + 1;

    if (p === 0) return 0;

    // Profile curvature
    return -(zx*zx * zxx + 2*zx*zy*zxy + zy*zy * zyy) / (p * Math.pow(q, 1.5));
  }

  /**
   * Calculate surface roughness
   */
  private calculateRoughness(dem: number[][]): number {
    if (dem.length < 3 || dem[0].length < 3) {
      return 0;
    }

    let sumSquaredDifferences = 0;
    let count = 0;
    const center = Math.floor(dem.length / 2);
    const centerElevation = dem[center][center];

    for (let i = 0; i < dem.length; i++) {
      for (let j = 0; j < dem[i].length; j++) {
        if (i !== center || j !== center) {
          sumSquaredDifferences += Math.pow(dem[i][j] - centerElevation, 2);
          count++;
        }
      }
    }

    return count > 0 ? Math.sqrt(sumSquaredDifferences / count) : 0;
  }

  /**
   * Calculate elevation variance in local window
   */
  private calculateElevationVariance(dem: number[][]): number {
    const elevations: number[] = [];
    
    for (let i = 0; i < dem.length; i++) {
      for (let j = 0; j < dem[i].length; j++) {
        elevations.push(dem[i][j]);
      }
    }

    const mean = elevations.reduce((sum, val) => sum + val, 0) / elevations.length;
    const variance = elevations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / elevations.length;
    
    return variance;
  }

  /**
   * Extract features for multiple slope segments
   */
  public extractBatchFeatures(demData: DEMData[], segments: SlopeSegment[]): Map<string, GeomorphologicalFeatures> {
    const features = new Map<string, GeomorphologicalFeatures>();

    for (const segment of segments) {
      // Use centroid of segment geometry as location
      const centroid = this.getCentroidFromSegment(segment);
      const location = {
        latitude: 0, // Will be calculated from UTM
        longitude: 0, // Will be calculated from UTM
        elevation: 0, // Will be extracted from DEM
        utm_x: centroid.x,
        utm_y: centroid.y,
        mine_grid_x: centroid.x,
        mine_grid_y: centroid.y
      } as any;

      features.set(segment.id, this.extractFeatures(demData, location));
    }

    return features;
  }

  /**
   * Calculate centroid of polygon geometry
   */
  private calculateCentroid(geometry: any): { x: number; y: number } {
    // Simplified centroid calculation - assumes geometry has coordinates
    if (geometry.coordinates && geometry.coordinates[0]) {
      const coords = geometry.coordinates[0];
      let x = 0, y = 0;
      
      for (const coord of coords) {
        x += coord[0];
        y += coord[1];
      }
      
      return {
        x: x / coords.length,
        y: y / coords.length
      };
    }
    
    return { x: 0, y: 0 };
  }

  /**
   * Get centroid from SlopeSegment
   */
  private getCentroidFromSegment(segment: SlopeSegment): { x: number; y: number } {
    if (segment.centroid) {
      return {
        x: segment.centroid.utm_x || segment.centroid.longitude,
        y: segment.centroid.utm_y || segment.centroid.latitude
      };
    }
    
    return this.calculateCentroid(segment.geometry);
  }
}