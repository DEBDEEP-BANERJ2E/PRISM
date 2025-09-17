import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { SensorReading, SensorReadingInput } from '@prism/shared-models';
import { config } from '../config';
import { DataValidator } from './DataValidator';
import { KafkaProducer } from './KafkaProducer';
import { BatchUploadRequest, DataIngestionResult, IngestionStats } from '../types';
import logger from '../utils/logger';

export class HTTPIngestionService {
  private dataValidator: DataValidator;
  private kafkaProducer: KafkaProducer;
  private upload: multer.Multer;
  private stats: IngestionStats[] = [];

  constructor(dataValidator: DataValidator, kafkaProducer: KafkaProducer) {
    this.dataValidator = dataValidator;
    this.kafkaProducer = kafkaProducer;

    // Configure multer for file uploads
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: config.validation.maxFileSize,
        files: 10 // Maximum 10 files per request
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = config.validation.allowedFileTypes;
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        
        if (fileExtension && allowedTypes.includes(fileExtension)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
        }
      }
    });
  }

  /**
   * Create Express router for HTTP ingestion endpoints
   */
  public createRouter(): express.Router {
    const router = express.Router();

    // Single sensor reading endpoint
    router.post('/sensor-reading', this.handleSingleSensorReading.bind(this));

    // Batch sensor readings endpoint
    router.post('/sensor-readings/batch', this.handleBatchSensorReadings.bind(this));

    // File upload endpoint
    router.post('/upload', this.upload.array('files'), this.handleFileUpload.bind(this));

    // CSV upload endpoint
    router.post('/upload/csv', this.upload.single('file'), this.handleCSVUpload.bind(this));

    // JSON upload endpoint
    router.post('/upload/json', this.upload.single('file'), this.handleJSONUpload.bind(this));

    // Bulk data endpoint (for large payloads)
    router.post('/bulk', express.raw({ limit: '100mb', type: 'application/octet-stream' }), this.handleBulkData.bind(this));

    // Health check endpoint
    router.get('/health', this.handleHealthCheck.bind(this));

    // Statistics endpoint
    router.get('/stats', this.handleStatsRequest.bind(this));

    return router;
  }

  /**
   * Handle single sensor reading submission
   */
  private async handleSingleSensorReading(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    let recordsReceived = 1;
    let recordsProcessed = 0;
    let recordsRejected = 0;

    try {
      const sensorData = req.body;

      // Add processing timestamp
      const enrichedData: SensorReadingInput = {
        ...sensorData,
        timestamp: sensorData.timestamp ? new Date(sensorData.timestamp) : new Date(),
        processing_timestamp: new Date()
      };

      // Validate the sensor reading
      const validation = this.dataValidator.validateSensorReading(enrichedData);

      if (validation.isValid) {
        const sensorReading = new SensorReading(enrichedData);
        await this.kafkaProducer.sendSensorReadings([sensorReading]);
        recordsProcessed = 1;

        logger.info('Processed single sensor reading via HTTP', {
          sensorId: sensorReading.sensor_id,
          qualityScore: validation.qualityScore.toFixed(2)
        });

        res.status(200).json({
          status: 'success',
          message: 'Sensor reading processed successfully',
          sensorId: sensorReading.sensor_id,
          qualityScore: validation.qualityScore,
          warnings: validation.warnings
        });
      } else {
        recordsRejected = 1;
        logger.warn('Invalid sensor reading submitted via HTTP', {
          errors: validation.errors,
          warnings: validation.warnings
        });

        res.status(400).json({
          status: 'error',
          message: 'Invalid sensor reading',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

    } catch (error) {
      recordsRejected = recordsReceived;
      logger.error('Error processing single sensor reading', { error });
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      const processingTime = Date.now() - startTime;
      this.recordStats('http', recordsReceived, recordsProcessed, recordsRejected, processingTime);
    }
  }

  /**
   * Handle batch sensor readings submission
   */
  private async handleBatchSensorReadings(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    let recordsReceived = 0;
    let recordsProcessed = 0;
    let recordsRejected = 0;

    try {
      const { readings } = req.body;

      if (!Array.isArray(readings)) {
        res.status(400).json({ error: 'Readings must be an array' });
        return;
      }

      if (readings.length > config.validation.maxBatchSize) {
        res.status(400).json({ 
          error: `Batch size exceeds maximum allowed (${config.validation.maxBatchSize})` 
        });
        return;
      }

      recordsReceived = readings.length;

      // Enrich with processing timestamp
      const enrichedReadings = readings.map(reading => ({
        ...reading,
        timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
        processing_timestamp: new Date()
      }));

      // Validate batch
      const validation = this.dataValidator.validateBatch(enrichedReadings);
      recordsProcessed = validation.validReadings.length;
      recordsRejected = validation.invalidReadings.length;

      // Send valid readings to Kafka
      if (validation.validReadings.length > 0) {
        await this.kafkaProducer.sendSensorReadings(validation.validReadings);
      }

      const result: DataIngestionResult = {
        success: validation.validReadings.length > 0,
        recordsProcessed: validation.validReadings.length,
        recordsValid: validation.validReadings.length,
        recordsInvalid: validation.invalidReadings.length,
        errors: validation.invalidReadings.flatMap(r => r.validation.errors),
        processingTimeMs: Date.now() - startTime
      };

      logger.info('Processed batch sensor readings via HTTP', {
        totalRecords: recordsReceived,
        validRecords: recordsProcessed,
        invalidRecords: recordsRejected,
        averageQuality: validation.metrics.averageQualityScore.toFixed(2)
      });

      res.status(200).json({
        status: 'success',
        message: 'Batch processed',
        result,
        qualityMetrics: validation.metrics
      });

    } catch (error) {
      recordsRejected = recordsReceived;
      logger.error('Error processing batch sensor readings', { error });
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      const processingTime = Date.now() - startTime;
      this.recordStats('batch', recordsReceived, recordsProcessed, recordsRejected, processingTime);
    }
  }

  /**
   * Handle file upload (multiple formats)
   */
  private async handleFileUpload(req: express.Request, res: express.Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      const results: DataIngestionResult[] = [];

      for (const file of files) {
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        let result: DataIngestionResult;

        switch (fileExtension) {
          case 'csv':
            result = await this.processCSVFile(file);
            break;
          case 'json':
            result = await this.processJSONFile(file);
            break;
          case 'xml':
            result = await this.processXMLFile(file);
            break;
          default:
            result = {
              success: false,
              recordsProcessed: 0,
              recordsValid: 0,
              recordsInvalid: 0,
              errors: [`Unsupported file type: ${fileExtension}`],
              processingTimeMs: 0
            };
        }

        results.push(result);
      }

      const totalResult = this.aggregateResults(results);

      logger.info('Processed file uploads via HTTP', {
        fileCount: files.length,
        totalRecords: totalResult.recordsProcessed + totalResult.recordsInvalid,
        validRecords: totalResult.recordsValid,
        invalidRecords: totalResult.recordsInvalid
      });

      res.status(200).json({
        status: 'success',
        message: 'Files processed',
        fileCount: files.length,
        aggregatedResult: totalResult,
        individualResults: results
      });

    } catch (error) {
      logger.error('Error processing file upload', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle CSV file upload
   */
  private async handleCSVUpload(req: express.Request, res: express.Response): Promise<void> {
    try {
      const file = req.file;
      
      if (!file) {
        res.status(400).json({ error: 'No CSV file uploaded' });
        return;
      }

      const result = await this.processCSVFile(file);

      logger.info('Processed CSV upload via HTTP', {
        filename: file.originalname,
        totalRecords: result.recordsProcessed + result.recordsInvalid,
        validRecords: result.recordsValid,
        invalidRecords: result.recordsInvalid
      });

      res.status(200).json({
        status: 'success',
        message: 'CSV file processed',
        filename: file.originalname,
        result
      });

    } catch (error) {
      logger.error('Error processing CSV upload', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle JSON file upload
   */
  private async handleJSONUpload(req: express.Request, res: express.Response): Promise<void> {
    try {
      const file = req.file;
      
      if (!file) {
        res.status(400).json({ error: 'No JSON file uploaded' });
        return;
      }

      const result = await this.processJSONFile(file);

      logger.info('Processed JSON upload via HTTP', {
        filename: file.originalname,
        totalRecords: result.recordsProcessed + result.recordsInvalid,
        validRecords: result.recordsValid,
        invalidRecords: result.recordsInvalid
      });

      res.status(200).json({
        status: 'success',
        message: 'JSON file processed',
        filename: file.originalname,
        result
      });

    } catch (error) {
      logger.error('Error processing JSON upload', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle bulk data upload (binary format)
   */
  private async handleBulkData(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    let recordsReceived = 0;
    let recordsProcessed = 0;
    let recordsRejected = 0;

    try {
      const buffer = req.body as Buffer;
      const contentType = req.headers['content-type'];

      logger.info('Received bulk data upload', {
        size: buffer.length,
        contentType
      });

      // Process based on content type or custom format
      // This is a placeholder for custom binary format processing
      const result: DataIngestionResult = {
        success: false,
        recordsProcessed: 0,
        recordsValid: 0,
        recordsInvalid: 0,
        errors: ['Bulk data processing not yet implemented'],
        processingTimeMs: Date.now() - startTime
      };

      res.status(501).json({
        status: 'not_implemented',
        message: 'Bulk data processing not yet implemented',
        result
      });

    } catch (error) {
      logger.error('Error processing bulk data', { error });
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      const processingTime = Date.now() - startTime;
      this.recordStats('batch', recordsReceived, recordsProcessed, recordsRejected, processingTime);
    }
  }

  /**
   * Handle health check request
   */
  private handleHealthCheck(req: express.Request, res: express.Response): void {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        kafka: this.kafkaProducer.isConnectedToKafka(),
        validator: true
      },
      stats: {
        totalRequests: this.stats.length,
        recentStats: this.stats.slice(-10)
      }
    };

    res.status(200).json(health);
  }

  /**
   * Handle statistics request
   */
  private handleStatsRequest(req: express.Request, res: express.Response): void {
    const stats = {
      totalRequests: this.stats.length,
      recentStats: this.stats.slice(-100),
      summary: this.calculateStatsSummary()
    };

    res.status(200).json(stats);
  }

  /**
   * Process CSV file
   */
  private async processCSVFile(file: Express.Multer.File): Promise<DataIngestionResult> {
    const startTime = Date.now();
    const readings: any[] = [];

    return new Promise((resolve, reject) => {
      const stream = Readable.from(file.buffer);
      
      stream
        .pipe(csv())
        .on('data', (data) => {
          readings.push(data);
        })
        .on('end', async () => {
          try {
            // Convert CSV data to sensor readings
            const sensorReadings = readings.map(row => this.csvRowToSensorReading(row));
            
            // Validate batch
            const validation = this.dataValidator.validateBatch(sensorReadings);
            
            // Send valid readings to Kafka
            if (validation.validReadings.length > 0) {
              await this.kafkaProducer.sendSensorReadings(validation.validReadings);
            }

            const result: DataIngestionResult = {
              success: validation.validReadings.length > 0,
              recordsProcessed: validation.validReadings.length,
              recordsValid: validation.validReadings.length,
              recordsInvalid: validation.invalidReadings.length,
              errors: validation.invalidReadings.flatMap(r => r.validation.errors),
              processingTimeMs: Date.now() - startTime
            };

            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Process JSON file
   */
  private async processJSONFile(file: Express.Multer.File): Promise<DataIngestionResult> {
    const startTime = Date.now();

    try {
      const jsonData = JSON.parse(file.buffer.toString());
      const readings = Array.isArray(jsonData) ? jsonData : [jsonData];

      // Enrich with processing timestamp
      const enrichedReadings = readings.map(reading => ({
        ...reading,
        timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
        processing_timestamp: new Date()
      }));

      // Validate batch
      const validation = this.dataValidator.validateBatch(enrichedReadings);

      // Send valid readings to Kafka
      if (validation.validReadings.length > 0) {
        await this.kafkaProducer.sendSensorReadings(validation.validReadings);
      }

      return {
        success: validation.validReadings.length > 0,
        recordsProcessed: validation.validReadings.length,
        recordsValid: validation.validReadings.length,
        recordsInvalid: validation.invalidReadings.length,
        errors: validation.invalidReadings.flatMap(r => r.validation.errors),
        processingTimeMs: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsValid: 0,
        recordsInvalid: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        processingTimeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Process XML file (placeholder)
   */
  private async processXMLFile(file: Express.Multer.File): Promise<DataIngestionResult> {
    const startTime = Date.now();

    // XML processing would be implemented here
    return {
      success: false,
      recordsProcessed: 0,
      recordsValid: 0,
      recordsInvalid: 0,
      errors: ['XML processing not yet implemented'],
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Convert CSV row to sensor reading
   */
  private csvRowToSensorReading(row: any): SensorReadingInput {
    // Extract measurements from CSV columns
    const measurements: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('measurement_') && value !== '') {
        const measurementName = key.replace('measurement_', '');
        measurements[measurementName] = {
          value: parseFloat(value as string),
          unit: 'unknown' // Default unit, should be specified in CSV or config
        };
      }
    }

    return {
      sensor_id: row.sensor_id,
      timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
      sensor_type: row.sensor_type || 'unknown',
      measurements,
      battery_level: row.battery_level ? parseFloat(row.battery_level) : undefined,
      signal_strength: row.signal_strength ? parseFloat(row.signal_strength) : undefined,
      processing_timestamp: new Date()
    };
  }

  /**
   * Aggregate multiple results
   */
  private aggregateResults(results: DataIngestionResult[]): DataIngestionResult {
    return results.reduce((acc, result) => ({
      success: acc.success || result.success,
      recordsProcessed: acc.recordsProcessed + result.recordsProcessed,
      recordsValid: acc.recordsValid + result.recordsValid,
      recordsInvalid: acc.recordsInvalid + result.recordsInvalid,
      errors: [...acc.errors, ...result.errors],
      processingTimeMs: Math.max(acc.processingTimeMs, result.processingTimeMs)
    }), {
      success: false,
      recordsProcessed: 0,
      recordsValid: 0,
      recordsInvalid: 0,
      errors: [],
      processingTimeMs: 0
    });
  }

  /**
   * Calculate statistics summary
   */
  private calculateStatsSummary() {
    if (this.stats.length === 0) {
      return null;
    }

    const totalRecords = this.stats.reduce((sum, stat) => sum + stat.recordsReceived, 0);
    const totalProcessed = this.stats.reduce((sum, stat) => sum + stat.recordsProcessed, 0);
    const totalRejected = this.stats.reduce((sum, stat) => sum + stat.recordsRejected, 0);
    const avgProcessingTime = this.stats.reduce((sum, stat) => sum + stat.averageProcessingTimeMs, 0) / this.stats.length;

    return {
      totalRecords,
      totalProcessed,
      totalRejected,
      successRate: totalRecords > 0 ? totalProcessed / totalRecords : 0,
      averageProcessingTimeMs: avgProcessingTime
    };
  }

  /**
   * Record ingestion statistics
   */
  private recordStats(
    source: 'mqtt' | 'lorawan' | 'http' | 'batch',
    recordsReceived: number,
    recordsProcessed: number,
    recordsRejected: number,
    processingTimeMs: number
  ): void {
    const stats: IngestionStats = {
      timestamp: new Date(),
      source,
      recordsReceived,
      recordsProcessed,
      recordsRejected,
      averageProcessingTimeMs: processingTimeMs,
      errorRate: recordsReceived > 0 ? recordsRejected / recordsReceived : 0,
      qualityMetrics: {
        totalRecords: recordsReceived,
        validRecords: recordsProcessed,
        invalidRecords: recordsRejected,
        averageQualityScore: 0,
        batteryLowCount: 0,
        communicationErrorCount: 0,
        staleDataCount: 0,
        duplicateCount: 0
      }
    };

    this.stats.push(stats);

    // Keep only last 1000 stats entries
    if (this.stats.length > 1000) {
      this.stats = this.stats.slice(-1000);
    }
  }

  /**
   * Get ingestion statistics
   */
  public getStats(): IngestionStats[] {
    return [...this.stats];
  }
}