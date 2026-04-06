import { Router, Request, Response } from 'express';

export const analyticsRouter = Router();

// GET /api/analytics/market-overview?market=tw
analyticsRouter.get('/market-overview', async (req: Request, res: Response) => {
  const { market = 'tw' } = req.query;
  // TODO: fetch indices, top movers, sector heatmap
  res.json({ success: true, data: { indices: [], topGainers: [], topLosers: [], sectors: [] }, market });
});

// GET /api/analytics/symbol/:market/:code — OHLCV + stats for a symbol
analyticsRouter.get('/symbol/:market/:code', async (req: Request, res: Response) => {
  const { market, code } = req.params;
  res.json({ success: true, data: null, market, code });
});

// POST /api/analytics/screener — run screener with conditions
analyticsRouter.post('/screener', async (req: Request, res: Response) => {
  const { market, conditions } = req.body;
  // TODO: apply conditions to Firestore dataset
  res.json({ success: true, data: [], market, conditions });
});

// GET /api/analytics/screener/saved — list saved screeners
analyticsRouter.get('/screener/saved', async (_req: Request, res: Response) => {
  res.json({ success: true, data: [] });
});

// POST /api/analytics/screener/saved — save a screener
analyticsRouter.post('/screener/saved', async (req: Request, res: Response) => {
  res.status(201).json({ success: true, data: { id: `sc_${Date.now()}`, ...req.body } });
});

// GET /api/analytics/boards — list custom boards
analyticsRouter.get('/boards', async (_req: Request, res: Response) => {
  res.json({ success: true, data: [] });
});

// POST /api/analytics/boards
analyticsRouter.post('/boards', async (req: Request, res: Response) => {
  res.status(201).json({ success: true, data: { id: `board_${Date.now()}`, ...req.body } });
});

// PUT /api/analytics/boards/:id
analyticsRouter.put('/boards/:id', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id });
});

// DELETE /api/analytics/boards/:id
analyticsRouter.delete('/boards/:id', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id });
});
