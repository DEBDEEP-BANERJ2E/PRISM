import { LocomotionController } from './LocomotionController';
import { NavigationPlanner } from './NavigationPlanner';
import { ComputerVision } from './ComputerVision';
import { SensorDeploymentSystem } from './SensorDeploymentSystem';
import { 
  HexapodState, 
  NavigationGoal, 
  NavigationStatus, 
  InspectionMission, 
  VisionData,
  Position3D,
  Pose3D,
  Velocity3D,
  LocomotionConfig,
  ClimbingCapabilities
} from '../types';

export class MobileHexapodController {
  private locomotionController: LocomotionController;
  private navigationPlanner: NavigationPlanner;
  private computerVision: ComputerVision;
  private sensorDeployment: SensorDeploymentSystem;
  
  private robotId: string;
  private isActive: boolean = false;
  private currentMission: InspectionMission | null = null;
  private emergencyStop: boolean = false;
  private lastVisionData: VisionData | null = null;
  private homePosition: Pose3D;

  constructor(robotId: string, homePosition: Pose3D) {
    this.robotId = robotId;
    this.homePosition = homePosition;
    
    // Initialize subsystems
    const locomotionConfig: LocomotionConfig = {
      gaitType: 'tripod',
      stepHeight: 0.08,
      stepLength: 0.15,
      bodyHeight: 0.12,
      speed: 0.2,
      stabilityMargin: 0.3,
      adaptiveGait: true
    };
    
    this.locomotionController = new LocomotionController(robotId, locomotionConfig);
    this.navigationPlanner = new NavigationPlanner();
    this.computerVision = new ComputerVision();
    this.sensorDeployment = new SensorDeploymentSystem();
  }

  async initialize(): Promise<boolean> {
    try {
      console.log(`Initializing Mobile Hexapod Controller: ${this.robotId}`);
      
      // Initialize computer vision system
      const visionInitialized = this.computerVision.isCalibrated();
      if (!visionInitialized) {
        console.warn('Computer vision system not fully calibrated');
      }
      
      // Perform initial self-diagnostics
      const diagnostics = await this.performSelfDiagnostics();
      if (!diagnostics.passed) {
        console.error('Self-diagnostics failed:', diagnostics.issues);
        return false;
      }
      
      console.log(`Mobile Hexapod Controller ${this.robotId} initialized successfully`);
      return true;
    } catch (error) {
      console.error('Mobile Hexapod Controller initialization failed:', error);
      return false;
    }
  }

  async startMission(mission: InspectionMission): Promise<boolean> {
    if (this.emergencyStop) {
      console.error('Cannot start mission - emergency stop active');
      return false;
    }

    try {
      console.log(`Starting mission: ${mission.missionId} (${mission.missionType})`);
      
      this.currentMission = mission;
      this.currentMission.status = 'active';
      this.currentMission.progress = 0;
      this.isActive = true;
      
      // Start mission execution loop
      this.executeMissionLoop().catch(error => {
        console.error('Mission execution failed:', error);
        this.handleMissionFailure(error);
      });
      
      return true;
    } catch (error) {
      console.error('Failed to start mission:', error);
      return false;
    }
  }

  private async executeMissionLoop(): Promise<void> {
    while (this.isActive && this.currentMission && this.currentMission.status === 'active') {
      try {
        // Get current robot state
        const currentState = this.locomotionController.getCurrentState();
        
        // Process vision data for obstacle detection and inspection
        await this.processVisionData();
        
        // Update navigation with detected obstacles
        if (this.lastVisionData) {
          const obstacles = await this.extractObstaclesFromVision(this.lastVisionData);
          this.navigationPlanner.updateObstacles(obstacles);
        }
        
        // Execute mission-specific behavior
        await this.executeMissionStep(currentState);
        
        // Update mission progress
        this.updateMissionProgress();
        
        // Safety checks
        if (await this.performSafetyChecks(currentState)) {
          await this.handleEmergencyStop();
          break;
        }
        
        // Small delay to prevent excessive CPU usage
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('Error in mission execution loop:', error);
        await this.handleMissionFailure(error);
        break;
      }
    }
  }

  private async processVisionData(): Promise<void> {
    try {
      // Simulate camera data capture
      const rgbImage = Buffer.alloc(640 * 480 * 3); // Mock RGB image
      const depthImage = Buffer.alloc(640 * 480 * 2); // Mock depth image
      const thermalImage = Buffer.alloc(320 * 240 * 2); // Mock thermal image
      
      // Process images
      this.lastVisionData = await this.computerVision.processImages(rgbImage, depthImage, thermalImage);
      
      // Log significant findings
      if (this.lastVisionData.detectedFeatures.length > 0) {
        const criticalFeatures = this.lastVisionData.detectedFeatures.filter(f => f.severity === 'critical' || f.severity === 'high');
        if (criticalFeatures.length > 0) {
          console.warn(`Detected ${criticalFeatures.length} critical/high severity geological features`);
          
          // Add findings to mission
          if (this.currentMission) {
            for (const feature of criticalFeatures) {
              this.currentMission.findings.push({
                findingId: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                location: feature.worldPosition || { x: 0, y: 0, z: 0 },
                type: 'anomaly',
                severity: feature.severity,
                description: feature.description,
                images: [`image_${feature.id}`],
                recommendedAction: this.generateRecommendedAction(feature),
                requiresImmediate: feature.severity === 'critical'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Vision processing failed:', error);
    }
  }

  private generateRecommendedAction(feature: any): string {
    switch (feature.type) {
      case 'joint':
        return feature.severity === 'critical' ? 'Immediate evacuation and structural assessment' : 'Monitor with additional sensors';
      case 'fracture':
        return 'Deploy strain gauges and monitor displacement';
      case 'loose_rock':
        return 'Remove loose material or install protective barriers';
      case 'water_seepage':
        return 'Install drainage and monitor pore pressure';
      case 'weathering':
        return 'Assess structural integrity and consider surface treatment';
      default:
        return 'Further investigation required';
    }
  }

  private async extractObstaclesFromVision(visionData: VisionData): Promise<any[]> {
    const obstacles: any[] = [];
    
    // Convert detected features to obstacles for navigation
    for (const feature of visionData.detectedFeatures) {
      if (feature.type === 'loose_rock' && feature.worldPosition) {
        obstacles.push({
          id: feature.id,
          position: feature.worldPosition,
          size: { x: 0.3, y: 0.3, z: 0.2 }, // Estimated size
          type: 'loose_rock',
          confidence: feature.confidence,
          timestamp: Date.now()
        });
      }
    }
    
    return obstacles;
  }

  private async executeMissionStep(currentState: HexapodState): Promise<void> {
    if (!this.currentMission) return;
    
    switch (this.currentMission.missionType) {
      case 'routine_patrol':
        await this.executePatrolStep(currentState);
        break;
      case 'targeted_inspection':
        await this.executeInspectionStep(currentState);
        break;
      case 'sensor_deployment':
        await this.executeSensorDeploymentStep(currentState);
        break;
      case 'emergency_response':
        await this.executeEmergencyResponseStep(currentState);
        break;
    }
  }

  private async executePatrolStep(currentState: HexapodState): Promise<void> {
    // Patrol through all inspection areas
    if (!this.currentMission) return;
    
    const currentArea = this.getCurrentInspectionArea();
    if (!currentArea) {
      // Mission complete
      this.currentMission.status = 'completed';
      return;
    }
    
    // Navigate to area center
    const areaCenter = this.calculateAreaCenter(currentArea.boundary);
    const goal: NavigationGoal = {
      goalId: `patrol_${currentArea.areaId}`,
      targetPose: {
        position: areaCenter,
        orientation: { roll: 0, pitch: 0, yaw: 0 }
      },
      goalType: 'inspect_area',
      priority: 'medium',
      constraints: {
        maxSpeed: 0.15,
        maxSlope: 30,
        avoidanceRadius: 0.5,
        timeoutSeconds: 300
      }
    };
    
    // Plan and execute navigation
    if (!this.navigationPlanner.isNavigating()) {
      await this.navigationPlanner.planPath(goal, currentState.pose);
    }
    
    // Execute movement
    const nextWaypoint = this.navigationPlanner.getNextWaypoint(currentState.pose);
    if (nextWaypoint) {
      const velocity = this.calculateVelocityToWaypoint(currentState.pose, nextWaypoint);
      await this.locomotionController.moveToTarget(velocity);
    }
  }

  private async executeInspectionStep(currentState: HexapodState): Promise<void> {
    // Detailed inspection of specific areas
    const currentArea = this.getCurrentInspectionArea();
    if (!currentArea) return;
    
    // Move slowly for detailed inspection
    const goal: NavigationGoal = {
      goalId: `inspect_${currentArea.areaId}`,
      targetPose: {
        position: this.calculateAreaCenter(currentArea.boundary),
        orientation: { roll: 0, pitch: 0, yaw: 0 }
      },
      goalType: 'inspect_area',
      priority: 'high',
      constraints: {
        maxSpeed: 0.08, // Slower for detailed inspection
        maxSlope: 25,
        avoidanceRadius: 0.3,
        timeoutSeconds: 600
      }
    };
    
    if (!this.navigationPlanner.isNavigating()) {
      await this.navigationPlanner.planPath(goal, currentState.pose);
    }
    
    const nextWaypoint = this.navigationPlanner.getNextWaypoint(currentState.pose);
    if (nextWaypoint) {
      const velocity = this.calculateVelocityToWaypoint(currentState.pose, nextWaypoint);
      await this.locomotionController.moveToTarget(velocity);
    }
  }

  private async executeSensorDeploymentStep(currentState: HexapodState): Promise<void> {
    // Execute sensor deployments
    const deploymentSuccess = await this.sensorDeployment.executeNextDeployment(currentState.pose);
    
    if (!deploymentSuccess) {
      const queueLength = this.sensorDeployment.getDeploymentQueue().length;
      if (queueLength === 0) {
        // All deployments complete
        if (this.currentMission) {
          this.currentMission.status = 'completed';
        }
      }
    }
  }

  private async executeEmergencyResponseStep(currentState: HexapodState): Promise<void> {
    // Emergency response - navigate to incident location quickly
    if (!this.currentMission || this.currentMission.areas.length === 0) return;
    
    const emergencyArea = this.currentMission.areas[0]; // First area is emergency location
    const goal: NavigationGoal = {
      goalId: `emergency_${emergencyArea.areaId}`,
      targetPose: {
        position: this.calculateAreaCenter(emergencyArea.boundary),
        orientation: { roll: 0, pitch: 0, yaw: 0 }
      },
      goalType: 'move_to',
      priority: 'emergency',
      constraints: {
        maxSpeed: 0.3, // Faster for emergency
        maxSlope: 35,
        avoidanceRadius: 0.4,
        timeoutSeconds: 180
      }
    };
    
    if (!this.navigationPlanner.isNavigating()) {
      await this.navigationPlanner.planPath(goal, currentState.pose);
    }
    
    const nextWaypoint = this.navigationPlanner.getNextWaypoint(currentState.pose);
    if (nextWaypoint) {
      const velocity = this.calculateVelocityToWaypoint(currentState.pose, nextWaypoint);
      await this.locomotionController.moveToTarget(velocity);
    }
  }

  private getCurrentInspectionArea(): any {
    if (!this.currentMission) return null;
    
    // Simple implementation - return first unvisited area
    return this.currentMission.areas.find(area => !area.lastInspected || 
      (Date.now() - area.lastInspected) > 24 * 60 * 60 * 1000); // 24 hours
  }

  private calculateAreaCenter(boundary: Position3D[]): Position3D {
    if (boundary.length === 0) return { x: 0, y: 0, z: 0 };
    
    const center = boundary.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
        z: acc.z + point.z
      }),
      { x: 0, y: 0, z: 0 }
    );
    
    return {
      x: center.x / boundary.length,
      y: center.y / boundary.length,
      z: center.z / boundary.length
    };
  }

  private calculateVelocityToWaypoint(currentPose: Pose3D, targetPose: Pose3D): Velocity3D {
    const dx = targetPose.position.x - currentPose.position.x;
    const dy = targetPose.position.y - currentPose.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 0.1) {
      return { linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } };
    }
    
    const maxSpeed = 0.2; // m/s
    const speed = Math.min(maxSpeed, distance * 2); // Slow down when close
    
    return {
      linear: {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed,
        z: 0
      },
      angular: { x: 0, y: 0, z: 0 }
    };
  }

  private updateMissionProgress(): void {
    if (!this.currentMission) return;
    
    // Simple progress calculation based on areas visited
    const totalAreas = this.currentMission.areas.length;
    const visitedAreas = this.currentMission.areas.filter(area => 
      area.lastInspected && (Date.now() - area.lastInspected) < 60 * 60 * 1000 // Within last hour
    ).length;
    
    this.currentMission.progress = totalAreas > 0 ? (visitedAreas / totalAreas) * 100 : 0;
  }

  private async performSafetyChecks(currentState: HexapodState): Promise<boolean> {
    // Check battery level
    if (currentState.batteryLevel < 20) {
      console.warn('Low battery detected - initiating return to base');
      await this.returnToBase();
      return true;
    }
    
    // Check stability
    const stability = this.locomotionController.calculateStabilityMargin();
    if (stability < 0.1) {
      console.warn('Low stability detected - stopping movement');
      await this.locomotionController.emergencyStopSequence();
      return true;
    }
    
    // Check for cliff edges
    if (this.lastVisionData && this.lastVisionData.depthImage) {
      const cliffEdges = await this.computerVision.detectCliffEdges(this.lastVisionData.depthImage.data);
      if (cliffEdges.length > 0) {
        console.warn('Cliff edge detected - stopping movement');
        await this.locomotionController.emergencyStopSequence();
        return true;
      }
    }
    
    return false;
  }

  private async handleEmergencyStop(): Promise<void> {
    this.emergencyStop = true;
    this.isActive = false;
    
    await this.locomotionController.emergencyStopSequence();
    
    if (this.currentMission) {
      this.currentMission.status = 'aborted';
    }
    
    console.error('Emergency stop activated');
  }

  private async handleMissionFailure(error: any): Promise<void> {
    console.error('Mission failed:', error);
    
    if (this.currentMission) {
      this.currentMission.status = 'aborted';
    }
    
    this.isActive = false;
    await this.locomotionController.stopMovement();
  }

  async returnToBase(): Promise<boolean> {
    try {
      console.log('Returning to base...');
      
      const currentState = this.locomotionController.getCurrentState();
      const goal: NavigationGoal = {
        goalId: 'return_home',
        targetPose: this.homePosition,
        goalType: 'return_home',
        priority: 'high',
        constraints: {
          maxSpeed: 0.25,
          maxSlope: 30,
          avoidanceRadius: 0.5,
          timeoutSeconds: 600
        }
      };
      
      const pathPlanned = await this.navigationPlanner.planPath(goal, currentState.pose);
      if (!pathPlanned) {
        console.error('Failed to plan path home');
        return false;
      }
      
      // Execute return journey
      while (this.navigationPlanner.isNavigating()) {
        const nextWaypoint = this.navigationPlanner.getNextWaypoint(currentState.pose);
        if (nextWaypoint) {
          const velocity = this.calculateVelocityToWaypoint(currentState.pose, nextWaypoint);
          await this.locomotionController.moveToTarget(velocity);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('Returned to base successfully');
      return true;
    } catch (error) {
      console.error('Failed to return to base:', error);
      return false;
    }
  }

  async pauseMission(): Promise<void> {
    if (this.currentMission) {
      this.currentMission.status = 'paused';
      this.navigationPlanner.pauseNavigation();
      await this.locomotionController.stopMovement();
      console.log('Mission paused');
    }
  }

  async resumeMission(): Promise<void> {
    if (this.currentMission && this.currentMission.status === 'paused') {
      this.currentMission.status = 'active';
      this.navigationPlanner.resumeNavigation();
      console.log('Mission resumed');
    }
  }

  async abortMission(): Promise<void> {
    if (this.currentMission) {
      this.currentMission.status = 'aborted';
      this.navigationPlanner.cancelNavigation();
      await this.locomotionController.stopMovement();
      this.isActive = false;
      console.log('Mission aborted');
    }
  }

  // Sensor deployment interface
  async deploySensor(
    sensorType: 'tilt' | 'strain' | 'piezometer' | 'environmental',
    targetLocation: Position3D,
    deploymentMethod?: 'drill' | 'adhesive' | 'magnetic' | 'clamp'
  ): Promise<string> {
    return await this.sensorDeployment.planSensorDeployment(sensorType, targetLocation, deploymentMethod);
  }

  // Status and diagnostics
  getCurrentState(): HexapodState {
    return this.locomotionController.getCurrentState();
  }

  getNavigationStatus(): NavigationStatus {
    return this.navigationPlanner.getNavigationStatus();
  }

  getCurrentMission(): InspectionMission | null {
    return this.currentMission;
  }

  getLastVisionData(): VisionData | null {
    return this.lastVisionData;
  }

  async performSelfDiagnostics(): Promise<{ passed: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check locomotion system
    const gaitInfo = this.locomotionController.getGaitInfo();
    if (gaitInfo.stability < 0.3) {
      issues.push('Low locomotion stability');
    }
    
    // Check vision system
    const visionStatus = this.computerVision.getSystemStatus();
    if (!visionStatus.initialized) {
      issues.push('Computer vision not initialized');
    }
    if (!visionStatus.stereoCalibrated) {
      issues.push('Stereo camera not calibrated');
    }
    if (!visionStatus.thermalCalibrated) {
      issues.push('Thermal camera not calibrated');
    }
    
    // Check deployment tools
    const toolDiagnostics = await this.sensorDeployment.performToolDiagnostics();
    for (const tool of toolDiagnostics) {
      if (tool.status !== 'healthy') {
        issues.push(`Tool ${tool.toolId}: ${tool.issues.join(', ')}`);
      }
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }

  resetEmergencyStop(): void {
    this.emergencyStop = false;
    this.locomotionController.resetEmergencyStop();
    console.log('Emergency stop reset');
  }

  // Configuration updates
  updateLocomotionConfig(config: Partial<LocomotionConfig>): void {
    this.locomotionController.updateConfig(config);
  }

  async enableClimbingMode(): Promise<void> {
    await this.locomotionController.climbMode(true);
    console.log('Climbing mode enabled');
  }

  async disableClimbingMode(): Promise<void> {
    await this.locomotionController.climbMode(false);
    console.log('Climbing mode disabled');
  }
}