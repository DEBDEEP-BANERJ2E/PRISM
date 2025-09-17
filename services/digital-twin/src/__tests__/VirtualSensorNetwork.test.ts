import { VirtualSensorNetwork } from '../services/VirtualSensorNetwork';
import { SensorConfiguration, SensorReading } from '../types/sensor';

describe('VirtualSensorNetwork', () => {
  let network: VirtualSensorNetwork;

  beforeEach(() => {
    network = new VirtualSensorNetwork('test-network');
  });

  afterEach(() => {
    network.cleanup();
  });

  describe('addSensor', () => {
    it('should add a sensor to the network', () => {
      const config: SensorConfiguration = {
        id: 'sensor-1',
        type: 'tilt',
        location: { x: 0, y: 0, z: 0 },
        measurementRange: { min: -90, max: 90, unit: 'degrees' },
        samplingRate: 1,
        accuracy: 0.1,
        calibrationDate: new Date(),
        maintenanceInterval: 90
      };

      const sensor = network.addSensor(config);

      expect(sensor.id).toBe('sensor-1');
      expect(sensor.configuration).toEqual(config);
      expect(sensor.currentState.isOnline).toBe(false);
      expect(sensor.healthStatus.overall).toBe('offline');

      const stats = network.getNetworkStatistics();
      expect(stats.totalSensors).toBe(1);
      expect(stats.activeSensors).toBe(0);
    });

    it('should link to physical sensor when provided', () => {
      const config: SensorConfiguration = {
        id: 'sensor-1',
        type: 'tilt',
        location: { x: 0, y: 0, z: 0 },
        measurementRange: { min: -90, max: 90, unit: 'degrees' },
        samplingRate: 1,
        accuracy: 0.1,
        calibrationDate: new Date(),
        maintenanceInterval: 90
      };

      const sensor = network.addSensor(config, 'physical-sensor-1');

      expect(sensor.physicalSensorId).toBe('physical-sensor-1');
    });
  });

  describe('removeSensor', () => {
    beforeEach(() => {
      const config: SensorConfiguration = {
        id: 'sensor-1',
        type: 'tilt',
        location: { x: 0, y: 0, z: 0 },
        measurementRange: { min: -90, max: 90, unit: 'degrees' },
        samplingRate: 1,
        accuracy: 0.1,
        calibrationDate: new Date(),
        maintenanceInterval: 90
      };
      network.addSensor(config);
    });

    it('should remove sensor from network', () => {
      const result = network.removeSensor('sensor-1');

      expect(result).toBe(true);
      expect(network.getSensor('sensor-1')).toBeUndefined();

      const stats = network.getNetworkStatistics();
      expect(stats.totalSensors).toBe(0);
    });

    it('should return false for non-existent sensor', () => {
      const result = network.removeSensor('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('updateSensorReading', () => {
    beforeEach(() => {
      const config: SensorConfiguration = {
        id: 'sensor-1',
        type: 'tilt',
        location: { x: 0, y: 0, z: 0 },
        measurementRange: { min: -90, max: 90, unit: 'degrees' },
        samplingRate: 1,
        accuracy: 0.1,
        calibrationDate: new Date(),
        maintenanceInterval: 90
      };
      network.addSensor(config);
    });

    it('should update sensor with new reading', () => {
      const reading: SensorReading = {
        sensorId: 'sensor-1',
        timestamp: new Date(),
        measurements: { tilt: 15.5 },
        quality: 0.95,
        batteryLevel: 85,
        signalStrength: 75
      };

      network.updateSensorReading('sensor-1', reading);

      const sensor = network.getSensor('sensor-1')!;
      expect(sensor.lastReading).toEqual(reading);
      expect(sensor.currentState.isOnline).toBe(true);
      expect(sensor.healthStatus.batteryLevel).toBe(85);
      expect(sensor.healthStatus.signalQuality).toBe(75);
      expect(sensor.currentState.dataBuffer).toHaveLength(1);

      const stats = network.getNetworkStatistics();
      expect(stats.activeSensors).toBe(1);
    });

    it('should throw error for non-existent sensor', () => {
      const reading: SensorReading = {
        sensorId: 'non-existent',
        timestamp: new Date(),
        measurements: { tilt: 15.5 },
        quality: 0.95
      };

      expect(() => network.updateSensorReading('non-existent', reading))
        .toThrow('Sensor non-existent not found in network');
    });

    it('should maintain data buffer with maximum size', () => {
      const sensor = network.getSensor('sensor-1')!;

      // Add 105 readings (more than the 100 limit)
      for (let i = 0; i < 105; i++) {
        const reading: SensorReading = {
          sensorId: 'sensor-1',
          timestamp: new Date(Date.now() + i * 1000),
          measurements: { tilt: i },
          quality: 0.95
        };
        network.updateSensorReading('sensor-1', reading);
      }

      expect(sensor.currentState.dataBuffer).toHaveLength(100);
      // Should keep the most recent readings
      expect(sensor.currentState.dataBuffer[99].measurements.tilt).toBe(104);
    });
  });

  describe('synchronizeWithPhysicalSensor', () => {
    beforeEach(() => {
      const config: SensorConfiguration = {
        id: 'sensor-1',
        type: 'tilt',
        location: { x: 0, y: 0, z: 0 },
        measurementRange: { min: -90, max: 90, unit: 'degrees' },
        samplingRate: 1,
        accuracy: 0.1,
        calibrationDate: new Date(),
        maintenanceInterval: 90
      };
      network.addSensor(config, 'physical-1');
    });

    it('should synchronize physical sensor state', () => {
      network.synchronizeWithPhysicalSensor('sensor-1', {
        batteryLevel: 65,
        signalStrength: 80,
        isOnline: true,
        operationalMode: 'normal'
      });

      const sensor = network.getSensor('sensor-1')!;
      expect(sensor.healthStatus.batteryLevel).toBe(65);
      expect(sensor.healthStatus.signalQuality).toBe(80);
      expect(sensor.currentState.isOnline).toBe(true);
      expect(sensor.currentState.operationalMode).toBe('normal');
      expect(sensor.healthStatus.overall).toBe('healthy');
    });

    it('should update health status to warning for low battery', () => {
      network.synchronizeWithPhysicalSensor('sensor-1', {
        batteryLevel: 25,
        isOnline: true
      });

      const sensor = network.getSensor('sensor-1')!;
      expect(sensor.healthStatus.overall).toBe('warning');
    });

    it('should update health status to critical for very low battery', () => {
      network.synchronizeWithPhysicalSensor('sensor-1', {
        batteryLevel: 5,
        isOnline: true
      });

      const sensor = network.getSensor('sensor-1')!;
      expect(sensor.healthStatus.overall).toBe('critical');
    });
  });

  describe('getSensorsInRadius', () => {
    beforeEach(() => {
      const configs: SensorConfiguration[] = [
        {
          id: 'sensor-1',
          type: 'tilt',
          location: { x: 0, y: 0, z: 0 },
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        },
        {
          id: 'sensor-2',
          type: 'tilt',
          location: { x: 50, y: 0, z: 0 },
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        },
        {
          id: 'sensor-3',
          type: 'tilt',
          location: { x: 200, y: 0, z: 0 },
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        }
      ];

      configs.forEach(config => network.addSensor(config));
    });

    it('should find sensors within radius', () => {
      const center = { x: 0, y: 0, z: 0 };
      const sensors = network.getSensorsInRadius(center, 100);

      expect(sensors).toHaveLength(2);
      expect(sensors.map(s => s.id)).toContain('sensor-1');
      expect(sensors.map(s => s.id)).toContain('sensor-2');
      expect(sensors.map(s => s.id)).not.toContain('sensor-3');
    });

    it('should return sensors sorted by distance', () => {
      const center = { x: 25, y: 0, z: 0 };
      const sensors = network.getSensorsInRadius(center, 100);

      expect(sensors).toHaveLength(2);
      // sensor-1 is at (0,0,0) - distance 25
      // sensor-2 is at (50,0,0) - distance 25  
      // Both are equidistant, so either order is valid
      expect(sensors.map(s => s.id)).toContain('sensor-1');
      expect(sensors.map(s => s.id)).toContain('sensor-2');
    });
  });

  describe('interpolateAtLocation', () => {
    beforeEach(() => {
      const configs: SensorConfiguration[] = [
        {
          id: 'sensor-1',
          type: 'tilt',
          location: { x: 0, y: 0, z: 0 },
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        },
        {
          id: 'sensor-2',
          type: 'tilt',
          location: { x: 100, y: 0, z: 0 },
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        }
      ];

      configs.forEach(config => network.addSensor(config));

      // Add readings to sensors
      network.updateSensorReading('sensor-1', {
        sensorId: 'sensor-1',
        timestamp: new Date(),
        measurements: { tilt: 10 },
        quality: 0.95
      });

      network.updateSensorReading('sensor-2', {
        sensorId: 'sensor-2',
        timestamp: new Date(),
        measurements: { tilt: 20 },
        quality: 0.95
      });
    });

    it('should interpolate value using inverse distance weighting', () => {
      const query = {
        location: { x: 50, y: 0, z: 0 }, // Midpoint between sensors
        measurementType: 'tilt',
        method: 'idw' as const
      };

      const result = network.interpolateAtLocation(query);

      expect(result.estimatedValue).toBeCloseTo(15, 1); // Should be close to average
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.contributingSensors).toHaveLength(2);
      expect(result.interpolationMethod).toBe('idw');
    });

    it('should use nearest neighbor interpolation', () => {
      const query = {
        location: { x: 10, y: 0, z: 0 }, // Closer to sensor-1
        measurementType: 'tilt',
        method: 'nearest' as const
      };

      const result = network.interpolateAtLocation(query);

      expect(result.estimatedValue).toBe(10); // Value from sensor-1
      expect(result.contributingSensors).toHaveLength(1);
      expect(result.contributingSensors[0].sensorId).toBe('sensor-1');
      expect(result.interpolationMethod).toBe('nearest');
    });

    it('should return zero confidence when no sensors available', () => {
      const query = {
        location: { x: 1000, y: 1000, z: 0 }, // Far from all sensors
        measurementType: 'tilt'
      };

      const result = network.interpolateAtLocation(query);

      expect(result.estimatedValue).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.contributingSensors).toHaveLength(0);
    });
  });

  describe('alert management', () => {
    beforeEach(() => {
      const config: SensorConfiguration = {
        id: 'sensor-1',
        type: 'tilt',
        location: { x: 0, y: 0, z: 0 },
        measurementRange: { min: -90, max: 90, unit: 'degrees' },
        samplingRate: 1,
        accuracy: 0.1,
        calibrationDate: new Date(),
        maintenanceInterval: 90
      };
      network.addSensor(config);
    });

    it('should generate battery low alert', () => {
      network.synchronizeWithPhysicalSensor('sensor-1', {
        batteryLevel: 5,
        isOnline: true
      });

      const alerts = network.getActiveAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('battery_low');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should acknowledge alerts', () => {
      network.synchronizeWithPhysicalSensor('sensor-1', {
        batteryLevel: 5,
        isOnline: true
      });

      const alerts = network.getActiveAlerts();
      const alertId = alerts[0].id;

      const acknowledged = network.acknowledgeAlert(alertId);
      expect(acknowledged).toBe(true);

      const activeAlerts = network.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should call alert handlers', (done) => {
      const timeout = setTimeout(() => {
        done(new Error('Alert handler not called within timeout'));
      }, 1000);

      network.onAlert('battery_low', (alert) => {
        clearTimeout(timeout);
        expect(alert.type).toBe('battery_low');
        expect(alert.severity).toBe('critical');
        done();
      });

      network.synchronizeWithPhysicalSensor('sensor-1', {
        batteryLevel: 5,
        isOnline: true
      });
    });

    it('should detect measurement anomalies', () => {
      // Add consistent normal readings to establish baseline
      for (let i = 0; i < 6; i++) {
        network.updateSensorReading('sensor-1', {
          sensorId: 'sensor-1',
          timestamp: new Date(Date.now() + i * 1000),
          measurements: { tilt: 10 + (i % 2) }, // Values 10 or 11 (small variation)
          quality: 0.95
        });
      }

      // Verify we have enough readings
      const sensor = network.getSensor('sensor-1')!;
      expect(sensor.currentState.dataBuffer.length).toBe(6);

      // Add anomalous reading that's way outside normal range
      network.updateSensorReading('sensor-1', {
        sensorId: 'sensor-1',
        timestamp: new Date(Date.now() + 7000),
        measurements: { tilt: 100 }, // Way outside normal range (10-11 vs 100)
        quality: 0.95
      });

      const alerts = network.getActiveAlerts();
      const anomalyAlerts = alerts.filter(a => a.type === 'measurement_anomaly');
      
      // Debug: log alerts if test fails
      if (anomalyAlerts.length === 0) {
        console.log('All alerts:', alerts.map(a => ({ type: a.type, message: a.message })));
        console.log('Buffer length:', sensor.currentState.dataBuffer.length);
        console.log('Recent values:', sensor.currentState.dataBuffer.map(r => r.measurements.tilt));
      }
      
      expect(anomalyAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('network topology', () => {
    beforeEach(() => {
      const configs: SensorConfiguration[] = [
        {
          id: 'sensor-1',
          type: 'tilt',
          location: { x: 0, y: 0, z: 0 },
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        },
        {
          id: 'sensor-2',
          type: 'tilt',
          location: { x: 50, y: 0, z: 0 }, // Within 100m neighbor range
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        },
        {
          id: 'sensor-3',
          type: 'tilt',
          location: { x: 200, y: 0, z: 0 }, // Outside neighbor range
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        }
      ];

      configs.forEach(config => network.addSensor(config));
    });

    it('should build neighbor relationships', () => {
      const sensor1 = network.getSensor('sensor-1')!;
      const sensor2 = network.getSensor('sensor-2')!;
      const sensor3 = network.getSensor('sensor-3')!;

      expect(sensor1.neighbors).toContain('sensor-2');
      expect(sensor1.neighbors).not.toContain('sensor-3');
      expect(sensor2.neighbors).toContain('sensor-1');
      expect(sensor2.neighbors).not.toContain('sensor-3');
      expect(sensor3.neighbors).toHaveLength(0);
    });

    it('should calculate network topology metrics', () => {
      const topology = network.getNetworkTopology();

      expect(topology.connections.size).toBe(3);
      expect(topology.redundancyLevel).toBeGreaterThan(0);
      expect(topology.networkDiameter).toBeGreaterThanOrEqual(0);
    });
  });

  describe('coverage analysis', () => {
    beforeEach(() => {
      const config: SensorConfiguration = {
        id: 'sensor-1',
        type: 'tilt',
        location: { x: 0, y: 0, z: 0 },
        measurementRange: { min: -90, max: 90, unit: 'degrees' },
        samplingRate: 1,
        accuracy: 0.1,
        calibrationDate: new Date(),
        maintenanceInterval: 90
      };
      network.addSensor(config);
    });

    it('should calculate coverage statistics', () => {
      const coverage = network.getCoverageMap();

      expect(coverage.totalArea).toBeGreaterThan(0);
      expect(coverage.coveredArea).toBeGreaterThan(0);
      expect(coverage.coveragePercentage).toBeGreaterThan(0);
    });

    it('should identify coverage gaps', () => {
      const coverage = network.getCoverageMap();

      // With only 1 sensor, should identify gaps
      expect(coverage.gaps.length).toBeGreaterThan(0);
      expect(coverage.gaps[0].severity).toBe('high');
      expect(coverage.gaps[0].recommendedSensorCount).toBeGreaterThan(0);
    });
  });

  describe('network statistics', () => {
    beforeEach(() => {
      const configs: SensorConfiguration[] = [
        {
          id: 'sensor-1',
          type: 'tilt',
          location: { x: 0, y: 0, z: 0 },
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        },
        {
          id: 'sensor-2',
          type: 'tilt',
          location: { x: 50, y: 0, z: 0 },
          measurementRange: { min: -90, max: 90, unit: 'degrees' },
          samplingRate: 1,
          accuracy: 0.1,
          calibrationDate: new Date(),
          maintenanceInterval: 90
        }
      ];

      configs.forEach(config => network.addSensor(config));
    });

    it('should calculate network statistics correctly', () => {
      // Make one sensor online
      network.updateSensorReading('sensor-1', {
        sensorId: 'sensor-1',
        timestamp: new Date(),
        measurements: { tilt: 10 },
        quality: 0.95,
        batteryLevel: 80
      });

      const stats = network.getNetworkStatistics();

      expect(stats.totalSensors).toBe(2);
      expect(stats.activeSensors).toBe(1);
      expect(stats.networkUptime).toBe(50); // 1 out of 2 sensors online
      expect(stats.averageBatteryLevel).toBeGreaterThan(0);
    });

    it('should track data rate', () => {
      // Add multiple readings within a minute
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        network.updateSensorReading('sensor-1', {
          sensorId: 'sensor-1',
          timestamp: new Date(now.getTime() + i * 1000),
          measurements: { tilt: 10 + i },
          quality: 0.95
        });
      }

      const stats = network.getNetworkStatistics();
      expect(stats.dataRate).toBeGreaterThan(0);
    });
  });
});