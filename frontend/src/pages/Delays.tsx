import { useMemo, useState } from 'react';
import { useLang } from '../i18n';
import { DELAYS, fmtMoney, fmtTime, TOP_PARTS, type Cause, type DelayCase, type ReviewStatus } from '../mock/data';
import { rcaDistribution, totalWaitLossWeek } from '../derive/metrics';
import { Panel, Pill, SectionTitle, StatusDot } from '../components/ui';
import EChart, { CHART_COLORS as C } from '../components/EChart';

const REVIEW_TONE: Record<ReviewStatus, 'ok' | 'warn' | 'dim'> = { confirmed: 'ok', pending: 'warn', manual: 'dim' };
const CAUSE_TONE: Record<Cause, 'bad' | 'warn' | 'accent' | 'dim'> = { parts: 'bad', personnel: 'warn', supervision: 'accent', other: 'dim' };

function ReviewDrawer({ d, onClose }: { d: DelayCase; onClose: () => void }) {
  const { t } = useLang();
  const [mode, setMode] = useState<'none' | 'reclassify'>('none');
  const [saved, setSaved] = useState(false);
  const [reason, setReason] = useState('');
  const [newCause, setNewCause] = useState<Cause>(d.cause);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div className="relative w-[420px] h-full bg-[#0d1424] border-l border-[#1e2b47] p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold">{t('delays.drawer.title')} · {d.wo}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-[18px]">✕</button>
        </div>

        <div className="panel p-3.5 mb-4">
          <div className="text-[12px] text-slate-500 mb-1">{t('delays.drawer.system')}</div>
          <div className="flex items-center gap-2">
            <Pill tone={CAUSE_TONE[d.cause]}>{t(`cause.${d.cause}` as any)}</Pill>
            <span className="num text-[13px] text-slate-300">{t('delays.drawer.confidence')} <b className={d.confidence >= 85 ? 'text-emerald-300' : 'text-amber-300'}>{d.confidence}%</b></span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1.5">规则 v1.3 · {fmtTime(d.when)} · {d.plate} · {t(`bay.${d.bayId}` as any)}</div>
        </div>

        <div className="mb-4">
          <div className="text-[12px] text-slate-500 mb-2">{t('delays.drawer.evidence')}</div>
          <div className="flex flex-col gap-1.5">
            {d.evidence.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-slate-300 bg-[#0b1222] border border-[#1e2b47] rounded-lg px-3 py-2 cursor-pointer hover:border-sky-400/40">
                <span>{i + 1}.</span> 📎 {e}
                <span className="ml-auto text-sky-400 text-[11px]">{t('vd.evidence')} →</span>
              </div>
            ))}
          </div>
        </div>

        {saved ? (
          <div className="panel p-4 text-center text-emerald-300 text-[14px]">✓ {t('delays.drawer.saved')}</div>
        ) : mode === 'reclassify' ? (
          <div className="flex flex-col gap-2.5">
            <select value={newCause} onChange={(e) => setNewCause(e.target.value as Cause)} className="bg-[#0b1222] border border-[#1e2b47] rounded-lg px-3 py-2 text-[13px] outline-none">
              {(['parts', 'personnel', 'supervision', 'other'] as Cause[]).map((c) => <option key={c} value={c}>{t(`cause.${c}` as any)}</option>)}
            </select>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('delays.drawer.reasonPlaceholder')}
              className="bg-[#0b1222] border border-[#1e2b47] rounded-lg px-3 py-2 text-[13px] h-[70px] outline-none focus:border-sky-400/50 placeholder:text-slate-600"
            />
            <div className="text-[10px] text-slate-600">ⓘ {t('delays.drawer.reason')}</div>
            <div className="flex gap-2">
              <button disabled={!reason} onClick={() => setSaved(true)} className="flex-1 py-2 rounded-lg bg-sky-500/80 hover:bg-sky-500 text-white text-[13px] disabled:opacity-30">{t('delays.drawer.confirm')}</button>
              <button onClick={() => setMode('none')} className="px-4 py-2 rounded-lg border border-[#2a3a5c] text-[13px] text-slate-300">←</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setSaved(true)} className="flex-1 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[13px] hover:bg-emerald-500/30">✓ {t('delays.drawer.confirm')}</button>
            <button onClick={() => setMode('reclassify')} className="flex-1 py-2 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[13px] hover:bg-amber-500/25">✎ {t('delays.drawer.reclassify')}</button>
            <button onClick={() => setSaved(true)} className="flex-1 py-2 rounded-lg bg-red-500/15 border border-red-400/40 text-red-300 text-[13px] hover:bg-red-500/25">✕ {t('delays.drawer.reject')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Delays() {
  const { t } = useLang();
  const [selected, setSelected] = useState<DelayCase | null>(null);
  const dist = useMemo(rcaDistribution, []);
  const loss = useMemo(totalWaitLossWeek, []);
  const sorted = useMemo(() => [...DELAYS].sort((a, b) => b.delayH - a.delayH), []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[18px] font-bold">{t('delays.title')}</h1>
        <div className="flex items-center gap-3">
          <Pill tone="dim">{t('common.week')}</Pill>
          <span className="text-[13px] text-slate-400">{t('delays.totalLoss')} <b className="num text-[20px] text-red-400 ml-1">{fmtMoney(loss)}</b></span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* 左：分布 + 配件 + 洞察 */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <Panel>
            <SectionTitle>{t('delays.dist')}</SectionTitle>
            <EChart
              height={190}
              option={{
                grid: { left: 90, right: 40, top: 6, bottom: 6 },
                tooltip: { backgroundColor: '#131c33', borderColor: '#1e2b47', textStyle: { color: '#e6edf7', fontSize: 12 } },
                xAxis: { type: 'value', splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 10, formatter: '{value}%' } },
                yAxis: { type: 'category', data: dist.map((d) => t(`cause.${d.cause}` as any)).reverse(), axisLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 11 } },
                series: [{
                  type: 'bar', barWidth: 16,
                  data: dist.map((d, i) => ({ value: d.pct, itemStyle: { color: [C.ok, C.dim, C.accent, C.warn, C.bad][i], borderRadius: 3 } })).reverse(),
                  label: { show: true, position: 'right', color: C.text, fontSize: 11, formatter: '{c}%' },
                }],
              }}
            />
          </Panel>
          <Panel>
            <SectionTitle>{t('delays.topParts')}</SectionTitle>
            <div className="flex flex-col gap-2">
              {TOP_PARTS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 text-[13px]">
                  <span className="num text-slate-500 w-4">{i + 1}.</span>
                  <span className="text-slate-200 flex-1">{p.name}</span>
                  <Pill tone="bad">×{p.count}</Pill>
                  <span className="num text-slate-400 text-[12px]">{p.lossH}h</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="border-sky-400/25 bg-sky-400/[0.04]">
            <SectionTitle>💡 {t('delays.insightTitle')}</SectionTitle>
            <p className="text-[13px] text-sky-200/90 leading-relaxed">{t('delays.insight')}</p>
          </Panel>
        </div>

        {/* 右：TOP 延误清单 */}
        <Panel className="xl:col-span-7 p-0 overflow-hidden">
          <div className="px-4 pt-4"><SectionTitle>{t('delays.topDelays')}</SectionTitle></div>
          <div className="grid grid-cols-[1.2fr_1.2fr_70px_90px_1.2fr_100px] gap-2 px-4 py-2 text-[11px] text-slate-500 border-b border-[#1e2b47] bg-[#0b1222]">
            <span>{t('delays.col.wo')}</span><span>{t('vehicles.col.vehicle').split(' ')[0]}</span><span>{t('delays.col.bay')}</span>
            <span>{t('delays.col.delay')}</span><span>{t('delays.col.cause')}</span><span>{t('delays.col.status')}</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {sorted.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="w-full grid grid-cols-[1.2fr_1.2fr_70px_90px_1.2fr_100px] gap-2 items-center px-4 py-2.5 border-b border-[#16213a] hover:bg-white/[0.03] text-left transition-colors"
              >
                <span className="text-[13px] text-slate-300">{d.wo}<span className="block text-[10px] text-slate-600">{t(`task.${d.taskType}` as any)}</span></span>
                <span className="num text-[13px] font-semibold text-slate-100">{d.plate}</span>
                <span className="text-[12px] text-slate-400">{t(`bay.${d.bayId}` as any)}</span>
                <span className={`num text-[14px] font-bold ${d.delayH >= 1.5 ? 'text-red-400' : d.delayH >= 0.8 ? 'text-amber-300' : 'text-slate-300'}`}>+{d.delayH}h</span>
                <span><Pill tone={CAUSE_TONE[d.cause]}>{t(`cause.${d.cause}` as any)} <span className="num opacity-70">{d.confidence}%</span></Pill></span>
                <span>
                  <Pill tone={REVIEW_TONE[d.review]}>
                    {d.review === 'confirmed' ? '✓ ' : d.review === 'pending' ? '⏳ ' : ''}
                    {t(`delays.review.${d.review}` as any)}
                  </Pill>
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {selected && <ReviewDrawer d={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
