import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Eye, Play, Pause, Square, FlaskConical, Copy, Trash2 } from 'lucide-react';
import { Badge, PageHeader, MiniSparkline, PnlText, TabBar } from '@/components/common';
import { useAppStore } from '@/stores/appStore';
import type { Strategy, StrategyStatus } from '@quant/shared';

type MockStrategy = Strategy & {
  todayPnl: number; todayPct: number;
  sparkline: number[]; modifiedAgo: string;
};

const MOCK: MockStrategy[] = [
  { id:'s1', name:'TW動量策略', description:'台股趨勢動量追蹤',      status:'running',  type:'momentum',       market:'tw', symbols:['2330','2454','2317'], code:'', params:[], version:3, createdAt:'', updatedAt:'', todayPnl:8230,  todayPct:0.82,  sparkline:[3,5,4,7,6,9,8,10,12,11], modifiedAgo:'2 天前' },
  { id:'s2', name:'US Momentum',  description:'US large-cap momentum', status:'running',  type:'momentum',       market:'us', symbols:['AAPL','NVDA','TSLA'],  code:'', params:[], version:2, createdAt:'', updatedAt:'', todayPnl:1570,  todayPct:0.55,  sparkline:[2,3,5,4,6,5,7,8,7,9],    modifiedAgo:'5 天前' },
  { id:'s3', name:'均值回歸',      description:'台股均值回歸策略',      status:'paused',   type:'mean-reversion', market:'tw', symbols:['2317','2382'],        code:'', params:[], version:1, createdAt:'', updatedAt:'', todayPnl:-340,  todayPct:-0.3,  sparkline:[5,4,6,3,5,4,3,4,3,2],    modifiedAgo:'1 週前' },
  { id:'s4', name:'配對交易 v2',   description:'統計套利策略',          status:'draft',    type:'arbitrage',      market:'tw', symbols:[],                     code:'', params:[], version:0, createdAt:'', updatedAt:'', todayPnl:0,     todayPct:0,     sparkline:[],                        modifiedAgo:'3 小時前' },
  { id:'s5', name:'Bollinger US',  description:'布林通道突破',          status:'stopped',  type:'breakout',       market:'us', symbols:['SPY','QQQ'],           code:'', params:[], version:4, createdAt:'', updatedAt:'', todayPnl:0,     todayPct:0,     sparkline:[8,7,5,6,4,3,5,4,2,3],    modifiedAgo:'2 週前' },
];

const STATUS_MAP: Record<StrategyStatus, { label: string; variant: 'green'|'red'|'yellow'|'blue'|'gray' }> = {
  running:    { label:'運行中', variant:'green'  },
  paused:     { label:'暫停',   variant:'yellow' },
  draft:      { label:'草稿',   variant:'gray'   },
  stopped:    { label:'已停止', variant:'red'    },
  backtesting:{ label:'回測中', variant:'blue'   },
  ready:      { label:'待部署', variant:'blue'   },
  error:      { label:'錯誤',   variant:'red'    },
};

const TYPE_LABEL: Record<string,string> = {
  momentum:'動量', 'mean-reversion':'均值回歸', arbitrage:'套利', breakout:'突破', trend:'趨勢', custom:'自訂',
};

const TABS = [
  { key:'all', label:'全部' }, { key:'running', label:'運行中' },
  { key:'paused', label:'暫停' }, { key:'draft', label:'草稿' },
];

export default function StrategyListPage() {
  const navigate = useNavigate();
  const { market } = useAppStore();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = MOCK.filter((s) => {
    const matchMarket = s.market === market || s.status === 'draft';
    const matchTab    = tab === 'all' || s.status === tab;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchMarket && matchTab && matchSearch;
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="策略管理"
        subtitle={`${market === 'tw' ? '台股' : '美股'} · ${MOCK.filter(s=>s.status==='running').length} 個運行中`}
        actions={
          <button onClick={() => navigate('/strategy/edit/new')}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                  style={{ background:'#58a6ff', color:'#fff', border:'none', cursor:'pointer' }}>
            <Plus size={14} /> 新增策略
          </button>
        } />

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        <div className="flex-1" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
               placeholder="搜尋策略..."
               className="text-sm px-3 py-1.5 rounded-md"
               style={{ background:'var(--color-card)', border:'1px solid var(--color-border)',
                        color:'var(--color-text)', outline:'none', width:180 }} />
      </div>

      {/* Strategy cards */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color:'var(--color-text-2)' }}>無符合條件的策略</p>
        )}
        {filtered.map((s) => {
          const st = STATUS_MAP[s.status];
          const isRunning = s.status === 'running';
          const isPaused  = s.status === 'paused';
          const isDraft   = s.status === 'draft';
          return (
            <div key={s.id}
                 className="rounded-lg p-4 transition-all"
                 style={{ background:'var(--color-card)', border:'1px solid var(--color-border)' }}
                 onMouseEnter={(e) => e.currentTarget.style.borderColor = '#58a6ff55'}
                 onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}>

              <div className="flex items-start justify-between gap-4">
                {/* Left: name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color:'var(--color-text)' }}>{s.name}</span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <Badge variant="blue">{TYPE_LABEL[s.type] ?? s.type}</Badge>
                    {s.symbols.length > 0 && (
                      <span className="text-xs" style={{ color:'var(--color-text-2)' }}>
                        {s.symbols.slice(0, 4).join(' · ')}{s.symbols.length > 4 ? ` +${s.symbols.length-4}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color:'var(--color-text-2)' }}>
                    {s.description} · 最後修改 {s.modifiedAgo}
                  </p>
                </div>

                {/* Right: sparkline + pnl */}
                <div className="flex items-center gap-4 shrink-0">
                  {s.sparkline.length > 0 && (
                    <MiniSparkline data={s.sparkline}
                      color={s.todayPnl >= 0 ? '#3fb950' : '#f85149'}
                      width={60} height={24} />
                  )}
                  {s.status !== 'draft' && s.status !== 'stopped' && (
                    <div className="text-right">
                      <PnlText value={s.todayPct} suffix="%" className="text-sm" />
                      <div className="text-xs num" style={{ color:'var(--color-text-2)' }}>
                        今日 {s.todayPnl >= 0 ? '+' : ''}NT${s.todayPnl.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {[
                  { label:'編輯', Icon:Edit3, action:() => navigate(`/strategy/edit/${s.id}`) },
                  { label:'監控', Icon:Eye,   action:() => navigate(`/strategy/monitor/${s.id}`), show: !isDraft },
                  { label:'回測', Icon:FlaskConical, action:() => navigate('/backtest/new'), show: isDraft || isPaused },
                  { label:'啟動', Icon:Play,  action:() => {}, show: isPaused, color:'#3fb950' },
                  { label:'暫停', Icon:Pause, action:() => {}, show: isRunning, color:'#d29922' },
                  { label:'複製', Icon:Copy,  action:() => {} },
                ].filter(btn => btn.show !== false).map(({ label, Icon, action, color }) => (
                  <button key={label} onClick={action}
                          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors"
                          style={{ background:'transparent', border:'1px solid var(--color-border)',
                                   color: color ?? 'var(--color-text-2)', cursor:'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = color ?? '#58a6ff'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                    <Icon size={12} /> {label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
