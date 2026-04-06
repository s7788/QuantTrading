import { useState } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import {
  LayoutDashboard, FlaskConical, Bot, Search as SearchIcon, BarChart3,
  Settings, Bell, Moon, Sun, ChevronLeft, ChevronRight, TrendingUp,
  TrendingDown, Activity, Play, Pause, Square, Eye, Edit3, Copy,
  Trash2, Plus, Download, Filter, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Info, XCircle, Clock, Zap, Target, Layers
} from "lucide-react";

// Mock Data
const equityData = Array.from({ length: 60 }, (_, i) => {
  const base = 1000000;
  const noise = Math.sin(i * 0.3) * 50000 + Math.random() * 30000;
  const trend = i * 5000;
  const val = base + trend + noise;
  const bench = base + i * 3000 + Math.sin(i * 0.2) * 20000;
  return { day: `D${i + 1}`, value: Math.round(val), benchmark: Math.round(bench), drawdown: Math.round(Math.min(0, -Math.abs(noise) * 0.3)) };
});

const positions = [
  { symbol: "TSLA", name: "Tesla Inc.", dir: "多", qty: 50, cost: 238.5, price: 245.3, pnl: 3.85, weight: 12.3, strategy: "MomentumA" },
  { symbol: "BTC", name: "Bitcoin", dir: "空", qty: 0.5, cost: 68200, price: 67230, pnl: 1.42, weight: 8.5, strategy: "PairTrade" },
  { symbol: "AAPL", name: "Apple Inc.", dir: "多", qty: 100, cost: 172.8, price: 178.2, pnl: 3.13, weight: 15.2, strategy: "MomentumA" },
  { symbol: "ETH", name: "Ethereum", dir: "多", qty: 5, cost: 3420, price: 3380, pnl: -1.17, weight: 5.1, strategy: "PairTrade" },
  { symbol: "NVDA", name: "NVIDIA Corp.", dir: "多", qty: 30, cost: 820, price: 875.4, pnl: 6.76, weight: 18.7, strategy: "TrendFollower" },
];

const trades = [
  { time: "14:32:05", symbol: "TSLA", dir: "買入", qty: 10, price: 245.3, pnl: null, strategy: "MomentumA" },
  { time: "14:28:12", symbol: "BTC", dir: "賣出", qty: 0.5, price: 67230, pnl: "+3.2%", strategy: "PairTrade" },
  { time: "13:45:30", symbol: "NVDA", dir: "買入", qty: 15, price: 872.1, pnl: null, strategy: "TrendFollower" },
  { time: "11:22:18", symbol: "AAPL", dir: "賣出", qty: 50, price: 177.8, pnl: "+2.1%", strategy: "MomentumA" },
  { time: "10:05:44", symbol: "ETH", dir: "買入", qty: 2, price: 3405, pnl: null, strategy: "PairTrade" },
];

const strategies = [
  { name: "MA Cross Strategy", status: "running", type: "趨勢追蹤", symbols: "TSLA, AAPL, GOOGL", todayPnl: "+$1,230", pct: "+0.8%", sparkline: [3, 5, 4, 7, 6, 8, 9, 7, 10, 12] },
  { name: "RSI Reversal", status: "paused", type: "均值回歸", symbols: "BTC, ETH", todayPnl: "-$340", pct: "-0.3%", sparkline: [5, 4, 6, 3, 5, 4, 3, 4, 3, 2] },
  { name: "Pairs Trading v2", status: "draft", type: "套利", symbols: "-", todayPnl: "-", pct: "-", sparkline: [] },
  { name: "Bollinger Breakout", status: "running", type: "突破", symbols: "SPY, QQQ", todayPnl: "+$567", pct: "+0.4%", sparkline: [2, 3, 4, 3, 5, 6, 5, 7, 6, 8] },
  { name: "Mean Reversion Alpha", status: "stopped", type: "均值回歸", symbols: "AAPL, MSFT", todayPnl: "-", pct: "-", sparkline: [8, 7, 5, 6, 4, 3, 5, 4, 2, 3] },
];

const alerts = [
  { level: "error", msg: "策略 PairTrade 連線中斷", time: "14:35", strategy: "PairTrade" },
  { level: "warning", msg: "ETH 回撤達 -5.2%，接近閾值", time: "14:20", strategy: "PairTrade" },
  { level: "info", msg: "MomentumA 完成 TSLA 買入 10 股", time: "14:32", strategy: "MomentumA" },
  { level: "warning", msg: "BTC 波動率突破歷史 95 百分位", time: "13:50", strategy: "-" },
];

const monthlyReturns = [
  { month: "Jan", ret: 2.3 }, { month: "Feb", ret: -1.1 }, { month: "Mar", ret: 4.5 },
  { month: "Apr", ret: 0.8 }, { month: "May", ret: -2.3 }, { month: "Jun", ret: 3.7 },
  { month: "Jul", ret: 1.2 }, { month: "Aug", ret: -0.5 }, { month: "Sep", ret: 2.8 },
  { month: "Oct", ret: -1.8 }, { month: "Nov", ret: 5.1 }, { month: "Dec", ret: 3.2 },
];

const heatmapData = [
  [2.3, -1.1, 4.5, 0.8, -2.3, 3.7, 1.2, -0.5, 2.8, -1.8, 5.1, 3.2],
  [1.5, 3.2, -0.8, 2.1, 1.7, -1.3, 4.2, 0.3, -2.1, 3.8, 1.9, 2.7],
];

const screenResults = [
  { symbol: "AMD", name: "AMD Inc.", price: 165.2, change: 5.3, rsi: 28.5, volume: "2.3x", signal: "超賣" },
  { symbol: "PLTR", name: "Palantir", price: 22.8, change: -3.1, rsi: 24.2, volume: "3.1x", signal: "超賣" },
  { symbol: "SQ", name: "Block Inc.", price: 78.5, change: 7.2, rsi: 72.8, volume: "1.8x", signal: "突破" },
  { symbol: "SOFI", name: "SoFi Tech", price: 8.9, change: -2.5, rsi: 31.2, volume: "2.5x", signal: "接近超賣" },
];

// Theme
const dark = {
  bg: "#0f1117", sidebar: "#161b22", card: "#1c2128", text: "#e6edf3",
  textSec: "#7d8590", green: "#3fb950", red: "#f85149", blue: "#58a6ff",
  yellow: "#d29922", border: "#30363d", hover: "#262c36"
};

// Components
const StatCard = ({ label, value, sub, trend }) => (
  <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: "14px 18px", flex: 1, minWidth: 140, cursor: "pointer", transition: "border-color 0.2s" }}
    onMouseEnter={e => e.currentTarget.style.borderColor = dark.blue}
    onMouseLeave={e => e.currentTarget.style.borderColor = dark.border}>
    <div style={{ color: dark.textSec, fontSize: 12, marginBottom: 4 }}>{label}</div>
    <div style={{ color: dark.text, fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    {sub && <div style={{ color: trend === "up" ? dark.green : trend === "down" ? dark.red : dark.textSec, fontSize: 12, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
      {trend === "up" && <ArrowUpRight size={12} />}{trend === "down" && <ArrowDownRight size={12} />}{sub}
    </div>}
  </div>
);

const Badge = ({ children, color }) => (
  <span style={{ background: `${color}22`, color, fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 500 }}>{children}</span>
);

const MiniSparkline = ({ data, color }) => {
  if (!data.length) return <span style={{ color: dark.textSec, fontSize: 11 }}>N/A</span>;
  const max = Math.max(...data), min = Math.min(...data), h = 24, w = 60;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  return <svg width={w} height={h}><polyline points={points} fill="none" stroke={color} strokeWidth={1.5} /></svg>;
};

const AlertItem = ({ alert }) => {
  const colors = { error: dark.red, warning: dark.yellow, info: dark.blue };
  const icons = { error: <XCircle size={14} />, warning: <AlertTriangle size={14} />, info: <Info size={14} /> };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${dark.border}` }}>
      <span style={{ color: colors[alert.level], marginTop: 2 }}>{icons[alert.level]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: dark.text, fontSize: 13 }}>{alert.msg}</div>
        <div style={{ color: dark.textSec, fontSize: 11, marginTop: 2 }}>{alert.time} · {alert.strategy}</div>
      </div>
    </div>
  );
};

// Pages
const DashboardPage = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <StatCard label="總資產淨值" value="$1,284,560" sub="+$12,340 (+0.97%)" trend="up" />
      <StatCard label="今日損益" value="+$8,230" sub="已實現 $5,100 / 未實現 $3,130" trend="up" />
      <StatCard label="持倉數量" value="5" sub="3多 / 2空" />
      <StatCard label="運行中策略" value="2 / 5" sub="2 運行中" />
      <StatCard label="今日交易" value="12" sub="8 買 / 4 賣" />
      <StatCard label="今日勝率" value="66.7%" sub="4勝 2負" trend="up" />
    </div>

    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: 3, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: dark.text, fontWeight: 600, fontSize: 15 }}>權益曲線</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["今日", "本週", "本月", "本季", "本年"].map((t, i) => (
              <button key={t} style={{ background: i === 2 ? dark.blue + "33" : "transparent", color: i === 2 ? dark.blue : dark.textSec, border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>{t}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={equityData}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={dark.blue} stopOpacity={0.3} />
                <stop offset="95%" stopColor={dark.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={dark.border} />
            <XAxis dataKey="day" stroke={dark.textSec} tick={{ fontSize: 11 }} interval={9} />
            <YAxis stroke={dark.textSec} tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e6).toFixed(1)}M`} />
            <Tooltip contentStyle={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 6, fontSize: 12 }} labelStyle={{ color: dark.textSec }} />
            <Area type="monotone" dataKey="value" stroke={dark.blue} fill="url(#g1)" strokeWidth={2} name="淨值" />
            <Line type="monotone" dataKey="benchmark" stroke={dark.textSec} strokeWidth={1} strokeDasharray="4 4" dot={false} name="基準" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ flex: 1, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16, minWidth: 180 }}>
        <div style={{ color: dark.text, fontWeight: 600, fontSize: 15, marginBottom: 12 }}>績效指標</div>
        {[["總報酬率", "+28.5%", dark.green], ["年化報酬", "+18.2%", dark.green], ["最大回撤", "-12.3%", dark.red], ["Sharpe", "1.45", dark.blue], ["Sortino", "1.82", dark.blue], ["Calmar", "1.48", dark.blue]].map(([k, v, c]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${dark.border}` }}>
            <span style={{ color: dark.textSec, fontSize: 13 }}>{k}</span>
            <span style={{ color: c, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>

    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: 2, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ color: dark.text, fontWeight: 600, fontSize: 15, marginBottom: 12 }}>持倉列表</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${dark.border}` }}>
                {["標的", "方向", "數量", "成本", "現價", "未實現損益", "佔比", "策略"].map(h => (
                  <th key={h} style={{ color: dark.textSec, fontWeight: 500, padding: "8px 6px", textAlign: "left", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.symbol} style={{ borderBottom: `1px solid ${dark.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = dark.hover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "8px 6px" }}>
                    <span style={{ color: dark.text, fontWeight: 600 }}>{p.symbol}</span>
                    <span style={{ color: dark.textSec, fontSize: 11, marginLeft: 6 }}>{p.name}</span>
                  </td>
                  <td><Badge color={p.dir === "多" ? dark.green : dark.red}>{p.dir}</Badge></td>
                  <td style={{ color: dark.text, fontVariantNumeric: "tabular-nums" }}>{p.qty}</td>
                  <td style={{ color: dark.textSec, fontVariantNumeric: "tabular-nums" }}>{p.cost.toLocaleString()}</td>
                  <td style={{ color: dark.text, fontVariantNumeric: "tabular-nums" }}>{p.price.toLocaleString()}</td>
                  <td style={{ color: p.pnl >= 0 ? dark.green : dark.red, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {p.pnl >= 0 ? "+" : ""}{p.pnl}%
                  </td>
                  <td style={{ color: dark.textSec, fontVariantNumeric: "tabular-nums" }}>{p.weight}%</td>
                  <td style={{ color: dark.blue, fontSize: 12 }}>{p.strategy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ flex: 1, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16, minWidth: 220 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: dark.text, fontWeight: 600, fontSize: 15 }}>告警</span>
          <Badge color={dark.red}>{alerts.filter(a => a.level === "error").length}</Badge>
        </div>
        {alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
      </div>
    </div>

    <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: dark.text, fontWeight: 600, fontSize: 15 }}>近期交易</span>
        <button style={{ background: "transparent", color: dark.blue, border: `1px solid ${dark.border}`, borderRadius: 4, padding: "4px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Download size={12} /> CSV</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${dark.border}` }}>
            {["時間", "標的", "方向", "數量", "價格", "損益", "策略"].map(h => (
              <th key={h} style={{ color: dark.textSec, fontWeight: 500, padding: "8px 6px", textAlign: "left", fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${dark.border}` }}>
              <td style={{ padding: "8px 6px", color: dark.textSec, fontVariantNumeric: "tabular-nums" }}>{t.time}</td>
              <td style={{ color: dark.text, fontWeight: 600 }}>{t.symbol}</td>
              <td><Badge color={t.dir === "買入" ? dark.green : dark.red}>{t.dir}</Badge></td>
              <td style={{ color: dark.text, fontVariantNumeric: "tabular-nums" }}>{t.qty}</td>
              <td style={{ color: dark.text, fontVariantNumeric: "tabular-nums" }}>{t.price.toLocaleString()}</td>
              <td style={{ color: t.pnl ? dark.green : dark.textSec }}>{t.pnl || "-"}</td>
              <td style={{ color: dark.blue, fontSize: 12 }}>{t.strategy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const BacktestPage = ({ setPage }) => {
  const [tab, setTab] = useState("setup");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[["setup", "回測設定"], ["result", "回測結果"], ["history", "歷史記錄"]].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? dark.blue + "33" : "transparent", color: tab === k ? dark.blue : dark.textSec, border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer", fontWeight: tab === k ? 600 : 400 }}>{v}</button>
        ))}
      </div>

      {tab === "setup" && (
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ width: 300, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ color: dark.text, fontWeight: 600, fontSize: 15 }}>參數設定</div>
            {[["策略", "▼ MA Cross Strategy"], ["開始日期", "2024-01-01"], ["結束日期", "2025-12-31"], ["初始資金", "1,000,000"], ["手續費", "0.1%"], ["滑價", "固定 2 點"], ["頻率", "▼ 日線"], ["基準", "▼ S&P 500"]].map(([l, v]) => (
              <div key={l}>
                <div style={{ color: dark.textSec, fontSize: 12, marginBottom: 4 }}>{l}</div>
                <div style={{ background: dark.bg, border: `1px solid ${dark.border}`, borderRadius: 4, padding: "6px 10px", color: dark.text, fontSize: 13 }}>{v}</div>
              </div>
            ))}
            <div style={{ color: dark.blue, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronRight size={14} /> 進階參數
            </div>
            <button onClick={() => setTab("result")} style={{ background: dark.blue, color: "#fff", border: "none", borderRadius: 6, padding: "10px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
              <Play size={16} /> 開始回測
            </button>
          </div>
          <div style={{ flex: 1, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ color: dark.text, fontWeight: 600, fontSize: 15, marginBottom: 12 }}>策略程式碼</div>
            <pre style={{ background: dark.bg, border: `1px solid ${dark.border}`, borderRadius: 6, padding: 16, color: dark.text, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, overflow: "auto", margin: 0, minHeight: 350 }}>
{`const strategy = {
  name: 'MA Cross',
  params: {
    fastPeriod: { default: 20, min: 5, max: 50 },
    slowPeriod: { default: 60, min: 20, max: 200 },
  },

  init(ctx) {
    this.fastMA = ctx.indicator('SMA', this.params.fastPeriod);
    this.slowMA = ctx.indicator('SMA', this.params.slowPeriod);
  },

  onBar(bar, ctx) {
    const fast = this.fastMA.value;
    const slow = this.slowMA.value;

    if (fast > slow && !ctx.position) {
      ctx.buy({ size: ctx.equity * 0.1 / bar.close });
    } else if (fast < slow && ctx.position > 0) {
      ctx.sell({ size: ctx.position });
    }
  }
};`}
            </pre>
          </div>
        </div>
      )}

      {tab === "result" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard label="總報酬率" value="+28.5%" trend="up" sub="vs 基準 +14.2%" />
            <StatCard label="年化報酬" value="+18.2%" trend="up" sub="CAGR" />
            <StatCard label="最大回撤" value="-12.3%" trend="down" sub="持續 23 天" />
            <StatCard label="Sharpe" value="1.45" sub="無風險利率 4%" />
            <StatCard label="勝率" value="65.2%" sub="128 勝 / 68 負" trend="up" />
            <StatCard label="盈虧比" value="1.85" sub="平均獲利 / 平均虧損" />
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 2, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ color: dark.text, fontWeight: 600, fontSize: 15, marginBottom: 12 }}>權益曲線 vs 基準</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={equityData}>
                  <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={dark.green} stopOpacity={0.2} /><stop offset="95%" stopColor={dark.green} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark.border} />
                  <XAxis dataKey="day" stroke={dark.textSec} tick={{ fontSize: 10 }} interval={9} />
                  <YAxis stroke={dark.textSec} tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1e6).toFixed(1)}M`} />
                  <Tooltip contentStyle={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 6, fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke={dark.green} fill="url(#g2)" strokeWidth={2} name="策略" />
                  <Line type="monotone" dataKey="benchmark" stroke={dark.textSec} strokeWidth={1} strokeDasharray="4 4" dot={false} name="基準" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
              <div style={{ color: dark.text, fontWeight: 600, fontSize: 15, marginBottom: 12 }}>月報酬率</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyReturns}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark.border} />
                  <XAxis dataKey="month" stroke={dark.textSec} tick={{ fontSize: 10 }} />
                  <YAxis stroke={dark.textSec} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 6, fontSize: 12 }} formatter={v => [`${v}%`, "報酬率"]} />
                  <Bar dataKey="ret" radius={[3, 3, 0, 0]}>
                    {monthlyReturns.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? dark.green : dark.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${dark.border}` }}>
                {["策略", "區間", "總報酬", "Sharpe", "最大回撤", "執行時間", "操作"].map(h => (
                  <th key={h} style={{ color: dark.textSec, fontWeight: 500, padding: "8px 6px", textAlign: "left", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[["MA Cross", "2024-01 ~ 2025-12", "+28.5%", "1.45", "-12.3%", "2.3s"],
                ["RSI Reversal", "2023-06 ~ 2025-06", "+15.2%", "0.92", "-18.7%", "1.8s"],
                ["Bollinger Breakout", "2024-01 ~ 2025-12", "+22.1%", "1.21", "-15.1%", "3.1s"]].map(([s, r, ret, sh, dd, t], i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${dark.border}` }}>
                  <td style={{ padding: "10px 6px", color: dark.text, fontWeight: 600 }}>{s}</td>
                  <td style={{ color: dark.textSec }}>{r}</td>
                  <td style={{ color: ret.startsWith("+") ? dark.green : dark.red, fontWeight: 600 }}>{ret}</td>
                  <td style={{ color: dark.text }}>{sh}</td>
                  <td style={{ color: dark.red }}>{dd}</td>
                  <td style={{ color: dark.textSec }}>{t}</td>
                  <td><button style={{ background: "transparent", color: dark.blue, border: `1px solid ${dark.border}`, borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>查看</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StrategyPage = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {["全部", "運行中", "暫停", "草稿"].map((t, i) => (
          <button key={t} style={{ background: i === 0 ? dark.blue + "33" : "transparent", color: i === 0 ? dark.blue : dark.textSec, border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>{t}</button>
        ))}
      </div>
      <button style={{ background: dark.blue, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <Plus size={14} /> 新增策略
      </button>
    </div>

    {strategies.map((s, i) => {
      const statusMap = { running: { label: "運行中", color: dark.green }, paused: { label: "暫停", color: dark.yellow }, draft: { label: "草稿", color: dark.textSec }, stopped: { label: "已停止", color: dark.red } };
      const st = statusMap[s.status];
      return (
        <div key={i} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16, cursor: "pointer", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = dark.blue}
          onMouseLeave={e => e.currentTarget.style.borderColor = dark.border}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ color: dark.text, fontSize: 16, fontWeight: 600 }}>{s.name}</span>
                <Badge color={st.color}>{st.label}</Badge>
                <Badge color={dark.blue}>{s.type}</Badge>
              </div>
              <div style={{ color: dark.textSec, fontSize: 13 }}>標的: {s.symbols}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <MiniSparkline data={s.sparkline} color={s.todayPnl.includes("+") ? dark.green : s.todayPnl === "-" ? dark.textSec : dark.red} />
              <div style={{ textAlign: "right" }}>
                <div style={{ color: s.todayPnl.includes("+") ? dark.green : s.todayPnl.includes("-") && s.todayPnl !== "-" ? dark.red : dark.textSec, fontWeight: 600, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{s.todayPnl}</div>
                <div style={{ color: dark.textSec, fontSize: 12 }}>{s.pct}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {[["編輯", Edit3], ["監控", Eye]].concat(
              s.status === "running" ? [["暫停", Pause]] : s.status === "paused" ? [["啟動", Play]] : s.status === "draft" ? [["回測", FlaskConical]] : []
            ).map(([label, Icon]) => (
              <button key={label} style={{ background: "transparent", color: dark.textSec, border: `1px solid ${dark.border}`, borderRadius: 4, padding: "4px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

const AnalyticsPage = () => {
  const [tab, setTab] = useState("market");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[["market", "市場總覽"], ["screener", "篩選器"], ["board", "自訂看板"]].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: tab === k ? dark.blue + "33" : "transparent", color: tab === k ? dark.blue : dark.textSec, border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer", fontWeight: tab === k ? 600 : 400 }}>{v}</button>
        ))}
      </div>

      {tab === "market" && (<>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[["S&P 500", "4,892.3", "+0.32%", true], ["NASDAQ", "15,234.1", "+0.51%", true], ["加權指數", "22,345.8", "-0.12%", false], ["BTC", "$67,230", "+1.24%", true]].map(([n, v, c, up]) => (
            <div key={n} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 180 }}>
              <div>
                <div style={{ color: dark.textSec, fontSize: 12 }}>{n}</div>
                <div style={{ color: dark.text, fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              </div>
              <span style={{ color: up ? dark.green : dark.red, fontSize: 14, fontWeight: 600 }}>{c}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 2, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ color: dark.text, fontWeight: 600, fontSize: 15, marginBottom: 12 }}>板塊熱力圖</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
              {["科技 +1.2%", "金融 -0.3%", "醫療 +0.8%", "能源 +2.1%", "消費 -0.5%", "工業 +0.4%", "材料 -1.1%", "公用 +0.2%", "通訊 +1.5%", "地產 -0.8%", "半導體 +2.8%", "軟體 +1.0%"].map((s, i) => {
                const val = parseFloat(s.match(/[+-][\d.]+/)?.[0] || "0");
                const intensity = Math.min(Math.abs(val) / 3, 1);
                const bg = val >= 0 ? `rgba(63, 185, 80, ${intensity * 0.6 + 0.1})` : `rgba(248, 81, 73, ${intensity * 0.6 + 0.1})`;
                return <div key={i} style={{ background: bg, borderRadius: 4, padding: "14px 8px", textAlign: "center", color: dark.text, fontSize: 12, fontWeight: 500 }}>{s}</div>;
              })}
            </div>
          </div>
          <div style={{ flex: 1, background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16, minWidth: 200 }}>
            <div style={{ color: dark.text, fontWeight: 600, fontSize: 15, marginBottom: 12 }}>漲幅排行</div>
            {[["SMCI", "+12.3%"], ["NVDA", "+6.8%"], ["AMD", "+5.3%"], ["PLTR", "+4.1%"], ["COIN", "+3.9%"]].map(([s, c], i) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${dark.border}` }}>
                <span style={{ color: dark.text, fontSize: 13 }}><span style={{ color: dark.textSec, marginRight: 6 }}>{i + 1}</span>{s}</span>
                <span style={{ color: dark.green, fontWeight: 600, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{c}</span>
              </div>
            ))}
            <div style={{ color: dark.text, fontWeight: 600, fontSize: 15, marginBottom: 12, marginTop: 16 }}>跌幅排行</div>
            {[["RIVN", "-7.3%"], ["SNAP", "-5.8%"], ["BYND", "-4.2%"]].map(([s, c], i) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${dark.border}` }}>
                <span style={{ color: dark.text, fontSize: 13 }}><span style={{ color: dark.textSec, marginRight: 6 }}>{i + 1}</span>{s}</span>
                <span style={{ color: dark.red, fontWeight: 600, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {tab === "screener" && (
        <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ background: dark.bg, border: `1px solid ${dark.border}`, borderRadius: 4, padding: "6px 12px", color: dark.text, fontSize: 13 }}>RSI &lt; 30</div>
            <div style={{ background: dark.bg, border: `1px solid ${dark.border}`, borderRadius: 4, padding: "6px 12px", color: dark.text, fontSize: 13 }}>成交量 &gt; 均量 1.5x</div>
            <div style={{ background: dark.bg, border: `1px solid ${dark.border}`, borderRadius: 4, padding: "6px 12px", color: dark.blue, fontSize: 13, cursor: "pointer" }}>+ 新增條件</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${dark.border}` }}>
                {["標的", "名稱", "價格", "漲跌%", "RSI", "成交量", "信號"].map(h => (
                  <th key={h} style={{ color: dark.textSec, fontWeight: 500, padding: "8px 6px", textAlign: "left", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {screenResults.map(r => (
                <tr key={r.symbol} style={{ borderBottom: `1px solid ${dark.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = dark.hover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 6px", color: dark.text, fontWeight: 600 }}>{r.symbol}</td>
                  <td style={{ color: dark.textSec }}>{r.name}</td>
                  <td style={{ color: dark.text, fontVariantNumeric: "tabular-nums" }}>${r.price}</td>
                  <td style={{ color: r.change >= 0 ? dark.green : dark.red, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.change >= 0 ? "+" : ""}{r.change}%</td>
                  <td style={{ color: r.rsi < 30 ? dark.red : r.rsi > 70 ? dark.green : dark.text, fontVariantNumeric: "tabular-nums" }}>{r.rsi}</td>
                  <td style={{ color: dark.yellow, fontVariantNumeric: "tabular-nums" }}>{r.volume}</td>
                  <td><Badge color={r.signal === "超賣" ? dark.red : r.signal === "突破" ? dark.green : dark.yellow}>{r.signal}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "board" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {["自選股報價", "BTC 走勢", "策略績效", "筆記"].map((title, i) => (
            <div key={i} style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: 8, padding: 16, minHeight: 160, cursor: "grab" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: dark.text, fontWeight: 600, fontSize: 14 }}>{title}</span>
                <span style={{ color: dark.textSec, fontSize: 11, cursor: "pointer" }}>:::  拖曳</span>
              </div>
              <div style={{ color: dark.textSec, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", height: 100, border: `1px dashed ${dark.border}`, borderRadius: 6 }}>
                Widget 內容區域
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main App
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const navItems = [
    { key: "dashboard", label: "儀表板", icon: LayoutDashboard },
    { key: "backtest", label: "回測", icon: FlaskConical },
    { key: "strategy", label: "策略", icon: Bot },
    { key: "analytics", label: "分析", icon: BarChart3 },
  ];

  const pages = {
    dashboard: <DashboardPage />,
    backtest: <BacktestPage setPage={setPage} />,
    strategy: <StrategyPage />,
    analytics: <AnalyticsPage />,
  };

  const pageTitle = { dashboard: "交易儀表板", backtest: "回測平台", strategy: "策略管理", analytics: "數據分析" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: dark.bg, color: dark.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ height: 48, background: dark.sidebar, borderBottom: `1px solid ${dark.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Zap size={18} color={dark.blue} />
          <span style={{ fontWeight: 700, fontSize: 15, color: dark.text }}>QuantTrader</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button style={{ background: dark.bg, border: `1px solid ${dark.border}`, borderRadius: 6, padding: "5px 14px", color: dark.textSec, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, width: 200 }}>
            <SearchIcon size={13} /> 搜尋... <span style={{ marginLeft: "auto", opacity: 0.5 }}>Ctrl+K</span>
          </button>
          <button style={{ background: "transparent", border: "none", color: dark.textSec, cursor: "pointer", padding: 6, position: "relative" }}>
            <Bell size={16} />
            <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, background: dark.red, borderRadius: "50%" }} />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: "transparent", border: "none", color: dark.textSec, cursor: "pointer", padding: 6 }}>
            {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button style={{ background: "transparent", border: "none", color: dark.textSec, cursor: "pointer", padding: 6 }}>
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: sidebarOpen ? 180 : 56, background: dark.sidebar, borderRight: `1px solid ${dark.border}`, display: "flex", flexDirection: "column", transition: "width 0.2s", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, paddingTop: 8 }}>
            {navItems.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setPage(key)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "10px 16px" : "10px 0", justifyContent: sidebarOpen ? "flex-start" : "center",
                background: page === key ? dark.blue + "22" : "transparent", color: page === key ? dark.blue : dark.textSec,
                border: "none", borderLeft: page === key ? `3px solid ${dark.blue}` : "3px solid transparent", cursor: "pointer", fontSize: 13, fontWeight: page === key ? 600 : 400, transition: "all 0.15s"
              }}>
                <Icon size={18} />
                {sidebarOpen && <span>{label}</span>}
              </button>
            ))}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: 12, background: "transparent", border: "none", borderTop: `1px solid ${dark.border}`, color: dark.textSec, cursor: "pointer", display: "flex", justifyContent: "center" }}>
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <div style={{ color: dark.text, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{pageTitle[page]}</div>
          {pages[page]}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ height: 24, background: dark.sidebar, borderTop: `1px solid ${dark.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: dark.textSec, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: dark.green, display: "inline-block" }} /> 系統連線中
        </span>
        <span style={{ fontSize: 11, color: dark.textSec, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: dark.green, display: "inline-block" }} /> WS 正常
        </span>
        <span style={{ fontSize: 11, color: dark.textSec }}>最後更新: 14:32:05</span>
      </div>
    </div>
  );
}
