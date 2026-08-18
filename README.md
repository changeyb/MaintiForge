# KTT 6Terusan 车间数字化追踪与工位管理系统 · Demo

维修车间数字化看板的前端演示项目。基于《KTT 6Terusan 车间数字化追踪与工位管理系统建设方案》（V1.0）设计，面向老板/管理层最关心的四个问题：

1. **今天能交几台？哪几台交不了？** —— 交付承诺区（ETA vs 承诺）
2. **现在哪里卡住了？** —— 五工位实时状态机
3. **为什么延误？** —— 根因分类（配件/人员/监管/待确认）+ 证据链复核
4. **趋势和班组差异？** —— 中位/P90 周转、A/B 班对比、工位热力

## 仓库结构

```
frontend/          # React 前端 Demo（业务代码在此）
├── src/mock/      # 事件底座 mock（固定种子，字段对齐方案 6.1 数据对象）
├── src/derive/    # 指标推导层（口径对齐方案 6.3，数字由事件计算）
└── src/pages/     # 6 个页面：驾驶舱 / 实时看板 / 车辆进度 / 时间线 / 延误根因 / 运营分析
configs/           # 可复用流程配置，例如用户手册的线上地址、路由和验收阈值
scripts/           # 生成/验收脚本
docs/              # 客户手册、截图和 SHA-256 manifest
```

## 快速开始

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

详见 [frontend/README.md](frontend/README.md)。

## 用户手册生成

功能或线上页面变更并完成部署后，使用仓库根目录的固定入口重新生成客户手册、线上截图和 SHA-256 manifest：

```bash
python3 scripts/generate_user_manual.py --config configs/user_manual.toml
```

该命令会按配置访问线上站点的 8 个路由，使用 `1680×1050` 中文视窗截图，渲染 `scripts/templates/user_manual.md`，检查图片引用、尺寸、文件大小、客户向禁用词和关键内容门禁，并用错误端口截图做小文件反向验证。生成后仍需人工目视复核截图内容，脚本不会把自动检查当成视觉验收。

默认配置固定使用已部署的 `http://47.97.66.237`，并拒绝 `localhost`/回环地址，避免把本地页面误当成客户手册截图。

只做不联网、不写文件的复核：

```bash
python3 scripts/generate_user_manual.py --config configs/user_manual.toml --check-only
```

修改站点地址、路由、截图阈值或输出路径时，先改 `configs/user_manual.toml`；手册正文改 `scripts/templates/user_manual.md`，不要直接改生成文件 `docs/用户手册.md`。可追溯清单写入 `docs/user-manual-manifest.json`。

## 特性

- 🖥️ 深色大屏风，支持全屏演示；界面**中英双语**一键切换
- 📊 所有指标从 mock 事件流推导（非写死数字），翻页/切筛选数字互相对得上
- 🎬 内置演示剧本：液压系统超时等密封套件、重卡刹车片缺货 2.6h、B 班巡检空窗、低置信车牌复核
- ⚖️ 守住方案治理边界：根因带置信度与证据链、复核留痕、人员数据只做班组级对比

## 方案文档

完整方案见：`/Users/benjamin/Documents/Codex/2026-08-17/new-chat-2/outputs/KTT_6Terusan_Workshop_Tracking_System_Solution_CN.docx`
