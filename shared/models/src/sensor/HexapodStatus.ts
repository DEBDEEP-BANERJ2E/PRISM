import { z } from 'zod';
import { SpatialLocation, SpatialLocationSchema, type SpatialLocationInput } from '../spatial/SpatialLocation';

// Power status schema
export const PowerStatusSchema = z.object({
  battery_percentage: z.number().min(0).max(100),
  voltage: z.number().positive(),
  current: z.number(),
  power_consumption: z.number().nonnegative(),
  charging: z.boolean().default(false),
  solar_panel_voltage: z.number().nonnegative().optional(),
  estimated_runtime_hours: z.number().nonnegative().optional(),
  last_charge_date: z.date().optional()
});

export type PowerStatus = z.infer<typeof PowerStatusSchema>;

// Sensor health status
export const SensorHealthSchema = z.enum([
  'healthy', 'warning', 'critical', 'offline', 'maintenance_required'
]);

export type SensorHealth = z.infer<typeof SensorHealthSchema>;

// Communication status
export const CommunicationStatusSchema = z.object({
  connection_type: z.enum(['lora', 'nb_iot', '5g', 'wifi', 'satellite']),
  signal_strength: z.number().min(-120).max(0), // dBm
  data_rate: z.number().nonnegative(), // bps
  packet_loss_rate: z.number().min(0).max(1), // percentage as decimal
  last_successful_transmission: z.date(),
  failed_transmission_count: z.number().int().nonnegative().default(0),
  total_data_transmitted: z.number().nonnegative().default(0) // bytes
});

export type CommunicationStatus = z.infer<typeof CommunicationStatusSchema>;

// Environmental conditions
export const EnvironmentalConditionsSchema = z.object({
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  pressure: z.number().positive().optional(),
  wind_speed: z.number().nonnegative().optional(),
  precipitation: z.number().nonnegative().optional(),
  uv_index: z.number().nonnegative().optional()
});

export type EnvironmentalConditions = z.infer<typeof EnvironmentalConditionsSchema>;

// Operational mode
export const OperationalModeSchema = z.enum([
  'active', 'sleep', 'maintenance', 'emergency', 'calibration', 'offline'
]);

export type OperationalMode = z.infer<typeof OperationalModeSchema>;

// Hexapod status validation schema
export const HexapodStatusSchema = z.object({
  pod_id: z.string().min(1),
  location: SpatialLocationSchema,
  operational_mode: OperationalModeSchema,
  sensor_health: z.record(z.string(), SensorHealthSchema),
  last_communication: z.date(),
  power_status: PowerStatusSchema,
  communication_status: CommunicationStatusSchema,
  environmental_conditions: EnvironmentalConditionsSchema.optional(),
  firmware_version: z.string().optional(),
  hardware_version: z.string().optional(),
  uptime_seconds: z.number().int().nonnegative().optional(),
  reboot_count: z.number().int().nonnegative().default(0),
  error_log: z.array(z.string()).default([]),
  maintenance_due_date: z.date().optional(),
  deployment_date: z.date().optional(),
  last_calibration_date: z.date().optional(),
  data_collection_interval: z.number().int().positive().default(300), // seconds
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export type HexapodStatusData = z.infer<typeof HexapodStatusSchema>;

// Input type for constructor
export type HexapodStatusInput = Omit<HexapodStatusData, 'location' | 'error_log' | 'reboot_count'> & {
  location: SpatialLocationInput;
  error_log?: string[];
  reboot_count?: number;
};

export class HexapodStatus {
  public readonly pod_id: string;
  public readonly location: SpatialLocation;
  public readonly operational_mode: OperationalMode;
  public readonly sensor_health: Record<string, SensorHealth>;
  public readonly last_communication: Date;
  public readonly power_status: PowerStatus;
  public readonly communication_status: CommunicationStatus;
  public readonly environmental_conditions?: EnvironmentalConditions;
  public readonly firmware_version?: string;
  public readonly hardware_version?: string;
  public readonly uptime_seconds?: number;
  public readonly reboot_count: number;
  public readonly error_log: string[];
  public readonly maintenance_due_date?: Date;
  public readonly deployment_date?: Date;
  public readonly last_calibration_date?: Date;
  public readonly data_collection_interval: number;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;

  constructor(data: HexapodStatusInput) {
    const validated = HexapodStatusSchema.parse({
      ...data,
      location: data.location,
      created_at: data.created_at || new Date(),
      updated_at: data.updated_at || new Date()
    });
    
    this.pod_id = validated.pod_id;
    this.location = new SpatialLocation(validated.location);
    this.operational_mode = validated.operational_mode;
    this.sensor_health = validated.sensor_health;
    this.last_communication = validated.last_communication;
    this.power_status = validated.power_status;
    this.communication_status = validated.communication_status;
    this.environmental_conditions = validated.environmental_conditions;
    this.firmware_version = validated.firmware_version;
    this.hardware_version = validated.hardware_version;
    this.uptime_seconds = validated.uptime_seconds;
    this.reboot_count = validated.reboot_count;
    this.error_log = validated.error_log;
    this.maintenance_due_date = validated.maintenance_due_date;
    this.deployment_date = validated.deployment_date;
    this.last_calibration_date = validated.last_calibration_date;
    this.data_collection_interval = validated.data_collection_interval;
    this.created_at = validated.created_at;
    this.updated_at = validated.updated_at;
  }

  /**
   * Check if the hexapod is currently online
   */
  public isOnline(): boolean {
    const maxOfflineTime = 10 * 60 * 1000; // 10 minutes
    return Date.now() - this.last_communication.getTime() < maxOfflineTime;
  }

  /**
   * Check if the hexapod is healthy
   */
  public isHealthy(): boolean {
    const hasHealthySensors = Object.values(this.sensor_health).every(
      health => health === 'healthy' || health === 'warning'
    );
    
    return this.operational_mode === 'active' &&
           this.power_status.battery_percentage > 20 &&
           hasHealthySensors &&
           this.isOnline();
  }

  /**
   * Get overall health status
   */
  public getOverallHealth(): SensorHealth {
    if (!this.isOnline()) return 'offline';
    
    if (this.operational_mode === 'maintenance') return 'maintenance_required';
    
    const sensorHealthValues = Object.values(this.sensor_health);
    
    if (sensorHealthValues.some(health => health === 'critical')) {
      return 'critical';
    }
    
    if (this.power_status.battery_percentage < 10 ||
        sensorHealthValues.some(health => health === 'warning')) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Get critical sensors that need attention
   */
  public getCriticalSensors(): string[] {
    return Object.entries(this.sensor_health)
      .filter(([_, health]) => health === 'critical' || health === 'offline')
      .map(([sensor, _]) => sensor);
  }

  /**
   * Check if maintenance is due
   */
  public isMaintenanceDue(): boolean {
    if (!this.maintenance_due_date) return false;
    return new Date() >= this.maintenance_due_date;
  }

  /**
   * Check if calibration is due (default: every 30 days)
   */
  public isCalibrationDue(intervalDays: number = 30): boolean {
    if (!this.last_calibration_date) return true;
    
    const daysSinceCalibration = (Date.now() - this.last_calibration_date.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCalibration >= intervalDays;
  }

  /**
   * Get estimated remaining battery life in hours
   */
  public getEstimatedBatteryLife(): number {
    if (this.power_status.estimated_runtime_hours) {
      return this.power_status.estimated_runtime_hours;
    }
    
    // Simple estimation based on battery percentage and power consumption
    const batteryCapacityWh = 100; // Assume 100Wh battery
    const remainingCapacity = (this.power_status.battery_percentage / 100) * batteryCapacityWh;
    
    if (this.power_status.power_consumption > 0) {
      return remainingCapacity / this.power_status.power_consumption;
    }
    
    return 0;
  }

  /**
   * Get communication quality score (0-1)
   */
  public getCommunicationQuality(): number {
    let score = 1.0;
    
    // Signal strength factor
    const signalStrength = this.communication_status.signal_strength;
    if (signalStrength < -100) score -= 0.3;
    else if (signalStrength < -80) score -= 0.2;
    else if (signalStrength < -60) score -= 0.1;
    
    // Packet loss factor
    score -= this.communication_status.packet_loss_rate * 0.5;
    
    // Failed transmission factor
    if (this.communication_status.failed_transmission_count > 10) score -= 0.2;
    else if (this.communication_status.failed_transmission_count > 5) score -= 0.1;
    
    return Math.max(0, score);
  }

  /**
   * Get uptime in human-readable format
   */
  public getUptimeString(): string {
    if (!this.uptime_seconds) return 'Unknown';
    
    const days = Math.floor(this.uptime_seconds / (24 * 3600));
    const hours = Math.floor((this.uptime_seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((this.uptime_seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  }

  /**
   * Validate hexapod status data
   */
  public static validate(data: unknown): HexapodStatusData {
    return HexapodStatusSchema.parse(data);
  }

  /**
   * Create status summary for dashboard
   */
  public getStatusSummary(): {
    pod_id: string;
    overall_health: SensorHealth;
    battery_percentage: number;
    is_online: boolean;
    critical_sensors: string[];
    maintenance_due: boolean;
    calibration_due: boolean;
    communication_quality: number;
    last_seen: Date;
  } {
    return {
      pod_id: this.pod_id,
      overall_health: this.getOverallHealth(),
      battery_percentage: this.power_status.battery_percentage,
      is_online: this.isOnline(),
      critical_sensors: this.getCriticalSensors(),
      maintenance_due: this.isMaintenanceDue(),
      calibration_due: this.isCalibrationDue(),
      communication_quality: this.getCommunicationQuality(),
      last_seen: this.last_communication
    };
  }

  /**
   * Convert to InfluxDB line protocol format
   */
  public toInfluxLineProtocol(): string {
    const measurement = `hexapod_status,pod_id=${this.pod_id},operational_mode=${this.operational_mode}`;
    
    const fields: string[] = [
      `battery_percentage=${this.power_status.battery_percentage}`,
      `signal_strength=${this.communication_status.signal_strength}`,
      `packet_loss_rate=${this.communication_status.packet_loss_rate}`,
      `power_consumption=${this.power_status.power_consumption}`,
      `is_online=${this.isOnline()}`,
      `overall_health="${this.getOverallHealth()}"`,
      `communication_quality=${this.getCommunicationQuality()}`
    ];

    if (this.environmental_conditions) {
      fields.push(`temperature=${this.environmental_conditions.temperature}`);
      fields.push(`humidity=${this.environmental_conditions.humidity}`);
    }

    if (this.uptime_seconds) {
      fields.push(`uptime_seconds=${this.uptime_seconds}`);
    }

    const timestamp = this.last_communication.getTime() * 1000000; // nanoseconds
    
    return `${measurement} ${fields.join(',')} ${timestamp}`;
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): HexapodStatusData {
    return {
      pod_id: this.pod_id,
      location: this.location.toJSON(),
      operational_mode: this.operational_mode,
      sensor_health: this.sensor_health,
      last_communication: this.last_communication,
      power_status: this.power_status,
      communication_status: this.communication_status,
      environmental_conditions: this.environmental_conditions,
      firmware_version: this.firmware_version,
      hardware_version: this.hardware_version,
      uptime_seconds: this.uptime_seconds,
      reboot_count: this.reboot_count,
      error_log: this.error_log,
      maintenance_due_date: this.maintenance_due_date,
      deployment_date: this.deployment_date,
      last_calibration_date: this.last_calibration_date,
      data_collection_interval: this.data_collection_interval,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create from JSON
   */
  public static fromJSON(json: any): HexapodStatus {
    return new HexapodStatus({
      ...json,
      last_communication: new Date(json.last_communication),
      maintenance_due_date: json.maintenance_due_date ? new Date(json.maintenance_due_date) : undefined,
      deployment_date: json.deployment_date ? new Date(json.deployment_date) : undefined,
      last_calibration_date: json.last_calibration_date ? new Date(json.last_calibration_date) : undefined,
      created_at: json.created_at ? new Date(json.created_at) : undefined,
      updated_at: json.updated_at ? new Date(json.updated_at) : undefined,
      power_status: {
        ...json.power_status,
        last_charge_date: json.power_status.last_charge_date ? 
          new Date(json.power_status.last_charge_date) : undefined
      },
      communication_status: {
        ...json.communication_status,
        last_successful_transmission: new Date(json.communication_status.last_successful_transmission)
      }
    });
  }
}