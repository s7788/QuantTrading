import { Router, Request, Response } from 'express';

export const settingsRouter = Router();

// GET /api/settings
settingsRouter.get('/', async (_req: Request, res: Response) => {
  // TODO: fetch from Firestore settings doc
  res.json({
    success: true,
    data: {
      language: 'zh-TW',
      timezone: 'Asia/Taipei',
      theme: 'dark',
      defaultMarket: 'tw',
      dataSyncInterval: 24, // hours
      notifications: { web: true, email: false, line: false, telegram: false },
      chart: { upColor: '#3fb950', downColor: '#f85149' },
    },
  });
});

// PUT /api/settings
settingsRouter.put('/', async (req: Request, res: Response) => {
  // TODO: validate and save to Firestore
  res.json({ success: true, data: req.body });
});

// GET /api/settings/data-sources
settingsRouter.get('/data-sources', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'twse', name: 'TWSE OpenAPI', market: 'tw', status: 'active', description: '台灣證交所官方開放資料' },
      { id: 'finmind', name: 'FinMind', market: 'tw', status: 'active', description: '台股數據 API（社群免費版）' },
      { id: 'yfinance', name: 'Yahoo Finance', market: 'us', status: 'active', description: '美股歷史 / 即時數據' },
    ],
  });
});
