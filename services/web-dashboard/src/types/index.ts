// Core data types for PRISM dashboard
export interface SpatialLocation {
  latitude: number;
  longitude: number;
  elevation: number;
  utm_x: number;
  utm_y: number;
  mine_grid_x: number;
  mine_grid_y: number;
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

export interface SensorReading {
  sensor_id: string;
  timestamp: Date;
  location: SpatialLocation;
  measurements: Record<string, number>;
  quality_flags: Record<string, boolean>;
  battery_level: number;
  signal_strength: number;
}

export interface HexapodStatus {
  pod_id: string;
  location: SpatialLocation;
  operational_status: 'active' | 'inactive' | 'maintenance' | 'error';
  sensor_health: Record<string, 'healthy' | 'warning' | 'critical'>;
  last_communication: Date;
  power_status: {
    battery_level: number;
    solar_charging: boolean;
    estimated_runtime: number;
  };
}

export interface RiskAssessment {
  assessment_id: string;
  timestamp: Date;
  spatial_extent: GeoJSON.Polygon;
  risk_probability: number;
  confidence_interval: [number, number];
  time_to_failure?: number;
  contributing_factors: string[];
  alert_level: 1 | 2 | 3 | 4;
  recommended_actions: string[];
  explanation: string;
}

export interface RiskHeatmapData {
  coordinates: [number, number, number][];
  risk_values: number[];
  timestamp: Date;
  interpolation_method: 'kriging' | 'idw' | 'spline';
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  sensor_id: string;
  measurement_type: string;
}

export interface AlertEvent {
  id: string;
  timestamp: Date;
  level: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  location: SpatialLocation;
  status: 'active' | 'acknowledged' | 'resolved';
  actions_taken: string[];
}

// 3D Visualization types
export interface TerrainMesh {
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
  risk_colors: Float32Array;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export interface ViewportState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

// Dashboard state types
export interface DashboardState {
  selectedTimeRange: {
    start: Date;
    end: Date;
  };
  selectedSensors: string[];
  riskThreshold: number;
  viewMode: '2d' | '3d' | 'hybrid';
  animationSpeed: number;
  showAlerts: boolean;
  showSensorHealth: boolean;
}

export interface WebSocketMessage {
  type: 'sensor_data' | 'risk_update' | 'alert' | 'system_status';
  payload: any;
  timestamp: Date;
}