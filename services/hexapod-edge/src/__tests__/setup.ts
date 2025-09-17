// Jest setup file for hexapod-edge tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock timers for testing
jest.useFakeTimers();

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fake timers
  jest.clearAllTimers();
});

afterEach(() => {
  // Clean up after each test
  jest.runOnlyPendingTimers();
});

// Global test utilities
(global as any).sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.POD_ID = 'test-hexapod-001';
process.env.LATITUDE = '-23.5505';
process.env.LONGITUDE = '-46.6333';
process.env.ELEVATION = '760.0';
process.env.LORA_DEV_EUI = '0000000000000000';
process.env.LORA_APP_EUI = '0000000000000000';
process.env.LORA_APP_KEY = '00000000000000000000000000000000';