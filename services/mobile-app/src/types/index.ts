export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface SpatialLocation {
  latitude: number;
  longitude: number;
  elevation: number;
  utm_x: number;
  utm_y: number;
  mine_grid_x: number;
  mine_grid_y: number;
}

export interface SensorReading {
  sensor_id: string;
  timestamp: string;
  location: SpatialLocation;
  measurements: Record<string, number>;
  quality_flags: Record<string, boolean>;
  battery_level: number;
  signal_strength: number;
}

export interface RiskAssessment {
  assessment_id: string;
  timestamp: string;
  spatial_extent: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  risk_probability: number;
  confidence_interval: [number, number];
  time_to_failure?: number;
  contributing_factors: string[];
  alert_level: 1 | 2 | 3 | 4;
  recommended_actions: string[];
  explanation: string;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  location: SpatialLocation;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  risk_assessment: RiskAssessment;
}

export interface Sensor {
  id: string;
  name: string;
  type: string;
  location: SpatialLocation;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  battery_level: number;
  signal_strength: number;
  last_reading: string;
  installation_date: string;
  maintenance_due?: string;
}

export interface CachedData {
  alerts: Alert[];
  sensors: Sensor[];
  riskAssessments: RiskAssessment[];
  lastSync: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    alertId?: string;
    type?: string;
    [key: string]: any;
  };
}

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  sensor_id: string;
  sensor_name: string;
  sensor_location: SpatialLocation;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date: string;
  estimated_duration: number; // in minutes
  assigned_to?: string;
  instructions?: string;
  required_tools?: string[];
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  started_location?: SpatialLocation;
  completed_location?: SpatialLocation;
}

export interface IncidentReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: SpatialLocation;
  timestamp: string;
  reported_by: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  photos?: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface PhotoCapture {
  id: string;
  uri: string;
  timestamp: string;
  location?: SpatialLocation;
  annotations?: string;
}