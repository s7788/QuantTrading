import { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      {icon && <div style={{ color: 'var(--color-text-2)', opacity: 0.5 }}>{icon}</div>}
      <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{title}</p>
      {description && <p className="text-xs text-center max-w-xs" style={{ color: 'var(--color-text-2)' }}>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
