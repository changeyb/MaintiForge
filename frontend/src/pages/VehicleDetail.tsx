import { useNavigate, useParams } from 'react-router-dom';
import { useLang } from '../i18n';
import { ALL_VISITS, fmtH, fmtMoney, fmtTime, NOW, type TimelineEvent } from '../mock/data';
import { Panel, Pill, ProgressBar, SectionTitle } from '../components/ui';

const EV_ICON: Record<TimelineEvent['type'], string> = {
  entry: '🛬', assign: '📍', bayIn: '🔧', workStart: '▶', pause: '⏸', resume: '▶',
  partsArrived: '📦', overtime: '⚠', bayOut: '🔧', done: '✅', exit: '🛫',
};

function Composition({ work, wait, other }: { work: number; wait: number; other: number }) {
  const { t } = useLang();
  const total = Math.max(1, work + wait + other);
  const segs = [
    { label: t('vd.activeWork'), min: work, cls: 'bg-[#16a34a]', text: 'text-[#15803d]' },
    { label: t('vd.waitParts'), min: wait, cls: 'bg-[#ed9f18]', text: 'text-[#b47207]' },
    { label: t('vd.other'), min: other, cls: 'bg-[#94a3b8]', text: 'text-[#64748b]' },
  ];
  return (
    <div>
      <div className="flex h-[16px] rounded-full overflow-hidden">
        {segs.map((s) => <div key={s.label} className={s.cls} style={{ width: `${(s.min / total) * 100}%` }} />)}
      </div>
      <div className="flex gap-5 mt-2.5">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px]">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.cls}`} />
            <span className="text-[#64748b]">{s.label}</span>
            <span className={`num font-bold ${s.text}`}>{fmtH(s.min)}</span>
            <span className="text-[#94a3b8] num">{Math.round((s.min / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VehicleDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useLang();
  const v = ALL_VISITS.find((x) => x.id === id);
  if (!v) return <div className="text-[#64748b] p-10">Vehicle not found. <button className="text-[#128984]" onClick={() => nav(-1)}>← {t('vd.back')}</button></div>;

  const elapsedMin = v.exitAt
    ? (v.exitAt.getTime() - v.entryAt.getTime()) / 60000
    : (NOW.getTime() - v.entryAt.getTime()) / 60000;
  const usedMin = v.workMin + v.waitMin;
  const pct = (usedMin / v.targetMin) * 100;
  const over = pct > 100;
  const eta = v.etaAt;
  const diffMin = eta ? Math.round((eta.getTime() - v.promisedAt.getTime()) / 60000) : 0;
  const riskTone = diffMin > 20 ? 'bad' : diffMin > 0 ? 'warn' : 'ok';

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => nav(-1)} className="text-[13px] text-[#64748b] hover:text-[#128984] self-start">← {t('vd.back')}</button>

      {/* 头部：车辆 + 进度 */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="num text-[26px] font-black">{v.plate}</span>
              <span className="text-[#64748b] text-[14px]">{v.model}</span>
              {diffMin > 20 ? <Pill tone="bad">🔴 {t('vehicles.overTarget')}</Pill> : diffMin > 0 ? <Pill tone="warn">🟡 {t('vehicles.margin')} {fmtH(-diffMin)}</Pill> : <Pill tone="ok">🟢 OK</Pill>}
            </div>
            <div className="text-[13px] text-[#64748b] mt-1.5 flex items-center gap-4">
              <span>{v.wo} · {t(`task.${v.taskType}` as any)}</span>
              <span>{t('vd.orderAmount')} <b className="num text-[#22354d]">{fmtMoney(v.amount)}</b></span>
              <span>{t('vd.techs')}: {v.techs.length ? v.techs.join(' / ') : '—'}</span>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-[11px] text-[#22354d]0">{t('vd.promised')}</div>
              <div className="num text-[22px] font-bold text-[#22354d]">{fmtTime(v.promisedAt)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#22354d]0">{t('vd.eta')}</div>
              <div className={`num text-[22px] font-bold ${riskTone === 'bad' ? 'text-[#dc2626]' : riskTone === 'warn' ? 'text-[#b47207]' : 'text-[#15803d]'}`}>
                {fmtTime(eta)}{diffMin > 0 && <span className="text-[12px] ml-1">+{fmtH(diffMin)}</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#22354d]0">{t('vd.onSiteFor')}</div>
              <div className="num text-[22px] font-bold text-[#128984]">{fmtH(elapsedMin)}</div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px] text-[#64748b] mb-1.5">
            <span>{t('vd.totalProgress')}</span>
            <span className={`num ${over ? 'text-[#dc2626] font-bold' : ''}`}>
              {Math.round(pct)}% · {fmtH(usedMin)} / {fmtH(v.targetMin)}{over && ` ⚠ ${t('vd.overTargetWarn')}`}
            </span>
          </div>
          <ProgressBar pct={pct} tone={over ? 'bad' : v.status === 'waiting' ? 'warn' : 'ok'} height={12} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* 时间线 */}
        <Panel className="xl:col-span-2">
          <SectionTitle>{t('vd.timeline')}</SectionTitle>
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[#dfe6ee]" />
            <div className="flex flex-col gap-4">
              {v.events.map((e, i) => (
                <div key={i} className="relative">
                  <span className={`absolute -left-6 top-0.5 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center text-[9px]
                    ${e.severity === 'bad' ? 'border-[#dc2626] bg-[#dc2626]/15' : e.severity === 'warn' ? 'border-[#ed9f18] bg-[#ed9f18]/20' : 'border-[#128984] bg-[#128984]/15'}`} />
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="num text-[13px] text-[#22354d]0 w-[42px]">{fmtTime(e.t)}</span>
                    <span className="text-[14px]">{EV_ICON[e.type]}</span>
                    <span className={`text-[14px] font-medium ${e.severity === 'bad' ? 'text-[#dc2626]' : e.severity === 'warn' ? 'text-[#b47207]' : 'text-[#22354d]'}`}>
                      {t(`ev.${e.type}` as any)}
                    </span>
                    {e.note && <span className="text-[12px] text-[#64748b]">{e.note}</span>}
                  </div>
                  {e.evidence && (
                    <div className="ml-[54px] mt-1 flex gap-1.5 flex-wrap">
                      {e.evidence.map((ev, j) => (
                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded border border-[#d4dde8] text-[#64748b] cursor-pointer hover:border-[#128984]/50 hover:text-[#128984]">📎 {ev}</span>
                      ))}
                    </div>
                  )}
                  {e.type === 'resume' && v.pauses.length > 0 && (
                    <div className="ml-[54px] mt-1.5 text-[11px] text-[#b47207]/90 bg-[#ed9f18]/5 border border-[#ed9f18]/20 rounded px-2 py-1">
                      ↑ {t('vd.waitLoss')} {fmtH(v.waitMin)} · {t('vd.rcaAuto')}
                    </div>
                  )}
                </div>
              ))}
              {!v.exitAt && (
                <div className="relative">
                  <span className="absolute -left-6 top-0.5 w-[15px] h-[15px] rounded-full border-2 border-[#16a34a] bg-[#16a34a]/15 live-dot" />
                  <div className="flex items-baseline gap-3">
                    <span className="num text-[13px] text-[#22354d]0 w-[42px]">{fmtTime(NOW)}</span>
                    <span className="text-[14px] text-[#15803d]">{t(`state.${v.status}` as any)}…</span>
                    {v.activityRate !== undefined && v.activityRate > 0 && (
                      <span className="text-[12px] text-[#64748b]">{t('vd.activity')} {v.activityRate}%（{t('vd.baseline')} 80%）</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* 侧栏 */}
        <div className="flex flex-col gap-4">
          <Panel>
            <SectionTitle>{t('vd.composition')}</SectionTitle>
            <Composition work={v.workMin} wait={v.waitMin} other={v.otherMin} />
          </Panel>
          <Panel>
            <SectionTitle>{t('vd.evidence')}</SectionTitle>
            <div className="flex flex-col gap-2 text-[12px] text-[#3d5170]">
              <div className="flex justify-between border-b border-[#e2e8f0] pb-2"><span>📷 {t('vd.evidenceItems.cam')}</span><span className="text-[#22354d]0 num">CAM-01 · {fmtTime(v.entryAt)}</span></div>
              <div className="flex justify-between border-b border-[#e2e8f0] pb-2"><span>🔢 {t('vd.evidenceItems.conf')}</span><span className="num text-[#15803d]">{v.plateConfidence ?? 96}%</span></div>
              {v.pauses.some((p) => p.partNo) && (
                <div className="flex justify-between"><span>📦 {t('vd.evidenceItems.wms')}</span><span className="text-[#22354d]0">{v.pauses.find((p) => p.partNo)?.partNo}</span></div>
              )}
              {v.assignAt && (
                <div className="flex justify-between pt-1"><span>⏱ {t('vd.respTime')}</span><span className="num text-[#128984]">{Math.round((v.assignAt.getTime() - v.entryAt.getTime()) / 60000)}min（{t('vd.teamAvg')} 9min）</span></div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
