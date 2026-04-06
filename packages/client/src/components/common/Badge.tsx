import { ReactNode } from 'react';

type Variant = 'green' | 'red' | 'blue' | 'yellow' | 'gray';

const COLORS: Record<Variant, { bg: string; text: string }> = {
  green:  { bg: '#3fb95022', text: '#3fb950' },
  red:    { bg: '#f8514922', text: '#f85149' },
  blue:   { bg: '#58a6ff22', text: '#58a6ff' },
  yellow: { bg: '#d2992222', text: '#d29922' },
  gray:   { bg: 'var(--color-hover)', text: 'var(--color-text-2)' },
};

interface Props {
  children: ReactNode;
  variant?: Variant;
  color?: string; // custom hex
}

export function Badge({ children, variant = 'gray', color }: Props) {
  const style = color
    ? { bg: `${color}22`, text: color }
    : COLORS[variant];

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: style.bg, color: style.text }}>
      {children}
    </span>
  );
}
