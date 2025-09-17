import { NavigationGoal, NavigationStatus, Pose3D, Position3D, ObstacleInfo } from '../types';

export class NavigationPlanner {
  private currentGoal: NavigationGoal | null = null;
  private status: NavigationStatus;
  private obstacles: Map<string, ObstacleInfo> = new Map();
  private pathPlan: Pose3D[] = [];
  private currentWaypointIndex: number = 0;
  private planningGrid: PlanningGrid;

  constructor() {
    this.status = {
      currentGoal: null,
      status: 'idle',
      progress: 0,
      distanceToGoal: 0,
      estimatedTimeRemaining: 0,
      obstacles: [],
      pathPlan: []
    };
    
    this.planningGrid = new PlanningGrid(50, 50, 0.1); // 5m x 5m grid with 10cm resolution
  }

  async planPath(goal: NavigationGoal, currentPose: Pose3D): Promise<boolean> {
    try {
      console.log(`Planning path to goal: ${goal.goalId}`);
      
      this.currentGoal = goal;
      this.status.currentGoal = goal;
      this.status.status = 'planning';
      
      // Update obstacles in planning grid
      this.updatePlanningGrid();
      
      // Plan path using A* algorithm
      const path = await this.aStarPathPlanning(currentPose, goal.targetPose);
      
      if (path.length === 0) {
        console.error('No valid path found');
        this.status.status = 'failed';
        return false;
      }
      
      // Smooth path
      this.pathPlan = this.smoothPath(path);
      this.status.pathPlan = this.pathPlan;
      
      // Add waypoints if specified
      if (goal.waypoints && goal.waypoints.length > 0) {
        this.pathPlan = this.incorporateWaypoints(this.pathPlan, goal.waypoints);
      }
      
      // Calculate initial metrics
      this.updateNavigationMetrics(currentPose);
      
      this.status.status = 'executing';
      this.currentWaypointIndex = 0;
      
      console.log(`Path planned with ${this.pathPlan.length} waypoints`);
      return true;
      
    } catch (error) {
      console.error('Path planning failed:', error);
      this.status.status = 'failed';
      return false;
    }
  }

  private async aStarPathPlanning(start: Pose3D, goal: Pose3D): Promise<Pose3D[]> {
    const startNode = this.poseToGridNode(start);
    const goalNode = this.poseToGridNode(goal);
    
    const openSet: AStarNode[] = [];
    const closedSet: Set<string> = new Set();
    const cameFrom: Map<string, AStarNode> = new Map();
    
    const startAStarNode: AStarNode = {
      ...startNode,
      gScore: 0,
      fScore: this.heuristic(startNode, goalNode),
      parent: null
    };
    
    openSet.push(startAStarNode);
    
    while (openSet.length > 0) {
      // Get node with lowest fScore
      openSet.sort((a, b) => a.fScore - b.fScore);
      const current = openSet.shift()!;
      const currentKey = `${current.x},${current.y}`;
      
      if (current.x === goalNode.x && current.y === goalNode.y) {
        // Reconstruct path
        return this.reconstructPath(current);
      }
      
      closedSet.add(currentKey);
      
      // Check neighbors
      const neighbors = this.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (closedSet.has(neighborKey)) continue;
        
        // Check if neighbor is traversable
        if (!this.isTraversable(neighbor)) continue;
        
        const tentativeGScore = current.gScore + this.getMovementCost(current, neighbor);
        
        const existingNeighbor = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
        
        if (!existingNeighbor) {
          const newNode: AStarNode = {
            ...neighbor,
            gScore: tentativeGScore,
            fScore: tentativeGScore + this.heuristic(neighbor, goalNode),
            parent: current
          };
          openSet.push(newNode);
        } else if (tentativeGScore < existingNeighbor.gScore) {
          existingNeighbor.gScore = tentativeGScore;
          existingNeighbor.fScore = tentativeGScore + this.heuristic(neighbor, goalNode);
          existingNeighbor.parent = current;
        }
      }
    }
    
    return []; // No path found
  }

  private poseToGridNode(pose: Pose3D): GridNode {
    return {
      x: Math.round(pose.position.x / this.planningGrid.resolution),
      y: Math.round(pose.position.y / this.planningGrid.resolution)
    };
  }

  private gridNodeToPose(node: GridNode): Pose3D {
    return {
      position: {
        x: node.x * this.planningGrid.resolution,
        y: node.y * this.planningGrid.resolution,
        z: 0
      },
      orientation: { roll: 0, pitch: 0, yaw: 0 }
    };
  }

  private heuristic(a: GridNode, b: GridNode): number {
    // Euclidean distance
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private getNeighbors(node: GridNode): GridNode[] {
    const neighbors: GridNode[] = [];
    
    // 8-connected grid
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        
        const neighbor = {
          x: node.x + dx,
          y: node.y + dy
        };
        
        if (this.isValidGridPosition(neighbor)) {
          neighbors.push(neighbor);
        }
      }
    }
    
    return neighbors;
  }

  private isValidGridPosition(node: GridNode): boolean {
    return node.x >= 0 && node.x < this.planningGrid.width &&
           node.y >= 0 && node.y < this.planningGrid.height;
  }

  private isTraversable(node: GridNode): boolean {
    return this.planningGrid.getCell(node.x, node.y) === 0; // 0 = free space
  }

  private getMovementCost(from: GridNode, to: GridNode): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    
    // Diagonal movement costs more
    if (dx === 1 && dy === 1) {
      return Math.sqrt(2);
    } else {
      return 1;
    }
  }

  private reconstructPath(goalNode: AStarNode): Pose3D[] {
    const path: Pose3D[] = [];
    let current: AStarNode | null = goalNode;
    
    while (current) {
      path.unshift(this.gridNodeToPose(current));
      current = current.parent;
    }
    
    return path;
  }

  private smoothPath(path: Pose3D[]): Pose3D[] {
    if (path.length <= 2) return path;
    
    const smoothed: Pose3D[] = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const current = path[i];
      const next = path[i + 1];
      
      // Check if we can skip current waypoint (line of sight)
      if (!this.hasLineOfSight(prev.position, next.position)) {
        smoothed.push(current);
      }
    }
    
    smoothed.push(path[path.length - 1]);
    return smoothed;
  }

  private hasLineOfSight(from: Position3D, to: Position3D): boolean {
    const steps = 20;
    const dx = (to.x - from.x) / steps;
    const dy = (to.y - from.y) / steps;
    
    for (let i = 0; i <= steps; i++) {
      const x = from.x + dx * i;
      const y = from.y + dy * i;
      
      const gridNode = {
        x: Math.round(x / this.planningGrid.resolution),
        y: Math.round(y / this.planningGrid.resolution)
      };
      
      if (!this.isTraversable(gridNode)) {
        return false;
      }
    }
    
    return true;
  }

  private incorporateWaypoints(path: Pose3D[], waypoints: Pose3D[]): Pose3D[] {
    // Insert waypoints into path at appropriate positions
    const result: Pose3D[] = [];
    let pathIndex = 0;
    
    for (const waypoint of waypoints) {
      // Add path segments up to waypoint
      while (pathIndex < path.length) {
        const pathPoint = path[pathIndex];
        const distToWaypoint = this.calculateDistance(pathPoint.position, waypoint.position);
        
        if (distToWaypoint < 0.1) { // Close to waypoint
          result.push(waypoint);
          pathIndex++;
          break;
        }
        
        result.push(pathPoint);
        pathIndex++;
      }
    }
    
    // Add remaining path points
    while (pathIndex < path.length) {
      result.push(path[pathIndex]);
      pathIndex++;
    }
    
    return result;
  }

  updateObstacles(obstacles: ObstacleInfo[]): void {
    // Clear old obstacles
    this.obstacles.clear();
    
    // Add new obstacles
    for (const obstacle of obstacles) {
      this.obstacles.set(obstacle.id, obstacle);
    }
    
    this.status.obstacles = obstacles;
    
    // Update planning grid
    this.updatePlanningGrid();
    
    // Replan if currently executing
    if (this.status.status === 'executing' && this.currentGoal) {
      console.log('Obstacles updated, replanning path');
      // Would trigger replanning in real implementation
    }
  }

  private updatePlanningGrid(): void {
    // Clear grid
    this.planningGrid.clear();
    
    // Mark obstacles
    for (const obstacle of this.obstacles.values()) {
      this.markObstacleInGrid(obstacle);
    }
  }

  private markObstacleInGrid(obstacle: ObstacleInfo): void {
    const centerX = Math.round(obstacle.position.x / this.planningGrid.resolution);
    const centerY = Math.round(obstacle.position.y / this.planningGrid.resolution);
    const radiusX = Math.ceil(obstacle.size.x / (2 * this.planningGrid.resolution));
    const radiusY = Math.ceil(obstacle.size.y / (2 * this.planningGrid.resolution));
    
    for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
      for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
        if (this.isValidGridPosition({ x, y })) {
          this.planningGrid.setCell(x, y, 1); // 1 = obstacle
        }
      }
    }
  }

  getNextWaypoint(currentPose: Pose3D): Pose3D | null {
    if (!this.pathPlan || this.pathPlan.length === 0) {
      return null;
    }
    
    if (this.currentWaypointIndex >= this.pathPlan.length) {
      this.status.status = 'completed';
      return null;
    }
    
    const currentWaypoint = this.pathPlan[this.currentWaypointIndex];
    const distance = this.calculateDistance(currentPose.position, currentWaypoint.position);
    
    // Check if we've reached the current waypoint
    if (distance < 0.2) { // 20cm tolerance
      this.currentWaypointIndex++;
      
      if (this.currentWaypointIndex >= this.pathPlan.length) {
        this.status.status = 'completed';
        return null;
      }
      
      return this.pathPlan[this.currentWaypointIndex];
    }
    
    return currentWaypoint;
  }

  updateNavigationMetrics(currentPose: Pose3D): void {
    if (!this.currentGoal) return;
    
    // Calculate distance to goal
    this.status.distanceToGoal = this.calculateDistance(
      currentPose.position,
      this.currentGoal.targetPose.position
    );
    
    // Calculate progress
    if (this.pathPlan.length > 0) {
      this.status.progress = (this.currentWaypointIndex / this.pathPlan.length) * 100;
    }
    
    // Estimate time remaining
    const averageSpeed = 0.1; // m/s
    this.status.estimatedTimeRemaining = this.status.distanceToGoal / averageSpeed;
  }

  private calculateDistance(pos1: Position3D, pos2: Position3D): number {
    return Math.sqrt(
      (pos1.x - pos2.x) ** 2 +
      (pos1.y - pos2.y) ** 2 +
      (pos1.z - pos2.z) ** 2
    );
  }

  pauseNavigation(): void {
    this.status.status = 'paused';
  }

  resumeNavigation(): void {
    if (this.status.status === 'paused') {
      this.status.status = 'executing';
    }
  }

  cancelNavigation(): void {
    this.currentGoal = null;
    this.status.currentGoal = null;
    this.status.status = 'idle';
    this.pathPlan = [];
    this.currentWaypointIndex = 0;
  }

  getNavigationStatus(): NavigationStatus {
    return { ...this.status };
  }

  isNavigating(): boolean {
    return this.status.status === 'executing' || this.status.status === 'planning';
  }

  // Emergency path planning for obstacle avoidance
  async planEmergencyAvoidance(currentPose: Pose3D, obstaclePosition: Position3D): Promise<Pose3D[]> {
    const avoidanceDistance = 1.0; // 1 meter avoidance
    
    // Calculate avoidance waypoints
    const avoidanceWaypoints: Pose3D[] = [];
    
    // Vector from obstacle to robot
    const avoidanceVector = {
      x: currentPose.position.x - obstaclePosition.x,
      y: currentPose.position.y - obstaclePosition.y,
      z: 0
    };
    
    // Normalize and scale
    const length = Math.sqrt(avoidanceVector.x ** 2 + avoidanceVector.y ** 2);
    if (length > 0) {
      avoidanceVector.x = (avoidanceVector.x / length) * avoidanceDistance;
      avoidanceVector.y = (avoidanceVector.y / length) * avoidanceDistance;
    }
    
    // Create avoidance waypoint
    const avoidanceWaypoint: Pose3D = {
      position: {
        x: obstaclePosition.x + avoidanceVector.x,
        y: obstaclePosition.y + avoidanceVector.y,
        z: currentPose.position.z
      },
      orientation: currentPose.orientation
    };
    
    avoidanceWaypoints.push(avoidanceWaypoint);
    
    return avoidanceWaypoints;
  }
}

class PlanningGrid {
  private grid: number[][];
  public readonly width: number;
  public readonly height: number;
  public readonly resolution: number;

  constructor(width: number, height: number, resolution: number) {
    this.width = width;
    this.height = height;
    this.resolution = resolution;
    this.grid = Array(height).fill(0).map(() => Array(width).fill(0));
  }

  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = 0;
      }
    }
  }

  setCell(x: number, y: number, value: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y][x] = value;
    }
  }

  getCell(x: number, y: number): number {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.grid[y][x];
    }
    return 1; // Treat out-of-bounds as obstacle
  }
}

interface GridNode {
  x: number;
  y: number;
}

interface AStarNode extends GridNode {
  gScore: number;
  fScore: number;
  parent: AStarNode | null;
}