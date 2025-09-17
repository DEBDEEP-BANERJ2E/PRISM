import { SensorReading } from '../../../../shared/models/dist/sensor';
import { SpatialLocation, SlopeSegment } from '../../../../shared/models/dist/spatial';
import { GeomorphologicalFeatureExtractor, GeomorphologicalFeatures, DEMData } from './GeomorphologicalFeatures';
import { TemporalFeatureExtractor, TemporalFeatures } from './TemporalFeatures';
import { EnvironmentalFeatureExtractor, EnvironmentalFeatures, WeatherReading } from './EnvironmentalFeatures';
import { SpatialFeatureExtractor, SpatialFeatures, JointData, DrainageFeature, MiningFeature } from './SpatialFeatures';

export interface CombinedFeatures {
  location_id: string;
  timestamp: Date;
  geomorphological: GeomorphologicalFeatures;
  temporal: Map<string, TemporalFeatures>; // Key: measurement type
  environmental: EnvironmentalFeatures;
  spatial: SpatialFeatures;
  metadata: {
    data_quality_score: number;
    feature_completeness: number;
    processing_time_ms: number;
  };
}

export interface FeatureExtractionConfig {
  temporal_window_hours: number;
  spatial_search_radius_m: number;
  dem_cell_size_m: number;
  min_data_quality_threshold: number;
  measurement_types: string[];
}

export interface FeatureExtractionContext {
  location: SpatialLocation;
  slopeSegment?: SlopeSegment;
  sensorReadings: SensorReading[];
  weatherData: WeatherReading[];
  demData: DEMData[];
  joints: JointData[];
  drainage: DrainageFeature[];
  miningFeatures: MiningFeature[];
  sensorLocations: SensorLocation[];
  currentTime: Date;
}

export interface SensorLocation extends SpatialLocation {
  sensor_id: string;
  sensor_type: string;
  installation_date: Date;
  last_maintenance: Date;
}

export class FeatureEngineeringPipeline {
  private geomorphologicalExtractor: GeomorphologicalFeatureExtractor;
  private temporalExtractor: TemporalFeatureExtractor;
  private environmentalExtractor: EnvironmentalFeatureExtractor;
  private spatialExtractor: SpatialFeatureExtractor;
  private config: FeatureExtractionConfig;

  constructor(config: FeatureExtractionConfig) {
    this.config = config;
    this.geomorphologicalExtractor = new GeomorphologicalFeatureExtractor(config.dem_cell_size_m);
    this.temporalExtractor = new TemporalFeatureExtractor();
    this.environmentalExtractor = new EnvironmentalFeatureExtractor();
    this.spatialExtractor = new SpatialFeatureExtractor(config.spatial_search_radius_m);
  }

  /**
   * Extract all features for a single location
   */
  public async extractFeatures(context: FeatureExtractionContext): Promise<CombinedFeatures> {
    const startTime = Date.now();
    
    try {
      // Validate input data quality
      const dataQualityScore = this.assessDataQuality(context);
      if (dataQualityScore < this.config.min_data_quality_threshold) {
        throw new Error(`Data quality score ${dataQualityScore} below threshold ${this.config.min_data_quality_threshold}`);
      }

      // Extract features in parallel for better performance
      const [geomorphological, temporal, environmental, spatial] = await Promise.all([
        this.extractGeomorphologicalFeatures(context),
        this.extractTemporalFeatures(context),
        this.extractEnvironmentalFeatures(context),
        this.extractSpatialFeatures(context)
      ]);

      const processingTime = Date.now() - startTime;
      const featureCompleteness = this.calculateFeatureCompleteness({
        geomorphological,
        temporal,
        environmental,
        spatial
      });

      return {
        location_id: this.generateLocationId(context.location),
        timestamp: context.currentTime,
        geomorphological,
        temporal,
        environmental,
        spatial,
        metadata: {
          data_quality_score: dataQualityScore,
          feature_completeness: featureCompleteness,
          processing_time_ms: processingTime
        }
      };

    } catch (error) {
      console.error('Feature extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract features for multiple locations in batch
   */
  public async extractBatchFeatures(
    contexts: FeatureExtractionContext[]
  ): Promise<CombinedFeatures[]> {
    const batchSize = 10; // Process in batches to avoid memory issues
    const results: CombinedFeatures[] = [];

    for (let i = 0; i < contexts.length; i += batchSize) {
      const batch = contexts.slice(i, i + batchSize);
      const batchPromises = batch.map(context => this.extractFeatures(context));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch processing failed for batch starting at index ${i}:`, error);
        // Continue with next batch
      }
    }

    return results;
  }

  /**
   * Extract geomorphological features
   */
  private async extractGeomorphologicalFeatures(context: FeatureExtractionContext): Promise<GeomorphologicalFeatures> {
    return this.geomorphologicalExtractor.extractFeatures(
      context.demData,
      context.location
    );
  }

  /**
   * Extract temporal features for all measurement types
   */
  private async extractTemporalFeatures(context: FeatureExtractionContext): Promise<Map<string, TemporalFeatures>> {
    const temporalFeatures = new Map<string, TemporalFeatures>();

    // Filter sensor readings within temporal window
    const windowStart = new Date(context.currentTime.getTime() - this.config.temporal_window_hours * 60 * 60 * 1000);
    const relevantReadings = context.sensorReadings.filter(reading => 
      reading.timestamp >= windowStart && reading.timestamp <= context.currentTime
    );

    // Extract features for each measurement type
    for (const measurementType of this.config.measurement_types) {
      try {
        const features = this.temporalExtractor.extractFromSensorReadings(
          relevantReadings,
          measurementType,
          context.currentTime
        );
        temporalFeatures.set(measurementType, features);
      } catch (error) {
        console.warn(`Failed to extract temporal features for ${measurementType}:`, error);
        // Set default features for this measurement type
        temporalFeatures.set(measurementType, this.getDefaultTemporalFeatures());
      }
    }

    return temporalFeatures;
  }

  /**
   * Extract environmental features
   */
  private async extractEnvironmentalFeatures(context: FeatureExtractionContext): Promise<EnvironmentalFeatures> {
    // Filter weather data within temporal window
    const windowStart = new Date(context.currentTime.getTime() - this.config.temporal_window_hours * 60 * 60 * 1000);
    const relevantWeatherData = context.weatherData.filter(reading => 
      reading.timestamp >= windowStart && reading.timestamp <= context.currentTime
    );

    return this.environmentalExtractor.extractFeatures(
      relevantWeatherData,
      context.currentTime,
      context.location.latitude
    );
  }

  /**
   * Extract spatial features
   */
  private async extractSpatialFeatures(context: FeatureExtractionContext): Promise<SpatialFeatures> {
    return this.spatialExtractor.extractFeatures(
      context.location,
      context.demData,
      context.joints,
      context.drainage,
      context.miningFeatures,
      context.sensorLocations,
      context.slopeSegment
    );
  }

  /**
   * Assess overall data quality
   */
  private assessDataQuality(context: FeatureExtractionContext): number {
    let qualityScore = 0;
    let totalChecks = 0;

    // Check sensor data quality
    if (context.sensorReadings.length > 0) {
      const validReadings = context.sensorReadings.filter(reading => 
        Object.values(reading.quality_flags).some(flag => flag)
      );
      qualityScore += (validReadings.length / context.sensorReadings.length) * 0.3;
    }
    totalChecks += 0.3;

    // Check weather data availability
    if (context.weatherData.length > 0) {
      const recentWeatherData = context.weatherData.filter(reading => 
        (context.currentTime.getTime() - reading.timestamp.getTime()) < 24 * 60 * 60 * 1000
      );
      qualityScore += (recentWeatherData.length > 0 ? 1 : 0) * 0.2;
    }
    totalChecks += 0.2;

    // Check DEM data availability
    if (context.demData.length > 0) {
      qualityScore += 0.2;
    }
    totalChecks += 0.2;

    // Check spatial data completeness
    const spatialDataScore = (
      (context.joints.length > 0 ? 0.1 : 0) +
      (context.drainage.length > 0 ? 0.1 : 0) +
      (context.miningFeatures.length > 0 ? 0.1 : 0)
    );
    qualityScore += spatialDataScore;
    totalChecks += 0.3;

    return totalChecks > 0 ? qualityScore / totalChecks : 0;
  }

  /**
   * Calculate feature completeness score
   */
  private calculateFeatureCompleteness(features: {
    geomorphological: GeomorphologicalFeatures;
    temporal: Map<string, TemporalFeatures>;
    environmental: EnvironmentalFeatures;
    spatial: SpatialFeatures;
  }): number {
    let completenessScore = 0;
    let totalFeatureGroups = 4;

    // Check geomorphological features
    const geoFeatureCount = Object.values(features.geomorphological).filter(value => 
      value !== null && value !== undefined && !isNaN(value as number) && isFinite(value as number)
    ).length;
    completenessScore += (geoFeatureCount > 0 ? 1 : 0) * 0.25;

    // Check temporal features
    const temporalCompleteness = features.temporal.size / this.config.measurement_types.length;
    completenessScore += temporalCompleteness * 0.25;

    // Check environmental features
    const envFeatureCount = Object.values(features.environmental).filter(value => 
      value !== null && value !== undefined && !isNaN(value as number) && isFinite(value as number)
    ).length;
    completenessScore += (envFeatureCount > 0 ? 1 : 0) * 0.25;

    // Check spatial features
    const spatialFeatureCount = Object.values(features.spatial).filter(value => 
      value !== null && value !== undefined && !isNaN(value as number) && isFinite(value as number)
    ).length;
    completenessScore += (spatialFeatureCount > 0 ? 1 : 0) * 0.25;

    return completenessScore;
  }

  /**
   * Generate unique location identifier
   */
  private generateLocationId(location: SpatialLocation): string {
    return `loc_${Math.round(location.utm_x)}_${Math.round(location.utm_y)}_${Math.round(location.elevation)}`;
  }

  /**
   * Get default temporal features when extraction fails
   */
  private getDefaultTemporalFeatures(): TemporalFeatures {
    return {
      mean_1h: 0, mean_6h: 0, mean_24h: 0,
      std_1h: 0, std_6h: 0, std_24h: 0,
      min_1h: 0, max_1h: 0, range_1h: 0,
      velocity_1h: 0, velocity_6h: 0, acceleration_1h: 0,
      trend_slope_6h: 0, trend_slope_24h: 0,
      trend_r2_6h: 0, trend_r2_24h: 0,
      coefficient_variation_1h: 0, coefficient_variation_6h: 0,
      z_score_current: 0, deviation_from_baseline: 0,
      time_since_last_peak: Infinity, time_since_last_anomaly: Infinity,
      peak_frequency_24h: 0
    };
  }

  /**
   * Convert features to flat array for ML models
   */
  public flattenFeatures(features: CombinedFeatures): number[] {
    const flatFeatures: number[] = [];

    // Geomorphological features
    flatFeatures.push(
      features.geomorphological.slope,
      features.geomorphological.aspect,
      features.geomorphological.curvature,
      features.geomorphological.planCurvature,
      features.geomorphological.profileCurvature,
      features.geomorphological.roughness,
      features.geomorphological.elevation,
      features.geomorphological.elevationVariance
    );

    // Temporal features (for each measurement type)
    for (const [measurementType, temporalFeatures] of features.temporal) {
      flatFeatures.push(
        temporalFeatures.mean_1h,
        temporalFeatures.mean_6h,
        temporalFeatures.mean_24h,
        temporalFeatures.std_1h,
        temporalFeatures.std_6h,
        temporalFeatures.std_24h,
        temporalFeatures.velocity_1h,
        temporalFeatures.velocity_6h,
        temporalFeatures.acceleration_1h,
        temporalFeatures.trend_slope_6h,
        temporalFeatures.trend_slope_24h,
        temporalFeatures.z_score_current,
        temporalFeatures.deviation_from_baseline,
        isFinite(temporalFeatures.time_since_last_peak) ? temporalFeatures.time_since_last_peak : 999,
        isFinite(temporalFeatures.time_since_last_anomaly) ? temporalFeatures.time_since_last_anomaly : 999,
        temporalFeatures.peak_frequency_24h
      );
    }

    // Environmental features
    flatFeatures.push(
      features.environmental.rainfall_1h,
      features.environmental.rainfall_6h,
      features.environmental.rainfall_24h,
      features.environmental.rainfall_7d,
      features.environmental.temperature_current,
      features.environmental.temperature_mean_24h,
      features.environmental.temperature_range_24h,
      features.environmental.freeze_thaw_cycles_7d,
      features.environmental.humidity_current,
      features.environmental.atmospheric_pressure,
      features.environmental.wind_speed_current,
      features.environmental.evapotranspiration_rate,
      features.environmental.soil_moisture_index,
      features.environmental.weathering_intensity_index,
      features.environmental.thermal_stress_index,
      features.environmental.day_of_year,
      features.environmental.season,
      features.environmental.is_growing_season ? 1 : 0,
      features.environmental.solar_radiation_index
    );

    // Spatial features
    flatFeatures.push(
      isFinite(features.spatial.distance_to_nearest_joint) ? features.spatial.distance_to_nearest_joint : 9999,
      isFinite(features.spatial.distance_to_major_joint) ? features.spatial.distance_to_major_joint : 9999,
      isFinite(features.spatial.distance_to_water_source) ? features.spatial.distance_to_water_source : 9999,
      isFinite(features.spatial.distance_to_drainage_channel) ? features.spatial.distance_to_drainage_channel : 9999,
      features.spatial.elevation_relative_to_bench,
      features.spatial.slope_position_index,
      features.spatial.topographic_wetness_index,
      features.spatial.joint_density_500m,
      features.spatial.joint_orientation_favorability,
      features.spatial.rock_mass_rating,
      features.spatial.drainage_area,
      features.spatial.sensor_density_100m,
      features.spatial.sensor_density_500m,
      isFinite(features.spatial.nearest_sensor_distance) ? features.spatial.nearest_sensor_distance : 9999,
      features.spatial.blast_proximity_score,
      features.spatial.excavation_influence_zone,
      features.spatial.operational_stress_factor
    );

    // Replace any remaining NaN or infinite values
    return flatFeatures.map(value => {
      if (isNaN(value) || !isFinite(value)) {
        return 0;
      }
      return value;
    });
  }

  /**
   * Get feature names for ML model interpretation
   */
  public getFeatureNames(): string[] {
    const names: string[] = [];

    // Geomorphological feature names
    names.push(
      'geo_slope', 'geo_aspect', 'geo_curvature', 'geo_plan_curvature',
      'geo_profile_curvature', 'geo_roughness', 'geo_elevation', 'geo_elevation_variance'
    );

    // Temporal feature names (for each measurement type)
    for (const measurementType of this.config.measurement_types) {
      names.push(
        `temp_${measurementType}_mean_1h`, `temp_${measurementType}_mean_6h`, `temp_${measurementType}_mean_24h`,
        `temp_${measurementType}_std_1h`, `temp_${measurementType}_std_6h`, `temp_${measurementType}_std_24h`,
        `temp_${measurementType}_velocity_1h`, `temp_${measurementType}_velocity_6h`, `temp_${measurementType}_acceleration_1h`,
        `temp_${measurementType}_trend_slope_6h`, `temp_${measurementType}_trend_slope_24h`,
        `temp_${measurementType}_z_score`, `temp_${measurementType}_deviation_baseline`,
        `temp_${measurementType}_time_since_peak`, `temp_${measurementType}_time_since_anomaly`,
        `temp_${measurementType}_peak_frequency`
      );
    }

    // Environmental feature names
    names.push(
      'env_rainfall_1h', 'env_rainfall_6h', 'env_rainfall_24h', 'env_rainfall_7d',
      'env_temperature_current', 'env_temperature_mean_24h', 'env_temperature_range_24h',
      'env_freeze_thaw_cycles_7d', 'env_humidity_current', 'env_atmospheric_pressure',
      'env_wind_speed_current', 'env_evapotranspiration_rate', 'env_soil_moisture_index',
      'env_weathering_intensity_index', 'env_thermal_stress_index', 'env_day_of_year',
      'env_season', 'env_is_growing_season', 'env_solar_radiation_index'
    );

    // Spatial feature names
    names.push(
      'spatial_distance_to_nearest_joint', 'spatial_distance_to_major_joint',
      'spatial_distance_to_water_source', 'spatial_distance_to_drainage_channel',
      'spatial_elevation_relative_to_bench', 'spatial_slope_position_index',
      'spatial_topographic_wetness_index', 'spatial_joint_density_500m',
      'spatial_joint_orientation_favorability', 'spatial_rock_mass_rating',
      'spatial_drainage_area', 'spatial_sensor_density_100m', 'spatial_sensor_density_500m',
      'spatial_nearest_sensor_distance', 'spatial_blast_proximity_score',
      'spatial_excavation_influence_zone', 'spatial_operational_stress_factor'
    );

    return names;
  }

  /**
   * Validate feature extraction configuration
   */
  public validateConfig(): boolean {
    if (this.config.temporal_window_hours <= 0) {
      throw new Error('Temporal window hours must be positive');
    }
    
    if (this.config.spatial_search_radius_m <= 0) {
      throw new Error('Spatial search radius must be positive');
    }
    
    if (this.config.dem_cell_size_m <= 0) {
      throw new Error('DEM cell size must be positive');
    }
    
    if (this.config.min_data_quality_threshold < 0 || this.config.min_data_quality_threshold > 1) {
      throw new Error('Data quality threshold must be between 0 and 1');
    }
    
    if (this.config.measurement_types.length === 0) {
      throw new Error('At least one measurement type must be specified');
    }

    return true;
  }
}