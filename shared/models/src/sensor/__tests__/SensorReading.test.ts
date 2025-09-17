import { SensorReading, SensorReadingSchema, type Measurement } from '../SensorReading';

describe('SensorReading', () => {
  const validMeasurements: Record<string, Measurement> = {
    tilt_x: { value: 2.5, unit: 'degrees', precision: 0.1 },
    tilt_y: { value: -1.2, unit: 'degrees', precision: 0.1 },
    temperature: { value: 23.5, unit: 'celsius', precision: 0.5 }
  };

  const validSensorData = {
    sensor_id: 'HEX001_TILT',
    timestamp: new Date('2023-01-01T12:00:00Z'),
    sensor_type: 'tilt' as const,
    measurements: validMeasurements,
    battery_level: 85,
    signal_strength: -65,
    temperature: 23.5,
    sequence_number: 12345
  };

  describe('constructor and validation', () => {
    it('should create a valid SensorReading with required fields', () => {
      const reading = new SensorReading(validSensorData);
      
      expect(reading.sensor_id).toBe('HEX001_TILT');
      expect(reading.timestamp).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(reading.sensor_type).toBe('tilt');
      expect(reading.measurements).toEqual(validMeasurements);
      expect(reading.battery_level).toBe(85);
      expect(reading.signal_strength).toBe(-65);
      expect(reading.quality_flags).toBeDefined();
      expect(reading.processing_timestamp).toBeInstanceOf(Date);
      expect(reading.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for invalid sensor type', () => {
      const invalidData = { ...validSensorData, sensor_type: 'invalid_type' as any };
      expect(() => new SensorReading(invalidData)).toThrow();
    });

    it('should throw error for invalid battery level', () => {
      const invalidData = { ...validSensorData, battery_level: 150 };
      expect(() => new SensorReading(invalidData)).toThrow();
    });

    it('should throw error for invalid signal strength', () => {
      const invalidData = { ...validSensorData, signal_strength: 10 };
      expect(() => new SensorReading(invalidData)).toThrow();
    });

    it('should accept optional location', () => {
      const dataWithLocation = {
        ...validSensorData,
        location: {
          latitude: 45.5231,
          longitude: -122.6765,
          elevation: 100
        }
      };
      
      const reading = new SensorReading(dataWithLocation);
      expect(reading.location).toBeDefined();
      expect(reading.location!.latitude).toBe(45.5231);
    });

    it('should set default quality flags', () => {
      const reading = new SensorReading(validSensorData);
      
      expect(reading.quality_flags.is_valid).toBe(true);
      expect(reading.quality_flags.is_calibrated).toBe(true);
      expect(reading.quality_flags.is_within_range).toBe(true);
      expect(reading.quality_flags.has_drift).toBe(false);
    });
  });

  describe('measurement access methods', () => {
    it('should get measurement by name', () => {
      const reading = new SensorReading(validSensorData);
      const tiltX = reading.getMeasurement('tilt_x');
      
      expect(tiltX).toBeDefined();
      expect(tiltX!.value).toBe(2.5);
      expect(tiltX!.unit).toBe('degrees');
    });

    it('should get measurement value by name', () => {
      const reading = new SensorReading(validSensorData);
      
      expect(reading.getMeasurementValue('tilt_x')).toBe(2.5);
      expect(reading.getMeasurementValue('tilt_y')).toBe(-1.2);
      expect(reading.getMeasurementValue('nonexistent')).toBeUndefined();
    });
  });

  describe('quality assessment methods', () => {
    it('should return true for valid reading', () => {
      const reading = new SensorReading(validSensorData);
      expect(reading.isValid()).toBe(true);
    });

    it('should return false for invalid reading', () => {
      const invalidReading = new SensorReading({
        ...validSensorData,
        quality_flags: {
          is_valid: false,
          is_calibrated: true,
          is_within_range: true,
          has_drift: false,
          has_noise: false,
          is_suspicious: false,
          battery_low: false,
          communication_error: false
        }
      });
      
      expect(invalidReading.isValid()).toBe(false);
    });

    it('should detect readings requiring attention', () => {
      const attentionReading = new SensorReading({
        ...validSensorData,
        quality_flags: {
          is_valid: true,
          is_calibrated: false,
          is_within_range: true,
          has_drift: true,
          has_noise: false,
          is_suspicious: false,
          battery_low: true,
          communication_error: false
        }
      });
      
      expect(attentionReading.requiresAttention()).toBe(true);
    });

    it('should calculate quality score correctly', () => {
      const reading = new SensorReading(validSensorData);
      expect(reading.getQualityScore()).toBe(1.0);
      
      const poorQualityReading = new SensorReading({
        ...validSensorData,
        quality_flags: {
          is_valid: false,
          is_calibrated: false,
          is_within_range: false,
          has_drift: true,
          has_noise: true,
          is_suspicious: true,
          battery_low: true,
          communication_error: true
        }
      });
      
      expect(poorQualityReading.getQualityScore()).toBe(0);
    });
  });

  describe('time-based methods', () => {
    it('should calculate age correctly', () => {
      const pastTime = new Date(Date.now() - 60000); // 1 minute ago
      const reading = new SensorReading({
        ...validSensorData,
        timestamp: pastTime
      });
      
      const age = reading.getAge();
      expect(age).toBeGreaterThan(50000); // Should be around 60000ms
      expect(age).toBeLessThan(70000);
    });

    it('should detect stale readings', () => {
      const oldTime = new Date(Date.now() - 600000); // 10 minutes ago
      const reading = new SensorReading({
        ...validSensorData,
        timestamp: oldTime
      });
      
      expect(reading.isStale()).toBe(true);
      expect(reading.isStale(1200000)).toBe(false); // 20 minute threshold
    });

    it('should detect fresh readings', () => {
      const recentTime = new Date(Date.now() - 60000); // 1 minute ago
      const reading = new SensorReading({
        ...validSensorData,
        timestamp: recentTime
      });
      
      expect(reading.isStale()).toBe(false);
    });
  });

  describe('data format conversions', () => {
    it('should convert to time series point', () => {
      const reading = new SensorReading(validSensorData);
      const tsPoint = reading.toTimeSeriesPoint();
      
      expect(tsPoint.timestamp).toEqual(reading.timestamp);
      expect(tsPoint.sensor_id).toBe('HEX001_TILT');
      expect(tsPoint.values.tilt_x).toBe(2.5);
      expect(tsPoint.values.tilt_y).toBe(-1.2);
      expect(tsPoint.quality_score).toBe(1.0);
    });

    it('should convert to InfluxDB line protocol', () => {
      const reading = new SensorReading(validSensorData);
      const lineProtocol = reading.toInfluxLineProtocol();
      
      expect(lineProtocol).toContain('sensor_reading,sensor_id=HEX001_TILT,sensor_type=tilt');
      expect(lineProtocol).toContain('tilt_x=2.5');
      expect(lineProtocol).toContain('tilt_y=-1.2');
      expect(lineProtocol).toContain('temperature=23.5');
      expect(lineProtocol).toContain('quality_score=1');
      expect(lineProtocol).toContain('battery_level=85');
      expect(lineProtocol).toContain('signal_strength=-65');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const reading = new SensorReading(validSensorData);
      const json = reading.toJSON();
      
      expect(json.sensor_id).toBe('HEX001_TILT');
      expect(json.sensor_type).toBe('tilt');
      expect(json.measurements).toEqual(validMeasurements);
      expect(json.battery_level).toBe(85);
      expect(json.timestamp).toEqual(validSensorData.timestamp);
    });

    it('should create from JSON', () => {
      const json = {
        ...validSensorData,
        timestamp: '2023-01-01T12:00:00.000Z',
        processing_timestamp: '2023-01-01T12:00:01.000Z',
        created_at: '2023-01-01T12:00:02.000Z'
      };
      
      const reading = SensorReading.fromJSON(json);
      
      expect(reading.sensor_id).toBe('HEX001_TILT');
      expect(reading.timestamp).toEqual(new Date('2023-01-01T12:00:00.000Z'));
      expect(reading.processing_timestamp).toEqual(new Date('2023-01-01T12:00:01.000Z'));
      expect(reading.created_at).toEqual(new Date('2023-01-01T12:00:02.000Z'));
    });
  });

  describe('CSV conversion', () => {
    it('should create from CSV row', () => {
      const headers = ['sensor_id', 'timestamp', 'sensor_type', 'battery_level', 'signal_strength'];
      const csvRow = 'HEX001_TILT,2023-01-01T12:00:00Z,tilt,85,-65';
      
      const reading = SensorReading.fromCSV(csvRow, headers);
      
      expect(reading.sensor_id).toBe('HEX001_TILT');
      expect(reading.timestamp).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(reading.sensor_type).toBe('tilt');
      expect(reading.battery_level).toBe(85);
      expect(reading.signal_strength).toBe(-65);
    });
  });

  describe('validation methods', () => {
    it('should validate correct data', () => {
      expect(() => SensorReading.validate(validSensorData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidData = { ...validSensorData, sensor_id: '' };
      expect(() => SensorReading.validate(invalidData)).toThrow();
    });

    it('should validate measurement precision', () => {
      const dataWithPrecision = {
        ...validSensorData,
        measurements: {
          test_value: { value: 10.5, unit: 'units', precision: -1 } // Invalid negative precision
        }
      };
      
      expect(() => SensorReading.validate(dataWithPrecision)).toThrow();
    });
  });

  describe('sensor types', () => {
    const sensorTypes = [
      'tilt', 'accelerometer', 'piezometer', 'temperature', 'humidity',
      'strain_gauge', 'fbg', 'displacement', 'vibration', 'pressure',
      'flow_rate', 'water_level', 'ph', 'conductivity', 'turbidity'
    ];

    sensorTypes.forEach(sensorType => {
      it(`should accept ${sensorType} sensor type`, () => {
        const data = { ...validSensorData, sensor_type: sensorType as any };
        expect(() => new SensorReading(data)).not.toThrow();
      });
    });

    it('should reject invalid sensor type', () => {
      const data = { ...validSensorData, sensor_type: 'invalid_sensor' as any };
      expect(() => new SensorReading(data)).toThrow();
    });
  });
});