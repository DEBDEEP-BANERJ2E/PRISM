import { TimeSeriesData } from './DataPreprocessor';

export interface SyntheticDataConfig {
  // Physics simulation parameters
  slope_angle: number; // degrees
  rock_density: number; // kg/m³
  friction_coefficient: number;
  cohesion: number; // Pa
  joint_spacing: number; // meters
  weathering_factor: number; // 0-1
  
  // Environmental parameters
  rainfall_intensity: number; // mm/h
  temperature_variation: number; // °C
  freeze_thaw_cycles: number;
  
  // Temporal parameters
  duration_hours: number;
  sampling_rate_minutes: number;
  
  // Noise parameters
  noise_level: number; // 0-1
  measurement_error: number; // percentage
  
  // Failure scenario
  failure_probability: number; // 0-1
  failure_time_hours?: number; // If specified, failure occurs at this time
}

export interface PhysicsParameters {
  gravity: number;
  water_density: number;
  air_density: number;
  elastic_modulus: number; // Pa
  poisson_ratio: number;
}

export interface SyntheticDataResult {
  displacement_data: TimeSeriesData[];
  strain_data: TimeSeriesData[];
  tilt_data: TimeSeriesData[];
  pore_pressure_data: TimeSeriesData[];
  temperature_data: TimeSeriesData[];
  metadata: {
    config: SyntheticDataConfig;
    physics_params: PhysicsParameters;
    failure_occurred: boolean;
    failure_time?: Date;
    generation_time_ms: number;
  };
}

export class SyntheticDataGenerator {
  private readonly physics: PhysicsParameters;

  constructor() {
    this.physics = {
      gravity: 9.81, // m/s²
      water_density: 1000, // kg/m³
      air_density: 1.225, // kg/m³
      elastic_modulus: 50e9, // Pa (typical rock)
      poisson_ratio: 0.25
    };
  }

  /**
   * Generate synthetic sensor data based on physics simulation
   */
  public generateSyntheticData(config: SyntheticDataConfig): SyntheticDataResult {
    const startTime = Date.now();
    
    this.validateConfig(config);
    
    const timePoints = this.generateTimePoints(config);
    const baseTime = new Date();
    
    // Generate environmental conditions
    const environmentalConditions = this.generateEnvironmentalConditions(config, timePoints);
    
    // Generate physics-based responses
    const displacementData = this.generateDisplacementData(config, timePoints, environmentalConditions, baseTime);
    const strainData = this.generateStrainData(config, timePoints, environmentalConditions, baseTime);
    const tiltData = this.generateTiltData(config, timePoints, environmentalConditions, baseTime);
    const porePressureData = this.generatePorePressureData(config, timePoints, environmentalConditions, baseTime);
    const temperatureData = this.generateTemperatureData(config, timePoints, environmentalConditions, baseTime);
    
    // Determine if failure occurred
    const failureResult = this.simulateFailure(config, timePoints, baseTime);
    
    const generationTime = Date.now() - startTime;

    return {
      displacement_data: displacementData,
      strain_data: strainData,
      tilt_data: tiltData,
      pore_pressure_data: porePressureData,
      temperature_data: temperatureData,
      metadata: {
        config,
        physics_params: this.physics,
        failure_occurred: failureResult.occurred,
        ...(failureResult.time && { failure_time: failureResult.time }),
        generation_time_ms: generationTime
      }
    };
  }

  /**
   * Generate time points for simulation
   */
  private generateTimePoints(config: SyntheticDataConfig): number[] {
    const totalMinutes = config.duration_hours * 60;
    const numPoints = Math.floor(totalMinutes / config.sampling_rate_minutes) + 1;
    
    const timePoints: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      timePoints.push(i * config.sampling_rate_minutes / 60); // Convert to hours
    }
    
    return timePoints;
  }

  /**
   * Generate environmental conditions over time
   */
  private generateEnvironmentalConditions(config: SyntheticDataConfig, timePoints: number[]): {
    rainfall: number[];
    temperature: number[];
    pore_pressure_factor: number[];
  } {
    const rainfall: number[] = [];
    const temperature: number[] = [];
    const porePressureFactor: number[] = [];
    
    for (let i = 0; i < timePoints.length; i++) {
      const t = timePoints[i];
      
      // Rainfall pattern (can be constant or variable)
      const rainfallValue = config.rainfall_intensity * (1 + 0.3 * Math.sin(t * 2 * Math.PI / 24)); // Daily cycle
      rainfall.push(Math.max(0, rainfallValue));
      
      // Temperature variation
      const baseTemp = 20; // °C
      const dailyCycle = config.temperature_variation * Math.sin(t * 2 * Math.PI / 24);
      const seasonalCycle = config.temperature_variation * 0.5 * Math.sin(t * 2 * Math.PI / (24 * 365));
      temperature.push(baseTemp + dailyCycle + seasonalCycle);
      
      // Pore pressure factor based on rainfall accumulation
      const rainfallAccumulation = this.calculateRainfallAccumulation(rainfall, i);
      const poreFactor = Math.min(1, rainfallAccumulation / 100); // Normalize to 0-1
      porePressureFactor.push(poreFactor);
    }
    
    return { rainfall, temperature, pore_pressure_factor: porePressureFactor };
  }

  /**
   * Calculate cumulative rainfall with decay
   */
  private calculateRainfallAccumulation(rainfall: number[], currentIndex: number): number {
    let accumulation = 0;
    const decayFactor = 0.95; // Daily decay
    
    for (let i = 0; i <= currentIndex; i++) {
      const age = currentIndex - i;
      accumulation += rainfall[i] * Math.pow(decayFactor, age);
    }
    
    return accumulation;
  }

  /**
   * Generate displacement data using physics-based model
   */
  private generateDisplacementData(
    config: SyntheticDataConfig,
    timePoints: number[],
    environment: any,
    baseTime: Date
  ): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    let cumulativeDisplacement = 0;
    
    for (let i = 0; i < timePoints.length; i++) {
      const t = timePoints[i];
      
      // Calculate driving forces
      const gravitationalForce = this.calculateGravitationalForce(config);
      const poreWaterPressure = this.calculatePoreWaterPressure(config, environment.pore_pressure_factor[i]);
      const thermalStress = this.calculateThermalStress(config, environment.temperature[i]);
      
      // Calculate resisting forces
      const cohesiveForce = this.calculateCohesiveForce(config);
      const frictionForce = this.calculateFrictionForce(config, poreWaterPressure);
      
      // Net force and displacement increment
      const netForce = gravitationalForce + poreWaterPressure + thermalStress - cohesiveForce - frictionForce;
      const displacementIncrement = this.calculateDisplacementIncrement(netForce, config.sampling_rate_minutes);
      
      // Apply weathering degradation
      const weatheringFactor = 1 - config.weathering_factor * (t / config.duration_hours);
      cumulativeDisplacement += displacementIncrement * weatheringFactor;
      
      // Add noise
      const noise = this.addNoise(cumulativeDisplacement, config.noise_level);
      const finalValue = cumulativeDisplacement + noise;
      
      data.push({
        timestamp: new Date(baseTime.getTime() + t * 60 * 60 * 1000),
        value: Math.max(0, finalValue), // Displacement can't be negative
        quality: this.calculateMeasurementQuality(config.measurement_error),
        sensor_id: 'synthetic_displacement',
        measurement_type: 'displacement'
      });
    }
    
    return data;
  }

  /**
   * Generate strain data based on displacement
   */
  private generateStrainData(
    config: SyntheticDataConfig,
    timePoints: number[],
    environment: any,
    baseTime: Date
  ): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    
    for (let i = 0; i < timePoints.length; i++) {
      const t = timePoints[i];
      
      // Strain is related to stress and elastic modulus
      const stress = this.calculateStress(config, environment.pore_pressure_factor[i]);
      const strain = stress / this.physics.elastic_modulus;
      
      // Add thermal strain
      const thermalStrain = this.calculateThermalStrain(environment.temperature[i]);
      const totalStrain = strain + thermalStrain;
      
      // Add noise
      const noise = this.addNoise(totalStrain, config.noise_level);
      const finalValue = totalStrain + noise;
      
      data.push({
        timestamp: new Date(baseTime.getTime() + t * 60 * 60 * 1000),
        value: finalValue,
        quality: this.calculateMeasurementQuality(config.measurement_error),
        sensor_id: 'synthetic_strain',
        measurement_type: 'strain'
      });
    }
    
    return data;
  }

  /**
   * Generate tilt data based on slope deformation
   */
  private generateTiltData(
    config: SyntheticDataConfig,
    timePoints: number[],
    environment: any,
    baseTime: Date
  ): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    let cumulativeTilt = 0;
    
    for (let i = 0; i < timePoints.length; i++) {
      const t = timePoints[i];
      
      // Tilt is related to differential displacement
      const slopeInstability = this.calculateSlopeInstability(config, environment.pore_pressure_factor[i]);
      const tiltIncrement = slopeInstability * config.sampling_rate_minutes / 60;
      
      cumulativeTilt += tiltIncrement;
      
      // Add noise
      const noise = this.addNoise(cumulativeTilt, config.noise_level);
      const finalValue = cumulativeTilt + noise;
      
      data.push({
        timestamp: new Date(baseTime.getTime() + t * 60 * 60 * 1000),
        value: finalValue,
        quality: this.calculateMeasurementQuality(config.measurement_error),
        sensor_id: 'synthetic_tilt',
        measurement_type: 'tilt'
      });
    }
    
    return data;
  }

  /**
   * Generate pore pressure data
   */
  private generatePorePressureData(
    config: SyntheticDataConfig,
    timePoints: number[],
    environment: any,
    baseTime: Date
  ): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    
    for (let i = 0; i < timePoints.length; i++) {
      const t = timePoints[i];
      
      // Base pore pressure
      const basePressure = 10000; // Pa
      const pressureIncrease = environment.pore_pressure_factor[i] * 50000; // Up to 50 kPa increase
      
      // Add drainage effects
      const drainageEffect = Math.exp(-t / 24); // Exponential decay over 24 hours
      const totalPressure = basePressure + pressureIncrease * drainageEffect;
      
      // Add noise
      const noise = this.addNoise(totalPressure, config.noise_level);
      const finalValue = totalPressure + noise;
      
      data.push({
        timestamp: new Date(baseTime.getTime() + t * 60 * 60 * 1000),
        value: Math.max(0, finalValue),
        quality: this.calculateMeasurementQuality(config.measurement_error),
        sensor_id: 'synthetic_pore_pressure',
        measurement_type: 'pore_pressure'
      });
    }
    
    return data;
  }

  /**
   * Generate temperature data
   */
  private generateTemperatureData(
    config: SyntheticDataConfig,
    timePoints: number[],
    environment: any,
    baseTime: Date
  ): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    
    for (let i = 0; i < timePoints.length; i++) {
      const t = timePoints[i];
      
      const temperature = environment.temperature[i];
      
      // Add noise
      const noise = this.addNoise(temperature, config.noise_level * 0.1); // Less noise for temperature
      const finalValue = temperature + noise;
      
      data.push({
        timestamp: new Date(baseTime.getTime() + t * 60 * 60 * 1000),
        value: finalValue,
        quality: this.calculateMeasurementQuality(config.measurement_error),
        sensor_id: 'synthetic_temperature',
        measurement_type: 'temperature'
      });
    }
    
    return data;
  }

  /**
   * Physics calculations
   */
  private calculateGravitationalForce(config: SyntheticDataConfig): number {
    const slopeRadians = config.slope_angle * Math.PI / 180;
    return config.rock_density * this.physics.gravity * Math.sin(slopeRadians);
  }

  private calculatePoreWaterPressure(_config: SyntheticDataConfig, poreFactor: number): number {
    return poreFactor * this.physics.water_density * this.physics.gravity * 10; // Assume 10m water column
  }

  private calculateThermalStress(_config: SyntheticDataConfig, temperature: number): number {
    const thermalExpansion = 1e-5; // Typical rock thermal expansion coefficient
    const referenceTemp = 20; // °C
    return thermalExpansion * (temperature - referenceTemp) * this.physics.elastic_modulus * 0.001;
  }

  private calculateCohesiveForce(config: SyntheticDataConfig): number {
    return config.cohesion * config.joint_spacing;
  }

  private calculateFrictionForce(config: SyntheticDataConfig, poreWaterPressure: number): number {
    const normalStress = config.rock_density * this.physics.gravity * Math.cos(config.slope_angle * Math.PI / 180);
    const effectiveStress = normalStress - poreWaterPressure;
    return config.friction_coefficient * Math.max(0, effectiveStress);
  }

  private calculateDisplacementIncrement(netForce: number, timeStepMinutes: number): number {
    // Simplified displacement calculation (would use proper numerical integration in practice)
    const acceleration = Math.max(0, netForce / 1000); // Simplified mass assumption, ensure positive
    const timeStepSeconds = timeStepMinutes * 60;
    const baseIncrement = 0.5 * acceleration * timeStepSeconds * timeStepSeconds * 1000; // Convert to mm
    
    // Add minimum displacement increment to ensure some movement
    return Math.max(0.001, baseIncrement); // At least 0.001mm per time step
  }

  private calculateStress(config: SyntheticDataConfig, poreFactor: number): number {
    const gravitationalStress = config.rock_density * this.physics.gravity * 10; // Assume 10m depth
    const poreWaterStress = poreFactor * this.physics.water_density * this.physics.gravity * 10;
    return gravitationalStress + poreWaterStress;
  }

  private calculateThermalStrain(temperature: number): number {
    const thermalExpansion = 1e-5;
    const referenceTemp = 20;
    return thermalExpansion * (temperature - referenceTemp);
  }

  private calculateSlopeInstability(config: SyntheticDataConfig, poreFactor: number): number {
    const stabilityFactor = this.calculateStabilityFactor(config, poreFactor);
    return Math.max(0, 1 - stabilityFactor) * 0.1; // Convert to tilt increment
  }

  private calculateStabilityFactor(config: SyntheticDataConfig, poreFactor: number): number {
    const drivingForce = this.calculateGravitationalForce(config) + this.calculatePoreWaterPressure(config, poreFactor);
    const resistingForce = this.calculateCohesiveForce(config) + this.calculateFrictionForce(config, this.calculatePoreWaterPressure(config, poreFactor));
    
    return resistingForce / Math.max(drivingForce, 1);
  }

  /**
   * Simulate failure occurrence
   */
  private simulateFailure(config: SyntheticDataConfig, _timePoints: number[], baseTime: Date): { occurred: boolean; time?: Date } {
    if (config.failure_time_hours !== undefined) {
      // Deterministic failure at specified time
      if (config.failure_time_hours <= config.duration_hours) {
        return {
          occurred: true,
          time: new Date(baseTime.getTime() + config.failure_time_hours * 60 * 60 * 1000)
        };
      }
    } else if (Math.random() < config.failure_probability) {
      // Random failure time
      const failureTime = Math.random() * config.duration_hours;
      return {
        occurred: true,
        time: new Date(baseTime.getTime() + failureTime * 60 * 60 * 1000)
      };
    }
    
    return { occurred: false };
  }

  /**
   * Add noise to measurements
   */
  private addNoise(value: number, noiseLevel: number): number {
    const noiseAmplitude = Math.abs(value) * noiseLevel;
    return (Math.random() - 0.5) * 2 * noiseAmplitude;
  }

  /**
   * Calculate measurement quality based on error
   */
  private calculateMeasurementQuality(measurementError: number): number {
    const baseQuality = 1 - measurementError;
    const randomVariation = (Math.random() - 0.5) * 0.2; // ±10% variation
    return Math.max(0, Math.min(1, baseQuality + randomVariation));
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: SyntheticDataConfig): void {
    if (config.slope_angle < 0 || config.slope_angle > 90) {
      throw new Error('Slope angle must be between 0 and 90 degrees');
    }
    
    if (config.rock_density <= 0) {
      throw new Error('Rock density must be positive');
    }
    
    if (config.friction_coefficient < 0 || config.friction_coefficient > 1) {
      throw new Error('Friction coefficient must be between 0 and 1');
    }
    
    if (config.duration_hours <= 0) {
      throw new Error('Duration must be positive');
    }
    
    if (config.sampling_rate_minutes <= 0) {
      throw new Error('Sampling rate must be positive');
    }
    
    if (config.failure_probability < 0 || config.failure_probability > 1) {
      throw new Error('Failure probability must be between 0 and 1');
    }
  }

  /**
   * Generate batch of synthetic datasets with variations
   */
  public generateBatchSyntheticData(
    baseConfig: SyntheticDataConfig,
    variations: Partial<SyntheticDataConfig>[],
    count: number
  ): SyntheticDataResult[] {
    const results: SyntheticDataResult[] = [];
    
    for (let i = 0; i < count; i++) {
      // Apply random variation if provided
      const variation = variations[i % variations.length] || {};
      const config = { ...baseConfig, ...variation };
      
      // Add some randomness to parameters
      config.noise_level *= (0.8 + Math.random() * 0.4); // ±20% variation
      config.measurement_error *= (0.8 + Math.random() * 0.4);
      config.weathering_factor *= (0.5 + Math.random() * 1.0); // 0.5x to 1.5x variation
      
      results.push(this.generateSyntheticData(config));
    }
    
    return results;
  }
}