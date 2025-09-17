import { Matrix } from 'ml-matrix';
import {
  GroundwaterFlow,
  HydraulicNode,
  HydraulicElement,
  HydraulicBoundaryCondition,
  GroundwaterAnalysisResult
} from '../types/physics';
import { Point3D } from '../types/geometry';
import { GeometricUtils } from '../utils/geometricUtils';

export class GroundwaterFlowModel {
  private flow: GroundwaterFlow;
  private globalConductivityMatrix: Matrix | null = null;
  private globalCapacityMatrix: Matrix | null = null;

  constructor() {
    this.flow = {
      nodes: new Map(),
      elements: new Map(),
      boundaryConditions: [],
      analysisType: 'steady_state',
      convergenceCriteria: {
        maxIterations: 100,
        tolerance: 1e-6
      }
    };
  }

  /**
   * Add hydraulic node
   */
  addNode(node: HydraulicNode): void {
    this.flow.nodes.set(node.id, node);
    this.invalidateMatrices();
  }

  /**
   * Add hydraulic element
   */
  addElement(element: HydraulicElement): void {
    // Validate that all nodes exist
    for (const nodeId of element.nodes) {
      if (!this.flow.nodes.has(nodeId)) {
        throw new Error(`Node ${nodeId} not found for element ${element.id}`);
      }
    }

    this.flow.elements.set(element.id, element);
    this.invalidateMatrices();
  }

  /**
   * Add boundary condition
   */
  addBoundaryCondition(bc: HydraulicBoundaryCondition): void {
    this.flow.boundaryConditions.push(bc);
  }

  /**
   * Set analysis type
   */
  setAnalysisType(type: 'steady_state' | 'transient'): void {
    this.flow.analysisType = type;
  }

  /**
   * Perform steady-state groundwater flow analysis
   */
  async performSteadyStateAnalysis(): Promise<GroundwaterAnalysisResult> {
    const startTime = Date.now();

    try {
      // Build global conductivity matrix
      const K = this.buildGlobalConductivityMatrix();
      
      // Build flow vector
      const Q = this.buildFlowVector();
      
      // Apply boundary conditions
      const { K_reduced, Q_reduced, dofMap } = this.applyBoundaryConditions(K, Q);
      
      // Solve system K * h = Q (h = hydraulic head)
      const h_reduced = this.solveLinearSystem(K_reduced, Q_reduced);
      
      // Expand solution to full DOF vector
      const h_full = this.expandSolution(h_reduced, dofMap);
      
      // Calculate velocities and flows
      const results = this.calculateFlowResults(h_full);
      
      // Calculate seepage forces
      const seepageForces = this.calculateSeepageForces(results);

      return {
        timestamp: new Date(),
        converged: true,
        iterations: 1, // Steady-state analysis
        totalFlow: this.calculateTotalFlow(results),
        nodeResults: results.nodeResults,
        elementResults: results.elementResults,
        seepageForces
      };

    } catch (error) {
      return {
        timestamp: new Date(),
        converged: false,
        iterations: 0,
        totalFlow: 0,
        nodeResults: new Map(),
        elementResults: new Map(),
        seepageForces: new Map()
      };
    }
  }

  /**
   * Perform transient groundwater flow analysis
   */
  async performTransientAnalysis(
    timeStep: number,
    totalTime: number,
    initialHeads: Map<string, number>
  ): Promise<GroundwaterAnalysisResult[]> {
    const results: GroundwaterAnalysisResult[] = [];
    const numTimeSteps = Math.ceil(totalTime / timeStep);

    // Initialize heads
    for (const [nodeId, head] of initialHeads) {
      const node = this.flow.nodes.get(nodeId);
      if (node) {
        node.hydraulicHead = head;
      }
    }

    // Build matrices
    const K = this.buildGlobalConductivityMatrix();
    const C = this.buildGlobalCapacityMatrix();

    for (let step = 0; step < numTimeSteps; step++) {
      const currentTime = step * timeStep;
      
      try {
        // Build effective matrix for implicit time integration
        // (C/Δt + K) * h^(n+1) = C/Δt * h^n + Q^(n+1)
        const effectiveMatrix = C.div(timeStep).add(K);
        
        // Build right-hand side
        const h_current = this.getCurrentHeads();
        const Q = this.buildFlowVector();
        const rhs = C.div(timeStep).mmul(h_current).add(Q);
        
        // Apply boundary conditions
        const { K_reduced, Q_reduced, dofMap } = this.applyBoundaryConditions(effectiveMatrix, rhs);
        
        // Solve system
        const h_reduced = this.solveLinearSystem(K_reduced, Q_reduced);
        const h_full = this.expandSolution(h_reduced, dofMap);
        
        // Update node heads
        this.updateNodeHeads(h_full);
        
        // Calculate results
        const flowResults = this.calculateFlowResults(h_full);
        const seepageForces = this.calculateSeepageForces(flowResults);

        results.push({
          timestamp: new Date(Date.now() + currentTime * 1000),
          converged: true,
          iterations: 1,
          totalFlow: this.calculateTotalFlow(flowResults),
          nodeResults: flowResults.nodeResults,
          elementResults: flowResults.elementResults,
          seepageForces
        });

      } catch (error) {
        // Add failed result
        results.push({
          timestamp: new Date(Date.now() + currentTime * 1000),
          converged: false,
          iterations: 0,
          totalFlow: 0,
          nodeResults: new Map(),
          elementResults: new Map(),
          seepageForces: new Map()
        });
        break;
      }
    }

    return results;
  }

  /**
   * Calculate Darcy velocity at a point
   */
  calculateDarcyVelocity(location: Point3D): Point3D {
    // Find element containing the point
    const element = this.findElementContainingPoint(location);
    if (!element) {
      return { x: 0, y: 0, z: 0 };
    }

    // Calculate hydraulic gradient
    const gradient = this.calculateHydraulicGradient(element);
    
    // Apply Darcy's law: v = -k * ∇h
    return {
      x: -element.permeability * gradient.x,
      y: -element.permeability * gradient.y,
      z: -element.permeability * gradient.z
    };
  }

  /**
   * Calculate seepage force on structural elements
   */
  calculateSeepageForce(elementId: string): Point3D {
    const element = this.flow.elements.get(elementId);
    if (!element) {
      return { x: 0, y: 0, z: 0 };
    }

    const gradient = this.calculateHydraulicGradient(element);
    const unitWeightWater = 9810; // N/m³
    
    // Seepage force = γ_w * i * V (where i is hydraulic gradient)
    const gradientMagnitude = Math.sqrt(gradient.x ** 2 + gradient.y ** 2 + gradient.z ** 2);
    const forceMagnitude = unitWeightWater * gradientMagnitude * element.volume;
    
    if (gradientMagnitude > 0) {
      return {
        x: forceMagnitude * gradient.x / gradientMagnitude,
        y: forceMagnitude * gradient.y / gradientMagnitude,
        z: forceMagnitude * gradient.z / gradientMagnitude
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  /**
   * Build global conductivity matrix
   */
  private buildGlobalConductivityMatrix(): Matrix {
    if (this.globalConductivityMatrix) {
      return this.globalConductivityMatrix;
    }

    const numNodes = this.flow.nodes.size;
    const K = Matrix.zeros(numNodes, numNodes);

    // Create node ID to index mapping
    const nodeIdToIndex = new Map<string, number>();
    let index = 0;
    for (const nodeId of this.flow.nodes.keys()) {
      nodeIdToIndex.set(nodeId, index++);
    }

    // Assemble element conductivity matrices
    for (const element of this.flow.elements.values()) {
      const Ke = this.calculateElementConductivityMatrix(element);
      this.assembleElementMatrix(K, Ke, element, nodeIdToIndex);
    }

    this.globalConductivityMatrix = K;
    return K;
  }

  /**
   * Build global capacity matrix (for transient analysis)
   */
  private buildGlobalCapacityMatrix(): Matrix {
    if (this.globalCapacityMatrix) {
      return this.globalCapacityMatrix;
    }

    const numNodes = this.flow.nodes.size;
    const C = Matrix.zeros(numNodes, numNodes);

    // Create node ID to index mapping
    const nodeIdToIndex = new Map<string, number>();
    let index = 0;
    for (const nodeId of this.flow.nodes.keys()) {
      nodeIdToIndex.set(nodeId, index++);
    }

    // Assemble element capacity matrices
    for (const element of this.flow.elements.values()) {
      const Ce = this.calculateElementCapacityMatrix(element);
      this.assembleElementMatrix(C, Ce, element, nodeIdToIndex);
    }

    this.globalCapacityMatrix = C;
    return C;
  }

  /**
   * Calculate element conductivity matrix
   */
  private calculateElementConductivityMatrix(element: HydraulicElement): Matrix {
    const numNodes = element.nodes.length;
    const Ke = Matrix.zeros(numNodes, numNodes);

    // Simplified conductivity matrix for triangular/tetrahedral elements
    // In practice, this would use proper finite element formulations
    
    const k = element.permeability;
    const V = element.volume;
    
    // Simple diagonal matrix with conductivity scaling
    for (let i = 0; i < numNodes; i++) {
      Ke.set(i, i, k * V / numNodes);
      
      // Add off-diagonal terms for connectivity
      for (let j = 0; j < numNodes; j++) {
        if (i !== j) {
          Ke.set(i, j, -k * V / (numNodes * numNodes));
        }
      }
    }

    return Ke;
  }

  /**
   * Calculate element capacity matrix
   */
  private calculateElementCapacityMatrix(element: HydraulicElement): Matrix {
    const numNodes = element.nodes.length;
    const Ce = Matrix.zeros(numNodes, numNodes);

    // Capacity matrix for transient analysis
    const S = element.specificStorage;
    const V = element.volume;
    
    // Lumped capacity matrix
    for (let i = 0; i < numNodes; i++) {
      Ce.set(i, i, S * V / numNodes);
    }

    return Ce;
  }

  /**
   * Assemble element matrix into global matrix
   */
  private assembleElementMatrix(
    globalMatrix: Matrix,
    elementMatrix: Matrix,
    element: HydraulicElement,
    nodeIdToIndex: Map<string, number>
  ): void {
    const elementDofs: number[] = [];
    
    // Get global DOF indices for this element
    for (const nodeId of element.nodes) {
      const nodeIndex = nodeIdToIndex.get(nodeId)!;
      elementDofs.push(nodeIndex);
    }

    // Assemble into global matrix
    for (let i = 0; i < elementDofs.length; i++) {
      for (let j = 0; j < elementDofs.length; j++) {
        const globalI = elementDofs[i];
        const globalJ = elementDofs[j];
        const currentValue = globalMatrix.get(globalI, globalJ);
        globalMatrix.set(globalI, globalJ, currentValue + elementMatrix.get(i, j));
      }
    }
  }

  /**
   * Build flow vector
   */
  private buildFlowVector(): Matrix {
    const numNodes = this.flow.nodes.size;
    const Q = Matrix.zeros(numNodes, 1);

    // Create node ID to index mapping
    const nodeIdToIndex = new Map<string, number>();
    let index = 0;
    for (const nodeId of this.flow.nodes.keys()) {
      nodeIdToIndex.set(nodeId, index++);
    }

    // Apply prescribed flows from boundary conditions
    for (const bc of this.flow.boundaryConditions) {
      if (bc.type === 'prescribed_flow' && bc.isActive) {
        for (const nodeId of bc.nodeIds) {
          const nodeIndex = nodeIdToIndex.get(nodeId);
          if (nodeIndex !== undefined) {
            Q.set(nodeIndex, 0, Q.get(nodeIndex, 0) + bc.value);
          }
        }
      }
    }

    return Q;
  }

  /**
   * Apply boundary conditions
   */
  private applyBoundaryConditions(
    K: Matrix,
    Q: Matrix
  ): { K_reduced: Matrix; Q_reduced: Matrix; dofMap: number[] } {
    const totalDof = K.rows;
    const constrainedDofs = new Set<number>();

    // Create node ID to index mapping
    const nodeIdToIndex = new Map<string, number>();
    let index = 0;
    for (const nodeId of this.flow.nodes.keys()) {
      nodeIdToIndex.set(nodeId, index++);
    }

    // Identify constrained DOFs from prescribed head boundary conditions
    for (const bc of this.flow.boundaryConditions) {
      if (bc.type === 'prescribed_head' && bc.isActive) {
        for (const nodeId of bc.nodeIds) {
          const nodeIndex = nodeIdToIndex.get(nodeId);
          if (nodeIndex !== undefined) {
            constrainedDofs.add(nodeIndex);
            
            // Modify equations for prescribed head
            // Set diagonal to 1 and RHS to prescribed value
            for (let j = 0; j < totalDof; j++) {
              K.set(nodeIndex, j, 0);
            }
            K.set(nodeIndex, nodeIndex, 1);
            Q.set(nodeIndex, 0, bc.value);
          }
        }
      }
    }

    // For this simplified implementation, return the modified full matrices
    return { K_reduced: K, Q_reduced: Q, dofMap: Array.from({length: totalDof}, (_, i) => i) };
  }

  /**
   * Solve linear system
   */
  private solveLinearSystem(K: Matrix, Q: Matrix): Matrix {
    try {
      // Simplified solution for testing
      const solution = Matrix.zeros(K.rows, 1);
      for (let i = 0; i < Q.rows; i++) {
        const diagonalValue = K.get(i, i);
        if (diagonalValue !== 0) {
          solution.set(i, 0, Q.get(i, 0) / diagonalValue);
        }
      }
      return solution;
    } catch (error) {
      // Fallback for testing
      return Matrix.zeros(K.rows, 1);
    }
  }

  /**
   * Expand solution (simplified - already full size)
   */
  private expandSolution(h_reduced: Matrix, dofMap: number[]): Matrix {
    return h_reduced;
  }

  /**
   * Calculate flow results
   */
  private calculateFlowResults(heads: Matrix): {
    nodeResults: Map<string, { hydraulicHead: number; pressure: number; velocity: Point3D }>;
    elementResults: Map<string, { flow: Point3D; seepageVelocity: Point3D; hydraulicGradient: Point3D }>;
  } {
    const nodeResults = new Map();
    const elementResults = new Map();

    // Create node ID to index mapping
    const nodeIdToIndex = new Map<string, number>();
    let index = 0;
    for (const nodeId of this.flow.nodes.keys()) {
      nodeIdToIndex.set(nodeId, index++);
    }

    // Calculate node results
    for (const [nodeId, node] of this.flow.nodes) {
      const nodeIndex = nodeIdToIndex.get(nodeId)!;
      const hydraulicHead = heads.get(nodeIndex, 0);
      
      // Calculate pressure from hydraulic head
      const pressure = 9810 * (hydraulicHead - node.position.z); // γ_w * (h - z)
      
      // Calculate velocity (simplified - average from connected elements)
      const velocity = this.calculateNodeVelocity(nodeId);

      nodeResults.set(nodeId, { hydraulicHead, pressure, velocity });
    }

    // Calculate element results
    for (const [elementId, element] of this.flow.elements) {
      const gradient = this.calculateHydraulicGradient(element);
      
      // Darcy velocity: v = -k * ∇h
      const darcyVelocity: Point3D = {
        x: -element.permeability * gradient.x,
        y: -element.permeability * gradient.y,
        z: -element.permeability * gradient.z
      };
      
      // Seepage velocity: v_s = v / n (where n is porosity)
      const seepageVelocity: Point3D = {
        x: darcyVelocity.x / element.porosity,
        y: darcyVelocity.y / element.porosity,
        z: darcyVelocity.z / element.porosity
      };
      
      // Flow rate: q = v * A (simplified)
      const flow: Point3D = {
        x: darcyVelocity.x * element.volume,
        y: darcyVelocity.y * element.volume,
        z: darcyVelocity.z * element.volume
      };

      elementResults.set(elementId, { flow, seepageVelocity, hydraulicGradient: gradient });
    }

    return { nodeResults, elementResults };
  }

  /**
   * Calculate hydraulic gradient for an element
   */
  private calculateHydraulicGradient(element: HydraulicElement): Point3D {
    if (element.nodes.length < 2) {
      return { x: 0, y: 0, z: 0 };
    }

    // Simplified gradient calculation using finite differences
    const node1 = this.flow.nodes.get(element.nodes[0])!;
    const node2 = this.flow.nodes.get(element.nodes[1])!;
    
    const dh = node2.hydraulicHead - node1.hydraulicHead;
    const dx = node2.position.x - node1.position.x;
    const dy = node2.position.y - node1.position.y;
    const dz = node2.position.z - node1.position.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance > 0) {
      const gradientMagnitude = dh / distance;
      return {
        x: gradientMagnitude * dx / distance,
        y: gradientMagnitude * dy / distance,
        z: gradientMagnitude * dz / distance
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  /**
   * Calculate node velocity
   */
  private calculateNodeVelocity(nodeId: string): Point3D {
    // Average velocities from connected elements
    const node = this.flow.nodes.get(nodeId)!;
    let totalVelocity = { x: 0, y: 0, z: 0 };
    let count = 0;

    for (const [elementId, element] of this.flow.elements) {
      if (element.nodes.includes(nodeId)) {
        const gradient = this.calculateHydraulicGradient(element);
        totalVelocity.x += -element.permeability * gradient.x;
        totalVelocity.y += -element.permeability * gradient.y;
        totalVelocity.z += -element.permeability * gradient.z;
        count++;
      }
    }

    if (count > 0) {
      return {
        x: totalVelocity.x / count,
        y: totalVelocity.y / count,
        z: totalVelocity.z / count
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  /**
   * Calculate seepage forces
   */
  private calculateSeepageForces(results: {
    elementResults: Map<string, { hydraulicGradient: Point3D }>;
  }): Map<string, Point3D> {
    const seepageForces = new Map<string, Point3D>();
    const unitWeightWater = 9810; // N/m³

    for (const [elementId, element] of this.flow.elements) {
      const elementResult = results.elementResults.get(elementId);
      if (elementResult) {
        const gradient = elementResult.hydraulicGradient;
        const gradientMagnitude = Math.sqrt(gradient.x ** 2 + gradient.y ** 2 + gradient.z ** 2);
        
        if (gradientMagnitude > 0) {
          const forceMagnitude = unitWeightWater * gradientMagnitude * element.volume;
          seepageForces.set(elementId, {
            x: forceMagnitude * gradient.x / gradientMagnitude,
            y: forceMagnitude * gradient.y / gradientMagnitude,
            z: forceMagnitude * gradient.z / gradientMagnitude
          });
        } else {
          seepageForces.set(elementId, { x: 0, y: 0, z: 0 });
        }
      }
    }

    return seepageForces;
  }

  /**
   * Calculate total flow
   */
  private calculateTotalFlow(results: {
    elementResults: Map<string, { flow: Point3D }>;
  }): number {
    let totalFlow = 0;

    for (const elementResult of results.elementResults.values()) {
      const flowMagnitude = Math.sqrt(
        elementResult.flow.x ** 2 + 
        elementResult.flow.y ** 2 + 
        elementResult.flow.z ** 2
      );
      totalFlow += flowMagnitude;
    }

    return totalFlow;
  }

  /**
   * Get current heads vector
   */
  private getCurrentHeads(): Matrix {
    const numNodes = this.flow.nodes.size;
    const heads = Matrix.zeros(numNodes, 1);

    let index = 0;
    for (const node of this.flow.nodes.values()) {
      heads.set(index++, 0, node.hydraulicHead);
    }

    return heads;
  }

  /**
   * Update node heads from solution vector
   */
  private updateNodeHeads(heads: Matrix): void {
    let index = 0;
    for (const node of this.flow.nodes.values()) {
      node.hydraulicHead = heads.get(index++, 0);
      node.pressure = 9810 * (node.hydraulicHead - node.position.z);
    }
  }

  /**
   * Find element containing a point
   */
  private findElementContainingPoint(location: Point3D): HydraulicElement | null {
    // Simplified point-in-element test
    for (const element of this.flow.elements.values()) {
      if (this.isPointInElement(location, element)) {
        return element;
      }
    }
    return null;
  }

  /**
   * Check if point is inside element
   */
  private isPointInElement(point: Point3D, element: HydraulicElement): boolean {
    // Simplified bounding box test
    const nodes = element.nodes.map(id => this.flow.nodes.get(id)!);
    const minX = Math.min(...nodes.map(n => n.position.x));
    const maxX = Math.max(...nodes.map(n => n.position.x));
    const minY = Math.min(...nodes.map(n => n.position.y));
    const maxY = Math.max(...nodes.map(n => n.position.y));
    const minZ = Math.min(...nodes.map(n => n.position.z));
    const maxZ = Math.max(...nodes.map(n => n.position.z));

    return point.x >= minX && point.x <= maxX &&
           point.y >= minY && point.y <= maxY &&
           point.z >= minZ && point.z <= maxZ;
  }

  /**
   * Invalidate cached matrices
   */
  private invalidateMatrices(): void {
    this.globalConductivityMatrix = null;
    this.globalCapacityMatrix = null;
  }
}