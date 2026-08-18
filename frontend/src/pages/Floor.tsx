import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { bayInfos, type BayInfo } from '../derive/metrics';
import { fmtDur, fmtTime, NOW, ON_SITE, RECENT_EVENTS, TODAY_VISITS, type FloorId } from '../mock/data';
import { Panel, Pill, StatusDot } from '../components/ui';

const STATE_STYLE: Record<string, { ring: string; bg: string; text: string; pill: 'ok' | 'warn' | 'bad' | 'dim' }> = {
  working: { ring: 'border-ok/40', bg: 'from-ok/[0.06]', text: 'text-ok-ink', pill: 'ok' },
  waiting: { ring: 'border-accent/50', bg: 'from-accent/[0.07]', text: 'text-accent-ink', pill: 'warn' },
  overtime: { ring: 'border-bad/50', bg: 'from-bad/[0.06]', text: 'text-bad', pill: 'bad' },
  idle: { ring: 'border-line', bg: 'from-idle/[0.04]', text: 'text-faint', pill: 'dim' },
};

function Gate({ type }: { type: 'entry' | 'exit' }) {
  const { t } = useLang();
  const isEntry = type === 'entry';
  const exited = TODAY_VISITS.filter((v) => v.exitAt).length;
  return (
    <div className="panel px-4 py-3 flex items-center gap-3 min-w-[300px]">
      <div className={`text-[22px] ${isEntry ? 'text-teal' : 'text-ok'}`}>{isEntry ? '⇥' : '⇤'}</div>
      <div>
        <div className="text-[12px] text-dim flex items-center gap-2">
          {isEntry ? t('floor.entry') : t('floor.exit')} · {isEntry ? 'CAM-01' : 'CAM-02'}
          <StatusDot tone="ok" pulse />
        </div>
        {isEntry ? (
          <div className="text-[13px] mt-0.5">
            <span className="num font-bold text-ink">YP8317C</span>
            <span className="text-dim"> → 14:28 {t('floor.enteredAt')}</span>
            <span className="text-accent-ink text-[11px] ml-2">{t('floor.confidence')} 81% ⚠</span>
          </div>
        ) : (
          <div className="text-[13px] mt-0.5 text-ink2">{t('floor.exitedToday')} <b className="num text-ok-ink">{exited}</b></div>
        )}
      </div>
    </div>
  );
}

function BayCard({ bay }: { bay: BayInfo }) {
  const { t } = useLang();
  const nav = useNavigate();
  const s = STATE_STYLE[bay.state];
  const v = bay.visit;
  return (
    <div
      onClick={() => v && nav(`/vehicle/${v.id}`)}
      className={`relative rounded-xl border ${s.ring} bg-gradient-to-b ${s.bg} to-transparent p-4 min-h-[200px] flex flex-col ${v ? 'cursor-pointer hover:shadow-md transition' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-ink">{t(`bay.${bay.id}` as any)}</div>
        <Pill tone={s.pill}>{t(`state.${bay.state}` as any)}</Pill>
      </div>
      {v ? (
        <>
          <div className="num text-[22px] font-black text-ink mt-3">{v.plate}</div>
          <div className="text-[12px] text-dim">{v.wo} · {t(`task.${v.taskType}` as any)}</div>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className={`num ${bay.state === 'overtime' ? 'text-bad font-bold' : 'text-ink2'}`}>
              ⏱ {t('floor.usedOf', { used: `${bay.usedH.toFixed(1)}h`, target: `${bay.targetH.toFixed(0)}h` })}
              {bay.state === 'overtime' && ' ⚠'}
            </span>
          </div>
          <div className="progress-track mt-1.5" style={{ height: 6 }}>
            <div
              className={`h-full rounded ${bay.state === 'overtime' ? 'bg-bad' : bay.state === 'waiting' ? 'bg-accent' : 'bg-ok'}`}
              style={{ width: `${Math.min(100, (bay.usedH / bay.targetH) * 100)}%` }}
            />
          </div>
          <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-faint">
            <span>👷 {v.techs.length > 0 ? `${v.techs.length} ${t('floor.techs')}` : `0 ${t('floor.techs')} ⚠`}</span>
            <span>{bay.patrolled ? `👁 ${t('floor.patrolled')}` : `👁 ${t('floor.notPatrolled')}`}</span>
            <span className={bay.camHealth === 'warn' ? 'text-accent-ink' : ''}>{bay.cam} {bay.camHealth === 'warn' ? `⚠${t('floor.camWarn')}` : '●'}</span>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-faint">
          <div className="text-[28px] opacity-40">⛽</div>
          <div className="text-[13px] mt-1">{t('floor.idleFor', { t: `${bay.idleH}h` })}</div>
        </div>
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
            <span className="num text-faint">{fmtTime(e.t)}</span>
            <span className={e.level === 'bad' ? 'text-bad' : e.level === 'warn' ? 'text-accent-ink' : 'text-ink2'}>{e.text}</span>
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
  const bays = useMemo(bayInfos, []);
  const floors: FloorId[] = ['2F', '3F'];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-bold text-ink">{t('floor.title')}</h1>
        <div className="flex items-center gap-4 text-[12px] text-dim">
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
            <div className="text-[13px] text-dim shrink-0">{t('floor.queue')} <b className="num text-accent-ink text-[18px]">({queue.length})</b></div>
            {queue.map((v) => {
              const waitMin = Math.round((NOW.getTime() - v.entryAt.getTime()) / 60000);
              const warn = waitMin > 30;
              return (
                <div key={v.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${warn ? 'border-accent/50 bg-accent/5' : 'border-line bg-soft'}`}>
                  <span className="num font-bold text-ink text-[14px]">{v.plate}</span>
                  <span className={`num text-[12px] ${warn ? 'text-accent-ink' : 'text-dim'}`}>{t('floor.waiting')} {fmtDur(waitMin)}{warn && ' ⚠'}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 text-[12px] text-teal bg-teal/5 border border-teal/20 rounded-lg px-3 py-2">
            💡 {t('floor.insight', { n: 3, h: '2.5h' })}
          </div>
        </Panel>
      </div>

      {/* 按楼层分区：对齐真实多层坡道车间 */}
      {floors.map((f) => (
        <div key={f} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-primary">
            <span className="w-1 h-3.5 rounded bg-primary inline-block" />
            {t(f === '2F' ? 'floor.f2' : 'floor.f3')}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bays.filter((b) => b.floor === f).map((b) => <BayCard key={b.id} bay={b} />)}
          </div>
        </div>
      ))}

      {/* 事件跑马灯 */}
      <Panel className="py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-faint shrink-0 flex items-center gap-1.5"><StatusDot tone="ok" pulse />{t('floor.ticker')}</span>
          <div className="flex-1"><Ticker /></div>
        </div>
      </Panel>
    </div>
  );
}
