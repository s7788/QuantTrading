import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Save, X } from 'lucide-react';
import { PageHeader, SectionCard, DataTable, Badge, PnlText } from '@/components/common';
import type { Column } from '@/components/common/DataTable';
import { useAppStore } from '@/stores/appStore';

type CondType = 'rsi_lt' | 'rsi_gt' | 'vol_ratio' | 'pct_change' | 'price_lt' | 'price_gt' | 'ma_cross';
interface Cond { id: string; type: CondType; label: string; value: string; }

const COND_OPTIONS: { type: CondType; label: string; defaultVal: string }[] = [
  { type:'rsi_lt',    label:'RSI <',          defaultVal:'30' },
  { type:'rsi_gt',    label:'RSI >',          defaultVal:'70' },
  { type:'vol_ratio', label:'成交量 > 均量 ×', defaultVal:'1.5' },
  { type:'pct_change',label:'漲跌幅 %',        defaultVal:'-3' },
  { type:'price_lt',  label:'價格 <',          defaultVal:'100' },
  { type:'price_gt',  label:'價格 >',          defaultVal:'500' },
  { type:'ma_cross',  label:'均線交叉',         defaultVal:'黃金交叉' },
];

interface Result { symbol:string; name:string; price:number; change:number; rsi:number; volRatio:number; signal:string; }

const TW_RESULTS: Result[] = [
  {symbol:'2330',name:'台積電',   price:878,  change:3.8,  rsi:28.2, volRatio:2.1, signal:'RSI超賣'},
  {symbol:'2454',name:'聯發科',   price:1320, change:3.2,  rsi:31.5, volRatio:1.8, signal:'均線交叉'},
  {symbol:'2317',name:'鴻海',     price:112,  change:-2.1, rsi:68.3, volRatio:1.5, signal:'RSI超買'},
  {symbol:'2382',name:'廣達',     price:302,  change:2.7,  rsi:25.1, volRatio:2.4, signal:'RSI超賣'},
  {symbol:'2886',name:'兆豐金',   price:38.2, change:-1.8, rsi:72.1, volRatio:1.2, signal:'RSI超買'},
];
const US_RESULTS: Result[] = [
  {symbol:'AMD', name:'AMD Inc.',  price:165, change:5.3,  rsi:27.5, volRatio:2.3, signal:'RSI超賣'},
  {symbol:'PLTR',name:'Palantir', price:22.8,change:-3.1, rsi:24.2, volRatio:3.1, signal:'RSI超賣'},
  {symbol:'SQ',  name:'Block',    price:78.5,change:7.2,  rsi:72.8, volRatio:1.8, signal:'RSI超買'},
  {symbol:'SOFI',name:'SoFi Tech',price:8.9, change:-2.5, rsi:31.2, volRatio:2.5, signal:'接近超賣'},
];

const SIGNAL_VARIANT: Record<string,'green'|'red'|'yellow'|'blue'> = {
  'RSI超賣':'green','RSI超買':'red','均線交叉':'blue','接近超賣':'yellow',
};

export default function ScreenerPage() {
  const navigate = useNavigate();
  const { market } = useAppStore();
  const [conditions, setConditions] = useState<Cond[]>([
    { id:'c1', type:'rsi_lt',    label:'RSI <',          value:'30'  },
    { id:'c2', type:'vol_ratio', label:'成交量 > 均量 ×', value:'1.5' },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [ran, setRan] = useState(true);

  const results = market === 'tw' ? TW_RESULTS : US_RESULTS;

  const addCond = (opt: typeof COND_OPTIONS[0]) => {
    setConditions((prev) => [...prev, {
      id: `c${Date.now()}`, type: opt.type, label: opt.label, value: opt.defaultVal,
    }]);
    setShowAdd(false);
    setRan(false);
  };
  const removeCond = (id: string) => setConditions((prev) => prev.filter((c) => c.id !== id));

  const resultCols: Column<Result>[] = [
    { key:'symbol', header:'標的',
      render: (r) => (
        <button onClick={() => navigate(`/analytics/symbol/${market}/${r.symbol}`)}
                style={{color:'#58a6ff',fontWeight:600,fontSize:13,background:'none',border:'none',cursor:'pointer'}}>
          {r.symbol}
        </button>
      )},
    { key:'name',   header:'名稱',   render:(r)=><span className="text-xs" style={{color:'var(--color-text-2)'}}>{r.name}</span> },
    { key:'price',  header:'現價',   align:'right', sortable:true,
      render:(r)=><span className="num">{r.price.toLocaleString()}</span> },
    { key:'change', header:'漲跌%',  align:'right', sortable:true,
      render:(r)=><PnlText value={r.change} suffix="%" /> },
    { key:'rsi',    header:'RSI',    align:'right', sortable:true,
      render:(r)=>(
        <span className="num font-medium" style={{color:r.rsi<30?'#3fb950':r.rsi>70?'#f85149':'var(--color-text)'}}>
          {r.rsi}
        </span>
      )},
    { key:'volRatio',header:'量比',  align:'right', sortable:true,
      render:(r)=><span className="num" style={{color:'#d29922'}}>{r.volRatio}x</span> },
    { key:'signal', header:'信號',
      render:(r)=><Badge variant={SIGNAL_VARIANT[r.signal]??'gray'}>{r.signal}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="篩選器" subtitle={`${market==='tw'?'台股':'美股'} · 自訂條件篩選標的`} />

      {/* Condition builder */}
      <SectionCard title="篩選條件"
        actions={
          <button onClick={() => setShowAdd(!showAdd)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{background:'#58a6ff22',color:'#58a6ff',border:'1px solid #58a6ff44',cursor:'pointer'}}>
            <Plus size={12}/> 新增條件
          </button>
        }>
        <div className="flex flex-wrap gap-2 mb-3">
          {conditions.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                 style={{background:'var(--color-bg)',border:'1px solid var(--color-border)'}}>
              <span style={{color:'var(--color-text)'}}>{c.label}</span>
              <input value={c.value}
                     onChange={(e) => setConditions((prev) => prev.map((x) => x.id===c.id ? {...x,value:e.target.value} : x))}
                     className="w-16 text-center num font-semibold"
                     style={{background:'transparent',border:'none',color:'#58a6ff',outline:'none',fontSize:12}} />
              <button onClick={() => removeCond(c.id)}
                      style={{background:'none',border:'none',color:'var(--color-text-2)',cursor:'pointer',padding:0}}>
                <X size={12}/>
              </button>
            </div>
          ))}
          {conditions.length === 0 && (
            <p className="text-xs py-1" style={{color:'var(--color-text-2)'}}>尚無篩選條件 — 點「新增條件」開始</p>
          )}
        </div>

        {/* Condition picker dropdown */}
        {showAdd && (
          <div className="grid gap-1.5 mb-3" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
            {COND_OPTIONS.map((opt) => (
              <button key={opt.type} onClick={() => addCond(opt)}
                      className="text-left px-3 py-2 rounded text-xs transition-colors"
                      style={{background:'var(--color-bg)',border:'1px solid var(--color-border)',
                              color:'var(--color-text)',cursor:'pointer'}}
                      onMouseEnter={(e)=>e.currentTarget.style.borderColor='#58a6ff'}
                      onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--color-border)'}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => setRan(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold"
                  style={{background:'#58a6ff',color:'#fff',border:'none',cursor:'pointer'}}>
            <Play size={13}/> 執行篩選
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded text-sm"
                  style={{background:'transparent',border:'1px solid var(--color-border)',color:'var(--color-text-2)',cursor:'pointer'}}>
            <Save size={13}/> 儲存篩選器
          </button>
        </div>
      </SectionCard>

      {/* Results */}
      {ran && (
        <SectionCard title={`篩選結果 — ${results.length} 個標的`}>
          <DataTable columns={resultCols} data={results} rowKey={(r)=>r.symbol}
            onRowClick={(r) => navigate(`/analytics/symbol/${market}/${r.symbol}`)}
            emptyText="無符合條件的標的" />
        </SectionCard>
      )}
    </div>
  );
}
