import { PowerManagementConfig, HexapodStatus } from '../types';

export class PowerManager {
  private config: PowerManagementConfig;
  private batteryVoltage: number = 3.7;
  private solarCharging: boolean = false;
  private powerConsumption: number = 0;
  private lastPowerCheck: number = Date.now();
  private powerHistory: { timestamp: number; voltage: number; consumption: number }[] = [];

  constructor(config: PowerManagementConfig) {
    this.config = config;
  }

  updateBatteryStatus(voltage: number, solarCharging: boolean): void {
    this.batteryVoltage = voltage;
    this.solarCharging = solarCharging;
    this.recordPowerData();
  }

  private recordPowerData(): void {
    const now = Date.now();
    this.powerHistory.push({
      timestamp: now,
      voltage: this.batteryVoltage,
      consumption: this.powerConsumption
    });

    // Keep only last 24 hours of data
    const dayAgo = now - 24 * 60 * 60 * 1000;
    this.powerHistory = this.powerHistory.filter(entry => entry.timestamp > dayAgo);
  }

  calculateOptimalSleepDuration(riskLevel: 'low' | 'medium' | 'high' | 'critical'): number {
    const batteryLevel = this.getBatteryLevel();
    
    // Base sleep duration based on risk level
    let baseSleepDuration: number;
    switch (riskLevel) {
      case 'critical':
        baseSleepDuration = 30; // 30 seconds - maximum monitoring
        break;
      case 'high':
        baseSleepDuration = 60; // 1 minute
        break;
      case 'medium':
        baseSleepDuration = 300; // 5 minutes
        break;
      case 'low':
      default:
        baseSleepDuration = this.config.sleepDuration; // Default (e.g., 15 minutes)
        break;
    }

    // Adjust based on battery level
    if (batteryLevel < this.config.criticalPowerThreshold) {
      // Critical battery - extend sleep significantly
      baseSleepDuration *= 4;
    } else if (batteryLevel < this.config.lowPowerThreshold) {
      // Low battery - extend sleep moderately
      baseSleepDuration *= 2;
    } else if (this.solarCharging && batteryLevel > 80) {
      // Good battery and charging - can reduce sleep time
      baseSleepDuration *= 0.7;
    }

    // Consider time of day for solar charging optimization
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    
    if (!isDaytime && !this.solarCharging) {
      // Night time without charging - conserve power
      baseSleepDuration *= 1.5;
    }

    return Math.max(30, Math.min(3600, baseSleepDuration)); // Between 30 seconds and 1 hour
  }

  calculateOptimalSamplingInterval(riskLevel: 'low' | 'medium' | 'high' | 'critical'): number {
    const batteryLevel = this.getBatteryLevel();
    
    // Base sampling interval based on risk level
    let baseSamplingInterval: number;
    switch (riskLevel) {
      case 'critical':
        baseSamplingInterval = 1; // 1 second
        break;
      case 'high':
        baseSamplingInterval = 5; // 5 seconds
        break;
      case 'medium':
        baseSamplingInterval = 15; // 15 seconds
        break;
      case 'low':
      default:
        baseSamplingInterval = this.config.samplingInterval; // Default (e.g., 60 seconds)
        break;
    }

    // Adjust based on battery level
    if (batteryLevel < this.config.criticalPowerThreshold) {
      baseSamplingInterval *= 3;
    } else if (batteryLevel < this.config.lowPowerThreshold) {
      baseSamplingInterval *= 1.5;
    }

    return Math.max(1, Math.min(300, baseSamplingInterval)); // Between 1 second and 5 minutes
  }

  calculateOptimalTransmissionInterval(riskLevel: 'low' | 'medium' | 'high' | 'critical', dataBufferSize: number): number {
    const batteryLevel = this.getBatteryLevel();
    
    // Base transmission interval based on risk level
    let baseTransmissionInterval: number;
    switch (riskLevel) {
      case 'critical':
        baseTransmissionInterval = 60; // 1 minute - immediate transmission
        break;
      case 'high':
        baseTransmissionInterval = 300; // 5 minutes
        break;
      case 'medium':
        baseTransmissionInterval = 900; // 15 minutes
        break;
      case 'low':
      default:
        baseTransmissionInterval = this.config.transmissionInterval; // Default (e.g., 30 minutes)
        break;
    }

    // Adjust based on battery level
    if (batteryLevel < this.config.criticalPowerThreshold) {
      // Critical battery - reduce transmission frequency
      baseTransmissionInterval *= 2;
    } else if (batteryLevel < this.config.lowPowerThreshold) {
      baseTransmissionInterval *= 1.3;
    }

    // Adjust based on buffer size to prevent overflow
    const maxBufferSize = 1000; // Maximum number of readings to buffer
    if (dataBufferSize > maxBufferSize * 0.8) {
      // Buffer getting full - increase transmission frequency
      baseTransmissionInterval *= 0.5;
    }

    return Math.max(60, Math.min(7200, baseTransmissionInterval)); // Between 1 minute and 2 hours
  }

  getBatteryLevel(): number {
    // Convert voltage to percentage for LiFePO4 battery
    const minVoltage = 3.0;
    const maxVoltage = 3.7;
    const percentage = ((this.batteryVoltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  estimateRemainingRuntime(): number {
    const batteryLevel = this.getBatteryLevel();
    const currentConsumption = this.powerConsumption;
    
    if (currentConsumption <= 0) return Infinity;
    
    // Estimate battery capacity in mAh (typical for hexapod sensor pod)
    const batteryCapacityMah = 5000;
    const remainingCapacityMah = (batteryLevel / 100) * batteryCapacityMah;
    
    // Convert consumption from watts to mA (assuming 3.7V nominal)
    const consumptionMa = (currentConsumption * 1000) / 3.7;
    
    // Calculate runtime in hours
    const runtimeHours = remainingCapacityMah / consumptionMa;
    
    // Consider solar charging
    if (this.solarCharging) {
      const solarInputMa = this.estimateSolarInput();
      const netConsumption = Math.max(0, consumptionMa - solarInputMa);
      
      if (netConsumption <= 0) return Infinity; // Solar input exceeds consumption
      
      return remainingCapacityMah / netConsumption;
    }
    
    return runtimeHours;
  }

  private estimateSolarInput(): number {
    // Estimate solar panel input based on time of day and weather
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    
    if (!isDaytime) return 0;
    
    // Peak solar input around noon, assuming 5W panel
    const peakInputWatts = 5;
    const peakInputMa = (peakInputWatts * 1000) / 3.7;
    
    // Simple solar curve approximation
    const solarEfficiency = Math.sin(((hour - 6) / 12) * Math.PI);
    
    // Weather factor (simplified - in real implementation would use weather data)
    const weatherFactor = 0.7; // Assume some cloud cover
    
    return peakInputMa * solarEfficiency * weatherFactor;
  }

  shouldEnterDeepSleep(): boolean {
    const batteryLevel = this.getBatteryLevel();
    const estimatedRuntime = this.estimateRemainingRuntime();
    
    // Enter deep sleep if battery is critically low or estimated runtime < 24 hours
    return batteryLevel < this.config.criticalPowerThreshold || estimatedRuntime < 24;
  }

  shouldReducePerformance(): boolean {
    const batteryLevel = this.getBatteryLevel();
    return batteryLevel < this.config.lowPowerThreshold;
  }

  updatePowerConsumption(consumptionWatts: number): void {
    this.powerConsumption = consumptionWatts;
  }

  getPowerStatus(): HexapodStatus['powerStatus'] {
    return {
      batteryLevel: this.getBatteryLevel(),
      solarCharging: this.solarCharging,
      powerConsumption: this.powerConsumption,
      estimatedRuntime: this.estimateRemainingRuntime()
    };
  }

  getPowerTrends(): {
    averageConsumption: number;
    batteryTrend: 'increasing' | 'decreasing' | 'stable';
    solarEfficiency: number;
  } {
    if (this.powerHistory.length < 2) {
      return {
        averageConsumption: this.powerConsumption,
        batteryTrend: 'stable',
        solarEfficiency: 0
      };
    }

    // Calculate average consumption over last hour
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentHistory = this.powerHistory.filter(entry => entry.timestamp > hourAgo);
    const averageConsumption = recentHistory.reduce((sum, entry) => sum + entry.consumption, 0) / recentHistory.length;

    // Determine battery trend
    const recent = this.powerHistory.slice(-10); // Last 10 readings
    const oldVoltage = recent[0]?.voltage || this.batteryVoltage;
    const newVoltage = recent[recent.length - 1]?.voltage || this.batteryVoltage;
    const voltageDiff = newVoltage - oldVoltage;
    
    let batteryTrend: 'increasing' | 'decreasing' | 'stable';
    if (voltageDiff > 0.05) batteryTrend = 'increasing';
    else if (voltageDiff < -0.05) batteryTrend = 'decreasing';
    else batteryTrend = 'stable';

    // Calculate solar efficiency (simplified)
    const solarEfficiency = this.solarCharging ? 
      Math.min(100, (this.estimateSolarInput() / 1350) * 100) : 0; // 1350mA = 5W peak

    return {
      averageConsumption,
      batteryTrend,
      solarEfficiency
    };
  }

  // Emergency power management
  activateEmergencyMode(): void {
    // Drastically reduce power consumption
    this.config.sleepDuration = 3600; // 1 hour sleep
    this.config.samplingInterval = 300; // 5 minute sampling
    this.config.transmissionInterval = 7200; // 2 hour transmission
  }

  deactivateEmergencyMode(): void {
    // Restore normal power management settings
    this.config.sleepDuration = 900; // 15 minutes
    this.config.samplingInterval = 60; // 1 minute sampling
    this.config.transmissionInterval = 1800; // 30 minute transmission
  }
}