export interface SensorReading {
  sensorId: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  measurements: {
    tilt_x: number;
    tilt_y: number;
    tilt_z: number;
    accel_x: number;
    accel_y: number;
    accel_z: number;
    gyro_x: number;
    gyro_y: number;
    gyro_z: number;
    pore_pressure: number;
    temperature: number;
    humidity: number;
    strain_gauge: number;
    battery_voltage: number;
  };
  qualityFlags: {
    tilt_valid: boolean;
    accel_valid: boolean;
    gyro_valid: boolean;
    pressure_valid: boolean;
    environmental_valid: boolean;
    strain_valid: boolean;
  };
  batteryLevel: number;
  signalStrength: number;
}

export interface HexapodStatus {
  podId: string;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
  };
  operationalStatus: 'active' | 'sleep' | 'maintenance' | 'error';
  sensorHealth: {
    imu: 'healthy' | 'warning' | 'error';
    tiltmeter: 'healthy' | 'warning' | 'error';
    piezometer: 'healthy' | 'warning' | 'error';
    environmental: 'healthy' | 'warning' | 'error';
    strain_gauge: 'healthy' | 'warning' | 'error';
  };
  lastCommunication: number;
  powerStatus: {
    batteryLevel: number;
    solarCharging: boolean;
    powerConsumption: number;
    estimatedRuntime: number;
  };
  communicationStatus: {
    loraSignalStrength: number;
    lastSuccessfulTransmission: number;
    failedTransmissions: number;
    dataBufferSize: number;
  };
}

export interface EdgeAIResult {
  anomalyScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  features: number[];
  explanation: string;
  timestamp: number;
}

export interface PowerManagementConfig {
  sleepDuration: number;
  samplingInterval: number;
  transmissionInterval: number;
  lowPowerThreshold: number;
  criticalPowerThreshold: number;
}

export interface LoRaWANConfig {
  devEUI: string;
  appEUI: string;
  appKey: string;
  dataRate: number;
  txPower: number;
  adaptiveDataRate: boolean;
  confirmUplinks: boolean;
}

export interface CompressionConfig {
  algorithm: 'lz4' | 'zlib' | 'delta';
  compressionLevel: number;
  batchSize: number;
  maxBufferSize: number;
}