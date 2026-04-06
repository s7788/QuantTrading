import { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
}

export function DataTable<T>({ columns, data, rowKey, onRowClick, emptyText = '無資料' }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = (a as Record<string, unknown>)[sortKey];
    const bv = (b as Record<string, unknown>)[sortKey];
    if (av === bv) return 0;
    const cmp = av! > bv! ? 1 : -1;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            {columns.map((col) => (
              <th key={String(col.key)}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                  style={{
                    padding: '8px 10px',
                    textAlign: col.align || 'left',
                    color: 'var(--color-text-2)',
                    fontWeight: 500,
                    fontSize: 12,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    width: col.width,
                    whiteSpace: 'nowrap',
                  }}>
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === String(col.key) && (
                    sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length}
                  style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-2)' }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: onRowClick ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => onRowClick && (e.currentTarget.style.background = 'var(--color-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                {columns.map((col) => (
                  <td key={String(col.key)}
                      style={{ padding: '9px 10px', textAlign: col.align || 'left', color: 'var(--color-text)' }}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
