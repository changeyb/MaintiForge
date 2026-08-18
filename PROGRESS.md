# 执行进度

- 目标：为维修车间 demo 增加 `/poc` 数据血缘、PoC 验收、ROI 展示与收尾提案，帮助客户相信数据来源并购买 PoC。
- 顺序：先追加 ROI 推导，再完成页面/i18n/导航路由，随后补 Dashboard banner 与提案，最后做构建、红绿反向验证和截图验收。
- 边界：仅修改任务白名单文件；不碰 mock 数据、依赖、配置和已有 i18n 文案。
- 已核对：初始 build 通过；mock/data.ts 与 package.json 指纹符合要求；totalWaitLossWeek 存在。
- 最大风险：i18n 中英文 key 同步、页面数字血缘、深色大屏布局与无头截图验收。
- 进度：全部完成。最终 build 通过；mock/package 指纹不变；zh/en=248；反向删 key 红→恢复绿已验证；首页与 `/poc` 截图均超过 80KB；`BLOCKED.md` 已记录既有硬编码涨跌文案。
