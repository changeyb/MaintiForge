import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, CircleCheck, LogIn, LogOut, MapPin, Package, Paperclip, Pause, Play, ScanLine, Timer, TriangleAlert, Wrench,
} from 'lucide-react';
import { useLang } from '../i18n';
import { ALL_VISITS, fmtH, fmtMoney, fmtTime, NOW, TASK_EFF, type TimelineEvent } from '../mock/data';
import { Panel, Pill, ProgressBar, SectionTitle, StatusDot } from '../components/ui';

const EV_ICON: Record<TimelineEvent['type'], typeof LogIn> = {
  entry: LogIn, assign: MapPin, bayIn: Wrench, workStart: Play, pause: Pause, resume: Play,
  partsArrived: Package, overtime: TriangleAlert, bayOut: Wrench, done: CircleCheck, exit: LogOut,
};

function Composition({ work, wait, other }: { work: number; wait: number; other: number }) {
  const { t } = useLang();
  const total = Math.max(1, work + wait + other);
  const segs = [
    { label: t('vd.activeWork'), min: work, cls: 'bg-ok', text: 'text-ok-ink' },
    { label: t('vd.waitParts'), min: wait, cls: 'bg-accent', text: 'text-accent-ink' },
    { label: t('vd.other'), min: other, cls: 'bg-idle', text: 'text-dim' },
  ];
  return (
    <div>
      <div className="flex h-[16px] rounded-full overflow-hidden">
        {segs.map((s) => <div key={s.label} className={s.cls} style={{ width: `${(s.min / total) * 100}%` }} />)}
      </div>
      <div className="flex gap-5 mt-2.5 flex-wrap">
        {segs.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px]">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.cls}`} />
            <span className="text-dim">{s.label}</span>
            <span className={`num font-bold ${s.text}`}>{fmtH(s.min)}</span>
            <span className="text-faint num">{Math.round((s.min / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 同类工单基线：目标 / 同类实际均值 / 本车已用（数据来自 TASK_EFF 推导）
function Baseline({ taskType, usedMin }: { taskType: string; usedMin: number }) {
  const { t } = useLang();
  const eff = TASK_EFF.find((e) => e.task === taskType);
  if (!eff) return null;
  const rows = [
    { label: t('vd.baselineTarget'), min: eff.target, cls: 'bg-idle', text: 'text-dim' },
    { label: t('vd.baselineAvg'), min: eff.actual, cls: 'bg-teal', text: 'text-teal' },
    { label: t('vd.baselineThis'), min: Math.round(usedMin), cls: usedMin > eff.target ? 'bg-bad' : 'bg-accent', text: usedMin > eff.target ? 'text-bad' : 'text-accent-ink' },
  ];
  const max = Math.max(...rows.map((r) => r.min)) * 1.15;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <div className="w-[92px] text-[12px] text-ink2 shrink-0">{r.label}</div>
          <div className="flex-1 progress-track" style={{ height: 12 }}>
            <div className={`h-full rounded ${r.cls}`} style={{ width: `${Math.min(100, (r.min / max) * 100)}%` }} />
          </div>
          <div className={`num text-[12px] font-bold w-[44px] text-right shrink-0 ${r.text}`}>{fmtH(r.min)}</div>
        </div>
      ))}
    </div>
  );
}

export default function VehicleDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useLang();
  const v = ALL_VISITS.find((x) => x.id === id);
  if (!v) return <div className="text-dim p-10">Vehicle not found. <button className="text-teal" onClick={() => nav(-1)}>← {t('vd.back')}</button></div>;

  const elapsedMin = v.exitAt
    ? (v.exitAt.getTime() - v.entryAt.getTime()) / 60000
    : (NOW.getTime() - v.entryAt.getTime()) / 60000;
  const usedMin = v.workMin + v.waitMin;
  const pct = (usedMin / v.targetMin) * 100;
  const over = pct > 100;
  const eta = v.etaAt;
  const diffMin = eta ? Math.round((eta.getTime() - v.promisedAt.getTime()) / 60000) : 0;

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-[13px] text-dim hover:text-teal self-start">
        <ArrowLeft size={14} /> {t('vd.back')}
      </button>

      {/* 头部：车辆 + 进度 */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="num text-[28px] font-black tracking-tight text-ink">{v.plate}</span>
              <span className="text-dim text-[14px]">{v.model}</span>
              {diffMin > 20
                ? <Pill tone="bad"><StatusDot tone="bad" /> {t('vehicles.overTarget')}</Pill>
                : diffMin > 0
                  ? <Pill tone="warn"><StatusDot tone="warn" /> {t('vehicles.margin')} {fmtH(-diffMin)}</Pill>
                  : <Pill tone="ok"><StatusDot tone="ok" /> OK</Pill>}
            </div>
            <div className="text-[13px] text-dim mt-1.5 flex items-center gap-4">
              <span>{v.wo} · {t(`task.${v.taskType}` as any)}</span>
              <span>{t('vd.orderAmount')} <b className="num text-ink">{fmtMoney(v.amount)}</b></span>
              <span>{t('vd.techs')}: {v.techs.length ? v.techs.join(' / ') : '—'}</span>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <div className="text-[11px] text-dim">{t('vd.promised')}</div>
              <div className="num text-[22px] font-bold text-ink">{fmtTime(v.promisedAt)}</div>
            </div>
            <div>
              <div className="text-[11px] text-dim">{t('vd.eta')}</div>
              <div className={`num text-[22px] font-bold ${diffMin > 20 ? 'text-bad' : diffMin > 0 ? 'text-accent-ink' : 'text-ok-ink'}`}>
                {fmtTime(eta)}{diffMin > 0 && <span className="text-[12px] ml-1">+{fmtH(diffMin)}</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-dim">{t('vd.onSiteFor')}</div>
              <div className="num text-[22px] font-bold text-teal">{fmtH(elapsedMin)}</div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px] text-dim mb-1.5">
            <span>{t('vd.totalProgress')}</span>
            <span className={`num inline-flex items-center gap-1 ${over ? 'text-bad font-bold' : ''}`}>
              {Math.round(pct)}% · {fmtH(usedMin)} / {fmtH(v.targetMin)}
              {over && <><TriangleAlert size={12} /> {t('vd.overTargetWarn')}</>}
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
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-line" />
            <div className="flex flex-col gap-4">
              {v.events.map((e, i) => {
                const Icon = EV_ICON[e.type];
                return (
                  <div key={i} className="relative">
                    <span className={`absolute -left-6 top-0.5 w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center
                      ${e.severity === 'bad' ? 'border-bad bg-bad/15' : e.severity === 'warn' ? 'border-accent bg-accent/20' : 'border-teal bg-teal/15'}`} />
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="num text-[13px] text-dim w-[42px]">{fmtTime(e.t)}</span>
                      <Icon size={14} className={`self-center ${e.severity === 'bad' ? 'text-bad' : e.severity === 'warn' ? 'text-accent-ink' : 'text-teal'}`} />
                      <span className={`text-[14px] font-medium ${e.severity === 'bad' ? 'text-bad' : e.severity === 'warn' ? 'text-accent-ink' : 'text-ink'}`}>
                        {t(`ev.${e.type}` as any)}
                      </span>
                      {e.note && <span className="text-[12px] text-dim">{e.note}</span>}
                    </div>
                    {e.evidence && (
                      <div className="ml-[54px] mt-1 flex gap-1.5 flex-wrap">
                        {e.evidence.map((ev, j) => (
                          <span key={j} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-line text-dim cursor-pointer hover:border-teal/50 hover:text-teal">
                            <Paperclip size={10} /> {ev}
                          </span>
                        ))}
                      </div>
                    )}
                    {e.type === 'resume' && v.pauses.length > 0 && (
                      <div className="ml-[54px] mt-1.5 text-[11px] text-accent-ink bg-accent/5 border border-accent/20 rounded px-2 py-1">
                        ↑ {t('vd.waitLoss')} {fmtH(v.waitMin)} · {t('vd.rcaAuto')}
                      </div>
                    )}
                  </div>
                );
              })}
              {!v.exitAt && (
                <div className="relative">
                  <span className="absolute -left-6 top-0.5 w-[15px] h-[15px] rounded-full border-2 border-ok bg-ok/15 live-dot" />
                  <div className="flex items-baseline gap-3">
                    <span className="num text-[13px] text-dim w-[42px]">{fmtTime(NOW)}</span>
                    <span className="text-[14px] text-ok-ink">{t(`state.${v.status}` as any)}…</span>
                    {v.activityRate !== undefined && v.activityRate > 0 && (
                      <span className="text-[12px] text-dim">{t('vd.activity')} {v.activityRate}%（{t('vd.baseline')} 80%）</span>
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
            <SectionTitle>{t('vd.baselinePanel')}</SectionTitle>
            <Baseline taskType={v.taskType} usedMin={usedMin} />
          </Panel>
          <Panel>
            <SectionTitle>{t('vd.evidence')}</SectionTitle>
            <div className="flex flex-col gap-2 text-[12px] text-ink2">
              <div className="flex justify-between border-b border-line pb-2">
                <span className="inline-flex items-center gap-1.5"><Camera size={13} className="text-dim" /> {t('vd.evidenceItems.cam')}</span>
                <span className="text-dim num">CAM-01 · {fmtTime(v.entryAt)}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="inline-flex items-center gap-1.5"><ScanLine size={13} className="text-dim" /> {t('vd.evidenceItems.conf')}</span>
                <span className="num text-ok-ink">{v.plateConfidence ?? 96}%</span>
              </div>
              {v.pauses.some((p) => p.partNo) && (
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="inline-flex items-center gap-1.5"><Package size={13} className="text-dim" /> {t('vd.evidenceItems.wms')}</span>
                  <span className="text-dim">{v.pauses.find((p) => p.partNo)?.partNo}</span>
                </div>
              )}
              {v.assignAt && (
                <div className="flex justify-between pt-1">
                  <span className="inline-flex items-center gap-1.5"><Timer size={13} className="text-dim" /> {t('vd.respTime')}</span>
                  <span className="num text-teal">{Math.round((v.assignAt.getTime() - v.entryAt.getTime()) / 60000)}min（{t('vd.teamAvg')} 9min）</span>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
