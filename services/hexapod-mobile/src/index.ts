import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { MobileHexapodController } from './services/MobileHexapodController';
import { InspectionMission, Pose3D, Position3D } from './types';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Global mobile hexapod controller instance
let hexapodController: MobileHexapodController | null = null;

// Configuration
const homePosition: Pose3D = {
  position: {
    x: parseFloat(process.env.HOME_X || '0'),
    y: parseFloat(process.env.HOME_Y || '0'),
    z: parseFloat(process.env.HOME_Z || '0')
  },
  orientation: { roll: 0, pitch: 0, yaw: 0 }
};

// Health check endpoint
app.get('/health', (req, res) => {
  const state = hexapodController ? hexapodController.getCurrentState() : null;
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hexapod: state ? {
      robotId: state.robotId,
      operationalMode: state.operationalMode,
      batteryLevel: state.batteryLevel,
      pose: state.pose,
      isActive: hexapodController?.getCurrentMission()?.status === 'active'
    } : null
  });
});

// Get robot status
app.get('/status', (req, res) => {
  if (!hexapodController) {
    return res.status(503).json({ error: 'Hexapod controller not initialized' });
  }

  const state = hexapodController.getCurrentState();
  const navigationStatus = hexapodController.getNavigationStatus();
  const currentMission = hexapodController.getCurrentMission();
  const visionData = hexapodController.getLastVisionData();

  res.json({
    robotState: state,
    navigation: navigationStatus,
    mission: currentMission,
    vision: visionData ? {
      timestamp: visionData.timestamp,
      featuresDetected: visionData.detectedFeatures.length,
      surfaceAnalysis: visionData.surfaceAnalysis
    } : null
  });
});

// Start mission
app.post('/mission/start', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    const mission: InspectionMission = req.body;
    
    // Validate mission
    if (!mission.missionId || !mission.missionType || !mission.areas) {
      return res.status(400).json({ error: 'Invalid mission data' });
    }

    const success = await hexapodController.startMission(mission);
    
    if (success) {
      res.json({ message: 'Mission started successfully', missionId: mission.missionId });
    } else {
      res.status(500).json({ error: 'Failed to start mission' });
    }
  } catch (error) {
    console.error('Error starting mission:', error);
    res.status(500).json({ error: 'Failed to start mission' });
  }
});

// Pause mission
app.post('/mission/pause', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.pauseMission();
    res.json({ message: 'Mission paused' });
  } catch (error) {
    console.error('Error pausing mission:', error);
    res.status(500).json({ error: 'Failed to pause mission' });
  }
});

// Resume mission
app.post('/mission/resume', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.resumeMission();
    res.json({ message: 'Mission resumed' });
  } catch (error) {
    console.error('Error resuming mission:', error);
    res.status(500).json({ error: 'Failed to resume mission' });
  }
});

// Abort mission
app.post('/mission/abort', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.abortMission();
    res.json({ message: 'Mission aborted' });
  } catch (error) {
    console.error('Error aborting mission:', error);
    res.status(500).json({ error: 'Failed to abort mission' });
  }
});

// Return to base
app.post('/return-to-base', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    const success = await hexapodController.returnToBase();
    
    if (success) {
      res.json({ message: 'Returned to base successfully' });
    } else {
      res.status(500).json({ error: 'Failed to return to base' });
    }
  } catch (error) {
    console.error('Error returning to base:', error);
    res.status(500).json({ error: 'Failed to return to base' });
  }
});

// Deploy sensor
app.post('/sensor/deploy', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    const { sensorType, targetLocation, deploymentMethod } = req.body;
    
    if (!sensorType || !targetLocation) {
      return res.status(400).json({ error: 'Missing sensor type or target location' });
    }

    const deploymentId = await hexapodController.deploySensor(
      sensorType,
      targetLocation,
      deploymentMethod
    );
    
    res.json({ message: 'Sensor deployment planned', deploymentId });
  } catch (error) {
    console.error('Error deploying sensor:', error);
    res.status(500).json({ error: 'Failed to deploy sensor' });
  }
});

// Enable climbing mode
app.post('/climbing/enable', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.enableClimbingMode();
    res.json({ message: 'Climbing mode enabled' });
  } catch (error) {
    console.error('Error enabling climbing mode:', error);
    res.status(500).json({ error: 'Failed to enable climbing mode' });
  }
});

// Disable climbing mode
app.post('/climbing/disable', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.disableClimbingMode();
    res.json({ message: 'Climbing mode disabled' });
  } catch (error) {
    console.error('Error disabling climbing mode:', error);
    res.status(500).json({ error: 'Failed to disable climbing mode' });
  }
});

// Perform diagnostics
app.post('/diagnostics', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    const diagnostics = await hexapodController.performSelfDiagnostics();
    res.json(diagnostics);
  } catch (error) {
    console.error('Error performing diagnostics:', error);
    res.status(500).json({ error: 'Failed to perform diagnostics' });
  }
});

// Emergency stop
app.post('/emergency-stop', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    // Emergency stop is handled internally by safety checks
    // This endpoint can be used to manually trigger it
    res.json({ message: 'Emergency stop signal sent' });
  } catch (error) {
    console.error('Error triggering emergency stop:', error);
    res.status(500).json({ error: 'Failed to trigger emergency stop' });
  }
});

// Reset emergency stop
app.post('/emergency-stop/reset', (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    hexapodController.resetEmergencyStop();
    res.json({ message: 'Emergency stop reset' });
  } catch (error) {
    console.error('Error resetting emergency stop:', error);
    res.status(500).json({ error: 'Failed to reset emergency stop' });
  }
});

// Update locomotion configuration
app.post('/config/locomotion', (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    hexapodController.updateLocomotionConfig(req.body);
    res.json({ message: 'Locomotion configuration updated' });
  } catch (error) {
    console.error('Error updating locomotion config:', error);
    res.status(500).json({ error: 'Failed to update locomotion configuration' });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start the service
async function initializeService() {
  try {
    console.log('Initializing Mobile Hexapod Service...');
    
    // Create mobile hexapod controller
    const robotId = process.env.ROBOT_ID || `mobile-hexapod-${Date.now()}`;
    hexapodController = new MobileHexapodController(robotId, homePosition);

    // Initialize the controller
    const initialized = await hexapodController.initialize();
    
    if (initialized) {
      console.log(`Mobile Hexapod Controller ${robotId} initialized successfully`);
    } else {
      console.error('Failed to initialize mobile hexapod controller');
    }

    // Start HTTP server
    app.listen(port, () => {
      console.log(`Mobile Hexapod Service listening on port ${port}`);
      console.log(`Robot ID: ${robotId}`);
      console.log(`Home Position: ${homePosition.position.x}, ${homePosition.position.y}, ${homePosition.position.z}`);
    });

  } catch (error) {
    console.error('Failed to initialize service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  if (hexapodController) {
    await hexapodController.abortMission();
    await hexapodController.returnToBase();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  if (hexapodController) {
    await hexapodController.abortMission();
    await hexapodController.returnToBase();
  }
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize the service
initializeService();