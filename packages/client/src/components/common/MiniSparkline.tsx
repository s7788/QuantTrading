interface Props {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function MiniSparkline({ data, color = '#58a6ff', width = 64, height = 24 }: Props) {
  if (!data.length) return <span style={{ color: 'var(--color-text-2)', fontSize: 11 }}>—</span>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
