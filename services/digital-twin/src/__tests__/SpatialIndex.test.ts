import { Vector3 } from 'three';
import { SpatialIndex } from '../services/SpatialIndex';
import { MeshVertex, MeshFace, Point3D } from '../types/geometry';

describe('SpatialIndex', () => {
  let spatialIndex: SpatialIndex;

  beforeEach(() => {
    spatialIndex = new SpatialIndex();
  });

  describe('addVertex and findVerticesInRadius', () => {
    it('should add vertices and find them within radius', () => {
      const vertices: MeshVertex[] = [
        {
          id: 'v1',
          position: { x: 0, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        },
        {
          id: 'v2',
          position: { x: 1, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        },
        {
          id: 'v3',
          position: { x: 5, y: 5, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        }
      ];

      vertices.forEach(v => spatialIndex.addVertex(v));

      const center: Point3D = { x: 0, y: 0, z: 0 };
      const nearbyVertices = spatialIndex.findVerticesInRadius(center, 2);

      expect(nearbyVertices.length).toBe(2);
      expect(nearbyVertices.map(v => v.id)).toContain('v1');
      expect(nearbyVertices.map(v => v.id)).toContain('v2');
      expect(nearbyVertices.map(v => v.id)).not.toContain('v3');
    });

    it('should handle 3D distance correctly', () => {
      const vertices: MeshVertex[] = [
        {
          id: 'v1',
          position: { x: 0, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        },
        {
          id: 'v2',
          position: { x: 0, y: 0, z: 3 }, // 3 units away in Z
          normal: new Vector3(0, 0, 1),
          neighbors: []
        }
      ];

      vertices.forEach(v => spatialIndex.addVertex(v));

      const center: Point3D = { x: 0, y: 0, z: 0 };
      
      // Should find vertex within radius
      const nearbyVertices1 = spatialIndex.findVerticesInRadius(center, 4);
      expect(nearbyVertices1.length).toBe(2);

      // Should not find vertex outside radius
      const nearbyVertices2 = spatialIndex.findVerticesInRadius(center, 2);
      expect(nearbyVertices2.length).toBe(1);
      expect(nearbyVertices2[0].id).toBe('v1');
    });
  });

  describe('addFace and findFacesInRadius', () => {
    beforeEach(() => {
      // Add vertices first
      const vertices: MeshVertex[] = [
        {
          id: 'v1',
          position: { x: 0, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: ['v2', 'v3']
        },
        {
          id: 'v2',
          position: { x: 1, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: ['v1', 'v3']
        },
        {
          id: 'v3',
          position: { x: 0, y: 1, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: ['v1', 'v2']
        }
      ];

      vertices.forEach(v => spatialIndex.addVertex(v));
    });

    it('should add faces and find them within radius', () => {
      const face: MeshFace = {
        id: 'f1',
        vertices: ['v1', 'v2', 'v3'],
        normal: new Vector3(0, 0, 1),
        area: 0.5,
        centroid: { x: 0.33, y: 0.33, z: 0 }
      };

      spatialIndex.addFace(face);

      const center: Point3D = { x: 0, y: 0, z: 0 };
      const nearbyFaces = spatialIndex.findFacesInRadius(center, 1);

      expect(nearbyFaces.length).toBe(1);
      expect(nearbyFaces[0].id).toBe('f1');
    });

    it('should not find faces outside radius', () => {
      const face: MeshFace = {
        id: 'f1',
        vertices: ['v1', 'v2', 'v3'],
        normal: new Vector3(0, 0, 1),
        area: 0.5,
        centroid: { x: 10, y: 10, z: 0 }
      };

      spatialIndex.addFace(face);

      const center: Point3D = { x: 0, y: 0, z: 0 };
      const nearbyFaces = spatialIndex.findFacesInRadius(center, 1);

      expect(nearbyFaces.length).toBe(0);
    });
  });

  describe('findVerticesInBoundingBox', () => {
    beforeEach(() => {
      const vertices: MeshVertex[] = [
        {
          id: 'v1',
          position: { x: 0, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        },
        {
          id: 'v2',
          position: { x: 5, y: 5, z: 5 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        },
        {
          id: 'v3',
          position: { x: 15, y: 15, z: 15 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        }
      ];

      vertices.forEach(v => spatialIndex.addVertex(v));
    });

    it('should find vertices within bounding box', () => {
      const min: Point3D = { x: -1, y: -1, z: -1 };
      const max: Point3D = { x: 10, y: 10, z: 10 };

      const vertices = spatialIndex.findVerticesInBoundingBox(min, max);

      expect(vertices.length).toBe(2);
      expect(vertices.map(v => v.id)).toContain('v1');
      expect(vertices.map(v => v.id)).toContain('v2');
      expect(vertices.map(v => v.id)).not.toContain('v3');
    });

    it('should handle Z coordinate filtering', () => {
      const min: Point3D = { x: -1, y: -1, z: 3 };
      const max: Point3D = { x: 10, y: 10, z: 10 };

      const vertices = spatialIndex.findVerticesInBoundingBox(min, max);

      expect(vertices.length).toBe(1);
      expect(vertices[0].id).toBe('v2');
    });
  });

  describe('findNearestVertex', () => {
    beforeEach(() => {
      const vertices: MeshVertex[] = [
        {
          id: 'v1',
          position: { x: 0, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        },
        {
          id: 'v2',
          position: { x: 3, y: 4, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        },
        {
          id: 'v3',
          position: { x: 1, y: 1, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: []
        }
      ];

      vertices.forEach(v => spatialIndex.addVertex(v));
    });

    it('should find the nearest vertex', () => {
      const point: Point3D = { x: 0.5, y: 0.5, z: 0 };
      const nearest = spatialIndex.findNearestVertex(point);

      expect(nearest).not.toBeNull();
      // v3 at (1,1,0) should be closest to (0.5, 0.5, 0) with distance ~0.71
      // v1 at (0,0,0) has distance ~0.71 as well, but let's check which one is actually returned
      expect(['v1', 'v3']).toContain(nearest!.id);
    });

    it('should return null when no vertices within max distance', () => {
      const point: Point3D = { x: 100, y: 100, z: 0 };
      const nearest = spatialIndex.findNearestVertex(point, 1);

      expect(nearest).toBeNull();
    });

    it('should respect max distance parameter', () => {
      const point: Point3D = { x: 0, y: 0, z: 0 };
      const nearest = spatialIndex.findNearestVertex(point, 0.5);

      expect(nearest).not.toBeNull();
      expect(nearest!.id).toBe('v1');
    });
  });

  describe('removeVertex', () => {
    it('should remove vertex from index', () => {
      const vertex: MeshVertex = {
        id: 'v1',
        position: { x: 0, y: 0, z: 0 },
        normal: new Vector3(0, 0, 1),
        neighbors: []
      };

      spatialIndex.addVertex(vertex);
      
      // Verify vertex is added
      let stats = spatialIndex.getStatistics();
      expect(stats.vertexCount).toBe(1);

      // Remove vertex
      spatialIndex.removeVertex('v1');

      // Verify vertex is removed
      stats = spatialIndex.getStatistics();
      expect(stats.vertexCount).toBe(0);

      const center: Point3D = { x: 0, y: 0, z: 0 };
      const nearbyVertices = spatialIndex.findVerticesInRadius(center, 1);
      expect(nearbyVertices.length).toBe(0);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      const vertices: MeshVertex[] = [
        {
          id: 'v1',
          position: { x: 0, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: ['v2']
        },
        {
          id: 'v2',
          position: { x: 1, y: 0, z: 0 },
          normal: new Vector3(0, 0, 1),
          neighbors: ['v1']
        }
      ];

      vertices.forEach(v => spatialIndex.addVertex(v));
    });

    it('should handle point query', () => {
      const query = {
        type: 'point' as const,
        geometry: { x: 0, y: 0, z: 0 }
      };

      const result = spatialIndex.query(query);

      expect(result.vertices.length).toBe(1);
      expect(result.vertices[0].id).toBe('v1');
      expect(result.analysis.length).toBe(1);
    });

    it('should handle radius query', () => {
      const query = {
        type: 'radius' as const,
        geometry: { center: { x: 0, y: 0, z: 0 }, radius: 2 }
      };

      const result = spatialIndex.query(query);

      expect(result.vertices.length).toBe(2);
      expect(result.totalCount).toBe(2);
    });

    it('should handle box query', () => {
      const query = {
        type: 'box' as const,
        geometry: { min: { x: -1, y: -1, z: -1 }, max: { x: 0.5, y: 0.5, z: 0.5 } }
      };

      const result = spatialIndex.query(query);

      expect(result.vertices.length).toBe(1);
      expect(result.vertices[0].id).toBe('v1');
    });

    it('should apply elevation filters', () => {
      // Add vertex with different elevation
      const vertex: MeshVertex = {
        id: 'v3',
        position: { x: 0, y: 0, z: 10 },
        normal: new Vector3(0, 0, 1),
        neighbors: []
      };
      spatialIndex.addVertex(vertex);

      const query = {
        type: 'radius' as const,
        geometry: { center: { x: 0, y: 0, z: 5 }, radius: 20 },
        filters: {
          elevation: { min: 5, max: 15 }
        }
      };

      const result = spatialIndex.query(query);

      expect(result.vertices.length).toBe(1);
      expect(result.vertices[0].id).toBe('v3');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const vertex: MeshVertex = {
        id: 'v1',
        position: { x: 0, y: 0, z: 0 },
        normal: new Vector3(0, 0, 1),
        neighbors: []
      };

      spatialIndex.addVertex(vertex);

      const stats = spatialIndex.getStatistics();

      expect(stats.vertexCount).toBe(1);
      expect(stats.faceCount).toBe(0);
      expect(stats.indexDepth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clear', () => {
    it('should clear all data from index', () => {
      const vertex: MeshVertex = {
        id: 'v1',
        position: { x: 0, y: 0, z: 0 },
        normal: new Vector3(0, 0, 1),
        neighbors: []
      };

      spatialIndex.addVertex(vertex);
      
      // Verify data is added
      let stats = spatialIndex.getStatistics();
      expect(stats.vertexCount).toBe(1);

      // Clear index
      spatialIndex.clear();

      // Verify data is cleared
      stats = spatialIndex.getStatistics();
      expect(stats.vertexCount).toBe(0);
      expect(stats.faceCount).toBe(0);
    });
  });
});