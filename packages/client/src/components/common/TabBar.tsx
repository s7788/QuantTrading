interface Tab { key: string; label: string; }

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 mb-4">
      {tabs.map(({ key, label }) => (
        <button key={key} onClick={() => onChange(key)}
                className="px-4 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  background: active === key ? '#58a6ff22' : 'transparent',
                  color: active === key ? '#58a6ff' : 'var(--color-text-2)',
                  border: 'none',
                  fontWeight: active === key ? 600 : 400,
                  cursor: 'pointer',
                }}>
          {label}
        </button>
      ))}
    </div>
  );
}
