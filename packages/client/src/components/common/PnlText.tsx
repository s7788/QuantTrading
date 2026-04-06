interface Props {
  value: number;      // raw number
  suffix?: string;    // '%', '' etc.
  prefix?: string;    // '$', 'NT$' etc.
  className?: string;
}

/** Renders a P&L number with color and ± sign */
export function PnlText({ value, suffix = '%', prefix = '', className = '' }: Props) {
  const isUp = value >= 0;
  const sign = isUp ? '+' : '';
  return (
    <span className={`num font-semibold ${className}`}
          style={{ color: isUp ? '#3fb950' : '#f85149' }}>
      {sign}{prefix}{typeof value === 'number' ? value.toFixed(2) : value}{suffix}
    </span>
  );
}
