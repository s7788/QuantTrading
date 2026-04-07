import { Router, Request, Response } from 'express';
import { DataSyncService } from '../services/dataSync.js';
import { logger } from '../utils/logger.js';

export const dataRouter = Router();
const syncService = new DataSyncService();

// POST /api/data/sync?market=tw|us  — manual trigger (also called by Cloud Scheduler)
dataRouter.post('/sync', async (req: Request, res: Response) => {
  const market = (req.query.market as string) || 'tw';
  if (!['tw', 'us'].includes(market)) {
    return res.status(400).json({ success: false, error: 'market must be tw or us' });
  }
  logger.info(`Data sync triggered for market: ${market}`);
  // Fire-and-forget; send status via WebSocket
  syncService.sync(market as 'tw' | 'us').catch((err) =>
    logger.error('Sync failed', { market, err })
  );
  return res.json({ success: true, message: `Sync started for ${market}` });
});

// GET /api/data/status — returns last sync time and status for each market
dataRouter.get('/status', async (_req: Request, res: Response) => {
  const status = await syncService.getStatus();
  res.json({ success: true, data: status });
});

// GET /api/data/ohlcv/:market/:symbol?from=&to=&freq=daily
dataRouter.get('/ohlcv/:market/:symbol', async (req: Request, res: Response) => {
  const { market, symbol } = req.params;
  if (!['tw', 'us'].includes(market)) {
    return res.status(400).json({ success: false, error: 'market must be tw or us' });
  }
  const { from, to, freq = 'daily' } = req.query;
  try {
    const data = await syncService.getOHLCV(market as 'tw' | 'us', symbol, {
      from: from as string,
      to: to as string,
      freq: freq as string,
    });
    return res.json({ success: true, data });
  } catch (err) {
    logger.error('OHLCV fetch failed', { market, symbol, err });
    return res.status(502).json({ success: false, error: String(err) });
  }
});

// GET /api/data/symbols/:market — list available symbols
dataRouter.get('/symbols/:market', async (req: Request, res: Response) => {
  const { market } = req.params;
  const symbols = await syncService.getSymbols(market as 'tw' | 'us');
  res.json({ success: true, data: symbols });
});
