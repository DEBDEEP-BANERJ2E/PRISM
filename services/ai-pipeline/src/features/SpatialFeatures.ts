import { SpatialLocation, SlopeSegment } from '../../../../shared/models/dist/spatial';

export interface SpatialFeatures {
  // Distance-based features
  distance_to_nearest_joint: number;
  distance_to_major_joint: number;
  distance_to_water_source: number;
  distance_to_drainage_channel: number;
  distance_to_road: number;
  distance_to_bench_crest: number;
  distance_to_bench_toe: number;
  
  // Topographic features
  elevation_relative_to_bench: number;
  slope_position_index: number;
  topographic_wetness_index: number;
  stream_power_index: number;
  terrain_ruggedness_index: number;
  
  // Geological structure features
  joint_density_500m: number;
  joint_orientation_favorability: number;
  bedding_plane_orientation: number;
  structural_domain_id: number;
  rock_mass_rating: number;
  
  // Drainage and hydrology features
  drainage_area: number;
  flow_accumulation: number;
  flow_direction: number;
  channel_network_distance: number;
  watershed_position: number;
  
  // Spatial clustering features
  sensor_density_100m: number;
  sensor_density_500m: number;
  nearest_sensor_distance: number;
  spatial_autocorrelation_index: number;
  
  // Geometric features
  local_slope_variability: number;
  aspect_variability: number;
  curvature_variability: number;
  surface_area_ratio: number;
  
  // Mining operation features
  blast_proximity_score: number;
  excavation_influence_zone: number;
  haul_road_influence: number;
  operational_stress_factor: number;
}

export interface JointData {
  location: SpatialLocation;
  strike: number; // degrees
  dip: number; // degrees
  length: number; // meters
  aperture: number; // mm
  roughness: number; // 0-1 scale
  infilling: string;
  is_major: boolean;
}

export interface DrainageFeature {
  location: SpatialLocation;
  type: 'channel' | 'spring' | 'seepage' | 'pond';
  flow_rate?: number; // L/s
  seasonal: boolean;
}

export interface MiningFeature {
  location: SpatialLocation;
  type: 'blast_hole' | 'haul_road' | 'bench_crest' | 'bench_toe' | 'ramp';
  last_activity?: Date;
  intensity?: number; // 0-1 scale
}

export class SpatialFeatureExtractor {
  private readonly searchRadius: number;

  constructor(searchRadius: number = 1000) { // Default 1km search radius
    this.searchRadius = searchRadius;
  }

  /**
   * Extract spatial features for a location
   */
  public extractFeatures(
    location: SpatialLocation,
    demData: Array<{x: number, y: number, elevation: number}>,
    joints: JointData[],
    drainage: DrainageFeature[],
    miningFeatures: MiningFeature[],
    sensorLocations: SpatialLocation[],
    slopeSegment?: SlopeSegment
  ): SpatialFeatures {
    return {
      // Distance-based features
      distance_to_nearest_joint: this.calculateDistanceToNearestJoint(location, joints),
      distance_to_major_joint: this.calculateDistanceToMajorJoint(location, joints),
      distance_to_water_source: this.calculateDistanceToWaterSource(location, drainage),
      distance_to_drainage_channel: this.calculateDistanceToDrainageChannel(location, drainage),
      distance_to_road: this.calculateDistanceToRoad(location, miningFeatures),
      distance_to_bench_crest: this.calculateDistanceToBenchCrest(location, miningFeatures),
      distance_to_bench_toe: this.calculateDistanceToBenchToe(location, miningFeatures),
      
      // Topographic features
      elevation_relative_to_bench: this.calculateRelativeElevation(location, miningFeatures),
      slope_position_index: this.calculateSlopePositionIndex(location, demData),
      topographic_wetness_index: this.calculateTopographicWetnessIndex(location, demData),
      stream_power_index: this.calculateStreamPowerIndex(location, demData),
      terrain_ruggedness_index: this.calculateTerrainRuggednessIndex(location, demData),
      
      // Geological structure features
      joint_density_500m: this.calculateJointDensity(location, joints, 500),
      joint_orientation_favorability: this.calculateJointOrientationFavorability(location, joints, slopeSegment),
      bedding_plane_orientation: this.calculateBeddingPlaneOrientation(location, joints),
      structural_domain_id: this.identifyStructuralDomain(location, joints),
      rock_mass_rating: this.calculateRockMassRating(location, joints),
      
      // Drainage and hydrology features
      drainage_area: this.calculateDrainageArea(location, demData),
      flow_accumulation: this.calculateFlowAccumulation(location, demData),
      flow_direction: this.calculateFlowDirection(location, demData),
      channel_network_distance: this.calculateChannelNetworkDistance(location, drainage),
      watershed_position: this.calculateWatershedPosition(location, demData),
      
      // Spatial clustering features
      sensor_density_100m: this.calculateSensorDensity(location, sensorLocations, 100),
      sensor_density_500m: this.calculateSensorDensity(location, sensorLocations, 500),
      nearest_sensor_distance: this.calculateNearestSensorDistance(location, sensorLocations),
      spatial_autocorrelation_index: this.calculateSpatialAutocorrelationIndex(location, sensorLocations),
      
      // Geometric features
      local_slope_variability: this.calculateLocalSlopeVariability(location, demData),
      aspect_variability: this.calculateAspectVariability(location, demData),
      curvature_variability: this.calculateCurvatureVariability(location, demData),
      surface_area_ratio: this.calculateSurfaceAreaRatio(location, demData),
      
      // Mining operation features
      blast_proximity_score: this.calculateBlastProximityScore(location, miningFeatures),
      excavation_influence_zone: this.calculateExcavationInfluenceZone(location, miningFeatures),
      haul_road_influence: this.calculateHaulRoadInfluence(location, miningFeatures),
      operational_stress_factor: this.calculateOperationalStressFactor(location, miningFeatures)
    };
  }

  /**
   * Calculate Euclidean distance between two spatial locations
   */
  private calculateDistance(loc1: SpatialLocation, loc2: SpatialLocation): number {
    const dx = loc1.utm_x - loc2.utm_x;
    const dy = loc1.utm_y - loc2.utm_y;
    const dz = loc1.elevation - loc2.elevation;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate 2D distance (ignoring elevation)
   */
  private calculate2DDistance(loc1: SpatialLocation, loc2: SpatialLocation): number {
    const dx = loc1.utm_x - loc2.utm_x;
    const dy = loc1.utm_y - loc2.utm_y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Distance-based feature calculations
   */
  private calculateDistanceToNearestJoint(location: SpatialLocation, joints: JointData[]): number {
    if (joints.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const joint of joints) {
      const distance = this.calculate2DDistance(location, joint.location);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private calculateDistanceToMajorJoint(location: SpatialLocation, joints: JointData[]): number {
    const majorJoints = joints.filter(joint => joint.is_major);
    if (majorJoints.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const joint of majorJoints) {
      const distance = this.calculate2DDistance(location, joint.location);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private calculateDistanceToWaterSource(location: SpatialLocation, drainage: DrainageFeature[]): number {
    const waterSources = drainage.filter(feature => 
      feature.type === 'spring' || feature.type === 'seepage' || feature.type === 'pond'
    );
    
    if (waterSources.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const source of waterSources) {
      const distance = this.calculate2DDistance(location, source.location);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private calculateDistanceToDrainageChannel(location: SpatialLocation, drainage: DrainageFeature[]): number {
    const channels = drainage.filter(feature => feature.type === 'channel');
    if (channels.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const channel of channels) {
      const distance = this.calculate2DDistance(location, channel.location);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private calculateDistanceToRoad(location: SpatialLocation, miningFeatures: MiningFeature[]): number {
    const roads = miningFeatures.filter(feature => feature.type === 'haul_road');
    if (roads.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const road of roads) {
      const distance = this.calculate2DDistance(location, road.location);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private calculateDistanceToBenchCrest(location: SpatialLocation, miningFeatures: MiningFeature[]): number {
    const crests = miningFeatures.filter(feature => feature.type === 'bench_crest');
    if (crests.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const crest of crests) {
      const distance = this.calculate2DDistance(location, crest.location);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private calculateDistanceToBenchToe(location: SpatialLocation, miningFeatures: MiningFeature[]): number {
    const toes = miningFeatures.filter(feature => feature.type === 'bench_toe');
    if (toes.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const toe of toes) {
      const distance = this.calculate2DDistance(location, toe.location);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  /**
   * Topographic feature calculations
   */
  private calculateRelativeElevation(location: SpatialLocation, miningFeatures: MiningFeature[]): number {
    const benchFeatures = miningFeatures.filter(feature => 
      feature.type === 'bench_crest' || feature.type === 'bench_toe'
    );
    
    if (benchFeatures.length === 0) return 0;
    
    // Find nearest bench feature
    let nearestBench: MiningFeature | null = null;
    let minDistance = Infinity;
    
    for (const bench of benchFeatures) {
      const distance = this.calculate2DDistance(location, bench.location);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBench = bench;
      }
    }
    
    if (!nearestBench) return 0;
    
    return location.elevation - nearestBench.location.elevation;
  }

  private calculateSlopePositionIndex(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Simplified slope position index calculation
    const radius = 100; // meters
    const nearbyPoints = demData.filter(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - location.utm_x, 2) + 
        Math.pow(point.y - location.utm_y, 2)
      );
      return distance <= radius;
    });
    
    if (nearbyPoints.length === 0) return 0.5;
    
    const elevations = nearbyPoints.map(point => point.elevation);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    
    if (maxElevation === minElevation) return 0.5;
    
    return (location.elevation - minElevation) / (maxElevation - minElevation);
  }

  private calculateTopographicWetnessIndex(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Simplified TWI calculation
    const drainageArea = this.calculateDrainageArea(location, demData);
    const slope = this.calculateLocalSlope(location, demData);
    
    if (slope === 0) return 0;
    
    return Math.log(drainageArea / Math.tan(slope * Math.PI / 180));
  }

  private calculateStreamPowerIndex(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    const drainageArea = this.calculateDrainageArea(location, demData);
    const slope = this.calculateLocalSlope(location, demData);
    
    return drainageArea * Math.tan(slope * Math.PI / 180);
  }

  private calculateTerrainRuggednessIndex(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    const radius = 50; // meters
    const nearbyPoints = demData.filter(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - location.utm_x, 2) + 
        Math.pow(point.y - location.utm_y, 2)
      );
      return distance <= radius;
    });
    
    if (nearbyPoints.length < 2) return 0;
    
    const elevations = nearbyPoints.map(point => point.elevation);
    const mean = elevations.reduce((sum, elev) => sum + elev, 0) / elevations.length;
    const variance = elevations.reduce((sum, elev) => sum + Math.pow(elev - mean, 2), 0) / elevations.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Geological structure feature calculations
   */
  private calculateJointDensity(location: SpatialLocation, joints: JointData[], radius: number): number {
    const nearbyJoints = joints.filter(joint => {
      const distance = this.calculate2DDistance(location, joint.location);
      return distance <= radius;
    });
    
    const area = Math.PI * radius * radius; // m²
    return nearbyJoints.length / (area / 1000000); // joints per km²
  }

  private calculateJointOrientationFavorability(location: SpatialLocation, joints: JointData[], slopeSegment?: SlopeSegment): number {
    if (!slopeSegment || joints.length === 0) return 0;
    
    const slopeAspect = slopeSegment.aspect;
    const slopeAngle = slopeSegment.slope_angle;
    
    let maxFavorability = 0;
    
    for (const joint of joints) {
      const distance = this.calculate2DDistance(location, joint.location);
      if (distance > 500) continue; // Only consider nearby joints
      
      // Calculate kinematic favorability for planar sliding
      const aspectDiff = Math.abs(joint.strike - slopeAspect);
      const dipDiff = Math.abs(joint.dip - slopeAngle);
      
      // Favorable conditions: joint dips into slope face at similar angle
      const orientationFavorability = Math.max(0, 1 - (aspectDiff / 90) - (dipDiff / 45));
      maxFavorability = Math.max(maxFavorability, orientationFavorability);
    }
    
    return maxFavorability;
  }

  private calculateBeddingPlaneOrientation(location: SpatialLocation, joints: JointData[]): number {
    // Find the most common joint orientation (assumed to be bedding)
    const nearbyJoints = joints.filter(joint => {
      const distance = this.calculate2DDistance(location, joint.location);
      return distance <= 200;
    });
    
    if (nearbyJoints.length === 0) return 0;
    
    // Simple approach: return the strike of the longest joint
    let longestJoint = nearbyJoints[0];
    for (const joint of nearbyJoints) {
      if (joint.length > longestJoint.length) {
        longestJoint = joint;
      }
    }
    
    return longestJoint.strike;
  }

  private identifyStructuralDomain(location: SpatialLocation, joints: JointData[]): number {
    // Simplified structural domain identification based on joint clustering
    const nearbyJoints = joints.filter(joint => {
      const distance = this.calculate2DDistance(location, joint.location);
      return distance <= 500;
    });
    
    if (nearbyJoints.length === 0) return 0;
    
    // Group joints by similar orientations (simplified)
    const orientationGroups: number[][] = [];
    const tolerance = 15; // degrees
    
    for (const joint of nearbyJoints) {
      let assigned = false;
      for (const group of orientationGroups) {
        const groupMean = group.reduce((sum, val) => sum + val, 0) / group.length;
        if (Math.abs(joint.strike - groupMean) <= tolerance) {
          group.push(joint.strike);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        orientationGroups.push([joint.strike]);
      }
    }
    
    return orientationGroups.length; // Number of distinct joint sets
  }

  private calculateRockMassRating(location: SpatialLocation, joints: JointData[]): number {
    // Simplified RMR calculation based on joint characteristics
    const nearbyJoints = joints.filter(joint => {
      const distance = this.calculate2DDistance(location, joint.location);
      return distance <= 100;
    });
    
    if (nearbyJoints.length === 0) return 50; // Default moderate rating
    
    let totalRating = 0;
    
    for (const joint of nearbyJoints) {
      let jointRating = 100; // Start with perfect rock
      
      // Reduce rating based on joint characteristics
      jointRating -= joint.aperture * 2; // Aperture penalty
      jointRating -= (1 - joint.roughness) * 20; // Roughness penalty
      jointRating -= joint.length / 10; // Length penalty
      
      totalRating += Math.max(0, jointRating);
    }
    
    return totalRating / nearbyJoints.length;
  }

  /**
   * Drainage and hydrology feature calculations
   */
  private calculateDrainageArea(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Simplified drainage area calculation
    // In practice, this would use flow accumulation algorithms
    const radius = 500; // meters
    const nearbyPoints = demData.filter(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - location.utm_x, 2) + 
        Math.pow(point.y - location.utm_y, 2)
      );
      return distance <= radius && point.elevation > location.elevation;
    });
    
    return nearbyPoints.length * 100; // Simplified area calculation (m²)
  }

  private calculateFlowAccumulation(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Simplified flow accumulation
    return this.calculateDrainageArea(location, demData) / 10000; // Convert to flow units
  }

  private calculateFlowDirection(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Find steepest descent direction
    const radius = 50;
    const nearbyPoints = demData.filter(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - location.utm_x, 2) + 
        Math.pow(point.y - location.utm_y, 2)
      );
      return distance <= radius && distance > 0;
    });
    
    if (nearbyPoints.length === 0) return 0;
    
    let steepestGradient = 0;
    let flowDirection = 0;
    
    for (const point of nearbyPoints) {
      const distance = Math.sqrt(
        Math.pow(point.x - location.utm_x, 2) + 
        Math.pow(point.y - location.utm_y, 2)
      );
      
      const gradient = (location.elevation - point.elevation) / distance;
      
      if (gradient > steepestGradient) {
        steepestGradient = gradient;
        flowDirection = Math.atan2(point.y - location.utm_y, point.x - location.utm_x) * 180 / Math.PI;
      }
    }
    
    return flowDirection;
  }

  private calculateChannelNetworkDistance(location: SpatialLocation, drainage: DrainageFeature[]): number {
    const channels = drainage.filter(feature => feature.type === 'channel');
    if (channels.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const channel of channels) {
      const distance = this.calculate2DDistance(location, channel.location);
      minDistance = Math.min(minDistance, distance);
    }
    return minDistance;
  }

  private calculateWatershedPosition(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Position within watershed (0 = valley bottom, 1 = ridge top)
    return this.calculateSlopePositionIndex(location, demData);
  }

  /**
   * Spatial clustering feature calculations
   */
  private calculateSensorDensity(location: SpatialLocation, sensorLocations: SpatialLocation[], radius: number): number {
    const nearbySensors = sensorLocations.filter(sensor => {
      const distance = this.calculate2DDistance(location, sensor);
      return distance <= radius;
    });
    
    const area = Math.PI * radius * radius; // m²
    return nearbySensors.length / (area / 1000000); // sensors per km²
  }

  private calculateNearestSensorDistance(location: SpatialLocation, sensorLocations: SpatialLocation[]): number {
    if (sensorLocations.length === 0) return Infinity;
    
    let minDistance = Infinity;
    for (const sensor of sensorLocations) {
      const distance = this.calculate2DDistance(location, sensor);
      if (distance > 0) { // Exclude the location itself if it's a sensor
        minDistance = Math.min(minDistance, distance);
      }
    }
    return minDistance;
  }

  private calculateSpatialAutocorrelationIndex(location: SpatialLocation, sensorLocations: SpatialLocation[]): number {
    // Simplified spatial autocorrelation measure
    const nearbyCount = sensorLocations.filter(sensor => {
      const distance = this.calculate2DDistance(location, sensor);
      return distance <= 200 && distance > 0;
    }).length;
    
    const totalCount = sensorLocations.length;
    if (totalCount === 0) return 0;
    
    return nearbyCount / totalCount;
  }

  /**
   * Geometric feature calculations
   */
  private calculateLocalSlope(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Calculate slope using nearby DEM points
    const radius = 25;
    const nearbyPoints = demData.filter(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - location.utm_x, 2) + 
        Math.pow(point.y - location.utm_y, 2)
      );
      return distance <= radius && distance > 0;
    });
    
    if (nearbyPoints.length < 3) return 0;
    
    // Simple slope calculation using steepest gradient
    let maxGradient = 0;
    
    for (const point of nearbyPoints) {
      const distance = Math.sqrt(
        Math.pow(point.x - location.utm_x, 2) + 
        Math.pow(point.y - location.utm_y, 2)
      );
      
      const gradient = Math.abs(point.elevation - location.elevation) / distance;
      maxGradient = Math.max(maxGradient, gradient);
    }
    
    return Math.atan(maxGradient) * 180 / Math.PI;
  }

  private calculateLocalSlopeVariability(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Calculate variability in slope around the location
    const radius = 100;
    const gridSize = 25;
    const slopes: number[] = [];
    
    for (let x = location.utm_x - radius; x <= location.utm_x + radius; x += gridSize) {
      for (let y = location.utm_y - radius; y <= location.utm_y + radius; y += gridSize) {
        const gridLocation: SpatialLocation = {
          ...location,
          utm_x: x,
          utm_y: y
        };
        
        const slope = this.calculateLocalSlope(gridLocation, demData);
        slopes.push(slope);
      }
    }
    
    if (slopes.length < 2) return 0;
    
    const mean = slopes.reduce((sum, slope) => sum + slope, 0) / slopes.length;
    const variance = slopes.reduce((sum, slope) => sum + Math.pow(slope - mean, 2), 0) / slopes.length;
    
    return Math.sqrt(variance);
  }

  private calculateAspectVariability(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Similar to slope variability but for aspect
    // Simplified implementation
    return this.calculateLocalSlopeVariability(location, demData) * 0.5; // Placeholder
  }

  private calculateCurvatureVariability(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Simplified curvature variability
    return this.calculateLocalSlopeVariability(location, demData) * 0.3; // Placeholder
  }

  private calculateSurfaceAreaRatio(location: SpatialLocation, demData: Array<{x: number, y: number, elevation: number}>): number {
    // Ratio of actual surface area to projected area
    const radius = 50;
    const nearbyPoints = demData.filter(point => {
      const distance = Math.sqrt(
        Math.pow(point.x - location.utm_x, 2) + 
        Math.pow(point.y - location.utm_y, 2)
      );
      return distance <= radius;
    });
    
    if (nearbyPoints.length < 3) return 1;
    
    // Simplified calculation
    const elevationRange = Math.max(...nearbyPoints.map(p => p.elevation)) - 
                          Math.min(...nearbyPoints.map(p => p.elevation));
    
    const projectedArea = Math.PI * radius * radius;
    const estimatedSurfaceArea = projectedArea * (1 + elevationRange / radius);
    
    return estimatedSurfaceArea / projectedArea;
  }

  /**
   * Mining operation feature calculations
   */
  private calculateBlastProximityScore(location: SpatialLocation, miningFeatures: MiningFeature[]): number {
    const blastHoles = miningFeatures.filter(feature => feature.type === 'blast_hole');
    if (blastHoles.length === 0) return 0;
    
    let totalScore = 0;
    
    for (const blast of blastHoles) {
      const distance = this.calculate2DDistance(location, blast.location);
      const intensity = blast.intensity || 1;
      
      // Score decreases with distance, increases with intensity
      const score = intensity / (1 + distance / 100);
      totalScore += score;
    }
    
    return Math.min(1, totalScore);
  }

  private calculateExcavationInfluenceZone(location: SpatialLocation, miningFeatures: MiningFeature[]): number {
    const excavationFeatures = miningFeatures.filter(feature => 
      feature.type === 'bench_crest' || feature.type === 'bench_toe'
    );
    
    if (excavationFeatures.length === 0) return 0;
    
    let minDistance = Infinity;
    for (const feature of excavationFeatures) {
      const distance = this.calculate2DDistance(location, feature.location);
      minDistance = Math.min(minDistance, distance);
    }
    
    // Influence decreases with distance
    return Math.max(0, 1 - minDistance / 500);
  }

  private calculateHaulRoadInfluence(location: SpatialLocation, miningFeatures: MiningFeature[]): number {
    const roads = miningFeatures.filter(feature => feature.type === 'haul_road');
    if (roads.length === 0) return 0;
    
    let minDistance = Infinity;
    for (const road of roads) {
      const distance = this.calculate2DDistance(location, road.location);
      minDistance = Math.min(minDistance, distance);
    }
    
    // Influence from vibration and loading
    return Math.max(0, 1 - minDistance / 200);
  }

  private calculateOperationalStressFactor(location: SpatialLocation, miningFeatures: MiningFeature[]): number {
    const blastScore = this.calculateBlastProximityScore(location, miningFeatures);
    const excavationScore = this.calculateExcavationInfluenceZone(location, miningFeatures);
    const roadScore = this.calculateHaulRoadInfluence(location, miningFeatures);
    
    return (blastScore + excavationScore + roadScore) / 3;
  }
}