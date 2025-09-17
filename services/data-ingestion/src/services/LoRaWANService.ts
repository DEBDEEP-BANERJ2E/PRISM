import express from 'express';
import crypto from 'crypto';
import { SensorReading, SensorReadingInput } from '@prism/shared-models';
import { config } from '../config';
import { DataValidator } from './DataValidator';
import { KafkaProducer } from './KafkaProducer';
import { LoRaWANUplink, IngestionStats } from '../types';
import logger from '../utils/logger';

export class LoRaWANService {
  private dataValidator: DataValidator;
  private kafkaProducer: KafkaProducer;
  private stats: IngestionStats[] = [];

  constructor(dataValidator: DataValidator, kafkaProducer: KafkaProducer) {
    this.dataValidator = dataValidator;
    this.kafkaProducer = kafkaProducer;
  }

  /**
   * Create Express router for LoRaWAN webhook endpoints
   */
  public createRouter(): express.Router {
    const router = express.Router();

    // Middleware to verify webhook signature
    router.use('/webhook', this.verifyWebhookSignature.bind(this));

    // Handle uplink messages (sensor data)
    router.post('/webhook/uplink', this.handleUplinkMessage.bind(this));

    // Handle join notifications
    router.post('/webhook/join', this.handleJoinNotification.bind(this));

    // Handle status updates
    router.post('/webhook/status', this.handleStatusUpdate.bind(this));

    // Handle error notifications
    router.post('/webhook/error', this.handleErrorNotification.bind(this));

    return router;
  }

  /**
   * Verify webhook signature for security
   */
  private verifyWebhookSignature(req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (!config.lorawan.webhookSecret) {
      // If no secret is configured, skip verification (development mode)
      return next();
    }

    const signature = req.headers['x-lorawan-signature'] as string;
    if (!signature) {
      logger.warn('LoRaWAN webhook request missing signature');
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', config.lorawan.webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== `sha256=${expectedSignature}`) {
      logger.warn('LoRaWAN webhook signature verification failed');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    next();
  }

  /**
   * Handle uplink messages containing sensor data
   */
  private async handleUplinkMessage(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    let recordsReceived = 0;
    let recordsProcessed = 0;
    let recordsRejected = 0;

    try {
      const uplink: LoRaWANUplink = req.body;
      recordsReceived = 1;

      logger.debug('Received LoRaWAN uplink message', {
        deviceName: uplink.deviceName,
        devEUI: uplink.devEUI,
        fCnt: uplink.fCnt,
        fPort: uplink.fPort,
        dataLength: uplink.data.length
      });

      // Decode the payload
      const sensorData = this.decodeLoRaWANPayload(uplink);
      if (!sensorData) {
        logger.warn('Failed to decode LoRaWAN payload', { devEUI: uplink.devEUI });
        recordsRejected = 1;
        res.status(400).json({ error: 'Failed to decode payload' });
        return;
      }

      // Enrich with LoRaWAN metadata
      const enrichedData: SensorReadingInput = {
        ...sensorData,
        sensor_id: sensorData.sensor_id || uplink.deviceName || uplink.devEUI,
        timestamp: sensorData.timestamp || new Date(),
        processing_timestamp: new Date(),
        signal_strength: this.getBestRSSI(uplink.rxInfo),
        raw_data: uplink.data,
        sequence_number: uplink.fCnt
      };

      // Add location from gateway if available and not in sensor data
      if (!enrichedData.location && uplink.rxInfo.length > 0) {
        const gatewayWithLocation = uplink.rxInfo.find(rx => rx.location);
        if (gatewayWithLocation?.location) {
          enrichedData.location = {
            latitude: gatewayWithLocation.location.latitude,
            longitude: gatewayWithLocation.location.longitude,
            elevation: gatewayWithLocation.location.altitude
          };
        }
      }

      // Validate the sensor reading
      const validation = this.dataValidator.validateSensorReading(enrichedData);
      
      if (validation.isValid) {
        const sensorReading = new SensorReading(enrichedData);
        await this.kafkaProducer.sendSensorReadings([sensorReading]);
        recordsProcessed = 1;

        logger.info('Processed LoRaWAN sensor data', {
          deviceName: uplink.deviceName,
          devEUI: uplink.devEUI,
          qualityScore: validation.qualityScore.toFixed(2),
          rssi: enrichedData.signal_strength
        });

        res.status(200).json({ 
          status: 'success', 
          message: 'Data processed successfully',
          qualityScore: validation.qualityScore 
        });
      } else {
        recordsRejected = 1;
        logger.warn('Invalid LoRaWAN sensor data', {
          deviceName: uplink.deviceName,
          devEUI: uplink.devEUI,
          errors: validation.errors,
          warnings: validation.warnings
        });

        res.status(400).json({ 
          status: 'error', 
          message: 'Invalid sensor data',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

    } catch (error) {
      recordsRejected = recordsReceived;
      logger.error('Error processing LoRaWAN uplink message', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body 
      });
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      const processingTime = Date.now() - startTime;
      this.recordStats('lorawan', recordsReceived, recordsProcessed, recordsRejected, processingTime);
    }
  }

  /**
   * Handle device join notifications
   */
  private async handleJoinNotification(req: express.Request, res: express.Response): Promise<void> {
    try {
      const joinData = req.body;
      
      logger.info('LoRaWAN device joined network', {
        deviceName: joinData.deviceName,
        devEUI: joinData.devEUI,
        devAddr: joinData.devAddr
      });

      // Send join notification to Kafka for device management
      await this.kafkaProducer.sendDeviceEvent({
        type: 'device_joined',
        deviceName: joinData.deviceName,
        devEUI: joinData.devEUI,
        devAddr: joinData.devAddr,
        timestamp: new Date()
      });

      res.status(200).json({ status: 'success' });
    } catch (error) {
      logger.error('Error processing LoRaWAN join notification', { error, body: req.body });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle device status updates
   */
  private async handleStatusUpdate(req: express.Request, res: express.Response): Promise<void> {
    try {
      const statusData = req.body;
      
      logger.info('LoRaWAN device status update', {
        deviceName: statusData.deviceName,
        devEUI: statusData.devEUI,
        status: statusData.status
      });

      // Send status update to Kafka
      await this.kafkaProducer.sendDeviceEvent({
        type: 'device_status_update',
        deviceName: statusData.deviceName,
        devEUI: statusData.devEUI,
        status: statusData.status,
        timestamp: new Date()
      });

      res.status(200).json({ status: 'success' });
    } catch (error) {
      logger.error('Error processing LoRaWAN status update', { error, body: req.body });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle error notifications
   */
  private async handleErrorNotification(req: express.Request, res: express.Response): Promise<void> {
    try {
      const errorData = req.body;
      
      logger.error('LoRaWAN device error notification', {
        deviceName: errorData.deviceName,
        devEUI: errorData.devEUI,
        error: errorData.error
      });

      // Send error notification to Kafka
      await this.kafkaProducer.sendDeviceEvent({
        type: 'device_error',
        deviceName: errorData.deviceName,
        devEUI: errorData.devEUI,
        error: errorData.error,
        timestamp: new Date()
      });

      res.status(200).json({ status: 'success' });
    } catch (error) {
      logger.error('Error processing LoRaWAN error notification', { error, body: req.body });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Decode LoRaWAN payload to sensor reading data
   */
  private decodeLoRaWANPayload(uplink: LoRaWANUplink): SensorReadingInput | null {
    try {
      // If the payload is already decoded (object field present), use it
      if (uplink.object) {
        return this.mapObjectToSensorReading(uplink.object, uplink);
      }

      // Decode base64 payload
      const buffer = Buffer.from(uplink.data, 'base64');
      
      // Determine decoding strategy based on fPort
      switch (uplink.fPort) {
        case 1: // Standard sensor data
          return this.decodeStandardSensorPayload(buffer, uplink);
        case 2: // Hexapod status
          return this.decodeHexapodStatusPayload(buffer, uplink);
        case 3: // Environmental data
          return this.decodeEnvironmentalPayload(buffer, uplink);
        default:
          logger.warn('Unknown LoRaWAN fPort', { fPort: uplink.fPort, devEUI: uplink.devEUI });
          return null;
      }
    } catch (error) {
      logger.error('Failed to decode LoRaWAN payload', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        devEUI: uplink.devEUI,
        data: uplink.data 
      });
      return null;
    }
  }

  /**
   * Map decoded object to sensor reading format
   */
  private mapObjectToSensorReading(obj: any, uplink: LoRaWANUplink): SensorReadingInput {
    const measurements: Record<string, any> = {};
    
    // Map common sensor measurements
    if (obj.temperature !== undefined) {
      measurements.temperature = { value: obj.temperature, unit: '°C' };
    }
    if (obj.humidity !== undefined) {
      measurements.humidity = { value: obj.humidity, unit: '%' };
    }
    if (obj.pressure !== undefined) {
      measurements.pressure = { value: obj.pressure, unit: 'hPa' };
    }
    if (obj.tilt_x !== undefined) {
      measurements.tilt_x = { value: obj.tilt_x, unit: '°' };
    }
    if (obj.tilt_y !== undefined) {
      measurements.tilt_y = { value: obj.tilt_y, unit: '°' };
    }
    if (obj.battery !== undefined) {
      measurements.battery = { value: obj.battery, unit: 'V' };
    }

    return {
      sensor_id: uplink.deviceName || uplink.devEUI,
      timestamp: new Date(),
      sensor_type: obj.sensor_type || 'unknown',
      measurements,
      battery_level: obj.battery_percentage,
      quality_flags: {
        is_valid: true,
        is_calibrated: obj.calibrated !== false,
        is_within_range: true
      }
    };
  }

  /**
   * Decode standard sensor payload (fPort 1)
   */
  private decodeStandardSensorPayload(buffer: Buffer, uplink: LoRaWANUplink): SensorReadingInput {
    // Example binary format: [temp(2), humidity(2), tilt_x(2), tilt_y(2), battery(1)]
    if (buffer.length < 9) {
      throw new Error('Invalid payload length for standard sensor data');
    }

    const temperature = buffer.readInt16BE(0) / 100; // 0.01°C resolution
    const humidity = buffer.readUInt16BE(2) / 100;   // 0.01% resolution
    const tiltX = buffer.readInt16BE(4) / 100;       // 0.01° resolution
    const tiltY = buffer.readInt16BE(6) / 100;       // 0.01° resolution
    const batteryLevel = buffer.readUInt8(8);        // Percentage

    return {
      sensor_id: uplink.deviceName || uplink.devEUI,
      timestamp: new Date(),
      sensor_type: 'tilt',
      measurements: {
        temperature: { value: temperature, unit: '°C' },
        humidity: { value: humidity, unit: '%' },
        tilt_x: { value: tiltX, unit: '°' },
        tilt_y: { value: tiltY, unit: '°' }
      },
      battery_level: batteryLevel,
      quality_flags: {
        is_valid: true,
        is_calibrated: true,
        is_within_range: true,
        battery_low: batteryLevel < 20
      }
    };
  }

  /**
   * Decode hexapod status payload (fPort 2)
   */
  private decodeHexapodStatusPayload(buffer: Buffer, uplink: LoRaWANUplink): SensorReadingInput {
    // Example format: [status(1), battery(1), signal(1), error_code(1)]
    if (buffer.length < 4) {
      throw new Error('Invalid payload length for hexapod status');
    }

    const status = buffer.readUInt8(0);
    const batteryLevel = buffer.readUInt8(1);
    const signalQuality = buffer.readUInt8(2);
    const errorCode = buffer.readUInt8(3);

    return {
      sensor_id: uplink.deviceName || uplink.devEUI,
      timestamp: new Date(),
      sensor_type: 'hexapod_status',
      measurements: {
        status: { value: status, unit: 'enum' },
        signal_quality: { value: signalQuality, unit: '%' },
        error_code: { value: errorCode, unit: 'code' }
      },
      battery_level: batteryLevel,
      quality_flags: {
        is_valid: errorCode === 0,
        is_calibrated: true,
        is_within_range: true,
        battery_low: batteryLevel < 20,
        communication_error: errorCode !== 0
      }
    };
  }

  /**
   * Decode environmental payload (fPort 3)
   */
  private decodeEnvironmentalPayload(buffer: Buffer, uplink: LoRaWANUplink): SensorReadingInput {
    // Example format: [temp(2), humidity(2), pressure(2), rainfall(2)]
    if (buffer.length < 8) {
      throw new Error('Invalid payload length for environmental data');
    }

    const temperature = buffer.readInt16BE(0) / 100;
    const humidity = buffer.readUInt16BE(2) / 100;
    const pressure = buffer.readUInt16BE(4) / 10;
    const rainfall = buffer.readUInt16BE(6) / 100;

    return {
      sensor_id: uplink.deviceName || uplink.devEUI,
      timestamp: new Date(),
      sensor_type: 'environmental',
      measurements: {
        temperature: { value: temperature, unit: '°C' },
        humidity: { value: humidity, unit: '%' },
        pressure: { value: pressure, unit: 'hPa' },
        rainfall: { value: rainfall, unit: 'mm' }
      },
      quality_flags: {
        is_valid: true,
        is_calibrated: true,
        is_within_range: true
      }
    };
  }

  /**
   * Get the best RSSI value from received signal info
   */
  private getBestRSSI(rxInfo: LoRaWANUplink['rxInfo']): number | undefined {
    if (!rxInfo || rxInfo.length === 0) {
      return undefined;
    }

    // Return the highest (least negative) RSSI value
    return Math.max(...rxInfo.map(rx => rx.rssi));
  }

  /**
   * Record ingestion statistics
   */
  private recordStats(
    source: 'mqtt' | 'lorawan' | 'http' | 'batch',
    recordsReceived: number,
    recordsProcessed: number,
    recordsRejected: number,
    processingTimeMs: number
  ): void {
    const stats: IngestionStats = {
      timestamp: new Date(),
      source,
      recordsReceived,
      recordsProcessed,
      recordsRejected,
      averageProcessingTimeMs: processingTimeMs,
      errorRate: recordsReceived > 0 ? recordsRejected / recordsReceived : 0,
      qualityMetrics: {
        totalRecords: recordsReceived,
        validRecords: recordsProcessed,
        invalidRecords: recordsRejected,
        averageQualityScore: 0,
        batteryLowCount: 0,
        communicationErrorCount: 0,
        staleDataCount: 0,
        duplicateCount: 0
      }
    };

    this.stats.push(stats);

    // Keep only last 1000 stats entries
    if (this.stats.length > 1000) {
      this.stats = this.stats.slice(-1000);
    }
  }

  /**
   * Get ingestion statistics
   */
  public getStats(): IngestionStats[] {
    return [...this.stats];
  }
}