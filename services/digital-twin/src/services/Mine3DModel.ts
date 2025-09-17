import { Vector3 } from 'three';
import { 
  Mine3DMesh, 
  MeshVertex, 
  MeshFace, 
  Point3D, 
  GeometricAnalysis,
  SpatialQuery,
  SpatialQueryResult
} from '../types/geometry';
import { GeometricUtils } from '../utils/geometricUtils';
import { SpatialIndex } from './SpatialIndex';

export interface SurveyData {
  points: Point3D[];
  triangles?: number[][]; // Indices into points array
  metadata: {
    source: string;
    timestamp: Date;
    resolution: number;
    coordinateSystem: string;
    accuracy: number;
  };
}

export interface MeshUpdateResult {
  success: boolean;
  verticesAdded: number;
  verticesUpdated: number;
  verticesRemoved: number;
  facesAdded: number;
  facesUpdated: number;
  facesRemoved: number;
  processingTime: number;
  errors?: string[];
}

export class Mine3DModel {
  private mesh: Mine3DMesh;
  private spatialIndex: SpatialIndex;
  private updateInProgress: boolean = false;

  constructor(meshId: string) {
    this.mesh = {
      id: meshId,
      vertices: new Map(),
      faces: new Map(),
      boundingBox: {
        min: { x: Infinity, y: Infinity, z: Infinity },
        max: { x: -Infinity, y: -Infinity, z: -Infinity }
      },
      lastUpdated: new Date(),
      metadata: {
        source: 'initial',
        resolution: 1.0,
        coordinateSystem: 'UTM'
      }
    };
    
    this.spatialIndex = new SpatialIndex();
  }

  /**
   * Get the current mesh state
   */
  getMesh(): Mine3DMesh {
    return { ...this.mesh };
  }

  /**
   * Update the mesh with new survey data
   */
  async updateMeshFromSurvey(surveyData: SurveyData): Promise<MeshUpdateResult> {
    if (this.updateInProgress) {
      throw new Error('Mesh update already in progress');
    }

    this.updateInProgress = true;
    const startTime = Date.now();
    
    try {
      const result: MeshUpdateResult = {
        success: false,
        verticesAdded: 0,
        verticesUpdated: 0,
        verticesRemoved: 0,
        facesAdded: 0,
        facesUpdated: 0,
        facesRemoved: 0,
        processingTime: 0,
        errors: []
      };

      // Validate survey data
      const validationErrors = this.validateSurveyData(surveyData);
      if (validationErrors.length > 0) {
        result.errors = validationErrors;
        return result;
      }

      // Generate triangulation if not provided
      let triangles = surveyData.triangles;
      if (!triangles) {
        triangles = this.generateDelaunayTriangulation(surveyData.points);
      }

      // Create vertices
      const newVertices = new Map<string, MeshVertex>();
      const vertexIdMap = new Map<number, string>();

      for (let i = 0; i < surveyData.points.length; i++) {
        const point = surveyData.points[i];
        const vertexId = this.generateVertexId(point);
        vertexIdMap.set(i, vertexId);

        const existingVertex = this.mesh.vertices.get(vertexId);
        
        if (existingVertex) {
          // Update existing vertex
          existingVertex.position = point;
          newVertices.set(vertexId, existingVertex);
          result.verticesUpdated++;
        } else {
          // Create new vertex
          const vertex: MeshVertex = {
            id: vertexId,
            position: point,
            normal: new Vector3(0, 0, 1), // Will be calculated later
            neighbors: []
          };
          newVertices.set(vertexId, vertex);
          result.verticesAdded++;
        }
      }

      // Create faces from triangulation
      const newFaces = new Map<string, MeshFace>();
      
      for (const triangle of triangles) {
        if (triangle.length !== 3) continue;
        
        const vertexIds = triangle.map(i => vertexIdMap.get(i)!);
        const vertices = vertexIds.map(id => newVertices.get(id)!);
        
        if (vertices.some(v => !v)) continue; // Skip if any vertex is missing
        
        const faceId = this.generateFaceId(vertexIds);
        const positions = vertices.map(v => v.position);
        
        // Calculate face properties
        const centroid = GeometricUtils.calculateCentroid(positions);
        const normal = GeometricUtils.calculateTriangleNormal({
          vertices: [positions[0], positions[1], positions[2]],
          normal: new Vector3(),
          area: 0
        });
        const area = GeometricUtils.calculateTriangleArea({
          vertices: [positions[0], positions[1], positions[2]],
          normal,
          area: 0
        });

        const face: MeshFace = {
          id: faceId,
          vertices: [vertexIds[0], vertexIds[1], vertexIds[2]],
          normal,
          area,
          centroid
        };

        newFaces.set(faceId, face);
        
        if (this.mesh.faces.has(faceId)) {
          result.facesUpdated++;
        } else {
          result.facesAdded++;
        }

        // Update vertex neighbors
        for (let i = 0; i < 3; i++) {
          const vertex = vertices[i];
          const neighbor1 = vertexIds[(i + 1) % 3];
          const neighbor2 = vertexIds[(i + 2) % 3];
          
          if (!vertex.neighbors.includes(neighbor1)) {
            vertex.neighbors.push(neighbor1);
          }
          if (!vertex.neighbors.includes(neighbor2)) {
            vertex.neighbors.push(neighbor2);
          }
        }
      }

      // Calculate vertex normals
      this.calculateVertexNormals(newVertices, newFaces);

      // Update bounding box
      this.updateBoundingBox(Array.from(newVertices.values()));

      // Update mesh
      this.mesh.vertices = newVertices;
      this.mesh.faces = newFaces;
      this.mesh.lastUpdated = new Date();
      this.mesh.metadata = surveyData.metadata;

      // Rebuild spatial index
      await this.rebuildSpatialIndex();

      result.success = true;
      result.processingTime = Date.now() - startTime;
      
      return result;

    } catch (error) {
      return {
        success: false,
        verticesAdded: 0,
        verticesUpdated: 0,
        verticesRemoved: 0,
        facesAdded: 0,
        facesUpdated: 0,
        facesRemoved: 0,
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * Perform geometric analysis on a specific area
   */
  analyzeGeometry(query: SpatialQuery): SpatialQueryResult {
    return this.spatialIndex.query(query);
  }

  /**
   * Get geometric analysis for a specific vertex
   */
  getVertexAnalysis(vertexId: string): GeometricAnalysis | null {
    const vertex = this.mesh.vertices.get(vertexId);
    if (!vertex) return null;

    const neighbors = vertex.neighbors
      .map(id => this.mesh.vertices.get(id))
      .filter(v => v !== undefined)
      .map(v => v!.position);

    return GeometricUtils.analyzeGeometry(vertex.position, neighbors, vertex.normal);
  }

  /**
   * Find vertices within a radius of a point
   */
  findNearbyVertices(center: Point3D, radius: number): MeshVertex[] {
    return this.spatialIndex.findVerticesInRadius(center, radius);
  }

  /**
   * Find faces within a radius of a point
   */
  findNearbyFaces(center: Point3D, radius: number): MeshFace[] {
    return this.spatialIndex.findFacesInRadius(center, radius);
  }

  /**
   * Get mesh statistics
   */
  getStatistics(): {
    vertexCount: number;
    faceCount: number;
    boundingBox: { min: Point3D; max: Point3D };
    lastUpdated: Date;
    spatialIndexStats: any;
  } {
    return {
      vertexCount: this.mesh.vertices.size,
      faceCount: this.mesh.faces.size,
      boundingBox: this.mesh.boundingBox,
      lastUpdated: this.mesh.lastUpdated,
      spatialIndexStats: this.spatialIndex.getStatistics()
    };
  }

  /**
   * Validate survey data
   */
  private validateSurveyData(surveyData: SurveyData): string[] {
    const errors: string[] = [];

    if (!surveyData.points || surveyData.points.length < 3) {
      errors.push('Survey data must contain at least 3 points');
    }

    if (surveyData.triangles) {
      for (const triangle of surveyData.triangles) {
        if (triangle.length !== 3) {
          errors.push('All triangles must have exactly 3 vertices');
          break;
        }
        
        for (const index of triangle) {
          if (index < 0 || index >= surveyData.points.length) {
            errors.push('Triangle vertex index out of bounds');
            break;
          }
        }
      }
    }

    // Check for duplicate points
    const pointSet = new Set();
    for (const point of surveyData.points) {
      const key = `${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`;
      if (pointSet.has(key)) {
        errors.push('Duplicate points detected in survey data');
        break;
      }
      pointSet.add(key);
    }

    return errors;
  }

  /**
   * Generate Delaunay triangulation for points (simplified 2D projection)
   */
  private generateDelaunayTriangulation(points: Point3D[]): number[][] {
    // This is a simplified implementation
    // In production, you'd use a proper Delaunay triangulation library
    
    const triangles: number[][] = [];
    
    // Simple fan triangulation from first point (not optimal but functional)
    for (let i = 1; i < points.length - 1; i++) {
      triangles.push([0, i, i + 1]);
    }
    
    return triangles;
  }

  /**
   * Calculate vertex normals from adjacent faces
   */
  private calculateVertexNormals(vertices: Map<string, MeshVertex>, faces: Map<string, MeshFace>): void {
    // Initialize vertex normals
    for (const vertex of vertices.values()) {
      vertex.normal = new Vector3(0, 0, 0);
    }

    // Accumulate face normals
    for (const face of faces.values()) {
      for (const vertexId of face.vertices) {
        const vertex = vertices.get(vertexId);
        if (vertex) {
          vertex.normal.add(face.normal.clone().multiplyScalar(face.area));
        }
      }
    }

    // Normalize vertex normals
    for (const vertex of vertices.values()) {
      vertex.normal.normalize();
    }
  }

  /**
   * Update bounding box from vertices
   */
  private updateBoundingBox(vertices: MeshVertex[]): void {
    if (vertices.length === 0) return;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const vertex of vertices) {
      const pos = vertex.position;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
      maxZ = Math.max(maxZ, pos.z);
    }

    this.mesh.boundingBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };
  }

  /**
   * Rebuild the spatial index
   */
  private async rebuildSpatialIndex(): Promise<void> {
    this.spatialIndex.clear();

    // Add all vertices to spatial index
    for (const vertex of this.mesh.vertices.values()) {
      this.spatialIndex.addVertex(vertex);
    }

    // Add all faces to spatial index
    for (const face of this.mesh.faces.values()) {
      this.spatialIndex.addFace(face);
    }
  }

  /**
   * Generate unique vertex ID from position
   */
  private generateVertexId(position: Point3D): string {
    // Round to avoid floating point precision issues
    const x = Math.round(position.x * 1000) / 1000;
    const y = Math.round(position.y * 1000) / 1000;
    const z = Math.round(position.z * 1000) / 1000;
    return `v_${x}_${y}_${z}`;
  }

  /**
   * Generate unique face ID from vertex IDs
   */
  private generateFaceId(vertexIds: string[]): string {
    const sorted = [...vertexIds].sort();
    return `f_${sorted.join('_')}`;
  }
}