export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center w-full py-8">
      <div style={{
        width: size, height: size,
        border: '2px solid var(--color-border)',
        borderTopColor: '#58a6ff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
