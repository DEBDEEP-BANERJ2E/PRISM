import { 
  VirtualSensor, 
  SensorNetwork, 
  SensorReading, 
  SensorConfiguration,
  SensorState,
  SensorHealthStatus,
  SensorAlert,
  NetworkTopology,
  CoverageMap,
  CoverageGap,
  NetworkStatistics,
  InterpolationResult,
  SpatialInterpolationQuery
} from '../types/sensor';
import { Point3D } from '../types/geometry';
import { GeometricUtils } from '../utils/geometricUtils';

export class VirtualSensorNetwork {
  private network: SensorNetwork;
  private interpolationCache: Map<string, InterpolationResult>;
  private alertHandlers: Map<string, (alert: SensorAlert) => void>;
  private cacheTimeouts: Map<string, NodeJS.Timeout>;

  constructor(networkId: string) {
    this.network = {
      id: networkId,
      sensors: new Map(),
      topology: {
        connections: new Map(),
        communicationPaths: new Map(),
        redundancyLevel: 0,
        networkDiameter: 0
      },
      coverage: {
        totalArea: 0,
        coveredArea: 0,
        coveragePercentage: 0,
        redundantCoverage: 0,
        gaps: []
      },
      lastUpdated: new Date(),
      statistics: this.initializeStatistics()
    };
    
    this.interpolationCache = new Map();
    this.alertHandlers = new Map();
    this.cacheTimeouts = new Map();
  }

  /**
   * Add a virtual sensor to the network
   */
  addSensor(configuration: SensorConfiguration, physicalSensorId?: string): VirtualSensor {
    const sensor: VirtualSensor = {
      id: configuration.id,
      physicalSensorId,
      configuration,
      currentState: this.initializeSensorState(),
      healthStatus: this.initializeHealthStatus(),
      neighbors: [],
      interpolationWeights: new Map()
    };

    this.network.sensors.set(configuration.id, sensor);
    this.updateNetworkTopology();
    this.updateCoverageMap();
    this.updateStatistics();
    this.network.lastUpdated = new Date();

    return sensor;
  }

  /**
   * Remove a sensor from the network
   */
  removeSensor(sensorId: string): boolean {
    const sensor = this.network.sensors.get(sensorId);
    if (!sensor) return false;

    // Remove from topology
    this.network.topology.connections.delete(sensorId);
    this.network.topology.communicationPaths.delete(sensorId);

    // Remove references from other sensors
    for (const otherSensor of this.network.sensors.values()) {
      otherSensor.neighbors = otherSensor.neighbors.filter(id => id !== sensorId);
      otherSensor.interpolationWeights.delete(sensorId);
    }

    // Remove from network
    this.network.sensors.delete(sensorId);

    this.updateNetworkTopology();
    this.updateCoverageMap();
    this.updateStatistics();
    this.network.lastUpdated = new Date();

    return true;
  }

  /**
   * Update sensor state with new reading
   */
  updateSensorReading(sensorId: string, reading: SensorReading): void {
    const sensor = this.network.sensors.get(sensorId);
    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found in network`);
    }

    // Update sensor state
    sensor.lastReading = reading;
    sensor.currentState.lastCommunication = reading.timestamp;
    sensor.currentState.isOnline = true;

    // Add to data buffer (keep last 100 readings)
    sensor.currentState.dataBuffer.push(reading);
    if (sensor.currentState.dataBuffer.length > 100) {
      sensor.currentState.dataBuffer.shift();
    }

    // Update health status
    this.updateSensorHealth(sensor, reading);

    // Check for anomalies (after reading is added to buffer)
    this.checkForAnomalies(sensor, reading);

    // Clear interpolation cache for this sensor's area
    this.clearInterpolationCache(sensor.configuration.location);

    this.updateStatistics();
    this.network.lastUpdated = new Date();
  }

  /**
   * Synchronize with physical sensor state
   */
  synchronizeWithPhysicalSensor(sensorId: string, physicalState: {
    batteryLevel?: number;
    signalStrength?: number;
    isOnline?: boolean;
    operationalMode?: 'normal' | 'power_save' | 'maintenance' | 'error';
  }): void {
    const sensor = this.network.sensors.get(sensorId);
    if (!sensor) return;

    // Update health status
    if (physicalState.batteryLevel !== undefined) {
      sensor.healthStatus.batteryLevel = physicalState.batteryLevel;
    }
    if (physicalState.signalStrength !== undefined) {
      sensor.healthStatus.signalQuality = physicalState.signalStrength;
    }

    // Update state
    if (physicalState.isOnline !== undefined) {
      sensor.currentState.isOnline = physicalState.isOnline;
    }
    if (physicalState.operationalMode !== undefined) {
      sensor.currentState.operationalMode = physicalState.operationalMode;
    }

    // Update overall health status
    this.updateOverallHealthStatus(sensor);

    // Generate alerts if needed
    this.checkHealthAlerts(sensor);

    this.updateStatistics();
    this.network.lastUpdated = new Date();
  }

  /**
   * Perform spatial interpolation at a given location
   */
  interpolateAtLocation(query: SpatialInterpolationQuery): InterpolationResult {
    const cacheKey = this.generateInterpolationCacheKey(query);
    
    // Check cache first
    if (this.interpolationCache.has(cacheKey)) {
      return this.interpolationCache.get(cacheKey)!;
    }

    const result = this.performSpatialInterpolation(query);
    
    // Cache result for 5 minutes
    this.interpolationCache.set(cacheKey, result);
    const timeout = setTimeout(() => {
      this.interpolationCache.delete(cacheKey);
      this.cacheTimeouts.delete(cacheKey);
    }, 5 * 60 * 1000);
    this.cacheTimeouts.set(cacheKey, timeout);

    return result;
  }

  /**
   * Get sensors within a radius of a point
   */
  getSensorsInRadius(center: Point3D, radius: number): VirtualSensor[] {
    const sensors: VirtualSensor[] = [];
    
    for (const sensor of this.network.sensors.values()) {
      const distance = GeometricUtils.distance(center, sensor.configuration.location);
      if (distance <= radius) {
        sensors.push(sensor);
      }
    }

    return sensors.sort((a, b) => {
      const distA = GeometricUtils.distance(center, a.configuration.location);
      const distB = GeometricUtils.distance(center, b.configuration.location);
      return distA - distB;
    });
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics(): NetworkStatistics {
    return { ...this.network.statistics };
  }

  /**
   * Get network topology
   */
  getNetworkTopology(): NetworkTopology {
    return { ...this.network.topology };
  }

  /**
   * Get coverage map
   */
  getCoverageMap(): CoverageMap {
    return { ...this.network.coverage };
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): SensorAlert[] {
    const alerts: SensorAlert[] = [];
    
    for (const sensor of this.network.sensors.values()) {
      alerts.push(...sensor.currentState.alerts.filter(alert => !alert.acknowledged));
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    for (const sensor of this.network.sensors.values()) {
      const alert = sensor.currentState.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Register alert handler
   */
  onAlert(alertType: string, handler: (alert: SensorAlert) => void): void {
    this.alertHandlers.set(alertType, handler);
  }

  /**
   * Get sensor by ID
   */
  getSensor(sensorId: string): VirtualSensor | undefined {
    return this.network.sensors.get(sensorId);
  }

  /**
   * Get all sensors
   */
  getAllSensors(): VirtualSensor[] {
    return Array.from(this.network.sensors.values());
  }

  /**
   * Initialize sensor state
   */
  private initializeSensorState(): SensorState {
    return {
      isOnline: false,
      isCalibrated: true,
      operationalMode: 'normal',
      lastCommunication: new Date(),
      dataBuffer: [],
      alerts: []
    };
  }

  /**
   * Initialize health status
   */
  private initializeHealthStatus(): SensorHealthStatus {
    return {
      overall: 'offline',
      batteryLevel: 100,
      signalQuality: 100,
      calibrationStatus: 'valid',
      lastMaintenance: new Date(),
      nextMaintenance: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      faultCodes: []
    };
  }

  /**
   * Initialize network statistics
   */
  private initializeStatistics(): NetworkStatistics {
    return {
      totalSensors: 0,
      activeSensors: 0,
      averageSignalStrength: 0,
      averageBatteryLevel: 0,
      dataRate: 0,
      networkUptime: 100,
      alertCount: {
        info: 0,
        warning: 0,
        critical: 0
      }
    };
  }

  /**
   * Update network topology
   */
  private updateNetworkTopology(): void {
    const sensors = Array.from(this.network.sensors.values());
    
    // Clear existing topology
    this.network.topology.connections.clear();
    this.network.topology.communicationPaths.clear();

    // Build neighbor relationships based on distance
    for (const sensor of sensors) {
      const neighbors: string[] = [];
      
      for (const otherSensor of sensors) {
        if (sensor.id === otherSensor.id) continue;
        
        const distance = GeometricUtils.distance(
          sensor.configuration.location,
          otherSensor.configuration.location
        );
        
        // Consider sensors within 100m as neighbors
        if (distance <= 100) {
          neighbors.push(otherSensor.id);
        }
      }
      
      sensor.neighbors = neighbors;
      this.network.topology.connections.set(sensor.id, neighbors);
      
      // Update interpolation weights
      this.updateInterpolationWeights(sensor);
    }

    // Calculate network diameter and redundancy
    this.calculateNetworkMetrics();
  }

  /**
   * Update interpolation weights for a sensor
   */
  private updateInterpolationWeights(sensor: VirtualSensor): void {
    sensor.interpolationWeights.clear();
    
    for (const neighborId of sensor.neighbors) {
      const neighbor = this.network.sensors.get(neighborId);
      if (!neighbor) continue;
      
      const distance = GeometricUtils.distance(
        sensor.configuration.location,
        neighbor.configuration.location
      );
      
      // Inverse distance weighting
      const weight = distance > 0 ? 1 / (distance * distance) : 1;
      sensor.interpolationWeights.set(neighborId, weight);
    }
  }

  /**
   * Calculate network metrics
   */
  private calculateNetworkMetrics(): void {
    const sensors = Array.from(this.network.sensors.keys());
    let totalPaths = 0;
    let maxDiameter = 0;

    for (const sensorId of sensors) {
      const paths = this.findAllPaths(sensorId);
      totalPaths += paths.length;
      
      for (const path of paths) {
        maxDiameter = Math.max(maxDiameter, path.length - 1);
      }
    }

    this.network.topology.redundancyLevel = sensors.length > 0 ? totalPaths / sensors.length : 0;
    this.network.topology.networkDiameter = maxDiameter;
  }

  /**
   * Find all communication paths from a sensor
   */
  private findAllPaths(startSensorId: string): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();
    
    const dfs = (currentId: string, path: string[]) => {
      if (visited.has(currentId)) return;
      
      visited.add(currentId);
      path.push(currentId);
      
      const neighbors = this.network.topology.connections.get(currentId) || [];
      
      if (neighbors.length === 0) {
        paths.push([...path]);
      } else {
        for (const neighborId of neighbors) {
          dfs(neighborId, [...path]);
        }
      }
      
      visited.delete(currentId);
    };

    dfs(startSensorId, []);
    return paths;
  }

  /**
   * Update coverage map
   */
  private updateCoverageMap(): void {
    // Simplified coverage calculation
    // In a real implementation, this would use more sophisticated spatial analysis
    
    const sensors = Array.from(this.network.sensors.values());
    let totalCoverage = 0;
    
    for (const sensor of sensors) {
      // Assume each sensor covers a circular area with 50m radius
      const coverageRadius = 50;
      const area = Math.PI * coverageRadius * coverageRadius;
      totalCoverage += area;
    }

    this.network.coverage.coveredArea = totalCoverage;
    this.network.coverage.totalArea = Math.max(totalCoverage, 10000); // Minimum 1 hectare
    this.network.coverage.coveragePercentage = 
      (this.network.coverage.coveredArea / this.network.coverage.totalArea) * 100;
    
    // Identify coverage gaps (simplified)
    this.identifyCoverageGaps();
  }

  /**
   * Identify coverage gaps
   */
  private identifyCoverageGaps(): void {
    // Simplified gap identification
    // In practice, this would use spatial analysis algorithms
    
    this.network.coverage.gaps = [];
    
    // For now, just check if we have fewer than 3 sensors
    if (this.network.sensors.size < 3) {
      const gap: CoverageGap = {
        id: 'gap-1',
        area: 1000,
        center: { x: 0, y: 0, z: 0 },
        severity: 'high',
        recommendedSensorCount: 3 - this.network.sensors.size,
        suggestedLocations: [
          { x: 50, y: 50, z: 0 },
          { x: -50, y: 50, z: 0 },
          { x: 0, y: -50, z: 0 }
        ]
      };
      
      this.network.coverage.gaps.push(gap);
    }
  }

  /**
   * Update network statistics
   */
  private updateStatistics(): void {
    const sensors = Array.from(this.network.sensors.values());
    
    this.network.statistics.totalSensors = sensors.length;
    this.network.statistics.activeSensors = sensors.filter(s => s.currentState.isOnline).length;
    
    if (sensors.length > 0) {
      this.network.statistics.averageBatteryLevel = 
        sensors.reduce((sum, s) => sum + s.healthStatus.batteryLevel, 0) / sensors.length;
      
      this.network.statistics.averageSignalStrength = 
        sensors.reduce((sum, s) => sum + s.healthStatus.signalQuality, 0) / sensors.length;
    }

    // Calculate data rate (simplified)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    let recentReadings = 0;
    
    for (const sensor of sensors) {
      recentReadings += sensor.currentState.dataBuffer.filter(
        reading => reading.timestamp >= oneMinuteAgo
      ).length;
    }
    
    this.network.statistics.dataRate = recentReadings / 60; // readings per second

    // Count alerts
    const allAlerts = sensors.flatMap(s => s.currentState.alerts.filter(a => !a.acknowledged));
    this.network.statistics.alertCount = {
      info: allAlerts.filter(a => a.severity === 'info').length,
      warning: allAlerts.filter(a => a.severity === 'warning').length,
      critical: allAlerts.filter(a => a.severity === 'critical').length
    };

    // Calculate uptime
    const onlineSensors = sensors.filter(s => s.currentState.isOnline).length;
    this.network.statistics.networkUptime = sensors.length > 0 ? 
      (onlineSensors / sensors.length) * 100 : 100;
  }

  /**
   * Update sensor health based on reading
   */
  private updateSensorHealth(sensor: VirtualSensor, reading: SensorReading): void {
    if (reading.batteryLevel !== undefined) {
      sensor.healthStatus.batteryLevel = reading.batteryLevel;
    }
    
    if (reading.signalStrength !== undefined) {
      sensor.healthStatus.signalQuality = reading.signalStrength;
    }

    this.updateOverallHealthStatus(sensor);
  }

  /**
   * Update overall health status
   */
  private updateOverallHealthStatus(sensor: VirtualSensor): void {
    const health = sensor.healthStatus;
    
    if (!sensor.currentState.isOnline) {
      health.overall = 'offline';
    } else if (health.batteryLevel < 10 || health.signalQuality < 20) {
      health.overall = 'critical';
    } else if (health.batteryLevel < 30 || health.signalQuality < 50 || 
               health.calibrationStatus === 'expired') {
      health.overall = 'warning';
    } else {
      health.overall = 'healthy';
    }
  }

  /**
   * Check for measurement anomalies
   */
  private checkForAnomalies(sensor: VirtualSensor, reading: SensorReading): void {
    // Simple anomaly detection based on recent readings (excluding current reading)
    const recentReadings = sensor.currentState.dataBuffer.slice(0, -1); // Exclude current reading
    
    if (recentReadings.length < 5) return; // Need enough historical data
    
    for (const [measurementType, value] of Object.entries(reading.measurements)) {
      const recentValues = recentReadings.map(r => r.measurements[measurementType]).filter(v => v !== undefined);
      
      if (recentValues.length < 3) continue;
      
      const mean = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
      const variance = recentValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentValues.length;
      const stdDev = Math.sqrt(variance);
      
      // Check if current value is more than 3 standard deviations from mean
      // For constant values (stdDev = 0), use a threshold-based approach
      if (stdDev > 0) {
        if (Math.abs(value - mean) > 3 * stdDev) {
          this.generateAlert(sensor, {
            type: 'measurement_anomaly',
            severity: 'warning',
            message: `Anomalous ${measurementType} reading: ${value} (expected ~${mean.toFixed(2)} ±${(3 * stdDev).toFixed(2)})`
          });
        }
      } else {
        // For constant values, check if new value differs significantly from the constant
        const threshold = Math.max(Math.abs(mean) * 0.1, 1); // 10% of mean or minimum 1
        if (Math.abs(value - mean) > threshold) {
          this.generateAlert(sensor, {
            type: 'measurement_anomaly',
            severity: 'warning',
            message: `Anomalous ${measurementType} reading: ${value} (expected constant ${mean.toFixed(2)})`
          });
        }
      }
    }
  }

  /**
   * Check for health-related alerts
   */
  private checkHealthAlerts(sensor: VirtualSensor): void {
    const health = sensor.healthStatus;
    
    // Battery alerts
    if (health.batteryLevel < 10) {
      this.generateAlert(sensor, {
        type: 'battery_low',
        severity: 'critical',
        message: `Battery critically low: ${health.batteryLevel}%`
      });
    } else if (health.batteryLevel < 30) {
      this.generateAlert(sensor, {
        type: 'battery_low',
        severity: 'warning',
        message: `Battery low: ${health.batteryLevel}%`
      });
    }

    // Signal quality alerts
    if (health.signalQuality < 20) {
      this.generateAlert(sensor, {
        type: 'signal_weak',
        severity: 'critical',
        message: `Signal critically weak: ${health.signalQuality}%`
      });
    } else if (health.signalQuality < 50) {
      this.generateAlert(sensor, {
        type: 'signal_weak',
        severity: 'warning',
        message: `Signal weak: ${health.signalQuality}%`
      });
    }

    // Calibration alerts
    if (health.calibrationStatus === 'expired') {
      this.generateAlert(sensor, {
        type: 'calibration_expired',
        severity: 'warning',
        message: 'Sensor calibration has expired'
      });
    }

    // Communication alerts
    const timeSinceLastComm = Date.now() - sensor.currentState.lastCommunication.getTime();
    if (timeSinceLastComm > 5 * 60 * 1000) { // 5 minutes
      this.generateAlert(sensor, {
        type: 'communication_lost',
        severity: 'critical',
        message: `No communication for ${Math.round(timeSinceLastComm / 60000)} minutes`
      });
    }
  }

  /**
   * Generate an alert
   */
  private generateAlert(sensor: VirtualSensor, alertData: {
    type: SensorAlert['type'];
    severity: SensorAlert['severity'];
    message: string;
  }): void {
    const alert: SensorAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sensorId: sensor.id,
      type: alertData.type,
      severity: alertData.severity,
      message: alertData.message,
      timestamp: new Date(),
      acknowledged: false
    };

    // Check if similar alert already exists
    const existingAlert = sensor.currentState.alerts.find(
      a => a.type === alert.type && !a.acknowledged && !a.resolvedAt
    );

    if (!existingAlert) {
      sensor.currentState.alerts.push(alert);
      
      // Call alert handler if registered
      const handler = this.alertHandlers.get(alert.type);
      if (handler) {
        handler(alert);
      }
    }
  }

  /**
   * Perform spatial interpolation
   */
  private performSpatialInterpolation(query: SpatialInterpolationQuery): InterpolationResult {
    const nearbySensors = this.getSensorsInRadius(
      query.location, 
      query.maxDistance || 200
    );

    // Filter sensors that have the requested measurement type
    const validSensors = nearbySensors.filter(sensor => {
      return sensor.lastReading && 
             sensor.lastReading.measurements[query.measurementType] !== undefined &&
             sensor.currentState.isOnline;
    });

    if (validSensors.length === 0) {
      return {
        estimatedValue: 0,
        confidence: 0,
        contributingSensors: [],
        interpolationMethod: 'nearest'
      };
    }

    // Use inverse distance weighting
    const method = query.method || 'idw';
    
    switch (method) {
      case 'idw':
        return this.inverseDistanceWeighting(query, validSensors);
      case 'nearest':
        return this.nearestNeighborInterpolation(query, validSensors);
      default:
        return this.inverseDistanceWeighting(query, validSensors);
    }
  }

  /**
   * Inverse distance weighting interpolation
   */
  private inverseDistanceWeighting(
    query: SpatialInterpolationQuery, 
    sensors: VirtualSensor[]
  ): InterpolationResult {
    const contributingSensors = sensors.map(sensor => {
      const distance = GeometricUtils.distance(query.location, sensor.configuration.location);
      const value = sensor.lastReading!.measurements[query.measurementType];
      const weight = distance > 0 ? 1 / (distance * distance) : 1;
      
      return { sensorId: sensor.id, weight, distance, value };
    });

    const totalWeight = contributingSensors.reduce((sum, s) => sum + s.weight, 0);
    const estimatedValue = contributingSensors.reduce(
      (sum, s) => sum + (s.value * s.weight), 0
    ) / totalWeight;

    // Calculate confidence based on number of sensors and distances
    const avgDistance = contributingSensors.reduce((sum, s) => sum + s.distance, 0) / contributingSensors.length;
    const confidence = Math.max(0, Math.min(1, 
      (contributingSensors.length / 5) * (1 - avgDistance / 200)
    ));

    return {
      estimatedValue,
      confidence,
      contributingSensors,
      interpolationMethod: 'idw'
    };
  }

  /**
   * Nearest neighbor interpolation
   */
  private nearestNeighborInterpolation(
    query: SpatialInterpolationQuery, 
    sensors: VirtualSensor[]
  ): InterpolationResult {
    const nearest = sensors[0]; // Already sorted by distance
    const distance = GeometricUtils.distance(query.location, nearest.configuration.location);
    const value = nearest.lastReading!.measurements[query.measurementType];

    return {
      estimatedValue: value,
      confidence: Math.max(0, 1 - distance / 100), // Confidence decreases with distance
      contributingSensors: [{
        sensorId: nearest.id,
        weight: 1,
        distance,
        value
      }],
      interpolationMethod: 'nearest'
    };
  }

  /**
   * Generate cache key for interpolation
   */
  private generateInterpolationCacheKey(query: SpatialInterpolationQuery): string {
    const location = `${query.location.x.toFixed(1)},${query.location.y.toFixed(1)},${query.location.z.toFixed(1)}`;
    const timestamp = query.timestamp ? query.timestamp.getTime() : Date.now();
    return `${location}-${query.measurementType}-${Math.floor(timestamp / 60000)}`; // 1-minute cache
  }

  /**
   * Clear interpolation cache around a location
   */
  private clearInterpolationCache(location: Point3D): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.interpolationCache.keys()) {
      const [locationPart] = key.split('-');
      const [x, y, z] = locationPart.split(',').map(Number);
      const keyLocation = { x, y, z };
      
      const distance = GeometricUtils.distance(location, keyLocation);
      if (distance <= 100) { // Clear cache within 100m
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.interpolationCache.delete(key);
      const timeout = this.cacheTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.cacheTimeouts.delete(key);
      }
    });
  }

  /**
   * Cleanup method to clear all timeouts
   */
  cleanup(): void {
    // Clear all cache timeouts
    for (const timeout of this.cacheTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.cacheTimeouts.clear();
    this.interpolationCache.clear();
  }
}