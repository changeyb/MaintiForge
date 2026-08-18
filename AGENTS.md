# AGENTS.md

给 AI 编码 agent 的项目指引。修改本仓库前请先读完本文件。

## 项目是什么

KTT 6Terusan 维修车间数字化系统的**前端演示 Demo**（无后端、无真实数据）。目的是向客户/老板演示看板设计，不是生产系统。所有代码在 `frontend/`。

- 技术栈：React 18 + TypeScript + Vite 5 + Tailwind CSS v4（`@tailwindcss/vite`）+ ECharts 5 + react-router-dom v6（HashRouter）
- 视觉：深色大屏风。颜色语义全局统一：🟢 作业中/正常 · 🟡 等待/紧张 · 🔴 超时/异常/风险 · ⚫ 空闲 · 斜纹/置灰 停用
- 语言：界面中英双语，所有文案必须走 `src/i18n.tsx` 字典（zh/en 两套 key 必须同步），禁止在组件里硬编码文案

## 常用命令

```bash
cd frontend
npm run dev      # 开发 http://localhost:5173
npm run build    # tsc -b && vite build；提交前必须无 error
```

没有测试框架、没有 lint 配置；验收标准 = `npm run build` 通过 + 页面截图确认。

## 架构纪律（重要）

**分层不可破坏：**

```
src/mock/data.ts        # 唯一数据源：结构化事件/主数据（固定种子 mulberry32，勿改成真随机）
src/derive/metrics.ts   # 唯一指标出口：所有页面数字必须从这里推导
src/pages/*.tsx         # 只负责呈现，禁止在页面里编造业务数字
src/i18n.tsx            # 唯一文案出口
```

- 页面需要新数字 → 在 `mock` 里补数据、在 `derive` 里补推导函数，**不要**在 JSX 里写 `Math.random()` 或拍脑袋常量
- KPI 口径对齐方案文档 6.3：中位+P90（不只看平均值）、环比用"昨日同一时刻切面"（partialDayStat），今日未完结数据在趋势图里用虚线表达
- 进度条口径 = 已用工时 / 目标工时；等待状态进度停住、ETA 继续走。"停留时间 ≠ 维修工时"（方案关键规则）

## 数据对象（对齐方案 6.1）

`Visit`（≈VehicleVisit+BaySession+WorkSegment）、`DelayCase`、`TimelineEvent`、`EvidenceRef`（以 evidence 字符串数组 mock）。新增字段时保持这个对应关系，注释里标明 mock 扩展字段（如 `amount` 工单金额）。

## 治理边界（方案红线，Demo 也要守住）

- ❌ 不做个人绩效排名/红黄绿标人；人员数据只到班组级（A/B 班）
- ✅ 每条根因结论必须带：置信度 + 证据链 + 复核状态（确认/待复核/需人工）
- ✅ "待确认"是合法结论，证据不足时不硬编根因
- ❌ 人脸识别相关 UI 默认不做（方案一期不启用）

## 验证方式

构建通过后，用无头 Chrome 截图自查（dev server 需先启动）：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --window-size=1680,1050 --hide-scrollbars \
  --screenshot=/tmp/shot.png "http://localhost:5173/#/<route>"
```

路由：`""`、`floor`、`vehicles`、`vehicle/V-1`、`delays`、`analytics`。

## 内置演示剧本（改动数据时保持"有戏"）

驾驶舱默认要有可讲的故事，勿修没：
- 闽D·7R663（WO-2069）喷漆超时，上午等原子灰 47min（已复核）
- 闽D·3M220（WO-2077）等刹车片 2.6h（待复核）
- B 班巡检覆盖率 67%（目标 90%）；3 条低置信车牌待复核
