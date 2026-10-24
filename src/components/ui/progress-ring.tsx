export function ProgressRing({ value, size = 160, stroke = 10, label, children }: {
  value: number; size?: number; stroke?: number; label: string; children?: React.ReactNode;
}) {
  const normalized = Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-soft)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-clay)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - normalized / 100)} className="transition-[stroke-dashoffset] duration-700" />
    </svg>
    <div className="absolute inset-0 grid place-content-center text-center">{children}</div>
  </div>;
}
