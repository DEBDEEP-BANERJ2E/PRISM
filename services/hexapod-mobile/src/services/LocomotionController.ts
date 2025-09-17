import { HexapodState, HexapodLeg, Position3D, Velocity3D, LocomotionConfig } from '../types';

export class LocomotionController {
  private config: LocomotionConfig;
  private currentState: HexapodState;
  private gaitPhase: number = 0;
  private isMoving: boolean = false;
  private emergencyStop: boolean = false;

  constructor(robotId: string, config: LocomotionConfig) {
    this.config = config;
    this.currentState = this.initializeState(robotId);
  }

  private initializeState(robotId: string): HexapodState {
    return {
      robotId,
      timestamp: Date.now(),
      pose: {
        position: { x: 0, y: 0, z: 0 },
        orientation: { roll: 0, pitch: 0, yaw: 0 }
      },
      velocity: {
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      },
      legs: this.initializeLegs(),
      batteryLevel: 100,
      operationalMode: 'idle',
      sensors: {
        imu: {
          acceleration: { x: 0, y: 0, z: 9.81 },
          gyroscope: { x: 0, y: 0, z: 0 },
          magnetometer: { x: 0, y: 1, z: 0 }
        },
        lidar: {
          ranges: [],
          angleMin: -Math.PI,
          angleMax: Math.PI,
          angleIncrement: Math.PI / 180
        },
        cameras: {
          stereo: true,
          thermal: true,
          rgbActive: true
        },
        gps: {
          latitude: 0,
          longitude: 0,
          altitude: 0,
          accuracy: 0
        }
      }
    };
  }

  private initializeLegs(): HexapodLeg[] {
    const legs: HexapodLeg[] = [];
    
    // Standard hexapod leg configuration
    const legPositions = [
      { x: 0.15, y: 0.1, z: 0 },   // Front right
      { x: 0, y: 0.12, z: 0 },     // Middle right
      { x: -0.15, y: 0.1, z: 0 },  // Rear right
      { x: -0.15, y: -0.1, z: 0 }, // Rear left
      { x: 0, y: -0.12, z: 0 },    // Middle left
      { x: 0.15, y: -0.1, z: 0 }   // Front left
    ];

    for (let i = 0; i < 6; i++) {
      legs.push({
        legId: i,
        joints: {
          coxa: 0,   // Hip joint
          femur: -45, // Thigh joint
          tibia: 90   // Shin joint
        },
        position: legPositions[i],
        isGrounded: true
      });
    }

    return legs;
  }

  async moveToTarget(targetVelocity: Velocity3D): Promise<boolean> {
    if (this.emergencyStop) {
      console.warn('Emergency stop active, cannot move');
      return false;
    }

    try {
      // Update operational mode
      this.currentState.operationalMode = 'walking';
      this.isMoving = true;

      // Calculate gait pattern
      const gaitPattern = this.calculateGaitPattern(targetVelocity);
      
      // Execute leg movements
      await this.executeLegMovements(gaitPattern);
      
      // Update robot pose
      this.updateRobotPose(targetVelocity);
      
      // Update timestamp
      this.currentState.timestamp = Date.now();
      
      return true;
    } catch (error) {
      console.error('Movement execution failed:', error);
      await this.emergencyStopSequence();
      return false;
    }
  }

  private calculateGaitPattern(targetVelocity: Velocity3D): LegMovement[] {
    const movements: LegMovement[] = [];
    
    switch (this.config.gaitType) {
      case 'tripod':
        return this.calculateTripodGait(targetVelocity);
      case 'wave':
        return this.calculateWaveGait(targetVelocity);
      case 'ripple':
        return this.calculateRippleGait(targetVelocity);
      default:
        return this.calculateTripodGait(targetVelocity);
    }
  }

  private calculateTripodGait(targetVelocity: Velocity3D): LegMovement[] {
    const movements: LegMovement[] = [];
    const cycleTime = 1.0; // 1 second cycle
    const swingTime = cycleTime * 0.4; // 40% swing, 60% stance
    
    // Tripod gait: legs 0,2,4 move together, then legs 1,3,5
    const group1 = [0, 2, 4]; // Right front, right rear, left middle
    const group2 = [1, 3, 5]; // Right middle, left rear, left front
    
    const phaseOffset = this.gaitPhase % cycleTime;
    
    for (let legId = 0; legId < 6; legId++) {
      const isGroup1 = group1.includes(legId);
      const legPhase = isGroup1 ? phaseOffset : (phaseOffset + cycleTime / 2) % cycleTime;
      
      const movement: LegMovement = {
        legId,
        isSwingPhase: legPhase < swingTime,
        targetPosition: this.calculateLegTargetPosition(legId, targetVelocity, legPhase),
        jointAngles: { coxa: 0, femur: 0, tibia: 0 }
      };
      
      // Calculate inverse kinematics for joint angles
      movement.jointAngles = this.calculateInverseKinematics(movement.targetPosition);
      
      movements.push(movement);
    }
    
    // Advance gait phase
    this.gaitPhase += 0.1; // 100ms step
    
    return movements;
  }

  private calculateWaveGait(targetVelocity: Velocity3D): LegMovement[] {
    // Wave gait: legs move in sequence 0->1->2->3->4->5
    const movements: LegMovement[] = [];
    const cycleTime = 3.0; // 3 second cycle for stability
    const swingTime = cycleTime / 6; // Each leg swings for 1/6 of cycle
    
    for (let legId = 0; legId < 6; legId++) {
      const legPhaseStart = (legId * cycleTime / 6) % cycleTime;
      const phaseOffset = (this.gaitPhase % cycleTime);
      const legPhase = (phaseOffset - legPhaseStart + cycleTime) % cycleTime;
      
      const movement: LegMovement = {
        legId,
        isSwingPhase: legPhase < swingTime,
        targetPosition: this.calculateLegTargetPosition(legId, targetVelocity, legPhase),
        jointAngles: { coxa: 0, femur: 0, tibia: 0 }
      };
      
      movement.jointAngles = this.calculateInverseKinematics(movement.targetPosition);
      movements.push(movement);
    }
    
    this.gaitPhase += 0.05; // Slower for stability
    return movements;
  }

  private calculateRippleGait(targetVelocity: Velocity3D): LegMovement[] {
    // Ripple gait: legs move in pairs with overlap
    const movements: LegMovement[] = [];
    const cycleTime = 2.0;
    const swingTime = cycleTime * 0.3;
    
    // Ripple sequence: (0,3) -> (1,4) -> (2,5)
    const pairs = [[0, 3], [1, 4], [2, 5]];
    
    for (let legId = 0; legId < 6; legId++) {
      const pairIndex = pairs.findIndex(pair => pair.includes(legId));
      const legPhaseStart = (pairIndex * cycleTime / 3) % cycleTime;
      const phaseOffset = (this.gaitPhase % cycleTime);
      const legPhase = (phaseOffset - legPhaseStart + cycleTime) % cycleTime;
      
      const movement: LegMovement = {
        legId,
        isSwingPhase: legPhase < swingTime,
        targetPosition: this.calculateLegTargetPosition(legId, targetVelocity, legPhase),
        jointAngles: { coxa: 0, femur: 0, tibia: 0 }
      };
      
      movement.jointAngles = this.calculateInverseKinematics(movement.targetPosition);
      movements.push(movement);
    }
    
    this.gaitPhase += 0.08;
    return movements;
  }

  private calculateLegTargetPosition(legId: number, velocity: Velocity3D, phase: number): Position3D {
    const baseLeg = this.currentState.legs[legId];
    const stepLength = this.config.stepLength;
    const stepHeight = this.config.stepHeight;
    
    // Calculate step vector based on velocity
    const stepVector = {
      x: velocity.linear.x * stepLength,
      y: velocity.linear.y * stepLength,
      z: 0
    };
    
    // Base position for this leg
    const basePos = { ...baseLeg.position };
    
    // During swing phase, lift and move leg
    if (phase < 0.4) { // Swing phase
      const swingProgress = phase / 0.4;
      const liftHeight = stepHeight * Math.sin(swingProgress * Math.PI);
      
      return {
        x: basePos.x + stepVector.x * swingProgress,
        y: basePos.y + stepVector.y * swingProgress,
        z: basePos.z - this.config.bodyHeight + liftHeight
      };
    } else { // Stance phase
      const stanceProgress = (phase - 0.4) / 0.6;
      
      return {
        x: basePos.x + stepVector.x * (1 - stanceProgress),
        y: basePos.y + stepVector.y * (1 - stanceProgress),
        z: basePos.z - this.config.bodyHeight
      };
    }
  }

  private calculateInverseKinematics(targetPosition: Position3D): { coxa: number; femur: number; tibia: number } {
    // Simplified inverse kinematics for hexapod leg
    // Leg segment lengths (in meters)
    const coxaLength = 0.05;
    const femurLength = 0.08;
    const tibiaLength = 0.12;
    
    const x = targetPosition.x;
    const y = targetPosition.y;
    const z = targetPosition.z;
    
    // Coxa angle (hip rotation)
    const coxaAngle = Math.atan2(y, x);
    
    // Distance from coxa joint to target
    const legReach = Math.sqrt(x * x + y * y) - coxaLength;
    const legHeight = -z; // Negative because z is down
    
    // Distance from femur joint to target
    const targetDistance = Math.sqrt(legReach * legReach + legHeight * legHeight);
    
    // Check if target is reachable
    if (targetDistance > femurLength + tibiaLength) {
      console.warn(`Target unreachable: ${targetDistance} > ${femurLength + tibiaLength}`);
      // Return safe default angles
      return { coxa: coxaAngle, femur: -45, tibia: 90 };
    }
    
    // Femur angle using law of cosines
    const femurAngle = Math.atan2(legHeight, legReach) - 
      Math.acos((femurLength * femurLength + targetDistance * targetDistance - tibiaLength * tibiaLength) / 
                (2 * femurLength * targetDistance));
    
    // Tibia angle
    const tibiaAngle = Math.acos((femurLength * femurLength + tibiaLength * tibiaLength - targetDistance * targetDistance) / 
                                (2 * femurLength * tibiaLength));
    
    return {
      coxa: coxaAngle * 180 / Math.PI,
      femur: femurAngle * 180 / Math.PI,
      tibia: (Math.PI - tibiaAngle) * 180 / Math.PI
    };
  }

  private async executeLegMovements(movements: LegMovement[]): Promise<void> {
    // Update leg states
    for (const movement of movements) {
      const leg = this.currentState.legs[movement.legId];
      
      // Update joint angles
      leg.joints = movement.jointAngles;
      
      // Update position
      leg.position = movement.targetPosition;
      
      // Update ground contact
      leg.isGrounded = !movement.isSwingPhase;
    }
    
    // Simulate servo movement time
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private updateRobotPose(velocity: Velocity3D): void {
    const dt = 0.1; // 100ms time step
    
    // Update position
    this.currentState.pose.position.x += velocity.linear.x * dt;
    this.currentState.pose.position.y += velocity.linear.y * dt;
    this.currentState.pose.position.z += velocity.linear.z * dt;
    
    // Update orientation
    this.currentState.pose.orientation.roll += velocity.angular.x * dt;
    this.currentState.pose.orientation.pitch += velocity.angular.y * dt;
    this.currentState.pose.orientation.yaw += velocity.angular.z * dt;
    
    // Update velocity
    this.currentState.velocity = velocity;
  }

  async stopMovement(): Promise<void> {
    this.isMoving = false;
    this.currentState.operationalMode = 'idle';
    
    // Set all legs to ground contact
    for (const leg of this.currentState.legs) {
      leg.isGrounded = true;
    }
    
    // Zero velocity
    this.currentState.velocity = {
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 }
    };
    
    console.log('Movement stopped');
  }

  async emergencyStopSequence(): Promise<void> {
    this.emergencyStop = true;
    await this.stopMovement();
    
    // Lower body to ground for stability
    this.config.bodyHeight = 0.05; // Lower body
    
    console.warn('Emergency stop activated');
  }

  async climbMode(enable: boolean): Promise<void> {
    if (enable) {
      this.currentState.operationalMode = 'climbing';
      
      // Adjust gait for climbing
      this.config.gaitType = 'wave'; // More stable for climbing
      this.config.stepHeight *= 1.5; // Higher steps
      this.config.speed *= 0.5; // Slower for safety
      this.config.stabilityMargin = 0.8; // Higher stability requirement
      
      console.log('Climbing mode enabled');
    } else {
      this.currentState.operationalMode = 'walking';
      
      // Restore normal gait
      this.config.gaitType = 'tripod';
      this.config.stepHeight /= 1.5;
      this.config.speed *= 2;
      this.config.stabilityMargin = 0.3;
      
      console.log('Climbing mode disabled');
    }
  }

  calculateStabilityMargin(): number {
    // Calculate center of mass and support polygon
    const groundedLegs = this.currentState.legs.filter(leg => leg.isGrounded);
    
    if (groundedLegs.length < 3) {
      return 0; // Unstable
    }
    
    // Simplified stability calculation
    // In real implementation, would calculate actual center of mass and support polygon
    const supportArea = groundedLegs.length / 6; // Normalized by total legs
    const velocityFactor = Math.sqrt(
      this.currentState.velocity.linear.x ** 2 + 
      this.currentState.velocity.linear.y ** 2
    );
    
    return Math.max(0, supportArea - velocityFactor * 0.1);
  }

  getCurrentState(): HexapodState {
    return { ...this.currentState };
  }

  updateConfig(newConfig: Partial<LocomotionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  resetEmergencyStop(): void {
    this.emergencyStop = false;
    console.log('Emergency stop reset');
  }

  getGaitInfo(): { type: string; phase: number; stability: number } {
    return {
      type: this.config.gaitType,
      phase: this.gaitPhase,
      stability: this.calculateStabilityMargin()
    };
  }
}

interface LegMovement {
  legId: number;
  isSwingPhase: boolean;
  targetPosition: Position3D;
  jointAngles: {
    coxa: number;
    femur: number;
    tibia: number;
  };
}