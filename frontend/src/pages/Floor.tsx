import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleDashed, Eye, EyeOff, HardHat, Lightbulb, LogIn, LogOut, Timer, TriangleAlert, Video } from 'lucide-react';
import { useLang } from '../i18n';
import { bayInfos, type BayInfo, type BayState } from '../derive/metrics';
import { fmtDur, fmtTime, NOW, ON_SITE, RECENT_EVENTS, TODAY_VISITS, type FloorId } from '../mock/data';
import { Panel, Pill, SectionTitle, StatusDot } from '../components/ui';

// 状态编码收敛为：左色条 + 状态胶囊（双重编码）；仅"超时"保留整卡浅红浸染作为最高警戒
const RAIL: Record<BayState, string> = { working: 'bg-ok', waiting: 'bg-accent', overtime: 'bg-bad', idle: 'bg-idle/50' };
const CARD: Record<BayState, string> = {
  working: 'border-line bg-white',
  waiting: 'border-accent/40 bg-white',
  overtime: 'border-bad/50 bg-bad/[0.05]',
  idle: 'border-line bg-white',
};
const PILL: Record<BayState, 'ok' | 'warn' | 'bad' | 'dim'> = { working: 'ok', waiting: 'warn', overtime: 'bad', idle: 'dim' };

function Gate({ type }: { type: 'entry' | 'exit' }) {
  const { t } = useLang();
  const isEntry = type === 'entry';
  const exited = TODAY_VISITS.filter((v) => v.exitAt).length;
  return (
    <div className="panel px-4 py-3 flex items-center gap-3 min-w-[300px]">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${isEntry ? 'bg-teal/10 text-teal' : 'bg-ok/10 text-ok-ink'}`}>
        {isEntry ? <LogIn size={18} /> : <LogOut size={18} />}
      </span>
      <div>
        <div className="text-[12px] text-dim flex items-center gap-2">
          {isEntry ? t('floor.entry') : t('floor.exit')} · {isEntry ? 'CAM-01' : 'CAM-02'}
          <StatusDot tone="ok" pulse />
        </div>
        {isEntry ? (
          <div className="text-[13px] mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="num font-bold text-ink">YP8317C</span>
            <span className="text-dim">→ 14:28 {t('floor.enteredAt')}</span>
            <span className="text-accent-ink text-[11px] inline-flex items-center gap-1">
              {t('floor.confidence')} 81% <TriangleAlert size={11} />
            </span>
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
  const v = bay.visit;
  return (
    <div
      onClick={() => v && nav(`/vehicle/${v.id}`)}
      className={`relative rounded-xl border ${CARD[bay.state]} p-4 pl-[19px] min-h-[190px] flex flex-col ${v ? 'cursor-pointer hover:shadow-md transition' : ''}`}
    >
      <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r ${RAIL[bay.state]}`} />
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-ink">{t(`bay.${bay.id}` as any)}</div>
        <Pill tone={PILL[bay.state]}>{t(`state.${bay.state}` as any)}</Pill>
      </div>
      {v ? (
        <>
          <div className="num text-[22px] font-black text-ink mt-3 tracking-tight">{v.plate}</div>
          <div className="text-[12px] text-dim">{v.wo} · {t(`task.${v.taskType}` as any)}</div>
          <div className="mt-3 flex items-center gap-1.5 text-[12px]">
            <Timer size={13} className={bay.state === 'overtime' ? 'text-bad' : 'text-dim'} />
            <span className={`num ${bay.state === 'overtime' ? 'text-bad font-bold' : 'text-ink2'}`}>
              {t('floor.usedOf', { used: `${bay.usedH.toFixed(1)}h`, target: `${bay.targetH.toFixed(0)}h` })}
            </span>
            {bay.state === 'overtime' && <TriangleAlert size={13} className="text-bad" />}
          </div>
          <div className="progress-track mt-1.5" style={{ height: 6 }}>
            <div
              className={`h-full rounded ${bay.state === 'overtime' ? 'bg-bad' : bay.state === 'waiting' ? 'bg-accent' : 'bg-ok'}`}
              style={{ width: `${Math.min(100, (bay.usedH / bay.targetH) * 100)}%` }}
            />
          </div>
          <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-dim">
            <span className="inline-flex items-center gap-1">
              <HardHat size={12} />
              {v.techs.length > 0 ? `${v.techs.length} ${t('floor.techs')}` : `0 ${t('floor.techs')}`}
              {v.techs.length === 0 && <TriangleAlert size={11} className="text-accent-ink" />}
            </span>
            <span className="inline-flex items-center gap-1">
              {bay.patrolled ? <Eye size={12} /> : <EyeOff size={12} className="text-accent-ink" />}
              {bay.patrolled ? t('floor.patrolled') : t('floor.notPatrolled')}
            </span>
            <span className={`inline-flex items-center gap-1 ${bay.camHealth === 'warn' ? 'text-accent-ink' : ''}`}>
              <Video size={12} />
              {bay.cam}{bay.camHealth === 'warn' && ` ${t('floor.camWarn')}`}
            </span>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-faint">
          <CircleDashed size={26} strokeWidth={1.5} className="opacity-50" />
          <div className="text-[13px] mt-1.5">{t('floor.idleFor', { t: `${bay.idleH}h` })}</div>
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

// 楼层负荷速览：状态分布堆叠条 + 占用数（数据来自 bayInfos 推导）
function FloorLoad({ bays }: { bays: BayInfo[] }) {
  const { t } = useLang();
  const floors: FloorId[] = ['2F', '3F'];
  const segCls: Record<BayState, string> = { working: 'bg-ok', waiting: 'bg-accent', overtime: 'bg-bad', idle: 'bg-line' };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {floors.map((f) => {
        const list = bays.filter((b) => b.floor === f);
        const order: BayState[] = ['working', 'waiting', 'overtime', 'idle'];
        const cnt = Object.fromEntries(order.map((s) => [s, list.filter((b) => b.state === s).length])) as Record<BayState, number>;
        const occupied = list.length - cnt.idle;
        return (
          <div key={f} className="flex items-center gap-4">
            <div className="w-[210px] shrink-0">
              <div className="text-[12px] font-semibold text-primary">{t(f === '2F' ? 'floor.f2' : 'floor.f3')}</div>
              <div className="text-[11px] text-dim mt-0.5">{t('floor.occupiedBays', { a: occupied, b: list.length })}</div>
            </div>
            <div className="flex-1">
              <div className="flex h-[10px] rounded-full overflow-hidden bg-soft">
                {order.map((s) => cnt[s] > 0 && (
                  <div key={s} className={segCls[s]} style={{ width: `${(cnt[s] / list.length) * 100}%` }} />
                ))}
              </div>
              <div className="flex gap-3 mt-1.5 text-[11px] text-dim">
                {order.map((s) => cnt[s] > 0 && (
                  <span key={s} className="inline-flex items-center gap-1">
                    <StatusDot tone={s === 'working' ? 'ok' : s === 'waiting' ? 'warn' : s === 'overtime' ? 'bad' : 'idle'} />
                    {t(`state.${s}` as any)} {cnt[s]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
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
                  <span className={`num inline-flex items-center gap-1 text-[12px] ${warn ? 'text-accent-ink' : 'text-dim'}`}>
                    {t('floor.waiting')} {fmtDur(waitMin)}{warn && <TriangleAlert size={11} />}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-start gap-2 text-[12px] text-teal bg-teal/5 border border-teal/20 rounded-lg px-3 py-2">
            <Lightbulb size={14} className="shrink-0 mt-px" />
            <span>{t('floor.insight', { n: 3, h: '2.5h' })}</span>
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

      {/* 楼层负荷 + 事件跑马灯 */}
      <Panel>
        <SectionTitle>{t('floor.loadSummary')}</SectionTitle>
        <FloorLoad bays={bays} />
      </Panel>
      <Panel className="py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-dim shrink-0 flex items-center gap-1.5"><StatusDot tone="ok" pulse />{t('floor.ticker')}</span>
          <div className="flex-1"><Ticker /></div>
        </div>
      </Panel>
    </div>
  );
}
