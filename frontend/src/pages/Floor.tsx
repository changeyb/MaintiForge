import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { bayInfos } from '../derive/metrics';
import { fmtDur, fmtTime, NOW, ON_SITE, RECENT_EVENTS, type BayId } from '../mock/data';
import { Panel, Pill, StatusDot } from '../components/ui';

const STATE_STYLE: Record<string, { ring: string; bg: string; text: string; pill: 'ok' | 'warn' | 'bad' | 'dim' }> = {
  working: { ring: 'border-emerald-400/40', bg: 'from-emerald-400/10', text: 'text-emerald-300', pill: 'ok' },
  waiting: { ring: 'border-amber-400/50', bg: 'from-amber-400/10', text: 'text-amber-300', pill: 'warn' },
  overtime: { ring: 'border-red-400/60', bg: 'from-red-400/10', text: 'text-red-300', pill: 'bad' },
  idle: { ring: 'border-slate-500/30', bg: 'from-slate-400/5', text: 'text-slate-400', pill: 'dim' },
};

function Gate({ type }: { type: 'entry' | 'exit' }) {
  const { t } = useLang();
  const isEntry = type === 'entry';
  return (
    <div className="panel px-4 py-3 flex items-center gap-3 min-w-[300px]">
      <div className={`text-[22px] ${isEntry ? 'text-sky-400' : 'text-emerald-400'}`}>{isEntry ? '⇥' : '⇤'}</div>
      <div>
        <div className="text-[12px] text-slate-400 flex items-center gap-2">
          {isEntry ? t('floor.entry') : t('floor.exit')} · {isEntry ? 'CAM-01' : 'CAM-02'}
          <StatusDot tone="ok" pulse />
        </div>
        {isEntry ? (
          <div className="text-[13px] mt-0.5">
            <span className="num font-bold text-slate-100">闽D·8K317</span>
            <span className="text-slate-400"> → 14:28 {t('floor.enteredAt')}</span>
            <span className="text-amber-400 text-[11px] ml-2">{t('floor.confidence')} 81% ⚠</span>
          </div>
        ) : (
          <div className="text-[13px] mt-0.5 text-slate-300">{t('floor.exitedToday')} <b className="num text-emerald-300">15</b></div>
        )}
      </div>
    </div>
  );
}

function BayCard({ id }: { id: BayId }) {
  const { t } = useLang();
  const nav = useNavigate();
  const bay = useMemo(() => bayInfos().find((b) => b.id === id)!, [id]);
  const s = STATE_STYLE[bay.state];
  const v = bay.visit;
  return (
    <div
      onClick={() => v && nav(`/vehicle/${v.id}`)}
      className={`relative rounded-xl border ${s.ring} bg-gradient-to-b ${s.bg} to-transparent p-4 min-h-[210px] flex flex-col ${v ? 'cursor-pointer hover:brightness-125 transition' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-slate-200">{t(`bay.${bay.id}` as any)}</div>
        <Pill tone={s.pill}>{t(`state.${bay.state}` as any)}</Pill>
      </div>
      {v ? (
        <>
          <div className="num text-[22px] font-black text-slate-50 mt-3">{v.plate}</div>
          <div className="text-[12px] text-slate-400">{v.wo} · {t(`task.${v.taskType}` as any)}</div>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className={`num ${bay.state === 'overtime' ? 'text-red-300 font-bold' : 'text-slate-300'}`}>
              ⏱ {t('floor.usedOf', { used: `${bay.usedH.toFixed(1)}h`, target: `${bay.targetH.toFixed(0)}h` })}
              {bay.state === 'overtime' && ' ⚠'}
            </span>
          </div>
          <div className="progress-track mt-1.5" style={{ height: 6 }}>
            <div
              className={`h-full rounded ${bay.state === 'overtime' ? 'bg-red-400' : bay.state === 'waiting' ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(100, (bay.usedH / bay.targetH) * 100)}%` }}
            />
          </div>
          <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>👷 {v.techs.length > 0 ? `${v.techs.length} ${t('floor.techs')}` : `0 ${t('floor.techs')} ⚠`}</span>
            <span>{bay.patrolled ? `👁 ${t('floor.patrolled')}` : `👁 ${t('floor.notPatrolled')}`}</span>
            <span className={bay.camHealth === 'warn' ? 'text-amber-400' : ''}>{bay.cam} {bay.camHealth === 'warn' ? '⚠遮挡' : '●'}</span>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
          <div className="text-[28px] opacity-40">⛽</div>
          <div className="text-[13px] mt-1">{t('floor.idleFor', { t: `${bay.idleH}h` })}</div>
        </div>
      )}
      {bay.camHealth === 'warn' && (
        <div className="absolute top-2 right-2"></div>
      )}
    </div>
  );
}

function Ticker() {
  const items = [...RECENT_EVENTS, ...RECENT_EVENTS];
  return (
    <div className="h-[26px] overflow-hidden relative">
      <div style={{ animation: 'ticker 24s linear infinite' }}>
        {items.map((e, i) => (
          <div key={i} className="h-[26px] flex items-center gap-3 text-[12px]">
            <span className="num text-slate-500">{fmtTime(e.t)}</span>
            <span className={e.level === 'bad' ? 'text-red-300' : e.level === 'warn' ? 'text-amber-300' : 'text-slate-300'}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Floor() {
  const { t } = useLang();
  const queue = ON_SITE.filter((v) => v.status === 'queue');
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-bold">{t('floor.title')}</h1>
        <div className="flex items-center gap-4 text-[12px] text-slate-400">
          <span className="flex items-center gap-1.5"><StatusDot tone="ok" pulse /> {t('floor.latency')} 3s</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1"><StatusDot tone="ok" />{t('state.working')}</span>
            <span className="flex items-center gap-1"><StatusDot tone="warn" />{t('state.waiting')}</span>
            <span className="flex items-center gap-1"><StatusDot tone="bad" />{t('state.overtime')}</span>
            <span className="flex items-center gap-1"><StatusDot tone="idle" />{t('state.idle')}</span>
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        <Gate type="entry" />
        <Gate type="exit" />
        {/* 待分配队列 */}
        <Panel className="flex-1">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-[13px] text-slate-400 shrink-0">{t('floor.queue')} <b className="num text-amber-300 text-[18px]">({queue.length})</b></div>
            {queue.map((v) => {
              const waitMin = Math.round((NOW.getTime() - v.entryAt.getTime()) / 60000);
              const warn = waitMin > 30;
              return (
                <div key={v.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${warn ? 'border-amber-400/50 bg-amber-400/5' : 'border-[#1e2b47] bg-[#0b1222]'}`}>
                  <span className="num font-bold text-slate-100 text-[14px]">{v.plate}</span>
                  <span className={`num text-[12px] ${warn ? 'text-amber-300' : 'text-slate-400'}`}>{t('floor.waiting')} {fmtDur(waitMin)}{warn && ' ⚠'}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 text-[12px] text-sky-300/90 bg-sky-400/5 border border-sky-400/20 rounded-lg px-3 py-2">
            💡 {t('floor.insight', { n: 3, h: '2.5h' })}
          </div>
        </Panel>
      </div>

      {/* 五工位 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {(['mech1', 'mech2', 'body', 'paint', 'qc'] as BayId[]).map((id) => <BayCard key={id} id={id} />)}
      </div>

      {/* 事件跑马灯 */}
      <Panel className="py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1.5"><StatusDot tone="ok" pulse />{t('floor.ticker')}</span>
          <div className="flex-1"><Ticker /></div>
        </div>
      </Panel>
    </div>
  );
}
