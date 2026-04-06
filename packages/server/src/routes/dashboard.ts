import { Router, Request, Response } from 'express';

export const dashboardRouter = Router();

// GET /api/dashboard/summary
dashboardRouter.get('/summary', async (_req: Request, res: Response) => {
  // TODO: aggregate real data from Firestore
  res.json({
    success: true,
    data: {
      totalEquity: 1284560,
      equityChange: 12340,
      equityChangePercent: 0.97,
      todayPnl: 8230,
      todayRealizedPnl: 5100,
      todayUnrealizedPnl: 3130,
      positionCount: 5,
      longCount: 3,
      shortCount: 2,
      activeStrategies: 2,
      totalStrategies: 5,
      todayTrades: 12,
      todayBuys: 8,
      todaySells: 4,
      todayWinRate: 0.667,
    },
  });
});

// GET /api/dashboard/equity-curve?market=tw&period=month
dashboardRouter.get('/equity-curve', async (req: Request, res: Response) => {
  const { period = 'month' } = req.query;
  // TODO: fetch from Firestore
  res.json({ success: true, data: [], period });
});

// GET /api/dashboard/positions?market=tw
dashboardRouter.get('/positions', async (_req: Request, res: Response) => {
  res.json({ success: true, data: [] });
});

// GET /api/dashboard/trades?market=tw&limit=50
dashboardRouter.get('/trades', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ success: true, data: [], limit });
});

// GET /api/dashboard/alerts?unread=true
dashboardRouter.get('/alerts', async (_req: Request, res: Response) => {
  res.json({ success: true, data: [] });
});

// PATCH /api/dashboard/alerts/:id/read
dashboardRouter.patch('/alerts/:id/read', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id });
});
