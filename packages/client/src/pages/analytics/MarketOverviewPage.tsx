import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Search } from 'lucide-react';
import { PageHeader, SectionCard, TabBar, Badge, DataTable, PnlText } from '@/components/common';
import type { Column } from '@/components/common/DataTable';
import { useAppStore } from '@/stores/appStore';

const TW_INDICES = [
  { name:'加權指數', value:'22,345', change:'+125',  pct:'+0.56%', up:true  },
  { name:'台灣50',   value:'114.2',  change:'+0.85', pct:'+0.75%', up:true  },
  { name:'電子指數', value:'812.3',  change:'+8.2',  pct:'+1.02%', up:true  },
  { name:'金融指數', value:'1,823',  change:'-5.1',  pct:'-0.28%', up:false },
];
const US_INDICES = [
  { name:'S&P 500',  value:'4,892', change:'+15.6', pct:'+0.32%', up:true  },
  { name:'NASDAQ',   value:'15,234',change:'+78.3', pct:'+0.52%', up:true  },
  { name:'Dow Jones',value:'38,540',change:'-42.1', pct:'-0.11%', up:false },
  { name:'VIX',      value:'14.2',  change:'-0.8',  pct:'-5.3%',  up:false },
];

const TW_SECTORS = [
  { name:'半導體',ret:2.8},{name:'電子零組件',ret:1.2},{name:'電腦周邊',ret:-0.3},
  {name:'光電',  ret:0.8},{name:'通信網路',  ret:-1.1},{name:'電子通路',ret:0.4},
  {name:'金融保險',ret:-0.5},{name:'建材營造',ret:1.6},{name:'食品',ret:-0.2},
  {name:'生技醫療',ret:0.9},{name:'塑膠',ret:0.3},{name:'航運',ret:-2.1},
];
const US_SECTORS = [
  {name:'Tech',ret:1.5},{name:'Healthcare',ret:0.3},{name:'Financials',ret:-0.4},
  {name:'Energy',ret:2.1},{name:'Consumer',ret:-0.6},{name:'Industrials',ret:0.8},
  {name:'Materials',ret:-1.2},{name:'Utilities',ret:0.2},{name:'RE',ret:-0.9},
];

interface Mover { symbol:string; name:string; price:string; change:string; volume:string; }
const TW_GAINERS: Mover[] = [
  {symbol:'2330',name:'台積電',price:'878',change:'+3.8%',volume:'2.1x'},
  {symbol:'2454',name:'聯發科',price:'1320',change:'+3.2%',volume:'1.8x'},
  {symbol:'2382',name:'廣達',price:'302',change:'+2.7%',volume:'2.4x'},
];
const TW_LOSERS: Mover[] = [
  {symbol:'2317',name:'鴻海',price:'112',change:'-2.1%',volume:'1.5x'},
  {symbol:'2886',name:'兆豐金',price:'38.2',change:'-1.8%',volume:'1.2x'},
];
const US_GAINERS: Mover[] = [
  {symbol:'NVDA',name:'NVIDIA',price:'$875',change:'+3.4%',volume:'1.9x'},
  {symbol:'AAPL',name:'Apple',price:'$178',change:'+2.1%',volume:'1.3x'},
];
const US_LOSERS: Mover[] = [
  {symbol:'TSLA',name:'Tesla',price:'$245',change:'-2.8%',volume:'2.2x'},
  {symbol:'META',name:'Meta',price:'$512',change:'-1.5%',volume:'1.4x'},
];

const TABS = [
  {key:'market',label:'市場總覽'},
  {key:'screener',label:'篩選器'},
];

const ALL_SYMBOLS = [
  {code:'2330',name:'台積電',market:'tw'},{code:'2317',name:'鴻海',market:'tw'},
  {code:'2454',name:'聯發科',market:'tw'},{code:'2382',name:'廣達',market:'tw'},
  {code:'2412',name:'中華電',market:'tw'},{code:'2886',name:'兆豐金',market:'tw'},
  {code:'2308',name:'台達電',market:'tw'},{code:'3008',name:'大立光',market:'tw'},
  {code:'NVDA',name:'NVIDIA',market:'us'},{code:'AAPL',name:'Apple',market:'us'},
  {code:'TSLA',name:'Tesla',market:'us'},{code:'META',name:'Meta',market:'us'},
  {code:'AMD', name:'AMD',  market:'us'},{code:'PLTR',name:'Palantir',market:'us'},
];

export default function MarketOverviewPage() {
  const navigate = useNavigate();
  const { market } = useAppStore();
  const [tab, setTab] = useState('market');
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const goToSymbol = (code: string, mkt: string) => {
    navigate(`/analytics/symbol/${mkt}/${code}`);
    setSearchInput('');
    setShowSuggestions(false);
  };

  const filteredSymbols = searchInput.length > 0
    ? ALL_SYMBOLS.filter(s =>
        s.code.toLowerCase().startsWith(searchInput.toLowerCase()) ||
        s.name.includes(searchInput)
      )
    : ALL_SYMBOLS.filter(s => s.market === market);

  const indices = market === 'tw' ? TW_INDICES : US_INDICES;
  const sectors = market === 'tw' ? TW_SECTORS : US_SECTORS;
  const gainers = market === 'tw' ? TW_GAINERS : US_GAINERS;
  const losers  = market === 'tw' ? TW_LOSERS  : US_LOSERS;

  const moverCols: Column<Mover>[] = [
    { key:'symbol', header:'標的',
      render:(r)=>(
        <button onClick={()=>navigate(`/analytics/symbol/${market}/${r.symbol}`)}
                style={{background:'none',border:'none',cursor:'pointer',color:'#58a6ff',fontWeight:600,fontSize:13}}>
          {r.symbol}
        </button>
      )},
    {key:'name',  header:'名稱', render:(r)=><span className="text-xs" style={{color:'var(--color-text-2)'}}>{r.name}</span>},
    {key:'price', header:'價格', align:'right', render:(r)=><span className="num text-xs">{r.price}</span>},
    {key:'change',header:'漲跌', align:'right',
      render:(r)=><PnlText value={parseFloat(r.change)} suffix="%" />},
    {key:'volume',header:'量比', align:'right',
      render:(r)=><span className="num text-xs" style={{color:'#d29922'}}>{r.volume}</span>},
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="數據分析" subtitle={market==='tw'?'台灣股市':'US Market'} />

        {/* Quick stock search */}
        <div ref={searchRef} style={{ position:'relative' }}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const trimmed = searchInput.trim().toUpperCase();
            if (!trimmed) return;
            const found = ALL_SYMBOLS.find(s => s.code === trimmed);
            goToSymbol(trimmed, found?.market ?? (/^\d{4}$/.test(trimmed) ? 'tw' : 'us'));
          }} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
              <Search size={13} style={{ position:'absolute', left:8, color:'var(--color-text-2)', pointerEvents:'none' }} />
              <input
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={market==='tw' ? '輸入台股代號…' : 'Enter symbol…'}
                style={{
                  paddingLeft:28, paddingRight:8, paddingTop:6, paddingBottom:6,
                  width:160, fontSize:13, borderRadius:6,
                  background:'var(--color-bg)', border:'1px solid var(--color-border)',
                  color:'var(--color-text)', outline:'none',
                }}
              />
            </div>
            <button type="submit"
                    style={{
                      padding:'6px 12px', fontSize:12, borderRadius:6, cursor:'pointer',
                      background:'#58a6ff', color:'#fff', border:'none', fontWeight:600,
                    }}>
              查詢
            </button>
          </form>

          {showSuggestions && filteredSymbols.length > 0 && (
            <div style={{
              position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:50, minWidth:190,
              background:'var(--color-card)', border:'1px solid var(--color-border)',
              borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,0.3)', overflow:'hidden',
            }}>
              {filteredSymbols.map((s) => (
                <button key={s.code}
                        onClick={() => goToSymbol(s.code, s.market)}
                        style={{
                          display:'flex', alignItems:'center', gap:8,
                          width:'100%', padding:'7px 12px', textAlign:'left',
                          background:'none', border:'none', cursor:'pointer',
                          borderBottom:'1px solid var(--color-border)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize:13, fontWeight:700, color:'#58a6ff', minWidth:40 }}>{s.code}</span>
                  <span style={{ fontSize:12, color:'var(--color-text-2)' }}>{s.name}</span>
                  <span style={{ fontSize:10, color:'var(--color-text-2)', marginLeft:'auto' }}>
                    {s.market === 'tw' ? '🇹🇼' : '🇺🇸'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'market' && (
        <>
          {/* Index cards */}
          <div className="flex gap-3 flex-wrap">
            {indices.map((idx) => (
              <div key={idx.name} className="rounded-lg px-5 py-3 flex items-center gap-5 flex-1 min-w-[160px]"
                   style={{background:'var(--color-card)',border:'1px solid var(--color-border)'}}>
                <div>
                  <div className="text-xs mb-0.5" style={{color:'var(--color-text-2)'}}>{idx.name}</div>
                  <div className="text-lg font-bold num" style={{color:'var(--color-text)'}}>{idx.value}</div>
                </div>
                <div className={`text-sm font-semibold num ${idx.up?'text-up':'text-down'}`}>
                  {idx.pct}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            {/* Sector heatmap */}
            <SectionCard title="板塊熱力圖" style={{flex:2}}>
              <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${market==='tw'?4:3},1fr)`}}>
                {sectors.map((s) => {
                  const intensity = Math.min(Math.abs(s.ret) / 3, 1);
                  const bg = s.ret >= 0
                    ? `rgba(63,185,80,${0.1 + intensity*0.55})`
                    : `rgba(248,81,73,${0.1 + intensity*0.55})`;
                  return (
                    <div key={s.name} className="rounded-md text-center py-4 px-2"
                         style={{background:bg, cursor:'default'}}>
                      <div className="text-xs font-medium" style={{color:'var(--color-text)'}}>{s.name}</div>
                      <div className={`text-xs font-semibold num mt-0.5 ${s.ret>=0?'text-up':'text-down'}`}>
                        {s.ret>=0?'+':''}{s.ret}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* Top movers */}
            <div className="flex flex-col gap-3" style={{flex:1,minWidth:220}}>
              <SectionCard title={`漲幅前 ${gainers.length}`}>
                <DataTable columns={moverCols} data={gainers} rowKey={(r)=>r.symbol} emptyText="—" />
              </SectionCard>
              <SectionCard title={`跌幅前 ${losers.length}`}>
                <DataTable columns={moverCols} data={losers} rowKey={(r)=>r.symbol} emptyText="—" />
              </SectionCard>
            </div>
          </div>

          {/* Volume bar chart */}
          <SectionCard title="板塊漲跌幅 (%)">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={sectors} margin={{top:4,right:4,bottom:0,left:0}}>
                <XAxis dataKey="name" stroke="var(--color-text-2)" tick={{fontSize:10}} />
                <YAxis stroke="var(--color-text-2)" tick={{fontSize:10}} tickFormatter={(v)=>`${v}%`} width={36}/>
                <Tooltip
                  contentStyle={{background:'var(--color-card)',border:'1px solid var(--color-border)',borderRadius:6,fontSize:12}}
                  formatter={(v:number)=>[`${v}%`,'漲跌幅']} />
                <Bar dataKey="ret" radius={[3,3,0,0]}>
                  {sectors.map((s) => <Cell key={s.name} fill={s.ret>=0?'#3fb950':'#f85149'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </>
      )}

      {tab === 'screener' && (
        <SectionCard title="篩選器">
          <p className="text-sm py-8 text-center" style={{color:'var(--color-text-2)'}}>
            篩選器開發中 — 請使用頂部導覽前往 /analytics/screener
          </p>
        </SectionCard>
      )}
    </div>
  );
}
