import { Router, Request, Response } from 'express';
import { GeminiService } from '../services/geminiService.js';
import { DataSyncService } from '../services/dataSync.js';
import { logger } from '../utils/logger.js';

export const aiRouter = Router();

let gemini: GeminiService | null = null;
const syncService = new DataSyncService();

function getGemini(): GeminiService {
  if (!gemini) gemini = new GeminiService();
  return gemini;
}

// POST /api/ai/analyze-stock
// Body: { symbol: string, market: 'tw' | 'us' }
aiRouter.post('/analyze-stock', async (req: Request, res: Response) => {
  const { symbol, market } = req.body as { symbol?: string; market?: string };
  if (!symbol || !market) {
    return res.status(400).json({ success: false, error: 'symbol and market are required' });
  }

  try {
    const ohlcv = await syncService.getOHLCV(market as 'tw' | 'us', symbol, {
      freq: 'daily',
    });
    const analysis = await getGemini().analyzeStock(symbol, market, ohlcv);
    return res.json({ success: true, data: { analysis } });
  } catch (err) {
    logger.error('[AI] analyze-stock error', { err });
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/ai/strategy-review
// Body: { code: string, description?: string }
aiRouter.post('/strategy-review', async (req: Request, res: Response) => {
  const { code, description = '' } = req.body as { code?: string; description?: string };
  if (!code) {
    return res.status(400).json({ success: false, error: 'code is required' });
  }

  try {
    const review = await getGemini().reviewStrategy(code, description);
    return res.json({ success: true, data: { review } });
  } catch (err) {
    logger.error('[AI] strategy-review error', { err });
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/ai/market-summary
// Body: { market: 'tw' | 'us', topMovers?: { symbol, change }[] }
aiRouter.post('/market-summary', async (req: Request, res: Response) => {
  const { market, topMovers = [] } = req.body as {
    market?: string;
    topMovers?: { symbol: string; change: number }[];
  };
  if (!market) {
    return res.status(400).json({ success: false, error: 'market is required' });
  }

  try {
    const summary = await getGemini().marketSummary(market, topMovers);
    return res.json({ success: true, data: { summary } });
  } catch (err) {
    logger.error('[AI] market-summary error', { err });
    return res.status(500).json({ success: false, error: String(err) });
  }
});
