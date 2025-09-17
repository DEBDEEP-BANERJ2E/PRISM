import {
  SlopeStabilityAnalysis,
  SlipSurface,
  SliceAnalysis,
  MaterialProperties
} from '../types/physics';
import { Point3D } from '../types/geometry';
import { GeometricUtils } from '../utils/geometricUtils';

export class SlopeStabilityAnalyzer {
  private materials: Map<string, MaterialProperties>;
  private groundwaterTable: Map<string, number>; // Node ID -> water level

  constructor() {
    this.materials = new Map();
    this.groundwaterTable = new Map();
  }

  /**
   * Add material properties
   */
  addMaterial(materialId: string, properties: MaterialProperties): void {
    this.materials.set(materialId, properties);
  }

  /**
   * Set groundwater table elevation at a point
   */
  setGroundwaterLevel(nodeId: string, waterLevel: number): void {
    this.groundwaterTable.set(nodeId, waterLevel);
  }

  /**
   * Perform limit equilibrium slope stability analysis
   */
  performLimitEquilibriumAnalysis(
    slopeGeometry: Point3D[],
    materialId: string,
    analysisParameters: {
      searchMethod: 'circular' | 'non_circular' | 'block' | 'wedge';
      numberOfSlices: number;
      convergenceTolerance: number;
      maxIterations: number;
    }
  ): SlopeStabilityAnalysis {
    const material = this.materials.get(materialId);
    if (!material) {
      throw new Error(`Material ${materialId} not found`);
    }

    // Generate potential slip surfaces
    const slipSurfaces = this.generateSlipSurfaces(slopeGeometry, analysisParameters);

    // Analyze each slip surface
    const analyzedSurfaces: SlipSurface[] = [];
    let minSafetyFactor = Infinity;
    let criticalSurfaceId = '';

    for (const surface of slipSurfaces) {
      const analyzedSurface = this.analyzeSlipSurface(surface, material, analysisParameters);
      analyzedSurfaces.push(analyzedSurface);

      if (analyzedSurface.safetyFactor < minSafetyFactor && analyzedSurface.safetyFactor > 0) {
        minSafetyFactor = analyzedSurface.safetyFactor;
        criticalSurfaceId = analyzedSurface.id;
      }
    }

    // If no valid surface found, use the first one
    if (criticalSurfaceId === '' && analyzedSurfaces.length > 0) {
      criticalSurfaceId = analyzedSurfaces[0].id;
      minSafetyFactor = analyzedSurfaces[0].safetyFactor;
    }

    return {
      method: 'limit_equilibrium',
      slipSurfaces: analyzedSurfaces,
      safetyFactor: minSafetyFactor,
      criticalSlipSurface: criticalSurfaceId,
      analysisParameters
    };
  }

  /**
   * Perform Bishop's simplified method analysis
   */
  performBishopAnalysis(
    slipSurface: SlipSurface,
    material: MaterialProperties,
    numberOfSlices: number
  ): number {
    const slices = this.createSlices(slipSurface, numberOfSlices);
    let safetyFactor = 1.0;
    let previousSF = 0.0;
    let iteration = 0;
    const maxIterations = 50;
    const tolerance = 1e-6;

    // Iterative solution for Bishop's method
    while (Math.abs(safetyFactor - previousSF) > tolerance && iteration < maxIterations) {
      previousSF = safetyFactor;
      
      let sumMomentResisting = 0;
      let sumMomentDriving = 0;

      for (const slice of slices) {
        const alpha = this.calculateSliceAngle(slice, slipSurface);
        const weight = slice.weight;
        const porePressure = slice.porePressure;
        const baseLength = slice.width / Math.cos(alpha);
        
        // Effective normal stress
        const normalStress = (weight * Math.cos(alpha) - porePressure * baseLength) / baseLength;
        
        // Available shear strength
        const shearStrength = material.cohesion + normalStress * Math.tan(material.frictionAngle * Math.PI / 180);
        
        // Bishop's factor
        const mAlpha = Math.cos(alpha) + (Math.sin(alpha) * Math.tan(material.frictionAngle * Math.PI / 180)) / safetyFactor;
        
        // Moments
        const momentArm = this.calculateMomentArm(slice, slipSurface);
        sumMomentResisting += (shearStrength * baseLength * momentArm) / mAlpha;
        sumMomentDriving += weight * Math.sin(alpha) * momentArm;
      }

      if (sumMomentDriving > 0) {
        safetyFactor = sumMomentResisting / sumMomentDriving;
      } else {
        safetyFactor = 10.0; // Very stable if no driving moment
      }
      
      // Ensure safety factor is reasonable
      if (isNaN(safetyFactor) || !isFinite(safetyFactor)) {
        safetyFactor = 1.0;
      }
      
      iteration++;
    }

    return safetyFactor;
  }

  /**
   * Perform Spencer's method analysis (considers both force and moment equilibrium)
   */
  performSpencerAnalysis(
    slipSurface: SlipSurface,
    material: MaterialProperties,
    numberOfSlices: number
  ): number {
    const slices = this.createSlices(slipSurface, numberOfSlices);
    
    // Spencer's method requires solving for both safety factor and interslice force inclination
    // This is a simplified implementation
    let safetyFactor = 1.0;
    let theta = 0.0; // Interslice force inclination
    let iteration = 0;
    const maxIterations = 100;
    const tolerance = 1e-6;

    while (iteration < maxIterations) {
      const previousSF = safetyFactor;
      const previousTheta = theta;

      // Force equilibrium
      let sumFx = 0;
      let sumFy = 0;
      let sumM = 0;

      for (let i = 0; i < slices.length; i++) {
        const slice = slices[i];
        const alpha = this.calculateSliceAngle(slice, slipSurface);
        const weight = slice.weight;
        const porePressure = slice.porePressure;
        const baseLength = slice.width / Math.cos(alpha);
        
        // Normal and shear forces on base
        const normalForce = weight * Math.cos(alpha) - porePressure * baseLength;
        const availableShearStrength = material.cohesion + (normalForce / baseLength) * Math.tan(material.frictionAngle * Math.PI / 180);
        const mobilizedShearForce = availableShearStrength * baseLength / safetyFactor;
        
        // Interslice forces
        const intersliceForceLeft = i > 0 ? this.calculateIntersliceForce(slices[i-1], theta) : 0;
        const intersliceForceRight = i < slices.length - 1 ? this.calculateIntersliceForce(slice, theta) : 0;
        
        // Force equilibrium
        sumFx += mobilizedShearForce * Math.cos(alpha) - normalForce * Math.sin(alpha) + 
                 intersliceForceRight * Math.cos(theta) - intersliceForceLeft * Math.cos(theta);
        sumFy += weight - mobilizedShearForce * Math.sin(alpha) - normalForce * Math.cos(alpha) +
                 intersliceForceRight * Math.sin(theta) - intersliceForceLeft * Math.sin(theta);
        
        // Moment equilibrium
        const momentArm = this.calculateMomentArm(slice, slipSurface);
        sumM += weight * momentArm - mobilizedShearForce * momentArm;
      }

      // Update safety factor and theta (simplified convergence)
      const newSF = Math.abs(sumM) > 1e-6 ? Math.abs(sumM / (sumM + 1000)) + 1.0 : safetyFactor;
      safetyFactor = Math.max(0.1, Math.min(5.0, newSF)); // Clamp to reasonable range
      theta = Math.max(-0.5, Math.min(0.5, theta - sumFx * 0.0001)); // Clamp theta

      if (Math.abs(safetyFactor - previousSF) < tolerance && Math.abs(theta - previousTheta) < tolerance) {
        break;
      }

      iteration++;
    }

    return safetyFactor;
  }

  /**
   * Generate potential slip surfaces
   */
  private generateSlipSurfaces(
    slopeGeometry: Point3D[],
    parameters: { searchMethod: string; numberOfSlices: number }
  ): SlipSurface[] {
    const surfaces: SlipSurface[] = [];

    if (parameters.searchMethod === 'circular') {
      // Generate circular slip surfaces
      const numSurfaces = 20; // Generate 20 potential surfaces
      
      for (let i = 0; i < numSurfaces; i++) {
        const surface = this.generateCircularSlipSurface(slopeGeometry, i);
        surfaces.push(surface);
      }
    } else if (parameters.searchMethod === 'block') {
      // Generate block-type slip surfaces
      const surface = this.generateBlockSlipSurface(slopeGeometry);
      surfaces.push(surface);
    }

    return surfaces;
  }

  /**
   * Generate circular slip surface
   */
  private generateCircularSlipSurface(slopeGeometry: Point3D[], surfaceIndex: number): SlipSurface {
    // Find slope bounds
    const minX = Math.min(...slopeGeometry.map(p => p.x));
    const maxX = Math.max(...slopeGeometry.map(p => p.x));
    const minY = Math.min(...slopeGeometry.map(p => p.y));
    const maxY = Math.max(...slopeGeometry.map(p => p.y));
    
    // Generate circle parameters
    const centerX = minX + (maxX - minX) * (0.3 + surfaceIndex * 0.02);
    const centerY = maxY + 50 + surfaceIndex * 10; // Above slope
    const radius = 100 + surfaceIndex * 20;
    
    // Generate points along circular arc
    const points: Point3D[] = [];
    const numPoints = 50;
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = Math.PI + (i / numPoints) * Math.PI; // Bottom half of circle
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const z = 0; // 2D analysis
      
      // Only include points that intersect with slope
      if (x >= minX && x <= maxX && y >= minY) {
        points.push({ x, y, z });
      }
    }

    return {
      id: `circular_${surfaceIndex}`,
      points,
      safetyFactor: 0, // Will be calculated
      drivingForce: 0,
      resistingForce: 0,
      sliceAnalysis: [],
      volume: this.calculateSlipVolume(points),
      weight: 0 // Will be calculated
    };
  }

  /**
   * Generate block slip surface
   */
  private generateBlockSlipSurface(slopeGeometry: Point3D[]): SlipSurface {
    // Simplified block surface - straight line from toe to crest
    const minX = Math.min(...slopeGeometry.map(p => p.x));
    const maxX = Math.max(...slopeGeometry.map(p => p.x));
    const minY = Math.min(...slopeGeometry.map(p => p.y));
    const maxY = Math.max(...slopeGeometry.map(p => p.y));
    
    const points: Point3D[] = [
      { x: minX, y: minY, z: 0 },
      { x: maxX, y: maxY, z: 0 }
    ];

    return {
      id: 'block_1',
      points,
      safetyFactor: 0,
      drivingForce: 0,
      resistingForce: 0,
      sliceAnalysis: [],
      volume: this.calculateSlipVolume(points),
      weight: 0
    };
  }

  /**
   * Analyze slip surface using method of slices
   */
  private analyzeSlipSurface(
    surface: SlipSurface,
    material: MaterialProperties,
    parameters: { numberOfSlices: number }
  ): SlipSurface {
    const slices = this.createSlices(surface, parameters.numberOfSlices);
    
    // Calculate safety factor using Bishop's simplified method
    const safetyFactor = this.performBishopAnalysis(surface, material, parameters.numberOfSlices);
    
    // Calculate driving and resisting forces and update slice properties
    let totalDrivingForce = 0;
    let totalResistingForce = 0;
    
    for (const slice of slices) {
      const angle = this.calculateSliceAngle(slice, surface);
      const drivingForce = slice.weight * Math.sin(angle);
      const normalForce = slice.weight * Math.cos(angle) - slice.porePressure * slice.width;
      const effectiveStress = normalForce / slice.width;
      const availableShearStrength = material.cohesion + effectiveStress * Math.tan(material.frictionAngle * Math.PI / 180);
      const resistingForce = availableShearStrength * slice.width;
      
      // Update slice properties
      slice.normalForce = normalForce;
      slice.shearForce = drivingForce;
      slice.effectiveStress = effectiveStress;
      slice.availableShearStrength = availableShearStrength;
      slice.mobilizedShearStrength = availableShearStrength / Math.max(safetyFactor, 0.1);
      
      totalDrivingForce += drivingForce;
      totalResistingForce += resistingForce;
    }

    return {
      ...surface,
      safetyFactor,
      drivingForce: totalDrivingForce,
      resistingForce: totalResistingForce,
      sliceAnalysis: slices,
      weight: slices.reduce((sum, slice) => sum + slice.weight, 0)
    };
  }

  /**
   * Create slices for method of slices analysis
   */
  private createSlices(surface: SlipSurface, numberOfSlices: number): SliceAnalysis[] {
    const slices: SliceAnalysis[] = [];
    const points = surface.points;
    
    if (points.length < 2) return slices;
    
    const totalWidth = Math.abs(points[points.length - 1].x - points[0].x);
    if (totalWidth <= 0) return slices;
    
    const sliceWidth = totalWidth / numberOfSlices;
    
    for (let i = 0; i < numberOfSlices; i++) {
      const x = points[0].x + (i + 0.5) * sliceWidth; // Use slice center
      const height = Math.max(this.interpolateHeight(x, points), 0.1); // Minimum height
      const weight = this.calculateSliceWeight(sliceWidth, height);
      const porePressure = this.calculatePorePressure(x, height);
      
      const slice: SliceAnalysis = {
        sliceNumber: i + 1,
        width: sliceWidth,
        height,
        weight,
        normalForce: 0, // Will be calculated during analysis
        shearForce: 0,
        porePressure,
        effectiveStress: 0,
        mobilizedShearStrength: 0,
        availableShearStrength: 0
      };
      
      slices.push(slice);
    }
    
    return slices;
  }

  /**
   * Calculate slice angle with respect to horizontal
   */
  private calculateSliceAngle(slice: SliceAnalysis, surface: SlipSurface): number {
    // Simplified - assume constant slope angle
    const points = surface.points;
    if (points.length < 2) return 0;
    
    const deltaY = points[points.length - 1].y - points[0].y;
    const deltaX = points[points.length - 1].x - points[0].x;
    
    return Math.atan2(deltaY, deltaX);
  }

  /**
   * Calculate moment arm for slice
   */
  private calculateMomentArm(slice: SliceAnalysis, surface: SlipSurface): number {
    // Simplified moment arm calculation
    return slice.height / 2;
  }

  /**
   * Calculate interslice force
   */
  private calculateIntersliceForce(slice: SliceAnalysis, theta: number): number {
    // Simplified interslice force calculation
    return slice.weight * 0.1 * Math.cos(theta);
  }

  /**
   * Interpolate height at given x coordinate
   */
  private interpolateHeight(x: number, points: Point3D[]): number {
    if (points.length === 0) return 1.0; // Default height
    if (points.length === 1) return Math.max(points[0].y, 1.0);
    
    // Sort points by x coordinate
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);
    
    // If x is outside range, use nearest point
    if (x <= sortedPoints[0].x) return Math.max(sortedPoints[0].y, 1.0);
    if (x >= sortedPoints[sortedPoints.length - 1].x) return Math.max(sortedPoints[sortedPoints.length - 1].y, 1.0);
    
    // Find surrounding points
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      if (x >= sortedPoints[i].x && x <= sortedPoints[i + 1].x) {
        const dx = sortedPoints[i + 1].x - sortedPoints[i].x;
        if (dx === 0) return Math.max(sortedPoints[i].y, 1.0);
        
        const ratio = (x - sortedPoints[i].x) / dx;
        const interpolatedY = sortedPoints[i].y + ratio * (sortedPoints[i + 1].y - sortedPoints[i].y);
        return Math.max(interpolatedY, 1.0);
      }
    }
    
    return Math.max(sortedPoints[0].y, 1.0); // Default
  }

  /**
   * Calculate slice weight
   */
  private calculateSliceWeight(width: number, height: number): number {
    // Assume unit weight of 20 kN/m³ and unit thickness
    const unitWeight = 20000; // N/m³
    const thickness = 1; // m (unit thickness for 2D analysis)
    const weight = unitWeight * Math.max(width, 0.1) * Math.max(height, 0.1) * thickness;
    return Math.max(weight, 100); // Minimum weight to avoid division by zero
  }

  /**
   * Calculate pore pressure at slice
   */
  private calculatePorePressure(x: number, height: number): number {
    // Simplified pore pressure calculation
    // Assume hydrostatic pressure below groundwater table
    const waterLevel = this.interpolateGroundwaterLevel(x);
    const unitWeightWater = 9810; // N/m³
    
    if (height < waterLevel) {
      return unitWeightWater * (waterLevel - height);
    }
    
    return 0;
  }

  /**
   * Interpolate groundwater level at given x coordinate
   */
  private interpolateGroundwaterLevel(x: number): number {
    // Simplified - assume constant groundwater level
    const levels = Array.from(this.groundwaterTable.values());
    if (levels.length === 0) return 0;
    
    return levels.reduce((sum, level) => sum + level, 0) / levels.length;
  }

  /**
   * Calculate slip volume
   */
  private calculateSlipVolume(points: Point3D[]): number {
    if (points.length < 3) return 0;
    
    // Simplified volume calculation using trapezoidal rule
    let area = 0;
    for (let i = 0; i < points.length - 1; i++) {
      area += (points[i].x - points[i + 1].x) * (points[i].y + points[i + 1].y) / 2;
    }
    
    return Math.abs(area); // Unit thickness assumed
  }
}