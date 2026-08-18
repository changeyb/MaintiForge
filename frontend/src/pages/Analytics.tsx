import { useMemo } from 'react';
import { useLang } from '../i18n';
import { HEATMAP, SHIFT_STATS, TASK_EFF } from '../mock/data';
import { tatHistogram } from '../derive/metrics';
import { Panel, Pill, SectionTitle } from '../components/ui';
import EChart, { CHART_COLORS as C } from '../components/EChart';

function Histogram() {
  const { t } = useLang();
  const { bins, counts } = useMemo(tatHistogram, []);
  return (
    <EChart
      height={230}
      option={{
        grid: { left: 36, right: 12, top: 24, bottom: 26 },
        tooltip: { backgroundColor: '#131c33', borderColor: '#1e2b47', textStyle: { color: '#e6edf7', fontSize: 12 } },
        xAxis: { type: 'category', data: bins, axisLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 10 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: C.grid } }, axisLabel: { color: C.text, fontSize: 10 } },
        series: [{
          type: 'bar', barWidth: '55%',
          data: counts.map((c, i) => ({ value: c, itemStyle: { color: i < 4 ? C.accent : i < 6 ? C.warn : C.bad, borderRadius: [3, 3, 0, 0] } })),
          markLine: {
            symbol: 'none',
            lineStyle: { color: C.ok, type: 'dashed', width: 1.5 },
            label: { color: C.ok, fontSize: 10, formatter: t('ana.targetLine') + ' 4h' },
            data: [{ xAxis: 3 }],
          },
        }],
      }}
    />
  );
}

function Heatmap() {
  const { t } = useLang();
  const bayIds = ['mech1', 'mech2', 'body', 'paint', 'qc'] as const;
  const hours = Array.from({ length: 12 }, (_, i) => `${8 + i}:00`);
  const data: [number, number, number][] = [];
  HEATMAP.forEach((row, b) => row.forEach((v, h) => data.push([h, b, +v.toFixed(2)])));
  return (
    <EChart
      height={215}
      option={{
        grid: { left: 60, right: 12, top: 10, bottom: 44 },
        tooltip: { backgroundColor: '#131c33', borderColor: '#1e2b47', textStyle: { color: '#e6edf7', fontSize: 12 } },
        xAxis: { type: 'category', data: hours, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: C.text, fontSize: 10 } },
        yAxis: { type: 'category', data: bayIds.map((b) => t(`bay.${b}` as any)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: C.text, fontSize: 11 } },
        visualMap: {
          min: 0, max: 1, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
          itemWidth: 10, itemHeight: 80, textStyle: { color: C.text, fontSize: 9 },
          inRange: { color: ['#101a33', '#1d4ed8', '#38bdf8', '#fbbf24', '#ef4444'] },
        },
        series: [{ type: 'heatmap', data, label: { show: false }, itemStyle: { borderColor: '#070b16', borderWidth: 2, borderRadius: 3 } }],
      }}
    />
  );
}

function TaskEfficiency() {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-3">
      {TASK_EFF.map((e) => (
        <div key={e.task} className="flex items-center gap-3">
          <div className="w-[76px] text-[12px] text-slate-300 shrink-0">{t(`task.${e.task}` as any)}</div>
          <div className="flex-1 progress-track" style={{ height: 13 }}>
            <div
              className={`h-full rounded ${e.rate >= 90 ? 'bg-emerald-400' : e.rate >= 75 ? 'bg-sky-400' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, e.rate)}%` }}
            />
          </div>
          <div className="num text-[11px] text-slate-400 w-[128px] shrink-0 text-right">
            {(e.target / 60).toFixed(1)}h → {(e.actual / 60).toFixed(1)}h · <b className={e.rate >= 90 ? 'text-emerald-300' : e.rate >= 75 ? 'text-sky-300' : 'text-amber-300'}>{e.rate}%</b>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShiftTable() {
  const { t } = useLang();
  const medDiff = Math.round(((SHIFT_STATS.B.medianH - SHIFT_STATS.A.medianH) / SHIFT_STATS.A.medianH) * 100);
  const rows = [
    { label: t('kpi.medianTat'), a: `${SHIFT_STATS.A.medianH.toFixed(1)}h`, b: `${SHIFT_STATS.B.medianH.toFixed(1)}h`, bad: SHIFT_STATS.B.medianH > SHIFT_STATS.A.medianH * 1.1, diff: `B ${medDiff >= 0 ? '+' : ''}${medDiff}%` },
    { label: t('kpi.onTime'), a: `${SHIFT_STATS.A.onTime.toFixed(0)}%`, b: `${SHIFT_STATS.B.onTime.toFixed(0)}%`, bad: SHIFT_STATS.B.onTime < SHIFT_STATS.A.onTime - 5, diff: `${Math.round(SHIFT_STATS.B.onTime - SHIFT_STATS.A.onTime)}pt` },
    { label: t('kpi.occupancy'), a: `${SHIFT_STATS.A.occupancy}%`, b: `${SHIFT_STATS.B.occupancy}%`, bad: false, diff: '' },
    { label: t('ana.patrol'), a: `${SHIFT_STATS.A.patrol}%`, b: `${SHIFT_STATS.B.patrol}%`, bad: true, diff: `${t('ana.missedPatrol')} ${SHIFT_STATS.B.missedPatrol}${t('ana.times') || '×'}` },
  ];
  return (
    <div>
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1.3fr] gap-2 text-[11px] text-slate-500 pb-2 border-b border-[#1e2b47]">
        <span>{t('ana.metric')}</span><span>A</span><span>B</span><span>{t('ana.diff')}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1.6fr_1fr_1fr_1.3fr] gap-2 items-center py-2.5 border-b border-[#16213a] text-[13px]">
          <span className="text-slate-300">{r.label}</span>
          <span className="num text-slate-200">{r.a}</span>
          <span className={`num ${r.bad ? 'text-red-400 font-bold' : 'text-slate-200'}`}>{r.b}</span>
          <span>{r.diff && (r.bad ? <Pill tone="bad">{r.diff}</Pill> : <Pill tone="ok">{r.diff}</Pill>)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[18px] font-bold">{t('ana.title')}</h1>
        <div className="flex items-center gap-2.5">
          <Pill tone="dim">{t('ana.last4w')}</Pill>
          <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg border border-[#2a3a5c] text-[12px] text-slate-300 hover:border-sky-400/50 hover:text-sky-300 transition-colors">
            📄 {t('common.export')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <SectionTitle>{t('ana.tatDist')} <span className="text-slate-500 font-normal text-[11px] ml-1">({t('common.week')} · 110 {t('ana.vehicles') || '辆'})</span></SectionTitle>
          <Histogram />
        </Panel>
        <Panel>
          <SectionTitle>{t('ana.shiftCompare')}</SectionTitle>
          <ShiftTable />
          <div className="mt-3 text-[12px] text-amber-200/90 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
            💡 {t('ana.shiftInsight')}
          </div>
        </Panel>
        <Panel>
          <SectionTitle>{t('ana.heatmap')}</SectionTitle>
          <Heatmap />
        </Panel>
        <Panel>
          <SectionTitle>{t('ana.taskEff')}</SectionTitle>
          <TaskEfficiency />
          <div className="mt-3 text-[12px] text-sky-200/90 bg-sky-400/5 border border-sky-400/20 rounded-lg px-3 py-2">
            💡 {t('ana.bottleneckInsight')}
          </div>
        </Panel>
      </div>
    </div>
  );
}
