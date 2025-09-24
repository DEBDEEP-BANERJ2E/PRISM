import { Router } from 'express';
import { dataRoutes } from './data';
import { modelRoutes } from './models';
import { scenarioRoutes } from './scenarios';
import { reportRoutes } from './reports';
import { jobRoutes } from './jobs';
import { tableSyncService } from './TableSyncService'; // Import TableSyncService

const router = Router();

// Mount sub-routes
router.use('/data', dataRoutes);
router.use('/models', modelRoutes);
router.use('/scenarios', scenarioRoutes);
router.use('/reports', reportRoutes);
router.use('/jobs', jobRoutes);

// Expose TableSyncService methods directly for frontend consumption
// This is a simplified approach; a more robust solution might involve
// creating dedicated API routes for each TableSyncService method if needed.
router.get('/datasets/:datasetId', async (req, res, next) => {
  try {
    const data = await tableSyncService.loadTableData(req.params.datasetId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/datasets', async (req, res, next) => {
  try {
    const data = await tableSyncService.listDatasets();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/datasets/:datasetId/rows', async (req, res, next) => {
  try {
    const data = await tableSyncService.addRow(req.params.datasetId, req.body.rowData);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/datasets/:datasetId/rows/:rowId/cells/:columnName', async (req, res, next) => {
  try {
    const data = await tableSyncService.updateCell(req.params.datasetId, req.params.rowId, req.params.columnName, req.body.value);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/datasets/:datasetId/rows/:rowId', async (req, res, next) => {
  try {
    await tableSyncService.deleteRow(req.params.datasetId, req.params.rowId);
    res.json({ success: true, message: 'Row deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/datasets/:datasetId/columns', async (req, res, next) => {
  try {
    const data = await tableSyncService.addColumn(req.params.datasetId, req.body.column);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/datasets/:datasetId/columns/:columnId', async (req, res, next) => {
  try {
    const data = await tableSyncService.updateColumn(req.params.datasetId, req.params.columnId, req.body.updates);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/datasets/:datasetId/columns/:columnId', async (req, res, next) => {
  try {
    await tableSyncService.deleteColumn(req.params.datasetId, req.params.columnId);
    res.json({ success: true, message: 'Column deleted successfully' });
  } catch (error) {
    next(error);
  }
});


export { router as dataScienceRoutes };