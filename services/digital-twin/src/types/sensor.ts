import { Point3D } from './geometry';

export interface SensorReading {
  sensorId: string;
  timestamp: Date;
  measurements: {
    [key: string]: number;
  };
  quality: number; // 0-1 quality score
  batteryLevel?: number;
  signalStrength?: number;
}

export interface SensorConfiguration {
  id: string;
  type: 'tilt' | 'accelerometer' | 'piezometer' | 'temperature' | 'humidity' | 'strain' | 'vibration';
  location: Point3D;
  measurementRange: {
    min: number;
    max: number;
    unit: string;
  };
  samplingRate: number; // Hz
  accuracy: number;
  calibrationDate: Date;
  maintenanceInterval: number; // days
}

export interface VirtualSensor {
  id: string;
  physicalSensorId?: string; // Link to physical sensor if exists
  configuration: SensorConfiguration;
  currentState: SensorState;
  lastReading?: SensorReading;
  healthStatus: SensorHealthStatus;
  neighbors: string[]; // IDs of nearby sensors
  interpolationWeights: Map<string, number>; // Weights for spatial interpolation
}

export interface SensorState {
  isOnline: boolean;
  isCalibrated: boolean;
  operationalMode: 'normal' | 'power_save' | 'maintenance' | 'error';
  lastCommunication: Date;
  dataBuffer: SensorReading[];
  alerts: SensorAlert[];
}

export interface SensorHealthStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'offline';
  batteryLevel: number; // 0-100
  signalQuality: number; // 0-100
  calibrationStatus: 'valid' | 'expired' | 'required';
  lastMaintenance: Date;
  nextMaintenance: Date;
  faultCodes: string[];
}

export interface SensorAlert {
  id: string;
  sensorId: string;
  type: 'battery_low' | 'signal_weak' | 'calibration_expired' | 'measurement_anomaly' | 'communication_lost';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface SensorNetwork {
  id: string;
  sensors: Map<string, VirtualSensor>;
  topology: NetworkTopology;
  coverage: CoverageMap;
  lastUpdated: Date;
  statistics: NetworkStatistics;
}

export interface NetworkTopology {
  connections: Map<string, string[]>; // sensor ID -> connected sensor IDs
  communicationPaths: Map<string, string[]>; // sensor ID -> path to gateway
  redundancyLevel: number; // Average number of alternative paths
  networkDiameter: number; // Maximum hops between any two sensors
}

export interface CoverageMap {
  totalArea: number; // m²
  coveredArea: number; // m²
  coveragePercentage: number;
  redundantCoverage: number; // Areas covered by multiple sensors
  gaps: CoverageGap[];
}

export interface CoverageGap {
  id: string;
  area: number; // m²
  center: Point3D;
  severity: 'low' | 'medium' | 'high';
  recommendedSensorCount: number;
  suggestedLocations: Point3D[];
}

export interface NetworkStatistics {
  totalSensors: number;
  activeSensors: number;
  averageSignalStrength: number;
  averageBatteryLevel: number;
  dataRate: number; // readings per second
  networkUptime: number; // percentage
  alertCount: {
    info: number;
    warning: number;
    critical: number;
  };
}

export interface InterpolationResult {
  estimatedValue: number;
  confidence: number; // 0-1
  contributingSensors: {
    sensorId: string;
    weight: number;
    distance: number;
    value: number;
  }[];
  interpolationMethod: 'idw' | 'kriging' | 'rbf' | 'nearest';
}

export interface SpatialInterpolationQuery {
  location: Point3D;
  measurementType: string;
  timestamp?: Date;
  maxDistance?: number;
  minSensors?: number;
  method?: 'idw' | 'kriging' | 'rbf' | 'nearest';
}