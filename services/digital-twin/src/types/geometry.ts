import { Vector3, BufferGeometry, Mesh } from 'three';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  vertices: [Point3D, Point3D, Point3D];
  normal: Vector3;
  area: number;
}

export interface MeshVertex {
  id: string;
  position: Point3D;
  normal: Vector3;
  neighbors: string[];
}

export interface MeshFace {
  id: string;
  vertices: [string, string, string]; // vertex IDs
  normal: Vector3;
  area: number;
  centroid: Point3D;
}

export interface Mine3DMesh {
  id: string;
  vertices: Map<string, MeshVertex>;
  faces: Map<string, MeshFace>;
  boundingBox: {
    min: Point3D;
    max: Point3D;
  };
  lastUpdated: Date;
  metadata: {
    source: string;
    resolution: number;
    coordinateSystem: string;
  };
}

export interface GeometricAnalysis {
  slope: number; // degrees
  aspect: number; // degrees from north
  curvature: {
    mean: number;
    gaussian: number;
    principal1: number;
    principal2: number;
  };
  roughness: number;
  stability: {
    factor: number;
    classification: 'stable' | 'marginally_stable' | 'unstable';
  };
}

export interface SpatialQuery {
  type: 'point' | 'radius' | 'box' | 'polygon';
  geometry: Point3D | { center: Point3D; radius: number } | { min: Point3D; max: Point3D };
  filters?: {
    slope?: { min?: number; max?: number };
    elevation?: { min?: number; max?: number };
    rockType?: string[];
  };
}

export interface SpatialQueryResult {
  vertices: MeshVertex[];
  faces: MeshFace[];
  analysis: GeometricAnalysis[];
  totalCount: number;
}