import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { bayInfos, dayStats, deliveryPromises, kpis, pocRoi, rcaDistribution } from '../derive/metrics';
import { fmtH, fmtMoney, fmtTime, LOW_CONF_PLATES } from '../mock/data';
import { KpiCard, Panel, Pill, SectionTitle, StatusDot } from '../components/ui';
import EChart, { CHART_COLORS as C } from '../components/EChart';

const bayTone: Record<string, { bar: string; text: string; pill: 'ok' | 'warn' | 'bad' | 'dim' }> = {
  working: { bar: 'bg-emerald-400', text: 'text-emerald-300', pill: 'ok' },
  waiting: { bar: 'bg-amber-400', text: 'text-amber-300', pill: 'warn' },
  overtime: { bar: 'bg-red-400', text: 'text-red-300', pill: 'bad' },
  idle: { bar: 'bg-slate-500', text: 'text-slate-400', pill: 'dim' },
};

function MiniFloor() {
  const { t } = useLang();
  const nav = useNavigate();
  const bays = useMemo(bayInfos, []);
  return (
    <div>
      <div className="grid grid-cols-5 gap-2.5">
        {bays.map((b) => {
          const tone = bayTone[b.state];
          return (
            <div key={b.id} className="rounded-lg border border-[#1e2b47] bg-[#0b1222] p-3 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${tone.bar}`} />
              <div className="text-[12px] text-slate-400">{t(`bay.${b.id}` as any)}</div>
              <div className={`text-[13px] font-semibold mt-0.5 ${tone.text}`}>{t(`state.${b.state}` as any)}</div>
              {b.visit ? (
                <>
                  <div className="num text-[15px] font-bold text-slate-100 mt-1.5">{b.visit.plate}</div>
                  <div className="num text-[11px] text-slate-500">
                    {b.usedH.toFixed(1)} / {b.targetH.toFixed(0)}h
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-slate-600 mt-1.5">{t('floor.idleFor', { t: `${b.idleH}h` })}</div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={() => nav('/floor')} className="mt-3 text-[12px] text-sky-400 hover:text-sky-300">→ {t('dash.clickFloor')}</button>
    </div>
  );
}

function AttentionList() {
  const { t } = useLang();
  const nav = useNavigate();
  const items = [
    { tone: 'bad' as const, title: `闽D·3M220 · ${t('dash.alert.parts')}`, sub: t('dash.alert.partsAction'), to: '/delays' },
    { tone: 'warn' as const, title: t('dash.alert.paintOt'), sub: '闽D·7R663 · WO-2069', to: '/vehicles' },
    { tone: 'warn' as const, title: t('dash.alert.patrol'), sub: '', to: '/analytics' },
    { tone: 'idle' as const, title: t('dash.alert.lowConf'), sub: LOW_CONF_PLATES.map((p) => p.plate).join('  '), to: '/floor' },
  ];
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <button key={i} onClick={() => nav(it.to)} className="flex items-start gap-2.5 rounded-lg border border-[#1e2b47] bg-[#0b1222] px-3 py-2.5 text-left hover:border-sky-400/40 transition-colors">
          <StatusDot tone={it.tone} pulse={it.tone === 'bad'} />
          <div>
            <div className="text-[13px] text-slate-200">{it.title}</div>
            {it.sub && <div className="text-[11px] text-slate-500 mt-0.5">{it.sub}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}

function RcaBars() {
  const { t } = useLang();
  const nav = useNavigate();
  const dist = useMemo(rcaDistribution, []);
  const tones = ['bg-red-400', 'bg-amber-400', 'bg-sky-400', 'bg-slate-500', 'bg-emerald-400'];
  return (
    <div className="flex flex-col gap-2.5">
      {dist.map((d, i) => (
        <div key={d.cause} className="flex items-center gap-3">
          <div className="w-[88px] text-[12px] text-slate-300 shrink-0">{t(`cause.${d.cause}` as any)}</div>
          <div className="flex-1 progress-track" style={{ height: 14 }}>
            <div className={`h-full rounded ${tones[i]}`} style={{ width: `${d.pct}%` }} />
          </div>
          <div className="num w-[76px] text-right text-[12px] text-slate-400 shrink-0">
            {d.pct}%{d.count > 0 ? ` · ${d.count}` : ''}
          </div>
        </div>
      ))}
      <button onClick={() => nav('/delays')} className="mt-1 text-[12px] text-sky-400 hover:text-sky-300 self-start">→ {t('common.viewAll')}</button>
    </div>
  );
}

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
      height={210}
      option={{
        grid: { left: 36, right: 12, top: 28, bottom: 34 },
        tooltip: { trigger: 'axis', backgroundColor: '#131c33', borderColor: '#1e2b47', textStyle: { color: '#e6edf7', fontSize: 12 } },
        legend: { data: [t('dash.median'), 'P90'], textStyle: { color: C.text, fontSize: 11 }, top: 0, right: 0, itemWidth: 14 },
        xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 10, interval: 0 } },
        yAxis: { type: 'value', name: 'h', nameTextStyle: { color: C.text }, splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 10 } },
        series: [
          { name: t('dash.median'), type: 'line', smooth: true, data: solid(med), lineStyle: { color: C.accent, width: 2.5 }, itemStyle: { color: C.accent }, areaStyle: { color: 'rgba(56,189,248,0.08)' } },
          { name: 'P90', type: 'line', smooth: true, data: solid(p90), lineStyle: { color: C.bad, width: 2 }, itemStyle: { color: C.bad } },
          { name: t('dash.median'), type: 'line', smooth: true, data: dashed(med), lineStyle: { color: C.accent, width: 2, type: 'dashed' }, itemStyle: { color: C.accent }, tooltip: { show: true }, legendHoverLink: false },
          { name: 'P90', type: 'line', smooth: true, data: dashed(p90), lineStyle: { color: C.bad, width: 2, type: 'dashed' }, itemStyle: { color: C.bad } },
        ],
      }}
    />
  );
}

export default function Dashboard() {
  const { t } = useLang();
  const k = useMemo(kpis, []);
  const roi = useMemo(() => pocRoi(), []);
  const promise = useMemo(deliveryPromises, []);

  const delta = (v: number, goodWhenDown = true) => ({
    delta: `${v >= 0 ? '↑' : '↓'} ${Math.abs(v).toFixed(0)}%`,
    deltaGood: goodWhenDown ? v < 0 : v > 0,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* KPI 行 */}
      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-2.5">
        <KpiCard label={t('kpi.onSite')} value={String(k.onSite)} sub={t('kpi.onSite.sub')} tone="accent" />
        <KpiCard label={t('kpi.entryToday')} value={String(k.entries)} />
        <KpiCard label={t('kpi.exitToday')} value={String(k.exits)} />
        <KpiCard label={t('kpi.medianTat')} value={k.medianTatH.toFixed(1)} unit="h" {...delta(k.medianDeltaPct)} sub={t('kpi.vsYesterday')} />
        <KpiCard label={t('kpi.p90Tat')} value={k.p90TatH.toFixed(1)} unit="h" tone={k.p90DeltaPct > 5 ? 'bad' : undefined} {...delta(k.p90DeltaPct)} sub={t('kpi.vsYesterday')} />
        <KpiCard label={t('kpi.onTime')} value={k.onTimePct.toFixed(0)} unit="%" delta={`↓ 3pt`} deltaGood={false} sub={t('kpi.vsLastWeek')} />
        <KpiCard label={t('kpi.occupancy')} value={k.occupancyPct.toFixed(0)} unit="%" />
        <KpiCard label={t('kpi.activeRate')} value={k.activePct.toFixed(0)} unit="%" tone={k.activePct < 65 ? 'warn' : undefined} sub={k.activePct < 65 ? '⚠ <65%' : ''} />
        <KpiCard label={t('kpi.waitLoss')} value={fmtMoney(k.waitLoss)} tone="warn" delta="↑ 18%" deltaGood={false} sub={t('kpi.vsYesterday')} />
        <KpiCard label={t('kpi.revenue')} value={fmtMoney(k.revenue)} tone="ok" {...delta(k.revenueDeltaPct, false)} sub={t('kpi.vsYesterday')} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.04] px-4 py-2">
        <span className="text-[12px] text-amber-200">{t('poc.roi.banner', { loss: roi.weekLoss.toLocaleString('zh-CN'), low: roi.targetLow.toLocaleString('zh-CN'), high: roi.targetHigh.toLocaleString('zh-CN') })}</span>
        <Pill tone="accent">{t('poc.roi.badge')}</Pill>
      </div>

      {/* 交付承诺 */}
      <Panel>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[20px]">🚗</span>
            <div>
              <div className="text-[13px] text-slate-400">{t('promise.title')}</div>
              <div className="num text-[26px] font-bold text-slate-100 leading-none">{promise.total} <span className="text-[13px] text-slate-500 font-normal">{t('common.today')}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Pill tone="ok">✅ {t('promise.done')} {promise.delivered}</Pill>
            <Pill tone="accent">🟢 {t('promise.ok')} {promise.ok}</Pill>
            <Pill tone="bad">🔴 {t('promise.risk')} {promise.risk}</Pill>
          </div>
          <div className="flex-1 min-w-[420px] flex flex-col gap-1.5">
            {promise.riskRows.map((r) => (
              <div key={r.visit.id} className="flex items-center gap-3 text-[13px]">
                <StatusDot tone="bad" pulse />
                <span className="num font-semibold text-slate-100">{r.visit.plate}</span>
                <span className="text-slate-400">{t(`task.${r.visit.taskType}` as any)}</span>
                <span className="num text-slate-300">{t('promise.promised')} {fmtTime(r.promised)} → {t('promise.eta')} <b className="text-red-400">{fmtTime(r.eta)}</b> (+{fmtH(r.riskMin)})</span>
                {r.cause && <span className="text-slate-500 text-[12px]">{t('promise.cause')}: {t(`cause.${r.cause}` as any)}</span>}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* 中部：迷你地图 + 关注列表 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-7">
          <SectionTitle>{t('dash.miniFloor')}</SectionTitle>
          <MiniFloor />
        </Panel>
        <Panel className="xl:col-span-5">
          <SectionTitle right={<Pill tone="bad">4</Pill>}>🔔 {t('dash.attention')}</SectionTitle>
          <AttentionList />
        </Panel>
      </div>

      {/* 底部：根因 + 趋势 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <SectionTitle>{t('dash.rcaWeek')}</SectionTitle>
          <RcaBars />
        </Panel>
        <Panel>
          <SectionTitle>{t('dash.trend7d')}</SectionTitle>
          <TrendChart />
        </Panel>
      </div>
    </div>
  );
}
