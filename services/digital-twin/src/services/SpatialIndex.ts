import RBush from 'rbush';
import { Point3D, MeshVertex, MeshFace, SpatialQuery, SpatialQueryResult } from '../types/geometry';
import { GeometricUtils } from '../utils/geometricUtils';

interface IndexedVertex {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  vertex: MeshVertex;
}

interface IndexedFace {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  face: MeshFace;
}

export class SpatialIndex {
  private vertexIndex: RBush<IndexedVertex>;
  private faceIndex: RBush<IndexedFace>;
  private vertices: Map<string, MeshVertex>;
  private faces: Map<string, MeshFace>;

  constructor() {
    this.vertexIndex = new RBush<IndexedVertex>();
    this.faceIndex = new RBush<IndexedFace>();
    this.vertices = new Map();
    this.faces = new Map();
  }

  /**
   * Add a vertex to the spatial index
   */
  addVertex(vertex: MeshVertex): void {
    this.vertices.set(vertex.id, vertex);
    
    const indexedVertex: IndexedVertex = {
      minX: vertex.position.x,
      minY: vertex.position.y,
      maxX: vertex.position.x,
      maxY: vertex.position.y,
      vertex
    };
    
    this.vertexIndex.insert(indexedVertex);
  }

  /**
   * Add a face to the spatial index
   */
  addFace(face: MeshFace): void {
    this.faces.set(face.id, face);
    
    // Calculate bounding box for the face
    const vertices = face.vertices.map(id => this.vertices.get(id)!);
    const positions = vertices.map(v => v.position);
    
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));
    
    const indexedFace: IndexedFace = {
      minX,
      minY,
      maxX,
      maxY,
      face
    };
    
    this.faceIndex.insert(indexedFace);
  }

  /**
   * Remove a vertex from the spatial index
   */
  removeVertex(vertexId: string): void {
    const vertex = this.vertices.get(vertexId);
    if (!vertex) return;
    
    // Find and remove the indexed vertex
    const searchBbox = {
      minX: vertex.position.x,
      minY: vertex.position.y,
      maxX: vertex.position.x,
      maxY: vertex.position.y
    };
    
    const candidates = this.vertexIndex.search(searchBbox);
    const toRemove = candidates.find(item => item.vertex.id === vertexId);
    
    if (toRemove) {
      this.vertexIndex.remove(toRemove);
    }
    
    this.vertices.delete(vertexId);
  }

  /**
   * Remove a face from the spatial index
   */
  removeFace(faceId: string): void {
    const face = this.faces.get(faceId);
    if (!face) return;
    
    // Find and remove the indexed face
    const vertices = face.vertices.map(id => this.vertices.get(id)!);
    const positions = vertices.map(v => v.position);
    
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));
    
    const indexedFace: IndexedFace = {
      minX,
      minY,
      maxX,
      maxY,
      face
    };
    
    this.faceIndex.remove(indexedFace);
    this.faces.delete(faceId);
  }

  /**
   * Find vertices within a radius of a point
   */
  findVerticesInRadius(center: Point3D, radius: number): MeshVertex[] {
    const bbox = {
      minX: center.x - radius,
      minY: center.y - radius,
      maxX: center.x + radius,
      maxY: center.y + radius
    };
    
    const candidates = this.vertexIndex.search(bbox);
    
    // Filter by actual distance (including Z coordinate)
    return candidates
      .filter((item: IndexedVertex) => {
        const distance = GeometricUtils.distance(center, item.vertex.position);
        return distance <= radius;
      })
      .map((item: IndexedVertex) => item.vertex);
  }

  /**
   * Find faces within a radius of a point
   */
  findFacesInRadius(center: Point3D, radius: number): MeshFace[] {
    const bbox = {
      minX: center.x - radius,
      minY: center.y - radius,
      maxX: center.x + radius,
      maxY: center.y + radius
    };
    
    const candidates = this.faceIndex.search(bbox);
    
    // Filter by actual distance to face centroid
    return candidates
      .filter((item: IndexedFace) => {
        const distance = GeometricUtils.distance(center, item.face.centroid);
        return distance <= radius;
      })
      .map((item: IndexedFace) => item.face);
  }

  /**
   * Find vertices within a bounding box
   */
  findVerticesInBoundingBox(min: Point3D, max: Point3D): MeshVertex[] {
    const bbox = {
      minX: min.x,
      minY: min.y,
      maxX: max.x,
      maxY: max.y
    };
    
    const candidates = this.vertexIndex.search(bbox);
    
    // Filter by Z coordinate as well
    return candidates
      .filter((item: IndexedVertex) => {
        const pos = item.vertex.position;
        return pos.z >= min.z && pos.z <= max.z;
      })
      .map((item: IndexedVertex) => item.vertex);
  }

  /**
   * Find faces within a bounding box
   */
  findFacesInBoundingBox(min: Point3D, max: Point3D): MeshFace[] {
    const bbox = {
      minX: min.x,
      minY: min.y,
      maxX: max.x,
      maxY: max.y
    };
    
    const candidates = this.faceIndex.search(bbox);
    
    // Filter by Z coordinate
    return candidates
      .filter((item: IndexedFace) => {
        const centroid = item.face.centroid;
        return centroid.z >= min.z && centroid.z <= max.z;
      })
      .map((item: IndexedFace) => item.face);
  }

  /**
   * Find the nearest vertex to a point
   */
  findNearestVertex(point: Point3D, maxDistance?: number): MeshVertex | null {
    const searchRadius = maxDistance || 100; // Default search radius
    const candidates = this.findVerticesInRadius(point, searchRadius);
    
    if (candidates.length === 0) return null;
    
    let nearest = candidates[0];
    let minDistance = GeometricUtils.distance(point, nearest.position);
    
    for (let i = 1; i < candidates.length; i++) {
      const distance = GeometricUtils.distance(point, candidates[i].position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = candidates[i];
      }
    }
    
    return nearest;
  }

  /**
   * Find the nearest face to a point
   */
  findNearestFace(point: Point3D, maxDistance?: number): MeshFace | null {
    const searchRadius = maxDistance || 100; // Default search radius
    const candidates = this.findFacesInRadius(point, searchRadius);
    
    if (candidates.length === 0) return null;
    
    let nearest = candidates[0];
    let minDistance = GeometricUtils.distance(point, nearest.centroid);
    
    for (let i = 1; i < candidates.length; i++) {
      const distance = GeometricUtils.distance(point, candidates[i].centroid);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = candidates[i];
      }
    }
    
    return nearest;
  }

  /**
   * Execute a spatial query
   */
  query(spatialQuery: SpatialQuery): SpatialQueryResult {
    let vertices: MeshVertex[] = [];
    let faces: MeshFace[] = [];
    
    switch (spatialQuery.type) {
      case 'point':
        const point = spatialQuery.geometry as Point3D;
        const nearestVertex = this.findNearestVertex(point);
        const nearestFace = this.findNearestFace(point);
        
        if (nearestVertex) vertices = [nearestVertex];
        if (nearestFace) faces = [nearestFace];
        break;
        
      case 'radius':
        const radiusQuery = spatialQuery.geometry as { center: Point3D; radius: number };
        vertices = this.findVerticesInRadius(radiusQuery.center, radiusQuery.radius);
        faces = this.findFacesInRadius(radiusQuery.center, radiusQuery.radius);
        break;
        
      case 'box':
        const boxQuery = spatialQuery.geometry as { min: Point3D; max: Point3D };
        vertices = this.findVerticesInBoundingBox(boxQuery.min, boxQuery.max);
        faces = this.findFacesInBoundingBox(boxQuery.min, boxQuery.max);
        break;
        
      default:
        throw new Error(`Unsupported query type: ${spatialQuery.type}`);
    }
    
    // Apply filters if specified
    if (spatialQuery.filters) {
      vertices = this.applyFilters(vertices, faces, spatialQuery.filters).vertices;
      faces = this.applyFilters(vertices, faces, spatialQuery.filters).faces;
    }
    
    // Generate geometric analysis for results
    const analysis = vertices.map(vertex => {
      const neighbors = vertex.neighbors
        .map(id => this.vertices.get(id))
        .filter(v => v !== undefined)
        .map(v => v!.position);
      
      return GeometricUtils.analyzeGeometry(vertex.position, neighbors, vertex.normal);
    });
    
    return {
      vertices,
      faces,
      analysis,
      totalCount: vertices.length + faces.length
    };
  }

  /**
   * Apply filters to query results
   */
  private applyFilters(
    vertices: MeshVertex[],
    faces: MeshFace[],
    filters: NonNullable<SpatialQuery['filters']>
  ): { vertices: MeshVertex[]; faces: MeshFace[] } {
    let filteredVertices = vertices;
    let filteredFaces = faces;
    
    // Apply elevation filter
    if (filters.elevation) {
      const { min, max } = filters.elevation;
      filteredVertices = filteredVertices.filter(v => {
        const z = v.position.z;
        return (min === undefined || z >= min) && (max === undefined || z <= max);
      });
      
      filteredFaces = filteredFaces.filter(f => {
        const z = f.centroid.z;
        return (min === undefined || z >= min) && (max === undefined || z <= max);
      });
    }
    
    // Apply slope filter (requires geometric analysis)
    if (filters.slope) {
      const { min, max } = filters.slope;
      filteredVertices = filteredVertices.filter(v => {
        const slope = GeometricUtils.calculateSlope(v.normal);
        return (min === undefined || slope >= min) && (max === undefined || slope <= max);
      });
    }
    
    return { vertices: filteredVertices, faces: filteredFaces };
  }

  /**
   * Get statistics about the spatial index
   */
  getStatistics(): {
    vertexCount: number;
    faceCount: number;
    indexDepth: number;
  } {
    return {
      vertexCount: this.vertices.size,
      faceCount: this.faces.size,
      indexDepth: Math.max(this.vertexIndex.toJSON().height || 0, this.faceIndex.toJSON().height || 0)
    };
  }

  /**
   * Clear all data from the spatial index
   */
  clear(): void {
    this.vertexIndex.clear();
    this.faceIndex.clear();
    this.vertices.clear();
    this.faces.clear();
  }
}