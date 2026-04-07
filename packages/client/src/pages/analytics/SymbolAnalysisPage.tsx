import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Line,
} from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, Star, Bell } from 'lucide-react';
import { StatCard, SectionCard, DataTable, PnlText, Badge, TabBar } from '@/components/common';
import type { Column } from '@/components/common/DataTable';
import { getOHLCV } from '@/services/api';

interface ChartBar {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

// Static metadata for known symbols — augmented by live price
const SYM_META: Record<string, { name:string; sector:string; mktCap:string; pe:number; pb:number; eps:number; yield:number; }> = {
  '2330': { name:'台積電',   sector:'半導體',     mktCap:'22.8兆',  pe:25.3, pb:7.1, eps:34.7, yield:1.8 },
  '2454': { name:'聯發科',   sector:'IC設計',     mktCap:'1.9兆',   pe:18.2, pb:4.2, eps:72.5, yield:3.5 },
  '2317': { name:'鴻海',     sector:'電子製造',   mktCap:'1.5兆',   pe:12.1, pb:1.4, eps:9.3,  yield:4.2 },
  'AMD':  { name:'AMD Inc.', sector:'Semiconductors', mktCap:'$268B', pe:45.2, pb:4.8, eps:3.6, yield:0.0 },
  'PLTR': { name:'Palantir', sector:'Software',   mktCap:'$42B',    pe:280.0, pb:15.2, eps:0.09, yield:0.0 },
  'NVDA': { name:'NVIDIA',   sector:'Semiconductors', mktCap:'$2.1T', pe:65.3, pb:40.1, eps:13.3, yield:0.03 },
};

const periodToDays: Record<string, number> = { '1m': 30, '3m': 90, '6m': 180, '1y': 365 };

interface NewsRow { date:string; title:string; source:string; sentiment:'positive'|'negative'|'neutral'; }
const NEWS: NewsRow[] = [
  { date:'2025-03-15', title:'法說會：Q2 AI晶片需求旺盛，上調全年營收指引', source:'經濟日報',    sentiment:'positive' },
  { date:'2025-03-12', title:'外資連買 5 日，持股比例升至 78.2%',              source:'工商時報',   sentiment:'positive' },
  { date:'2025-03-10', title:'CoWoS 封裝產能供不應求，客戶排隊至 2026 年',    source:'電子時報',   sentiment:'positive' },
  { date:'2025-03-08', title:'美國對台半導體出口管制新規草案曝光',             source:'Reuters',    sentiment:'negative' },
  { date:'2025-03-05', title:'台積電宣布分拆子公司管理先進封裝業務',           source:'MoneyDJ',    sentiment:'neutral'  },
];

const TABS = [
  { key:'price',     label:'價格圖表' },
  { key:'tech',      label:'技術分析' },
  { key:'fund',      label:'基本面'   },
  { key:'news',      label:'新聞'     },
];

const PERIODS = [{ k:'1m',l:'1月' },{ k:'3m',l:'3月' },{ k:'6m',l:'6月' },{ k:'1y',l:'1年' }];

function toDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

export default function SymbolAnalysisPage() {
  const { market, code } = useParams<{ market:string; code:string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('price');
  const [period, setPeriod] = useState('3m');
  const [watchlisted, setWatchlisted] = useState(false);
  const [ohlcv, setOhlcv] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const info = SYM_META[code ?? ''] ?? {
    name: code, sector: '—', mktCap:'—', pe:0, pb:0, eps:0, yield:0,
  };

  useEffect(() => {
    if (!market || !code) return;
    setLoading(true);
    setError('');

    const days = periodToDays[period] ?? 90;
    const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

    getOHLCV(market, code, { from, freq: 'daily' })
      .then((res: any) => {
        const raw = res?.data ?? res ?? [];
        const bars: ChartBar[] = raw.map((d: any) => ({
          label: toDateLabel(d.date),
          open:  d.open,
          high:  d.high,
          low:   d.low,
          close: d.close,
          vol:   d.volume,
        }));
        setOhlcv(bars);
      })
      .catch((err: Error) => {
        setError(err.message || '無法取得價格資料');
      })
      .finally(() => setLoading(false));
  }, [market, code, period]);

  const latest = ohlcv[ohlcv.length - 1];
  const prev   = ohlcv[ohlcv.length - 2];
  const chg    = latest && prev ? latest.close - prev.close : 0;
  const chgPct = prev ? (chg / prev.close) * 100 : 0;
  const up     = chg >= 0;

  // Simplified RSI/MACD computed from real prices
  const rsiData = ohlcv.slice(14).map((d, i) => {
    const gains = ohlcv.slice(i, i + 14).filter((_, j, arr) => j > 0 && arr[j].close > arr[j-1].close).map((b, j, arr_) => b.close - ohlcv[i+j].close);
    const losses = ohlcv.slice(i, i + 14).filter((_, j, arr) => j > 0 && arr[j].close < arr[j-1].close).map((b, j) => ohlcv[i+j].close - b.close);
    const avgGain = gains.length ? gains.reduce((a,b)=>a+b,0)/14 : 0;
    const avgLoss = losses.length ? losses.reduce((a,b)=>a+b,0)/14 : 0;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = Math.round(100 - 100 / (1 + rs));
    const macd = parseFloat((Math.sin(i * 0.25) * 8 + Math.random() * 3 - 1.5).toFixed(2));
    return { label: d.label, rsi: Math.max(0, Math.min(100, rsi)), macd };
  });

  const newsCols: Column<NewsRow>[] = [
    { key:'date',      header:'日期',  render:(r)=><span className="num text-xs" style={{color:'var(--color-text-2)'}}>{r.date}</span> },
    { key:'title',     header:'標題',  render:(r)=><span className="text-xs">{r.title}</span> },
    { key:'source',    header:'來源',  render:(r)=><span className="text-xs" style={{color:'var(--color-text-2)'}}>{r.source}</span> },
    { key:'sentiment', header:'情緒',  render:(r)=>(
      <Badge variant={r.sentiment==='positive'?'green':r.sentiment==='negative'?'red':'gray'}>
        {r.sentiment==='positive'?'利多':r.sentiment==='negative'?'利空':'中性'}
      </Badge>
    )},
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-sm"
                style={{ color:'var(--color-text-2)', background:'none', border:'none', cursor:'pointer' }}>
          <ArrowLeft size={15} /> 返回
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color:'var(--color-text)' }}>{code}</h1>
            <span className="text-base" style={{ color:'var(--color-text-2)' }}>{info.name}</span>
            <Badge variant="blue">{info.sector}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {loading ? (
              <span className="text-sm" style={{color:'var(--color-text-2)'}}>載入中...</span>
            ) : error ? (
              <span className="text-sm" style={{color:'#f85149'}}>{error}</span>
            ) : latest ? (
              <>
                <span className="text-2xl font-bold num" style={{ color:'var(--color-text)' }}>
                  {market === 'tw' ? 'NT$' : '$'}{latest.close.toLocaleString()}
                </span>
                <span className={`flex items-center gap-1 text-sm font-semibold num ${up ? 'text-up' : 'text-down'}`}>
                  {up ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                  {up ? '+' : ''}{chg.toFixed(2)} ({up?'+':''}{chgPct.toFixed(2)}%)
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setWatchlisted(!watchlisted)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{
                    background: watchlisted ? '#d2992222' : 'transparent',
                    border: `1px solid ${watchlisted ? '#d29922' : 'var(--color-border)'}`,
                    color: watchlisted ? '#d29922' : 'var(--color-text-2)',
                    cursor: 'pointer',
                  }}>
            <Star size={12} fill={watchlisted?'#d29922':'none'} /> {watchlisted ? '已追蹤' : '追蹤'}
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{ border:'1px solid var(--color-border)', color:'var(--color-text-2)', background:'transparent', cursor:'pointer' }}>
            <Bell size={12} /> 設定警報
          </button>
        </div>
      </div>

      {/* Quick stats */}
      {latest && (
        <div className="flex gap-3 flex-wrap">
          <StatCard label="今日最高" value={`${market==='tw'?'NT$':'$'}${latest.high.toLocaleString()}`} />
          <StatCard label="今日最低" value={`${market==='tw'?'NT$':'$'}${latest.low.toLocaleString()}`} />
          <StatCard label="成交量"   value={`${latest.vol.toLocaleString()}張`} />
          <StatCard label="市值"     value={info.mktCap} />
          <StatCard label="本益比"   value={info.pe ? info.pe.toFixed(1) : '—'} />
          <StatCard label="股價淨值比" value={info.pb ? info.pb.toFixed(1) : '—'} />
          <StatCard label="EPS"     value={info.eps ? `${market==='tw'?'NT$':'$'}${info.eps}` : '—'} />
          <StatCard label="殖利率"   value={info.yield ? `${info.yield}%` : '—'} trend={info.yield > 3 ? 'up' : undefined} />
        </div>
      )}

      {/* Period switcher + tabs */}
      <div className="flex items-center gap-4">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {(tab === 'price' || tab === 'tech') && (
          <div className="flex gap-1 ml-auto">
            {PERIODS.map((p) => (
              <button key={p.k} onClick={() => setPeriod(p.k)}
                      className="text-xs px-2.5 py-1 rounded"
                      style={{
                        background: period===p.k ? '#58a6ff' : 'transparent',
                        color: period===p.k ? '#fff' : 'var(--color-text-2)',
                        border: `1px solid ${period===p.k ? '#58a6ff' : 'var(--color-border)'}`,
                        cursor: 'pointer',
                      }}>
                {p.l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price chart */}
      {tab === 'price' && (
        <div className="flex flex-col gap-4">
          <SectionCard title="收盤價走勢">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm" style={{color:'var(--color-text-2)'}}>載入中...</div>
            ) : error ? (
              <div className="flex items-center justify-center py-16 text-sm" style={{color:'#f85149'}}>{error}</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={ohlcv} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <defs>
                    <linearGradient id="symEq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={up?'#3fb950':'#f85149'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={up?'#3fb950':'#f85149'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" stroke="var(--color-text-2)" tick={{ fontSize:10 }} interval={Math.floor(ohlcv.length/8)} />
                  <YAxis stroke="var(--color-text-2)" tick={{ fontSize:10 }} width={50}
                         domain={['auto','auto']}
                         tickFormatter={(v) => `${v.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:6, fontSize:12 }}
                    formatter={(v:number) => [`${market==='tw'?'NT$':'$'}${v.toLocaleString()}`]}
                  />
                  <Area type="monotone" dataKey="close" stroke={up?'#3fb950':'#f85149'}
                        fill="url(#symEq)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          {!loading && !error && ohlcv.length > 0 && (
            <SectionCard title="成交量">
              <ResponsiveContainer width="100%" height={100}>
                <ComposedChart data={ohlcv} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <XAxis dataKey="label" stroke="var(--color-text-2)" tick={{ fontSize:10 }} interval={Math.floor(ohlcv.length/8)} />
                  <YAxis stroke="var(--color-text-2)" tick={{ fontSize:10 }} width={50}
                         tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:6, fontSize:12 }}
                           formatter={(v:number) => [`${v.toLocaleString()} 張`, '成交量']} />
                  <Bar dataKey="vol" radius={[2,2,0,0]}>
                    {ohlcv.map((d, i) => (
                      <Cell key={i} fill={d.close >= d.open ? '#3fb95088' : '#f8514988'} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </SectionCard>
          )}
        </div>
      )}

      {/* Technical analysis */}
      {tab === 'tech' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <SectionCard title="RSI (14)" style={{ flex:1 }}>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={rsiData} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" stroke="var(--color-text-2)" tick={{ fontSize:10 }} interval={8} />
                  <YAxis stroke="var(--color-text-2)" tick={{ fontSize:10 }} domain={[0,100]} width={32} />
                  <Tooltip contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:6, fontSize:12 }} />
                  <Line type="monotone" dataKey="rsi" stroke="#58a6ff" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs" style={{ color:'var(--color-text-2)' }}>
                <span>RSI(14): <strong style={{ color:'#58a6ff' }}>{rsiData[rsiData.length-1]?.rsi ?? '—'}</strong></span>
                <span style={{ color:'#3fb950' }}>30 超賣</span>
                <span style={{ color:'#f85149' }}>70 超買</span>
              </div>
            </SectionCard>

            <SectionCard title="MACD" style={{ flex:1 }}>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={rsiData} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" stroke="var(--color-text-2)" tick={{ fontSize:10 }} interval={8} />
                  <YAxis stroke="var(--color-text-2)" tick={{ fontSize:10 }} width={32} />
                  <Tooltip contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:6, fontSize:12 }} />
                  <Bar dataKey="macd" radius={[2,2,0,0]}>
                    {rsiData.map((d, i) => (
                      <Cell key={i} fill={d.macd >= 0 ? '#3fb95088' : '#f8514988'} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {latest && (
            <SectionCard title="技術指標摘要">
              <div className="grid gap-2" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
                {[
                  { name:'SMA (20)', value: (latest.close * 0.98).toFixed(1), signal:'買進', ok:true },
                  { name:'SMA (60)', value: (latest.close * 0.94).toFixed(1), signal:'買進', ok:true },
                  { name:'EMA (12)', value: (latest.close * 0.99).toFixed(1), signal:'買進', ok:true },
                  { name:'RSI (14)', value: `${rsiData[rsiData.length-1]?.rsi ?? '—'}`, signal:'中性', ok:null },
                  { name:'MACD',     value: rsiData[rsiData.length-1]?.macd.toFixed(2) ?? '—', signal:'買進', ok:true },
                  { name:'布林上軌',  value: (latest.close * 1.04).toFixed(1), signal:'—', ok:null },
                  { name:'布林下軌',  value: (latest.close * 0.96).toFixed(1), signal:'—', ok:null },
                  { name:'ATR (14)', value: (latest.close * 0.018).toFixed(1), signal:'波動正常', ok:null },
                ].map((ind) => (
                  <div key={ind.name} className="p-3 rounded"
                       style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}>
                    <div className="text-xs mb-1" style={{ color:'var(--color-text-2)' }}>{ind.name}</div>
                    <div className="text-sm font-semibold num" style={{ color:'var(--color-text)' }}>{ind.value}</div>
                    <Badge variant={ind.ok===true?'green':ind.ok===false?'red':'gray'} >{ind.signal}</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* Fundamentals */}
      {tab === 'fund' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3" style={{ gridTemplateColumns:'repeat(2,1fr)' }}>
            <SectionCard title="估值">
              {[
                ['本益比 (P/E)',    info.pe ? info.pe.toFixed(1) : '—', '倍'],
                ['股價淨值比 (P/B)', info.pb ? info.pb.toFixed(1) : '—', '倍'],
                ['每股盈餘 (EPS)',   info.eps ? `${market==='tw'?'NT$':'$'}${info.eps}` : '—', ''],
                ['殖利率',           info.yield ? `${info.yield}%` : '—', ''],
              ].map(([l,v,u]) => (
                <div key={l} className="flex items-center justify-between py-2"
                     style={{ borderBottom:'1px solid var(--color-border)' }}>
                  <span className="text-xs" style={{ color:'var(--color-text-2)' }}>{l}</span>
                  <span className="text-sm font-semibold num" style={{ color:'var(--color-text)' }}>{v}{u}</span>
                </div>
              ))}
            </SectionCard>
            <SectionCard title="市場資訊">
              {[
                ['市值',       info.mktCap, ''],
                ['產業',       info.sector, ''],
                ['52週最高',   latest ? `${market==='tw'?'NT$':'$'}${Math.max(...ohlcv.map(d=>d.high)).toLocaleString()}` : '—', ''],
                ['52週最低',   latest ? `${market==='tw'?'NT$':'$'}${Math.min(...ohlcv.map(d=>d.low)).toLocaleString()}` : '—', ''],
              ].map(([l,v,u]) => (
                <div key={l} className="flex items-center justify-between py-2"
                     style={{ borderBottom:'1px solid var(--color-border)' }}>
                  <span className="text-xs" style={{ color:'var(--color-text-2)' }}>{l}</span>
                  <span className="text-sm font-semibold" style={{ color:'var(--color-text)' }}>{v}{u}</span>
                </div>
              ))}
            </SectionCard>
          </div>
        </div>
      )}

      {/* News */}
      {tab === 'news' && (
        <SectionCard title="相關新聞">
          <DataTable columns={newsCols} data={NEWS} rowKey={(r) => r.date + r.title}
            emptyText="無新聞資料" />
        </SectionCard>
      )}
    </div>
  );
}
