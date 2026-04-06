import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line,
} from 'recharts';
import { ArrowLeft, Download, GitCompare } from 'lucide-react';
import { StatCard, SectionCard, DataTable, PnlText, TabBar, Badge } from '@/components/common';
import type { Column } from '@/components/common/DataTable';

// ── Mock result data ──────────────────────────────────────────
const equity = Array.from({ length: 100 }, (_, i) => ({
  day: `D${i + 1}`,
  value:     Math.round(1_000_000 + i * 5_200 + Math.sin(i * 0.3) * 55_000),
  benchmark: Math.round(1_000_000 + i * 2_900 + Math.sin(i * 0.18) * 25_000),
  drawdown:  Math.round(Math.min(0, -Math.abs(Math.sin(i * 0.3) * 55_000) * 0.25)),
}));

const monthly = [
  {m:'Jan',ret:2.3},{m:'Feb',ret:-1.1},{m:'Mar',ret:4.5},{m:'Apr',ret:0.8},
  {m:'May',ret:-2.3},{m:'Jun',ret:3.7},{m:'Jul',ret:1.2},{m:'Aug',ret:-0.5},
  {m:'Sep',ret:2.8},{m:'Oct',ret:-1.8},{m:'Nov',ret:5.1},{m:'Dec',ret:3.2},
];

interface TradeRow { id:string; date:string; symbol:string; dir:string; qty:number; entry:number; exit:number; pnl:number; pct:number; days:number; }
const trades: TradeRow[] = [
  {id:'1',date:'2024-03-15',symbol:'2330',dir:'多',qty:500,entry:750,exit:820,pnl:35_000,pct:9.33,days:12},
  {id:'2',date:'2024-05-02',symbol:'2454',dir:'多',qty:200,entry:1100,exit:1180,pnl:16_000,pct:7.27,days:8},
  {id:'3',date:'2024-07-10',symbol:'2330',dir:'多',qty:300,entry:830,exit:800,pnl:-9_000,pct:-3.61,days:5},
  {id:'4',date:'2024-09-20',symbol:'2317',dir:'空',qty:1000,entry:120,exit:108,pnl:12_000,pct:10.0,days:15},
  {id:'5',date:'2024-11-05',symbol:'2454',dir:'多',qty:100,entry:1200,exit:1350,pnl:15_000,pct:12.5,days:20},
];

const TABS = [{key:'overview',label:'總覽'},{key:'trades',label:'交易明細'},{key:'monthly',label:'月報酬率'}];

export default function BacktestResultPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const tradeCols: Column<TradeRow>[] = [
    {key:'date',   header:'日期',   render:(r)=><span className="num text-xs" style={{color:'var(--color-text-2)'}}>{r.date}</span>},
    {key:'symbol', header:'標的',   render:(r)=><span className="font-semibold">{r.symbol}</span>},
    {key:'dir',    header:'方向',   render:(r)=><Badge variant={r.dir==='多'?'green':'red'}>{r.dir}</Badge>},
    {key:'qty',    header:'數量',   align:'right', render:(r)=><span className="num">{r.qty.toLocaleString()}</span>},
    {key:'entry',  header:'進場價', align:'right', render:(r)=><span className="num">{r.entry.toLocaleString()}</span>},
    {key:'exit',   header:'出場價', align:'right', render:(r)=><span className="num">{r.exit.toLocaleString()}</span>},
    {key:'pct',    header:'損益 %', align:'right', sortable:true, render:(r)=><PnlText value={r.pct} suffix="%" />},
    {key:'pnl',    header:'損益金額', align:'right', sortable:true,
     render:(r)=><span className="num" style={{color:r.pnl>=0?'#3fb950':'#f85149'}}>{r.pnl>=0?'+':''}NT${r.pnl.toLocaleString()}</span>},
    {key:'days',   header:'持有天', align:'right', render:(r)=><span className="num text-xs" style={{color:'var(--color-text-2)'}}>{r.days}</span>},
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/backtest/history')}
                className="flex items-center gap-1.5 text-sm"
                style={{color:'var(--color-text-2)',background:'none',border:'none',cursor:'pointer'}}>
          <ArrowLeft size={15}/> 返回
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{color:'var(--color-text)'}}>TW動量策略 — 回測結果</h1>
          <p className="text-xs" style={{color:'var(--color-text-2)'}}>2024-01-01 ~ 2025-12-31 · 日線 · 初始資金 NT$1,000,000</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{color:'var(--color-text-2)',border:'1px solid var(--color-border)',background:'transparent',cursor:'pointer'}}>
            <GitCompare size={13}/> 比較
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{color:'var(--color-text-2)',border:'1px solid var(--color-border)',background:'transparent',cursor:'pointer'}}>
            <Download size={13}/> 匯出
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="總報酬率"  value="+28.5%"  trend="up"   sub="vs 基準 +14.2%" />
        <StatCard label="年化報酬"  value="+18.2%"  trend="up"   sub="CAGR" />
        <StatCard label="最大回撤"  value="-12.3%"  trend="down" sub="持續 23 天" />
        <StatCard label="Sharpe"   value="1.45"               sub="無風險利率 4%" />
        <StatCard label="勝率"     value="65.2%"  trend="up"   sub="128勝 / 68負" />
        <StatCard label="盈虧比"   value="1.85"               sub="平均獲利 / 平均虧損" />
        <StatCard label="交易次數"  value="196"                sub="平均持倉 8.2 天" />
        <StatCard label="最大連虧" value="4 次"               sub="連續虧損" />
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Equity curve */}
          <SectionCard title="權益曲線 vs 基準">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={equity} margin={{top:4,right:4,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="btEq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3fb950" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/>
                <XAxis dataKey="day" stroke="var(--color-text-2)" tick={{fontSize:10}} interval={14}/>
                <YAxis stroke="var(--color-text-2)" tick={{fontSize:10}} width={50}
                       tickFormatter={(v)=>`${(v/10000).toFixed(0)}萬`}/>
                <Tooltip
                  contentStyle={{background:'var(--color-card)',border:'1px solid var(--color-border)',borderRadius:6,fontSize:12}}
                  formatter={(v:number,n:string)=>[`NT$${v.toLocaleString()}`,n==='value'?'策略':'基準']}/>
                <Area type="monotone" dataKey="value"     stroke="#3fb950" fill="url(#btEq)" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="benchmark" stroke="var(--color-text-2)" strokeWidth={1} strokeDasharray="4 4" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Drawdown + Monthly side by side */}
          <div className="flex gap-4">
            <SectionCard title="回撤曲線" style={{flex:1}}>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={equity} margin={{top:4,right:4,bottom:0,left:0}}>
                  <defs>
                    <linearGradient id="dd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f85149" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f85149" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="var(--color-text-2)" tick={{fontSize:10}} interval={14}/>
                  <YAxis stroke="var(--color-text-2)" tick={{fontSize:10}} tickFormatter={(v)=>`${v/1000}K`} width={40}/>
                  <Tooltip contentStyle={{background:'var(--color-card)',border:'1px solid var(--color-border)',borderRadius:6,fontSize:12}}/>
                  <Area type="monotone" dataKey="drawdown" stroke="#f85149" fill="url(#dd)" strokeWidth={1.5} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="月報酬率" style={{flex:1}}>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={monthly} margin={{top:4,right:4,bottom:0,left:0}}>
                  <XAxis dataKey="m" stroke="var(--color-text-2)" tick={{fontSize:10}}/>
                  <YAxis stroke="var(--color-text-2)" tick={{fontSize:10}} tickFormatter={(v)=>`${v}%`} width={32}/>
                  <Tooltip contentStyle={{background:'var(--color-card)',border:'1px solid var(--color-border)',borderRadius:6,fontSize:12}}
                           formatter={(v:number)=>[`${v}%`,'報酬率']}/>
                  <Bar dataKey="ret" radius={[3,3,0,0]}>
                    {monthly.map((m)=><Cell key={m.m} fill={m.ret>=0?'#3fb950':'#f85149'}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'trades' && (
        <SectionCard title="交易明細"
          actions={
            <button className="flex items-center gap-1.5 text-xs px-3 py-1 rounded"
                    style={{color:'#58a6ff',border:'1px solid var(--color-border)',background:'transparent',cursor:'pointer'}}>
              <Download size={12}/> CSV
            </button>
          }>
          <DataTable columns={tradeCols} data={trades} rowKey={(r)=>r.id}
            emptyText="無交易記錄" />
        </SectionCard>
      )}

      {tab === 'monthly' && (
        <SectionCard title="月報酬率明細">
          <div className="grid gap-2" style={{gridTemplateColumns:'repeat(6,1fr)'}}>
            {monthly.map((m) => (
              <div key={m.m} className="rounded-lg py-3 text-center"
                   style={{background: m.ret>=0?`rgba(63,185,80,${0.1+Math.abs(m.ret)/6*0.5})`:`rgba(248,81,73,${0.1+Math.abs(m.ret)/6*0.5})`}}>
                <div className="text-xs" style={{color:'var(--color-text-2)'}}>{m.m}</div>
                <div className={`text-sm font-semibold num ${m.ret>=0?'text-up':'text-down'}`}>
                  {m.ret>=0?'+':''}{m.ret}%
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
