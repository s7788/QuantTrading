import { Router, Request, Response } from 'express';
import { DataSyncService } from '../services/dataSync.js';
import { logger } from '../utils/logger.js';

export const analyticsRouter = Router();
const syncService = new DataSyncService();

const US_INDEX_SYMBOLS = ['^GSPC', '^IXIC', '^DJI', '^VIX'];
const US_INDEX_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'Dow Jones',
  '^VIX': 'VIX',
};
const US_MOVER_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'AMD'];

const TW_INDEX_SYMBOLS = ['^TWII', '0050.TW', '0051.TW', '0055.TW'];
const TW_INDEX_NAMES: Record<string, string> = {
  '^TWII': '加權指數',
  '0050.TW': '台灣50',
  '0051.TW': '中型100',
  '0055.TW': '電子科技',
};
const TW_MOVER_SYMBOLS = [
  '2330.TW', '2454.TW', '2317.TW', '2308.TW',
  '2382.TW', '2412.TW', '2603.TW', '2886.TW',
  '3008.TW', '2881.TW',
];

// GET /api/analytics/market-overview?market=tw
analyticsRouter.get('/market-overview', async (req: Request, res: Response) => {
  const { market = 'tw' } = req.query;
  const isUS = market === 'us';
  const indexSymbols = isUS ? US_INDEX_SYMBOLS : TW_INDEX_SYMBOLS;
  const moverSymbols = isUS ? US_MOVER_SYMBOLS : TW_MOVER_SYMBOLS;
  const indexNames = isUS ? US_INDEX_NAMES : TW_INDEX_NAMES;

  try {
    const quotes = await syncService.fetchQuotes([...indexSymbols, ...moverSymbols]);

    const indices = indexSymbols
      .map((sym) => {
        const q = quotes.find((r) => r.symbol === sym);
        return {
          symbol: sym,
          name: indexNames[sym] || sym,
          price: q?.regularMarketPrice ?? 0,
          change: q?.regularMarketChange ?? 0,
          changePercent: q?.regularMarketChangePercent ?? 0,
        };
      })
      .filter((i) => i.price > 0);

    const movers = moverSymbols
      .map((sym) => {
        const q = quotes.find((r) => r.symbol === sym);
        const code = sym.replace('.TW', '');
        return {
          symbol: code,
          name: q?.shortName || q?.longName || code,
          price: q?.regularMarketPrice ?? 0,
          change: q?.regularMarketChange ?? 0,
          changePercent: q?.regularMarketChangePercent ?? 0,
          volume: q?.regularMarketVolume ?? 0,
        };
      })
      .filter((m) => m.price > 0);

    const topGainers = [...movers].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const topLosers = [...movers].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

    res.json({ success: true, data: { indices, topGainers, topLosers, sectors: [] }, market });
  } catch (err) {
    logger.error('[analytics] market-overview error', { err });
    res.status(500).json({ success: false, error: String(err) });
  }
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
