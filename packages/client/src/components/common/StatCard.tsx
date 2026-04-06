import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
  onClick?: () => void;
}

export function StatCard({ label, value, sub, trend, icon, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="rounded-lg p-4 flex flex-col gap-1 transition-all"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        flex: 1,
        minWidth: 140,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.borderColor = '#58a6ff')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>{label}</span>
        {icon && <span style={{ color: 'var(--color-text-2)' }}>{icon}</span>}
      </div>
      <div className="text-2xl font-bold num" style={{ color: 'var(--color-text)' }}>{value}</div>
      {sub && (
        <div className="flex items-center gap-1 text-xs num"
             style={{ color: trend === 'up' ? '#3fb950' : trend === 'down' ? '#f85149' : 'var(--color-text-2)' }}>
          {trend === 'up' && <ArrowUpRight size={12} />}
          {trend === 'down' && <ArrowDownRight size={12} />}
          {sub}
        </div>
      )}
    </div>
  );
}
