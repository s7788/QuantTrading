import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, Play, Pause, Square, Edit3, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { StatCard, SectionCard, DataTable, PnlText, Badge, TabBar } from '@/components/common';
import type { Column } from '@/components/common/DataTable';

interface LogEntry { time: string; level: 'info'|'warn'|'error'; msg: string; }
interface TradeRow { id: string; time: string; symbol: string; action: string; qty: number; price: number; pnl: number | null; }
interface PositionRow { symbol: string; name: string; qty: number; avgCost: number; current: number; unrealized: number; pct: number; }

const MOCK_POSITIONS: PositionRow[] = [
  { symbol:'2330', name:'台積電', qty:500, avgCost:750, current:878,  unrealized:64000,  pct:17.07 },
  { symbol:'2454', name:'聯發科', qty:200, avgCost:1100, current:1320, unrealized:44000, pct:20.0  },
];

const MOCK_TRADES: TradeRow[] = [
  { id:'1', time:'09:12:03', symbol:'2330', action:'買入', qty:500, price:750,  pnl:null },
  { id:'2', time:'10:45:22', symbol:'2454', action:'買入', qty:200, price:1100, pnl:null },
  { id:'3', time:'11:30:05', symbol:'2317', action:'賣出', qty:300, price:120,  pnl:-2400 },
];

const INITIAL_LOGS: LogEntry[] = [
  { time:'09:00:00', level:'info',  msg:'策略初始化完成' },
  { time:'09:00:01', level:'info',  msg:'載入技術指標：SMA(20), SMA(60)' },
  { time:'09:12:03', level:'info',  msg:'[2330] 黃金交叉觸發 — 買入 500 股 @750' },
  { time:'10:45:22', level:'info',  msg:'[2454] 黃金交叉觸發 — 買入 200 股 @1100' },
  { time:'11:30:05', level:'warn',  msg:'[2317] 死亡交叉 — 賣出 300 股 @120 (損失 NT$2,400)' },
  { time:'12:00:00', level:'info',  msg:'心跳檢查正常' },
];

// Generate equity curve for today
const now = new Date();
const todayEquity = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 4) + 9;
  const m = (i % 4) * 15;
  const base = 1_000_000 + i * 2_800 + Math.sin(i * 0.5) * 18000;
  return {
    t: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
    value: Math.round(base),
  };
}).filter((_, i) => i < 20); // Only ~9:00~13:45

const TABS = [{ key:'overview', label:'總覽' }, { key:'positions', label:'持倉' }, { key:'log', label:'執行日誌' }];

export default function StrategyMonitorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [status, setStatus] = useState<'running'|'paused'|'stopped'>('running');
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString('zh-TW'));
  const logRef = useRef<HTMLDivElement>(null);

  // Simulate incoming log entries
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => {
      const t = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      setLogs((prev) => [...prev.slice(-99), {
        time: t,
        level: Math.random() > 0.9 ? 'warn' : 'info',
        msg: Math.random() > 0.5
          ? `心跳檢查正常 — 持倉市值 NT$${(1_108_000 + Math.round(Math.random()*5000)).toLocaleString()}`
          : `[2330] SMA(20)=${(875 + Math.random()*5).toFixed(1)}, SMA(60)=${(860 + Math.random()*3).toFixed(1)}`,
      }]);
      setLastRefresh(t);
    }, 4000);
    return () => clearInterval(timer);
  }, [status]);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const posCols: Column<PositionRow>[] = [
    { key:'symbol',    header:'標的',   render:(r)=><span className="font-semibold">{r.symbol}</span> },
    { key:'name',      header:'名稱',   render:(r)=><span className="text-xs" style={{color:'var(--color-text-2)'}}>{r.name}</span> },
    { key:'qty',       header:'持倉數', align:'right', render:(r)=><span className="num">{r.qty.toLocaleString()}</span> },
    { key:'avgCost',   header:'均價',   align:'right', render:(r)=><span className="num">{r.avgCost.toLocaleString()}</span> },
    { key:'current',   header:'現價',   align:'right', render:(r)=><span className="num">{r.current.toLocaleString()}</span> },
    { key:'unrealized',header:'未實現損益', align:'right', sortable:true, render:(r)=><PnlText value={r.unrealized} prefix="NT$" /> },
    { key:'pct',       header:'報酬率', align:'right', sortable:true, render:(r)=><PnlText value={r.pct} suffix="%" /> },
  ];

  const tradeCols: Column<TradeRow>[] = [
    { key:'time',   header:'時間',   render:(r)=><span className="num text-xs" style={{color:'var(--color-text-2)'}}>{r.time}</span> },
    { key:'symbol', header:'標的',   render:(r)=><span className="font-semibold">{r.symbol}</span> },
    { key:'action', header:'方向',   render:(r)=><Badge variant={r.action==='買入'?'green':'red'}>{r.action}</Badge> },
    { key:'qty',    header:'數量',   align:'right', render:(r)=><span className="num">{r.qty.toLocaleString()}</span> },
    { key:'price',  header:'價格',   align:'right', render:(r)=><span className="num">{r.price.toLocaleString()}</span> },
    { key:'pnl',    header:'損益',   align:'right', render:(r)=>r.pnl===null ? <span className="text-xs" style={{color:'var(--color-text-2)'}}>持倉中</span> : <PnlText value={r.pnl} prefix="NT$" /> },
  ];

  const LOG_COLOR: Record<string, string> = { info: 'var(--color-text-2)', warn: '#d29922', error: '#f85149' };
  const LOG_ICON = { info: CheckCircle, warn: AlertCircle, error: AlertCircle };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/strategy')}
                className="flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--color-text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={15} /> 返回
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>TW動量策略 — 監控</h1>
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-2)' }}>
            <Clock size={11} /> 最後更新 {lastRefresh}
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded"
             style={{
               background: status==='running' ? '#3fb95022' : status==='paused' ? '#d2992222' : '#f8514922',
               border: `1px solid ${status==='running' ? '#3fb95055' : status==='paused' ? '#d2992255' : '#f8514955'}`,
             }}>
          {status === 'running' && (
            <span className="w-2 h-2 rounded-full" style={{ background: '#3fb950', animation: 'pulse 2s infinite' }} />
          )}
          <span className="text-xs font-medium" style={{ color: status==='running' ? '#3fb950' : status==='paused' ? '#d29922' : '#f85149' }}>
            {status === 'running' ? '運行中' : status === 'paused' ? '暫停' : '已停止'}
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex gap-2">
          <button onClick={() => navigate(`/strategy/edit/${id}`)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-2)', background: 'transparent', cursor: 'pointer' }}>
            <Edit3 size={12} /> 編輯
          </button>
          {status === 'running' ? (
            <button onClick={() => setStatus('paused')}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ border: '1px solid #d2992244', color: '#d29922', background: '#d2992211', cursor: 'pointer' }}>
              <Pause size={12} /> 暫停
            </button>
          ) : status === 'paused' ? (
            <button onClick={() => setStatus('running')}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ border: '1px solid #3fb95044', color: '#3fb950', background: '#3fb95011', cursor: 'pointer' }}>
              <Play size={12} /> 繼續
            </button>
          ) : null}
          {status !== 'stopped' && (
            <button onClick={() => setStatus('stopped')}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ border: '1px solid #f8514944', color: '#f85149', background: '#f8514911', cursor: 'pointer' }}>
              <Square size={12} /> 停止
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="今日損益"  value="+NT$8,230"  trend="up"   sub="+0.82%" />
        <StatCard label="持倉市值"  value="NT$1,108,000" trend="up" sub="2 個標的" />
        <StatCard label="未實現損益" value="+NT$108,000" trend="up"  sub="+10.8%" />
        <StatCard label="今日交易"  value="3 筆"                     sub="2買 1賣" />
        <StatCard label="勝率(今)"  value="66.7%"       trend="up"  sub="2勝 1負" />
        <StatCard label="最大回撤"  value="-2.1%"       trend="down" sub="今日" />
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          <SectionCard title="今日資產曲線"
            actions={
              <button onClick={() => setLastRefresh(new Date().toLocaleTimeString('zh-TW'))}
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer' }}>
                <RefreshCw size={12} />
              </button>
            }>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={todayEquity} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="monEq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3fb950" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="t" stroke="var(--color-text-2)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--color-text-2)" tick={{ fontSize: 10 }} width={50}
                       tickFormatter={(v) => `${(v / 10000).toFixed(0)}萬`} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }}
                  formatter={(v: number) => [`NT$${v.toLocaleString()}`, '資產']} />
                <Area type="monotone" dataKey="value" stroke="#3fb950" fill="url(#monEq)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="flex gap-4">
            <SectionCard title="當前持倉" style={{ flex: 1 }}>
              <DataTable columns={posCols} data={MOCK_POSITIONS} rowKey={(r) => r.symbol}
                emptyText="無持倉" />
            </SectionCard>
          </div>

          <SectionCard title="今日交易記錄">
            <DataTable columns={tradeCols} data={MOCK_TRADES} rowKey={(r) => r.id}
              emptyText="今日尚無交易" />
          </SectionCard>
        </div>
      )}

      {tab === 'positions' && (
        <SectionCard title="持倉明細">
          <DataTable columns={posCols} data={MOCK_POSITIONS} rowKey={(r) => r.symbol}
            emptyText="無持倉" />
          <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>合計未實現損益</span>
            <PnlText value={108000} prefix="NT$" className="text-base font-bold" />
          </div>
        </SectionCard>
      )}

      {tab === 'log' && (
        <SectionCard title="執行日誌"
          actions={
            <div className="flex items-center gap-2">
              {status === 'running' && (
                <span className="flex items-center gap-1 text-xs" style={{ color: '#3fb950' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3fb950' }} />
                  即時更新中
                </span>
              )}
              <button onClick={() => setLogs(INITIAL_LOGS)}
                      className="text-xs px-2 py-1 rounded"
                      style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-2)', background: 'transparent', cursor: 'pointer' }}>
                清除
              </button>
            </div>
          }>
          <div ref={logRef} className="overflow-y-auto"
               style={{ maxHeight: 420, fontFamily: "'JetBrains Mono', monospace" }}>
            {logs.map((log, i) => {
              const Icon = LOG_ICON[log.level];
              return (
                <div key={i} className="flex items-start gap-2 py-1.5"
                     style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="num text-xs shrink-0" style={{ color: 'var(--color-text-2)', minWidth: 64 }}>{log.time}</span>
                  <Icon size={12} style={{ color: LOG_COLOR[log.level], marginTop: 2, flexShrink: 0 }} />
                  <span className="text-xs" style={{ color: LOG_COLOR[log.level], lineHeight: 1.5 }}>{log.msg}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
