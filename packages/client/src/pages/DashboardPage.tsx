import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, XCircle, Info, Download, Eye } from 'lucide-react';
import {
  StatCard, Badge, SectionCard, DataTable, PnlText,
} from '@/components/common';
import type { Column } from '@/components/common/DataTable';
import { useAppStore } from '@/stores/appStore';
import type { Position, Trade, Alert, DashboardSummary } from '@quant/shared';
import {
  getDashboardSummary, getEquityCurve, getPositions,
  getRecentTrades, getAlerts, markAlertRead,
} from '@/services/api';

const PERIODS = [
  { key:'1d', label:'今日' }, { key:'1w', label:'本週' },
  { key:'1m', label:'本月' }, { key:'3m', label:'本季' }, { key:'1y', label:'本年' },
];

const ALERT_ICON  = { error: <XCircle size={14} />, warning: <AlertTriangle size={14} />, info: <Info size={14} /> };
const ALERT_COLOR = { error: '#f85149', warning: '#d29922', info: '#58a6ff' };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { market } = useAppStore();
  const [period, setPeriod] = useState('1m');

  const [summary, setSummary]     = useState<DashboardSummary | null>(null);
  const [equity, setEquity]       = useState<Array<{ day: string; value: number; benchmark: number }>>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades]       = useState<Trade[]>([]);
  const [alerts, setAlerts]       = useState<Alert[]>([]);

  // Fetch summary + positions + trades + alerts on market change
  useEffect(() => {
    getDashboardSummary().then((res: unknown) => {
      setSummary((res as { data: DashboardSummary }).data ?? null);
    }).catch(() => {});

    getPositions(market).then((res: unknown) => {
      setPositions((res as { data: Position[] }).data ?? []);
    }).catch(() => {});

    getRecentTrades(market).then((res: unknown) => {
      setTrades((res as { data: Trade[] }).data ?? []);
    }).catch(() => {});

    getAlerts().then((res: unknown) => {
      setAlerts((res as { data: Alert[] }).data ?? []);
    }).catch(() => {});
  }, [market]);

  // Fetch equity curve when period changes
  useEffect(() => {
    getEquityCurve(period).then((res: unknown) => {
      setEquity((res as { data: Array<{ day: string; value: number; benchmark: number }> }).data ?? []);
    }).catch(() => {});
  }, [period]);

  const unread = alerts.filter((a) => !a.read).length;

  const handleMarkRead = (id: string) => {
    markAlertRead(id).catch(() => {});
    setAlerts((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
  };

  // ── Position table columns ─────────────────────────────────
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

  // ── Trade table columns ────────────────────────────────────
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

  const isTW = market === 'tw';

  return (
    <div className="flex flex-col gap-4">
      {/* ── Stat cards ──────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="總資產淨值"
          value={summary ? `${isTW ? 'NT$' : '$'}${summary.totalEquity.toLocaleString()}` : '—'}
          sub={summary ? `${summary.equityChange >= 0 ? '+' : ''}${isTW ? 'NT$' : '$'}${summary.equityChange.toLocaleString()} (${summary.equityChangePercent >= 0 ? '+' : ''}${summary.equityChangePercent}%)` : undefined}
          trend={summary && summary.equityChange >= 0 ? 'up' : 'down'} />
        <StatCard label="今日損益"
          value={summary ? `${summary.todayPnl >= 0 ? '+' : ''}${isTW ? 'NT$' : '$'}${summary.todayPnl.toLocaleString()}` : '—'}
          sub="已實現+未實現"
          trend={summary && summary.todayPnl >= 0 ? 'up' : 'down'} />
        <StatCard label="持倉數"
          value={summary?.positionCount ?? positions.length}
          sub={summary ? `${summary.longCount}多 / ${summary.shortCount}空` : undefined} />
        <StatCard label="運行中策略"
          value={summary ? `${summary.activeStrategies} / ${summary.totalStrategies}` : '—'}
          sub="策略運行中" />
        <StatCard label="今日交易"
          value={summary?.todayTrades ?? trades.length}
          sub="筆成交" />
        <StatCard label="今日勝率"
          value={summary ? `${(summary.todayWinRate * 100).toFixed(1)}%` : '—'}
          sub="已平倉"
          trend={summary && summary.todayWinRate >= 0.5 ? 'up' : 'down'} />
      </div>

      {/* ── Equity curve ────────────────────────────────── */}
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
          {equity.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={equity} margin={{top:4,right:4,bottom:0,left:0}}>
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
                  formatter={(v:number,n:string)=>[`${isTW?'NT$':'$'}${v.toLocaleString()}`,n==='value'?'淨值':'基準']} />
                <Area type="monotone" dataKey="value"     stroke="#58a6ff" fill="url(#eq)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="benchmark" stroke="var(--color-text-2)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{height:220,color:'var(--color-text-2)',fontSize:13}}>
              尚無權益曲線資料
            </div>
          )}
        </SectionCard>

        <SectionCard title="績效指標" style={{minWidth:170,flex:1}}>
          {[['總報酬率','—','var(--color-text-2)'],['年化報酬','—','var(--color-text-2)'],
            ['最大回撤','—','var(--color-text-2)'],['Sharpe','—','#58a6ff'],
            ['Sortino','—','#58a6ff'],['Calmar','—','#58a6ff']].map(([k,v,c])=>(
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
            emptyText={`目前無${isTW?'台股':'美股'}持倉`} />
        </SectionCard>

        <SectionCard title="告警" style={{minWidth:230,flex:1}}
          actions={unread>0
            ? <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{background:'#f8514922',color:'#f85149'}}>{unread}</span>
            : null}>
          {alerts.length === 0 ? (
            <div className="text-xs py-4 text-center" style={{color:'var(--color-text-2)'}}>無告警</div>
          ) : alerts.map((a)=>(
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
                <button onClick={()=>handleMarkRead(a.id)}
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
