import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { bayInfos, dayStats, deliveryPromises, kpis, pocRoi, totalWaitLossWeek, type BayState } from '../derive/metrics';
import { fmtH, fmtMoney, fmtTime, LOW_CONF_PLATES, ON_SITE } from '../mock/data';
import { Panel, Pill, SectionTitle, StatusDot } from '../components/ui';
import EChart, { CHART_COLORS as C } from '../components/EChart';

// ----------------------------------------------------------------  Hero KPI

const HERO_BAR = { primary: 'bg-primary', bad: 'bg-bad', accent: 'bg-accent', teal: 'bg-teal' } as const;
const HERO_TEXT = { primary: 'text-primary', bad: 'text-bad', accent: 'text-accent-ink', teal: 'text-teal' } as const;

function Hero({ label, value, unit, sub, tone }: { label: string; value: string; unit?: string; sub: string; tone: keyof typeof HERO_BAR }) {
  return (
    <div className="panel panel-glow px-4 py-3.5 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${HERO_BAR[tone]}`} />
      <div className="text-[12px] text-dim">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={`num text-[32px] leading-none font-bold ${HERO_TEXT[tone]}`}>{value}</span>
        {unit && <span className="text-[12px] text-faint">{unit}</span>}
      </div>
      <div className="text-[11px] text-faint mt-1.5 truncate">{sub}</div>
    </div>
  );
}

// ----------------------------------------------------------------  需要关注

function AttentionList() {
  const { t } = useLang();
  const nav = useNavigate();
  const items = [
    { tone: 'bad' as const, title: `YQ3220A · ${t('dash.alert.parts')}`, sub: t('dash.alert.partsAction'), to: '/delays' },
    { tone: 'warn' as const, title: t('dash.alert.overtime'), sub: 'YN7663X · WO-2069', to: '/vehicles' },
    { tone: 'warn' as const, title: t('dash.alert.patrol'), sub: '', to: '/analytics' },
    { tone: 'idle' as const, title: t('dash.alert.lowConf'), sub: LOW_CONF_PLATES.map((p) => p.plate).join('  '), to: '/floor' },
  ];
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <button key={i} onClick={() => nav(it.to)} className="flex items-start gap-2.5 rounded-lg border border-line bg-soft px-3 py-2.5 text-left hover:border-teal/50 transition-colors">
          <StatusDot tone={it.tone} pulse={it.tone === 'bad'} />
          <div>
            <div className="text-[13px] text-ink">{it.title}</div>
            {it.sub && <div className="text-[11px] text-faint mt-0.5">{it.sub}</div>}
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
      <button onClick={() => nav('/floor')} className="text-[12px] text-teal hover:text-teal/80 self-start">→ {t('dash.clickFloor')}</button>
    </div>
  );
}

// ----------------------------------------------------------------  趋势

function TrendChart() {
  const { t, lang } = useLang();
  const days = useMemo(dayStats, []);
  const wds = t('dash.weekdays') as unknown as string[];
  const labels = days.map((d) => {
    const wd = (d.date.getDay() + 6) % 7; // 周一=0
    return `${lang === 'zh' ? '' : ''}${wds[wd]}\n${d.date.getMonth() + 1}/${d.date.getDate()}`;
  });
  const med = days.map((d) => +d.medianH.toFixed(2));
  const p90 = days.map((d) => +d.p90H.toFixed(2));
  // 今日未完结 → 最后一段用虚线区分
  const solid = (arr: number[]) => arr.map((v, i) => (i === arr.length - 1 ? null : v));
  const dashed = (arr: number[]) => arr.map((v, i) => (i >= arr.length - 2 ? v : null));
  return (
    <EChart
      height={190}
      option={{
        grid: { left: 36, right: 12, top: 28, bottom: 34 },
        tooltip: { trigger: 'axis', backgroundColor: '#ffffff', borderColor: '#dfe6ee', textStyle: { color: '#22354d', fontSize: 12 } },
        legend: { data: [t('dash.median'), 'P90'], textStyle: { color: C.text, fontSize: 11 }, top: 0, right: 0, itemWidth: 14 },
        xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 10, interval: 0 } },
        yAxis: { type: 'value', name: 'h', nameTextStyle: { color: C.text }, splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 10 } },
        series: [
          { name: t('dash.median'), type: 'line', smooth: true, data: solid(med), lineStyle: { color: C.accent, width: 2.5 }, itemStyle: { color: C.accent }, areaStyle: { color: 'rgba(18,137,132,0.08)' } },
          { name: 'P90', type: 'line', smooth: true, data: solid(p90), lineStyle: { color: C.bad, width: 2 }, itemStyle: { color: C.bad } },
          { name: t('dash.median'), type: 'line', smooth: true, data: dashed(med), lineStyle: { color: C.accent, width: 2, type: 'dashed' }, itemStyle: { color: C.accent }, tooltip: { show: true }, legendHoverLink: false },
          { name: 'P90', type: 'line', smooth: true, data: dashed(p90), lineStyle: { color: C.bad, width: 2, type: 'dashed' }, itemStyle: { color: C.bad } },
        ],
      }}
    />
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
        />
        <Hero
          label={t('kpi.riskNow')} tone="bad"
          value={String(promise.risk)}
          sub={promise.risk ? t('kpi.maxDelay', { h: `+${fmtH(maxRisk)}` }) : t('kpi.noRisk')}
        />
        <Hero
          label={t('kpi.weekLoss')} tone="accent"
          value={fmtMoney(weekLoss)}
          sub={t('kpi.roiSub', { low: roi.targetLow, high: roi.targetHigh })}
        />
        <Hero
          label={t('kpi.onSite')} tone="teal"
          value={String(k.onSite)}
          sub={t('kpi.inout', { a: k.entries, b: k.exits })}
        />
      </div>

      {/* 核心：今日交车承诺 + 需要关注 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8">
          <SectionTitle right={
            <div className="flex items-center gap-2">
              <Pill tone="ok">✅ {t('promise.done')} {promise.delivered}</Pill>
              <Pill tone="accent">🟢 {t('promise.ok')} {promise.ok}</Pill>
              <Pill tone="bad">🔴 {t('promise.risk')} {promise.risk}</Pill>
            </div>
          }>🚚 {t('promise.title')}</SectionTitle>
          <div className="flex flex-col gap-2">
            {promise.riskRows.map((r) => (
              <button
                key={r.visit.id}
                onClick={() => nav(`/vehicle/${r.visit.id}`)}
                className="flex items-center gap-3 rounded-lg border border-bad/25 bg-bad/[0.04] px-3 py-2.5 text-left hover:border-bad/50 transition-colors text-[13px]"
              >
                <StatusDot tone="bad" pulse />
                <span className="num font-bold text-ink text-[15px]">{r.visit.plate}</span>
                <span className="text-dim">{r.visit.wo} · {t(`task.${r.visit.taskType}` as any)}{r.visit.bayId ? ` · ${t(`bay.${r.visit.bayId}` as any)}` : ''}</span>
                <span className="num text-ink2 ml-auto">
                  {t('promise.promised')} {fmtTime(r.promised)} → {t('promise.eta')} <b className="text-bad">{fmtTime(r.eta)}</b> (+{fmtH(r.riskMin)})
                </span>
                {r.cause && <Pill tone="warn">{t(`cause.${r.cause}` as any)}</Pill>}
              </button>
            ))}
            <button onClick={() => nav('/vehicles')} className="text-[12px] text-teal hover:text-teal/80 self-start mt-1">
              → {t('dash.okFold', { n: promise.ok + promise.delivered })} · {t('common.viewAll')}
            </button>
          </div>
        </Panel>
        <Panel className="xl:col-span-4">
          <SectionTitle right={<Pill tone="bad">4</Pill>}>🔔 {t('dash.attention')}</SectionTitle>
          <AttentionList />
        </Panel>
      </div>

      {/* 车间速览 */}
      <Panel>
        <SectionTitle>{t('dash.floorGlance')}</SectionTitle>
        <FloorGlance />
      </Panel>

      {/* 趋势 */}
      <Panel>
        <SectionTitle>{t('dash.trend7d')}</SectionTitle>
        <TrendChart />
      </Panel>
    </div>
  );
}
