import type { ReactNode } from 'react';

export function Panel({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`panel panel-glow p-4 ${onClick ? 'cursor-pointer hover:border-sky-400/40 transition-colors' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-slate-200">
        <span className="w-1 h-3.5 rounded bg-sky-400 inline-block" />
        {children}
      </div>
      {right}
    </div>
  );
}

const TONE = {
  ok: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400', dim: 'text-slate-400', accent: 'text-sky-400',
} as const;

export function KpiCard({ label, value, unit, delta, deltaGood, sub, tone }: {
  label: string; value: string; unit?: string; delta?: string; deltaGood?: boolean; sub?: string; tone?: keyof typeof TONE;
}) {
  return (
    <div className="panel px-4 py-3 flex flex-col justify-between min-h-[86px]">
      <div className="text-[12px] text-slate-400">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`num text-[30px] leading-none font-bold ${tone ? TONE[tone] : 'text-slate-100'}`}>{value}</span>
        {unit && <span className="text-[12px] text-slate-500">{unit}</span>}
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        {delta && (
          <span className={deltaGood === undefined ? 'text-slate-500' : deltaGood ? 'text-emerald-400' : 'text-red-400'}>{delta}</span>
        )}
        {sub && <span className="text-slate-600">{sub}</span>}
      </div>
    </div>
  );
}

export function StatusDot({ tone, pulse }: { tone: 'ok' | 'warn' | 'bad' | 'idle'; pulse?: boolean }) {
  const c = { ok: 'bg-emerald-400', warn: 'bg-amber-400', bad: 'bg-red-400', idle: 'bg-slate-500' }[tone];
  return <span className={`inline-block w-2 h-2 rounded-full ${c} ${pulse ? 'live-dot' : ''}`} />;
}

export function Pill({ children, tone = 'dim' }: { children: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'dim' | 'accent' }) {
  const styles = {
    ok: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
    warn: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    bad: 'bg-red-400/10 text-red-300 border-red-400/30',
    dim: 'bg-slate-400/10 text-slate-300 border-slate-400/30',
    accent: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${styles}`}>{children}</span>;
}

export function ProgressBar({ pct, tone = 'accent', height = 8 }: { pct: number; tone?: 'ok' | 'warn' | 'bad' | 'accent' | 'idle'; height?: number }) {
  const c = { ok: 'bg-emerald-400', warn: 'bg-amber-400', bad: 'bg-red-400', accent: 'bg-sky-400', idle: 'bg-slate-500' }[tone];
  return (
    <div className="progress-track w-full" style={{ height }}>
      <div className={`progress-fill ${c}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export function RiskIcon({ risk }: { risk: 'ok' | 'tight' | 'risk' | 'done' }) {
  if (risk === 'risk') return <span className="text-red-400 text-[15px]">●</span>;
  if (risk === 'tight') return <span className="text-amber-400 text-[15px]">●</span>;
  if (risk === 'ok') return <span className="text-emerald-400 text-[15px]">●</span>;
  return <span className="text-slate-500 text-[15px]">✓</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-slate-500 text-[13px] py-6 text-center">{children}</div>;
}
