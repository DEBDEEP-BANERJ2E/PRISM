import request from 'supertest';
import { DataIngestionService } from '../../services/DataIngestionService';
import { SensorReading } from '@prism/shared-models';

// Mock Kafka and MQTT for testing
jest.mock('kafkajs');
jest.mock('mqtt');

describe('Data Ingestion Workflow Integration Tests', () => {
  let dataIngestionService: DataIngestionService;

  beforeAll(async () => {
    dataIngestionService = new DataIngestionService();
    
    // Mock the initialize method to avoid actual connections
    jest.spyOn(dataIngestionService, 'initialize').mockResolvedValue();
    jest.spyOn(dataIngestionService.getKafkaProducer(), 'initialize').mockResolvedValue();
    jest.spyOn(dataIngestionService.getKafkaProducer(), 'isConnectedToKafka').mockReturnValue(true);
    jest.spyOn(dataIngestionService.getMQTTService(), 'initialize').mockResolvedValue();
    jest.spyOn(dataIngestionService.getMQTTService(), 'isConnectedToMQTT').mockReturnValue(true);
    
    await dataIngestionService.initialize();
  });

  afterAll(async () => {
    await dataIngestionService.shutdown();
  });

  describe('HTTP Ingestion Workflow', () => {
    test('should process single sensor reading via HTTP', async () => {
      const mockSendSensorReadings = jest.spyOn(dataIngestionService.getKafkaProducer(), 'sendSensorReadings')
        .mockResolvedValue();

      const sensorData = {
        sensor_id: 'TEST_SENSOR_001',
        timestamp: new Date().toISOString(),
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.5, unit: '°' },
          tilt_y: { value: -0.8, unit: '°' },
          temperature: { value: 25.3, unit: '°C' }
        },
        battery_level: 85,
        signal_strength: -65
      };

      const httpService = dataIngestionService.getHTTPService();
      const router = httpService.createRouter();
      
      // Create a test app with the router
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/ingest', router);

      const response = await request(testApp)
        .post('/ingest/sensor-reading')
        .send(sensorData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.sensorId).toBe('TEST_SENSOR_001');
      expect(response.body.qualityScore).toBeGreaterThan(0);
      expect(mockSendSensorReadings).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sensor_id: 'TEST_SENSOR_001',
            sensor_type: 'tilt'
          })
        ])
      );
    });

    test('should process batch sensor readings via HTTP', async () => {
      const mockSendSensorReadings = jest.spyOn(dataIngestionService.getKafkaProducer(), 'sendSensorReadings')
        .mockResolvedValue();

      const batchData = {
        readings: [
          {
            sensor_id: 'SENSOR_001',
            timestamp: new Date().toISOString(),
            sensor_type: 'tilt',
            measurements: {
              tilt_x: { value: 1.2, unit: '°' }
            }
          },
          {
            sensor_id: 'SENSOR_002',
            timestamp: new Date().toISOString(),
            sensor_type: 'temperature',
            measurements: {
              temperature: { value: 22.5, unit: '°C' }
            }
          }
        ]
      };

      const httpService = dataIngestionService.getHTTPService();
      const router = httpService.createRouter();
      
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/ingest', router);

      const response = await request(testApp)
        .post('/ingest/sensor-readings/batch')
        .send(batchData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.result.recordsProcessed).toBe(2);
      expect(response.body.result.recordsValid).toBe(2);
      expect(response.body.result.recordsInvalid).toBe(0);
      expect(mockSendSensorReadings).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ sensor_id: 'SENSOR_001' }),
          expect.objectContaining({ sensor_id: 'SENSOR_002' })
        ])
      );
    });

    test('should reject invalid sensor readings', async () => {
      const invalidData = {
        sensor_id: '', // Invalid: empty sensor ID
        timestamp: 'invalid-date',
        sensor_type: 'unknown',
        measurements: {}
      };

      const httpService = dataIngestionService.getHTTPService();
      const router = httpService.createRouter();
      
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/ingest', router);

      const response = await request(testApp)
        .post('/ingest/sensor-reading')
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should handle CSV file upload', async () => {
      const mockSendSensorReadings = jest.spyOn(dataIngestionService.getKafkaProducer(), 'sendSensorReadings')
        .mockResolvedValue();

      const csvContent = `sensor_id,timestamp,sensor_type,measurement_temperature,measurement_humidity
SENSOR_001,2024-01-01T12:00:00Z,environmental,25.5,65.2
SENSOR_002,2024-01-01T12:01:00Z,environmental,24.8,67.1`;

      const httpService = dataIngestionService.getHTTPService();
      const router = httpService.createRouter();
      
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/ingest', router);

      const response = await request(testApp)
        .post('/ingest/upload/csv')
        .attach('file', Buffer.from(csvContent), 'test-data.csv')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.result.recordsProcessed).toBe(2);
      expect(mockSendSensorReadings).toHaveBeenCalled();
    });
  });

  describe('LoRaWAN Ingestion Workflow', () => {
    test('should process LoRaWAN uplink message', async () => {
      const mockSendSensorReadings = jest.spyOn(dataIngestionService.getKafkaProducer(), 'sendSensorReadings')
        .mockResolvedValue();

      const uplinkMessage = {
        applicationID: 'prism-sensors',
        applicationName: 'PRISM Sensors',
        deviceName: 'hexapod-001',
        devEUI: '0123456789abcdef',
        rxInfo: [{
          gatewayID: 'gateway-001',
          rssi: -85,
          loRaSNR: 7.5,
          location: {
            latitude: -33.8688,
            longitude: 151.2093,
            altitude: 100
          }
        }],
        txInfo: {
          frequency: 915000000,
          dr: 3
        },
        adr: true,
        fCnt: 42,
        fPort: 1,
        data: Buffer.from([0x01, 0x90, 0x19, 0x64, 0x00, 0x32, 0xFF, 0xE8, 0x55]).toString('base64'), // Mock sensor data
        confirmedUplink: false
      };

      const lorawanService = dataIngestionService.getLoRaWANService();
      const router = lorawanService.createRouter();
      
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/lorawan', router);

      const response = await request(testApp)
        .post('/lorawan/webhook/uplink')
        .send(uplinkMessage)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.qualityScore).toBeDefined();
      expect(mockSendSensorReadings).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            sensor_id: 'hexapod-001',
            sensor_type: 'tilt'
          })
        ])
      );
    });

    test('should handle device join notification', async () => {
      const mockSendDeviceEvent = jest.spyOn(dataIngestionService.getKafkaProducer(), 'sendDeviceEvent')
        .mockResolvedValue();

      const joinNotification = {
        applicationID: 'prism-sensors',
        deviceName: 'hexapod-002',
        devEUI: 'fedcba9876543210',
        devAddr: '12345678'
      };

      const lorawanService = dataIngestionService.getLoRaWANService();
      const router = lorawanService.createRouter();
      
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/lorawan', router);

      const response = await request(testApp)
        .post('/lorawan/webhook/join')
        .send(joinNotification)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(mockSendDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'device_joined',
          deviceName: 'hexapod-002',
          devEUI: 'fedcba9876543210'
        })
      );
    });
  });

  describe('Data Validation Workflow', () => {
    test('should validate sensor reading with quality scoring', () => {
      const validator = dataIngestionService.getDataValidator();
      
      const validReading = {
        sensor_id: 'TEST_SENSOR',
        timestamp: new Date(),
        sensor_type: 'tilt' as const,
        measurements: {
          tilt_x: { value: 2.5, unit: '°' },
          temperature: { value: 23.0, unit: '°C' }
        },
        battery_level: 75,
        signal_strength: -70
      };

      const validation = validator.validateSensorReading(validReading);

      expect(validation.isValid).toBe(true);
      expect(validation.qualityScore).toBeGreaterThan(0.5);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect and reject duplicate readings', () => {
      const validator = dataIngestionService.getDataValidator();
      
      const reading = {
        sensor_id: 'DUPLICATE_TEST',
        timestamp: new Date(),
        sensor_type: 'tilt' as const,
        measurements: {
          tilt_x: { value: 1.0, unit: '°' }
        },
        sequence_number: 123
      };

      // First validation should pass
      const firstValidation = validator.validateSensorReading(reading);
      expect(firstValidation.isValid).toBe(true);

      // Second validation with same data should detect duplicate
      const secondValidation = validator.validateSensorReading(reading);
      expect(secondValidation.isValid).toBe(false);
      expect(secondValidation.errors.some(error => error.includes('Duplicate'))).toBe(true);
    });

    test('should validate batch readings with quality metrics', () => {
      const validator = dataIngestionService.getDataValidator();
      
      const readings = [
        {
          sensor_id: 'BATCH_SENSOR_001',
          timestamp: new Date(),
          sensor_type: 'tilt' as const,
          measurements: { tilt_x: { value: 1.5, unit: '°' } },
          battery_level: 80
        },
        {
          sensor_id: 'BATCH_SENSOR_002',
          timestamp: new Date(),
          sensor_type: 'temperature' as const,
          measurements: { temperature: { value: 25.0, unit: '°C' } },
          battery_level: 15 // Low battery
        },
        {
          sensor_id: '', // Invalid: empty sensor ID
          timestamp: new Date(),
          sensor_type: 'unknown' as const,
          measurements: {}
        }
      ];

      const validation = validator.validateBatch(readings);

      expect(validation.validReadings).toHaveLength(2);
      expect(validation.invalidReadings).toHaveLength(1);
      expect(validation.metrics.totalRecords).toBe(3);
      expect(validation.metrics.validRecords).toBe(2);
      expect(validation.metrics.invalidRecords).toBe(1);
      expect(validation.metrics.batteryLowCount).toBe(1);
    });
  });

  describe('Service Health and Statistics', () => {
    test('should provide health status', () => {
      const health = dataIngestionService.getHealthStatus();

      expect(health.overall).toBeDefined();
      expect(health.services.kafka).toBe(true);
      expect(health.services.mqtt).toBe(true);
      expect(health.services.validator).toBe(true);
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    test('should provide aggregated statistics', () => {
      const stats = dataIngestionService.getAggregatedStats();

      expect(stats.mqtt).toBeDefined();
      expect(stats.lorawan).toBeDefined();
      expect(stats.http).toBeDefined();
      expect(stats.summary).toBeDefined();
      expect(stats.summary.totalRecords).toBeGreaterThanOrEqual(0);
      expect(stats.summary.overallSuccessRate).toBeGreaterThanOrEqual(0);
    });

    test('should test connectivity to external services', async () => {
      const connectivity = await dataIngestionService.testConnectivity();

      expect(connectivity.kafka).toBeDefined();
      expect(connectivity.mqtt).toBeDefined();
      expect(connectivity.kafka.connected).toBe(true);
      expect(connectivity.mqtt.connected).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle Kafka connection failure gracefully', async () => {
      // Mock Kafka connection failure
      jest.spyOn(dataIngestionService.getKafkaProducer(), 'sendSensorReadings')
        .mockRejectedValue(new Error('Kafka connection failed'));

      const sensorData = {
        sensor_id: 'ERROR_TEST_SENSOR',
        timestamp: new Date().toISOString(),
        sensor_type: 'tilt',
        measurements: {
          tilt_x: { value: 1.0, unit: '°' }
        }
      };

      const httpService = dataIngestionService.getHTTPService();
      const router = httpService.createRouter();
      
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/ingest', router);

      const response = await request(testApp)
        .post('/ingest/sensor-reading')
        .send(sensorData)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    test('should handle malformed LoRaWAN payload', async () => {
      const malformedUplink = {
        applicationID: 'prism-sensors',
        deviceName: 'test-device',
        devEUI: '0123456789abcdef',
        rxInfo: [],
        txInfo: { frequency: 915000000, dr: 3 },
        adr: true,
        fCnt: 1,
        fPort: 1,
        data: 'invalid-base64-data!!!'
      };

      const lorawanService = dataIngestionService.getLoRaWANService();
      const router = lorawanService.createRouter();
      
      const express = require('express');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/lorawan', router);

      const response = await request(testApp)
        .post('/lorawan/webhook/uplink')
        .send(malformedUplink)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});