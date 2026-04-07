import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { RefreshCw, Search } from 'lucide-react';
import { PageHeader, SectionCard, TabBar, Badge, DataTable, PnlText } from '@/components/common';
import type { Column } from '@/components/common/DataTable';
import { useAppStore } from '@/stores/appStore';
import { getMarketOverview } from '@/services/api';

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface MoverData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

const TW_SECTORS = [
  { name:'半導體',ret:0},{name:'電子零組件',ret:0},{name:'電腦周邊',ret:0},
  {name:'光電',  ret:0},{name:'通信網路',  ret:0},{name:'電子通路',ret:0},
  {name:'金融保險',ret:0},{name:'建材營造',ret:0},{name:'食品',ret:0},
  {name:'生技醫療',ret:0},{name:'塑膠',ret:0},{name:'航運',ret:0},
];
const US_SECTORS = [
  {name:'Tech',ret:0},{name:'Healthcare',ret:0},{name:'Financials',ret:0},
  {name:'Energy',ret:0},{name:'Consumer',ret:0},{name:'Industrials',ret:0},
  {name:'Materials',ret:0},{name:'Utilities',ret:0},{name:'RE',ret:0},
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

function fmtPrice(price: number, isUS: boolean): string {
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return price.toFixed(2);
}

export default function MarketOverviewPage() {
  const navigate = useNavigate();
  const { market } = useAppStore();
  const [tab, setTab] = useState('market');
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [gainers, setGainers] = useState<MoverData[]>([]);
  const [losers, setLosers] = useState<MoverData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
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

  const isUS = market === 'us';
  const sectors = isUS ? US_SECTORS : TW_SECTORS;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getMarketOverview(market) as any;
      const data = res?.data ?? res;
      setIndices(data.indices ?? []);
      setGainers(data.topGainers ?? []);
      setLosers(data.topLosers ?? []);
      setLastUpdate(new Date().toLocaleTimeString('zh-TW'));
    } catch (err) {
      console.error('[MarketOverview] fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [market]);

  const moverCols: Column<MoverData>[] = [
    { key:'symbol', header:'標的',
      render:(r)=>(
        <button onClick={()=>navigate(`/analytics/symbol/${market}/${r.symbol}`)}
                style={{background:'none',border:'none',cursor:'pointer',color:'#58a6ff',fontWeight:600,fontSize:13}}>
          {r.symbol}
        </button>
      )},
    {key:'name',  header:'名稱', render:(r)=><span className="text-xs" style={{color:'var(--color-text-2)'}}>{r.name}</span>},
    {key:'price', header:'價格', align:'right', render:(r)=><span className="num text-xs">{fmtPrice(r.price, isUS)}</span>},
    {key:'changePercent',header:'漲跌', align:'right',
      render:(r)=><PnlText value={r.changePercent} suffix="%" />},
    {key:'volume',header:'成交量', align:'right',
      render:(r)=><span className="num text-xs" style={{color:'#d29922'}}>{r.volume > 0 ? (r.volume / 1000).toFixed(0) + 'K' : '—'}</span>},
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader
          title="數據分析"
          subtitle={
            <span className="flex items-center gap-2">
              {isUS ? 'US Market' : '台灣股市'}
              {lastUpdate && <span className="text-xs" style={{color:'var(--color-text-2)'}}>更新: {lastUpdate}</span>}
              <button onClick={fetchData} disabled={loading}
                      style={{background:'none',border:'none',cursor:'pointer',color:'var(--color-text-2)',padding:0}}>
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </span>
          }
        />

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
            {loading && indices.length === 0 ? (
              <div className="text-xs py-4" style={{color:'var(--color-text-2)'}}>載入中...</div>
            ) : indices.length === 0 ? (
              <div className="text-xs py-4" style={{color:'var(--color-text-2)'}}>無法取得指數資料</div>
            ) : (
              indices.map((idx) => (
                <div key={idx.symbol} className="rounded-lg px-5 py-3 flex items-center gap-5 flex-1 min-w-[160px]"
                     style={{background:'var(--color-card)',border:'1px solid var(--color-border)'}}>
                  <div>
                    <div className="text-xs mb-0.5" style={{color:'var(--color-text-2)'}}>{idx.name}</div>
                    <div className="text-lg font-bold num" style={{color:'var(--color-text)'}}>
                      {fmtPrice(idx.price, isUS)}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold num ${idx.changePercent >= 0 ? 'text-up' : 'text-down'}`}>
                    {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-4">
            {/* Sector heatmap (static placeholder) */}
            <SectionCard title="板塊熱力圖" style={{flex:2}}>
              <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${isUS?3:4},1fr)`}}>
                {sectors.map((s) => (
                  <div key={s.name} className="rounded-md text-center py-4 px-2"
                       style={{background:'rgba(88,166,255,0.07)', cursor:'default'}}>
                    <div className="text-xs font-medium" style={{color:'var(--color-text)'}}>{s.name}</div>
                    <div className="text-xs mt-0.5" style={{color:'var(--color-text-2)'}}>—</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Top movers */}
            <div className="flex flex-col gap-3" style={{flex:1,minWidth:220}}>
              <SectionCard title={`漲幅前 ${gainers.length}`}>
                <DataTable columns={moverCols} data={gainers} rowKey={(r)=>r.symbol} emptyText={loading ? '載入中...' : '—'} />
              </SectionCard>
              <SectionCard title={`跌幅前 ${losers.length}`}>
                <DataTable columns={moverCols} data={losers} rowKey={(r)=>r.symbol} emptyText={loading ? '載入中...' : '—'} />
              </SectionCard>
            </div>
          </div>

          {/* Volume bar chart — shown when sector data available */}
          {sectors.some((s) => s.ret !== 0) && (
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
          )}
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
