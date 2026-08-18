import { useMemo, useState } from 'react';
import { Check, Hourglass, Info, Lightbulb, Paperclip, Pencil, X } from 'lucide-react';
import { useLang } from '../i18n';
import { DELAYS, fmtMoney, fmtTime, TOP_PARTS, type Cause, type DelayCase, type ReviewStatus } from '../mock/data';
import { dailyDelayHours, rcaDistribution, totalWaitLossWeek } from '../derive/metrics';
import { CountBadge, Money, Panel, Pill, SectionTitle } from '../components/ui';
import EChart, { CHART_COLORS as C } from '../components/EChart';

const REVIEW_TONE: Record<ReviewStatus, 'ok' | 'warn' | 'dim'> = { confirmed: 'ok', pending: 'warn', manual: 'dim' };
const REVIEW_KEY: Record<ReviewStatus, string> = { confirmed: 'delays.review.confirmed', pending: 'delays.review.pending', manual: 'delays.review.needManual' };
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
      <div className="relative w-[420px] h-full bg-white border-l border-line p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-ink">{t('delays.drawer.title')} · {d.wo}</h3>
          <button onClick={onClose} className="text-dim hover:text-ink"><X size={18} /></button>
        </div>

        <div className="panel p-3.5 mb-4">
          <div className="text-[12px] text-dim mb-1">{t('delays.drawer.system')}</div>
          <div className="flex items-center gap-2">
            <Pill tone={CAUSE_TONE[d.cause]}>{t(`cause.${d.cause}` as any)}</Pill>
            <span className="num text-[13px] text-ink2">{t('delays.drawer.confidence')} <b className={d.confidence >= 85 ? 'text-ok-ink' : 'text-accent-ink'}>{d.confidence}%</b></span>
          </div>
          <div className="text-[11px] text-faint mt-1.5">规则 v1.3 · {fmtTime(d.when)} · {d.plate} · {t(`bay.${d.bayId}` as any)}</div>
        </div>

        <div className="mb-4">
          <div className="text-[12px] text-dim mb-2">{t('delays.drawer.evidence')}</div>
          <div className="flex flex-col gap-1.5">
            {d.evidence.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-ink2 bg-soft border border-line rounded-lg px-3 py-2 cursor-pointer hover:border-teal/40">
                <span>{i + 1}.</span> <Paperclip size={12} className="text-dim" /> {e}
                <span className="ml-auto text-teal text-[11px]">{t('vd.evidence')} →</span>
              </div>
            ))}
          </div>
        </div>

        {saved ? (
          <div className="panel p-4 flex items-center justify-center gap-2 text-ok-ink text-[14px]"><Check size={16} /> {t('delays.drawer.saved')}</div>
        ) : mode === 'reclassify' ? (
          <div className="flex flex-col gap-2.5">
            <select value={newCause} onChange={(e) => setNewCause(e.target.value as Cause)} className="bg-soft border border-line rounded-lg px-3 py-2 text-[13px] outline-none">
              {(['parts', 'personnel', 'supervision', 'other'] as Cause[]).map((c) => <option key={c} value={c}>{t(`cause.${c}` as any)}</option>)}
            </select>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('delays.drawer.reasonPlaceholder')}
              className="bg-soft border border-line rounded-lg px-3 py-2 text-[13px] h-[70px] outline-none focus:border-teal/50 placeholder:text-faint"
            />
            <div className="flex items-center gap-1.5 text-[10px] text-faint"><Info size={11} /> {t('delays.drawer.reason')}</div>
            <div className="flex gap-2">
              <button disabled={!reason} onClick={() => setSaved(true)} className="flex-1 py-2 rounded-lg bg-primary/90 hover:bg-primary-deep text-white text-[13px] disabled:opacity-30">{t('delays.drawer.confirm')}</button>
              <button onClick={() => setMode('none')} className="px-4 py-2 rounded-lg border border-line text-[13px] text-ink2">←</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setSaved(true)} className="flex-1 py-2 rounded-lg bg-ok/10 border border-ok/40 text-ok-ink text-[13px] hover:bg-ok/20 inline-flex items-center justify-center gap-1.5"><Check size={14} /> {t('delays.drawer.confirm')}</button>
            <button onClick={() => setMode('reclassify')} className="flex-1 py-2 rounded-lg bg-accent/15 border border-accent/40 text-accent-ink text-[13px] hover:bg-accent/25 inline-flex items-center justify-center gap-1.5"><Pencil size={13} /> {t('delays.drawer.reclassify')}</button>
            <button onClick={() => setSaved(true)} className="flex-1 py-2 rounded-lg bg-bad/10 border border-bad/40 text-bad text-[13px] hover:bg-bad/20 inline-flex items-center justify-center gap-1.5"><X size={14} /> {t('delays.drawer.reject')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// 每日延误工时柱图（近 7 天）
function DailyTrend() {
  const { t } = useLang();
  const days = useMemo(dailyDelayHours, []);
  const wds = t('dash.weekdays') as unknown as string[];
  return (
    <EChart
      height={150}
      option={{
        grid: { left: 30, right: 10, top: 12, bottom: 22 },
        tooltip: { backgroundColor: '#ffffff', borderColor: '#dfe6ee', textStyle: { color: '#22354d', fontSize: 12 } },
        xAxis: {
          type: 'category',
          data: days.map((d) => wds[(d.date.getDay() + 6) % 7]),
          axisLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 11 },
        },
        yAxis: { type: 'value', name: 'h', nameTextStyle: { color: C.text }, splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 11 } },
        series: [{
          type: 'bar', barWidth: '52%',
          data: days.map((d, i) => ({
            value: d.hours,
            itemStyle: { color: i === days.length - 1 ? C.bad : C.warn, borderRadius: [3, 3, 0, 0], opacity: i === days.length - 1 ? 1 : 0.75 },
          })),
        }],
      }}
    />
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
        <h1 className="text-[18px] font-bold text-ink">{t('delays.title')}</h1>
        <div className="flex items-center gap-3">
          <Pill tone="dim">{t('common.week')}</Pill>
          <span className="text-[13px] text-dim">{t('delays.totalLoss')} <Money value={fmtMoney(loss)} className="num text-[20px] font-bold text-bad ml-1" /></span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* 左：分布 + 每日趋势 + 配件 + 洞察 */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <Panel>
            <SectionTitle>{t('delays.dist')}</SectionTitle>
            <EChart
              height={190}
              option={{
                grid: { left: 90, right: 40, top: 6, bottom: 6 },
                tooltip: { backgroundColor: '#ffffff', borderColor: '#dfe6ee', textStyle: { color: '#22354d', fontSize: 12 } },
                xAxis: { type: 'value', splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 11, formatter: '{value}%' } },
                yAxis: { type: 'category', data: dist.map((d) => t(`cause.${d.cause}` as any)).reverse(), axisLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 11 } },
                series: [{
                  type: 'bar', barWidth: 16,
                  data: dist.map((d) => ({
                    value: d.pct,
                    itemStyle: { borderRadius: 3, color: { parts: C.bad, personnel: C.warn, supervision: C.accent, other: C.dim, normal: C.ok }[d.cause] },
                  })).reverse(),
                  label: { show: true, position: 'right', color: C.text, fontSize: 11, formatter: '{c}%' },
                }],
              }}
            />
          </Panel>
          <Panel>
            <SectionTitle>{t('delays.dailyTrend')}</SectionTitle>
            <DailyTrend />
          </Panel>
          <Panel>
            <SectionTitle>{t('delays.topParts')}</SectionTitle>
            <div className="flex flex-col gap-2">
              {TOP_PARTS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 text-[13px]">
                  <span className="num text-dim w-4">{i + 1}.</span>
                  <span className="text-ink flex-1">{p.name}</span>
                  <CountBadge n={p.count} />
                  <span className="num text-dim text-[12px]">{p.lossH}h</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="border-teal/25 bg-teal/[0.04]">
            <SectionTitle icon={<Lightbulb />}>{t('delays.insightTitle')}</SectionTitle>
            <p className="text-[13px] text-teal leading-relaxed">{t('delays.insight')}</p>
          </Panel>
        </div>

        {/* 右：TOP 延误清单 */}
        <Panel className="xl:col-span-7 p-0 overflow-hidden">
          <div className="px-4 pt-4"><SectionTitle>{t('delays.topDelays')}</SectionTitle></div>
          <div className="grid grid-cols-[1.2fr_1.2fr_70px_90px_1.2fr_100px] gap-2 px-4 py-2 text-[11px] text-dim border-b border-line bg-soft">
            <span>{t('delays.col.wo')}</span><span>{t('vehicles.col.vehicle').split(' ')[0]}</span><span>{t('delays.col.bay')}</span>
            <span>{t('delays.col.delay')}</span><span>{t('delays.col.cause')}</span><span>{t('delays.col.status')}</span>
          </div>
          <div>
            {sorted.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="w-full grid grid-cols-[1.2fr_1.2fr_70px_90px_1.2fr_100px] gap-2 items-center px-4 py-2.5 border-b border-line hover:bg-black/[0.03] text-left transition-colors"
              >
                <span className="text-[13px] text-ink2">{d.wo}<span className="block text-[10px] text-faint">{t(`task.${d.taskType}` as any)}</span></span>
                <span className="num text-[13px] font-semibold text-ink">{d.plate}</span>
                <span className="text-[12px] text-dim">{t(`bay.${d.bayId}` as any)}</span>
                <span className={`num text-[14px] font-bold ${d.delayH >= 1.5 ? 'text-bad' : d.delayH >= 0.8 ? 'text-accent-ink' : 'text-ink2'}`}>+{d.delayH}h</span>
                <span><Pill tone={CAUSE_TONE[d.cause]}>{t(`cause.${d.cause}` as any)} <span className="num opacity-70">{d.confidence}%</span></Pill></span>
                <span>
                  <Pill tone={REVIEW_TONE[d.review]}>
                    {d.review === 'confirmed' ? <Check size={11} /> : d.review === 'pending' ? <Hourglass size={11} /> : null}
                    {t(REVIEW_KEY[d.review] as any)}
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
