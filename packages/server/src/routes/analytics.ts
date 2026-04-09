import { Router, Request, Response } from 'express';
import { DataSyncService } from '../services/dataSync.js';
import { logger } from '../utils/logger.js';

export const analyticsRouter = Router();
const syncService = new DataSyncService();

// 5-minute cache for market-overview to avoid hammering Yahoo Finance
const overviewCache = new Map<string, { data: unknown; expiresAt: number }>();
const OVERVIEW_TTL_MS = 5 * 60 * 1000;

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

  // Serve from cache if still fresh
  const cacheKey = String(market);
  const cached = overviewCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return res.json({ success: true, data: cached.data, market, cached: true });
  }

  try {
    // Fetch quotes; on failure return empty arrays so the page still loads
    let quotes: Awaited<ReturnType<typeof syncService.fetchQuotes>> = [];
    try {
      quotes = await syncService.fetchQuotes([...indexSymbols, ...moverSymbols]);
    } catch (quoteErr) {
      logger.warn('[analytics] fetchQuotes failed, returning empty market data', { quoteErr });
    }

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
    const topLosers  = [...movers].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

    const partial = quotes.length === 0;
    const responseData = { indices, topGainers, topLosers, sectors: [] };
    overviewCache.set(cacheKey, { data: responseData, expiresAt: Date.now() + OVERVIEW_TTL_MS });
    return res.json({
      success: true,
      data: responseData,
      market,
      ...(partial && { warning: 'Market quote service temporarily unavailable' }),
    });
  } catch (err) {
    logger.error('[analytics] market-overview error', { err });
    // Return stale cache if available rather than 500
    const stale = overviewCache.get(cacheKey);
    if (stale) {
      return res.json({ success: true, data: stale.data, market, stale: true });
    }
    return res.status(500).json({ success: false, error: String(err) });
  }
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
