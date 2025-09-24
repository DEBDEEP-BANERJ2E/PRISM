import { Router } from 'express';
import { dataRoutes } from './data';
import { modelRoutes } from './models';
import { scenarioRoutes } from './scenarios';
import reportsRouter from './reports';
import { datasetRoutes } from './datasets'; // Import new dataset routes
import { tablesRoutes } from './tables';

const router = Router();

// Mount route modules
router.use('/data', dataRoutes);
router.use('/models', modelRoutes);
router.use('/scenarios', scenarioRoutes);
router.use('/reports', reportsRouter);
router.use('/datasets', datasetRoutes); // Mount new dataset routes
router.use('/tables', tablesRoutes); // New tables routes

export { router as dataScienceRoutes, datasetRoutes }; // Export datasetRoutes