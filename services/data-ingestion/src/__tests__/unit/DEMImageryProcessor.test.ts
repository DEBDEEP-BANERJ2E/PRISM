import { DEMImageryProcessor } from '../../services/DEMImageryProcessor';
import { KafkaProducer } from '../../services/KafkaProducer';

// Mock KafkaProducer
jest.mock('../../services/KafkaProducer');

describe('DEMImageryProcessor', () => {
  let processor: DEMImageryProcessor;
  let mockKafkaProducer: jest.Mocked<KafkaProducer>;

  beforeEach(() => {
    mockKafkaProducer = new KafkaProducer() as jest.Mocked<KafkaProducer>;
    mockKafkaProducer.sendProcessedSensorData = jest.fn().mockResolvedValue(undefined);
    processor = new DEMImageryProcessor(mockKafkaProducer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processUAVPhotogrammetry', () => {
    test('should process UAV photogrammetry data successfully', async () => {
      const mockImages = [
        Buffer.from('mock-image-1'),
        Buffer.from('mock-image-2'),
        Buffer.from('mock-image-3'),
        Buffer.from('mock-image-4')
      ];

      const metadata = {
        cameraModel: 'DJI Phantom 4 Pro',
        focalLength: 8.8,
        sensorSize: { width: 13.2, height: 8.8 },
        gpsCoordinates: [
          { lat: -33.8688, lon: 151.2093, alt: 100 },
          { lat: -33.8689, lon: 151.2094, alt: 101 },
          { lat: -33.8690, lon: 151.2095, alt: 102 },
          { lat: -33.8691, lon: 151.2096, alt: 103 }
        ],
        imageTimestamps: [
          new Date('2024-01-01T10:00:00Z'),
          new Date('2024-01-01T10:01:00Z'),
          new Date('2024-01-01T10:02:00Z'),
          new Date('2024-01-01T10:03:00Z')
        ]
      };

      const result = await processor.processUAVPhotogrammetry(mockImages, metadata);

      expect(result.success).toBe(true);
      expect(result.meshId).toBeDefined();
      expect(result.vertexCount).toBeGreaterThan(0);
      expect(result.faceCount).toBeGreaterThan(0);
      expect(result.boundingBox).toBeDefined();
      expect(result.resolution).toBe(0.1);
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'dem_processing_result',
          data: result,
          timestamp: expect.any(Date)
        })
      ]);
    });

    test('should fail with insufficient images', async () => {
      const mockImages = [
        Buffer.from('mock-image-1'),
        Buffer.from('mock-image-2')
      ]; // Only 2 images, minimum is 3

      const metadata = {
        cameraModel: 'DJI Phantom 4 Pro',
        focalLength: 8.8,
        sensorSize: { width: 13.2, height: 8.8 },
        gpsCoordinates: [
          { lat: -33.8688, lon: 151.2093, alt: 100 },
          { lat: -33.8689, lon: 151.2094, alt: 101 }
        ],
        imageTimestamps: [
          new Date('2024-01-01T10:00:00Z'),
          new Date('2024-01-01T10:01:00Z')
        ]
      };

      const result = await processor.processUAVPhotogrammetry(mockImages, metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Minimum 3 images required for photogrammetry');
      expect(result.vertexCount).toBe(0);
      expect(result.faceCount).toBe(0);
    });

    test('should fail with mismatched GPS coordinates', async () => {
      const mockImages = [
        Buffer.from('mock-image-1'),
        Buffer.from('mock-image-2'),
        Buffer.from('mock-image-3')
      ];

      const metadata = {
        cameraModel: 'DJI Phantom 4 Pro',
        focalLength: 8.8,
        sensorSize: { width: 13.2, height: 8.8 },
        gpsCoordinates: [
          { lat: -33.8688, lon: 151.2093, alt: 100 },
          { lat: -33.8689, lon: 151.2094, alt: 101 }
        ], // Only 2 GPS coordinates for 3 images
        imageTimestamps: [
          new Date('2024-01-01T10:00:00Z'),
          new Date('2024-01-01T10:01:00Z'),
          new Date('2024-01-01T10:02:00Z')
        ]
      };

      const result = await processor.processUAVPhotogrammetry(mockImages, metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('GPS coordinates count must match image count');
    });
  });

  describe('processLiDARPointCloud', () => {
    test('should process LiDAR point cloud successfully', async () => {
      const mockPointCloudData = Buffer.alloc(120000); // 10,000 points * 12 bytes per point
      
      const metadata = {
        format: 'las' as const,
        coordinateSystem: 'EPSG:4326',
        scannerModel: 'Velodyne VLP-16',
        scanDate: new Date('2024-01-01T12:00:00Z'),
        pointDensity: 100
      };

      const result = await processor.processLiDARPointCloud(mockPointCloudData, metadata);

      expect(result.success).toBe(true);
      expect(result.pointCloudId).toBeDefined();
      expect(result.pointCount).toBeGreaterThan(0);
      expect(result.density).toBeGreaterThan(0);
      expect(result.mesh.vertices).toBeGreaterThan(0);
      expect(result.mesh.faces).toBeGreaterThan(0);
      expect(result.mesh.quality).toBeGreaterThan(0);
      expect(result.geometricFeatures.slope).toBeDefined();
      expect(result.geometricFeatures.aspect).toBeDefined();
      expect(result.geometricFeatures.curvature).toBeDefined();
      expect(result.geometricFeatures.roughness).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'lidar_processing_result',
          data: result,
          timestamp: expect.any(Date)
        })
      ]);
    });

    test('should fail with insufficient point data', async () => {
      const mockPointCloudData = Buffer.alloc(120); // Only 10 points * 12 bytes per point
      
      const metadata = {
        format: 'las' as const,
        coordinateSystem: 'EPSG:4326',
        scannerModel: 'Velodyne VLP-16',
        scanDate: new Date('2024-01-01T12:00:00Z')
      };

      const result = await processor.processLiDARPointCloud(mockPointCloudData, metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Insufficient points in LiDAR data for reliable processing');
      expect(result.pointCount).toBe(0);
    });

    test('should handle different LiDAR formats', async () => {
      const formats: Array<'las' | 'ply' | 'xyz'> = ['las', 'ply', 'xyz'];
      
      for (const format of formats) {
        const mockPointCloudData = Buffer.alloc(120000);
        
        const metadata = {
          format,
          coordinateSystem: 'EPSG:4326',
          scannerModel: 'Test Scanner',
          scanDate: new Date('2024-01-01T12:00:00Z')
        };

        const result = await processor.processLiDARPointCloud(mockPointCloudData, metadata);

        expect(result.success).toBe(true);
        expect(result.pointCloudId).toContain('lidar_');
      }
    });
  });

  describe('processImagery', () => {
    test('should process RGB imagery successfully', async () => {
      const mockImageData = Buffer.alloc(1920 * 1080 * 3); // RGB image data
      
      const metadata = {
        width: 1920,
        height: 1080,
        channels: 3,
        timestamp: new Date('2024-01-01T14:00:00Z'),
        gpsLocation: { lat: -33.8688, lon: 151.2093, alt: 100 }
      };

      const result = await processor.processImagery(mockImageData, 'rgb', metadata);

      expect(result.success).toBe(true);
      expect(result.imageId).toBeDefined();
      expect(result.imageType).toBe('rgb');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.channels).toBe(3);
      expect(result.extractedFeatures.joints).toBeDefined();
      expect(result.extractedFeatures.surfaceChanges).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'imagery_processing_result',
          data: result,
          timestamp: expect.any(Date)
        })
      ]);
    });

    test('should process multispectral imagery with vegetation index', async () => {
      const mockImageData = Buffer.alloc(1920 * 1080 * 5); // Multispectral image data
      
      const metadata = {
        width: 1920,
        height: 1080,
        channels: 5,
        timestamp: new Date('2024-01-01T14:00:00Z')
      };

      const result = await processor.processImagery(mockImageData, 'multispectral', metadata);

      expect(result.success).toBe(true);
      expect(result.imageType).toBe('multispectral');
      expect(result.extractedFeatures.vegetationIndex).toBeDefined();
      expect(typeof result.extractedFeatures.vegetationIndex).toBe('number');
    });

    test('should process thermal imagery with thermal anomalies', async () => {
      const mockImageData = Buffer.alloc(640 * 480 * 1); // Thermal image data
      
      const metadata = {
        width: 640,
        height: 480,
        channels: 1,
        timestamp: new Date('2024-01-01T14:00:00Z')
      };

      const result = await processor.processImagery(mockImageData, 'thermal', metadata);

      expect(result.success).toBe(true);
      expect(result.imageType).toBe('thermal');
      expect(result.extractedFeatures.thermalAnomalies).toBeDefined();
      expect(Array.isArray(result.extractedFeatures.thermalAnomalies)).toBe(true);
      
      if (result.extractedFeatures.thermalAnomalies && result.extractedFeatures.thermalAnomalies.length > 0) {
        const anomaly = result.extractedFeatures.thermalAnomalies[0];
        expect(anomaly.temperature).toBeGreaterThan(0);
        expect(anomaly.location).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(anomaly.severity);
      }
    });

    test('should handle unsupported image type', async () => {
      const mockImageData = Buffer.alloc(1000);
      
      const metadata = {
        width: 100,
        height: 100,
        channels: 1,
        timestamp: new Date('2024-01-01T14:00:00Z')
      };

      // @ts-ignore - Testing unsupported type
      const result = await processor.processImagery(mockImageData, 'unsupported', metadata);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Unsupported image type'))).toBe(true);
    });
  });

  describe('performChangeDetection', () => {
    test('should perform change detection successfully', async () => {
      const mockReferenceImage = Buffer.alloc(1920 * 1080 * 3);
      const mockCurrentImage = Buffer.alloc(1920 * 1080 * 3);
      
      const metadata = {
        imageType: 'rgb' as const,
        referenceTimestamp: new Date('2024-01-01T10:00:00Z'),
        currentTimestamp: new Date('2024-01-01T14:00:00Z')
      };

      const result = await processor.performChangeDetection(
        mockReferenceImage,
        mockCurrentImage,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.changeId).toBeDefined();
      expect(result.referenceImageId).toBeDefined();
      expect(result.currentImageId).toBeDefined();
      expect(result.changedPixels).toBeGreaterThanOrEqual(0);
      expect(result.totalPixels).toBeGreaterThan(0);
      expect(result.changePercentage).toBeGreaterThanOrEqual(0);
      expect(result.changePercentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.significantChanges)).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'change_detection_result',
          data: result,
          timestamp: expect.any(Date)
        })
      ]);
    });

    test('should classify different types of changes', async () => {
      const mockReferenceImage = Buffer.alloc(1000);
      const mockCurrentImage = Buffer.alloc(1000);
      
      const metadata = {
        imageType: 'multispectral' as const,
        referenceTimestamp: new Date('2024-01-01T10:00:00Z'),
        currentTimestamp: new Date('2024-01-01T14:00:00Z')
      };

      const result = await processor.performChangeDetection(
        mockReferenceImage,
        mockCurrentImage,
        metadata
      );

      expect(result.success).toBe(true);
      
      if (result.significantChanges.length > 0) {
        const changeTypes = ['surface_movement', 'new_fracture', 'vegetation_change', 'thermal_change'];
        result.significantChanges.forEach(change => {
          expect(changeTypes).toContain(change.type);
          expect(change.location).toBeDefined();
          expect(change.magnitude).toBeGreaterThanOrEqual(0);
          expect(change.magnitude).toBeLessThanOrEqual(1);
          expect(change.confidence).toBeGreaterThanOrEqual(0);
          expect(change.confidence).toBeLessThanOrEqual(1);
        });
      }
    });

    test('should handle processing errors gracefully', async () => {
      // Mock an error by passing invalid data
      const mockReferenceImage = Buffer.alloc(0); // Empty buffer
      const mockCurrentImage = Buffer.alloc(0); // Empty buffer
      
      const metadata = {
        imageType: 'rgb' as const,
        referenceTimestamp: new Date('2024-01-01T10:00:00Z'),
        currentTimestamp: new Date('2024-01-01T14:00:00Z')
      };

      const result = await processor.performChangeDetection(
        mockReferenceImage,
        mockCurrentImage,
        metadata
      );

      // The result should still be returned, but may indicate failure
      expect(result).toBeDefined();
      expect(result.changeId).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    test('should handle Kafka producer errors gracefully', async () => {
      mockKafkaProducer.sendProcessedSensorData.mockRejectedValue(new Error('Kafka connection failed'));

      const mockImages = [
        Buffer.from('mock-image-1'),
        Buffer.from('mock-image-2'),
        Buffer.from('mock-image-3')
      ];

      const metadata = {
        cameraModel: 'Test Camera',
        focalLength: 8.8,
        sensorSize: { width: 13.2, height: 8.8 },
        gpsCoordinates: [
          { lat: -33.8688, lon: 151.2093, alt: 100 },
          { lat: -33.8689, lon: 151.2094, alt: 101 },
          { lat: -33.8690, lon: 151.2095, alt: 102 }
        ],
        imageTimestamps: [
          new Date('2024-01-01T10:00:00Z'),
          new Date('2024-01-01T10:01:00Z'),
          new Date('2024-01-01T10:02:00Z')
        ]
      };

      const result = await processor.processUAVPhotogrammetry(mockImages, metadata);

      // Processing should still complete, but Kafka error should be handled
      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Kafka connection failed'))).toBe(true);
    });
  });

  describe('feature extraction validation', () => {
    test('should extract valid joint features from RGB imagery', async () => {
      const mockImageData = Buffer.alloc(1000);
      
      const metadata = {
        width: 100,
        height: 100,
        channels: 3,
        timestamp: new Date('2024-01-01T14:00:00Z')
      };

      const result = await processor.processImagery(mockImageData, 'rgb', metadata);

      expect(result.success).toBe(true);
      expect(result.extractedFeatures.joints).toBeDefined();
      
      result.extractedFeatures.joints.forEach(joint => {
        expect(joint.orientation).toBeGreaterThanOrEqual(0);
        expect(joint.orientation).toBeLessThan(360);
        expect(joint.confidence).toBeGreaterThanOrEqual(0);
        expect(joint.confidence).toBeLessThanOrEqual(1);
        expect(joint.location.x).toBeGreaterThanOrEqual(0);
        expect(joint.location.y).toBeGreaterThanOrEqual(0);
      });
    });

    test('should extract valid surface change features', async () => {
      const mockImageData = Buffer.alloc(1000);
      
      const metadata = {
        width: 100,
        height: 100,
        channels: 3,
        timestamp: new Date('2024-01-01T14:00:00Z')
      };

      const result = await processor.processImagery(mockImageData, 'rgb', metadata);

      expect(result.success).toBe(true);
      expect(result.extractedFeatures.surfaceChanges).toBeDefined();
      
      result.extractedFeatures.surfaceChanges.forEach(change => {
        expect(['erosion', 'deposition', 'fracture']).toContain(change.type);
        expect(change.severity).toBeGreaterThanOrEqual(0);
        expect(change.severity).toBeLessThanOrEqual(1);
        expect(change.area).toBeGreaterThanOrEqual(0);
        expect(change.location.x).toBeGreaterThanOrEqual(0);
        expect(change.location.y).toBeGreaterThanOrEqual(0);
      });
    });
  });
});