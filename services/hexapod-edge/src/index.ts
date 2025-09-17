import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { HexapodController } from './services/HexapodController';
import { PowerManagementConfig, LoRaWANConfig, CompressionConfig } from './types';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Global hexapod controller instance
let hexapodController: HexapodController | null = null;

// Configuration
const powerConfig: PowerManagementConfig = {
  sleepDuration: parseInt(process.env.SLEEP_DURATION || '900'), // 15 minutes
  samplingInterval: parseInt(process.env.SAMPLING_INTERVAL || '60'), // 1 minute
  transmissionInterval: parseInt(process.env.TRANSMISSION_INTERVAL || '1800'), // 30 minutes
  lowPowerThreshold: parseInt(process.env.LOW_POWER_THRESHOLD || '30'),
  criticalPowerThreshold: parseInt(process.env.CRITICAL_POWER_THRESHOLD || '10')
};

const loraConfig: LoRaWANConfig = {
  devEUI: process.env.LORA_DEV_EUI || '0000000000000000',
  appEUI: process.env.LORA_APP_EUI || '0000000000000000',
  appKey: process.env.LORA_APP_KEY || '00000000000000000000000000000000',
  dataRate: parseInt(process.env.LORA_DATA_RATE || '5'),
  txPower: parseInt(process.env.LORA_TX_POWER || '14'),
  adaptiveDataRate: process.env.LORA_ADR === 'true',
  confirmUplinks: process.env.LORA_CONFIRM_UPLINKS === 'true'
};

const compressionConfig: CompressionConfig = {
  algorithm: (process.env.COMPRESSION_ALGORITHM as 'lz4' | 'zlib' | 'delta') || 'delta',
  compressionLevel: parseInt(process.env.COMPRESSION_LEVEL || '6'),
  batchSize: parseInt(process.env.COMPRESSION_BATCH_SIZE || '10'),
  maxBufferSize: parseInt(process.env.COMPRESSION_MAX_BUFFER_SIZE || '1000')
};

const location = {
  latitude: parseFloat(process.env.LATITUDE || '-23.5505'),
  longitude: parseFloat(process.env.LONGITUDE || '-46.6333'),
  elevation: parseFloat(process.env.ELEVATION || '760.0')
};

// Health check endpoint
app.get('/health', (req, res) => {
  const status = hexapodController ? hexapodController.getHexapodStatus() : null;
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hexapod: status ? {
      podId: status.podId,
      operationalStatus: status.operationalStatus,
      batteryLevel: status.powerStatus.batteryLevel,
      signalStrength: status.communicationStatus.loraSignalStrength,
      lastCommunication: new Date(status.lastCommunication).toISOString()
    } : null
  });
});

// Get hexapod status
app.get('/status', (req, res) => {
  if (!hexapodController) {
    return res.status(503).json({ error: 'Hexapod controller not initialized' });
  }

  const status = hexapodController.getHexapodStatus();
  res.json(status);
});

// Start hexapod operation
app.post('/start', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.start();
    res.json({ message: 'Hexapod started successfully' });
  } catch (error) {
    console.error('Error starting hexapod:', error);
    res.status(500).json({ error: 'Failed to start hexapod' });
  }
});

// Stop hexapod operation
app.post('/stop', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.stop();
    res.json({ message: 'Hexapod stopped successfully' });
  } catch (error) {
    console.error('Error stopping hexapod:', error);
    res.status(500).json({ error: 'Failed to stop hexapod' });
  }
});

// Update configuration
app.post('/config', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    const result = await hexapodController.updateConfiguration(req.body);
    
    if (result) {
      res.json({ message: 'Configuration updated successfully' });
    } else {
      res.status(400).json({ error: 'Failed to update configuration' });
    }
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Perform diagnostics
app.post('/diagnostics', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    const diagnostics = await hexapodController.performRemoteDiagnostics();
    res.json(diagnostics);
  } catch (error) {
    console.error('Error performing diagnostics:', error);
    res.status(500).json({ error: 'Failed to perform diagnostics' });
  }
});

// Calibrate sensors
app.post('/calibrate', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    const result = await hexapodController.calibrateSensors(req.body);
    
    if (result) {
      res.json({ message: 'Sensors calibrated successfully' });
    } else {
      res.status(400).json({ error: 'Failed to calibrate sensors' });
    }
  } catch (error) {
    console.error('Error calibrating sensors:', error);
    res.status(500).json({ error: 'Failed to calibrate sensors' });
  }
});

// Enter maintenance mode
app.post('/maintenance/enter', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.enterMaintenanceMode();
    res.json({ message: 'Entered maintenance mode' });
  } catch (error) {
    console.error('Error entering maintenance mode:', error);
    res.status(500).json({ error: 'Failed to enter maintenance mode' });
  }
});

// Exit maintenance mode
app.post('/maintenance/exit', async (req, res) => {
  try {
    if (!hexapodController) {
      return res.status(503).json({ error: 'Hexapod controller not initialized' });
    }

    await hexapodController.exitMaintenanceMode();
    res.json({ message: 'Exited maintenance mode' });
  } catch (error) {
    console.error('Error exiting maintenance mode:', error);
    res.status(500).json({ error: 'Failed to exit maintenance mode' });
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
    console.log('Initializing Hexapod Edge Service...');
    
    // Create hexapod controller
    const podId = process.env.POD_ID || `hexapod-${Date.now()}`;
    hexapodController = new HexapodController(
      podId,
      location,
      powerConfig,
      loraConfig,
      compressionConfig
    );

    // Initialize the controller
    const initialized = await hexapodController.initialize();
    
    if (initialized) {
      console.log(`Hexapod controller ${podId} initialized successfully`);
      
      // Auto-start if configured
      if (process.env.AUTO_START === 'true') {
        await hexapodController.start();
        console.log('Hexapod started automatically');
      }
    } else {
      console.error('Failed to initialize hexapod controller');
    }

    // Start HTTP server
    app.listen(port, () => {
      console.log(`Hexapod Edge Service listening on port ${port}`);
      console.log(`Pod ID: ${podId}`);
      console.log(`Location: ${location.latitude}, ${location.longitude}, ${location.elevation}m`);
      console.log(`Power Management: Sleep=${powerConfig.sleepDuration}s, Sample=${powerConfig.samplingInterval}s, TX=${powerConfig.transmissionInterval}s`);
      console.log(`LoRaWAN: DR=${loraConfig.dataRate}, Power=${loraConfig.txPower}dBm, ADR=${loraConfig.adaptiveDataRate}`);
      console.log(`Compression: ${compressionConfig.algorithm}, Level=${compressionConfig.compressionLevel}, Batch=${compressionConfig.batchSize}`);
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
    await hexapodController.stop();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  if (hexapodController) {
    await hexapodController.stop();
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