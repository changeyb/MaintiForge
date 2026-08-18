// ---------------------------------------------------------------------------
// Mock 数据底座：对齐方案 6.1 核心数据对象（VehicleVisit / BaySession /
// WorkSegment / ResourceEvent / DelayCase / EvidenceRef）
// 所有指标均由本模块的结构化数据推导，不写死数字。
// ---------------------------------------------------------------------------

export type BayId = 'mech1' | 'mech2' | 'body' | 'paint' | 'qc';
export type TaskType = 'mech' | 'brake' | 'body' | 'paint' | 'inspect';
export type Cause = 'parts' | 'personnel' | 'supervision' | 'other';
export type VehicleStatus = 'working' | 'waiting' | 'queue' | 'pickup' | 'exited';
export type Risk = 'ok' | 'tight' | 'risk' | 'done';
export type ReviewStatus = 'pending' | 'confirmed' | 'manual';

export interface TimelineEvent {
  t: Date;
  type: 'entry' | 'assign' | 'bayIn' | 'workStart' | 'pause' | 'resume' | 'partsArrived' | 'overtime' | 'bayOut' | 'done' | 'exit';
  note?: string;
  severity?: 'info' | 'warn' | 'bad';
  evidence?: string[];
}

export interface Pause {
  cause: Cause;
  durMin: number;
  partNo?: string;
  note?: string;
}

export interface Visit {
  id: string;
  plate: string;
  model: string;
  wo: string;
  taskType: TaskType;
  bayId: BayId | null;
  targetMin: number;
  amount: number; // 工单金额 ¥（mock 扩展字段）
  entryAt: Date;
  exitAt: Date | null;
  promisedAt: Date;
  etaAt: Date | null;
  status: VehicleStatus;
  workMin: number;
  waitMin: number;
  otherMin: number;
  risk: Risk;
  techs: string[];
  shift: 'A' | 'B';
  onTime: boolean | null; // null = 未完成
  pauses: Pause[];
  events: TimelineEvent[];
  assignAt: Date | null;
  activityRate?: number; // 作业活跃度 %
  plateConfidence?: number;
}

export interface DelayCase {
  id: string;
  wo: string;
  plate: string;
  bayId: BayId;
  taskType: TaskType;
  delayH: number;
  cause: Cause;
  confidence: number;
  review: ReviewStatus;
  evidence: string[];
  when: Date;
  visitId: string;
}

// ---------------------------------------------------------------- 基础工具

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260818);
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const ri = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1));

export const NOW = (() => { const d = new Date(); d.setHours(14, 32, 0, 0); return d; })();

export function at(dayOffset: number, h: number, m = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}
export const fmtTime = (d: Date | null | undefined) =>
  d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '—';
export const fmtDur = (min: number) => {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
};
export const fmtH = (min: number) => (min / 60).toFixed(1) + 'h';
export const fmtMoney = (n: number) => '¥' + n.toLocaleString('en-US');
export const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export const isToday = (d: Date) => sameDay(d, NOW);

// ---------------------------------------------------------------- 主数据

export const BAYS: { id: BayId; cam: string; camHealth: 'ok' | 'warn' }[] = [
  { id: 'mech1', cam: 'CAM-03', camHealth: 'ok' },
  { id: 'mech2', cam: 'CAM-04', camHealth: 'ok' },
  { id: 'body', cam: 'CAM-05', camHealth: 'ok' },
  { id: 'paint', cam: 'CAM-06', camHealth: 'warn' },
  { id: 'qc', cam: 'CAM-07', camHealth: 'ok' },
];

export const TECHNICIANS = ['张伟', '李强', '王军', '陈杰', '刘洋', '赵磊', '黄明', '周勇', '吴斌', '徐飞', '刘涛', '何俊'];

const MODELS = ['丰田海拉克斯', '三菱Triton', '五十铃D-Max', '丰田卡罗拉', '本田CR-V', '日产Navara', '宝腾X70', '丰田Vios', 'Perodua Myvi', '福特Ranger'];

const TARGET_MIN: Record<TaskType, number> = { mech: 150, brake: 90, body: 180, paint: 240, inspect: 45 };
// 各任务类型的实际作业工时系数（刹车/喷漆偏慢 → 效率分化，便于分析页讲故事）
const WORK_FACTOR: Record<TaskType, [number, number]> = { mech: [0.85, 1.1], brake: [1.1, 1.6], body: [0.8, 1.0], paint: [1.05, 1.5], inspect: [0.85, 1.05] };
const AMOUNT: Record<TaskType, [number, number]> = { mech: [600, 1800], brake: [400, 900], body: [900, 2200], paint: [1800, 3500], inspect: [120, 300] };
const BAY_OF: Record<TaskType, BayId[]> = { mech: ['mech1', 'mech2'], brake: ['mech1', 'mech2'], body: ['body'], paint: ['paint'], inspect: ['qc'] };

const PLATES = ['闽D·7R663', '闽D·3M220', '闽D·9P451', '闽D·5T882', '闽D·2W901', '闽D·6H334', '闽D·8K317',
  '闽D·1F520', '闽D·4C889', '闽D·0Q116', '闽D·6T204', '闽D·9B775', '闽D·2K653', '闽D·7W308',
  '闽D·5H941', '闽D·3P027', '闽D·8M512', '闽D·4T786', '闽D·6R150', '闽D·1N394', '闽D·9G267',
  '闽D·7D835', '闽D·2F471', '闽D·5K906', '闽D·8B243', '闽D·3H698', '闽D·6P355', '闽D·0T182',
  '闽D·4W729', '闽D·7R018', '闽D·1M546', '闽D·9K803', '闽D·2H137', '闽D·5F664', '闽D·8C429'];

let plateIdx = 0;
const nextPlate = () => PLATES[plateIdx++ % PLATES.length];
let woSeq = 2040;
const nextWo = () => `WO-${woSeq++}`;
let visitSeq = 1;

// ---------------------------------------------------------------- 历史 6 天（完整进出场）

const TASK_WEIGHTS: TaskType[] = ['mech', 'mech', 'mech', 'brake', 'brake', 'body', 'body', 'paint', 'paint', 'inspect', 'inspect'];

function genPastVisit(dayOffset: number, heavyTail: boolean): Visit {
  const taskType = pick(TASK_WEIGHTS);
  const target = TARGET_MIN[taskType];
  const entryH = ri(8, 15), entryM = ri(0, 59);
  const entryAt = at(dayOffset, entryH, entryM);
  const shift: 'A' | 'B' = entryH < 14 ? 'A' : 'B';
  const shiftBias = shift === 'B' ? 1.22 : 1; // B 班周转系统性偏长
  // 周转：lognormal 倾向，heavyTail 天让尾巴更长
  const base = target * (1.0 + rnd() * 0.45);
  const tail = rnd() < (heavyTail ? 0.35 : 0.15) ? target * (0.5 + rnd() * 1.2) : 0;
  const tatMin = Math.round((base + tail + 30) * shiftBias);
  const exitAt = addMin(entryAt, tatMin);
  if (exitAt.getHours() >= 22) exitAt.setHours(21, ri(30, 59), 0, 0);
  const pauses: Pause[] = [];
  const r = rnd();
  if (r < 0.22) pauses.push({ cause: 'parts', durMin: ri(20, 120), partNo: pick(['BP-4521 刹车片', 'PT-1180 原子灰', 'FL-3342 滤芯', 'BP-4521 刹车片']) });
  else if (r < 0.34) pauses.push({ cause: 'personnel', durMin: ri(15, 60) });
  else if (r < 0.40) pauses.push({ cause: 'supervision', durMin: ri(10, 45) });
  else if (r < 0.44) pauses.push({ cause: 'other', durMin: ri(10, 40) });
  const waitMin = pauses.reduce((s, p) => s + p.durMin, 0);
  const [flo, fhi] = WORK_FACTOR[taskType];
  const workMin = Math.max(20, Math.round(target * (flo + rnd() * (fhi - flo)) * (shift === 'B' ? 1.08 : 1)));
  const promisedAt = addMin(entryAt, Math.round(target * 1.5) + 45);
  const onTime = exitAt <= promisedAt; // 口径：按承诺交车时间
  const events: TimelineEvent[] = [
    { t: entryAt, type: 'entry', evidence: ['CAM-01 截图', `置信度 ${ri(93, 99)}%`] },
    { t: addMin(entryAt, ri(5, 20)), type: 'assign' },
    { t: addMin(entryAt, ri(20, 35)), type: 'workStart' },
    { t: addMin(exitAt, -25), type: 'done' },
    { t: exitAt, type: 'exit', evidence: ['CAM-02 截图'] },
  ];
  return {
    id: `V-${visitSeq++}`, plate: nextPlate(), model: pick(MODELS), wo: nextWo(),
    taskType, bayId: pick(BAY_OF[taskType]), targetMin: target,
    amount: ri(AMOUNT[taskType][0], AMOUNT[taskType][1]),
    entryAt, exitAt, promisedAt, etaAt: exitAt,
    status: 'exited', workMin, waitMin, otherMin: Math.max(0, tatMin - workMin - waitMin),
    risk: 'done', techs: [pick(TECHNICIANS), pick(TECHNICIANS)].filter((v, i, a) => a.indexOf(v) === i),
    shift, onTime, pauses, events, assignAt: addMin(entryAt, 12),
  };
}

// ---------------------------------------------------------------- 今日剧本（Story vehicles）

function storyVisit(p: Partial<Visit> & { plate: string; model: string; wo: string; taskType: TaskType; bayId: BayId | null; entryH: number; entryM: number }): Visit {
  const entryAt = at(0, p.entryH, p.entryM);
  const base: Visit = {
    id: `V-${visitSeq++}`, plate: p.plate, model: p.model, wo: p.wo,
    taskType: p.taskType, bayId: p.bayId, targetMin: TARGET_MIN[p.taskType],
    amount: ri(AMOUNT[p.taskType][0], AMOUNT[p.taskType][1]),
    entryAt, exitAt: null, promisedAt: at(0, 17, 0), etaAt: null,
    status: 'working', workMin: 0, waitMin: 0, otherMin: 0, risk: 'ok',
    techs: [], shift: p.entryH < 14 ? 'A' : 'B', onTime: null, pauses: [], events: [],
    assignAt: null,
  };
  return { ...base, ...p, entryAt };
}

const today = (h: number, m: number) => at(0, h, m);

// 1) 喷漆超时 + 上午等配件（已复核）
const vPaint = storyVisit({
  plate: '闽D·7R663', model: '丰田海拉克斯', wo: 'WO-2069', taskType: 'paint', bayId: 'paint', entryH: 8, entryM: 12,
  promisedAt: today(17, 0), etaAt: today(18, 30), status: 'working', risk: 'risk',
  workMin: 234, waitMin: 47, otherMin: 36, techs: ['张伟', '李强'], activityRate: 72,
  pauses: [{ cause: 'parts', durMin: 47, partNo: 'PT-1180 原子灰', note: 'WMS 领料单 #4521' }],
  events: [
    { t: today(8, 12), type: 'entry', evidence: ['CAM-01 截图', '置信度 98%'] },
    { t: today(8, 25), type: 'assign', note: '喷漆房' },
    { t: today(8, 40), type: 'workStart', note: '张伟 / 李强' },
    { t: today(10, 15), type: 'pause', severity: 'warn', note: '原子灰缺货', evidence: ['WMS 领料单 #4521', 'CAM-06 截图'] },
    { t: today(11, 2), type: 'resume', note: '配件到货' },
    { t: today(13, 40), type: 'overtime', severity: 'bad', note: '目标 4h，预计完成 15:30' },
  ],
  plateConfidence: 98, assignAt: today(8, 25),
});

// 2) 机电-2 等刹车片（待复核）
const vBrake = storyVisit({
  plate: '闽D·3M220', model: '三菱Triton', wo: 'WO-2077', taskType: 'brake', bayId: 'mech2', entryH: 9, entryM: 5,
  promisedAt: today(16, 30), etaAt: today(17, 15), status: 'waiting', risk: 'risk',
  workMin: 45, waitMin: 150, otherMin: 15, techs: [], activityRate: 0,
  pauses: [{ cause: 'parts', durMin: 150, partNo: 'BP-4521 刹车片', note: '库存 0 · 明天到货' }],
  events: [
    { t: today(9, 5), type: 'entry', evidence: ['CAM-01 截图', '置信度 96%'] },
    { t: today(9, 20), type: 'assign', note: '机电-2' },
    { t: today(9, 35), type: 'workStart', note: '王军' },
    { t: today(10, 20), type: 'pause', severity: 'warn', note: '刹车片 BP-4521 缺货', evidence: ['WMS 库存快照', 'CAM-04 截图'] },
  ],
  plateConfidence: 96, assignAt: today(9, 20),
});

// 3) 钣金 紧张但正常
const vBody = storyVisit({
  plate: '闽D·9P451', model: '五十铃D-Max', wo: 'WO-2085', taskType: 'body', bayId: 'body', entryH: 13, entryM: 5,
  promisedAt: today(17, 0), etaAt: today(16, 50), status: 'working', risk: 'tight',
  workMin: 80, waitMin: 0, otherMin: 7, techs: ['陈杰'], activityRate: 88,
  events: [
    { t: today(13, 5), type: 'entry', evidence: ['CAM-01 截图', '置信度 99%'] },
    { t: today(13, 15), type: 'assign', note: '钣金' },
    { t: today(13, 30), type: 'workStart', note: '陈杰' },
  ],
  plateConfidence: 99, assignAt: today(13, 15),
});

// 4) 机电-1 正常
const vMech = storyVisit({
  plate: '闽D·5T882', model: '日产Navara', wo: 'WO-2081', taskType: 'mech', bayId: 'mech1', entryH: 11, entryM: 20,
  promisedAt: today(16, 30), etaAt: today(16, 10), status: 'working', risk: 'ok',
  workMin: 126, waitMin: 10, otherMin: 12, techs: ['刘洋', '赵磊'], activityRate: 84,
  pauses: [{ cause: 'personnel', durMin: 10 }],
  events: [
    { t: today(11, 20), type: 'entry', evidence: ['CAM-01 截图', '置信度 97%'] },
    { t: today(11, 35), type: 'assign', note: '机电-1' },
    { t: today(11, 50), type: 'workStart', note: '刘洋 / 赵磊' },
  ],
  plateConfidence: 97, assignAt: today(11, 35),
});

// 5) 待分配队列
const vQueue1 = storyVisit({ plate: '闽D·2W901', model: '本田CR-V', wo: 'WO-2088', taskType: 'mech', bayId: null, entryH: 14, entryM: 20, status: 'queue', risk: 'ok', promisedAt: today(18, 30) });
const vQueue2 = storyVisit({ plate: '闽D·6H334', model: '宝腾X70', wo: 'WO-2086', taskType: 'mech', bayId: null, entryH: 13, entryM: 47, status: 'queue', risk: 'tight', promisedAt: today(18, 0), otherMin: 45 });
const vQueue3 = storyVisit({ plate: '闽D·8K317', model: '丰田Vios', wo: 'WO-2090', taskType: 'inspect', bayId: null, entryH: 14, entryM: 28, status: 'queue', risk: 'ok', promisedAt: today(17, 30), plateConfidence: 81 });

// 6) 完工待取车 ×4
const vPickup = [
  storyVisit({ plate: '闽D·1F520', model: 'Perodua Myvi', wo: 'WO-2078', taskType: 'inspect', bayId: null, entryH: 9, entryM: 40, status: 'pickup', risk: 'done', workMin: 40, otherMin: 200, promisedAt: today(12, 30), etaAt: today(12, 10) }),
  storyVisit({ plate: '闽D·4C889', model: '福特Ranger', wo: 'WO-2075', taskType: 'mech', bayId: null, entryH: 8, entryM: 50, status: 'pickup', risk: 'done', workMin: 140, waitMin: 25, otherMin: 150, promisedAt: today(13, 0), etaAt: today(12, 45), pauses: [{ cause: 'personnel', durMin: 25 }] }),
  storyVisit({ plate: '闽D·0Q116', model: '丰田卡罗拉', wo: 'WO-2073', taskType: 'brake', bayId: null, entryH: 10, entryM: 15, status: 'pickup', risk: 'done', workMin: 85, otherMin: 160, promisedAt: today(14, 0), etaAt: today(13, 50) }),
  storyVisit({ plate: '闽D·6T204', model: '本田CR-V', wo: 'WO-2079', taskType: 'mech', bayId: null, entryH: 8, entryM: 30, status: 'pickup', risk: 'done', workMin: 130, waitMin: 42, otherMin: 200, promisedAt: today(12, 0), etaAt: today(11, 40), pauses: [{ cause: 'parts', durMin: 42, partNo: 'FL-3342 滤芯' }] }),
];

// 7) 今日已出场（上午完成的 5 台）
const exitedToday: Visit[] = Array.from({ length: 5 }, (_, i) => {
  const v = genPastVisit(0, false);
  v.entryAt = today(8 + Math.floor(i / 2), ri(0, 50));
  const tat = ri(120, 240);
  v.exitAt = addMin(v.entryAt, tat);
  if (v.exitAt > NOW) v.exitAt = today(13, ri(0, 55));
  v.promisedAt = addMin(v.entryAt, Math.round(v.targetMin * 1.6) + 60);
  v.etaAt = v.exitAt;
  v.status = 'exited';
  v.risk = 'done';
  return v;
});

// ---------------------------------------------------------------- 汇总数据集

export const PAST_DAYS = [6, 5, 4, 3, 2, 1].map((off) => ({
  dayOffset: off,
  date: at(off, 0),
  heavyTail: off === 2 || off === 5, // 两天尾巴长，让 P90 有故事
  visits: [] as Visit[],
}));
PAST_DAYS.forEach((d) => {
  const n = ri(14, 18);
  for (let i = 0; i < n; i++) d.visits.push(genPastVisit(d.dayOffset, d.heavyTail));
});

export const TODAY_VISITS: Visit[] = [vPaint, vBrake, vBody, vMech, vQueue1, vQueue2, vQueue3, ...vPickup, ...exitedToday];
export const ALL_VISITS: Visit[] = [...TODAY_VISITS, ...PAST_DAYS.flatMap((d) => d.visits)];
export const ON_SITE: Visit[] = TODAY_VISITS.filter((v) => !v.exitAt);

// ---------------------------------------------------------------- 延误案件（本周）

const delaySeed: Array<[string, string, BayId, TaskType, number, Cause, number, ReviewStatus, number]> = [
  // woSuffix, plate, bay, task, delayH, cause, conf, review, daysAgo
  ['WO-2069', '闽D·7R663', 'paint', 'paint', 1.3, 'parts', 92, 'confirmed', 0],
  ['WO-2077', '闽D·3M220', 'mech2', 'brake', 2.6, 'parts', 88, 'pending', 0],
  ['WO-2073', '闽D·0Q116', 'mech1', 'brake', 0.9, 'personnel', 85, 'confirmed', 0],
  ['WO-2078', '闽D·1F520', 'qc', 'inspect', 0.7, 'supervision', 71, 'pending', 0],
  ['WO-2075', '闽D·4C889', 'mech1', 'mech', 0.5, 'other', 45, 'manual', 0],
  ['WO-2061', '闽D·9B775', 'mech2', 'mech', 1.8, 'parts', 94, 'confirmed', 1],
  ['WO-2064', '闽D·2K653', 'paint', 'paint', 1.1, 'personnel', 82, 'confirmed', 1],
  ['WO-2052', '闽D·7W308', 'body', 'body', 0.8, 'parts', 90, 'confirmed', 2],
  ['WO-2055', '闽D·5H941', 'mech1', 'brake', 1.5, 'parts', 91, 'confirmed', 2],
  ['WO-2046', '闽D·3P027', 'paint', 'paint', 2.1, 'parts', 89, 'confirmed', 3],
  ['WO-2048', '闽D·8M512', 'mech2', 'mech', 0.6, 'supervision', 68, 'pending', 3],
  ['WO-2042', '闽D·4T786', 'body', 'body', 0.9, 'personnel', 86, 'confirmed', 4],
  ['WO-2044', '闽D·6R150', 'qc', 'inspect', 0.4, 'other', 40, 'manual', 5],
  ['WO-2040', '闽D·1N394', 'mech1', 'mech', 1.2, 'parts', 93, 'confirmed', 6],
];

export const DELAYS: DelayCase[] = delaySeed.map(([wo, plate, bayId, taskType, delayH, cause, confidence, review, ago], i) => ({
  id: `D-${100 + i}`, wo, plate, bayId: bayId as BayId, taskType: taskType as TaskType,
  delayH, cause: cause as Cause, confidence, review: review as ReviewStatus,
  evidence: cause === 'parts'
    ? ['暂停事件', 'WMS 缺货记录', `${BAYS.find(b => b.id === bayId)?.cam} 截图`]
    : cause === 'personnel'
      ? ['分配记录', '人员在场事件', '阈值规则 v1.3']
      : cause === 'supervision'
        ? ['巡检计划', '区域到访事件', '异常事件链']
        : ['完整事件链', '异常质量标记'],
  when: at(ago, ri(9, 17), ri(0, 59)),
  visitId: '',
}));

export const TOP_PARTS = [
  { name: 'BP-4521 刹车片', count: 4, lossH: 6.8 },
  { name: 'PT-1180 原子灰', count: 2, lossH: 2.1 },
  { name: 'FL-3342 滤芯', count: 1, lossH: 0.7 },
];

export const LOW_CONF_PLATES = [
  { plate: '闽D·8K31?', confidence: 81, when: today(14, 28) },
  { plate: '闽D·?H334', confidence: 76, when: today(13, 47) },
  { plate: '闽D·5T?82', confidence: 84, when: today(11, 20) },
];

// ---------------------------------------------------------------- 分析页数据

export const HEATMAP: number[][] = (() => {
  // [bay][hour 8..19] 0..1
  const hours = 12;
  const mk = (prof: (h: number) => number) => Array.from({ length: hours }, (_, i) => Math.min(1, Math.max(0, prof(i) + (rnd() - 0.5) * 0.15)));
  return [
    mk((h) => (h < 1 ? 0.3 : h < 8 ? 0.85 : h < 10 ? 0.5 : 0.2)),      // mech1
    mk((h) => (h < 1 ? 0.4 : h < 9 ? 0.9 : 0.3)),                       // mech2
    mk((h) => (h < 2 ? 0.2 : h < 6 ? 0.8 : h < 8 ? 0.6 : 0.15)),        // body
    mk(() => 0.92),                                                     // paint 全天满载
    mk((h) => (h === 4 || h === 5 ? 0.5 : 0.12)),                       // qc 大量闲置
  ];
})();

export const TASK_EFF = (Object.keys(TARGET_MIN) as TaskType[]).map((t) => {
  const vs = ALL_VISITS.filter((v) => v.taskType === t && v.exitAt);
  const avgActual = vs.length ? vs.reduce((s, v) => s + v.workMin, 0) / vs.length : TARGET_MIN[t];
  return { task: t, target: TARGET_MIN[t], actual: Math.round(avgActual), rate: Math.round((TARGET_MIN[t] / avgActual) * 100) };
});

export const SHIFT_STATS = (() => {
  const calc = (shift: 'A' | 'B') => {
    const vs = ALL_VISITS.filter((v) => v.shift === shift && v.exitAt);
    const tats = vs.map((v) => (v.exitAt!.getTime() - v.entryAt.getTime()) / 60000).sort((a, b) => a - b);
    const med = tats.length ? tats[Math.floor(tats.length / 2)] : 0;
    const onTime = vs.length ? (vs.filter((v) => v.onTime).length / vs.length) * 100 : 0;
    return { medianH: med / 60, onTime };
  };
  const a = calc('A'), b = calc('B');
  return {
    A: { medianH: a.medianH, onTime: a.onTime, occupancy: 85, patrol: 92, missedPatrol: 1 },
    B: { medianH: b.medianH, onTime: b.onTime, occupancy: 80, patrol: 67, missedPatrol: 4 },
  };
})();

// 等待损失价值系数（财务/运营定义，mock）
export const WAIT_VALUE_PER_H = 600;

export const RECENT_EVENTS: { t: Date; text: string; level: 'info' | 'warn' | 'bad' }[] = [
  { t: today(14, 31), text: 'WO-2077 配件到货确认 · 刹车片 BP-4521（明天入库）', level: 'warn' },
  { t: today(14, 28), text: '闽D·8K317 进场 · 置信度 81% → 复核队列', level: 'warn' },
  { t: today(14, 20), text: '闽D·2W901 进场 · 置信度 99%', level: 'info' },
  { t: today(13, 40), text: 'WO-2069 超目标工时（4h）· 喷漆', level: 'bad' },
  { t: today(13, 30), text: 'WO-2085 钣金任务开始 · 陈杰', level: 'info' },
  { t: today(13, 15), text: '主管巡检：机电区覆盖 ✓ · 喷漆区未到访', level: 'warn' },
  { t: today(12, 45), text: 'WO-2075 完工 · 闽D·4C889 待取车', level: 'info' },
  { t: today(11, 2), text: 'WO-2069 恢复作业 · 原子灰到货', level: 'info' },
];
