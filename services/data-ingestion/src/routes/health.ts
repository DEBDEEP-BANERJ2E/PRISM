import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'data-ingestion',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export { router as healthRouter };