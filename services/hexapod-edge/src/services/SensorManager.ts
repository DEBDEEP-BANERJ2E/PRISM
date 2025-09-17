import { SensorReading } from '../types';

export class SensorManager {
  private sensorId: string;
  private location: { latitude: number; longitude: number; elevation: number };
  private calibrationData: Map<string, number> = new Map();
  private lastReading: SensorReading | null = null;

  constructor(sensorId: string, location: { latitude: number; longitude: number; elevation: number }) {
    this.sensorId = sensorId;
    this.location = location;
    this.initializeCalibration();
  }

  private initializeCalibration(): void {
    // Initialize sensor calibration parameters
    this.calibrationData.set('tilt_x_offset', 0.0);
    this.calibrationData.set('tilt_y_offset', 0.0);
    this.calibrationData.set('tilt_z_offset', 0.0);
    this.calibrationData.set('accel_scale_x', 1.0);
    this.calibrationData.set('accel_scale_y', 1.0);
    this.calibrationData.set('accel_scale_z', 1.0);
    this.calibrationData.set('pressure_offset', 0.0);
    this.calibrationData.set('temperature_offset', 0.0);
    this.calibrationData.set('strain_scale', 1.0);
  }

  async readAllSensors(): Promise<SensorReading> {
    const timestamp = Date.now();
    
    // Simulate sensor readings (in real implementation, this would interface with actual sensors)
    const rawMeasurements = {
      tilt_x: this.simulateTiltReading('x'),
      tilt_y: this.simulateTiltReading('y'),
      tilt_z: this.simulateTiltReading('z'),
      accel_x: this.simulateAccelReading('x'),
      accel_y: this.simulateAccelReading('y'),
      accel_z: this.simulateAccelReading('z'),
      gyro_x: this.simulateGyroReading('x'),
      gyro_y: this.simulateGyroReading('y'),
      gyro_z: this.simulateGyroReading('z'),
      pore_pressure: this.simulatePressureReading(),
      temperature: this.simulateTemperatureReading(),
      humidity: this.simulateHumidityReading(),
      strain_gauge: this.simulateStrainReading(),
      battery_voltage: this.simulateBatteryVoltage()
    };

    // Apply calibration
    const calibratedMeasurements = this.applyCalibratedMeasurements(rawMeasurements);

    // Validate sensor readings
    const qualityFlags = this.validateSensorReadings(calibratedMeasurements);

    const reading: SensorReading = {
      sensorId: this.sensorId,
      timestamp,
      location: this.location,
      measurements: calibratedMeasurements,
      qualityFlags,
      batteryLevel: this.calculateBatteryLevel(calibratedMeasurements.battery_voltage),
      signalStrength: this.getSignalStrength()
    };

    this.lastReading = reading;
    return reading;
  }

  private simulateTiltReading(axis: 'x' | 'y' | 'z'): number {
    // Simulate realistic tilt readings with some noise
    const baseValue = axis === 'z' ? 0 : Math.random() * 0.1 - 0.05; // Small random tilt
    const noise = (Math.random() - 0.5) * 0.001; // Small noise
    return baseValue + noise;
  }

  private simulateAccelReading(axis: 'x' | 'y' | 'z'): number {
    // Simulate accelerometer readings (m/s²)
    const gravity = axis === 'z' ? 9.81 : 0;
    const vibration = (Math.random() - 0.5) * 0.1;
    return gravity + vibration;
  }

  private simulateGyroReading(axis: 'x' | 'y' | 'z'): number {
    // Simulate gyroscope readings (rad/s)
    return (Math.random() - 0.5) * 0.01;
  }

  private simulatePressureReading(): number {
    // Simulate pore pressure (kPa)
    const basePressure = 100 + Math.random() * 50;
    const variation = Math.sin(Date.now() / 10000) * 5; // Slow variation
    return basePressure + variation;
  }

  private simulateTemperatureReading(): number {
    // Simulate temperature (°C)
    const baseTemp = 20 + Math.sin(Date.now() / 86400000) * 10; // Daily variation
    const noise = (Math.random() - 0.5) * 0.5;
    return baseTemp + noise;
  }

  private simulateHumidityReading(): number {
    // Simulate humidity (%)
    const baseHumidity = 60 + Math.sin(Date.now() / 43200000) * 20; // 12-hour variation
    const noise = (Math.random() - 0.5) * 2;
    return Math.max(0, Math.min(100, baseHumidity + noise));
  }

  private simulateStrainReading(): number {
    // Simulate strain gauge reading (microstrains)
    const baseStrain = Math.random() * 100;
    const noise = (Math.random() - 0.5) * 5;
    return baseStrain + noise;
  }

  private simulateBatteryVoltage(): number {
    // Simulate battery voltage (V)
    const baseVoltage = 3.7 - (Math.random() * 0.5); // LiFePO4 discharge curve
    return Math.max(3.0, baseVoltage);
  }

  private applyCalibratedMeasurements(raw: any): any {
    return {
      tilt_x: raw.tilt_x - (this.calibrationData.get('tilt_x_offset') || 0),
      tilt_y: raw.tilt_y - (this.calibrationData.get('tilt_y_offset') || 0),
      tilt_z: raw.tilt_z - (this.calibrationData.get('tilt_z_offset') || 0),
      accel_x: raw.accel_x * (this.calibrationData.get('accel_scale_x') || 1),
      accel_y: raw.accel_y * (this.calibrationData.get('accel_scale_y') || 1),
      accel_z: raw.accel_z * (this.calibrationData.get('accel_scale_z') || 1),
      gyro_x: raw.gyro_x,
      gyro_y: raw.gyro_y,
      gyro_z: raw.gyro_z,
      pore_pressure: raw.pore_pressure - (this.calibrationData.get('pressure_offset') || 0),
      temperature: raw.temperature - (this.calibrationData.get('temperature_offset') || 0),
      humidity: raw.humidity,
      strain_gauge: raw.strain_gauge * (this.calibrationData.get('strain_scale') || 1),
      battery_voltage: raw.battery_voltage
    };
  }

  private validateSensorReadings(measurements: any): any {
    return {
      tilt_valid: this.isValidRange(measurements.tilt_x, -1, 1) && 
                  this.isValidRange(measurements.tilt_y, -1, 1) && 
                  this.isValidRange(measurements.tilt_z, -1, 1),
      accel_valid: this.isValidRange(measurements.accel_x, -20, 20) && 
                   this.isValidRange(measurements.accel_y, -20, 20) && 
                   this.isValidRange(measurements.accel_z, 5, 15),
      gyro_valid: this.isValidRange(measurements.gyro_x, -10, 10) && 
                  this.isValidRange(measurements.gyro_y, -10, 10) && 
                  this.isValidRange(measurements.gyro_z, -10, 10),
      pressure_valid: this.isValidRange(measurements.pore_pressure, 0, 1000),
      environmental_valid: this.isValidRange(measurements.temperature, -40, 70) && 
                          this.isValidRange(measurements.humidity, 0, 100),
      strain_valid: this.isValidRange(measurements.strain_gauge, -1000, 1000)
    };
  }

  private isValidRange(value: number, min: number, max: number): boolean {
    return !isNaN(value) && value >= min && value <= max;
  }

  private calculateBatteryLevel(voltage: number): number {
    // Convert voltage to percentage for LiFePO4 battery
    const minVoltage = 3.0;
    const maxVoltage = 3.7;
    const percentage = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  private getSignalStrength(): number {
    // Simulate LoRaWAN signal strength (RSSI in dBm)
    return -60 - Math.random() * 40; // -60 to -100 dBm
  }

  getLastReading(): SensorReading | null {
    return this.lastReading;
  }

  updateCalibration(parameter: string, value: number): void {
    this.calibrationData.set(parameter, value);
  }

  performSelfTest(): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Simulate self-test procedures
    if (Math.random() < 0.05) errors.push('IMU communication error');
    if (Math.random() < 0.03) errors.push('Piezometer calibration drift');
    if (Math.random() < 0.02) errors.push('Strain gauge connection issue');
    
    return {
      passed: errors.length === 0,
      errors
    };
  }
}