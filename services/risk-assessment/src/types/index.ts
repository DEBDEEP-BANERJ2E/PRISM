export interface SensorData {
  sensor_id: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  measurements: Record<string, number>;
  quality_flags: Record<string, boolean>;
}

export interface RiskPredictionInput {
  sensor_data: SensorData[];
  environmental_data?: EnvironmentalData;
  spatial_context: SpatialContext;
  timestamp: Date;
}

export interface EnvironmentalData {
  rainfall_mm: number;
  temperature_c: number;
  humidity_percent: number;
  wind_speed_ms: number;
  freeze_thaw_cycles: number;
}

export interface SpatialContext {
  slope_segments: SlopeSegment[];
  geological_features: GeologicalFeature[];
  infrastructure: Infrastructure[];
}

export interface SlopeSegment {
  id: string;
  geometry: GeoJSON.Polygon;
  slope_angle: number;
  aspect: number;
  curvature: number;
  rock_type: string;
  joint_orientation: number[];
  stability_rating: number;
}

export interface GeologicalFeature {
  id: string;
  type: 'joint' | 'fault' | 'bedding' | 'weathering';
  geometry: GeoJSON.LineString | GeoJSON.Polygon;
  properties: Record<string, any>;
}

export interface Infrastructure {
  id: string;
  type: 'road' | 'equipment' | 'building' | 'power_line';
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  value: number;
  personnel_count?: number;
}

export interface RiskHeatmapCell {
  x: number;
  y: number;
  risk_probability: number;
  confidence: number;
  contributing_factors: string[];
  time_to_failure_hours?: number;
}

export interface VulnerableZone {
  id: string;
  geometry: GeoJSON.Polygon;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_probability: number;
  confidence_interval: [number, number];
  time_to_failure_hours?: number;
  affected_infrastructure: Infrastructure[];
  recommended_actions: string[];
}

export interface ModelExplanation {
  feature_importance: Record<string, number>;
  shap_values: Record<string, number>;
  lime_explanation: string;
  natural_language_explanation: string;
  confidence_factors: string[];
  uncertainty_sources: string[];
}

export interface StreamingPredictionResult {
  prediction_id: string;
  timestamp: Date;
  risk_heatmap: RiskHeatmapCell[][];
  vulnerable_zones: VulnerableZone[];
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
  model_explanation: ModelExplanation;
  processing_time_ms: number;
}