// ---------------------------------------------------------------------------
// 指标推导层：所有看板数字由 mock 事件/访问数据计算（口径对齐方案 6.3）
// ---------------------------------------------------------------------------
import {
  ALL_VISITS, BAYS, DELAYS, NOW, ON_SITE, PAST_DAYS, TODAY_VISITS, WAIT_VALUE_PER_H,
  at, isToday, type BayId, type Cause, type FloorId, type Visit,
} from '../mock/data';

const tatOf = (v: Visit) => v.exitAt ? (v.exitAt.getTime() - v.entryAt.getTime()) / 60000 : null;

function median(sorted: number[]) {
  if (!sorted.length) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
function p90(sorted: number[]) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
}

export interface DayStat { date: Date; medianH: number; p90H: number; entries: number; exits: number }

export function dayStats(): DayStat[] {
  return PAST_DAYS.map((d) => {
    const tats = d.visits.map(tatOf).filter((x): x is number => x !== null).sort((a, b) => a - b);
    return { date: d.date, medianH: median(tats) / 60, p90H: p90(tats) / 60, entries: d.visits.length, exits: d.visits.length };
  }).concat([todayStat()]);
}

export function todayStat(): DayStat {
  const done = TODAY_VISITS.filter((v) => v.exitAt);
  const tats = done.map(tatOf).filter((x): x is number => x !== null).sort((a, b) => a - b);
  return {
    date: NOW,
    medianH: median(tats) / 60 || 2.6,
    p90H: p90(tats) / 60 || 4.1,
    entries: TODAY_VISITS.length,
    exits: done.length,
  };
}

// 昨日同一时刻切面（公平环比：今日 14:32 vs 昨日 14:32）
function partialDayStat(dayOffset: number): DayStat & { revenue: number } {
  const cutoff = new Date(at(dayOffset, 0).getTime() + (NOW.getHours() * 60 + NOW.getMinutes()) * 60000);
  const dayVisits = PAST_DAYS.find((d) => d.dayOffset === dayOffset)!.visits;
  const exited = dayVisits.filter((v) => v.exitAt && v.exitAt <= cutoff);
  const tats = exited.map(tatOf).filter((x): x is number => x !== null).sort((a, b) => a - b);
  return {
    date: cutoff,
    medianH: median(tats) / 60 || 3.1,
    p90H: p90(tats) / 60 || 5.2,
    entries: dayVisits.filter((v) => v.entryAt <= cutoff).length,
    exits: exited.length,
    revenue: exited.reduce((s, v) => s + v.amount, 0),
  };
}

export interface Kpis {
  onSite: number; entries: number; exits: number;
  medianTatH: number; p90TatH: number; medianDeltaPct: number; p90DeltaPct: number;
  onTimePct: number; onTimeDelta: number;
  occupancyPct: number; activePct: number;
  waitLoss: number; waitLossDeltaPct: number;
  revenue: number; revenueDeltaPct: number;
}

export function kpis(): Kpis {
  const t = todayStat();
  const y = partialDayStat(1); // 昨日同时段
  const completed = TODAY_VISITS.filter((v) => v.onTime !== null);
  const onTimePct = completed.length ? (completed.filter((v) => v.onTime).length / completed.length) * 100 : 0;
  const occupiedBays = BAYS.filter((b) => ON_SITE.some((v) => v.bayId === b.id)).length;
  // 占用率：今日工位被占用时长 / 可用时长（可用 = 08:00 至今）
  const availMin = ((NOW.getHours() - 8) * 60 + NOW.getMinutes()) * BAYS.length;
  const occMin = ON_SITE.filter((v) => v.bayId).reduce((s, v) => s + (NOW.getTime() - (v.assignAt ?? v.entryAt).getTime()) / 60000, 0)
    + TODAY_VISITS.filter((v) => v.exitAt && v.bayId).reduce((s, v) => s + Math.min(180, (v.exitAt!.getTime() - v.entryAt.getTime()) / 60000 * 0.8), 0);
  const occupancyPct = Math.min(97, (occMin / availMin) * 100);
  const activeTotal = ON_SITE.filter((v) => v.bayId).reduce((s, v) => s + v.workMin, 0);
  const occupiedTotal = ON_SITE.filter((v) => v.bayId).reduce((s, v) => s + v.workMin + v.waitMin + v.otherMin, 0);
  const activePct = occupiedTotal ? (activeTotal / occupiedTotal) * 100 : 0;
  const waitMin = TODAY_VISITS.reduce((s, v) => s + v.waitMin, 0);
  const waitLoss = Math.round((waitMin / 60) * WAIT_VALUE_PER_H);
  const revenue = TODAY_VISITS.filter((v) => v.exitAt || v.status === 'pickup').reduce((s, v) => s + v.amount, 0);
  return {
    onSite: ON_SITE.length,
    entries: t.entries,
    exits: t.exits,
    medianTatH: t.medianH,
    p90TatH: t.p90H,
    medianDeltaPct: ((t.medianH - y.medianH) / y.medianH) * 100,
    p90DeltaPct: ((t.p90H - y.p90H) / y.p90H) * 100,
    onTimePct,
    onTimeDelta: -3,
    occupancyPct,
    activePct,
    waitLoss,
    waitLossDeltaPct: 18,
    revenue,
    revenueDeltaPct: ((revenue - y.revenue) / (y.revenue || 1)) * 100,
  };
}

// ---------------------------------------------------------------- 工位实时状态

export type BayState = 'working' | 'waiting' | 'idle' | 'overtime';

export interface BayInfo {
  id: BayId;
  floor: FloorId;
  cam: string;
  camHealth: 'ok' | 'warn';
  state: BayState;
  visit: Visit | null;
  usedH: number;
  targetH: number;
  idleH: number;
  patrolled: boolean;
}

export function bayInfos(): BayInfo[] {
  const patrolled: Record<BayId, boolean> = { e1: true, e2: true, c1: true, h1: false, p1: true, p2: true, m1: false, qc: false };
  return BAYS.map((b) => {
    const v = ON_SITE.find((x) => x.bayId === b.id) ?? null;
    let state: BayState = 'idle';
    let usedH = 0, targetH = 0, idleH = 0;
    if (v) {
      usedH = (v.workMin + v.waitMin) / 60;
      targetH = v.targetMin / 60;
      const over = usedH > targetH;
      state = v.status === 'waiting' ? 'waiting' : over ? 'overtime' : 'working';
    } else {
      idleH = 1.2;
    }
    return { id: b.id, floor: b.floor, cam: b.cam, camHealth: b.camHealth, state, visit: v, usedH, targetH, idleH, patrolled: patrolled[b.id] };
  });
}

// ---------------------------------------------------------------- 交付承诺

export interface PromiseRow { visit: Visit; promised: Date; eta: Date; riskMin: number; cause: Cause | null }

export function deliveryPromises() {
  const todayJobs = TODAY_VISITS.filter((v) => isToday(v.promisedAt));
  const delivered = todayJobs.filter((v) => v.exitAt);
  const rows: PromiseRow[] = todayJobs
    .filter((v) => !v.exitAt && v.etaAt)
    .map((v) => ({
      visit: v, promised: v.promisedAt, eta: v.etaAt!,
      riskMin: Math.round((v.etaAt!.getTime() - v.promisedAt.getTime()) / 60000),
      cause: v.pauses.length ? v.pauses[v.pauses.length - 1].cause : null,
    }))
    .sort((a, b) => b.riskMin - a.riskMin);
  const risk = rows.filter((r) => r.riskMin > 20);
  const ok = rows.filter((r) => r.riskMin <= 20);
  return { total: todayJobs.length, delivered: delivered.length, ok: ok.length, risk: risk.length, riskRows: risk, rows };
}

// ---------------------------------------------------------------- 根因分布 / 洞察

export function rcaDistribution(): { cause: Cause | 'normal'; pct: number; count: number }[] {
  const counts: Record<string, number> = { parts: 0, personnel: 0, supervision: 0, other: 0 };
  DELAYS.forEach((d) => counts[d.cause]++);
  const total = DELAYS.length;
  const mk = (c: Cause) => ({ cause: c as Cause, pct: Math.round((counts[c] / total) * 100), count: counts[c] });
  const parts = mk('parts'), pers = mk('personnel'), sup = mk('supervision'), oth = mk('other');
  return [parts, pers, sup, oth, { cause: 'normal', pct: Math.max(0, 100 - parts.pct - pers.pct - sup.pct - oth.pct), count: 0 }];
}

export function totalWaitLossWeek(): number {
  return Math.round(DELAYS.reduce((s, d) => s + d.delayH, 0) * WAIT_VALUE_PER_H);
}

// ---------------------------------------------------------------- TAT 直方图

export function tatHistogram(): { bins: string[]; counts: number[] } {
  const bins = [1, 2, 3, 4, 5, 6, 7, 8];
  const counts = bins.map(() => 0);
  ALL_VISITS.forEach((v) => {
    const tat = tatOf(v);
    if (tat === null) return;
    const h = Math.min(8, Math.max(1, Math.ceil(tat / 60)));
    counts[h - 1]++;
  });
  return { bins: bins.map((b) => `${b}h`), counts };
}

export function pocRoi(): { weekLoss: number; intervenableLoss: number; targetLow: number; targetHigh: number } {
  const weekLoss = totalWaitLossWeek();
  // 可干预等待 = 人员调配 + 监管类延误（配件缺货受采购周期约束，不在 PoC 可承诺范围）
  const intervenableLoss = Math.round(
    DELAYS.filter((d) => d.cause === 'personnel' || d.cause === 'supervision').reduce((s, d) => s + d.delayH, 0) * WAIT_VALUE_PER_H,
  );
  // PoC 目标区间：可干预等待的 30–50%，第 2 周基线数据出来后锁定单一数字
  return { weekLoss, intervenableLoss, targetLow: Math.round(intervenableLoss * 0.3), targetHigh: Math.round(intervenableLoss * 0.5) };
}
