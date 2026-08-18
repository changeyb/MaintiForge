import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { fmtH, fmtTime, NOW, ON_SITE, type Visit } from '../mock/data';
import { Panel, Pill, ProgressBar, RiskIcon, Empty } from '../components/ui';

function riskOf(v: Visit): 'risk' | 'tight' | 'ok' | 'done' {
  if (v.status === 'pickup') return 'done';
  if (v.risk === 'risk') return 'risk';
  if (v.risk === 'tight') return 'tight';
  return 'ok';
}

function progressPct(v: Visit) {
  const elapsed = v.workMin + v.waitMin;
  return { pct: (elapsed / v.targetMin) * 100, elapsedH: elapsed / 60, targetH: v.targetMin / 60 };
}

function Row({ v, nav }: { v: Visit; nav: (id: string) => void }) {
  const { t } = useLang();
  const risk = riskOf(v);
  const { pct, elapsedH, targetH } = progressPct(v);
  const over = pct > 100;
  const eta = v.etaAt;
  const diffMin = eta ? Math.round((eta.getTime() - v.promisedAt.getTime()) / 60000) : 0;
  const tone = over || v.status === 'waiting' ? (over ? 'bad' : 'warn') : risk === 'tight' ? 'warn' : 'ok';

  return (
    <button
      onClick={() => nav(v.id)}
      className="w-full grid grid-cols-[44px_1.3fr_90px_2.2fr_1.4fr_1.1fr] items-center gap-3 px-4 py-3 border-b border-[#e2e8f0] hover:bg-black/[0.03] transition-colors text-left"
    >
      <RiskIcon risk={risk} />
      <div>
        <div className="num text-[15px] font-bold text-[#22354d]">{v.plate}</div>
        <div className="text-[11px] text-[#22354d]0">{v.wo} · {t(`task.${v.taskType}` as any)}</div>
      </div>
      <div className="text-[13px] text-[#3d5170]">{v.bayId ? t(`bay.${v.bayId}` as any) : t(`state.${v.status === 'queue' ? 'queue' : 'pickup'}` as any)}</div>
      <div>
        <div className="flex items-center gap-2">
          <ProgressBar pct={pct} tone={tone as any} height={9} />
          <span className={`num text-[12px] w-[86px] shrink-0 ${over ? 'text-[#dc2626] font-bold' : 'text-[#64748b]'}`}>
            {elapsedH.toFixed(1)}/{targetH.toFixed(1)}h
          </span>
        </div>
        {over && <div className="text-[10px] text-[#dc2626] mt-0.5">{t('vehicles.overTarget')} +{fmtH((elapsedH - targetH) * 60)}</div>}
        {v.status === 'waiting' && <div className="text-[10px] text-[#b47207] mt-0.5">⏸ {t('state.waiting')} {fmtH(v.waitMin)}</div>}
      </div>
      <div className="num text-[13px]">
        {eta ? (
          <>
            <span className="text-[#64748b]">{fmtTime(v.promisedAt)}</span>
            <span className="text-[#94a3b8]"> → </span>
            <span className={diffMin > 20 ? 'text-[#dc2626] font-bold' : diffMin > 0 ? 'text-[#b47207]' : 'text-[#15803d]'}>{fmtTime(eta)}</span>
            {diffMin > 20
              ? <span className="text-[#dc2626] text-[11px] ml-1.5">⚠ +{fmtH(diffMin)}</span>
              : diffMin > 0
                ? <span className="text-[#b47207] text-[11px] ml-1.5">+{fmtH(diffMin)}</span>
                : -diffMin <= 15
                  ? <span className="text-[#b47207] text-[11px] ml-1.5">{t('vehicles.margin')} {fmtH(-diffMin)}</span>
                  : null}
          </>
        ) : <span className="text-[#22354d]0">—</span>}
      </div>
      <div>
        {v.status === 'waiting' && <Pill tone="warn">⏸ {t('state.waiting')}</Pill>}
        {v.status === 'working' && <Pill tone={over ? 'bad' : 'ok'}>{t(over ? 'state.overtime' : 'state.working')} · 👷{v.techs.length}</Pill>}
        {v.status === 'queue' && <Pill tone="dim">{t('state.queue')}</Pill>}
        {v.status === 'pickup' && <Pill tone="accent">{t('state.pickup')}</Pill>}
      </div>
    </button>
  );
}

export default function Vehicles() {
  const { t } = useLang();
  const nav = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'risk' | 'eta'>('risk');

  const list = useMemo(() => {
    const riskRank = { risk: 0, tight: 1, ok: 2, done: 3 } as const;
    let vs = [...ON_SITE];
    if (q) vs = vs.filter((v) => v.plate.toLowerCase().includes(q.toLowerCase()) || v.wo.toLowerCase().includes(q.toLowerCase()));
    vs.sort(sort === 'risk'
      ? (a, b) => riskRank[riskOf(a)] - riskRank[riskOf(b)] || ((b.etaAt?.getTime() ?? 0) - (a.etaAt?.getTime() ?? 0))
      : (a, b) => (a.etaAt?.getTime() ?? 0) - (b.etaAt?.getTime() ?? 0));
    return vs;
  }, [q, sort]);

  const attention = list.filter((v) => ['risk', 'tight'].includes(riskOf(v)));
  const normal = list.filter((v) => !['risk', 'tight'].includes(riskOf(v)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[18px] font-bold">{t('vehicles.title')} <span className="num text-[#128984]">({ON_SITE.length})</span></h1>
        <div className="flex items-center gap-2.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`🔍 ${t('common.search')}`}
            className="bg-[#eef2f7] border border-[#dfe6ee] rounded-lg px-3 py-1.5 text-[13px] w-[220px] outline-none focus:border-[#128984]/50 placeholder:text-[#94a3b8]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-[#eef2f7] border border-[#dfe6ee] rounded-lg px-3 py-1.5 text-[13px] outline-none"
          >
            <option value="risk">{t('vehicles.sortRisk')}</option>
            <option value="eta">{t('vehicles.sortEta')}</option>
          </select>
        </div>
      </div>

      <Panel className="p-0 overflow-hidden">
        <div className="grid grid-cols-[44px_1.3fr_90px_2.2fr_1.4fr_1.1fr] gap-3 px-4 py-2.5 text-[11px] text-[#22354d]0 border-b border-[#dfe6ee] bg-[#eef2f7]">
          <span>{t('vehicles.col.risk')}</span>
          <span>{t('vehicles.col.vehicle')}</span>
          <span>{t('vehicles.col.bay')}</span>
          <span>{t('vehicles.col.progress')}</span>
          <span>{t('vehicles.col.eta')}</span>
          <span>{t('vehicles.col.status')}</span>
        </div>
        {attention.map((v) => <Row key={v.id} v={v} nav={(id) => nav(`/vehicle/${id}`)} />)}
        {normal.length > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full px-4 py-2.5 text-[12px] text-[#64748b] hover:bg-black/[0.03] flex items-center gap-2 border-b border-[#e2e8f0]"
          >
            <span className="text-[#15803d]">●</span> 🟢 {normal.length} {t('vehicles.normalFold')}
            <span className="text-[#128984] ml-1">{showAll ? `▲ ${t('vehicles.collapse')}` : `▼ ${t('vehicles.expand')}`}</span>
          </button>
        )}
        {showAll && normal.map((v) => <Row key={v.id} v={v} nav={(id) => nav(`/vehicle/${id}`)} />)}
        {list.length === 0 && <Empty>—</Empty>}
      </Panel>

      <div className="text-[11px] text-[#94a3b8]">ⓘ {t('vehicles.legend')} · {t('common.mockNotice')} · {NOW.getFullYear()}</div>
    </div>
  );
}
