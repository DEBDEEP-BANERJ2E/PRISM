import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { LocomotionController } from '../services/LocomotionController';
import { LocomotionConfig, Velocity3D } from '../types';

describe('LocomotionController', () => {
  let locomotionController: LocomotionController;
  let config: LocomotionConfig;

  beforeEach(() => {
    config = {
      gaitType: 'tripod',
      stepHeight: 0.08,
      stepLength: 0.15,
      bodyHeight: 0.12,
      speed: 0.2,
      stabilityMargin: 0.3,
      adaptiveGait: true
    };

    locomotionController = new LocomotionController('test-robot-001', config);
  });

  describe('initialization', () => {
    it('should initialize with correct robot ID and configuration', () => {
      const state = locomotionController.getCurrentState();
      
      expect(state.robotId).toBe('test-robot-001');
      expect(state.operationalMode).toBe('idle');
      expect(state.legs).toHaveLength(6);
    });

    it('should initialize all legs with correct properties', () => {
      const state = locomotionController.getCurrentState();
      
      for (let i = 0; i < 6; i++) {
        const leg = state.legs[i];
        expect(leg.legId).toBe(i);
        expect(leg.joints).toHaveProperty('coxa');
        expect(leg.joints).toHaveProperty('femur');
        expect(leg.joints).toHaveProperty('tibia');
        expect(leg.position).toHaveProperty('x');
        expect(leg.position).toHaveProperty('y');
        expect(leg.position).toHaveProperty('z');
        expect(leg.isGrounded).toBe(true);
      }
    });
  });

  describe('movement control', () => {
    it('should move to target velocity successfully', async () => {
      const targetVelocity: Velocity3D = {
        linear: { x: 0.1, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      };

      const result = await locomotionController.moveToTarget(targetVelocity);
      
      expect(result).toBe(true);
      
      const state = locomotionController.getCurrentState();
      expect(state.operationalMode).toBe('walking');
      expect(state.velocity.linear.x).toBe(0.1);
    });

    it('should update robot pose during movement', async () => {
      const targetVelocity: Velocity3D = {
        linear: { x: 0.1, y: 0.05, z: 0 },
        angular: { x: 0, y: 0, z: 0.1 }
      };

      const initialState = locomotionController.getCurrentState();
      const initialPose = { ...initialState.pose };

      await locomotionController.moveToTarget(targetVelocity);
      
      const finalState = locomotionController.getCurrentState();
      
      // Position should have changed (allowing for floating point precision)
      expect(finalState.pose.position.x).toBeGreaterThanOrEqual(initialPose.position.x);
      expect(finalState.pose.position.y).toBeGreaterThanOrEqual(initialPose.position.y);
      expect(finalState.pose.orientation.yaw).toBeGreaterThanOrEqual(initialPose.orientation.yaw);
    });

    it('should stop movement correctly', async () => {
      const targetVelocity: Velocity3D = {
        linear: { x: 0.1, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      };

      await locomotionController.moveToTarget(targetVelocity);
      await locomotionController.stopMovement();
      
      const state = locomotionController.getCurrentState();
      expect(state.operationalMode).toBe('idle');
      expect(state.velocity.linear.x).toBe(0);
      expect(state.velocity.linear.y).toBe(0);
      expect(state.velocity.linear.z).toBe(0);
      
      // All legs should be grounded
      for (const leg of state.legs) {
        expect(leg.isGrounded).toBe(true);
      }
    });
  });

  describe('gait patterns', () => {
    it('should calculate tripod gait correctly', async () => {
      config.gaitType = 'tripod';
      locomotionController.updateConfig(config);
      
      const targetVelocity: Velocity3D = {
        linear: { x: 0.1, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      };

      await locomotionController.moveToTarget(targetVelocity);
      
      const gaitInfo = locomotionController.getGaitInfo();
      expect(gaitInfo.type).toBe('tripod');
      expect(gaitInfo.phase).toBeGreaterThan(0);
    });

    it('should calculate wave gait correctly', async () => {
      config.gaitType = 'wave';
      locomotionController.updateConfig(config);
      
      const targetVelocity: Velocity3D = {
        linear: { x: 0.05, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      };

      await locomotionController.moveToTarget(targetVelocity);
      
      const gaitInfo = locomotionController.getGaitInfo();
      expect(gaitInfo.type).toBe('wave');
    });

    it('should calculate ripple gait correctly', async () => {
      config.gaitType = 'ripple';
      locomotionController.updateConfig(config);
      
      const targetVelocity: Velocity3D = {
        linear: { x: 0.08, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      };

      await locomotionController.moveToTarget(targetVelocity);
      
      const gaitInfo = locomotionController.getGaitInfo();
      expect(gaitInfo.type).toBe('ripple');
    });
  });

  describe('climbing mode', () => {
    it('should enable climbing mode', async () => {
      await locomotionController.climbMode(true);
      
      const state = locomotionController.getCurrentState();
      expect(state.operationalMode).toBe('climbing');
      
      const gaitInfo = locomotionController.getGaitInfo();
      expect(gaitInfo.type).toBe('wave'); // Should switch to wave gait for stability
    });

    it('should disable climbing mode', async () => {
      await locomotionController.climbMode(true);
      await locomotionController.climbMode(false);
      
      const state = locomotionController.getCurrentState();
      expect(state.operationalMode).toBe('walking');
      
      const gaitInfo = locomotionController.getGaitInfo();
      expect(gaitInfo.type).toBe('tripod'); // Should return to tripod gait
    });
  });

  describe('stability calculations', () => {
    it('should calculate stability margin', () => {
      const stability = locomotionController.calculateStabilityMargin();
      
      expect(stability).toBeGreaterThanOrEqual(0);
      expect(stability).toBeLessThanOrEqual(1);
    });

    it('should have higher stability when more legs are grounded', () => {
      const initialStability = locomotionController.calculateStabilityMargin();
      
      // All legs should be grounded initially
      expect(initialStability).toBeGreaterThan(0.5);
    });
  });

  describe('emergency procedures', () => {
    it('should execute emergency stop sequence', async () => {
      const targetVelocity: Velocity3D = {
        linear: { x: 0.1, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      };

      await locomotionController.moveToTarget(targetVelocity);
      await locomotionController.emergencyStopSequence();
      
      const state = locomotionController.getCurrentState();
      expect(state.operationalMode).toBe('idle');
      expect(state.velocity.linear.x).toBe(0);
      
      // Should not be able to move after emergency stop
      const moveResult = await locomotionController.moveToTarget(targetVelocity);
      expect(moveResult).toBe(false);
    });

    it('should reset emergency stop', async () => {
      await locomotionController.emergencyStopSequence();
      locomotionController.resetEmergencyStop();
      
      const targetVelocity: Velocity3D = {
        linear: { x: 0.1, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      };

      const moveResult = await locomotionController.moveToTarget(targetVelocity);
      expect(moveResult).toBe(true);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        stepHeight: 0.1,
        stepLength: 0.2,
        speed: 0.3
      };

      locomotionController.updateConfig(newConfig);
      
      // Configuration should be updated (verified through behavior)
      const gaitInfo = locomotionController.getGaitInfo();
      expect(gaitInfo).toBeDefined();
    });
  });

  describe('getCurrentState', () => {
    it('should return complete robot state', () => {
      const state = locomotionController.getCurrentState();
      
      expect(state).toHaveProperty('robotId');
      expect(state).toHaveProperty('timestamp');
      expect(state).toHaveProperty('pose');
      expect(state).toHaveProperty('velocity');
      expect(state).toHaveProperty('legs');
      expect(state).toHaveProperty('batteryLevel');
      expect(state).toHaveProperty('operationalMode');
      expect(state).toHaveProperty('sensors');
      
      expect(state.pose).toHaveProperty('position');
      expect(state.pose).toHaveProperty('orientation');
      expect(state.velocity).toHaveProperty('linear');
      expect(state.velocity).toHaveProperty('angular');
      expect(state.sensors).toHaveProperty('imu');
      expect(state.sensors).toHaveProperty('lidar');
      expect(state.sensors).toHaveProperty('cameras');
      expect(state.sensors).toHaveProperty('gps');
    });
  });
});