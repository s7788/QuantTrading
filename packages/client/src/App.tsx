import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import BacktestNewPage from '@/pages/backtest/BacktestNewPage';
import BacktestResultPage from '@/pages/backtest/BacktestResultPage';
import BacktestHistoryPage from '@/pages/backtest/BacktestHistoryPage';
import BacktestComparePage from '@/pages/backtest/BacktestComparePage';
import StrategyListPage from '@/pages/strategy/StrategyListPage';
import StrategyEditorPage from '@/pages/strategy/StrategyEditorPage';
import StrategyMonitorPage from '@/pages/strategy/StrategyMonitorPage';
import StrategyComparePage from '@/pages/strategy/StrategyComparePage';
import MarketOverviewPage from '@/pages/analytics/MarketOverviewPage';
import SymbolAnalysisPage from '@/pages/analytics/SymbolAnalysisPage';
import ScreenerPage from '@/pages/analytics/ScreenerPage';
import BoardPage from '@/pages/analytics/BoardPage';
import TwStockPredictionPage from '@/pages/analytics/TwStockPredictionPage';
import SettingsPage from '@/pages/SettingsPage';
import { useAppStore } from '@/stores/appStore';
import { socketService } from '@/services/socket';

export default function App() {
  const { theme } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/backtest" element={<Navigate to="/backtest/new" replace />} />
        <Route path="/backtest/new" element={<BacktestNewPage />} />
        <Route path="/backtest/result/:id" element={<BacktestResultPage />} />
        <Route path="/backtest/history" element={<BacktestHistoryPage />} />
        <Route path="/backtest/compare" element={<BacktestComparePage />} />
        <Route path="/strategy" element={<StrategyListPage />} />
        <Route path="/strategy/compare" element={<StrategyComparePage />} />
        <Route path="/strategy/edit/:id" element={<StrategyEditorPage />} />
        <Route path="/strategy/edit/new" element={<StrategyEditorPage />} />
        <Route path="/strategy/monitor/:id" element={<StrategyMonitorPage />} />
        <Route path="/analytics" element={<Navigate to="/analytics/market" replace />} />
        <Route path="/analytics/market" element={<MarketOverviewPage />} />
        <Route path="/analytics/symbol/:market/:code" element={<SymbolAnalysisPage />} />
        <Route path="/analytics/screener" element={<ScreenerPage />} />
        <Route path="/analytics/board/:id" element={<BoardPage />} />
        <Route path="/analytics/tw-prediction" element={<TwStockPredictionPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
