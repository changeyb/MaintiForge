import type { ReactNode } from 'react';

export function Panel({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`panel panel-glow p-4 ${onClick ? 'cursor-pointer hover:border-teal/50 transition-colors' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right, icon }: { children: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink">
        <span className="w-1 h-3.5 rounded bg-teal inline-block" />
        {icon && <span className="text-teal inline-flex [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
        {children}
      </div>
      {right}
    </div>
  );
}

const TONE = {
  ok: 'text-ok-ink', warn: 'text-accent-ink', bad: 'text-bad', dim: 'text-dim', accent: 'text-teal',
} as const;

export function KpiCard({ label, value, unit, delta, deltaGood, sub, tone }: {
  label: string; value: string; unit?: string; delta?: string; deltaGood?: boolean; sub?: string; tone?: keyof typeof TONE;
}) {
  return (
    <div className="panel px-4 py-3 flex flex-col justify-between min-h-[86px]">
      <div className="text-[12px] text-dim">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`num text-[34px] leading-none font-bold tracking-tight ${tone ? TONE[tone] : 'text-ink'}`}>{value}</span>
        {unit && <span className="text-[12px] text-dim">{unit}</span>}
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        {delta && (
          <span className={deltaGood === undefined ? 'text-dim' : deltaGood ? 'text-ok-ink' : 'text-bad'}>{delta}</span>
        )}
        {sub && <span className="text-dim">{sub}</span>}
      </div>
    </div>
  );
}

// 货币大数字：货币符号降字号降基线，避免与数字抢视觉重量
export function Money({ value, className = '', symbolClass = '' }: { value: string; className?: string; symbolClass?: string }) {
  const m = value.match(/^([A-Za-z$]+)(.*)$/);
  if (!m) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      <span className={`text-[0.55em] font-semibold align-baseline mr-[1px] ${symbolClass}`}>{m[1]}</span>
      {m[2]}
    </span>
  );
}

// 中性计数徽章（×n）：不用语义色，避免与红/绿状态冲突
export function CountBadge({ n }: { n: number }) {
  return (
    <span className="num inline-flex items-center px-1.5 py-px rounded-md border border-line bg-soft text-ink2 text-[11px] font-semibold">×{n}</span>
  );
}

export function StatusDot({ tone, pulse }: { tone: 'ok' | 'warn' | 'bad' | 'idle'; pulse?: boolean }) {
  const c = { ok: 'bg-ok', warn: 'bg-accent', bad: 'bg-bad', idle: 'bg-idle' }[tone];
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${c} ${pulse ? 'live-dot' : ''}`} />;
}

export function Pill({ children, tone = 'dim' }: { children: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'dim' | 'accent' }) {
  const styles = {
    ok: 'bg-ok/10 text-ok-ink border-ok/30',
    warn: 'bg-accent/10 text-accent-ink border-accent/40',
    bad: 'bg-bad/10 text-bad border-bad/30',
    dim: 'bg-idle/10 text-dim border-idle/40',
    accent: 'bg-teal/10 text-teal border-teal/30',
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] [&>svg]:w-3 [&>svg]:h-3 ${styles}`}>{children}</span>;
}

export function ProgressBar({ pct, tone = 'accent', height = 8 }: { pct: number; tone?: 'ok' | 'warn' | 'bad' | 'accent' | 'idle'; height?: number }) {
  const c = { ok: 'bg-ok', warn: 'bg-accent', bad: 'bg-bad', accent: 'bg-teal', idle: 'bg-idle' }[tone];
  return (
    <div className="progress-track w-full" style={{ height }}>
      <div className={`progress-fill ${c}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function RiskIcon({ risk }: { risk: 'ok' | 'tight' | 'risk' | 'done' }) {
  if (risk === 'risk') return <span className="text-bad text-[15px]">●</span>;
  if (risk === 'tight') return <span className="text-accent text-[15px]">●</span>;
  if (risk === 'ok') return <span className="text-ok text-[15px]">●</span>;
  return <span className="text-idle text-[15px]">✓</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-dim text-[13px] py-6 text-center">{children}</div>;
}
