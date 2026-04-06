import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, XCircle, Info, Download, Eye } from 'lucide-react';
import {
  StatCard, Badge, SectionCard, DataTable, PnlText, MiniSparkline,
} from '@/components/common';
import type { Column } from '@/components/common/DataTable';
import { useAppStore } from '@/stores/appStore';
import { useNavigate as useNav } from 'react-router-dom';
import type { Position, Trade, Alert } from '@quant/shared';

// ── Mock data ────────────────────────────────────────────────
const mockEquity = Array.from({ length: 60 }, (_, i) => ({
  day: `D${i + 1}`,
  value: Math.round(1_000_000 + i * 4_800 + Math.sin(i * 0.35) * 45_000),
  benchmark: Math.round(1_000_000 + i * 2_800 + Math.sin(i * 0.2) * 18_000),
}));

const ALL_POSITIONS: Position[] = [
  { id:'p1', symbol:'2330', name:'台積電',    market:'tw', direction:'long',  quantity:1000, avgCost:850,  currentPrice:878.5, unrealizedPnl:28_500, unrealizedPnlPercent:3.35,  weight:18.7, strategyId:'s1', strategyName:'TW動量策略', openedAt:'2026-03-01' },
  { id:'p2', symbol:'2454', name:'聯發科',    market:'tw', direction:'long',  quantity:200,  avgCost:1250, currentPrice:1320,  unrealizedPnl:14_000, unrealizedPnlPercent:5.6,   weight:9.1,  strategyId:'s1', strategyName:'TW動量策略', openedAt:'2026-03-10' },
  { id:'p3', symbol:'2317', name:'鴻海',      market:'tw', direction:'short', quantity:500,  avgCost:115,  currentPrice:112.5, unrealizedPnl:1_250,  unrealizedPnlPercent:2.17,  weight:4.1,  strategyId:'s3', strategyName:'均值回歸',   openedAt:'2026-03-20' },
  { id:'p4', symbol:'AAPL', name:'Apple',    market:'us', direction:'long',  quantity:50,   avgCost:172.8,currentPrice:178.2, unrealizedPnl:270,    unrealizedPnlPercent:3.13,  weight:6.4,  strategyId:'s2', strategyName:'US Momentum',openedAt:'2026-02-20' },
  { id:'p5', symbol:'NVDA', name:'NVIDIA',   market:'us', direction:'long',  quantity:30,   avgCost:820,  currentPrice:875,   unrealizedPnl:1_650,  unrealizedPnlPercent:6.71,  weight:9.0,  strategyId:'s2', strategyName:'US Momentum',openedAt:'2026-02-15' },
];

const ALL_TRADES: Trade[] = [
  { id:'t1', symbol:'2330', market:'tw', action:'buy',  quantity:200, price:875.0, strategyId:'s1', strategyName:'TW動量策略', executedAt:'2026-04-06T14:32:05' },
  { id:'t2', symbol:'2454', market:'tw', action:'sell', quantity:100, price:1318,  realizedPnl:6_800,realizedPnlPercent:5.4, strategyId:'s1', strategyName:'TW動量策略', executedAt:'2026-04-06T13:45:00' },
  { id:'t3', symbol:'NVDA', market:'us', action:'sell', quantity:10,  price:872.0, realizedPnl:520,  realizedPnlPercent:6.3,  strategyId:'s2', strategyName:'US Momentum',executedAt:'2026-04-06T14:28:12' },
  { id:'t4', symbol:'AAPL', market:'us', action:'sell', quantity:20,  price:177.8, realizedPnl:100,  realizedPnlPercent:2.88, strategyId:'s2', strategyName:'US Momentum',executedAt:'2026-04-06T11:22:18' },
];

const INIT_ALERTS: Alert[] = [
  { id:'a1', level:'error',   type:'api_disconnect',    message:'US Momentum WebSocket 連線中斷，嘗試重連中', read:false, strategyId:'s2', createdAt:'2026-04-06T14:35:00' },
  { id:'a2', level:'warning', type:'drawdown_threshold',message:'NVDA 回撤達 -4.8%，接近閾值 -5%',          read:false, strategyId:'s2', createdAt:'2026-04-06T14:20:00' },
  { id:'a3', level:'info',    type:'strategy_error',    message:'TW動量策略 完成 2330 買入 200 股 @ 875',    read:true,  strategyId:'s1', createdAt:'2026-04-06T14:32:05' },
];

const PERIODS = [
  { key:'1d', label:'今日' }, { key:'1w', label:'本週' },
  { key:'1m', label:'本月' }, { key:'3m', label:'本季' }, { key:'1y', label:'本年' },
];

const ALERT_ICON  = { error: <XCircle size={14} />, warning: <AlertTriangle size={14} />, info: <Info size={14} /> };
const ALERT_COLOR = { error: '#f85149', warning: '#d29922', info: '#58a6ff' };

// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { market } = useAppStore();
  const [period, setPeriod] = useState('1m');
  const [alerts, setAlerts] = useState<Alert[]>(INIT_ALERTS);

  const positions = ALL_POSITIONS.filter((p) => p.market === market);
  const trades    = ALL_TRADES.filter((t) => t.market === market);
  const unread    = alerts.filter((a) => !a.read).length;

  // ── Position table columns ───────────────────────────────
  const posCols: Column<Position>[] = [
    { key:'symbol', header:'標的',
      render: (r) => <><span className="font-semibold">{r.symbol}</span><span className="ml-2 text-xs" style={{color:'var(--color-text-2)'}}>{r.name}</span></> },
    { key:'direction', header:'方向',
      render: (r) => <Badge variant={r.direction==='long'?'green':'red'}>{r.direction==='long'?'多':'空'}</Badge> },
    { key:'quantity', header:'數量', align:'right', sortable:true,
      render: (r) => <span className="num">{r.quantity.toLocaleString()}</span> },
    { key:'avgCost', header:'成本', align:'right', sortable:true,
      render: (r) => <span className="num">{r.avgCost.toLocaleString()}</span> },
    { key:'currentPrice', header:'現價', align:'right', sortable:true,
      render: (r) => <span className="num font-medium">{r.currentPrice.toLocaleString()}</span> },
    { key:'unrealizedPnlPercent', header:'未實現損益', align:'right', sortable:true,
      render: (r) => (
        <div className="text-right">
          <PnlText value={r.unrealizedPnlPercent} suffix="%" />
          <div className="text-xs num" style={{color:'var(--color-text-2)'}}>
            {r.unrealizedPnl>=0?'+':''}{(r.unrealizedPnl/1000).toFixed(1)}K
          </div>
        </div>
      ) },
    { key:'weight', header:'佔比', align:'right',
      render: (r) => <span className="num text-xs" style={{color:'var(--color-text-2)'}}>{r.weight}%</span> },
    { key:'strategyName', header:'策略',
      render: (r) => (
        <button onClick={(e)=>{e.stopPropagation();navigate(`/strategy/monitor/${r.strategyId}`);}}
                className="text-xs hover:underline" style={{color:'#58a6ff',background:'none',border:'none',cursor:'pointer'}}>
          {r.strategyName}
        </button>
      ) },
    { key:'id', header:'',
      render: (r) => (
        <button onClick={(e)=>{e.stopPropagation();navigate(`/analytics/symbol/${r.market}/${r.symbol}`);}}
                style={{background:'none',border:'none',color:'var(--color-text-2)',cursor:'pointer',padding:4}}>
          <Eye size={14} />
        </button>
      ) },
  ];

  // ── Trade table columns ──────────────────────────────────
  const tradeCols: Column<Trade>[] = [
    { key:'executedAt', header:'時間',
      render: (r) => <span className="num text-xs" style={{color:'var(--color-text-2)'}}>{new Date(r.executedAt).toLocaleTimeString('zh-TW')}</span> },
    { key:'symbol', header:'標的', render: (r) => <span className="font-semibold">{r.symbol}</span> },
    { key:'action',  header:'方向',
      render: (r) => <Badge variant={r.action==='buy'?'green':'red'}>{r.action==='buy'?'買入':'賣出'}</Badge> },
    { key:'quantity', header:'數量', align:'right',
      render: (r) => <span className="num">{r.quantity.toLocaleString()}</span> },
    { key:'price', header:'價格', align:'right',
      render: (r) => <span className="num">{r.price.toLocaleString()}</span> },
    { key:'realizedPnl', header:'損益', align:'right',
      render: (r) => r.realizedPnlPercent != null
        ? <PnlText value={r.realizedPnlPercent} suffix="%" />
        : <span style={{color:'var(--color-text-2)'}}>—</span> },
    { key:'strategyName', header:'策略',
      render: (r) => <span className="text-xs" style={{color:'#58a6ff'}}>{r.strategyName}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Stat cards ──────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="總資產淨值"
          value={market==='tw'?'NT$128.5萬':'$128,456'}
          sub="+NT$12,340 (+0.97%)" trend="up" />
        <StatCard label="今日損益"
          value={market==='tw'?'+NT$8,230':'+$820'}
          sub="已實現+未實現" trend="up" />
        <StatCard label="持倉數"
          value={positions.length}
          sub={`${positions.filter(p=>p.direction==='long').length}多 / ${positions.filter(p=>p.direction==='short').length}空`} />
        <StatCard label="運行中策略" value="2 / 5" sub="策略運行中" />
        <StatCard label="今日交易" value={trades.length} sub="筆成交" />
        <StatCard label="今日勝率" value="66.7%" sub="已平倉" trend="up" />
      </div>

      {/* ── Equity curve + Metrics ───────────────────────── */}
      <div className="flex gap-4">
        <SectionCard title="權益曲線" style={{ flex:3 }}
          actions={
            <div className="flex gap-1">
              {PERIODS.map(({key,label}) => (
                <button key={key} onClick={()=>setPeriod(key)}
                        className="px-2.5 py-1 rounded text-xs"
                        style={{ background:period===key?'#58a6ff22':'transparent',
                                 color:period===key?'#58a6ff':'var(--color-text-2)',
                                 border:'none', cursor:'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          }>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockEquity} margin={{top:4,right:4,bottom:0,left:0}}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#58a6ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-text-2)" tick={{fontSize:10}} interval={9} />
              <YAxis stroke="var(--color-text-2)" tick={{fontSize:10}} width={50}
                     tickFormatter={(v)=>`${(v/10000).toFixed(0)}萬`} />
              <Tooltip
                contentStyle={{background:'var(--color-card)',border:'1px solid var(--color-border)',borderRadius:6,fontSize:12}}
                labelStyle={{color:'var(--color-text-2)'}}
                formatter={(v:number,n:string)=>[`NT$${v.toLocaleString()}`,n==='value'?'淨值':'基準']} />
              <Area type="monotone" dataKey="value"     stroke="#58a6ff" fill="url(#eq)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="benchmark" stroke="var(--color-text-2)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="績效指標" style={{minWidth:170,flex:1}}>
          {[['總報酬率','+28.5%','#3fb950'],['年化報酬','+18.2%','#3fb950'],
            ['最大回撤','-12.3%','#f85149'],['Sharpe','1.45','#58a6ff'],
            ['Sortino','1.82','#58a6ff'],['Calmar','1.48','#58a6ff']].map(([k,v,c])=>(
            <div key={k} className="flex justify-between py-2"
                 style={{borderBottom:'1px solid var(--color-border)'}}>
              <span className="text-xs" style={{color:'var(--color-text-2)'}}>{k}</span>
              <span className="text-xs font-semibold num" style={{color:c}}>{v}</span>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* ── Positions + Alerts ──────────────────────────── */}
      <div className="flex gap-4">
        <SectionCard title="持倉列表" style={{flex:3}}>
          <DataTable columns={posCols} data={positions} rowKey={(r)=>r.id}
            onRowClick={(r)=>navigate(`/analytics/symbol/${r.market}/${r.symbol}`)}
            emptyText={`目前無${market==='tw'?'台股':'美股'}持倉`} />
        </SectionCard>

        <SectionCard title="告警" style={{minWidth:230,flex:1}}
          actions={unread>0
            ? <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{background:'#f8514922',color:'#f85149'}}>{unread}</span>
            : null}>
          {alerts.map((a)=>(
            <div key={a.id} className="flex gap-2 items-start py-2.5"
                 style={{borderBottom:'1px solid var(--color-border)',opacity:a.read?0.45:1}}>
              <span style={{color:ALERT_COLOR[a.level],marginTop:1,flexShrink:0}}>{ALERT_ICON[a.level]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug" style={{color:'var(--color-text)'}}>{a.message}</p>
                <p className="text-xs mt-0.5" style={{color:'var(--color-text-2)'}}>
                  {new Date(a.createdAt).toLocaleTimeString('zh-TW')}
                </p>
              </div>
              {!a.read && (
                <button onClick={()=>setAlerts(prev=>prev.map(x=>x.id===a.id?{...x,read:true}:x))}
                        className="text-xs shrink-0"
                        style={{color:'#58a6ff',background:'none',border:'none',cursor:'pointer'}}>
                  已讀
                </button>
              )}
            </div>
          ))}
        </SectionCard>
      </div>

      {/* ── Recent Trades ────────────────────────────────── */}
      <SectionCard title="近期交易"
        actions={
          <button className="flex items-center gap-1.5 text-xs px-3 py-1 rounded"
                  style={{color:'#58a6ff',border:'1px solid var(--color-border)',background:'transparent',cursor:'pointer'}}>
            <Download size={12}/> 匯出 CSV
          </button>
        }>
        <DataTable columns={tradeCols} data={trades} rowKey={(r)=>r.id}
          emptyText="今日尚無交易記錄" />
      </SectionCard>
    </div>
  );
}
