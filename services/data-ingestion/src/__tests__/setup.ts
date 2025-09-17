// Jest setup file for data ingestion service tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'prism_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.MQTT_BROKER_URL = 'mqtt://localhost:1883';
process.env.KAFKA_BROKERS = 'localhost:9092';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        abort: jest.fn().mockResolvedValue(undefined)
      })
    })
  }))
}));

jest.mock('mqtt', () => ({
  connect: jest.fn().mockReturnValue({
    on: jest.fn(),
    subscribe: jest.fn(),
    publish: jest.fn(),
    end: jest.fn()
  })
}));

// Global test utilities
(global as any).createMockSensorReading = (overrides = {}) => ({
  sensor_id: 'TEST_SENSOR_001',
  timestamp: new Date(),
  sensor_type: 'tilt',
  measurements: {
    tilt_x: { value: 1.5, unit: '°' },
    tilt_y: { value: -0.8, unit: '°' }
  },
  battery_level: 85,
  signal_strength: -65,
  ...overrides
});

(global as any).createMockLoRaWANUplink = (overrides = {}) => ({
  applicationID: 'prism-sensors',
  applicationName: 'PRISM Sensors',
  deviceName: 'test-device',
  devEUI: '0123456789abcdef',
  rxInfo: [{
    gatewayID: 'gateway-001',
    rssi: -85,
    loRaSNR: 7.5
  }],
  txInfo: {
    frequency: 915000000,
    dr: 3
  },
  adr: true,
  fCnt: 42,
  fPort: 1,
  data: Buffer.from([0x01, 0x90, 0x19, 0x64]).toString('base64'),
  ...overrides
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});