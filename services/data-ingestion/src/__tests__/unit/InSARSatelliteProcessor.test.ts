import { InSARSatelliteProcessor } from '../../services/InSARSatelliteProcessor';
import { KafkaProducer } from '../../services/KafkaProducer';

// Mock KafkaProducer
jest.mock('../../services/KafkaProducer');

describe('InSARSatelliteProcessor', () => {
  let processor: InSARSatelliteProcessor;
  let mockKafkaProducer: jest.Mocked<KafkaProducer>;

  beforeEach(() => {
    mockKafkaProducer = new KafkaProducer() as jest.Mocked<KafkaProducer>;
    mockKafkaProducer.sendProcessedSensorData = jest.fn().mockResolvedValue(undefined);
    processor = new InSARSatelliteProcessor(mockKafkaProducer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPSInSAR', () => {
    test('should process PSInSAR data successfully', async () => {
      const mockSARImages = Array.from({ length: 25 }, (_, i) => 
        Buffer.from(`mock-sar-image-${i}`)
      );

      const metadata = {
        satellite: 'Sentinel-1' as const,
        acquisitionDates: Array.from({ length: 25 }, (_, i) => 
          new Date(2023, 0, 1 + i * 12) // Every 12 days
        ),
        orbitDirection: 'ascending' as const,
        polarization: 'VV',
        spatialBaselines: Array.from({ length: 25 }, () => Math.random() * 200),
        temporalBaselines: Array.from({ length: 25 }, (_, i) => i * 12),
        referenceImageIndex: 12
      };

      const result = await processor.processPSInSAR(mockSARImages, metadata);

      expect(result.success).toBe(true);
      expect(result.processingId).toBeDefined();
      expect(result.technique).toBe('PSInSAR');
      expect(result.timeSeriesLength).toBe(25);
      expect(result.spatialResolution).toBe(30);
      expect(result.coherenceThreshold).toBe(0.7);
      expect(result.displacementData.totalPoints).toBeGreaterThan(0);
      expect(result.displacementData.validPoints).toBeGreaterThan(0);
      expect(result.spatialCoverage.area).toBeGreaterThan(0);
      expect(result.qualityMetrics.overallQuality).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'insar_processing_result',
          data: result,
          timestamp: expect.any(Date)
        })
      ]);
    });

    test('should warn about insufficient images for PSInSAR', async () => {
      const mockSARImages = Array.from({ length: 15 }, (_, i) => 
        Buffer.from(`mock-sar-image-${i}`)
      );

      const metadata = {
        satellite: 'Sentinel-1' as const,
        acquisitionDates: Array.from({ length: 15 }, (_, i) => 
          new Date(2023, 0, 1 + i * 12)
        ),
        orbitDirection: 'ascending' as const,
        polarization: 'VV',
        spatialBaselines: Array.from({ length: 15 }, () => Math.random() * 200),
        temporalBaselines: Array.from({ length: 15 }, (_, i) => i * 12),
        referenceImageIndex: 7
      };

      const result = await processor.processPSInSAR(mockSARImages, metadata);

      expect(result.success).toBe(true); // Still processes, but with warning
      expect(result.warnings.some(w => w.includes('20+ images'))).toBe(true);
    });

    test('should fail with mismatched acquisition dates', async () => {
      const mockSARImages = Array.from({ length: 25 }, (_, i) => 
        Buffer.from(`mock-sar-image-${i}`)
      );

      const metadata = {
        satellite: 'Sentinel-1' as const,
        acquisitionDates: Array.from({ length: 20 }, (_, i) => 
          new Date(2023, 0, 1 + i * 12)
        ), // Mismatched count
        orbitDirection: 'ascending' as const,
        polarization: 'VV',
        spatialBaselines: Array.from({ length: 25 }, () => Math.random() * 200),
        temporalBaselines: Array.from({ length: 25 }, (_, i) => i * 12),
        referenceImageIndex: 12
      };

      const result = await processor.processPSInSAR(mockSARImages, metadata);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Number of acquisition dates must match number of SAR images');
    });

    test('should handle different satellites', async () => {
      const satellites: Array<'Sentinel-1' | 'ALOS-2' | 'TerraSAR-X' | 'COSMO-SkyMed'> = 
        ['Sentinel-1', 'ALOS-2', 'TerraSAR-X', 'COSMO-SkyMed'];

      for (const satellite of satellites) {
        const mockSARImages = Array.from({ length: 25 }, (_, i) => 
          Buffer.from(`mock-sar-image-${i}`)
        );

        const metadata = {
          satellite,
          acquisitionDates: Array.from({ length: 25 }, (_, i) => 
            new Date(2023, 0, 1 + i * 12)
          ),
          orbitDirection: 'ascending' as const,
          polarization: 'VV',
          spatialBaselines: Array.from({ length: 25 }, () => Math.random() * 200),
          temporalBaselines: Array.from({ length: 25 }, (_, i) => i * 12),
          referenceImageIndex: 12
        };

        const result = await processor.processPSInSAR(mockSARImages, metadata);

        expect(result.success).toBe(true);
        expect(result.processingId).toContain('psinsar_');
      }
    });
  });

  describe('processSBAS', () => {
    test('should process SBAS data successfully', async () => {
      const mockSARImages = Array.from({ length: 30 }, (_, i) => 
        Buffer.from(`mock-sar-image-${i}`)
      );

      const metadata = {
        satellite: 'Sentinel-1' as const,
        acquisitionDates: Array.from({ length: 30 }, (_, i) => 
          new Date(2023, 0, 1 + i * 12)
        ),
        orbitDirection: 'descending' as const,
        spatialBaselines: Array.from({ length: 30 }, () => Math.random() * 300),
        temporalBaselines: Array.from({ length: 30 }, (_, i) => i * 12),
        maxSpatialBaseline: 200,
        maxTemporalBaseline: 120
      };

      const result = await processor.processSBAS(mockSARImages, metadata);

      expect(result.success).toBe(true);
      expect(result.processingId).toBeDefined();
      expect(result.technique).toBe('SBAS');
      expect(result.timeSeriesLength).toBe(30);
      expect(result.spatialResolution).toBe(90);
      expect(result.coherenceThreshold).toBe(0.3); // Lower threshold for SBAS
      expect(result.displacementData.totalPoints).toBeGreaterThan(0);
      expect(result.qualityMetrics.overallQuality).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'insar_processing_result',
          data: result,
          timestamp: expect.any(Date)
        })
      ]);
    });

    test('should handle different orbit directions', async () => {
      const orbitDirections: Array<'ascending' | 'descending'> = ['ascending', 'descending'];

      for (const orbitDirection of orbitDirections) {
        const mockSARImages = Array.from({ length: 20 }, (_, i) => 
          Buffer.from(`mock-sar-image-${i}`)
        );

        const metadata = {
          satellite: 'Sentinel-1' as const,
          acquisitionDates: Array.from({ length: 20 }, (_, i) => 
            new Date(2023, 0, 1 + i * 12)
          ),
          orbitDirection,
          spatialBaselines: Array.from({ length: 20 }, () => Math.random() * 300),
          temporalBaselines: Array.from({ length: 20 }, (_, i) => i * 12),
          maxSpatialBaseline: 200,
          maxTemporalBaseline: 120
        };

        const result = await processor.processSBAS(mockSARImages, metadata);

        expect(result.success).toBe(true);
        expect(result.processingId).toContain('sbas_');
      }
    });
  });

  describe('downloadSatelliteData', () => {
    test('should download satellite data successfully', async () => {
      const parameters = {
        satellite: 'Sentinel-1' as const,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        boundingBox: {
          north: -33.8,
          south: -33.9,
          east: 151.3,
          west: 151.1
        },
        orbitDirection: 'ascending' as const,
        acquisitionMode: 'IW',
        polarization: ['VV', 'VH'],
        maxCloudCover: 20
      };

      const result = await processor.downloadSatelliteData(parameters);

      expect(result.success).toBe(true);
      expect(result.downloadId).toBeDefined();
      expect(result.satellite).toBe('Sentinel-1');
      expect(result.acquisitionMode).toBe('IW');
      expect(result.polarization).toEqual(['VV', 'VH']);
      expect(result.orbitDirection).toBe('ascending');
      expect(result.downloadedScenes).toBeGreaterThan(0);
      expect(result.totalDataSize).toBeGreaterThan(0);
      expect(result.spatialCoverage.area).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'satellite_download_result',
          data: result,
          timestamp: expect.any(Date)
        })
      ]);
    });

    test('should handle different satellite types', async () => {
      const satellites: Array<'Sentinel-1' | 'ALOS-2' | 'TerraSAR-X' | 'COSMO-SkyMed'> = 
        ['Sentinel-1', 'ALOS-2', 'TerraSAR-X', 'COSMO-SkyMed'];

      for (const satellite of satellites) {
        const parameters = {
          satellite,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-03-31'),
          boundingBox: {
            north: -33.8,
            south: -33.9,
            east: 151.3,
            west: 151.1
          }
        };

        const result = await processor.downloadSatelliteData(parameters);

        expect(result.success).toBe(true);
        expect(result.satellite).toBe(satellite);
        expect(result.downloadId).toContain('download_');
      }
    });

    test('should handle no available scenes', async () => {
      // Mock the internal method to return no scenes
      const originalQuery = (processor as any).querySatelliteCatalog;
      (processor as any).querySatelliteCatalog = jest.fn().mockResolvedValue([]);

      const parameters = {
        satellite: 'Sentinel-1' as const,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-02'),
        boundingBox: {
          north: -33.8,
          south: -33.9,
          east: 151.3,
          west: 151.1
        }
      };

      const result = await processor.downloadSatelliteData(parameters);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No satellite scenes found for the specified criteria');
      expect(result.downloadedScenes).toBe(0);

      // Restore original method
      (processor as any).querySatelliteCatalog = originalQuery;
    });
  });

  describe('generateDisplacementTimeSeries', () => {
    test('should generate displacement time series for multiple points', async () => {
      const pointLocations = [
        { lat: -33.8688, lon: 151.2093, id: 'point_001' },
        { lat: -33.8689, lon: 151.2094, id: 'point_002' },
        { lat: -33.8690, lon: 151.2095, id: 'point_003' }
      ];

      const mockInSARData = {}; // Simplified mock data

      const analysisParameters = {
        technique: 'PSInSAR' as const,
        temporalSmoothing: true,
        outlierRemoval: true,
        uncertaintyEstimation: true
      };

      const results = await processor.generateDisplacementTimeSeries(
        pointLocations,
        mockInSARData,
        analysisParameters
      );

      expect(results).toHaveLength(3);
      
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.timeSeriesId).toBeDefined();
        expect(result.pointId).toBe(pointLocations[index].id);
        expect(result.location).toEqual(pointLocations[index]);
        expect(result.timeSeries).toBeDefined();
        expect(result.timeSeries.length).toBeGreaterThan(0);
        expect(result.trendAnalysis).toBeDefined();
        expect(result.trendAnalysis.linearVelocity).toBeDefined();
        expect(result.trendAnalysis.rSquared).toBeGreaterThanOrEqual(0);
        expect(result.trendAnalysis.rSquared).toBeLessThanOrEqual(1);
        expect(result.anomalies).toBeDefined();
        expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.errors).toHaveLength(0);
      });

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledTimes(3);
    });

    test('should handle different analysis techniques', async () => {
      const techniques: Array<'PSInSAR' | 'SBAS'> = ['PSInSAR', 'SBAS'];

      for (const technique of techniques) {
        const pointLocations = [
          { lat: -33.8688, lon: 151.2093, id: `point_${technique}` }
        ];

        const analysisParameters = {
          technique,
          temporalSmoothing: false,
          outlierRemoval: false,
          uncertaintyEstimation: false
        };

        const results = await processor.generateDisplacementTimeSeries(
          pointLocations,
          {},
          analysisParameters
        );

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);
        expect(results[0].timeSeriesId).toContain(`point_${technique}`);
      }
    });

    test('should validate time series data quality', async () => {
      const pointLocations = [
        { lat: -33.8688, lon: 151.2093, id: 'quality_test' }
      ];

      const analysisParameters = {
        technique: 'PSInSAR' as const,
        temporalSmoothing: true,
        outlierRemoval: true,
        uncertaintyEstimation: true
      };

      const results = await processor.generateDisplacementTimeSeries(
        pointLocations,
        {},
        analysisParameters
      );

      const result = results[0];
      expect(result.success).toBe(true);

      // Validate time series structure
      result.timeSeries.forEach(point => {
        expect(point.date).toBeInstanceOf(Date);
        expect(typeof point.displacement).toBe('number');
        expect(typeof point.uncertainty).toBe('number');
        expect(typeof point.coherence).toBe('number');
        expect(point.coherence).toBeGreaterThanOrEqual(0);
        expect(point.coherence).toBeLessThanOrEqual(1);
      });

      // Validate trend analysis
      expect(typeof result.trendAnalysis.linearVelocity).toBe('number');
      expect(typeof result.trendAnalysis.acceleration).toBe('number');
      expect(typeof result.trendAnalysis.seasonalComponent).toBe('number');
      expect(typeof result.trendAnalysis.residualStdDev).toBe('number');
      expect(result.trendAnalysis.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.trendAnalysis.rSquared).toBeLessThanOrEqual(1);

      // Validate anomalies
      result.anomalies.forEach(anomaly => {
        expect(anomaly.date).toBeInstanceOf(Date);
        expect(typeof anomaly.displacement).toBe('number');
        expect(['low', 'medium', 'high']).toContain(anomaly.severity);
        expect(anomaly.confidence).toBeGreaterThanOrEqual(0);
        expect(anomaly.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('performSpatialInterpolation', () => {
    test('should perform spatial interpolation successfully', async () => {
      const pointData = Array.from({ length: 50 }, (_, i) => ({
        lat: -33.8688 + (Math.random() - 0.5) * 0.01,
        lon: 151.2093 + (Math.random() - 0.5) * 0.01,
        value: Math.sin(i * 0.1) * 10 + (Math.random() - 0.5) * 2,
        uncertainty: Math.random() * 2 + 0.5
      }));

      const parameters = {
        resolution: 30, // 30m resolution
        boundingBox: {
          north: -33.86,
          south: -33.88,
          east: 151.22,
          west: 151.20
        },
        maxDistance: 1000,
        minPoints: 3
      };

      const result = await processor.performSpatialInterpolation(pointData, 'kriging', parameters);

      expect(result.success).toBe(true);
      expect(result.interpolationId).toBeDefined();
      expect(result.method).toBe('kriging');
      expect(result.inputPoints).toBe(50);
      expect(result.outputGrid.width).toBeGreaterThan(0);
      expect(result.outputGrid.height).toBeGreaterThan(0);
      expect(result.outputGrid.resolution).toBe(30);
      expect(result.interpolatedData).toBeInstanceOf(Float32Array);
      expect(result.interpolatedData.length).toBe(result.outputGrid.width * result.outputGrid.height);
      expect(result.uncertaintyMap).toBeInstanceOf(Float32Array);
      expect(result.uncertaintyMap.length).toBe(result.interpolatedData.length);
      expect(result.qualityMetrics.crossValidationRMSE).toBeGreaterThan(0);
      expect(result.qualityMetrics.correlationCoefficient).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.correlationCoefficient).toBeLessThanOrEqual(1);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.errors).toHaveLength(0);

      expect(mockKafkaProducer.sendProcessedSensorData).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'spatial_interpolation_result',
          data: expect.objectContaining({
            interpolationId: result.interpolationId,
            method: 'kriging',
            interpolatedData: expect.any(Array),
            uncertaintyMap: expect.any(Array)
          }),
          timestamp: expect.any(Date)
        })
      ]);
    });

    test('should handle different interpolation methods', async () => {
      const methods: Array<'kriging' | 'idw' | 'spline' | 'rbf'> = ['kriging', 'idw', 'spline', 'rbf'];

      const pointData = Array.from({ length: 20 }, (_, i) => ({
        lat: -33.8688 + (Math.random() - 0.5) * 0.01,
        lon: 151.2093 + (Math.random() - 0.5) * 0.01,
        value: Math.random() * 10
      }));

      const parameters = {
        resolution: 50,
        maxDistance: 500,
        minPoints: 3
      };

      for (const method of methods) {
        const result = await processor.performSpatialInterpolation(pointData, method, parameters);

        expect(result.success).toBe(true);
        expect(result.method).toBe(method);
        expect(result.interpolationId).toContain(`interp_${method}_`);
      }
    });

    test('should fail with insufficient points', async () => {
      const pointData = [
        { lat: -33.8688, lon: 151.2093, value: 5.0 },
        { lat: -33.8689, lon: 151.2094, value: 7.0 }
      ]; // Only 2 points, minimum is 3

      const parameters = {
        resolution: 30,
        minPoints: 3
      };

      const result = await processor.performSpatialInterpolation(pointData, 'kriging', parameters);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Minimum 3 points required for spatial interpolation');
      expect(result.inputPoints).toBe(0);
    });

    test('should validate interpolation quality metrics', async () => {
      const pointData = Array.from({ length: 30 }, (_, i) => ({
        lat: -33.8688 + (i % 6) * 0.001,
        lon: 151.2093 + Math.floor(i / 6) * 0.001,
        value: Math.sin(i * 0.2) * 5 + Math.cos(i * 0.3) * 3
      }));

      const parameters = {
        resolution: 25
      };

      const result = await processor.performSpatialInterpolation(pointData, 'kriging', parameters);

      expect(result.success).toBe(true);
      expect(result.qualityMetrics.crossValidationRMSE).toBeGreaterThan(0);
      expect(result.qualityMetrics.meanAbsoluteError).toBeGreaterThan(0);
      expect(result.qualityMetrics.correlationCoefficient).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.correlationCoefficient).toBeLessThanOrEqual(1);
    });
  });

  describe('error handling', () => {
    test('should handle Kafka producer errors gracefully', async () => {
      mockKafkaProducer.sendProcessedSensorData.mockRejectedValue(new Error('Kafka connection failed'));

      const mockSARImages = Array.from({ length: 25 }, (_, i) => 
        Buffer.from(`mock-sar-image-${i}`)
      );

      const metadata = {
        satellite: 'Sentinel-1' as const,
        acquisitionDates: Array.from({ length: 25 }, (_, i) => 
          new Date(2023, 0, 1 + i * 12)
        ),
        orbitDirection: 'ascending' as const,
        polarization: 'VV',
        spatialBaselines: Array.from({ length: 25 }, () => Math.random() * 200),
        temporalBaselines: Array.from({ length: 25 }, (_, i) => i * 12),
        referenceImageIndex: 12
      };

      const result = await processor.processPSInSAR(mockSARImages, metadata);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => error.includes('Kafka connection failed'))).toBe(true);
    });

    test('should handle processing errors in time series generation', async () => {
      // Mock the internal method to throw an error
      const originalExtract = (processor as any).extractPointTimeSeries;
      (processor as any).extractPointTimeSeries = jest.fn().mockRejectedValue(new Error('Data extraction failed'));

      const pointLocations = [
        { lat: -33.8688, lon: 151.2093, id: 'error_test' }
      ];

      const analysisParameters = {
        technique: 'PSInSAR' as const,
        temporalSmoothing: false,
        outlierRemoval: false,
        uncertaintyEstimation: false
      };

      const results = await processor.generateDisplacementTimeSeries(
        pointLocations,
        {},
        analysisParameters
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].errors.some(error => error.includes('Data extraction failed'))).toBe(true);

      // Restore original method
      (processor as any).extractPointTimeSeries = originalExtract;
    });
  });

  describe('data validation', () => {
    test('should validate displacement time series data structure', async () => {
      const pointLocations = [
        { lat: -33.8688, lon: 151.2093, id: 'validation_test' }
      ];

      const analysisParameters = {
        technique: 'PSInSAR' as const,
        temporalSmoothing: false,
        outlierRemoval: false,
        uncertaintyEstimation: false
      };

      const results = await processor.generateDisplacementTimeSeries(
        pointLocations,
        {},
        analysisParameters
      );

      const result = results[0];
      expect(result.success).toBe(true);

      // Validate time series is chronologically ordered
      for (let i = 1; i < result.timeSeries.length; i++) {
        expect(result.timeSeries[i].date.getTime()).toBeGreaterThanOrEqual(
          result.timeSeries[i - 1].date.getTime()
        );
      }

      // Validate coherence values are within valid range
      result.timeSeries.forEach(point => {
        expect(point.coherence).toBeGreaterThanOrEqual(0);
        expect(point.coherence).toBeLessThanOrEqual(1);
      });

      // Validate uncertainty values are positive
      result.timeSeries.forEach(point => {
        expect(point.uncertainty).toBeGreaterThan(0);
      });
    });

    test('should validate spatial interpolation grid dimensions', async () => {
      const pointData = Array.from({ length: 10 }, (_, i) => ({
        lat: -33.8688 + i * 0.001,
        lon: 151.2093 + i * 0.001,
        value: i * 2
      }));

      const parameters = {
        resolution: 100, // 100m resolution
        boundingBox: {
          north: -33.86,
          south: -33.87,
          east: 151.21,
          west: 151.20
        }
      };

      const result = await processor.performSpatialInterpolation(pointData, 'idw', parameters);

      expect(result.success).toBe(true);
      
      // Validate grid dimensions are reasonable
      expect(result.outputGrid.width).toBeGreaterThan(0);
      expect(result.outputGrid.height).toBeGreaterThan(0);
      expect(result.outputGrid.width).toBeLessThan(1000); // Reasonable upper bound
      expect(result.outputGrid.height).toBeLessThan(1000);
      
      // Validate data array sizes match grid dimensions
      const expectedSize = result.outputGrid.width * result.outputGrid.height;
      expect(result.interpolatedData.length).toBe(expectedSize);
      expect(result.uncertaintyMap.length).toBe(expectedSize);
    });
  });
});