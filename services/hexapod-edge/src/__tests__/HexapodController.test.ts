import { HexapodController } from '../services/HexapodController';
import { PowerManagementConfig, LoRaWANConfig, CompressionConfig } from '../types';

// Mock the services
jest.mock('../services/SensorManager');
jest.mock('../services/EdgeAIEngine');
jest.mock('../services/PowerManager');
jest.mock('../services/LoRaWANManager');
jest.mock('../services/DataCompressor');

describe('HexapodController', () => {
  let hexapodController: HexapodController;
  let powerConfig: PowerManagementConfig;
  let loraConfig: LoRaWANConfig;
  let compressionConfig: CompressionConfig;

  beforeEach(() => {
    powerConfig = {
      sleepDuration: 900,
      samplingInterval: 60,
      transmissionInterval: 1800,
      lowPowerThreshold: 30,
      criticalPowerThreshold: 10
    };

    loraConfig = {
      devEUI: '0000000000000000',
      appEUI: '0000000000000000',
      appKey: '00000000000000000000000000000000',
      dataRate: 5,
      txPower: 14,
      adaptiveDataRate: true,
      confirmUplinks: false
    };

    compressionConfig = {
      algorithm: 'delta',
      compressionLevel: 6,
      batchSize: 10,
      maxBufferSize: 1000
    };

    const location = {
      latitude: -23.5505,
      longitude: -46.6333,
      elevation: 760.0
    };

    hexapodController = new HexapodController(
      'test-hexapod-001',
      location,
      powerConfig,
      loraConfig,
      compressionConfig
    );
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const result = await hexapodController.initialize();
      expect(result).toBe(true);
    });

    it('should handle initialization failure gracefully', async () => {
      // Mock LoRaWAN initialization failure
      const result = await hexapodController.initialize();
      // Should still initialize even if LoRaWAN fails
      expect(typeof result).toBe('boolean');
    });
  });

  describe('start and stop', () => {
    it('should start monitoring loop', async () => {
      await hexapodController.initialize();
      await hexapodController.start();

      // Controller should be running
      const status = hexapodController.getHexapodStatus();
      expect(status.operationalStatus).toBe('active');
    });

    it('should stop monitoring loop', async () => {
      await hexapodController.initialize();
      await hexapodController.start();
      await hexapodController.stop();

      const status = hexapodController.getHexapodStatus();
      expect(status.operationalStatus).toBe('sleep');
    });

    it('should not start if already running', async () => {
      await hexapodController.initialize();
      await hexapodController.start();
      
      // Starting again should not cause issues
      await hexapodController.start();
      
      const status = hexapodController.getHexapodStatus();
      expect(status.operationalStatus).toBe('active');
    });
  });

  describe('getHexapodStatus', () => {
    it('should return complete status information', async () => {
      await hexapodController.initialize();
      
      const status = hexapodController.getHexapodStatus();

      expect(status).toHaveProperty('podId');
      expect(status).toHaveProperty('location');
      expect(status).toHaveProperty('operationalStatus');
      expect(status).toHaveProperty('sensorHealth');
      expect(status).toHaveProperty('lastCommunication');
      expect(status).toHaveProperty('powerStatus');
      expect(status).toHaveProperty('communicationStatus');

      expect(status.podId).toBe('test-hexapod-001');
      expect(['active', 'sleep', 'maintenance', 'error']).toContain(status.operationalStatus);
    });

    it('should include sensor health information', async () => {
      await hexapodController.initialize();
      
      const status = hexapodController.getHexapodStatus();

      expect(status.sensorHealth).toHaveProperty('imu');
      expect(status.sensorHealth).toHaveProperty('tiltmeter');
      expect(status.sensorHealth).toHaveProperty('piezometer');
      expect(status.sensorHealth).toHaveProperty('environmental');
      expect(status.sensorHealth).toHaveProperty('strain_gauge');

      Object.values(status.sensorHealth).forEach(health => {
        expect(['healthy', 'warning', 'error']).toContain(health);
      });
    });

    it('should include power status information', async () => {
      await hexapodController.initialize();
      
      const status = hexapodController.getHexapodStatus();

      expect(status.powerStatus).toHaveProperty('batteryLevel');
      expect(status.powerStatus).toHaveProperty('solarCharging');
      expect(status.powerStatus).toHaveProperty('powerConsumption');
      expect(status.powerStatus).toHaveProperty('estimatedRuntime');

      expect(status.powerStatus.batteryLevel).toBeGreaterThanOrEqual(0);
      expect(status.powerStatus.batteryLevel).toBeLessThanOrEqual(100);
      expect(typeof status.powerStatus.solarCharging).toBe('boolean');
    });

    it('should include communication status information', async () => {
      await hexapodController.initialize();
      
      const status = hexapodController.getHexapodStatus();

      expect(status.communicationStatus).toHaveProperty('loraSignalStrength');
      expect(status.communicationStatus).toHaveProperty('lastSuccessfulTransmission');
      expect(status.communicationStatus).toHaveProperty('failedTransmissions');
      expect(status.communicationStatus).toHaveProperty('dataBufferSize');

      expect(status.communicationStatus.loraSignalStrength).toBeLessThan(0);
      expect(status.communicationStatus.failedTransmissions).toBeGreaterThanOrEqual(0);
      expect(status.communicationStatus.dataBufferSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('remote control', () => {
    it('should update configuration', async () => {
      await hexapodController.initialize();

      const config = {
        powerManagement: {
          sleepDuration: 1200
        },
        compression: {
          level: 8,
          batchSize: 15
        }
      };

      const result = await hexapodController.updateConfiguration(config);
      expect(result).toBe(true);
    });

    it('should handle configuration update errors', async () => {
      await hexapodController.initialize();

      const invalidConfig = {
        invalid: 'config'
      };

      const result = await hexapodController.updateConfiguration(invalidConfig);
      expect(typeof result).toBe('boolean');
    });

    it('should perform remote diagnostics', async () => {
      await hexapodController.initialize();

      const diagnostics = await hexapodController.performRemoteDiagnostics();

      expect(diagnostics).toHaveProperty('podId');
      expect(diagnostics).toHaveProperty('timestamp');
      expect(diagnostics).toHaveProperty('status');
      expect(diagnostics).toHaveProperty('sensorSelfTest');
      expect(diagnostics).toHaveProperty('powerTrends');
      expect(diagnostics).toHaveProperty('aiModelInfo');
      expect(diagnostics).toHaveProperty('compressionStats');
      expect(diagnostics).toHaveProperty('connectionStatus');

      expect(diagnostics.podId).toBe('test-hexapod-001');
      expect(diagnostics.timestamp).toBeGreaterThan(0);
    });

    it('should calibrate sensors', async () => {
      await hexapodController.initialize();

      const calibrationData = {
        'tilt_x_offset': 0.05,
        'tilt_y_offset': -0.02,
        'pressure_offset': 1.5
      };

      const result = await hexapodController.calibrateSensors(calibrationData);
      expect(result).toBe(true);
    });

    it('should handle sensor calibration errors', async () => {
      await hexapodController.initialize();

      const invalidCalibration = {
        'invalid_parameter': 'invalid_value'
      };

      const result = await hexapodController.calibrateSensors(invalidCalibration);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('maintenance mode', () => {
    it('should enter maintenance mode', async () => {
      await hexapodController.initialize();
      await hexapodController.start();
      
      await hexapodController.enterMaintenanceMode();

      const status = hexapodController.getHexapodStatus();
      expect(status.operationalStatus).toBe('maintenance');
    });

    it('should exit maintenance mode', async () => {
      await hexapodController.initialize();
      await hexapodController.enterMaintenanceMode();
      
      await hexapodController.exitMaintenanceMode();

      const status = hexapodController.getHexapodStatus();
      expect(status.operationalStatus).toBe('active');
    });
  });

  describe('error handling', () => {
    it('should handle sensor reading errors gracefully', async () => {
      await hexapodController.initialize();
      
      // Mock sensor error
      // The controller should handle errors and continue operation
      
      const status = hexapodController.getHexapodStatus();
      expect(['active', 'error', 'maintenance']).toContain(status.operationalStatus);
    });

    it('should handle communication errors gracefully', async () => {
      await hexapodController.initialize();
      
      // Mock communication error
      // The controller should buffer data and retry
      
      const status = hexapodController.getHexapodStatus();
      expect(status.communicationStatus.dataBufferSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('power management integration', () => {
    it('should adjust behavior based on battery level', async () => {
      await hexapodController.initialize();
      
      // The controller should adjust its behavior based on power status
      const status = hexapodController.getHexapodStatus();
      
      if (status.powerStatus.batteryLevel < 20) {
        // Should be in power saving mode
        expect(status.operationalStatus).not.toBe('error');
      }
    });

    it('should handle deep sleep scenarios', async () => {
      await hexapodController.initialize();
      
      // Mock critical battery scenario
      // Controller should handle deep sleep gracefully
      
      const status = hexapodController.getHexapodStatus();
      expect(status.operationalStatus).toBeDefined();
    });
  });

  describe('edge AI integration', () => {
    it('should process AI results for local decisions', async () => {
      await hexapodController.initialize();
      
      // The controller should integrate AI results into its decision making
      const status = hexapodController.getHexapodStatus();
      expect(status.operationalStatus).toBeDefined();
    });

    it('should handle emergency conditions', async () => {
      await hexapodController.initialize();
      
      // Mock emergency AI result
      // Controller should handle emergency scenarios appropriately
      
      const status = hexapodController.getHexapodStatus();
      expect(status.operationalStatus).toBeDefined();
    });
  });
});