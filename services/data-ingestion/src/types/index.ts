import { SensorReading } from '@prism/shared-models';

export interface DataIngestionResult {
  success: boolean;
  recordsProcessed: number;
  recordsValid: number;
  recordsInvalid: number;
  errors: string[];
  processingTimeMs: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
}

export interface LoRaWANUplink {
  applicationID: string;
  applicationName: string;
  deviceName: string;
  devEUI: string;
  rxInfo: Array<{
    gatewayID: string;
    rssi: number;
    loRaSNR: number;
    location?: {
      latitude: number;
      longitude: number;
      altitude: number;
    };
  }>;
  txInfo: {
    frequency: number;
    dr: number;
  };
  adr: boolean;
  fCnt: number;
  fPort: number;
  data: string; // Base64 encoded payload
  object?: any; // Decoded payload object
  tags?: Record<string, string>;
  confirmedUplink?: boolean;
  devAddr?: string;
}

export interface MQTTMessage {
  topic: string;
  payload: Buffer;
  qos: number;
  retain: boolean;
  timestamp: Date;
}

export interface BatchUploadRequest {
  format: 'csv' | 'json' | 'xml';
  data: string | Buffer;
  metadata?: {
    source: string;
    description?: string;
    tags?: Record<string, string>;
  };
}

export interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  averageQualityScore: number;
  batteryLowCount: number;
  communicationErrorCount: number;
  staleDataCount: number;
  duplicateCount: number;
}

export interface IngestionStats {
  timestamp: Date;
  source: 'mqtt' | 'lorawan' | 'http' | 'batch';
  recordsReceived: number;
  recordsProcessed: number;
  recordsRejected: number;
  averageProcessingTimeMs: number;
  errorRate: number;
  qualityMetrics: DataQualityMetrics;
}