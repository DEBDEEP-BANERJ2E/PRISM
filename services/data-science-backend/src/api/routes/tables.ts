import { Router, Request, Response, NextFunction } from 'express';
import { getAllTableNames, getTableData } from '../../services/supabaseClient';
import { APIResponse } from '../../types';

const router = Router();

// GET /tables - list all public tables
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await getAllTableNames();
    const response: APIResponse = {
      success: true,
      data: tables,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /tables/:tableName - fetch data from a table
router.get('/:tableName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableName } = req.params;
    const data = await getTableData(tableName);
    const response: APIResponse = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as tablesRoutes };