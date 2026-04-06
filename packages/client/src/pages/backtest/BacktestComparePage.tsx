import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from 'recharts';
import { ArrowLeft, Plus, X, Download } from 'lucide-react';
import { SectionCard, DataTable, PnlText, Badge } from '@/components/common';
import type { Column } from '@/components/common/DataTable';

interface BtSummary {
  id: string; name: string; strategy: string;
  totalReturn: number; annualized: number; maxDD: number;
  sharpe: number; winRate: number; trades: number;
  color: string;
}

const BACKTESTS: BtSummary[] = [
  { id:'bt1', name:'TW動量策略 2024-25', strategy:'TW動量策略',
    totalReturn:28.5, annualized:18.2, maxDD:-12.3, sharpe:1.45, winRate:65.2, trades:196, color:'#58a6ff' },
  { id:'bt3', name:'US Momentum 2024-25', strategy:'US Momentum',
    totalReturn:41.8, annualized:26.4, maxDD:-8.9, sharpe:1.82, winRate:70.1, trades:143, color:'#3fb950' },
  { id:'bt2', name:'均值回歸 2023-24', strategy:'均值回歸',
    totalReturn:-4.2, annualized:-2.8, maxDD:-21.7, sharpe:0.31, winRate:44.5, trades:84, color:'#f85149' },
];

const BENCHMARK = { totalReturn:14.2, annualized:8.9, maxDD:-18.5, sharpe:0.72, winRate:0, trades:0, color:'#d29922' };

// Generate equity curves for each backtest
const genEquity = (totalReturn: number, seed: number) =>
  Array.from({ length: 100 }, (_, i) => {
    const base = 100 + (totalReturn * i / 99);
    const noise = Math.sin(i * 0.3 + seed) * 5;
    return { day: `D${i+1}`, value: Math.round((base + noise) * 10) / 10 };
  });

const equitySets = BACKTESTS.map((bt) => genEquity(bt.totalReturn, bt.id.charCodeAt(2)));
const benchmarkEq = genEquity(14.2, 99);

const combined = Array.from({ length: 100 }, (_, i) => ({
  day: `D${i+1}`,
  bt1: equitySets[0][i].value,
  bt3: equitySets[1][i].value,
  bt2: equitySets[2][i].value,
  bm:  benchmarkEq[i].value,
}));

const MONTHLY_COMPARE = [
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec',
].map((m) => ({
  m,
  bt1: parseFloat((Math.sin(m.charCodeAt(0) * 0.3) * 4 + 1.5).toFixed(1)),
  bt3: parseFloat((Math.sin(m.charCodeAt(0) * 0.4) * 5 + 2.1).toFixed(1)),
  bt2: parseFloat((Math.sin(m.charCodeAt(0) * 0.2) * 3 - 0.8).toFixed(1)),
}));

// Available backtests for adding to comparison
const AVAILABLE = [
  { id:'bt4', name:'Bollinger US 2024H2' },
  { id:'bt5', name:'配對交易 v2' },
];

export default function BacktestComparePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BtSummary[]>(BACKTESTS);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const removeItem = (id: string) => setItems((prev) => prev.filter((b) => b.id !== id));

  const metricCols: Column<BtSummary & { isBest?: boolean }>[] = [
    { key:'name',        header:'名稱',     render:(r)=>(
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background:r.color }} />
        <div>
          <div className="text-xs font-medium" style={{ color:'var(--color-text)' }}>{r.name}</div>
          <div className="text-xs" style={{ color:'var(--color-text-2)' }}>{r.strategy}</div>
        </div>
      </div>
    )},
    { key:'totalReturn', header:'總報酬率', align:'right', sortable:true,
      render:(r)=><PnlText value={r.totalReturn} suffix="%" className="font-semibold" /> },
    { key:'annualized',  header:'年化報酬', align:'right', sortable:true,
      render:(r)=><PnlText value={r.annualized} suffix="%" /> },
    { key:'maxDD',       header:'最大回撤', align:'right', sortable:true,
      render:(r)=><PnlText value={r.maxDD} suffix="%" /> },
    { key:'sharpe',      header:'Sharpe',  align:'right', sortable:true,
      render:(r)=>(
        <span className="num font-medium" style={{ color:r.sharpe>=1.5?'#3fb950':r.sharpe>=1?'#d29922':'#f85149' }}>
          {r.sharpe.toFixed(2)}
        </span>
      )},
    { key:'winRate',     header:'勝率',    align:'right',
      render:(r)=><span className="num">{r.winRate}%</span> },
    { key:'trades',      header:'交易次數', align:'right',
      render:(r)=><span className="num">{r.trades}</span> },
    { key:'id',          header:'',
      render:(r)=>(
        <button onClick={() => removeItem(r.id)}
                style={{ background:'none', border:'none', color:'var(--color-text-2)', cursor:'pointer', padding:4 }}>
          <X size={13} />
        </button>
      )},
  ];

  const winnerIdx = items.reduce((best, b, i) =>
    b.totalReturn > items[best].totalReturn ? i : best, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/backtest/history')}
                className="flex items-center gap-1.5 text-sm"
                style={{ color:'var(--color-text-2)', background:'none', border:'none', cursor:'pointer' }}>
          <ArrowLeft size={15} /> 返回歷史
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color:'var(--color-text)' }}>回測比較</h1>
          <p className="text-xs" style={{ color:'var(--color-text-2)' }}>
            比較 {items.length} 個回測結果
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBenchmark(!showBenchmark)}
                  className="text-xs px-3 py-1.5 rounded"
                  style={{
                    background: showBenchmark ? '#d2992222' : 'transparent',
                    border: `1px solid ${showBenchmark ? '#d29922' : 'var(--color-border)'}`,
                    color: showBenchmark ? '#d29922' : 'var(--color-text-2)',
                    cursor: 'pointer',
                  }}>
            基準指數
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{ background:'#58a6ff22', color:'#58a6ff', border:'1px solid #58a6ff44', cursor:'pointer' }}>
            <Plus size={12} /> 新增
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{ border:'1px solid var(--color-border)', color:'var(--color-text-2)', background:'transparent', cursor:'pointer' }}>
            <Download size={12} /> 匯出
          </button>
        </div>
      </div>

      {/* Add picker */}
      {showAdd && (
        <SectionCard>
          <div className="flex gap-2 flex-wrap">
            {AVAILABLE.map((a) => (
              <button key={a.id} onClick={() => {
                const colors = ['#a371f7','#f0883e'];
                const newItem: BtSummary = {
                  id:a.id, name:a.name, strategy:a.name,
                  totalReturn:12.3, annualized:8.1, maxDD:-15.4, sharpe:0.95, winRate:58.2, trades:421,
                  color: colors[items.length % colors.length],
                };
                setItems((prev) => [...prev, newItem]);
                setShowAdd(false);
              }}
                      className="text-xs px-3 py-1.5 rounded"
                      style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)', color:'var(--color-text)', cursor:'pointer' }}>
                {a.name}
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Best result banner */}
      {items.length > 0 && (
        <div className="px-4 py-3 rounded-lg flex items-center gap-3"
             style={{ background:'#3fb95011', border:'1px solid #3fb95033' }}>
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: items[winnerIdx].color }} />
          <span className="text-sm" style={{ color:'var(--color-text)' }}>
            <strong>{items[winnerIdx].name}</strong> 報酬率最高：
            <strong style={{ color:'#3fb950' }}> +{items[winnerIdx].totalReturn}%</strong>
          </span>
          <Badge variant="green">最佳</Badge>
        </div>
      )}

      {/* Equity curve comparison */}
      <SectionCard title="權益曲線比較 (回測起始=100%)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={combined} margin={{ top:4, right:4, bottom:0, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" stroke="var(--color-text-2)" tick={{ fontSize:10 }} interval={14} />
            <YAxis stroke="var(--color-text-2)" tick={{ fontSize:10 }} width={40}
                   tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:6, fontSize:12 }}
              formatter={(v: number, name: string) => [
                `${v >= 100 ? '+' : ''}${(v - 100).toFixed(1)}%`,
                items.find(b => b.id === name)?.name ?? (name === 'bm' ? '基準' : name),
              ]}
            />
            <Legend formatter={(value) => items.find(b => b.id === value)?.name ?? (value==='bm'?'基準':value)} />
            {items.map((bt) => (
              <Line key={bt.id} type="monotone" dataKey={bt.id}
                    stroke={bt.color} strokeWidth={2} dot={false} />
            ))}
            {showBenchmark && (
              <Line type="monotone" dataKey="bm"
                    stroke={BENCHMARK.color} strokeWidth={1} strokeDasharray="4 4" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Metrics table */}
      <SectionCard title="績效指標比較">
        <DataTable columns={metricCols} data={items} rowKey={(r) => r.id}
          emptyText="請新增至少一個回測" />
        {showBenchmark && (
          <div className="mt-3 pt-3 flex items-center gap-4 text-xs" style={{ borderTop:'1px solid var(--color-border)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: BENCHMARK.color }} />
              <span style={{ color:'var(--color-text-2)' }}>基準指數</span>
            </span>
            <span>總報酬 <strong style={{ color:'var(--color-text)' }}>+{BENCHMARK.totalReturn}%</strong></span>
            <span>年化 <strong style={{ color:'var(--color-text)' }}>+{BENCHMARK.annualized}%</strong></span>
            <span>最大回撤 <PnlText value={BENCHMARK.maxDD} suffix="%" className="inline" /></span>
            <span>Sharpe <strong style={{ color:'var(--color-text)' }}>{BENCHMARK.sharpe}</strong></span>
          </div>
        )}
      </SectionCard>

      {/* Monthly returns comparison */}
      <SectionCard title="月報酬率比較 (%)">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={MONTHLY_COMPARE} margin={{ top:4, right:4, bottom:0, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="m" stroke="var(--color-text-2)" tick={{ fontSize:10 }} />
            <YAxis stroke="var(--color-text-2)" tick={{ fontSize:10 }} tickFormatter={(v)=>`${v}%`} width={36} />
            <Tooltip
              contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:6, fontSize:12 }}
              formatter={(v:number, name:string) => [
                `${v}%`,
                items.find(b=>b.id===name)?.strategy ?? name,
              ]}
            />
            <Legend formatter={(value) => items.find(b=>b.id===value)?.strategy ?? value} />
            {items.map((bt) => (
              <Bar key={bt.id} dataKey={bt.id} fill={bt.color} radius={[2,2,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Risk/return scatter summary */}
      <SectionCard title="風險/報酬 摘要">
        <div className="grid gap-3" style={{ gridTemplateColumns:`repeat(${Math.min(items.length, 3)}, 1fr)` }}>
          {items.map((bt, i) => (
            <div key={bt.id} className="p-4 rounded-lg"
                 style={{ background:'var(--color-bg)', border:`1px solid ${i===winnerIdx?bt.color:'var(--color-border)'}` }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background:bt.color }} />
                <span className="text-xs font-medium" style={{ color:'var(--color-text)' }}>{bt.name}</span>
                {i === winnerIdx && <Badge variant="green">最佳</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['總報酬', <PnlText key="tr" value={bt.totalReturn} suffix="%" />],
                  ['年化', <PnlText key="an" value={bt.annualized} suffix="%" />],
                  ['最大回撤', <PnlText key="dd" value={bt.maxDD} suffix="%" />],
                  ['Sharpe', <span key="sr" className="num font-semibold" style={{color:bt.sharpe>=1?'#3fb950':'#d29922'}}>{bt.sharpe.toFixed(2)}</span>],
                  ['勝率', <span key="wr" className="num">{bt.winRate}%</span>],
                  ['交易次數', <span key="tc" className="num">{bt.trades}</span>],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <div className="text-xs" style={{ color:'var(--color-text-2)' }}>{label}</div>
                    <div className="text-sm">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
