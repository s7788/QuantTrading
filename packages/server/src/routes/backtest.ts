import { Router, Request, Response } from 'express';

export const backtestRouter = Router();

// POST /api/backtest/run — start a new backtest
backtestRouter.post('/run', async (req: Request, res: Response) => {
  const config = req.body;
  // TODO: enqueue backtest job, return job ID
  const jobId = `bt_${Date.now()}`;
  res.status(202).json({ success: true, data: { id: jobId, status: 'pending', config } });
});

// GET /api/backtest — list all backtest records
backtestRouter.get('/', async (req: Request, res: Response) => {
  const { market, strategyId } = req.query;
  // TODO: fetch from Firestore
  res.json({ success: true, data: [], filters: { market, strategyId } });
});

// GET /api/backtest/:id — get single result
backtestRouter.get('/:id', async (req: Request, res: Response) => {
  res.json({ success: true, data: null, id: req.params.id });
});

// DELETE /api/backtest/:id
backtestRouter.delete('/:id', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id });
});

// POST /api/backtest/:id/cancel
backtestRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, status: 'cancelled' });
});

// GET /api/backtest/compare?ids=id1,id2,id3
backtestRouter.get('/meta/compare', async (req: Request, res: Response) => {
  const ids = (req.query.ids as string)?.split(',') || [];
  res.json({ success: true, data: [], ids });
});
