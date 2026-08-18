import { useMemo } from 'react';
import { Diamond } from 'lucide-react';
import { useLang } from '../i18n';
import { kpis, pocRoi } from '../derive/metrics';
import { DELAYS, LOW_CONF_PLATES, ON_SITE, SHIFT_STATS } from '../mock/data';
import { Panel, Pill, SectionTitle } from '../components/ui';

export default function Poc() {
  const { t } = useLang();
  const k = useMemo(kpis, []);
  const roi = useMemo(() => pocRoi(), []);

  const lineageRows = [
    { metric: 'poc.metric.onSite', source: 'poc.source.anpr', value: String(ON_SITE.length), unit: 'poc.unit.vehicles', evidence: 'poc.evidence.gate' },
    { metric: 'poc.metric.occupancy', source: 'poc.source.bayCamera', value: k.occupancyPct.toFixed(0), unit: 'poc.unit.percent', evidence: 'poc.evidence.bay' },
    { metric: 'poc.metric.activeRate', source: 'poc.source.behavior', value: k.activePct.toFixed(0), unit: 'poc.unit.percent', evidence: 'poc.evidence.behavior' },
    { metric: 'poc.metric.patrol', source: 'poc.source.supervisor', value: String(SHIFT_STATS.B.patrol), unit: 'poc.unit.percent', evidence: 'poc.evidence.patrol' },
    { metric: 'poc.metric.waitLoss', source: 'poc.source.wms', value: roi.weekLoss.toLocaleString('zh-CN'), unit: 'poc.unit.yuan', evidence: 'poc.evidence.wait' },
    { metric: 'poc.metric.delays', source: 'poc.source.rca', value: String(DELAYS.length), unit: 'poc.unit.cases', evidence: 'poc.evidence.review' },
    { metric: 'poc.metric.lowConf', source: 'poc.source.confidence', value: String(LOW_CONF_PLATES.length), unit: 'poc.unit.cases', evidence: 'poc.evidence.review' },
  ] as const;

  const acceptanceRows = [
    { label: 'poc.acceptance.anpr.label', target: 'poc.acceptance.anpr.target', def: 'poc.acceptance.anpr.def' },
    { label: 'poc.acceptance.bay.label', target: 'poc.acceptance.bay.target', def: 'poc.acceptance.bay.def' },
    { label: 'poc.acceptance.rca.label', target: 'poc.acceptance.rca.target', def: 'poc.acceptance.rca.def' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <Panel className="border-[#128984]/25 bg-gradient-to-r from-[#128984]/[0.06] via-white to-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[24px] font-bold text-[#22354d]">{t('poc.title')}</div>
            <div className="text-[13px] text-[#64748b] mt-1">{t('poc.subtitle')}</div>
          </div>
          <Pill tone="accent">{t('poc.header.badge')}</Pill>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-8 p-0 overflow-hidden">
          <div className="p-4 pb-3">
            <SectionTitle>{t('poc.dataLineage')}</SectionTitle>
            <div className="text-[12px] text-dim">{t('poc.dataLineageIntro')}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="border-y border-[#dfe6ee] bg-[#eef2f7] text-[11px] uppercase tracking-wide text-dim">
                  <th className="px-4 py-2.5 font-medium">{t('poc.column.metric')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('poc.column.source')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('poc.column.current')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('poc.column.evidence')}</th>
                </tr>
              </thead>
              <tbody>
                {lineageRows.map((row) => (
                  <tr key={row.metric} className="border-b border-[#e2e8f0] last:border-0 align-top">
                    <td className="px-4 py-3 text-[13px] text-[#22354d]">{t(row.metric)}</td>
                    <td className="px-4 py-3 text-[12px] leading-5 text-[#64748b]">{t(row.source)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="num text-[19px] font-bold text-[#128984]">{row.value}</span>
                      <span className="ml-1 text-[11px] text-dim">{t(row.unit)}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] leading-5 text-[#15803d]/80">{t(row.evidence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="xl:col-span-4 border-[#ed9f18]/20 bg-[#ed9f18]/[0.04]">
          <SectionTitle right={<Pill tone="accent">{t('poc.roi.badge')}</Pill>}>{t('poc.roi.title')}</SectionTitle>
          <div className="num text-[38px] font-bold text-[#b47207] leading-none mt-5">
            {roi.targetLow.toLocaleString('zh-CN')}–{roi.targetHigh.toLocaleString('zh-CN')}<span className="text-[14px] font-normal text-dim ml-1">{t('poc.unit.yuan')}</span>
          </div>
          <div className="text-[12px] text-[#64748b] mt-3">{t('poc.roi.body')}</div>
          {/* 损失 vs 可干预：双条对比 */}
          <div className="mt-5 flex flex-col gap-2.5">
            {[
              { label: t('poc.metric.waitLoss'), v: roi.weekLoss, cls: 'bg-[#ed9f18]', dot: 'bg-[#ed9f18]' },
              { label: t('poc.roi.intervenable'), v: roi.intervenableLoss, cls: 'bg-[#128984]', dot: 'bg-[#128984]' },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex items-center gap-2 text-[12px] text-dim">
                  <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                  <span className="flex-1">{r.label}</span>
                  <span className="num font-semibold text-[#3d5170]">{r.v.toLocaleString('zh-CN')} {t('poc.unit.yuan')}</span>
                </div>
                <div className="progress-track mt-1" style={{ height: 7 }}>
                  <div className={`progress-fill ${r.cls}`} style={{ width: `${(r.v / Math.max(1, roi.weekLoss)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel className="xl:col-span-7">
          <SectionTitle right={<Pill tone="accent">{t('poc.acceptance.status')}</Pill>}>{t('poc.acceptance.title')}</SectionTitle>
          <div className="text-[12px] text-[#64748b] mb-4">{t('poc.acceptance.intro')}</div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Pill tone="accent">{t('poc.acceptance.period')}</Pill>
            <Pill tone="accent">{t('poc.acceptance.site')}</Pill>
          </div>
          <div className="rounded-lg border border-[#dfe6ee] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 bg-[#eef2f7] text-[11px] text-dim">
              <span>{t('poc.acceptance.metric')}</span>
              <span>{t('poc.acceptance.threshold')}</span>
              <span>{t('poc.acceptance.defCol')}</span>
            </div>
            {acceptanceRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-3 border-t border-[#e2e8f0]">
                <span className="text-[13px] text-[#22354d]">{t(row.label)}</span>
                <span className="num text-[18px] font-bold text-[#15803d]">{t(row.target)}</span>
                <span className="text-[11px] leading-4 text-dim text-right max-w-[200px]">{t(row.def)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[12px] leading-5 text-[#128984]">{t('poc.acceptance.definition')}</div>
        </Panel>

        <Panel className="xl:col-span-5">
          <SectionTitle right={<Pill tone="dim">{t('poc.roadmap.badge')}</Pill>}>{t('poc.roadmap.title')}</SectionTitle>
          <div className="flex flex-col gap-3 text-[13px] text-[#3d5170]">
            <div className="flex items-center gap-2"><Diamond size={11} className="text-teal" /><span>{t('poc.roadmap.item.badge')}</span></div>
            <div className="flex items-center gap-2"><Diamond size={11} className="text-teal" /><span>{t('poc.roadmap.item.attendance')}</span></div>
            <div className="flex items-center gap-2"><Diamond size={11} className="text-teal" /><span>{t('poc.roadmap.item.hours')}</span></div>
            <div className="flex items-center gap-2"><Diamond size={11} className="text-teal" /><span>{t('poc.roadmap.item.ranking')}</span></div>
          </div>
          <div className="mt-5 rounded-lg border border-[#94a3b8]/30 bg-[#94a3b8]/[0.08] px-3 py-3 text-[12px] leading-5 text-[#64748b]">{t('poc.roadmap.compliance')}</div>
        </Panel>
      </div>

      <div className="text-[11px] leading-5 text-[#94a3b8] px-1">{t('poc.footer')}</div>
    </div>
  );
}
