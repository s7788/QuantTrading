import { ReactNode } from 'react';

interface Props {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function SectionCard({ title, actions, children, className = '', style }: Props) {
  return (
    <div className={`rounded-lg p-4 ${className}`}
         style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', ...style }}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
