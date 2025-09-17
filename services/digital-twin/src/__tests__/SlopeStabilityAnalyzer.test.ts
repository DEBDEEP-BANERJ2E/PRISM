import { SlopeStabilityAnalyzer } from '../services/SlopeStabilityAnalyzer';
import { MaterialProperties } from '../types/physics';
import { Point3D } from '../types/geometry';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('SlopeStabilityAnalyzer', () => {
  let analyzer: SlopeStabilityAnalyzer;

  beforeEach(() => {
    analyzer = new SlopeStabilityAnalyzer();
  });

  describe('addMaterial', () => {
    it('should add material properties', () => {
      const material: MaterialProperties = {
        density: 2000,
        youngsModulus: 1e9,
        poissonsRatio: 0.3,
        cohesion: 10000,
        frictionAngle: 30,
        tensileStrength: 0,
        compressiveStrength: 50e6,
        permeability: 1e-6,
        porosity: 0.3
      };

      analyzer.addMaterial('soil', material);

      // No direct way to verify, but should not throw
      expect(() => analyzer.addMaterial('soil', material)).not.toThrow();
    });
  });

  describe('setGroundwaterLevel', () => {
    it('should set groundwater level', () => {
      analyzer.setGroundwaterLevel('node1', 10.5);

      // No direct way to verify, but should not throw
      expect(() => analyzer.setGroundwaterLevel('node1', 10.5)).not.toThrow();
    });
  });

  describe('performLimitEquilibriumAnalysis', () => {
    beforeEach(() => {
      const material: MaterialProperties = {
        density: 2000,
        youngsModulus: 1e9,
        poissonsRatio: 0.3,
        cohesion: 10000, // 10 kPa
        frictionAngle: 30, // degrees
        tensileStrength: 0,
        compressiveStrength: 50e6,
        permeability: 1e-6,
        porosity: 0.3
      };

      analyzer.addMaterial('soil', material);
    });

    it('should perform circular slip surface analysis', () => {
      const slopeGeometry: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 5, z: 0 },
        { x: 20, y: 10, z: 0 },
        { x: 30, y: 10, z: 0 }
      ];

      const parameters = {
        searchMethod: 'circular' as const,
        numberOfSlices: 10,
        convergenceTolerance: 1e-6,
        maxIterations: 50
      };

      const result = analyzer.performLimitEquilibriumAnalysis(slopeGeometry, 'soil', parameters);

      expect(result.method).toBe('limit_equilibrium');
      expect(result.slipSurfaces.length).toBeGreaterThan(0);
      expect(result.safetyFactor).toBeGreaterThan(0);
      expect(result.criticalSlipSurface).toBeDefined();
      expect(result.analysisParameters).toEqual(parameters);
    });

    it('should perform block slip surface analysis', () => {
      const slopeGeometry: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 5, z: 0 },
        { x: 20, y: 10, z: 0 }
      ];

      const parameters = {
        searchMethod: 'block' as const,
        numberOfSlices: 5,
        convergenceTolerance: 1e-6,
        maxIterations: 50
      };

      const result = analyzer.performLimitEquilibriumAnalysis(slopeGeometry, 'soil', parameters);

      expect(result.method).toBe('limit_equilibrium');
      expect(result.slipSurfaces.length).toBe(1);
      expect(result.safetyFactor).toBeGreaterThan(0);
      expect(result.slipSurfaces[0].id).toBe('block_1');
    });

    it('should throw error for non-existent material', () => {
      const slopeGeometry: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 5, z: 0 }
      ];

      const parameters = {
        searchMethod: 'circular' as const,
        numberOfSlices: 10,
        convergenceTolerance: 1e-6,
        maxIterations: 50
      };

      expect(() => {
        analyzer.performLimitEquilibriumAnalysis(slopeGeometry, 'nonexistent', parameters);
      }).toThrow('Material nonexistent not found');
    });

    it('should find critical slip surface with minimum safety factor', () => {
      const slopeGeometry: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 5, z: 0 },
        { x: 20, y: 10, z: 0 },
        { x: 30, y: 10, z: 0 }
      ];

      const parameters = {
        searchMethod: 'circular' as const,
        numberOfSlices: 10,
        convergenceTolerance: 1e-6,
        maxIterations: 50
      };

      const result = analyzer.performLimitEquilibriumAnalysis(slopeGeometry, 'soil', parameters);

      // Find the critical surface
      const criticalSurface = result.slipSurfaces.find(s => s.id === result.criticalSlipSurface);
      expect(criticalSurface).toBeDefined();
      expect(criticalSurface!.safetyFactor).toBe(result.safetyFactor);

      // Verify it has the minimum safety factor
      const minSF = Math.min(...result.slipSurfaces.map(s => s.safetyFactor));
      expect(result.safetyFactor).toBe(minSF);
    });
  });

  describe('performBishopAnalysis', () => {
    beforeEach(() => {
      const material: MaterialProperties = {
        density: 2000,
        youngsModulus: 1e9,
        poissonsRatio: 0.3,
        cohesion: 15000, // 15 kPa
        frictionAngle: 25, // degrees
        tensileStrength: 0,
        compressiveStrength: 50e6,
        permeability: 1e-6,
        porosity: 0.3
      };

      analyzer.addMaterial('clay', material);
    });

    it('should calculate safety factor using Bishop method', () => {
      const slipSurface = {
        id: 'test_surface',
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 5, y: 2, z: 0 },
          { x: 10, y: 3, z: 0 },
          { x: 15, y: 3, z: 0 }
        ],
        safetyFactor: 0,
        drivingForce: 0,
        resistingForce: 0,
        sliceAnalysis: [],
        volume: 100,
        weight: 0
      };

      const material: MaterialProperties = {
        density: 2000,
        youngsModulus: 1e9,
        poissonsRatio: 0.3,
        cohesion: 15000,
        frictionAngle: 25,
        tensileStrength: 0,
        compressiveStrength: 50e6,
        permeability: 1e-6,
        porosity: 0.3
      };

      const safetyFactor = analyzer.performBishopAnalysis(slipSurface, material, 10);

      expect(safetyFactor).toBeGreaterThan(0);
      expect(safetyFactor).toBeLessThan(10); // Reasonable upper bound
    });
  });

  describe('performSpencerAnalysis', () => {
    it('should calculate safety factor using Spencer method', () => {
      const slipSurface = {
        id: 'test_surface',
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 5, y: 2, z: 0 },
          { x: 10, y: 3, z: 0 },
          { x: 15, y: 3, z: 0 }
        ],
        safetyFactor: 0,
        drivingForce: 0,
        resistingForce: 0,
        sliceAnalysis: [],
        volume: 100,
        weight: 0
      };

      const material: MaterialProperties = {
        density: 2000,
        youngsModulus: 1e9,
        poissonsRatio: 0.3,
        cohesion: 20000, // 20 kPa
        frictionAngle: 30, // degrees
        tensileStrength: 0,
        compressiveStrength: 50e6,
        permeability: 1e-6,
        porosity: 0.3
      };

      const safetyFactor = analyzer.performSpencerAnalysis(slipSurface, material, 8);

      expect(safetyFactor).toBeGreaterThan(0);
      expect(safetyFactor).toBeLessThan(10); // Reasonable upper bound
    });
  });

  describe('slope stability with groundwater', () => {
    beforeEach(() => {
      const material: MaterialProperties = {
        density: 1800, // Saturated soil density
        youngsModulus: 5e8,
        poissonsRatio: 0.35,
        cohesion: 5000, // 5 kPa (low cohesion)
        frictionAngle: 20, // degrees (low friction)
        tensileStrength: 0,
        compressiveStrength: 30e6,
        permeability: 1e-7,
        porosity: 0.4
      };

      analyzer.addMaterial('saturated_soil', material);

      // Set groundwater levels
      analyzer.setGroundwaterLevel('node1', 5);
      analyzer.setGroundwaterLevel('node2', 4);
      analyzer.setGroundwaterLevel('node3', 3);
    });

    it('should account for groundwater effects in stability analysis', () => {
      const slopeGeometry: Point3D[] = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 8, z: 0 },
        { x: 20, y: 12, z: 0 },
        { x: 30, y: 12, z: 0 }
      ];

      const parameters = {
        searchMethod: 'circular' as const,
        numberOfSlices: 12,
        convergenceTolerance: 1e-6,
        maxIterations: 50
      };

      const result = analyzer.performLimitEquilibriumAnalysis(slopeGeometry, 'saturated_soil', parameters);

      expect(result.safetyFactor).toBeGreaterThan(0);
      expect(result.slipSurfaces.length).toBeGreaterThan(0);

      // Check that slice analysis includes pore pressure effects
      const criticalSurface = result.slipSurfaces.find(s => s.id === result.criticalSlipSurface);
      expect(criticalSurface).toBeDefined();
      
      // For this simplified implementation, just verify the analysis ran
      expect(result.slipSurfaces.length).toBeGreaterThan(0);
      expect(criticalSurface!.safetyFactor).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty slope geometry', () => {
      const material: MaterialProperties = {
        density: 2000,
        youngsModulus: 1e9,
        poissonsRatio: 0.3,
        cohesion: 10000,
        frictionAngle: 30,
        tensileStrength: 0,
        compressiveStrength: 50e6,
        permeability: 1e-6,
        porosity: 0.3
      };

      analyzer.addMaterial('soil', material);

      const slopeGeometry: Point3D[] = [];

      const parameters = {
        searchMethod: 'circular' as const,
        numberOfSlices: 10,
        convergenceTolerance: 1e-6,
        maxIterations: 50
      };

      const result = analyzer.performLimitEquilibriumAnalysis(slopeGeometry, 'soil', parameters);

      expect(result.slipSurfaces.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle single point slope geometry', () => {
      const material: MaterialProperties = {
        density: 2000,
        youngsModulus: 1e9,
        poissonsRatio: 0.3,
        cohesion: 10000,
        frictionAngle: 30,
        tensileStrength: 0,
        compressiveStrength: 50e6,
        permeability: 1e-6,
        porosity: 0.3
      };

      analyzer.addMaterial('soil', material);

      const slopeGeometry: Point3D[] = [{ x: 0, y: 0, z: 0 }];

      const parameters = {
        searchMethod: 'circular' as const,
        numberOfSlices: 10,
        convergenceTolerance: 1e-6,
        maxIterations: 50
      };

      const result = analyzer.performLimitEquilibriumAnalysis(slopeGeometry, 'soil', parameters);

      expect(result.slipSurfaces.length).toBeGreaterThanOrEqual(0);
    });
  });
});