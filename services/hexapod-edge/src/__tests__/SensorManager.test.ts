import { SensorManager } from '../services/SensorManager';

describe('SensorManager', () => {
  let sensorManager: SensorManager;
  const testLocation = {
    latitude: -23.5505,
    longitude: -46.6333,
    elevation: 760.0
  };

  beforeEach(() => {
    sensorManager = new SensorManager('test-sensor-001', testLocation);
  });

  describe('readAllSensors', () => {
    it('should read all sensor values successfully', async () => {
      const reading = await sensorManager.readAllSensors();

      expect(reading.sensorId).toBe('test-sensor-001');
      expect(reading.location).toEqual(testLocation);
      expect(reading.timestamp).toBeGreaterThan(0);
      
      // Check that all measurements are present
      expect(reading.measurements).toHaveProperty('tilt_x');
      expect(reading.measurements).toHaveProperty('tilt_y');
      expect(reading.measurements).toHaveProperty('tilt_z');
      expect(reading.measurements).toHaveProperty('accel_x');
      expect(reading.measurements).toHaveProperty('accel_y');
      expect(reading.measurements).toHaveProperty('accel_z');
      expect(reading.measurements).toHaveProperty('gyro_x');
      expect(reading.measurements).toHaveProperty('gyro_y');
      expect(reading.measurements).toHaveProperty('gyro_z');
      expect(reading.measurements).toHaveProperty('pore_pressure');
      expect(reading.measurements).toHaveProperty('temperature');
      expect(reading.measurements).toHaveProperty('humidity');
      expect(reading.measurements).toHaveProperty('strain_gauge');
      expect(reading.measurements).toHaveProperty('battery_voltage');
    });

    it('should validate sensor readings correctly', async () => {
      const reading = await sensorManager.readAllSensors();

      // Check quality flags
      expect(reading.qualityFlags).toHaveProperty('tilt_valid');
      expect(reading.qualityFlags).toHaveProperty('accel_valid');
      expect(reading.qualityFlags).toHaveProperty('gyro_valid');
      expect(reading.qualityFlags).toHaveProperty('pressure_valid');
      expect(reading.qualityFlags).toHaveProperty('environmental_valid');
      expect(reading.qualityFlags).toHaveProperty('strain_valid');
    });

    it('should calculate battery level correctly', async () => {
      const reading = await sensorManager.readAllSensors();

      expect(reading.batteryLevel).toBeGreaterThanOrEqual(0);
      expect(reading.batteryLevel).toBeLessThanOrEqual(100);
    });

    it('should provide signal strength reading', async () => {
      const reading = await sensorManager.readAllSensors();

      expect(reading.signalStrength).toBeLessThan(0); // RSSI should be negative
      expect(reading.signalStrength).toBeGreaterThan(-120); // Reasonable RSSI range
    });
  });

  describe('calibration', () => {
    it('should update calibration parameters', () => {
      sensorManager.updateCalibration('tilt_x_offset', 0.05);
      
      // Calibration should be applied in next reading
      // This would be verified by checking if the offset is applied
    });

    it('should perform self-test', () => {
      const result = sensorManager.performSelfTest();

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('data validation', () => {
    it('should validate tilt readings within range', async () => {
      const reading = await sensorManager.readAllSensors();

      expect(Math.abs(reading.measurements.tilt_x)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(reading.measurements.tilt_y)).toBeLessThanOrEqual(1.0);
      expect(Math.abs(reading.measurements.tilt_z)).toBeLessThanOrEqual(1.0);
    });

    it('should validate accelerometer readings', async () => {
      const reading = await sensorManager.readAllSensors();

      expect(Math.abs(reading.measurements.accel_x)).toBeLessThanOrEqual(20);
      expect(Math.abs(reading.measurements.accel_y)).toBeLessThanOrEqual(20);
      expect(reading.measurements.accel_z).toBeGreaterThan(5); // Gravity component
      expect(reading.measurements.accel_z).toBeLessThan(15);
    });

    it('should validate environmental readings', async () => {
      const reading = await sensorManager.readAllSensors();

      expect(reading.measurements.temperature).toBeGreaterThan(-40);
      expect(reading.measurements.temperature).toBeLessThan(70);
      expect(reading.measurements.humidity).toBeGreaterThanOrEqual(0);
      expect(reading.measurements.humidity).toBeLessThanOrEqual(100);
    });

    it('should validate pressure readings', async () => {
      const reading = await sensorManager.readAllSensors();

      expect(reading.measurements.pore_pressure).toBeGreaterThanOrEqual(0);
      expect(reading.measurements.pore_pressure).toBeLessThanOrEqual(1000);
    });
  });

  describe('getLastReading', () => {
    it('should return null initially', () => {
      const lastReading = sensorManager.getLastReading();
      expect(lastReading).toBeNull();
    });

    it('should return last reading after sensor read', async () => {
      const reading = await sensorManager.readAllSensors();
      const lastReading = sensorManager.getLastReading();

      expect(lastReading).toEqual(reading);
    });
  });
});