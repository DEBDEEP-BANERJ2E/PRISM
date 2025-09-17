import { PowerManager } from '../services/PowerManager';
import { PowerManagementConfig } from '../types';

describe('PowerManager', () => {
  let powerManager: PowerManager;
  let config: PowerManagementConfig;

  beforeEach(() => {
    config = {
      sleepDuration: 900, // 15 minutes
      samplingInterval: 60, // 1 minute
      transmissionInterval: 1800, // 30 minutes
      lowPowerThreshold: 30,
      criticalPowerThreshold: 10
    };

    powerManager = new PowerManager(config);
  });

  describe('battery management', () => {
    it('should update battery status correctly', () => {
      powerManager.updateBatteryStatus(3.6, true);

      const powerStatus = powerManager.getPowerStatus();
      expect(powerStatus.solarCharging).toBe(true);
      expect(powerStatus.batteryLevel).toBeGreaterThan(0);
      expect(powerStatus.batteryLevel).toBeLessThanOrEqual(100);
    });

    it('should calculate battery level from voltage', () => {
      // Test different voltage levels
      powerManager.updateBatteryStatus(3.7, false); // Full battery
      expect(powerManager.getBatteryLevel()).toBeCloseTo(100, 0);

      powerManager.updateBatteryStatus(3.35, false); // Mid battery
      expect(powerManager.getBatteryLevel()).toBeCloseTo(50, 10);

      powerManager.updateBatteryStatus(3.0, false); // Empty battery
      expect(powerManager.getBatteryLevel()).toBeCloseTo(0, 0);
    });
  });

  describe('optimal sleep duration calculation', () => {
    it('should calculate shorter sleep for higher risk levels', () => {
      powerManager.updateBatteryStatus(3.6, false); // Good battery

      const criticalSleep = powerManager.calculateOptimalSleepDuration('critical');
      const highSleep = powerManager.calculateOptimalSleepDuration('high');
      const mediumSleep = powerManager.calculateOptimalSleepDuration('medium');
      const lowSleep = powerManager.calculateOptimalSleepDuration('low');

      expect(criticalSleep).toBeLessThan(highSleep);
      expect(highSleep).toBeLessThan(mediumSleep);
      expect(mediumSleep).toBeLessThan(lowSleep);
    });

    it('should extend sleep duration for low battery', () => {
      const normalSleep = (() => {
        powerManager.updateBatteryStatus(3.6, false); // Good battery
        return powerManager.calculateOptimalSleepDuration('low');
      })();

      const lowBatterySleep = (() => {
        powerManager.updateBatteryStatus(3.2, false); // Low battery
        return powerManager.calculateOptimalSleepDuration('low');
      })();

      const criticalBatterySleep = (() => {
        powerManager.updateBatteryStatus(3.05, false); // Critical battery
        return powerManager.calculateOptimalSleepDuration('low');
      })();

      expect(lowBatterySleep).toBeGreaterThan(normalSleep);
      expect(criticalBatterySleep).toBeGreaterThan(lowBatterySleep);
    });

    it('should reduce sleep duration when solar charging with good battery', () => {
      const normalSleep = (() => {
        powerManager.updateBatteryStatus(3.6, false); // Good battery, no charging
        return powerManager.calculateOptimalSleepDuration('low');
      })();

      const chargingSleep = (() => {
        powerManager.updateBatteryStatus(3.65, true); // Good battery, charging
        return powerManager.calculateOptimalSleepDuration('low');
      })();

      expect(chargingSleep).toBeLessThan(normalSleep);
    });
  });

  describe('optimal sampling interval calculation', () => {
    it('should calculate shorter intervals for higher risk levels', () => {
      powerManager.updateBatteryStatus(3.6, false); // Good battery

      const criticalInterval = powerManager.calculateOptimalSamplingInterval('critical');
      const highInterval = powerManager.calculateOptimalSamplingInterval('high');
      const mediumInterval = powerManager.calculateOptimalSamplingInterval('medium');
      const lowInterval = powerManager.calculateOptimalSamplingInterval('low');

      expect(criticalInterval).toBeLessThan(highInterval);
      expect(highInterval).toBeLessThan(mediumInterval);
      expect(mediumInterval).toBeLessThan(lowInterval);
    });

    it('should extend sampling interval for low battery', () => {
      const normalInterval = (() => {
        powerManager.updateBatteryStatus(3.6, false); // Good battery
        return powerManager.calculateOptimalSamplingInterval('medium');
      })();

      const lowBatteryInterval = (() => {
        powerManager.updateBatteryStatus(3.2, false); // Low battery
        return powerManager.calculateOptimalSamplingInterval('medium');
      })();

      expect(lowBatteryInterval).toBeGreaterThan(normalInterval);
    });
  });

  describe('optimal transmission interval calculation', () => {
    it('should calculate shorter intervals for higher risk levels', () => {
      powerManager.updateBatteryStatus(3.6, false); // Good battery

      const criticalInterval = powerManager.calculateOptimalTransmissionInterval('critical', 10);
      const highInterval = powerManager.calculateOptimalTransmissionInterval('high', 10);
      const mediumInterval = powerManager.calculateOptimalTransmissionInterval('medium', 10);
      const lowInterval = powerManager.calculateOptimalTransmissionInterval('low', 10);

      expect(criticalInterval).toBeLessThan(highInterval);
      expect(highInterval).toBeLessThan(mediumInterval);
      expect(mediumInterval).toBeLessThan(lowInterval);
    });

    it('should reduce interval when buffer is getting full', () => {
      powerManager.updateBatteryStatus(3.6, false); // Good battery

      const normalInterval = powerManager.calculateOptimalTransmissionInterval('low', 10);
      const fullBufferInterval = powerManager.calculateOptimalTransmissionInterval('low', 850); // Buffer 85% full

      expect(fullBufferInterval).toBeLessThan(normalInterval);
    });

    it('should extend interval for low battery', () => {
      const normalInterval = (() => {
        powerManager.updateBatteryStatus(3.6, false); // Good battery
        return powerManager.calculateOptimalTransmissionInterval('medium', 10);
      })();

      const lowBatteryInterval = (() => {
        powerManager.updateBatteryStatus(3.2, false); // Low battery
        return powerManager.calculateOptimalTransmissionInterval('medium', 10);
      })();

      expect(lowBatteryInterval).toBeGreaterThan(normalInterval);
    });
  });

  describe('runtime estimation', () => {
    it('should estimate remaining runtime based on consumption', () => {
      powerManager.updateBatteryStatus(3.6, false); // Good battery
      powerManager.updatePowerConsumption(1.0); // 1W consumption

      const runtime = powerManager.estimateRemainingRuntime();

      expect(runtime).toBeGreaterThan(0);
      expect(runtime).toBeLessThan(100); // Should be reasonable
    });

    it('should return infinity when solar input exceeds consumption', () => {
      powerManager.updateBatteryStatus(3.6, true); // Good battery, charging
      powerManager.updatePowerConsumption(0.1); // Very low consumption

      const runtime = powerManager.estimateRemainingRuntime();

      // During good solar conditions with low consumption, runtime could be infinite
      expect(runtime).toBeGreaterThan(100);
    });

    it('should estimate shorter runtime for higher consumption', () => {
      powerManager.updateBatteryStatus(3.6, false); // Good battery

      const lowConsumptionRuntime = (() => {
        powerManager.updatePowerConsumption(0.5); // Low consumption
        return powerManager.estimateRemainingRuntime();
      })();

      const highConsumptionRuntime = (() => {
        powerManager.updatePowerConsumption(2.0); // High consumption
        return powerManager.estimateRemainingRuntime();
      })();

      expect(highConsumptionRuntime).toBeLessThan(lowConsumptionRuntime);
    });
  });

  describe('power state decisions', () => {
    it('should enter deep sleep for critical battery', () => {
      powerManager.updateBatteryStatus(3.05, false); // Critical battery
      powerManager.updatePowerConsumption(1.0);

      expect(powerManager.shouldEnterDeepSleep()).toBe(true);
    });

    it('should enter deep sleep for very short runtime', () => {
      powerManager.updateBatteryStatus(3.1, false); // Low battery
      powerManager.updatePowerConsumption(5.0); // Very high consumption

      expect(powerManager.shouldEnterDeepSleep()).toBe(true);
    });

    it('should not enter deep sleep for good conditions', () => {
      powerManager.updateBatteryStatus(3.6, true); // Good battery, charging
      powerManager.updatePowerConsumption(0.5); // Low consumption

      expect(powerManager.shouldEnterDeepSleep()).toBe(false);
    });

    it('should reduce performance for low battery', () => {
      powerManager.updateBatteryStatus(3.2, false); // Low battery

      expect(powerManager.shouldReducePerformance()).toBe(true);
    });

    it('should not reduce performance for good battery', () => {
      powerManager.updateBatteryStatus(3.6, false); // Good battery

      expect(powerManager.shouldReducePerformance()).toBe(false);
    });
  });

  describe('power trends', () => {
    it('should track power consumption trends', () => {
      // Simulate some power history
      powerManager.updateBatteryStatus(3.6, false);
      powerManager.updatePowerConsumption(1.0);

      const trends = powerManager.getPowerTrends();

      expect(trends).toHaveProperty('averageConsumption');
      expect(trends).toHaveProperty('batteryTrend');
      expect(trends).toHaveProperty('solarEfficiency');

      expect(['increasing', 'decreasing', 'stable']).toContain(trends.batteryTrend);
      expect(trends.solarEfficiency).toBeGreaterThanOrEqual(0);
      expect(trends.solarEfficiency).toBeLessThanOrEqual(100);
    });
  });

  describe('emergency mode', () => {
    it('should activate emergency mode', () => {
      powerManager.activateEmergencyMode();

      // Emergency mode should drastically reduce power consumption
      const sleepDuration = powerManager.calculateOptimalSleepDuration('low');
      expect(sleepDuration).toBeGreaterThanOrEqual(config.sleepDuration);
    });

    it('should deactivate emergency mode', () => {
      powerManager.activateEmergencyMode();
      powerManager.deactivateEmergencyMode();

      // Should return to normal operation
      const sleepDuration = powerManager.calculateOptimalSleepDuration('low');
      expect(sleepDuration).toBeLessThanOrEqual(config.sleepDuration * 2);
    });
  });

  describe('getPowerStatus', () => {
    it('should return complete power status', () => {
      powerManager.updateBatteryStatus(3.6, true);
      powerManager.updatePowerConsumption(1.5);

      const status = powerManager.getPowerStatus();

      expect(status).toHaveProperty('batteryLevel');
      expect(status).toHaveProperty('solarCharging');
      expect(status).toHaveProperty('powerConsumption');
      expect(status).toHaveProperty('estimatedRuntime');

      expect(status.batteryLevel).toBeGreaterThanOrEqual(0);
      expect(status.batteryLevel).toBeLessThanOrEqual(100);
      expect(status.solarCharging).toBe(true);
      expect(status.powerConsumption).toBe(1.5);
      expect(status.estimatedRuntime).toBeGreaterThan(0);
    });
  });
});