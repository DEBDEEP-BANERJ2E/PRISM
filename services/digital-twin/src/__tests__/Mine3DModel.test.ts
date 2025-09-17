import { Mine3DModel, SurveyData } from '../services/Mine3DModel';
import { Point3D } from '../types/geometry';

describe('Mine3DModel', () => {
  let model: Mine3DModel;

  beforeEach(() => {
    model = new Mine3DModel('test-mine');
  });

  describe('constructor', () => {
    it('should initialize with empty mesh', () => {
      const mesh = model.getMesh();
      
      expect(mesh.id).toBe('test-mine');
      expect(mesh.vertices.size).toBe(0);
      expect(mesh.faces.size).toBe(0);
      expect(mesh.boundingBox.min.x).toBe(Infinity);
      expect(mesh.boundingBox.max.x).toBe(-Infinity);
    });
  });

  describe('updateMeshFromSurvey', () => {
    it('should successfully update mesh with valid survey data', async () => {
      const surveyData: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
          { x: 1, y: 1, z: 1 }
        ],
        triangles: [
          [0, 1, 2],
          [1, 2, 3]
        ],
        metadata: {
          source: 'test-survey',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      const result = await model.updateMeshFromSurvey(surveyData);

      expect(result.success).toBe(true);
      expect(result.verticesAdded).toBe(4);
      expect(result.facesAdded).toBe(2);
      expect(result.errors || []).toHaveLength(0);

      const mesh = model.getMesh();
      expect(mesh.vertices.size).toBe(4);
      expect(mesh.faces.size).toBe(2);
    });

    it('should reject survey data with insufficient points', async () => {
      const surveyData: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 }
        ],
        metadata: {
          source: 'test-survey',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      const result = await model.updateMeshFromSurvey(surveyData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Survey data must contain at least 3 points');
    });

    it('should generate triangulation when not provided', async () => {
      const surveyData: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
          { x: 1, y: 1, z: 1 }
        ],
        // No triangles provided
        metadata: {
          source: 'test-survey',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      const result = await model.updateMeshFromSurvey(surveyData);

      expect(result.success).toBe(true);
      expect(result.verticesAdded).toBe(4);
      expect(result.facesAdded).toBeGreaterThan(0);
    });

    it('should update existing vertices when coordinates change', async () => {
      // First update
      const surveyData1: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 }
        ],
        triangles: [[0, 1, 2]],
        metadata: {
          source: 'test-survey-1',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      await model.updateMeshFromSurvey(surveyData1);

      // Second update with modified coordinates
      const surveyData2: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0.5 }, // Changed z coordinate
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 }
        ],
        triangles: [[0, 1, 2]],
        metadata: {
          source: 'test-survey-2',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      const result = await model.updateMeshFromSurvey(surveyData2);

      expect(result.success).toBe(true);
      expect(result.verticesUpdated).toBe(2); // Two vertices remain the same
      expect(result.verticesAdded).toBe(1); // One vertex changed position (new ID)
    });

    it('should update bounding box correctly', async () => {
      const surveyData: SurveyData = {
        points: [
          { x: -5, y: -3, z: 2 },
          { x: 10, y: 7, z: 15 },
          { x: 0, y: 0, z: 0 }
        ],
        triangles: [[0, 1, 2]],
        metadata: {
          source: 'test-survey',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      await model.updateMeshFromSurvey(surveyData);

      const mesh = model.getMesh();
      expect(mesh.boundingBox.min.x).toBe(-5);
      expect(mesh.boundingBox.min.y).toBe(-3);
      expect(mesh.boundingBox.min.z).toBe(0);
      expect(mesh.boundingBox.max.x).toBe(10);
      expect(mesh.boundingBox.max.y).toBe(7);
      expect(mesh.boundingBox.max.z).toBe(15);
    });
  });

  describe('findNearbyVertices', () => {
    beforeEach(async () => {
      const surveyData: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
          { x: 5, y: 5, z: 0 }, // Far away point
        ],
        triangles: [
          [0, 1, 2],
          [0, 2, 3]
        ],
        metadata: {
          source: 'test-survey',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      await model.updateMeshFromSurvey(surveyData);
    });

    it('should find vertices within specified radius', () => {
      const center: Point3D = { x: 0, y: 0, z: 0 };
      const radius = 2;

      const nearbyVertices = model.findNearbyVertices(center, radius);

      expect(nearbyVertices.length).toBe(3); // Should find first 3 vertices
      expect(nearbyVertices.some(v => v.position.x === 5)).toBe(false); // Should not find far vertex
    });

    it('should return empty array when no vertices in radius', () => {
      const center: Point3D = { x: 100, y: 100, z: 0 };
      const radius = 1;

      const nearbyVertices = model.findNearbyVertices(center, radius);

      expect(nearbyVertices.length).toBe(0);
    });
  });

  describe('getVertexAnalysis', () => {
    beforeEach(async () => {
      const surveyData: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
          { x: 1, y: 1, z: 1 }
        ],
        triangles: [
          [0, 1, 2],
          [1, 2, 3]
        ],
        metadata: {
          source: 'test-survey',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      await model.updateMeshFromSurvey(surveyData);
    });

    it('should return geometric analysis for existing vertex', () => {
      const mesh = model.getMesh();
      const vertexId = Array.from(mesh.vertices.keys())[0];

      const analysis = model.getVertexAnalysis(vertexId);

      expect(analysis).not.toBeNull();
      expect(analysis!.slope).toBeGreaterThanOrEqual(0);
      expect(analysis!.aspect).toBeGreaterThanOrEqual(0);
      expect(analysis!.aspect).toBeLessThan(360);
      expect(analysis!.stability.classification).toMatch(/stable|marginally_stable|unstable/);
    });

    it('should return null for non-existent vertex', () => {
      const analysis = model.getVertexAnalysis('non-existent-vertex');

      expect(analysis).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty mesh', () => {
      const stats = model.getStatistics();

      expect(stats.vertexCount).toBe(0);
      expect(stats.faceCount).toBe(0);
      expect(stats.boundingBox.min.x).toBe(Infinity);
      expect(stats.spatialIndexStats).toBeDefined();
    });

    it('should return correct statistics after mesh update', async () => {
      const surveyData: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 }
        ],
        triangles: [[0, 1, 2]],
        metadata: {
          source: 'test-survey',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      await model.updateMeshFromSurvey(surveyData);

      const stats = model.getStatistics();

      expect(stats.vertexCount).toBe(3);
      expect(stats.faceCount).toBe(1);
      expect(stats.boundingBox.min.x).toBe(0);
      expect(stats.boundingBox.max.x).toBe(1);
      expect(stats.spatialIndexStats.vertexCount).toBe(3);
      expect(stats.spatialIndexStats.faceCount).toBe(1);
    });
  });

  describe('analyzeGeometry', () => {
    beforeEach(async () => {
      const surveyData: SurveyData = {
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
          { x: 1, y: 1, z: 1 }
        ],
        triangles: [
          [0, 1, 2],
          [1, 2, 3]
        ],
        metadata: {
          source: 'test-survey',
          timestamp: new Date(),
          resolution: 1.0,
          coordinateSystem: 'UTM',
          accuracy: 0.1
        }
      };

      await model.updateMeshFromSurvey(surveyData);
    });

    it('should perform spatial query and return analysis', () => {
      const query = {
        type: 'radius' as const,
        geometry: { center: { x: 0, y: 0, z: 0 }, radius: 2 }
      };

      const result = model.analyzeGeometry(query);

      expect(result.vertices.length).toBeGreaterThan(0);
      expect(result.analysis.length).toBe(result.vertices.length);
      expect(result.totalCount).toBeGreaterThan(0);
    });
  });
});