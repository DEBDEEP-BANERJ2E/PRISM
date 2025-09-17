// Jest setup file for AI Pipeline service tests

// Set test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
(global as any).createMockSensorReading = (overrides = {}) => ({
  sensor_id: 'test_sensor',
  timestamp: new Date('2024-01-15T12:00:00Z'),
  location: {
    latitude: -23.5,
    longitude: 133.5,
    elevation: 100,
    utm_x: 500000,
    utm_y: 7500000,
    mine_grid_x: 1000,
    mine_grid_y: 2000
  },
  measurements: { displacement: 10, strain: 0.001, tilt: 2.5 },
  quality_flags: { displacement: true, strain: true, tilt: true },
  battery_level: 0.8,
  signal_strength: -70,
  ...overrides
});

(global as any).createMockWeatherReading = (overrides = {}) => ({
  timestamp: new Date('2024-01-15T12:00:00Z'),
  temperature: 25,
  humidity: 60,
  pressure: 1013.25,
  rainfall: 0,
  wind_speed: 5,
  wind_direction: 180,
  ...overrides
});

(global as any).createMockSpatialLocation = (overrides = {}) => ({
  latitude: -23.5,
  longitude: 133.5,
  elevation: 100,
  utm_x: 500000,
  utm_y: 7500000,
  mine_grid_x: 1000,
  mine_grid_y: 2000,
  ...overrides
});

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeFiniteNumber(received) {
    const pass = typeof received === 'number' && isFinite(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a finite number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a finite number`,
        pass: false,
      };
    }
  }
});

// Export to make this a module
export {};