import { Router, Request, Response } from 'express';
import { DataSyncService } from '../services/dataSync.js';
import { logger } from '../utils/logger.js';

export const analyticsRouter = Router();
const syncService = new DataSyncService();

// GET /api/analytics/market-overview?market=tw
analyticsRouter.get('/market-overview', async (req: Request, res: Response) => {
  const { market = 'tw' } = req.query;
  // TODO: fetch indices, top movers, sector heatmap
  res.json({ success: true, data: { indices: [], topGainers: [], topLosers: [], sectors: [] }, market });
});

// GET /api/analytics/symbol/:market/:code?from=&to=&freq=daily — OHLCV + stats for a symbol
analyticsRouter.get('/symbol/:market/:code', async (req: Request, res: Response) => {
  const { market, code } = req.params;
  if (!['tw', 'us'].includes(market)) {
    return res.status(400).json({ success: false, error: 'market must be tw or us' });
  }
  const { from, to, freq = 'daily' } = req.query;
  try {
    const ohlcv = await syncService.getOHLCV(market as 'tw' | 'us', code, {
      from: from as string,
      to: to as string,
      freq: freq as string,
    });

    // Compute basic stats from last bar
    const last = ohlcv[ohlcv.length - 1];
    const prev = ohlcv[ohlcv.length - 2];
    const change = last && prev ? +(last.close - prev.close).toFixed(4) : 0;
    const changePercent = last && prev ? +((change / prev.close) * 100).toFixed(2) : 0;

    return res.json({
      success: true,
      data: {
        ohlcv,
        quote: last
          ? { price: last.close, change, changePercent, volume: last.volume, date: last.date }
          : null,
      },
      market,
      code,
    });
  } catch (err) {
    logger.error('Symbol analytics fetch failed', { market, code, err });
    return res.status(502).json({ success: false, error: String(err) });
  }
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
