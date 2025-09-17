import { LoRaWANConfig, SensorReading, HexapodStatus } from '../types';

export class LoRaWANManager {
  private config: LoRaWANConfig;
  private isConnected: boolean = false;
  private lastTransmission: number = 0;
  private failedTransmissions: number = 0;
  private signalStrength: number = -80; // RSSI in dBm
  private dataBuffer: any[] = [];
  private maxBufferSize: number = 1000;

  constructor(config: LoRaWANConfig) {
    this.config = config;
  }

  async initialize(): Promise<boolean> {
    try {
      // Initialize LoRaWAN module (simulated)
      console.log('Initializing LoRaWAN module...');
      
      // Configure device parameters
      await this.configureDevice();
      
      // Attempt to join the network
      const joinResult = await this.joinNetwork();
      
      if (joinResult) {
        this.isConnected = true;
        console.log('LoRaWAN network joined successfully');
        return true;
      } else {
        console.error('Failed to join LoRaWAN network');
        return false;
      }
    } catch (error) {
      console.error('LoRaWAN initialization error:', error);
      return false;
    }
  }

  private async configureDevice(): Promise<void> {
    // Configure LoRaWAN device parameters
    console.log(`Configuring device with DevEUI: ${this.config.devEUI}`);
    console.log(`AppEUI: ${this.config.appEUI}`);
    console.log(`Data Rate: ${this.config.dataRate}`);
    console.log(`TX Power: ${this.config.txPower} dBm`);
    console.log(`ADR: ${this.config.adaptiveDataRate ? 'Enabled' : 'Disabled'}`);
    
    // Simulate configuration delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async joinNetwork(): Promise<boolean> {
    // Simulate OTAA (Over-The-Air Activation) join procedure
    console.log('Attempting OTAA join...');
    
    // Simulate join process with random success/failure
    const joinSuccess = Math.random() > 0.1; // 90% success rate
    
    if (joinSuccess) {
      // Simulate join accept delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.updateSignalStrength();
      return true;
    }
    
    return false;
  }

  async transmitData(data: SensorReading | HexapodStatus | any[] | Buffer | any): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('LoRaWAN not connected, buffering data');
      this.bufferData(data);
      return false;
    }

    try {
      // Prepare payload
      const payload = this.preparePayload(data);
      
      // Check payload size (LoRaWAN has strict size limits)
      if (payload.length > this.getMaxPayloadSize()) {
        console.warn('Payload too large, splitting or compressing');
        return await this.transmitLargePayload(payload);
      }

      // Transmit data
      const success = await this.sendPayload(payload);
      
      if (success) {
        this.lastTransmission = Date.now();
        this.failedTransmissions = 0;
        this.updateSignalStrength();
        
        // Clear buffer if transmission successful
        if (this.dataBuffer.length > 0) {
          console.log(`Clearing ${this.dataBuffer.length} buffered items`);
          this.dataBuffer = [];
        }
        
        return true;
      } else {
        this.failedTransmissions++;
        this.bufferData(data);
        return false;
      }
    } catch (error) {
      console.error('LoRaWAN transmission error:', error);
      this.failedTransmissions++;
      this.bufferData(data);
      return false;
    }
  }

  private preparePayload(data: any): Buffer {
    // Convert data to compact binary format for LoRaWAN transmission
    if (Buffer.isBuffer(data)) {
      // Already a buffer (compressed data)
      return data;
    } else if (Array.isArray(data)) {
      // Multiple sensor readings
      return this.encodeBatchPayload(data);
    } else if (data.sensorId) {
      // Single sensor reading
      return this.encodeSensorReading(data as SensorReading);
    } else if (data.podId) {
      // Hexapod status
      return this.encodeHexapodStatus(data as HexapodStatus);
    } else {
      // Generic data
      return Buffer.from(JSON.stringify(data));
    }
  }

  private encodeSensorReading(reading: SensorReading): Buffer {
    // Encode sensor reading in compact binary format
    const buffer = Buffer.alloc(64); // Fixed size for predictable transmission
    let offset = 0;

    // Timestamp (4 bytes - Unix timestamp in seconds)
    buffer.writeUInt32BE(Math.floor(reading.timestamp / 1000), offset);
    offset += 4;

    // Location (12 bytes - 4 bytes each for lat, lon, elevation as floats)
    buffer.writeFloatBE(reading.location.latitude, offset);
    offset += 4;
    buffer.writeFloatBE(reading.location.longitude, offset);
    offset += 4;
    buffer.writeFloatBE(reading.location.elevation, offset);
    offset += 4;

    // Sensor measurements (36 bytes - 13 measurements * 2 bytes each as int16)
    const measurements = [
      reading.measurements.tilt_x * 1000,
      reading.measurements.tilt_y * 1000,
      reading.measurements.tilt_z * 1000,
      reading.measurements.accel_x * 100,
      reading.measurements.accel_y * 100,
      reading.measurements.accel_z * 100,
      reading.measurements.gyro_x * 1000,
      reading.measurements.gyro_y * 1000,
      reading.measurements.gyro_z * 1000,
      reading.measurements.pore_pressure,
      reading.measurements.temperature * 10,
      reading.measurements.humidity,
      reading.measurements.strain_gauge
    ];

    measurements.forEach(value => {
      buffer.writeInt16BE(Math.round(value), offset);
      offset += 2;
    });

    // Quality flags (1 byte - packed bits)
    let qualityByte = 0;
    if (reading.qualityFlags.tilt_valid) qualityByte |= 0x01;
    if (reading.qualityFlags.accel_valid) qualityByte |= 0x02;
    if (reading.qualityFlags.gyro_valid) qualityByte |= 0x04;
    if (reading.qualityFlags.pressure_valid) qualityByte |= 0x08;
    if (reading.qualityFlags.environmental_valid) qualityByte |= 0x10;
    if (reading.qualityFlags.strain_valid) qualityByte |= 0x20;
    buffer.writeUInt8(qualityByte, offset);
    offset += 1;

    // Battery level and signal strength (2 bytes)
    buffer.writeUInt8(Math.round(reading.batteryLevel), offset);
    offset += 1;
    buffer.writeInt8(Math.round(reading.signalStrength), offset);
    offset += 1;

    return buffer.slice(0, offset);
  }

  private encodeHexapodStatus(status: HexapodStatus): Buffer {
    // Encode hexapod status in compact binary format
    const buffer = Buffer.alloc(32);
    let offset = 0;

    // Timestamp (4 bytes)
    buffer.writeUInt32BE(Math.floor(status.lastCommunication / 1000), offset);
    offset += 4;

    // Location (12 bytes)
    buffer.writeFloatBE(status.location.latitude, offset);
    offset += 4;
    buffer.writeFloatBE(status.location.longitude, offset);
    offset += 4;
    buffer.writeFloatBE(status.location.elevation, offset);
    offset += 4;

    // Status flags (1 byte)
    let statusByte = 0;
    switch (status.operationalStatus) {
      case 'active': statusByte = 0x01; break;
      case 'sleep': statusByte = 0x02; break;
      case 'maintenance': statusByte = 0x03; break;
      case 'error': statusByte = 0x04; break;
    }
    buffer.writeUInt8(statusByte, offset);
    offset += 1;

    // Power status (4 bytes)
    buffer.writeUInt8(Math.round(status.powerStatus.batteryLevel), offset);
    offset += 1;
    buffer.writeUInt8(status.powerStatus.solarCharging ? 1 : 0, offset);
    offset += 1;
    buffer.writeUInt16BE(Math.round(status.powerStatus.powerConsumption * 100), offset);
    offset += 2;

    // Communication status (4 bytes)
    buffer.writeInt8(Math.round(status.communicationStatus.loraSignalStrength), offset);
    offset += 1;
    buffer.writeUInt16BE(status.communicationStatus.failedTransmissions, offset);
    offset += 2;
    buffer.writeUInt8(Math.min(255, status.communicationStatus.dataBufferSize), offset);
    offset += 1;

    return buffer.slice(0, offset);
  }

  private encodeBatchPayload(readings: SensorReading[]): Buffer {
    // Encode multiple readings with compression
    const buffers = readings.map(reading => this.encodeSensorReading(reading));
    return Buffer.concat(buffers);
  }

  private async sendPayload(payload: Buffer): Promise<boolean> {
    // Simulate LoRaWAN transmission
    console.log(`Transmitting ${payload.length} bytes via LoRaWAN`);
    
    // Simulate transmission delay based on data rate
    const transmissionTime = this.calculateTransmissionTime(payload.length);
    await new Promise(resolve => setTimeout(resolve, transmissionTime));
    
    // Simulate transmission success/failure based on signal strength
    const successProbability = this.calculateSuccessProbability();
    const success = Math.random() < successProbability;
    
    if (success) {
      console.log('LoRaWAN transmission successful');
    } else {
      console.warn('LoRaWAN transmission failed');
    }
    
    return success;
  }

  private async transmitLargePayload(payload: Buffer): Promise<boolean> {
    // Split large payload into smaller chunks
    const maxSize = this.getMaxPayloadSize();
    const chunks: Buffer[] = [];
    
    for (let i = 0; i < payload.length; i += maxSize) {
      chunks.push(payload.slice(i, i + maxSize));
    }
    
    console.log(`Splitting payload into ${chunks.length} chunks`);
    
    // Transmit chunks with delay between transmissions
    for (let i = 0; i < chunks.length; i++) {
      const success = await this.sendPayload(chunks[i]);
      if (!success) {
        console.error(`Failed to transmit chunk ${i + 1}/${chunks.length}`);
        return false;
      }
      
      // Delay between chunks to respect duty cycle
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return true;
  }

  private getMaxPayloadSize(): number {
    // LoRaWAN payload size limits based on data rate
    const payloadSizes = [51, 51, 51, 115, 242, 242, 242, 242]; // EU868 payload sizes
    return payloadSizes[this.config.dataRate] || 51;
  }

  private calculateTransmissionTime(payloadSize: number): number {
    // Calculate time-on-air based on LoRaWAN parameters
    const symbolTime = Math.pow(2, 12) / 125000; // Symbol time for SF12, BW125
    const preambleTime = (8 + 4.25) * symbolTime;
    const payloadSymbols = Math.ceil((8 * payloadSize - 4 * 12 + 28 + 16) / (4 * 12));
    const payloadTime = payloadSymbols * symbolTime;
    
    return Math.round((preambleTime + payloadTime) * 1000); // Return in milliseconds
  }

  private calculateSuccessProbability(): number {
    // Calculate transmission success probability based on signal strength
    const rssi = this.signalStrength;
    
    if (rssi > -80) return 0.95;
    if (rssi > -90) return 0.85;
    if (rssi > -100) return 0.70;
    if (rssi > -110) return 0.50;
    return 0.20;
  }

  private updateSignalStrength(): void {
    // Simulate signal strength variation
    const baseRssi = -80;
    const variation = (Math.random() - 0.5) * 20;
    this.signalStrength = baseRssi + variation;
  }

  private bufferData(data: any): void {
    if (this.dataBuffer.length >= this.maxBufferSize) {
      // Remove oldest data to make room
      this.dataBuffer.shift();
    }
    
    this.dataBuffer.push({
      data,
      timestamp: Date.now()
    });
  }

  async transmitBufferedData(): Promise<boolean> {
    if (this.dataBuffer.length === 0 || !this.isConnected) {
      return false;
    }

    console.log(`Transmitting ${this.dataBuffer.length} buffered items`);
    
    // Transmit buffered data in batches
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < this.dataBuffer.length; i += batchSize) {
      batches.push(this.dataBuffer.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const batchData = batch.map(item => item.data);
      const success = await this.transmitData(batchData);
      
      if (!success) {
        console.error('Failed to transmit buffered data batch');
        return false;
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.dataBuffer = [];
    return true;
  }

  getConnectionStatus(): {
    connected: boolean;
    signalStrength: number;
    lastTransmission: number;
    failedTransmissions: number;
    bufferSize: number;
  } {
    return {
      connected: this.isConnected,
      signalStrength: this.signalStrength,
      lastTransmission: this.lastTransmission,
      failedTransmissions: this.failedTransmissions,
      bufferSize: this.dataBuffer.length
    };
  }

  async reconnect(): Promise<boolean> {
    console.log('Attempting LoRaWAN reconnection...');
    this.isConnected = false;
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return await this.initialize();
  }

  setDataRate(dataRate: number): void {
    if (dataRate >= 0 && dataRate <= 7) {
      this.config.dataRate = dataRate;
      console.log(`Data rate set to DR${dataRate}`);
    }
  }

  setTxPower(txPower: number): void {
    if (txPower >= 2 && txPower <= 14) {
      this.config.txPower = txPower;
      console.log(`TX power set to ${txPower} dBm`);
    }
  }

  enableAdaptiveDataRate(enable: boolean): void {
    this.config.adaptiveDataRate = enable;
    console.log(`ADR ${enable ? 'enabled' : 'disabled'}`);
  }

  // Duty cycle management for EU868
  private lastTransmissionTime: number = 0;
  private dutyCycleLimit: number = 0.01; // 1% duty cycle

  canTransmit(): boolean {
    const now = Date.now();
    const timeSinceLastTx = now - this.lastTransmissionTime;
    const requiredWaitTime = this.calculateDutyCycleWait();
    
    return timeSinceLastTx >= requiredWaitTime;
  }

  private calculateDutyCycleWait(): number {
    // Calculate required wait time based on duty cycle
    const lastTxDuration = 1000; // Assume 1 second transmission time
    return lastTxDuration / this.dutyCycleLimit;
  }
}