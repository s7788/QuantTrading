import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { PageHeader, SectionCard, TabBar, DataTable, PnlText } from '@/components/common';
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
