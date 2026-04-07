import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ReferenceLine,
} from 'recharts';
import { Eye, Trophy, Play, Pause, Activity } from 'lucide-react';
import {
  StatCard, SectionCard, DataTable, PnlText, Badge, PageHeader,
} from '@/components/common';
import type { Column } from '@/components/common/DataTable';

// ── Types ─────────────────────────────────────────────────────
interface StrategyMeta {
  id: string;
  name: string;
  type: string;
  market: 'tw' | 'us';
  status: 'running' | 'paused' | 'stopped' | 'draft';
  color: string;
  totalReturn: number;
  annualized: number;
  maxDD: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  winRate: number;
  trades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  todayPnl: number;
  todayPct: number;
  nav: number;
}

// ── Mock Data ──────────────────────────────────────────────────
const STRATEGIES: StrategyMeta[] = [
  {
    id: 's1', name: 'TW動量策略', type: '動量', market: 'tw', status: 'running', color: '#58a6ff',
    totalReturn: 28.5, annualized: 18.2, maxDD: -12.3,
    sharpe: 1.45, sortino: 1.82, calmar: 1.48,
    winRate: 65.2, trades: 196, avgWin: 2.1, avgLoss: -1.3, profitFactor: 1.72,
    todayPnl: 8230, todayPct: 0.82, nav: 128_500,
  },
  {
    id: 's2', name: 'US Momentum', type: 'Momentum', market: 'us', status: 'running', color: '#3fb950',
    totalReturn: 41.8, annualized: 26.4, maxDD: -8.9,
    sharpe: 1.82, sortino: 2.31, calmar: 2.97,
    winRate: 70.1, trades: 143, avgWin: 2.8, avgLoss: -1.4, profitFactor: 2.08,
    todayPnl: 1570, todayPct: 0.55, nav: 141_800,
  },
  {
    id: 's3', name: '均值回歸', type: '均值回歸', market: 'tw', status: 'paused', color: '#d29922',
    totalReturn: -4.2, annualized: -2.8, maxDD: -21.7,
    sharpe: 0.31, sortino: 0.28, calmar: 0.13,
    winRate: 44.5, trades: 84, avgWin: 1.5, avgLoss: -2.3, profitFactor: 0.61,
    todayPnl: -340, todayPct: -0.30, nav: 95_800,
  },
  {
    id: 's5', name: 'Bollinger US', type: '突破', market: 'us', status: 'stopped', color: '#a371f7',
    totalReturn: 12.1, annualized: 7.8, maxDD: -16.4,
    sharpe: 0.95, sortino: 1.02, calmar: 0.48,
    winRate: 58.2, trades: 421, avgWin: 1.2, avgLoss: -1.1, profitFactor: 1.27,
    todayPnl: 0, todayPct: 0, nav: 112_100,
  },
];

const BENCHMARK_COLOR = '#f0883e';

// ── Derived chart data ─────────────────────────────────────────
const genCumReturn = (totalReturn: number, seed: number, len = 120) =>
  Array.from({ length: len }, (_, i) => {
    const progress = i / (len - 1);
    const noise = Math.sin(i * 0.25 + seed) * 4 + Math.sin(i * 0.07 + seed * 2) * 7;
    return Math.round((totalReturn * progress + noise * (1 - progress * 0.3)) * 100) / 100;
  });

const equityData = (() => {
  const sets = STRATEGIES.map((s) => genCumReturn(s.totalReturn, s.id.charCodeAt(1)));
  const bm = genCumReturn(14.2, 99);
  return Array.from({ length: 120 }, (_, i) => ({
    day: `D${i + 1}`,
    ...Object.fromEntries(STRATEGIES.map((s, si) => [s.id, sets[si][i]])),
    bm: bm[i],
  }));
})();

const YEARS = ['2023', '2024', '2025', '2026'];
const annualData = YEARS.map((y, yi) => ({
  year: y,
  ...Object.fromEntries(STRATEGIES.map((s) => [
    s.id, parseFloat((Math.sin(yi * 1.2 + s.id.charCodeAt(1)) * 10 + s.annualized * 0.8).toFixed(1)),
  ])),
  bm: parseFloat((Math.sin(yi * 0.9) * 5 + 8.5).toFixed(1)),
}));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthlyVal = (s: StrategyMeta, mi: number) =>
  parseFloat((Math.sin(mi * 0.55 + s.id.charCodeAt(1) * 0.3) * 3.5 + s.annualized / 12).toFixed(1));

const RADAR_METRICS = ['Sharpe', 'Sortino', 'Calmar', '勝率', '盈虧比', '年化報酬'];
const normalize = (val: number, min: number, max: number) =>
  Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

const radarData = RADAR_METRICS.map((metric, mi) => {
  const mins = [0,   0,   0,   40,  0.5, -5 ];
  const maxs = [2.5, 3,   3.5, 80,  2.5, 35 ];
  const vals  = (s: StrategyMeta) =>
    [s.sharpe, s.sortino, s.calmar, s.winRate, s.profitFactor, s.annualized][mi];
  return {
    metric,
    ...Object.fromEntries(
      STRATEGIES.map((s) => [s.id, Math.round(normalize(vals(s), mins[mi], maxs[mi]))])
    ),
  };
});

// ── Status config ──────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; variant: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }> = {
  running: { label: '運行中', variant: 'green' },
  paused:  { label: '暫停',   variant: 'yellow' },
  stopped: { label: '已停止', variant: 'red' },
  draft:   { label: '草稿',   variant: 'gray' },
};

// ─────────────────────────────────────────────────────────────
export default function StrategyComparePage() {
  const navigate = useNavigate();
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(STRATEGIES.filter((s) => s.status !== 'stopped').map((s) => s.id)),
  );
  const [sortKey, setSortKey] = useState<keyof StrategyMeta>('totalReturn');

  const selected = STRATEGIES.filter((s) => selectedIds.has(s.id));
  const sorted   = [...STRATEGIES].sort((a, b) =>
    (b[sortKey] as number) - (a[sortKey] as number));

  const totalNav      = STRATEGIES.reduce((s, x) => s + x.nav, 0);
  const totalPnlToday = STRATEGIES.reduce((s, x) => s + x.todayPnl, 0);
  const running       = STRATEGIES.filter((s) => s.status === 'running');
  const best          = [...STRATEGIES].sort((a, b) => b.totalReturn - a.totalReturn)[0];

  const toggleStrategy = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const metricCols: Column<StrategyMeta>[] = [
    {
      key: 'name', header: '策略',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{r.name}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-2)' }}>
              {r.type} · {r.market === 'tw' ? '台股' : '美股'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status', header: '狀態',
      render: (r) => <Badge variant={STATUS_CFG[r.status].variant}>{STATUS_CFG[r.status].label}</Badge>,
    },
    {
      key: 'nav', header: '淨值', align: 'right',
      render: (r) => (
        <span className="num text-xs">
          {r.market === 'tw' ? 'NT$' : '$'}{(r.nav / 1000).toFixed(1)}K
        </span>
      ),
    },
    {
      key: 'totalReturn', header: '總報酬', align: 'right', sortable: true,
      render: (r) => <PnlText value={r.totalReturn} suffix="%" className="font-semibold" />,
    },
    {
      key: 'annualized', header: '年化報酬', align: 'right', sortable: true,
      render: (r) => <PnlText value={r.annualized} suffix="%" />,
    },
    {
      key: 'maxDD', header: '最大回撤', align: 'right', sortable: true,
      render: (r) => <PnlText value={r.maxDD} suffix="%" />,
    },
    {
      key: 'sharpe', header: 'Sharpe', align: 'right', sortable: true,
      render: (r) => (
        <span className="num font-medium" style={{
          color: r.sharpe >= 1.5 ? '#3fb950' : r.sharpe >= 1 ? '#d29922' : '#f85149',
        }}>
          {r.sharpe.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'sortino', header: 'Sortino', align: 'right',
      render: (r) => <span className="num text-xs">{r.sortino.toFixed(2)}</span>,
    },
    {
      key: 'winRate', header: '勝率', align: 'right',
      render: (r) => <span className="num">{r.winRate}%</span>,
    },
    {
      key: 'profitFactor', header: '盈虧比', align: 'right',
      render: (r) => (
        <span className="num text-xs" style={{
          color: r.profitFactor >= 1.5 ? '#3fb950' : r.profitFactor >= 1 ? 'var(--color-text)' : '#f85149',
        }}>
          {r.profitFactor.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'trades', header: '交易次數', align: 'right',
      render: (r) => <span className="num text-xs">{r.trades}</span>,
    },
    {
      key: 'id', header: '',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/strategy/monitor/${r.id}`); }}
          title="查看監控"
          style={{ background: 'none', border: 'none', color: 'var(--color-text-2)', cursor: 'pointer', padding: 4 }}>
          <Eye size={13} />
        </button>
      ),
    },
  ];

  const maxDD = Math.max(...STRATEGIES.map((s) => Math.abs(s.maxDD)));

  return (
    <div className="flex flex-col gap-4">

      {/* ── Page header ──────────────────────────────────────── */}
      <PageHeader
        title="策略總覽比較"
        subtitle={`${STRATEGIES.length} 個策略 · ${running.length} 個運行中`}
        actions={
          <button
            onClick={() => navigate('/strategy')}
            className="text-xs px-3 py-1.5 rounded"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-2)',
                     background: 'transparent', cursor: 'pointer' }}>
            管理策略
          </button>
        }
      />

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="策略總數" value={STRATEGIES.length}
          sub={`${running.length} 運行 · ${STRATEGIES.filter((s) => s.status === 'paused').length} 暫停`} />
        <StatCard
          label="合計淨值"
          value={`NT$${(totalNav / 10000).toFixed(1)}萬`}
          sub={`今日 ${totalPnlToday >= 0 ? '+' : ''}NT$${totalPnlToday.toLocaleString()}`}
          trend={totalPnlToday >= 0 ? 'up' : 'down'} />
        <StatCard
          label="最佳策略" value={best.name}
          sub={`總報酬 +${best.totalReturn}%`} trend="up"
          icon={<Trophy size={14} />}
          onClick={() => navigate(`/strategy/monitor/${best.id}`)} />
        <StatCard
          label="平均 Sharpe"
          value={(STRATEGIES.reduce((s, x) => s + x.sharpe, 0) / STRATEGIES.length).toFixed(2)}
          sub="風險調整報酬" />
        <StatCard
          label="合計交易次數"
          value={STRATEGIES.reduce((s, x) => s + x.trades, 0).toLocaleString()}
          sub="所有策略累計" />
      </div>

      {/* ── Strategy selector chips ───────────────────────────── */}
      <SectionCard>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>顯示策略：</span>
          {STRATEGIES.map((s) => {
            const active = selectedIds.has(s.id);
            return (
              <button key={s.id} onClick={() => toggleStrategy(s.id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all"
                      style={{
                        background: active ? `${s.color}22` : 'var(--color-bg)',
                        border: `1px solid ${active ? s.color : 'var(--color-border)'}`,
                        color: active ? s.color : 'var(--color-text-2)',
                        cursor: 'pointer',
                      }}>
                <span className="w-2 h-2 rounded-full"
                      style={{ background: active ? s.color : 'var(--color-border)' }} />
                {s.name}
                <span className="inline-flex items-center px-1.5 py-0 rounded-full text-xs font-medium"
                      style={{
                        background: active ? `${s.color}33` : 'var(--color-hover)',
                        color: active ? s.color : 'var(--color-text-2)',
                        fontSize: 9,
                      }}>
                  {STATUS_CFG[s.status].label}
                </span>
              </button>
            );
          })}
          <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />
          <button onClick={() => setShowBenchmark(!showBenchmark)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all"
                  style={{
                    background: showBenchmark ? `${BENCHMARK_COLOR}22` : 'var(--color-bg)',
                    border: `1px solid ${showBenchmark ? BENCHMARK_COLOR : 'var(--color-border)'}`,
                    color: showBenchmark ? BENCHMARK_COLOR : 'var(--color-text-2)',
                    cursor: 'pointer',
                  }}>
            <span className="w-2 h-2 rounded-full"
                  style={{ background: showBenchmark ? BENCHMARK_COLOR : 'var(--color-border)' }} />
            基準指數
          </button>
        </div>
      </SectionCard>

      {/* ── Cumulative returns + Annual returns ───────────────── */}
      <div className="flex gap-4">
        <SectionCard title="累積報酬率 (%)" style={{ flex: 3 }}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={equityData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-text-2)" tick={{ fontSize: 10 }} interval={23} />
              <YAxis stroke="var(--color-text-2)" tick={{ fontSize: 10 }} width={44}
                     tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`} />
              <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="2 2" />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11 }}
                formatter={(v: number, name: string) => [
                  `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
                  name === 'bm' ? '基準指數' : STRATEGIES.find((s) => s.id === name)?.name ?? name,
                ]} />
              <Legend formatter={(val) =>
                val === 'bm' ? '基準指數' : STRATEGIES.find((s) => s.id === val)?.name ?? val} />
              {selected.map((s) => (
                <Line key={s.id} type="monotone" dataKey={s.id}
                      stroke={s.color} strokeWidth={2} dot={false} />
              ))}
              {showBenchmark && (
                <Line type="monotone" dataKey="bm"
                      stroke={BENCHMARK_COLOR} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="各年度報酬率比較" style={{ flex: 2 }}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={annualData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" stroke="var(--color-text-2)" tick={{ fontSize: 10 }} />
              <YAxis stroke="var(--color-text-2)" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} width={36} />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11 }}
                formatter={(v: number, name: string) => [
                  `${v >= 0 ? '+' : ''}${v}%`,
                  name === 'bm' ? '基準指數' : STRATEGIES.find((s) => s.id === name)?.name ?? name,
                ]} />
              <Legend formatter={(val) =>
                val === 'bm' ? '基準指數' : STRATEGIES.find((s) => s.id === val)?.name ?? val} />
              {selected.map((s) => (
                <Bar key={s.id} dataKey={s.id} fill={s.color} radius={[2, 2, 0, 0]} />
              ))}
              {showBenchmark && (
                <Bar dataKey="bm" fill={BENCHMARK_COLOR} radius={[2, 2, 0, 0]} opacity={0.7} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── Risk radar + Drawdown + Scatter ───────────────────── */}
      <div className="flex gap-4">

        {/* Multi-metric radar */}
        <SectionCard title="多維度風險指標雷達" style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--color-text-2)' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} stroke="var(--color-border)" />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 11 }}
                formatter={(v: number, name: string) => [
                  `${v} 分`,
                  STRATEGIES.find((s) => s.id === name)?.name ?? name,
                ]} />
              {selected.map((s) => (
                <Radar key={s.id} name={s.id} dataKey={s.id}
                       stroke={s.color} fill={s.color} fillOpacity={0.12} strokeWidth={1.5} />
              ))}
              <Legend formatter={(val) => STRATEGIES.find((s) => s.id === val)?.name ?? val} />
            </RadarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Max drawdown bars */}
        <SectionCard title="最大回撤 / 風險評分" style={{ flex: 1 }}>
          <div className="flex flex-col gap-4 mt-1">
            {[...STRATEGIES].sort((a, b) => Math.abs(a.maxDD) - Math.abs(b.maxDD)).map((s) => {
              const pct = Math.abs(s.maxDD);
              return (
                <div key={s.id} style={{ opacity: selectedIds.has(s.id) ? 1 : 0.35 }}>
                  <div className="flex justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{s.name}</span>
                    </div>
                    <span className="text-xs num font-semibold" style={{ color: '#f85149' }}>
                      -{pct}%
                    </span>
                  </div>
                  <div className="rounded-full overflow-hidden"
                       style={{ height: 6, background: 'var(--color-bg)' }}>
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${(pct / maxDD) * 100}%`, background: s.color, opacity: 0.8 }} />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs" style={{ color: 'var(--color-text-2)' }}>
                    <span>Calmar: <strong style={{ color: s.calmar >= 1 ? '#3fb950' : '#d29922' }}>{s.calmar.toFixed(2)}</strong></span>
                    <span>Sharpe: <strong style={{ color: s.sharpe >= 1 ? '#3fb950' : '#d29922' }}>{s.sharpe.toFixed(2)}</strong></span>
                    <span>Sortino: <strong style={{ color: s.sortino >= 1 ? '#3fb950' : '#d29922' }}>{s.sortino.toFixed(2)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Win rate vs profit factor scatter */}
        <SectionCard title="勝率 vs 盈虧比" style={{ flex: 1 }}>
          <div className="relative" style={{ height: 220 }}>
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              {/* Quadrant lines */}
              <line x1="50%" y1="4%" x2="50%" y2="96%" stroke="var(--color-border)" strokeDasharray="3 3" />
              <line x1="6%" y1="50%" x2="94%" y2="50%" stroke="var(--color-border)" strokeDasharray="3 3" />
              {/* Axis labels */}
              <text x="52%" y="14" fontSize="9" fill="var(--color-text-2)">高盈虧比</text>
              <text x="52%" y="216" fontSize="9" fill="var(--color-text-2)">低盈虧比</text>
              <text x="2%" y="50%" dominantBaseline="middle" fontSize="9" fill="var(--color-text-2)">低勝率</text>
              <text x="76%" y="50%" dominantBaseline="middle" fontSize="9" fill="var(--color-text-2)">高勝率</text>
              {/* Best quadrant highlight */}
              <rect x="50%" y="4%" width="44%" height="46%" fill="#3fb95008" rx="4" />
            </svg>
            {STRATEGIES.map((s) => {
              const xPct = ((s.winRate - 40) / 40) * 88 + 6;
              const yPct = 100 - ((s.profitFactor - 0.5) / 2) * 88 - 6;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/strategy/monitor/${s.id}`)}
                  title={`${s.name}: 勝率 ${s.winRate}%, 盈虧比 ${s.profitFactor}`}
                  style={{
                    position: 'absolute',
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: selectedIds.has(s.id) ? 1 : 0.25,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center"
                       style={{ background: s.color, boxShadow: `0 0 0 3px ${s.color}33` }} />
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap font-medium"
                       style={{ color: s.color }}>{s.name}</div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {STRATEGIES.map((s) => (
              <div key={s.id} className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span style={{ color: 'var(--color-text-2)' }}>{s.winRate}% / {s.profitFactor.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Monthly returns heatmap ───────────────────────────── */}
      <SectionCard title="月報酬率熱力圖 (%)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left pb-2 pr-4 font-medium"
                    style={{ color: 'var(--color-text-2)', minWidth: 110 }}>策略</th>
                {MONTHS.map((m) => (
                  <th key={m} className="text-center pb-2 font-medium num"
                      style={{ color: 'var(--color-text-2)', minWidth: 46 }}>{m}</th>
                ))}
                <th className="text-right pb-2 pl-2 font-medium"
                    style={{ color: 'var(--color-text-2)', minWidth: 64 }}>全年累計</th>
              </tr>
            </thead>
            <tbody>
              {STRATEGIES.map((s) => (
                <tr key={s.id} style={{ opacity: selectedIds.has(s.id) ? 1 : 0.3 }}>
                  <td className="pr-4 py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span style={{ color: 'var(--color-text)' }}>{s.name}</span>
                    </div>
                  </td>
                  {MONTHS.map((_, mi) => {
                    const val = monthlyVal(s, mi);
                    const intensity = Math.min(Math.abs(val) / 5, 1);
                    const bg = val > 0
                      ? `rgba(63, 185, 80, ${0.1 + intensity * 0.65})`
                      : `rgba(248, 81, 73, ${0.1 + intensity * 0.65})`;
                    return (
                      <td key={mi} className="text-center py-1 px-0.5">
                        <div className="rounded num font-medium"
                             style={{ background: bg, color: 'var(--color-text)', padding: '3px 2px' }}>
                          {val > 0 ? '+' : ''}{val}
                        </div>
                      </td>
                    );
                  })}
                  <td className="text-right pl-2 py-1">
                    <PnlText value={s.totalReturn} suffix="%" className="font-semibold text-xs" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── Detailed metrics table ────────────────────────────── */}
      <SectionCard
        title="完整績效指標"
        actions={
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-2)' }}>
            <span>排序：</span>
            {(
              [
                ['totalReturn', '總報酬'],
                ['sharpe',      'Sharpe'],
                ['maxDD',       '回撤'],
                ['winRate',     '勝率'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} onClick={() => setSortKey(k)}
                      className="px-2 py-0.5 rounded"
                      style={{
                        background: sortKey === k ? '#58a6ff22' : 'transparent',
                        color: sortKey === k ? '#58a6ff' : 'var(--color-text-2)',
                        border: 'none', cursor: 'pointer',
                      }}>
                {label}
              </button>
            ))}
          </div>
        }>
        <DataTable
          columns={metricCols}
          data={sorted}
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate(`/strategy/monitor/${r.id}`)}
          emptyText="無策略資料" />
      </SectionCard>
    </div>
  );
}
