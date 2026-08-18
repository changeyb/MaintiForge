// ---------------------------------------------------------------------------
// Mock 数据底座：对齐方案 6.1 核心数据对象（VehicleVisit / BaySession /
// WorkSegment / ResourceEvent / DelayCase / EvidenceRef）
// 所有指标均由本模块的结构化数据推导，不写死数字。
//
// 车间结构对齐客户真实环境（KTT Terusan / Jalan Papan 多层坡道式重卡车间）：
//   2F 罗厘维修：发动机 ×2、底盘悬挂、液压系统
//   3F：车与皮卡维修 ×2、工程机械、竣工总检
// ---------------------------------------------------------------------------

export type BayId = 'e1' | 'e2' | 'c1' | 'h1' | 'p1' | 'p2' | 'm1' | 'qc';
export type FloorId = '2F' | '3F';
export type TaskType = 'engine' | 'chassis' | 'hydraulic' | 'general' | 'machinery' | 'inspect';
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
  amount: number; // 工单金额 S$（mock 扩展字段）
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
export const fmtMoney = (n: number) => 'S$' + n.toLocaleString('en-US');
export const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export const isToday = (d: Date) => sameDay(d, NOW);

// ---------------------------------------------------------------- 主数据

// 摄像头点位：大门 CAM-01/02；2F CAM-21~24；3F CAM-31~34（坡道入口另有联动枪机）
export const BAYS: { id: BayId; floor: FloorId; cam: string; camHealth: 'ok' | 'warn' }[] = [
  { id: 'e1', floor: '2F', cam: 'CAM-21', camHealth: 'ok' },
  { id: 'e2', floor: '2F', cam: 'CAM-22', camHealth: 'ok' },
  { id: 'c1', floor: '2F', cam: 'CAM-23', camHealth: 'ok' },
  { id: 'h1', floor: '2F', cam: 'CAM-24', camHealth: 'warn' },
  { id: 'p1', floor: '3F', cam: 'CAM-31', camHealth: 'ok' },
  { id: 'p2', floor: '3F', cam: 'CAM-32', camHealth: 'ok' },
  { id: 'm1', floor: '3F', cam: 'CAM-33', camHealth: 'ok' },
  { id: 'qc', floor: '3F', cam: 'CAM-34', camHealth: 'ok' },
];

export const TECHNICIANS = ['张伟', '李强', '王军', '陈杰', '刘洋', '赵磊', '黄明', '周勇', '吴斌', '徐飞', '刘涛', '何俊'];

const MODELS = ['三菱Fuso Fighter', '五十铃 NPR', '日野 300', '日野 500', '沃尔沃 FH', '斯堪尼亚 P280',
  'UD Quester', '丰田 Hilux', '三菱 Triton', '五十铃 D-Max', '福特 Ranger', '日产 Navara'];

const TARGET_MIN: Record<TaskType, number> = { engine: 240, chassis: 120, hydraulic: 240, general: 150, machinery: 360, inspect: 45 };
// 各任务类型的实际作业工时系数（底盘/液压偏慢 → 效率分化，便于分析页讲故事）
const WORK_FACTOR: Record<TaskType, [number, number]> = { engine: [0.85, 1.1], chassis: [1.1, 1.6], hydraulic: [1.05, 1.5], general: [0.85, 1.1], machinery: [0.9, 1.3], inspect: [0.85, 1.05] };
const AMOUNT: Record<TaskType, [number, number]> = { engine: [800, 2400], chassis: [400, 1100], hydraulic: [900, 2600], general: [300, 900], machinery: [1500, 4200], inspect: [80, 200] };
const BAY_OF: Record<TaskType, BayId[]> = { engine: ['e1', 'e2'], chassis: ['c1'], hydraulic: ['h1'], general: ['p1', 'p2'], machinery: ['m1'], inspect: ['qc'] };

// 新加坡车牌格式（重卡 Y 系列 + 普通 S 系列，演示用虚构号码）
const PLATES = ['YN7663X', 'YQ3220A', 'YP9451T', 'YR5882J', 'YT2901K', 'YX6334B', 'YP8317C',
  'YK1520D', 'YL4889E', 'YM0116F', 'YN7204G', 'YP9775H', 'YQ2653J', 'YR7308K',
  'YT5941L', 'YU3027M', 'YV8512N', 'YX4786P', 'YY6150Q', 'YZ1394R', 'YT9267S',
  'YU7835T', 'YV2471U', 'YW4906V', 'YX8906W', 'YY8243X', 'YZ3698Y', 'YA6355Z',
  'YB0182A', 'YC4729B', 'YD7018C', 'YE1546D', 'YF9803E', 'YG2137F'];

let plateIdx = 0;
const nextPlate = () => PLATES[plateIdx++ % PLATES.length];
let woSeq = 2040;
const nextWo = () => `WO-${woSeq++}`;
let visitSeq = 1;

// ---------------------------------------------------------------- 历史 6 天（完整进出场）

const TASK_WEIGHTS: TaskType[] = ['engine', 'engine', 'engine', 'chassis', 'chassis', 'general', 'general', 'hydraulic', 'hydraulic', 'machinery', 'inspect'];

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
  if (r < 0.22) pauses.push({ cause: 'parts', durMin: ri(20, 120), partNo: pick(['BP-4521 重卡刹车片', 'HYD-1180 液压密封套件', 'FL-3342 液压滤芯', 'BP-4521 重卡刹车片']) });
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

// 1) 液压系统超时 + 上午等配件（已复核）
const vHyd = storyVisit({
  plate: 'YN7663X', model: '三菱Fuso Fighter', wo: 'WO-2069', taskType: 'hydraulic', bayId: 'h1', entryH: 8, entryM: 12,
  promisedAt: today(17, 0), etaAt: today(18, 30), status: 'working', risk: 'risk',
  workMin: 234, waitMin: 47, otherMin: 36, techs: ['张伟', '李强'], activityRate: 72,
  pauses: [{ cause: 'parts', durMin: 47, partNo: 'HYD-1180 液压密封套件', note: 'WMS 领料单 #4521' }],
  events: [
    { t: today(8, 12), type: 'entry', evidence: ['CAM-01 截图', '置信度 98%'] },
    { t: today(8, 25), type: 'assign', note: '2F 液压工位' },
    { t: today(8, 40), type: 'workStart', note: '张伟 / 李强' },
    { t: today(10, 15), type: 'pause', severity: 'warn', note: '密封套件缺货', evidence: ['WMS 领料单 #4521', 'CAM-24 截图'] },
    { t: today(11, 2), type: 'resume', note: '配件到货' },
    { t: today(13, 40), type: 'overtime', severity: 'bad', note: '目标 4h，预计完成 15:30' },
  ],
  plateConfidence: 98, assignAt: today(8, 25),
});

// 2) 底盘悬挂 等刹车片（待复核）
const vBrake = storyVisit({
  plate: 'YQ3220A', model: '五十铃 NPR', wo: 'WO-2077', taskType: 'chassis', bayId: 'c1', entryH: 9, entryM: 5,
  promisedAt: today(16, 30), etaAt: today(17, 15), status: 'waiting', risk: 'risk',
  workMin: 45, waitMin: 150, otherMin: 15, techs: [], activityRate: 0,
  pauses: [{ cause: 'parts', durMin: 150, partNo: 'BP-4521 重卡刹车片', note: '库存 0 · 明天到货' }],
  events: [
    { t: today(9, 5), type: 'entry', evidence: ['CAM-01 截图', '置信度 96%'] },
    { t: today(9, 20), type: 'assign', note: '2F 底盘悬挂' },
    { t: today(9, 35), type: 'workStart', note: '王军' },
    { t: today(10, 20), type: 'pause', severity: 'warn', note: '重卡刹车片 BP-4521 缺货', evidence: ['WMS 库存快照', 'CAM-23 截图'] },
  ],
  plateConfidence: 96, assignAt: today(9, 20),
});

// 3) 3F 皮卡 紧张但正常
const vGen = storyVisit({
  plate: 'YP9451T', model: '丰田 Hilux', wo: 'WO-2085', taskType: 'general', bayId: 'p1', entryH: 13, entryM: 5,
  promisedAt: today(17, 0), etaAt: today(16, 50), status: 'working', risk: 'tight',
  workMin: 80, waitMin: 0, otherMin: 7, techs: ['陈杰'], activityRate: 88,
  events: [
    { t: today(13, 5), type: 'entry', evidence: ['CAM-01 截图', '置信度 99%'] },
    { t: today(13, 15), type: 'assign', note: '3F 皮卡-1' },
    { t: today(13, 30), type: 'workStart', note: '陈杰' },
  ],
  plateConfidence: 99, assignAt: today(13, 15),
});

// 4) 发动机-1 正常
const vEng = storyVisit({
  plate: 'YR5882J', model: '日野 300', wo: 'WO-2081', taskType: 'engine', bayId: 'e1', entryH: 11, entryM: 20,
  promisedAt: today(16, 30), etaAt: today(16, 10), status: 'working', risk: 'ok',
  workMin: 126, waitMin: 10, otherMin: 12, techs: ['刘洋', '赵磊'], activityRate: 84,
  pauses: [{ cause: 'personnel', durMin: 10 }],
  events: [
    { t: today(11, 20), type: 'entry', evidence: ['CAM-01 截图', '置信度 97%'] },
    { t: today(11, 35), type: 'assign', note: '2F 发动机-1' },
    { t: today(11, 50), type: 'workStart', note: '刘洋 / 赵磊' },
  ],
  plateConfidence: 97, assignAt: today(11, 35),
});

// 5) 工程机械正常作业
const vMach = storyVisit({
  plate: 'EXC-07', model: 'CAT 320D 挖掘机', wo: 'WO-2083', taskType: 'machinery', bayId: 'm1', entryH: 10, entryM: 5,
  promisedAt: today(18, 30), etaAt: today(18, 10), status: 'working', risk: 'ok',
  workMin: 190, waitMin: 0, otherMin: 20, techs: ['黄明'], activityRate: 81,
  events: [
    { t: today(10, 5), type: 'entry', evidence: ['CAM-01 截图', '置信度 95%'] },
    { t: today(10, 20), type: 'assign', note: '3F 工程机械' },
    { t: today(10, 40), type: 'workStart', note: '黄明' },
  ],
  plateConfidence: 95, assignAt: today(10, 20),
});

// 6) 待分配队列
const vQueue1 = storyVisit({ plate: 'YT2901K', model: '沃尔沃 FH', wo: 'WO-2088', taskType: 'engine', bayId: null, entryH: 14, entryM: 20, status: 'queue', risk: 'ok', promisedAt: today(18, 30) });
const vQueue2 = storyVisit({ plate: 'YX6334B', model: '斯堪尼亚 P280', wo: 'WO-2086', taskType: 'general', bayId: null, entryH: 13, entryM: 47, status: 'queue', risk: 'tight', promisedAt: today(18, 0), otherMin: 45 });
const vQueue3 = storyVisit({ plate: 'YP8317C', model: '日产 Navara', wo: 'WO-2090', taskType: 'inspect', bayId: null, entryH: 14, entryM: 28, status: 'queue', risk: 'ok', promisedAt: today(17, 30), plateConfidence: 81 });

// 7) 完工待取车 ×4
const vPickup = [
  storyVisit({ plate: 'YK1520D', model: '福特 Ranger', wo: 'WO-2078', taskType: 'inspect', bayId: null, entryH: 9, entryM: 40, status: 'pickup', risk: 'done', workMin: 40, otherMin: 200, promisedAt: today(12, 30), etaAt: today(12, 10) }),
  storyVisit({ plate: 'YL4889E', model: '三菱 Triton', wo: 'WO-2075', taskType: 'engine', bayId: null, entryH: 8, entryM: 50, status: 'pickup', risk: 'done', workMin: 140, waitMin: 25, otherMin: 150, promisedAt: today(13, 0), etaAt: today(12, 45), pauses: [{ cause: 'personnel', durMin: 25 }] }),
  storyVisit({ plate: 'YM0116F', model: '丰田 Hilux', wo: 'WO-2073', taskType: 'chassis', bayId: null, entryH: 10, entryM: 15, status: 'pickup', risk: 'done', workMin: 85, otherMin: 160, promisedAt: today(14, 0), etaAt: today(13, 50) }),
  storyVisit({ plate: 'YN7204G', model: '五十铃 D-Max', wo: 'WO-2079', taskType: 'general', bayId: null, entryH: 8, entryM: 30, status: 'pickup', risk: 'done', workMin: 130, waitMin: 42, otherMin: 200, promisedAt: today(12, 0), etaAt: today(11, 40), pauses: [{ cause: 'parts', durMin: 42, partNo: 'FL-3342 液压滤芯' }] }),
];

// 8) 今日已出场（上午完成的 5 台）
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

export const TODAY_VISITS: Visit[] = [vHyd, vBrake, vGen, vEng, vMach, vQueue1, vQueue2, vQueue3, ...vPickup, ...exitedToday];
export const ALL_VISITS: Visit[] = [...TODAY_VISITS, ...PAST_DAYS.flatMap((d) => d.visits)];
export const ON_SITE: Visit[] = TODAY_VISITS.filter((v) => !v.exitAt);

// ---------------------------------------------------------------- 延误案件（本周）

const delaySeed: Array<[string, string, BayId, TaskType, number, Cause, number, ReviewStatus, number]> = [
  // woSuffix, plate, bay, task, delayH, cause, conf, review, daysAgo
  ['WO-2069', 'YN7663X', 'h1', 'hydraulic', 1.3, 'parts', 92, 'confirmed', 0],
  ['WO-2077', 'YQ3220A', 'c1', 'chassis', 2.6, 'parts', 88, 'pending', 0],
  ['WO-2073', 'YM0116F', 'c1', 'chassis', 0.9, 'personnel', 85, 'confirmed', 0],
  ['WO-2078', 'YK1520D', 'qc', 'inspect', 0.7, 'supervision', 71, 'pending', 0],
  ['WO-2075', 'YL4889E', 'e1', 'engine', 0.5, 'other', 45, 'manual', 0],
  ['WO-2061', 'YP9775H', 'e2', 'engine', 1.8, 'parts', 94, 'confirmed', 1],
  ['WO-2064', 'YQ2653J', 'h1', 'hydraulic', 1.1, 'personnel', 82, 'confirmed', 1],
  ['WO-2052', 'YR7308K', 'p1', 'general', 0.8, 'parts', 90, 'confirmed', 2],
  ['WO-2055', 'YT5941L', 'c1', 'chassis', 1.5, 'parts', 91, 'confirmed', 2],
  ['WO-2046', 'YU3027M', 'h1', 'hydraulic', 2.1, 'parts', 89, 'confirmed', 3],
  ['WO-2048', 'YV8512N', 'm1', 'machinery', 0.6, 'supervision', 68, 'pending', 3],
  ['WO-2042', 'YX4786P', 'p2', 'general', 0.9, 'personnel', 86, 'confirmed', 4],
  ['WO-2044', 'YY6150Q', 'qc', 'inspect', 0.4, 'other', 40, 'manual', 5],
  ['WO-2040', 'YZ1394R', 'e1', 'engine', 1.2, 'parts', 93, 'confirmed', 6],
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
  { name: 'BP-4521 重卡刹车片', count: 4, lossH: 6.8 },
  { name: 'HYD-1180 液压密封套件', count: 2, lossH: 2.1 },
  { name: 'FL-3342 液压滤芯', count: 1, lossH: 0.7 },
];

export const LOW_CONF_PLATES = [
  { plate: 'YP8317?', confidence: 81, when: today(14, 28) },
  { plate: 'YX6?34B', confidence: 76, when: today(13, 47) },
  { plate: 'YR588?J', confidence: 84, when: today(11, 20) },
];

// ---------------------------------------------------------------- 分析页数据

export const HEATMAP: number[][] = (() => {
  // [bay][hour 8..19] 0..1，顺序与 BAYS 一致
  const hours = 12;
  const mk = (prof: (h: number) => number) => Array.from({ length: hours }, (_, i) => Math.min(1, Math.max(0, prof(i) + (rnd() - 0.5) * 0.15)));
  return [
    mk((h) => (h < 1 ? 0.3 : h < 8 ? 0.85 : h < 10 ? 0.5 : 0.2)),      // e1
    mk((h) => (h < 1 ? 0.4 : h < 9 ? 0.9 : 0.3)),                       // e2
    mk((h) => (h < 2 ? 0.2 : h < 6 ? 0.8 : h<8 ? 0.6 : 0.15)),          // c1
    mk(() => 0.92),                                                     // h1 液压全天满载
    mk((h) => (h < 1 ? 0.25 : h < 7 ? 0.75 : h < 9 ? 0.5 : 0.2)),       // p1
    mk((h) => (h < 2 ? 0.3 : h < 8 ? 0.7 : 0.25)),                      // p2
    mk((h) => (h < 3 ? 0.2 : h < 9 ? 0.8 : 0.3)),                       // m1
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
  { t: today(14, 31), text: 'WO-2077 配件到货确认 · 重卡刹车片 BP-4521（明天入库）', level: 'warn' },
  { t: today(14, 28), text: 'YP8317C 进场 · 置信度 81% → 复核队列', level: 'warn' },
  { t: today(14, 20), text: 'YT2901K 进场 · 置信度 99%', level: 'info' },
  { t: today(13, 40), text: 'WO-2069 超目标工时（4h）· 液压系统', level: 'bad' },
  { t: today(13, 30), text: 'WO-2085 综合维修任务开始 · 陈杰', level: 'info' },
  { t: today(13, 15), text: '主管巡检：发动机区覆盖 ✓ · 液压区未到访', level: 'warn' },
  { t: today(12, 45), text: 'WO-2075 完工 · YL4889E 待取车', level: 'info' },
  { t: today(11, 2), text: 'WO-2069 恢复作业 · 密封套件到货', level: 'info' },
];
