"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorReading = exports.SensorReadingSchema = exports.MeasurementSchema = exports.QualityFlagsSchema = exports.SensorTypeSchema = void 0;
const zod_1 = require("zod");
const SpatialLocation_1 = require("../spatial/SpatialLocation");
// Sensor type enumeration
exports.SensorTypeSchema = zod_1.z.enum([
    'tilt', 'accelerometer', 'piezometer', 'temperature', 'humidity',
    'strain_gauge', 'fbg', 'displacement', 'vibration', 'pressure',
    'flow_rate', 'water_level', 'ph', 'conductivity', 'turbidity'
]);
// Data quality flags
exports.QualityFlagsSchema = zod_1.z.object({
    is_valid: zod_1.z.boolean().default(true),
    is_calibrated: zod_1.z.boolean().default(true),
    is_within_range: zod_1.z.boolean().default(true),
    has_drift: zod_1.z.boolean().default(false),
    has_noise: zod_1.z.boolean().default(false),
    is_suspicious: zod_1.z.boolean().default(false),
    battery_low: zod_1.z.boolean().default(false),
    communication_error: zod_1.z.boolean().default(false)
});
// Measurement data with units
exports.MeasurementSchema = zod_1.z.object({
    value: zod_1.z.number(),
    unit: zod_1.z.string(),
    precision: zod_1.z.number().positive().optional(),
    calibration_date: zod_1.z.date().optional(),
    calibration_factor: zod_1.z.number().optional()
});
// SensorReading validation schema
exports.SensorReadingSchema = zod_1.z.object({
    sensor_id: zod_1.z.string().min(1),
    timestamp: zod_1.z.date(),
    location: SpatialLocation_1.SpatialLocationSchema.optional(),
    sensor_type: exports.SensorTypeSchema,
    measurements: zod_1.z.record(zod_1.z.string(), exports.MeasurementSchema),
    quality_flags: exports.QualityFlagsSchema.optional(),
    battery_level: zod_1.z.number().min(0).max(100).optional(),
    signal_strength: zod_1.z.number().min(-120).max(0).optional(), // dBm
    temperature: zod_1.z.number().optional(), // Ambient temperature in Celsius
    sequence_number: zod_1.z.number().int().nonnegative().optional(),
    checksum: zod_1.z.string().optional(),
    raw_data: zod_1.z.string().optional(), // Base64 encoded raw sensor data
    processing_timestamp: zod_1.z.date().optional(),
    created_at: zod_1.z.date().optional(),
    updated_at: zod_1.z.date().optional()
});
class SensorReading {
    constructor(data) {
        // Convert location if provided
        const locationData = data.location ? {
            ...data,
            location: data.location
        } : data;
        const validated = exports.SensorReadingSchema.parse({
            ...locationData,
            quality_flags: data.quality_flags || {},
            processing_timestamp: data.processing_timestamp || new Date(),
            created_at: data.created_at || new Date()
        });
        this.sensor_id = validated.sensor_id;
        this.timestamp = validated.timestamp;
        this.location = validated.location ? new SpatialLocation_1.SpatialLocation(validated.location) : undefined;
        this.sensor_type = validated.sensor_type;
        this.measurements = validated.measurements;
        this.quality_flags = validated.quality_flags;
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
    getMeasurement(name) {
        return this.measurements[name];
    }
    /**
     * Get measurement value by name
     */
    getMeasurementValue(name) {
        const measurement = this.measurements[name];
        return measurement?.value;
    }
    /**
     * Check if the sensor reading is valid based on quality flags
     */
    isValid() {
        return this.quality_flags.is_valid &&
            !this.quality_flags.communication_error &&
            this.quality_flags.is_within_range;
    }
    /**
     * Check if the sensor reading requires attention
     */
    requiresAttention() {
        return this.quality_flags.battery_low ||
            this.quality_flags.has_drift ||
            this.quality_flags.is_suspicious ||
            !this.quality_flags.is_calibrated;
    }
    /**
     * Calculate data quality score (0-1)
     */
    getQualityScore() {
        let score = 1.0;
        if (!this.quality_flags.is_valid)
            score -= 0.5;
        if (!this.quality_flags.is_calibrated)
            score -= 0.2;
        if (!this.quality_flags.is_within_range)
            score -= 0.3;
        if (this.quality_flags.has_drift)
            score -= 0.1;
        if (this.quality_flags.has_noise)
            score -= 0.1;
        if (this.quality_flags.is_suspicious)
            score -= 0.2;
        if (this.quality_flags.battery_low)
            score -= 0.1;
        if (this.quality_flags.communication_error)
            score -= 0.3;
        return Math.max(0, score);
    }
    /**
     * Get age of the reading in milliseconds
     */
    getAge() {
        return Date.now() - this.timestamp.getTime();
    }
    /**
     * Check if reading is stale (older than threshold)
     */
    isStale(thresholdMs = 300000) {
        return this.getAge() > thresholdMs;
    }
    /**
     * Validate sensor reading data
     */
    static validate(data) {
        return exports.SensorReadingSchema.parse(data);
    }
    /**
     * Create a time-series compatible data point
     */
    toTimeSeriesPoint() {
        const values = {};
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
    toInfluxLineProtocol() {
        const measurement = `sensor_reading,sensor_id=${this.sensor_id},sensor_type=${this.sensor_type}`;
        const fields = [];
        for (const [key, value] of Object.entries(this.measurements)) {
            fields.push(`${key}=${value.value}`);
        }
        fields.push(`quality_score=${this.getQualityScore()}`);
        if (this.battery_level !== undefined)
            fields.push(`battery_level=${this.battery_level}`);
        if (this.signal_strength !== undefined)
            fields.push(`signal_strength=${this.signal_strength}`);
        if (this.temperature !== undefined)
            fields.push(`temperature=${this.temperature}`);
        const timestamp = this.timestamp.getTime() * 1000000; // nanoseconds
        return `${measurement} ${fields.join(',')} ${timestamp}`;
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
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
    static fromJSON(json) {
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
    static fromCSV(csvRow, headers) {
        const values = csvRow.split(',');
        const data = {
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
                }
                else {
                    data[key] = value;
                }
            }
        });
        // Convert string values to appropriate types
        if (data.timestamp)
            data.timestamp = new Date(data.timestamp);
        if (data.battery_level)
            data.battery_level = parseFloat(data.battery_level);
        if (data.signal_strength)
            data.signal_strength = parseFloat(data.signal_strength);
        if (data.temperature)
            data.temperature = parseFloat(data.temperature);
        return new SensorReading(data);
    }
}
exports.SensorReading = SensorReading;
//# sourceMappingURL=SensorReading.js.map