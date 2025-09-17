// Mock external dependencies
jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(void 0),
      disconnect: jest.fn().mockResolvedValue(void 0),
      subscribe: jest.fn().mockResolvedValue(void 0),
      run: jest.fn().mockResolvedValue(void 0)
    }),
    producer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(void 0),
      disconnect: jest.fn().mockResolvedValue(void 0),
      sendBatch: jest.fn().mockResolvedValue(void 0)
    })
  }))
}));

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(void 0),
    disconnect: jest.fn().mockResolvedValue(void 0),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK')
  })
}));

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test timeout
jest.setTimeout(10000);