import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bell, Eye, Gauge, PieChart as PieChartIcon, ScanLine, Timer, TrendingUp, TriangleAlert, Truck,
} from 'lucide-react';
import { useLang } from '../i18n';
import {
  bayInfos, dailyDelayLoss, dayStats, deliveryPromises, kpis, pocRoi, todayTimeComposition, totalWaitLossWeek, type BayState,
} from '../derive/metrics';
import { fmtH, fmtMoney, fmtTime, LOW_CONF_PLATES, ON_SITE } from '../mock/data';
import { Money, Panel, Pill, SectionTitle, StatusDot } from '../components/ui';
import EChart, { CHART_COLORS as C } from '../components/EChart';

// ----------------------------------------------------------------  Hero KPI

const HERO_BAR = { primary: 'bg-primary', bad: 'bg-bad', accent: 'bg-accent', teal: 'bg-teal' } as const;
const HERO_TEXT = { primary: 'text-primary', bad: 'text-bad', accent: 'text-accent-ink', teal: 'text-teal' } as const;

function Hero({ label, value, unit, sub, tone, isMoney, visual }: {
  label: string; value: string; unit?: string; sub: string; tone: keyof typeof HERO_BAR; isMoney?: boolean; visual?: ReactNode;
}) {
  return (
    <div className="panel panel-glow px-4 py-3.5 relative overflow-hidden flex flex-col">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${HERO_BAR[tone]}`} />
      <div className="text-[12px] text-dim">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={`num text-[34px] leading-none font-bold tracking-tight ${HERO_TEXT[tone]}`}>
          {isMoney ? <Money value={value} /> : value}
        </span>
        {unit && <span className="text-[12px] text-dim">{unit}</span>}
      </div>
      <div className="text-[11px] text-dim mt-1.5 truncate">{sub}</div>
      {visual && <div className="mt-2.5">{visual}</div>}
    </div>
  );
}

// 承诺交车分段条：已交 / 正常 / 风险
function PromiseSegments({ delivered, ok, risk, total }: { delivered: number; ok: number; risk: number; total: number }) {
  const seg = (n: number, cls: string) => n > 0
    ? <div className={cls} style={{ width: `${(n / Math.max(1, total)) * 100}%` }} />
    : null;
  return (
    <div className="flex h-[6px] rounded-full overflow-hidden bg-soft">
      {seg(delivered, 'bg-ok')}
      {seg(ok, 'bg-teal')}
      {seg(risk, 'bg-bad')}
    </div>
  );
}

// 近 7 天等待损失迷你柱图（HTML 柱，末根 = 今日）
function LossSparkline() {
  const days = useMemo(dailyDelayLoss, []);
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <div className="flex items-end gap-[5px] h-[26px]">
      {days.map((d, i) => (
        <div
          key={i}
          title={`${d.date.getMonth() + 1}/${d.date.getDate()} · ${fmtMoney(d.value)}`}
          className={`flex-1 rounded-sm ${i === days.length - 1 ? 'bg-accent' : 'bg-accent/30'}`}
          style={{ height: `${Math.max(8, (d.value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------  需要关注

const ALERT_ICON = { bad: TriangleAlert, warn: Timer, patrol: Eye, conf: ScanLine } as const;

function AttentionList() {
  const { t } = useLang();
  const nav = useNavigate();
  const items = [
    { tone: 'bad' as const, Icon: ALERT_ICON.bad, title: `YQ3220A · ${t('dash.alert.parts')}`, sub: t('dash.alert.partsAction'), to: '/delays' },
    { tone: 'warn' as const, Icon: ALERT_ICON.warn, title: t('dash.alert.overtime'), sub: 'YN7663X · WO-2069', to: '/vehicles' },
    { tone: 'warn' as const, Icon: ALERT_ICON.patrol, title: t('dash.alert.patrol'), sub: '', to: '/analytics' },
    { tone: 'idle' as const, Icon: ALERT_ICON.conf, title: t('dash.alert.lowConf'), sub: LOW_CONF_PLATES.map((p) => p.plate).join('  '), to: '/floor' },
  ];
  const box = { bad: 'bg-bad/10 text-bad', warn: 'bg-accent/10 text-accent-ink', idle: 'bg-idle/15 text-dim' } as const;
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <button key={i} onClick={() => nav(it.to)} className="flex items-center gap-3 rounded-lg border border-line bg-soft px-3 py-2.5 text-left hover:border-teal/50 transition-colors">
          <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${box[it.tone]}`}>
            <it.Icon size={15} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] text-ink leading-snug">{it.title}</div>
            {it.sub && <div className="text-[11px] text-dim mt-0.5 truncate">{it.sub}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------  车间速览

const CHIP: Record<BayState, string> = {
  working: 'border-ok/40 bg-ok/5',
  waiting: 'border-accent/50 bg-accent/5',
  overtime: 'border-bad/50 bg-bad/5',
  idle: 'border-line bg-white',
};
const CHIP_TEXT: Record<BayState, string> = { working: 'text-ok-ink', waiting: 'text-accent-ink', overtime: 'text-bad', idle: 'text-faint' };
const CHIP_DOT: Record<BayState, 'ok' | 'warn' | 'bad' | 'idle'> = { working: 'ok', waiting: 'warn', overtime: 'bad', idle: 'idle' };

function FloorGlance() {
  const { t } = useLang();
  const nav = useNavigate();
  const bays = useMemo(bayInfos, []);
  const queueN = ON_SITE.filter((v) => v.status === 'queue').length;
  return (
    <div className="flex flex-col gap-2.5">
      {(['2F', '3F'] as const).map((f) => (
        <div key={f} className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-primary w-[210px] shrink-0">{t(f === '2F' ? 'floor.f2' : 'floor.f3')}</span>
          {bays.filter((b) => b.floor === f).map((b) => (
            <button
              key={b.id}
              onClick={() => (b.visit ? nav(`/vehicle/${b.visit.id}`) : nav('/floor'))}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${CHIP[b.state]} hover:brightness-95 transition`}
            >
              <StatusDot tone={CHIP_DOT[b.state]} pulse={b.state === 'overtime'} />
              <span className="text-[12px] text-ink2">{t(`bay.${b.id}` as any)}</span>
              {b.visit
                ? <span className="num text-[12px] font-bold text-ink">{b.visit.plate}</span>
                : <span className={`text-[11px] ${CHIP_TEXT[b.state]}`}>{t('state.idle')}</span>}
            </button>
          ))}
          {f === '3F' && queueN > 0 && (
            <span className="flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/5 px-2.5 py-1.5">
              <StatusDot tone="warn" />
              <span className="text-[12px] text-accent-ink">{t('dash.queueN', { n: queueN })}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------  7 天趋势

function TrendChart() {
  const { t } = useLang();
  const days = useMemo(dayStats, []);
  const wds = t('dash.weekdays') as unknown as string[];
  const labels = days.map((d) => {
    const wd = (d.date.getDay() + 6) % 7; // 周一=0
    return `${wds[wd]}\n${d.date.getMonth() + 1}/${d.date.getDate()}`;
  });
  const med = days.map((d) => +d.medianH.toFixed(2));
  const p90 = days.map((d) => +d.p90H.toFixed(2));
  // 今日未完结 → 最后一段用虚线区分
  const solid = (arr: number[]) => arr.map((v, i) => (i === arr.length - 1 ? null : v));
  const dashed = (arr: number[]) => arr.map((v, i) => (i >= arr.length - 2 ? v : null));
  return (
    <EChart
      height={246}
      option={{
        grid: { left: 36, right: 16, top: 30, bottom: 36 },
        tooltip: { trigger: 'axis', backgroundColor: '#ffffff', borderColor: '#dfe6ee', textStyle: { color: '#22354d', fontSize: 12 } },
        legend: { data: [t('dash.median'), 'P90'], textStyle: { color: C.text, fontSize: 11 }, top: 0, right: 0, itemWidth: 16, itemHeight: 3, icon: 'roundRect' },
        xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 11, interval: 0, lineHeight: 15 } },
        yAxis: { type: 'value', name: 'h', nameTextStyle: { color: C.text }, splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 11 } },
        series: [
          { name: t('dash.median'), type: 'line', smooth: true, data: solid(med), lineStyle: { color: C.accent, width: 2.5 }, itemStyle: { color: C.accent }, areaStyle: { color: 'rgba(18,137,132,0.10)' } },
          { name: 'P90', type: 'line', smooth: true, data: solid(p90), lineStyle: { color: C.bad, width: 2 }, itemStyle: { color: C.bad } },
          { name: t('dash.median'), type: 'line', smooth: true, data: dashed(med), lineStyle: { color: C.accent, width: 2, type: 'dashed' }, itemStyle: { color: C.accent }, tooltip: { show: true }, legendHoverLink: false },
          { name: 'P90', type: 'line', smooth: true, data: dashed(p90), lineStyle: { color: C.bad, width: 2, type: 'dashed' }, itemStyle: { color: C.bad } },
        ],
      }}
    />
  );
}

// ----------------------------------------------------------------  今日时间构成环图

function CompositionDonut() {
  const { t } = useLang();
  const comp = useMemo(todayTimeComposition, []);
  const total = Math.max(1, comp.work + comp.wait + comp.other);
  const activePct = Math.round((comp.work / total) * 100);
  const segs = [
    { key: 'vd.activeWork', min: comp.work, color: C.ok },
    { key: 'vd.waitParts', min: comp.wait, color: C.warn },
    { key: 'vd.other', min: comp.other, color: C.dim },
  ] as const;
  return (
    <div>
      <div className="relative">
        <EChart
          height={168}
          option={{
            tooltip: { backgroundColor: '#ffffff', borderColor: '#dfe6ee', textStyle: { color: '#22354d', fontSize: 12 } },
            series: [{
              type: 'pie', radius: ['64%', '86%'], center: ['50%', '50%'],
              avoidLabelOverlap: true, label: { show: false }, labelLine: { show: false },
              itemStyle: { borderColor: '#ffffff', borderWidth: 2, borderRadius: 4 },
              data: segs.map((s) => ({ name: t(s.key as any), value: s.min, itemStyle: { color: s.color } })),
            }],
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="num text-[26px] font-bold leading-none text-ink">{activePct}%</span>
          <span className="text-[11px] text-dim mt-1">{t('kpi.activeRate')}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 mt-1">
        {segs.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-dim">{t(s.key as any)}</span>
            <span className="num font-bold text-ink2 ml-auto">{fmtH(s.min)}</span>
            <span className="num text-faint w-[34px] text-right">{Math.round((s.min / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------  页面

export default function Dashboard() {
  const { t } = useLang();
  const nav = useNavigate();
  const k = useMemo(kpis, []);
  const roi = useMemo(() => pocRoi(), []);
  const weekLoss = useMemo(totalWaitLossWeek, []);
  const promise = useMemo(deliveryPromises, []);
  const maxRisk = promise.riskRows.length ? Math.max(...promise.riskRows.map((r) => r.riskMin)) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 聚焦 KPI：老板只关心这四件事 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Hero
          label={t('promise.title')} tone="primary"
          value={`${promise.delivered}/${promise.total}`}
          sub={`${t('kpi.onTime')} ${k.onTimePct.toFixed(0)}% · ${t('promise.ok')} ${promise.ok}`}
          visual={<PromiseSegments delivered={promise.delivered} ok={promise.ok} risk={promise.risk} total={promise.total} />}
        />
        <Hero
          label={t('kpi.riskNow')} tone="bad"
          value={String(promise.risk)}
          sub={promise.risk ? t('kpi.maxDelay', { h: `+${fmtH(maxRisk)}` }) : t('kpi.noRisk')}
          visual={
            <div className="flex gap-1.5 flex-wrap">
              {promise.riskRows.map((r) => (
                <span key={r.visit.id} className="inline-flex items-center gap-1 rounded border border-bad/25 bg-bad/5 px-1.5 py-px">
                  <StatusDot tone="bad" />
                  <span className="num text-[11px] font-semibold text-bad">{r.visit.plate}</span>
                </span>
              ))}
            </div>
          }
        />
        <Hero
          label={t('kpi.weekLoss')} tone="accent" isMoney
          value={fmtMoney(weekLoss)}
          sub={t('kpi.roiSub', { low: roi.targetLow, high: roi.targetHigh })}
          visual={<LossSparkline />}
        />
        <Hero
          label={t('kpi.onSite')} tone="teal"
          value={String(k.onSite)}
          sub={t('kpi.inout', { a: k.entries, b: k.exits })}
          visual={
            <div className="flex items-center gap-2">
              <div className="progress-track flex-1" style={{ height: 6 }}>
                <div className="progress-fill bg-teal" style={{ width: `${Math.min(100, k.occupancyPct)}%` }} />
              </div>
              <span className="num text-[11px] text-dim shrink-0">{t('kpi.occupancy')} {k.occupancyPct.toFixed(0)}%</span>
            </div>
          }
        />
      </div>

      {/* 图表区：周转趋势 + 时间构成 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8">
          <SectionTitle icon={<TrendingUp />}>{t('dash.trend7d')}</SectionTitle>
          <TrendChart />
        </Panel>
        <Panel className="xl:col-span-4">
          <SectionTitle icon={<PieChartIcon />}>{t('dash.composition')}</SectionTitle>
          <CompositionDonut />
        </Panel>
      </div>

      {/* 核心：今日交车承诺 + 需要关注 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8">
          <SectionTitle icon={<Truck />} right={
            <div className="flex items-center gap-2">
              <Pill tone="ok"><StatusDot tone="ok" /> {t('promise.done')} {promise.delivered}</Pill>
              <Pill tone="accent"><StatusDot tone="ok" /> {t('promise.ok')} {promise.ok}</Pill>
              <Pill tone="bad"><StatusDot tone="bad" /> {t('promise.risk')} {promise.risk}</Pill>
            </div>
          }>{t('promise.title')}</SectionTitle>
          <div className="flex flex-col gap-2">
            {promise.riskRows.map((r) => {
              const usedMin = r.visit.workMin + r.visit.waitMin;
              const pct = Math.min(100, (usedMin / r.visit.targetMin) * 100);
              return (
                <button
                  key={r.visit.id}
                  onClick={() => nav(`/vehicle/${r.visit.id}`)}
                  className="flex items-center gap-3 rounded-lg border border-bad/25 bg-bad/[0.04] px-3 py-2.5 text-left hover:border-bad/50 transition-colors text-[13px]"
                >
                  <StatusDot tone="bad" pulse />
                  <span className="num font-bold text-ink text-[15px]">{r.visit.plate}</span>
                  <span className="text-dim">{r.visit.wo} · {t(`task.${r.visit.taskType}` as any)}{r.visit.bayId ? ` · ${t(`bay.${r.visit.bayId}` as any)}` : ''}</span>
                  <span className="hidden md:flex items-center gap-2 ml-2 w-[130px] shrink-0">
                    <span className="progress-track flex-1" style={{ height: 5 }}>
                      <span className="progress-fill bg-bad block" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="num text-[11px] text-dim">{Math.round(pct)}%</span>
                  </span>
                  <span className="num text-ink2 ml-auto">
                    {t('promise.promised')} {fmtTime(r.promised)} → {t('promise.eta')} <b className="text-bad">{fmtTime(r.eta)}</b> (+{fmtH(r.riskMin)})
                  </span>
                  {r.cause && <Pill tone="warn">{t(`cause.${r.cause}` as any)}</Pill>}
                </button>
              );
            })}
            <button onClick={() => nav('/vehicles')} className="text-[12px] text-teal hover:text-teal/80 self-start mt-1">
              → {t('dash.okFold', { n: promise.ok + promise.delivered })} · {t('common.viewAll')}
            </button>
          </div>
        </Panel>
        <Panel className="xl:col-span-4">
          <SectionTitle icon={<Bell />} right={<Pill tone="bad">4</Pill>}>{t('dash.attention')}</SectionTitle>
          <AttentionList />
        </Panel>
      </div>

      {/* 车间速览 */}
      <Panel>
        <SectionTitle icon={<Gauge />} right={
          <button onClick={() => nav('/floor')} className="flex items-center gap-1 text-[12px] text-teal hover:text-teal/80">{t('dash.clickFloor')} <ArrowRight size={13} /></button>
        }>{t('dash.floorGlance')}</SectionTitle>
        <FloorGlance />
      </Panel>
    </div>
  );
}
