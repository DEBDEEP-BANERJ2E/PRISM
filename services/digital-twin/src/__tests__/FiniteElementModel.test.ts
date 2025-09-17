import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { FiniteElementModel } from '../services/FiniteElementModel';
import { FEMNode, FiniteElement, MaterialProperties, LoadCase } from '../types/physics';

describe('FiniteElementModel', () => {
  let model: FiniteElementModel;

  beforeEach(() => {
    model = new FiniteElementModel();
  });

  describe('addNode', () => {
    it('should add a node to the model', () => {
      const node: FEMNode = {
        id: 'node1',
        position: { x: 0, y: 0, z: 0 },
        displacement: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        boundaryConditions: [],
        connectedElements: []
      };

      model.addNode(node);

      const stats = model.getModelStatistics();
      expect(stats.nodeCount).toBe(1);
      expect(stats.degreesOfFreedom).toBe(3);
    });
  });

  describe('addElement', () => {
    beforeEach(() => {
      // Add nodes first
      const nodes: FEMNode[] = [
        {
          id: 'node1',
          position: { x: 0, y: 0, z: 0 },
          displacement: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 },
          boundaryConditions: [],
          connectedElements: []
        },
        {
          id: 'node2',
          position: { x: 1, y: 0, z: 0 },
          displacement: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 },
          boundaryConditions: [],
          connectedElements: []
        },
        {
          id: 'node3',
          position: { x: 0, y: 1, z: 0 },
          displacement: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 },
          boundaryConditions: [],
          connectedElements: []
        }
      ];

      nodes.forEach(node => model.addNode(node));
    });

    it('should add an element to the model', () => {
      const element: FiniteElement = {
        id: 'elem1',
        nodes: ['node1', 'node2', 'node3'],
        materialId: 'steel',
        elementType: 'tetrahedron',
        volume: 0.5,
        centroid: { x: 0.33, y: 0.33, z: 0 }
      };

      model.addElement(element);

      const stats = model.getModelStatistics();
      expect(stats.elementCount).toBe(1);
    });

    it('should throw error for non-existent nodes', () => {
      const element: FiniteElement = {
        id: 'elem1',
        nodes: ['node1', 'node2', 'nonexistent'],
        materialId: 'steel',
        elementType: 'tetrahedron',
        volume: 0.5,
        centroid: { x: 0.33, y: 0.33, z: 0 }
      };

      expect(() => model.addElement(element)).toThrow('Node nonexistent not found');
    });
  });

  describe('addMaterial', () => {
    it('should add material properties', () => {
      const material: MaterialProperties = {
        density: 7850,
        youngsModulus: 200e9,
        poissonsRatio: 0.3,
        cohesion: 0,
        frictionAngle: 0,
        tensileStrength: 400e6,
        compressiveStrength: 400e6,
        permeability: 0,
        porosity: 0
      };

      model.addMaterial('steel', material);

      const stats = model.getModelStatistics();
      expect(stats.materialCount).toBe(1);
    });
  });

  describe('performStaticAnalysis', () => {
    beforeEach(() => {
      // Set up a simple 2-element model
      const nodes: FEMNode[] = [
        {
          id: 'node1',
          position: { x: 0, y: 0, z: 0 },
          displacement: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 },
          boundaryConditions: [],
          connectedElements: []
        },
        {
          id: 'node2',
          position: { x: 1, y: 0, z: 0 },
          displacement: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 },
          boundaryConditions: [],
          connectedElements: []
        },
        {
          id: 'node3',
          position: { x: 0, y: 1, z: 0 },
          displacement: { x: 0, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
          acceleration: { x: 0, y: 0, z: 0 },
          boundaryConditions: [],
          connectedElements: []
        }
      ];

      nodes.forEach(node => model.addNode(node));

      const element: FiniteElement = {
        id: 'elem1',
        nodes: ['node1', 'node2', 'node3'],
        materialId: 'steel',
        elementType: 'tetrahedron',
        volume: 0.5,
        centroid: { x: 0.33, y: 0.33, z: 0 }
      };

      model.addElement(element);

      const material: MaterialProperties = {
        density: 7850,
        youngsModulus: 200e9,
        poissonsRatio: 0.3,
        cohesion: 0,
        frictionAngle: 0,
        tensileStrength: 400e6,
        compressiveStrength: 400e6,
        permeability: 0,
        porosity: 0
      };

      model.addMaterial('steel', material);

      const loadCase: LoadCase = {
        id: 'load1',
        name: 'Test Load',
        description: 'Simple test load case',
        loads: [
          {
            type: 'point_force',
            nodeIds: ['node2'],
            direction: { x: 0, y: -1000, z: 0 },
            magnitude: 1000
          }
        ],
        boundaryConditions: [
          {
            type: 'fixed',
            direction: 'all',
            value: 0,
            isActive: true
          }
        ],
        analysisType: 'static'
      };

      model.addLoadCase(loadCase);
    });

    it('should perform static analysis successfully', async () => {
      const result = await model.performStaticAnalysis('load1');

      expect(result.converged).toBe(true);
      expect(result.loadCaseId).toBe('load1');
      expect(result.nodeResults.size).toBeGreaterThan(0);
      expect(result.elementResults.size).toBeGreaterThan(0);
      expect(result.maxDisplacement).toBeGreaterThanOrEqual(0);
      expect(result.maxStress).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent load case', async () => {
      await expect(model.performStaticAnalysis('nonexistent'))
        .rejects.toThrow('Load case nonexistent not found');
    });
  });

  describe('validatePhysicsConstraints', () => {
    it('should validate physics constraints', async () => {
      // Set up simple model
      const node: FEMNode = {
        id: 'node1',
        position: { x: 0, y: 0, z: 0 },
        displacement: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        boundaryConditions: [],
        connectedElements: []
      };

      model.addNode(node);

      const material: MaterialProperties = {
        density: 7850,
        youngsModulus: 200e9,
        poissonsRatio: 0.3,
        cohesion: 0,
        frictionAngle: 0,
        tensileStrength: 400e6,
        compressiveStrength: 400e6,
        permeability: 0,
        porosity: 0
      };

      model.addMaterial('steel', material);

      const loadCase: LoadCase = {
        id: 'load1',
        name: 'Test Load',
        description: 'Simple test load case',
        loads: [],
        boundaryConditions: [],
        analysisType: 'static'
      };

      model.addLoadCase(loadCase);

      const analysisResult = await model.performStaticAnalysis('load1');
      const validation = model.validatePhysicsConstraints(analysisResult);

      expect(validation.isValid).toBeDefined();
      expect(validation.constraintViolations).toBeDefined();
      expect(validation.energyBalance).toBeDefined();
      expect(validation.massBalance).toBeDefined();
      expect(validation.energyBalance.strainEnergy).toBeGreaterThanOrEqual(0);
      expect(validation.massBalance.totalMass).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getModelStatistics', () => {
    it('should return correct statistics for empty model', () => {
      const stats = model.getModelStatistics();

      expect(stats.nodeCount).toBe(0);
      expect(stats.elementCount).toBe(0);
      expect(stats.materialCount).toBe(0);
      expect(stats.loadCaseCount).toBe(0);
      expect(stats.degreesOfFreedom).toBe(0);
    });

    it('should return correct statistics after adding components', () => {
      const node: FEMNode = {
        id: 'node1',
        position: { x: 0, y: 0, z: 0 },
        displacement: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        acceleration: { x: 0, y: 0, z: 0 },
        boundaryConditions: [],
        connectedElements: []
      };

      model.addNode(node);

      const material: MaterialProperties = {
        density: 7850,
        youngsModulus: 200e9,
        poissonsRatio: 0.3,
        cohesion: 0,
        frictionAngle: 0,
        tensileStrength: 400e6,
        compressiveStrength: 400e6,
        permeability: 0,
        porosity: 0
      };

      model.addMaterial('steel', material);

      const loadCase: LoadCase = {
        id: 'load1',
        name: 'Test Load',
        description: 'Simple test load case',
        loads: [],
        boundaryConditions: [],
        analysisType: 'static'
      };

      model.addLoadCase(loadCase);

      const stats = model.getModelStatistics();

      expect(stats.nodeCount).toBe(1);
      expect(stats.elementCount).toBe(0);
      expect(stats.materialCount).toBe(1);
      expect(stats.loadCaseCount).toBe(1);
      expect(stats.degreesOfFreedom).toBe(3);
    });
  });
});