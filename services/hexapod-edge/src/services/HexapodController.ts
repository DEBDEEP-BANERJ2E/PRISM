import { SensorManager } from './SensorManager';
import { EdgeAIEngine } from './EdgeAIEngine';
import { PowerManager } from './PowerManager';
import { LoRaWANManager } from './LoRaWANManager';
import { DataCompressor } from './DataCompressor';
import { 
  SensorReading, 
  HexapodStatus, 
  EdgeAIResult, 
  PowerManagementConfig, 
  LoRaWANConfig, 
  CompressionConfig 
} from '../types';

export class HexapodController {
  private sensorManager: SensorManager;
  private edgeAI: EdgeAIEngine;
  private powerManager: PowerManager;
  private loraManager: LoRaWANManager;
  private dataCompressor: DataCompressor;
  
  private podId: string;
  private isRunning: boolean = false;
  private operationalStatus: 'active' | 'sleep' | 'maintenance' | 'error' = 'active';
  private lastHealthCheck: number = 0;
  private emergencyMode: boolean = false;

  constructor(
    podId: string,
    location: { latitude: number; longitude: number; elevation: number },
    powerConfig: PowerManagementConfig,
    loraConfig: LoRaWANConfig,
    compressionConfig: CompressionConfig
  ) {
    this.podId = podId;
    this.sensorManager = new SensorManager(podId, location);
    this.edgeAI = new EdgeAIEngine();
    this.powerManager = new PowerManager(powerConfig);
    this.loraManager = new LoRaWANManager(loraConfig);
    this.dataCompressor = new DataCompressor(compressionConfig);
  }

  async initialize(): Promise<boolean> {
    try {
      console.log(`Initializing Hexapod Controller ${this.podId}...`);
      
      // Initialize LoRaWAN connection
      const loraInitialized = await this.loraManager.initialize();
      if (!loraInitialized) {
        console.warn('LoRaWAN initialization failed, continuing in offline mode');
      }

      // Perform initial sensor self-test
      const selfTestResult = this.sensorManager.performSelfTest();
      if (!selfTestResult.passed) {
        console.warn('Sensor self-test issues:', selfTestResult.errors);
        this.operationalStatus = 'maintenance';
      }

      // Initialize power management
      this.powerManager.updateBatteryStatus(3.7, true); // Initial values
      
      console.log(`Hexapod Controller ${this.podId} initialized successfully`);
      return true;
    } catch (error) {
      console.error('Hexapod Controller initialization failed:', error);
      this.operationalStatus = 'error';
      return false;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Hexapod Controller is already running');
      return;
    }

    this.isRunning = true;
    this.operationalStatus = 'active';
    
    console.log(`Starting autonomous monitoring loop for ${this.podId}`);
    
    // Start the main monitoring loop
    this.autonomousMonitoringLoop().catch(error => {
      console.error('Autonomous monitoring loop error:', error);
      this.operationalStatus = 'error';
    });
  }

  async stop(): Promise<void> {
    console.log(`Stopping Hexapod Controller ${this.podId}`);
    this.isRunning = false;
    this.operationalStatus = 'sleep';
  }

  private async autonomousMonitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we should enter deep sleep mode
        if (this.powerManager.shouldEnterDeepSleep()) {
          await this.enterDeepSleep();
          continue;
        }

        // Collect sensor data
        const sensorReading = await this.sensorManager.readAllSensors();
        
        // Update power status
        this.powerManager.updateBatteryStatus(
          sensorReading.measurements.battery_voltage,
          this.isSolarCharging()
        );

        // Run edge AI analysis
        const aiResult = await this.edgeAI.detectAnomaly(sensorReading);
        
        // Make local decisions based on AI results
        await this.processLocalDecisions(aiResult, sensorReading);
        
        // Add data to compression buffer
        this.dataCompressor.addReading(sensorReading);
        
        // Determine transmission strategy
        await this.handleDataTransmission(aiResult, sensorReading);
        
        // Perform periodic health checks
        await this.performHealthCheck();
        
        // Calculate optimal sleep duration
        const sleepDuration = this.powerManager.calculateOptimalSleepDuration(aiResult.riskLevel);
        
        console.log(`${this.podId}: Risk=${aiResult.riskLevel}, Battery=${this.powerManager.getBatteryLevel().toFixed(1)}%, Sleep=${sleepDuration}s`);
        
        // Sleep until next cycle
        await this.sleep(sleepDuration * 1000);
        
      } catch (error) {
        console.error('Error in monitoring loop:', error);
        
        // Implement error recovery
        await this.handleError(error);
        
        // Sleep before retrying
        await this.sleep(60000); // 1 minute error recovery sleep
      }
    }
  }

  private async processLocalDecisions(aiResult: EdgeAIResult, sensorReading: SensorReading): Promise<void> {
    // Immediate alert for critical conditions
    if (this.edgeAI.shouldTriggerImmediateAlert(aiResult)) {
      console.warn(`CRITICAL ALERT: ${aiResult.explanation}`);
      await this.triggerEmergencyTransmission(sensorReading, aiResult);
    }

    // Adjust power management based on risk level
    if (this.edgeAI.shouldEnterLowPowerMode(aiResult)) {
      // Low risk - can conserve power
      this.powerManager.updatePowerConsumption(0.5); // Low power consumption
    } else if (this.edgeAI.shouldIncreaseTransmissionFrequency(aiResult)) {
      // Higher risk - increase monitoring intensity
      this.powerManager.updatePowerConsumption(2.0); // Higher power consumption
    }

    // Emergency mode activation
    if (aiResult.riskLevel === 'critical' && aiResult.confidence > 0.8) {
      if (!this.emergencyMode) {
        console.warn('Activating emergency mode');
        this.emergencyMode = true;
        this.powerManager.activateEmergencyMode();
      }
    } else if (this.emergencyMode && aiResult.riskLevel === 'low') {
      console.log('Deactivating emergency mode');
      this.emergencyMode = false;
      this.powerManager.deactivateEmergencyMode();
    }
  }

  private async handleDataTransmission(aiResult: EdgeAIResult, sensorReading: SensorReading): Promise<void> {
    const connectionStatus = this.loraManager.getConnectionStatus();
    
    // Determine transmission interval based on risk and power
    const transmissionInterval = this.powerManager.calculateOptimalTransmissionInterval(
      aiResult.riskLevel,
      connectionStatus.bufferSize
    );

    const timeSinceLastTransmission = Date.now() - connectionStatus.lastTransmission;
    
    // Check if it's time to transmit
    if (timeSinceLastTransmission >= transmissionInterval * 1000 || 
        aiResult.riskLevel === 'critical' ||
        connectionStatus.bufferSize > 50) {
      
      // Try to transmit compressed data
      const compressedData = this.dataCompressor.compressBatch();
      if (compressedData) {
        const success = await this.loraManager.transmitData(compressedData);
        
        if (!success) {
          console.warn('Data transmission failed, will retry later');
          
          // Try to reconnect if multiple failures
          if (connectionStatus.failedTransmissions > 5) {
            await this.loraManager.reconnect();
          }
        }
      }

      // Also transmit current status
      const status = this.getHexapodStatus();
      await this.loraManager.transmitData(status);
    }

    // Transmit buffered data if connection is restored
    if (connectionStatus.connected && connectionStatus.bufferSize > 0) {
      await this.loraManager.transmitBufferedData();
    }
  }

  private async triggerEmergencyTransmission(sensorReading: SensorReading, aiResult: EdgeAIResult): Promise<void> {
    // Immediate transmission for critical conditions
    const emergencyData = {
      type: 'emergency_alert',
      podId: this.podId,
      timestamp: Date.now(),
      sensorReading,
      aiResult,
      location: sensorReading.location
    };

    // Try multiple transmission attempts
    for (let attempt = 0; attempt < 3; attempt++) {
      const success = await this.loraManager.transmitData(emergencyData);
      if (success) {
        console.log('Emergency transmission successful');
        break;
      }
      
      console.warn(`Emergency transmission attempt ${attempt + 1} failed`);
      await this.sleep(5000); // Wait 5 seconds between attempts
    }
  }

  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    
    // Perform health check every hour
    if (now - this.lastHealthCheck < 3600000) {
      return;
    }

    this.lastHealthCheck = now;
    
    // Check sensor health
    const selfTestResult = this.sensorManager.performSelfTest();
    if (!selfTestResult.passed) {
      console.warn('Health check failed:', selfTestResult.errors);
      this.operationalStatus = 'maintenance';
    }

    // Check power status
    const powerStatus = this.powerManager.getPowerStatus();
    if (powerStatus.batteryLevel < 10) {
      console.warn('Critical battery level detected');
      this.operationalStatus = 'maintenance';
    }

    // Check communication status
    const commStatus = this.loraManager.getConnectionStatus();
    if (commStatus.failedTransmissions > 10) {
      console.warn('Multiple communication failures detected');
      await this.loraManager.reconnect();
    }

    // Log health status
    console.log(`Health Check - Status: ${this.operationalStatus}, Battery: ${powerStatus.batteryLevel}%, Signal: ${commStatus.signalStrength}dBm`);
  }

  private async enterDeepSleep(): Promise<void> {
    console.log(`${this.podId}: Entering deep sleep mode due to critical battery`);
    this.operationalStatus = 'sleep';
    
    // Transmit final status before sleep
    const status = this.getHexapodStatus();
    await this.loraManager.transmitData(status);
    
    // Deep sleep for extended period (e.g., 4 hours)
    await this.sleep(4 * 60 * 60 * 1000);
    
    // Wake up and check battery status
    const batteryLevel = this.powerManager.getBatteryLevel();
    if (batteryLevel > 20) {
      this.operationalStatus = 'active';
      console.log(`${this.podId}: Waking up from deep sleep, battery recovered to ${batteryLevel}%`);
    }
  }

  private async handleError(error: any): Promise<void> {
    console.error(`Error in ${this.podId}:`, error);
    this.operationalStatus = 'error';
    
    // Try to transmit error status
    try {
      const errorStatus = {
        type: 'error_report',
        podId: this.podId,
        timestamp: Date.now(),
        error: error.message || 'Unknown error',
        status: this.getHexapodStatus()
      };
      
      await this.loraManager.transmitData(errorStatus);
    } catch (transmissionError) {
      console.error('Failed to transmit error status:', transmissionError);
    }
    
    // Attempt recovery
    setTimeout(() => {
      if (this.operationalStatus === 'error') {
        console.log(`${this.podId}: Attempting error recovery`);
        this.operationalStatus = 'active';
      }
    }, 300000); // 5 minutes recovery timeout
  }

  private isSolarCharging(): boolean {
    // Simulate solar charging detection based on time of day and battery trend
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour <= 18;
    const powerTrends = this.powerManager.getPowerTrends();
    
    return isDaytime && powerTrends.batteryTrend === 'increasing';
  }

  private async sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  getHexapodStatus(): HexapodStatus {
    const connectionStatus = this.loraManager.getConnectionStatus() || {
      connected: false,
      signalStrength: -80,
      lastTransmission: 0,
      failedTransmissions: 0,
      bufferSize: 0
    };
    const powerStatus = this.powerManager.getPowerStatus() || {
      batteryLevel: 50,
      solarCharging: false,
      powerConsumption: 1.0,
      estimatedRuntime: 24
    };
    const lastReading = this.sensorManager.getLastReading();

    return {
      podId: this.podId,
      location: lastReading?.location || { latitude: 0, longitude: 0, elevation: 0 },
      operationalStatus: this.operationalStatus,
      sensorHealth: {
        imu: 'healthy', // Simplified - in real implementation, check actual sensor status
        tiltmeter: 'healthy',
        piezometer: 'healthy',
        environmental: 'healthy',
        strain_gauge: 'healthy'
      },
      lastCommunication: Date.now(),
      powerStatus,
      communicationStatus: {
        loraSignalStrength: connectionStatus.signalStrength,
        lastSuccessfulTransmission: connectionStatus.lastTransmission,
        failedTransmissions: connectionStatus.failedTransmissions,
        dataBufferSize: connectionStatus.bufferSize
      }
    };
  }

  // Remote control methods
  async updateConfiguration(config: any): Promise<boolean> {
    try {
      if (config.powerManagement) {
        // Update power management settings
        console.log('Updating power management configuration');
      }
      
      if (config.aiModel) {
        // Update AI model weights
        this.edgeAI.updateModelWeights(config.aiModel.weights);
        console.log('AI model updated');
      }
      
      if (config.compression) {
        // Update compression settings
        this.dataCompressor.setCompressionLevel(config.compression.level);
        this.dataCompressor.setBatchSize(config.compression.batchSize);
        console.log('Compression settings updated');
      }
      
      return true;
    } catch (error) {
      console.error('Configuration update failed:', error);
      return false;
    }
  }

  async performRemoteDiagnostics(): Promise<any> {
    const diagnostics = {
      podId: this.podId,
      timestamp: Date.now(),
      status: this.getHexapodStatus(),
      sensorSelfTest: this.sensorManager.performSelfTest(),
      powerTrends: this.powerManager.getPowerTrends(),
      aiModelInfo: this.edgeAI.getModelInfo(),
      compressionStats: this.dataCompressor.getCompressionStats(),
      connectionStatus: this.loraManager.getConnectionStatus()
    };

    // Transmit diagnostics
    await this.loraManager.transmitData(diagnostics);
    
    return diagnostics;
  }

  async calibrateSensors(calibrationData: any): Promise<boolean> {
    try {
      Object.keys(calibrationData).forEach(parameter => {
        this.sensorManager.updateCalibration(parameter, calibrationData[parameter]);
      });
      
      console.log('Sensor calibration updated');
      return true;
    } catch (error) {
      console.error('Sensor calibration failed:', error);
      return false;
    }
  }

  // Maintenance mode
  async enterMaintenanceMode(): Promise<void> {
    console.log(`${this.podId}: Entering maintenance mode`);
    this.operationalStatus = 'maintenance';
    this.isRunning = false;
  }

  async exitMaintenanceMode(): Promise<void> {
    console.log(`${this.podId}: Exiting maintenance mode`);
    this.operationalStatus = 'active';
    await this.start();
  }
}