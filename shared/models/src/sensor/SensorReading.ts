import { z } from 'zod';
import { SpatialLocation, SpatialLocationSchema, type SpatialLocationInput } from '../spatial/SpatialLocation';

// Sensor type enumeration
export const SensorTypeSchema = z.enum([
  'tilt', 'accelerometer', 'piezometer', 'temperature', 'humidity', 
  'strain_gauge', 'fbg', 'displacement', 'vibration', 'pressure',
  'flow_rate', 'water_level', 'ph', 'conductivity', 'turbidity'
]);

export type SensorType = z.infer<typeof SensorTypeSchema>;

// Data quality flags
export const QualityFlagsSchema = z.object({
  is_valid: z.boolean().default(true),
  is_calibrated: z.boolean().default(true),
  is_within_range: z.boolean().default(true),
  has_drift: z.boolean().default(false),
  has_noise: z.boolean().default(false),
  is_suspicious: z.boolean().default(false),
  battery_low: z.boolean().default(false),
  communication_error: z.boolean().default(false)
});

export type QualityFlags = z.infer<typeof QualityFlagsSchema>;

// Measurement data with units
export const MeasurementSchema = z.object({
  value: z.number(),
  unit: z.string(),
  precision: z.number().positive().optional(),
  calibration_date: z.date().optional(),
  calibration_factor: z.number().optional()
});

export type Measurement = z.infer<typeof MeasurementSchema>;

// SensorReading validation schema
export const SensorReadingSchema = z.object({
  sensor_id: z.string().min(1),
  timestamp: z.date(),
  location: SpatialLocationSchema.optional(),
  sensor_type: SensorTypeSchema,
  measurements: z.record(z.string(), MeasurementSchema),
  quality_flags: QualityFlagsSchema.optional(),
  battery_level: z.number().min(0).max(100).optional(),
  signal_strength: z.number().min(-120).max(0).optional(), // dBm
  temperature: z.number().optional(), // Ambient temperature in Celsius
  sequence_number: z.number().int().nonnegative().optional(),
  checksum: z.string().optional(),
  raw_data: z.string().optional(), // Base64 encoded raw sensor data
  processing_timestamp: z.date().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export type SensorReadingData = z.infer<typeof SensorReadingSchema>;

// Input type for constructor
export type SensorReadingInput = Omit<SensorReadingData, 'location'> & {
  location?: SpatialLocationInput;
};

export class SensorReading {
  public readonly sensor_id: string;
  public readonly timestamp: Date;
  public readonly location?: SpatialLocation;
  public readonly sensor_type: SensorType;
  public readonly measurements: Record<string, Measurement>;
  public readonly quality_flags: QualityFlags;
  public readonly battery_level?: number;
  public readonly signal_strength?: number;
  public readonly temperature?: number;
  public readonly sequence_number?: number;
  public readonly checksum?: string;
  public readonly raw_data?: string;
  public readonly processing_timestamp?: Date;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;

  constructor(data: SensorReadingInput) {
    // Convert location if provided
    const locationData = data.location ? {
      ...data,
      location: data.location
    } : data;

    const validated = SensorReadingSchema.parse({
      ...locationData,
      quality_flags: data.quality_flags || {},
      processing_timestamp: data.processing_timestamp || new Date(),
      created_at: data.created_at || new Date()
    });
    
    this.sensor_id = validated.sensor_id;
    this.timestamp = validated.timestamp;
    this.location = validated.location ? new SpatialLocation(validated.location) : undefined;
    this.sensor_type = validated.sensor_type;
    this.measurements = validated.measurements;
    this.quality_flags = validated.quality_flags!;
    this.battery_level = validated.battery_level;
    this.signal_strength = validated.signal_strength;
    this.temperature = validated.temperature;
    this.sequence_number = validated.sequence_number;
    this.checksum = validated.checksum;
    this.raw_data = validated.raw_data;
    this.processing_timestamp = validated.processing_timestamp;
    this.created_at = validated.created_at;
    this.updated_at = validated.updated_at;
  }

  /**
   * Get a specific measurement by name
   */
  public getMeasurement(name: string): Measurement | undefined {
    return this.measurements[name];
  }

  /**
   * Get measurement value by name
   */
  public getMeasurementValue(name: string): number | undefined {
    const measurement = this.measurements[name];
    return measurement?.value;
  }

  /**
   * Check if the sensor reading is valid based on quality flags
   */
  public isValid(): boolean {
    return this.quality_flags.is_valid && 
           !this.quality_flags.communication_error &&
           this.quality_flags.is_within_range;
  }

  /**
   * Check if the sensor reading requires attention
   */
  public requiresAttention(): boolean {
    return this.quality_flags.battery_low ||
           this.quality_flags.has_drift ||
           this.quality_flags.is_suspicious ||
           !this.quality_flags.is_calibrated;
  }

  /**
   * Calculate data quality score (0-1)
   */
  public getQualityScore(): number {
    let score = 1.0;
    
    if (!this.quality_flags.is_valid) score -= 0.5;
    if (!this.quality_flags.is_calibrated) score -= 0.2;
    if (!this.quality_flags.is_within_range) score -= 0.3;
    if (this.quality_flags.has_drift) score -= 0.1;
    if (this.quality_flags.has_noise) score -= 0.1;
    if (this.quality_flags.is_suspicious) score -= 0.2;
    if (this.quality_flags.battery_low) score -= 0.1;
    if (this.quality_flags.communication_error) score -= 0.3;

    return Math.max(0, score);
  }

  /**
   * Get age of the reading in milliseconds
   */
  public getAge(): number {
    return Date.now() - this.timestamp.getTime();
  }

  /**
   * Check if reading is stale (older than threshold)
   */
  public isStale(thresholdMs: number = 300000): boolean { // 5 minutes default
    return this.getAge() > thresholdMs;
  }

  /**
   * Validate sensor reading data
   */
  public static validate(data: unknown): SensorReadingData {
    return SensorReadingSchema.parse(data);
  }

  /**
   * Create a time-series compatible data point
   */
  public toTimeSeriesPoint(): {
    timestamp: Date;
    sensor_id: string;
    values: Record<string, number>;
    quality_score: number;
  } {
    const values: Record<string, number> = {};
    
    for (const [key, measurement] of Object.entries(this.measurements)) {
      values[key] = measurement.value;
    }

    return {
      timestamp: this.timestamp,
      sensor_id: this.sensor_id,
      values,
      quality_score: this.getQualityScore()
    };
  }

  /**
   * Convert to InfluxDB line protocol format
   */
  public toInfluxLineProtocol(): string {
    const measurement = `sensor_reading,sensor_id=${this.sensor_id},sensor_type=${this.sensor_type}`;
    
    const fields: string[] = [];
    for (const [key, value] of Object.entries(this.measurements)) {
      fields.push(`${key}=${value.value}`);
    }
    
    fields.push(`quality_score=${this.getQualityScore()}`);
    if (this.battery_level !== undefined) fields.push(`battery_level=${this.battery_level}`);
    if (this.signal_strength !== undefined) fields.push(`signal_strength=${this.signal_strength}`);
    if (this.temperature !== undefined) fields.push(`temperature=${this.temperature}`);

    const timestamp = this.timestamp.getTime() * 1000000; // nanoseconds
    
    return `${measurement} ${fields.join(',')} ${timestamp}`;
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): SensorReadingData {
    return {
      sensor_id: this.sensor_id,
      timestamp: this.timestamp,
      location: this.location?.toJSON(),
      sensor_type: this.sensor_type,
      measurements: this.measurements,
      quality_flags: this.quality_flags,
      battery_level: this.battery_level,
      signal_strength: this.signal_strength,
      temperature: this.temperature,
      sequence_number: this.sequence_number,
      checksum: this.checksum,
      raw_data: this.raw_data,
      processing_timestamp: this.processing_timestamp,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create from JSON
   */
  public static fromJSON(json: any): SensorReading {
    return new SensorReading({
      ...json,
      timestamp: new Date(json.timestamp),
      processing_timestamp: json.processing_timestamp ? new Date(json.processing_timestamp) : undefined,
      created_at: json.created_at ? new Date(json.created_at) : undefined,
      updated_at: json.updated_at ? new Date(json.updated_at) : undefined
    });
  }

  /**
   * Create from CSV row
   */
  public static fromCSV(csvRow: string, headers: string[]): SensorReading {
    const values = csvRow.split(',');
    const data: any = {
      measurements: {} // Initialize measurements object
    };
    
    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        const value = values[index].trim();
        const key = header.trim();
        
        // Handle measurement values (assume they start with 'measurement_')
        if (key.startsWith('measurement_')) {
          const measurementName = key.replace('measurement_', '');
          data.measurements[measurementName] = {
            value: parseFloat(value),
            unit: 'unknown' // Default unit
          };
        } else {
          data[key] = value;
        }
      }
    });

    // Convert string values to appropriate types
    if (data.timestamp) data.timestamp = new Date(data.timestamp);
    if (data.battery_level) data.battery_level = parseFloat(data.battery_level);
    if (data.signal_strength) data.signal_strength = parseFloat(data.signal_strength);
    if (data.temperature) data.temperature = parseFloat(data.temperature);

    return new SensorReading(data);
  }
}