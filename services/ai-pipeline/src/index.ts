import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Store for tracking jobs (in production, use Redis or database)
const jobs = new Map<string, any>();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ai-pipeline',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Simple data processing endpoint
app.post('/api/process-data', async (req, res) => {
  try {
    const { data, processingType } = req.body;
    
    // Generate a job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store job info
    jobs.set(jobId, {
      id: jobId,
      status: 'processing',
      startTime: new Date(),
      processingType,
      progress: 0
    });

    // Simulate processing
    setTimeout(() => {
      const job = jobs.get(jobId);
      if (job) {
        job.status = 'completed';
        job.progress = 100;
        job.endTime = new Date();
        job.result = {
          processedData: data,
          features: ['feature1', 'feature2', 'feature3'],
          metrics: {
            accuracy: 0.95,
            precision: 0.92,
            recall: 0.88
          }
        };
      }
    }, 2000);

    res.json({
      success: true,
      jobId,
      message: 'Data processing started'
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process data'
    });
  }
});

// Get job status
app.get('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }
  
  res.json({
    success: true,
    job
  });
});

// Simple model training endpoint
app.post('/api/train-model', async (req, res) => {
  try {
    const { dataId, modelConfig } = req.body;
    
    const jobId = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    jobs.set(jobId, {
      id: jobId,
      type: 'training',
      status: 'training',
      startTime: new Date(),
      progress: 0,
      modelConfig
    });

    // Simulate training progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      const job = jobs.get(jobId);
      if (job) {
        job.progress = progress;
        
        if (progress >= 100) {
          clearInterval(interval);
          job.status = 'completed';
          job.endTime = new Date();
          job.modelId = `model_${Date.now()}`;
          job.metrics = {
            accuracy: 0.94,
            loss: 0.12,
            val_accuracy: 0.91,
            val_loss: 0.15
          };
        }
      }
    }, 500);

    res.json({
      success: true,
      jobId,
      message: 'Model training started'
    });
  } catch (error) {
    console.error('Training error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start training'
    });
  }
});

// Simple prediction endpoint
app.post('/api/predict', async (req, res) => {
  try {
    const { modelId, inputData } = req.body;
    
    // Simulate prediction
    const predictions = inputData.map((data: any, index: number) => ({
      id: index,
      prediction: Math.random() > 0.5 ? 'stable' : 'unstable',
      confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
      riskScore: Math.random()
    }));

    res.json({
      success: true,
      predictions,
      modelId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make predictions'
    });
  }
});

// List all jobs
app.get('/api/jobs', (req, res) => {
  const allJobs = Array.from(jobs.values());
  res.json({
    success: true,
    jobs: allJobs
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Pipeline Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 API endpoints: http://localhost:${PORT}/api`);
});

export default app;