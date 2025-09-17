import { Point3D } from './geometry';

export interface MaterialProperties {
  density: number; // kg/m³
  youngsModulus: number; // Pa
  poissonsRatio: number;
  cohesion: number; // Pa
  frictionAngle: number; // degrees
  tensileStrength: number; // Pa
  compressiveStrength: number; // Pa
  permeability: number; // m/s
  porosity: number; // 0-1
}

export interface StressState {
  sigma_xx: number; // Normal stress in x direction (Pa)
  sigma_yy: number; // Normal stress in y direction (Pa)
  sigma_zz: number; // Normal stress in z direction (Pa)
  tau_xy: number; // Shear stress in xy plane (Pa)
  tau_xz: number; // Shear stress in xz plane (Pa)
  tau_yz: number; // Shear stress in yz plane (Pa)
}

export interface StrainState {
  epsilon_xx: number; // Normal strain in x direction
  epsilon_yy: number; // Normal strain in y direction
  epsilon_zz: number; // Normal strain in z direction
  gamma_xy: number; // Shear strain in xy plane
  gamma_xz: number; // Shear strain in xz plane
  gamma_yz: number; // Shear strain in yz plane
}

export interface FiniteElement {
  id: string;
  nodes: string[]; // Node IDs
  materialId: string;
  elementType: 'tetrahedron' | 'hexahedron' | 'triangular_prism';
  volume: number;
  centroid: Point3D;
}

export interface FEMNode {
  id: string;
  position: Point3D;
  displacement: Point3D;
  velocity: Point3D;
  acceleration: Point3D;
  boundaryConditions: BoundaryCondition[];
  connectedElements: string[];
}

export interface BoundaryCondition {
  type: 'displacement' | 'force' | 'pressure' | 'fixed';
  direction: 'x' | 'y' | 'z' | 'normal' | 'all';
  value: number;
  isActive: boolean;
}

export interface LoadCase {
  id: string;
  name: string;
  description: string;
  loads: Load[];
  boundaryConditions: BoundaryCondition[];
  analysisType: 'static' | 'dynamic' | 'modal' | 'buckling';
}

export interface Load {
  type: 'point_force' | 'distributed_force' | 'pressure' | 'body_force' | 'thermal';
  nodeIds?: string[];
  elementIds?: string[];
  direction: Point3D;
  magnitude: number;
  distribution?: 'uniform' | 'linear' | 'parabolic';
}

export interface FEMAnalysisResult {
  loadCaseId: string;
  timestamp: Date;
  converged: boolean;
  iterations: number;
  maxDisplacement: number;
  maxStress: number;
  nodeResults: Map<string, {
    displacement: Point3D;
    stress: StressState;
    strain: StrainState;
  }>;
  elementResults: Map<string, {
    stress: StressState;
    strain: StrainState;
    principalStresses: [number, number, number];
    vonMisesStress: number;
  }>;
  safetyFactors: Map<string, number>;
}

export interface SlopeStabilityAnalysis {
  method: 'limit_equilibrium' | 'finite_element' | 'limit_analysis';
  slipSurfaces: SlipSurface[];
  safetyFactor: number;
  criticalSlipSurface: string;
  analysisParameters: {
    searchMethod: 'circular' | 'non_circular' | 'block' | 'wedge';
    numberOfSlices: number;
    convergenceTolerance: number;
    maxIterations: number;
  };
}

export interface SlipSurface {
  id: string;
  points: Point3D[];
  safetyFactor: number;
  drivingForce: number; // N/m
  resistingForce: number; // N/m
  sliceAnalysis: SliceAnalysis[];
  volume: number; // m³
  weight: number; // N
}

export interface SliceAnalysis {
  sliceNumber: number;
  width: number; // m
  height: number; // m
  weight: number; // N
  normalForce: number; // N
  shearForce: number; // N
  porePressure: number; // Pa
  effectiveStress: number; // Pa
  mobilizedShearStrength: number; // Pa
  availableShearStrength: number; // Pa
}

export interface GroundwaterFlow {
  nodes: Map<string, HydraulicNode>;
  elements: Map<string, HydraulicElement>;
  boundaryConditions: HydraulicBoundaryCondition[];
  analysisType: 'steady_state' | 'transient';
  convergenceCriteria: {
    maxIterations: number;
    tolerance: number;
  };
}

export interface HydraulicNode {
  id: string;
  position: Point3D;
  hydraulicHead: number; // m
  pressure: number; // Pa
  velocity: Point3D; // m/s
  boundaryConditions: HydraulicBoundaryCondition[];
}

export interface HydraulicElement {
  id: string;
  nodes: string[];
  permeability: number; // m/s
  porosity: number;
  specificStorage: number; // 1/m
  volume: number; // m³
  flow: Point3D; // m³/s per unit volume
}

export interface HydraulicBoundaryCondition {
  type: 'prescribed_head' | 'prescribed_flow' | 'seepage_face' | 'impermeable';
  nodeIds: string[];
  value: number;
  isActive: boolean;
}

export interface GroundwaterAnalysisResult {
  timestamp: Date;
  converged: boolean;
  iterations: number;
  totalFlow: number; // m³/s
  nodeResults: Map<string, {
    hydraulicHead: number;
    pressure: number;
    velocity: Point3D;
  }>;
  elementResults: Map<string, {
    flow: Point3D;
    seepageVelocity: Point3D;
    hydraulicGradient: Point3D;
  }>;
  seepageForces: Map<string, Point3D>; // Forces on structural elements
}

export interface PhysicsConstraint {
  type: 'equilibrium' | 'compatibility' | 'constitutive' | 'boundary';
  description: string;
  equation: string;
  tolerance: number;
  isActive: boolean;
  violationPenalty: number;
}

export interface PhysicsValidationResult {
  isValid: boolean;
  constraintViolations: {
    constraint: PhysicsConstraint;
    violation: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    location?: Point3D;
  }[];
  energyBalance: {
    strainEnergy: number;
    kineticEnergy: number;
    potentialEnergy: number;
    workDone: number;
    residual: number;
  };
  massBalance: {
    totalMass: number;
    massChange: number;
    massFlowIn: number;
    massFlowOut: number;
    residual: number;
  };
}

export interface CoupledAnalysis {
  mechanicalAnalysis: FEMAnalysisResult;
  hydraulicAnalysis: GroundwaterAnalysisResult;
  slopeStabilityAnalysis: SlopeStabilityAnalysis;
  couplingEffects: {
    seepageForces: Map<string, Point3D>;
    porePressureEffects: Map<string, number>;
    deformationEffects: Map<string, number>;
  };
  overallSafetyFactor: number;
  criticalFailureModes: string[];
}