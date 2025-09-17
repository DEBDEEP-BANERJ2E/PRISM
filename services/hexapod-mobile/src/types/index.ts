export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Orientation {
  roll: number;
  pitch: number;
  yaw: number;
}

export interface Pose3D {
  position: Position3D;
  orientation: Orientation;
}

export interface Velocity3D {
  linear: Position3D;
  angular: Position3D;
}

export interface HexapodLeg {
  legId: number;
  joints: {
    coxa: number;    // Hip joint angle
    femur: number;   // Thigh joint angle
    tibia: number;   // Shin joint angle
  };
  position: Position3D;
  isGrounded: boolean;
}

export interface HexapodState {
  robotId: string;
  timestamp: number;
  pose: Pose3D;
  velocity: Velocity3D;
  legs: HexapodLeg[];
  batteryLevel: number;
  operationalMode: 'idle' | 'walking' | 'climbing' | 'inspection' | 'deployment' | 'emergency';
  sensors: {
    imu: {
      acceleration: Position3D;
      gyroscope: Position3D;
      magnetometer: Position3D;
    };
    lidar: {
      ranges: number[];
      angleMin: number;
      angleMax: number;
      angleIncrement: number;
    };
    cameras: {
      stereo: boolean;
      thermal: boolean;
      rgbActive: boolean;
    };
    gps: {
      latitude: number;
      longitude: number;
      altitude: number;
      accuracy: number;
    };
  };
}

export interface NavigationGoal {
  goalId: string;
  targetPose: Pose3D;
  goalType: 'move_to' | 'inspect_area' | 'deploy_sensor' | 'return_home';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  constraints: {
    maxSpeed: number;
    maxSlope: number;
    avoidanceRadius: number;
    timeoutSeconds: number;
  };
  waypoints?: Pose3D[];
}

export interface NavigationStatus {
  currentGoal: NavigationGoal | null;
  status: 'idle' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  progress: number; // 0-100%
  distanceToGoal: number;
  estimatedTimeRemaining: number;
  obstacles: ObstacleInfo[];
  pathPlan: Pose3D[];
}

export interface ObstacleInfo {
  id: string;
  position: Position3D;
  size: Position3D;
  type: 'static' | 'dynamic' | 'cliff' | 'loose_rock' | 'vegetation';
  confidence: number;
  timestamp: number;
}

export interface VisionData {
  timestamp: number;
  rgbImage?: {
    width: number;
    height: number;
    data: Buffer;
    encoding: string;
  };
  depthImage?: {
    width: number;
    height: number;
    data: Buffer;
    encoding: string;
  };
  thermalImage?: {
    width: number;
    height: number;
    data: Buffer;
    encoding: string;
  };
  detectedFeatures: GeologicalFeature[];
  surfaceAnalysis: SurfaceAnalysis;
}

export interface GeologicalFeature {
  id: string;
  type: 'joint' | 'fracture' | 'weathering' | 'loose_rock' | 'vegetation' | 'water_seepage';
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  worldPosition?: Position3D;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface SurfaceAnalysis {
  roughness: number;
  stability: number;
  moisture: number;
  temperature: number;
  slopeAngle: number;
  rockType: string;
  weatheringDegree: number;
}

export interface SensorDeployment {
  deploymentId: string;
  sensorType: 'tilt' | 'strain' | 'piezometer' | 'environmental';
  targetLocation: Position3D;
  deploymentMethod: 'drill' | 'adhesive' | 'magnetic' | 'clamp';
  status: 'planned' | 'approaching' | 'deploying' | 'deployed' | 'failed';
  sensorId?: string;
  deploymentTime?: number;
  calibrationData?: any;
}

export interface InspectionMission {
  missionId: string;
  missionType: 'routine_patrol' | 'targeted_inspection' | 'sensor_deployment' | 'emergency_response';
  areas: InspectionArea[];
  priority: 'low' | 'medium' | 'high' | 'emergency';
  startTime: number;
  estimatedDuration: number;
  status: 'planned' | 'active' | 'paused' | 'completed' | 'aborted';
  progress: number;
  findings: InspectionFinding[];
}

export interface InspectionArea {
  areaId: string;
  name: string;
  boundary: Position3D[];
  inspectionType: 'visual' | 'thermal' | 'detailed' | 'sensor_placement';
  requiredSensors: string[];
  safetyLevel: 'safe' | 'caution' | 'dangerous' | 'prohibited';
  lastInspected?: number;
}

export interface InspectionFinding {
  findingId: string;
  timestamp: number;
  location: Position3D;
  type: 'anomaly' | 'damage' | 'change' | 'hazard' | 'opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  images: string[];
  recommendedAction: string;
  requiresImmediate: boolean;
}

export interface LocomotionConfig {
  gaitType: 'tripod' | 'wave' | 'ripple' | 'custom';
  stepHeight: number;
  stepLength: number;
  bodyHeight: number;
  speed: number;
  stabilityMargin: number;
  adaptiveGait: boolean;
}

export interface ClimbingCapabilities {
  maxSlope: number;
  maxStepHeight: number;
  grippingForce: number;
  stabilityThreshold: number;
  fallDetection: boolean;
  emergencyStop: boolean;
}