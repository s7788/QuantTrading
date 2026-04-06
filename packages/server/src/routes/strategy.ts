import { Router, Request, Response } from 'express';

export const strategyRouter = Router();

// GET /api/strategy?market=tw&status=running
strategyRouter.get('/', async (req: Request, res: Response) => {
  const { market, status } = req.query;
  // TODO: fetch from Firestore with filters
  res.json({ success: true, data: [], filters: { market, status } });
});

// GET /api/strategy/:id
strategyRouter.get('/:id', async (req: Request, res: Response) => {
  res.json({ success: true, data: null, id: req.params.id });
});

// POST /api/strategy — create new
strategyRouter.post('/', async (req: Request, res: Response) => {
  // TODO: validate with zod, save to Firestore
  res.status(201).json({ success: true, data: { id: 'new-id', ...req.body } });
});

// PUT /api/strategy/:id — update (auto-creates version)
strategyRouter.put('/:id', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id });
});

// DELETE /api/strategy/:id
strategyRouter.delete('/:id', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id });
});

// POST /api/strategy/:id/start
strategyRouter.post('/:id/start', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, status: 'running' });
});

// POST /api/strategy/:id/pause
strategyRouter.post('/:id/pause', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, status: 'paused' });
});

// POST /api/strategy/:id/stop
strategyRouter.post('/:id/stop', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, status: 'stopped' });
});

// GET /api/strategy/:id/versions
strategyRouter.get('/:id/versions', async (req: Request, res: Response) => {
  res.json({ success: true, data: [], id: req.params.id });
});

// POST /api/strategy/:id/versions/:version/restore
strategyRouter.post('/:id/versions/:version/restore', async (req: Request, res: Response) => {
  res.json({ success: true, id: req.params.id, version: req.params.version });
});

// GET /api/strategy/templates — list built-in templates
strategyRouter.get('/meta/templates', async (_req: Request, res: Response) => {
  const templates = [
    { id: 'ma-crossover', name: '移動平均線交叉', description: '快慢線黃金/死亡交叉策略' },
    { id: 'rsi-reversal', name: 'RSI 超買超賣', description: 'RSI 均值回歸策略' },
    { id: 'bollinger-breakout', name: '布林通道突破', description: '波動率突破策略' },
    { id: 'momentum', name: '動量策略', description: '趨勢動量追蹤' },
    { id: 'pairs-trading', name: '配對交易', description: '統計套利策略' },
    { id: 'blank', name: '空白模板', description: '從頭開始撰寫' },
  ];
  res.json({ success: true, data: templates });
});
