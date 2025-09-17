import { SensorReading, EdgeAIResult } from '../types';

export class EdgeAIEngine {
  private modelWeights: number[][][] = [];
  private featureScalers: { mean: number; std: number }[] = [];
  private anomalyThreshold: number = 0.7;
  private historicalData: SensorReading[] = [];
  private maxHistorySize: number = 100;

  constructor() {
    this.initializeLightweightModel();
  }

  private initializeLightweightModel(): void {
    // Initialize a simple neural network for anomaly detection
    // This is a lightweight model suitable for ESP32/edge deployment
    
    // Input layer: 13 features (sensor measurements)
    // Hidden layer: 8 neurons
    // Output layer: 1 neuron (anomaly score)
    
    // Initialize weights with small random values
    this.modelWeights = [
      // Input to hidden layer weights (8 neurons x 13 inputs)
      Array(8).fill(0).map(() => Array(13).fill(0).map(() => (Math.random() - 0.5) * 0.1)),
      // Hidden to output layer weights (1 neuron x 8 inputs)
      Array(1).fill(0).map(() => Array(8).fill(0).map(() => (Math.random() - 0.5) * 0.1))
    ];

    // Initialize feature scalers (mean and std for normalization)
    this.featureScalers = [
      { mean: 0.0, std: 0.1 },    // tilt_x
      { mean: 0.0, std: 0.1 },    // tilt_y
      { mean: 0.0, std: 0.1 },    // tilt_z
      { mean: 0.0, std: 2.0 },    // accel_x
      { mean: 0.0, std: 2.0 },    // accel_y
      { mean: 9.81, std: 2.0 },   // accel_z
      { mean: 0.0, std: 0.01 },   // gyro_x
      { mean: 0.0, std: 0.01 },   // gyro_y
      { mean: 0.0, std: 0.01 },   // gyro_z
      { mean: 125.0, std: 25.0 }, // pore_pressure
      { mean: 20.0, std: 10.0 },  // temperature
      { mean: 60.0, std: 20.0 },  // humidity
      { mean: 50.0, std: 25.0 }   // strain_gauge
    ];
  }

  async detectAnomaly(sensorReading: SensorReading): Promise<EdgeAIResult> {
    // Extract features from sensor reading
    const features = this.extractFeatures(sensorReading);
    
    // Normalize features
    const normalizedFeatures = this.normalizeFeatures(features);
    
    // Run lightweight neural network inference
    const anomalyScore = this.runInference(normalizedFeatures);
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(anomalyScore);
    
    // Calculate confidence based on historical data consistency
    const confidence = this.calculateConfidence(sensorReading, anomalyScore);
    
    // Generate explanation
    const explanation = this.generateExplanation(features, anomalyScore, riskLevel);
    
    // Update historical data
    this.updateHistoricalData(sensorReading);
    
    return {
      anomalyScore,
      riskLevel,
      confidence,
      features: normalizedFeatures,
      explanation,
      timestamp: Date.now()
    };
  }

  private extractFeatures(reading: SensorReading): number[] {
    const { measurements } = reading;
    
    return [
      measurements.tilt_x,
      measurements.tilt_y,
      measurements.tilt_z,
      measurements.accel_x,
      measurements.accel_y,
      measurements.accel_z,
      measurements.gyro_x,
      measurements.gyro_y,
      measurements.gyro_z,
      measurements.pore_pressure,
      measurements.temperature,
      measurements.humidity,
      measurements.strain_gauge
    ];
  }

  private normalizeFeatures(features: number[]): number[] {
    return features.map((feature, index) => {
      const scaler = this.featureScalers[index];
      return (feature - scaler.mean) / scaler.std;
    });
  }

  private runInference(normalizedFeatures: number[]): number {
    // Forward pass through the lightweight neural network
    
    // Input to hidden layer
    const hiddenLayer = this.modelWeights[0].map((hiddenWeights: number[]) => {
      const sum = hiddenWeights.reduce((acc: number, weight: number, index: number) => 
        acc + weight * normalizedFeatures[index], 0);
      return this.relu(sum); // ReLU activation
    });
    
    // Hidden to output layer
    const output = this.modelWeights[1][0].reduce((acc: number, weight: number, index: number) => 
      acc + weight * hiddenLayer[index], 0);
    
    // Sigmoid activation for anomaly score (0-1)
    return this.sigmoid(output);
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private determineRiskLevel(anomalyScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (anomalyScore < 0.3) return 'low';
    if (anomalyScore < 0.6) return 'medium';
    if (anomalyScore < 0.8) return 'high';
    return 'critical';
  }

  private calculateConfidence(reading: SensorReading, anomalyScore: number): number {
    // Calculate confidence based on:
    // 1. Data quality flags
    // 2. Historical consistency
    // 3. Signal strength
    
    let confidence = 1.0;
    
    // Reduce confidence for invalid sensor readings
    const qualityFlags = reading.qualityFlags;
    const validFlags = Object.values(qualityFlags).filter(flag => flag).length;
    const totalFlags = Object.values(qualityFlags).length;
    confidence *= validFlags / totalFlags;
    
    // Reduce confidence for poor signal strength
    const signalStrengthFactor = Math.max(0, (reading.signalStrength + 100) / 40); // -100 to -60 dBm
    confidence *= Math.min(1.0, signalStrengthFactor);
    
    // Reduce confidence for low battery
    const batteryFactor = Math.max(0.5, reading.batteryLevel / 100);
    confidence *= batteryFactor;
    
    // Historical consistency check
    if (this.historicalData.length > 5) {
      const recentAnomalies = this.historicalData.slice(-5);
      const avgAnomaly = recentAnomalies.reduce((sum, data) => sum + (data as any).anomalyScore || 0, 0) / recentAnomalies.length;
      const deviation = Math.abs(anomalyScore - avgAnomaly);
      if (deviation > 0.3) confidence *= 0.8; // Reduce confidence for sudden changes
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private generateExplanation(features: number[], anomalyScore: number, riskLevel: string): string {
    const explanations: string[] = [];
    
    // Check for significant deviations in key features
    if (Math.abs(features[0]) > 2 || Math.abs(features[1]) > 2) {
      explanations.push('Significant tilt detected');
    }
    
    if (Math.abs(features[3]) > 2 || Math.abs(features[4]) > 2) {
      explanations.push('Unusual horizontal acceleration');
    }
    
    if (features[9] > 2) { // Normalized pore pressure
      explanations.push('Elevated pore pressure');
    }
    
    if (features[12] > 2) { // Normalized strain
      explanations.push('High strain measurements');
    }
    
    if (explanations.length === 0) {
      if (riskLevel === 'low') {
        explanations.push('All parameters within normal range');
      } else {
        explanations.push('Subtle pattern anomaly detected');
      }
    }
    
    return `Risk Level: ${riskLevel.toUpperCase()} (Score: ${anomalyScore.toFixed(3)}). ${explanations.join(', ')}.`;
  }

  private updateHistoricalData(reading: SensorReading): void {
    this.historicalData.push(reading);
    
    // Keep only recent history to manage memory
    if (this.historicalData.length > this.maxHistorySize) {
      this.historicalData = this.historicalData.slice(-this.maxHistorySize);
    }
  }

  updateModelWeights(newWeights: number[][][]): void {
    // Allow over-the-air model updates
    if (this.validateModelWeights(newWeights)) {
      this.modelWeights = newWeights;
    }
  }

  private validateModelWeights(weights: number[][][]): boolean {
    // Basic validation of model structure
    if (weights.length !== 2) return false;
    if (weights[0].length !== 8 || weights[0][0].length !== 13) return false;
    if (weights[1].length !== 1 || weights[1][0].length !== 8) return false;
    
    // Check for reasonable weight values
    for (const layer of weights) {
      for (const neuron of layer) {
        for (const weight of neuron) {
          if (Math.abs(weight) > 10) return false; // Weights too large
        }
      }
    }
    
    return true;
  }

  updateFeatureScalers(newScalers: { mean: number; std: number }[]): void {
    if (newScalers.length === this.featureScalers.length) {
      this.featureScalers = newScalers;
    }
  }

  setAnomalyThreshold(threshold: number): void {
    this.anomalyThreshold = Math.max(0.1, Math.min(0.9, threshold));
  }

  getModelInfo(): { 
    weightsSize: number; 
    historySize: number; 
    threshold: number;
    memoryUsage: number;
  } {
    const weightsSize = this.modelWeights.reduce((total, layer) => 
      total + layer.reduce((layerTotal, neuron) => layerTotal + neuron.length, 0), 0);
    
    return {
      weightsSize,
      historySize: this.historicalData.length,
      threshold: this.anomalyThreshold,
      memoryUsage: weightsSize * 4 + this.historicalData.length * 200 // Rough estimate in bytes
    };
  }

  // Method for local decision making
  shouldTriggerImmediateAlert(result: EdgeAIResult): boolean {
    return result.riskLevel === 'critical' && result.confidence > 0.7;
  }

  shouldIncreaseTransmissionFrequency(result: EdgeAIResult): boolean {
    return result.riskLevel === 'high' || (result.riskLevel === 'medium' && result.confidence > 0.8);
  }

  shouldEnterLowPowerMode(result: EdgeAIResult): boolean {
    return result.riskLevel === 'low' && result.confidence > 0.9;
  }
}