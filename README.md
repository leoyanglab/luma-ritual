# LUMA Ritual · 跨境护肤商城 Demo

完整可交互的护肤品牌零售展示站，部署在 Cloudflare Workers + D1。**模拟支付，不收取真实款项、不实际发货。**

## 功能

- 首页、8 款示例商品、分类、搜索（商品及成分）、价格筛选、排序、收藏。
- 商品详情、规格与数量、示例评价、配送说明。
- 护理搭配台：早晚流程切换、桌面拖放、移动端下拉选择、整套加购。
- 360° 包装：六面 CSS 3D 概念包装模型，拖动及键盘/滑块旋转；并非真实产品扫描。
- 肤质/偏好向导：3 步选择、规则推荐、同步至搭配台；不诊断肌肤。
- 质地实验室：乳霜/凝露/精华/护理油切换、模拟涂抹、调节光照；数字动画与示例描述。
- 商品对比：最多 3 件，容量、质地、成分、价格、偏好肤质及步骤对比。
- 礼盒定制：1–3 件商品、3 种盒色、120 字留言、实时预览、连同包装加购。
- 场景购物：插画场景、商品热点、快捷详情与场景一键加购。
- 可视化购物车：侧栏、数量编辑、移除、包邮进度、礼盒包装与总价。
- 模拟结账：联系与地址表单、标准/快递运费、LUMA10 优惠、服务端重新计价、重复提交防重、成功页。
- 本地订单记录、演示取消、再次购买、下载演示收据。
- 中英切换、USD/EUR/GBP/CNY 显示、响应式布局与减少动画支持。
- 帮助中心、本地演示工单、品牌/隐私与演示条款页面。

## 匿名统计

访客明确同意后采集事件；拒绝不影响购物。包括 PV、匿名标签页会话、逐步转化漏斗、商品浏览/加购、互动功能使用、国家和设备分布。统计不保存访客 IP、邮箱或收货地址。事件保留最多 90 天，在后续事件写入时清理。订单保留至站点关闭或站长删除。

站长入口：`/#analytics`。密码存储为 Worker secret `ADMIN_PASSWORD`；本地初始化密码保存在被 Git 忽略的 `.dev.vars`，不要提交此文件。登录 cookie 为 HttpOnly + Secure + SameSite=Strict，有效期一小时。登录与写入接口均有速率限制。

统计支持 7/30/90 天、UTC 日期汇总、CSV 导出。**订单金额全部是模拟金额**。取消订单只改本地演示状态，不冲减服务端历史订单数/金额。漏斗仅包含同意统计且按顺序经过步骤的会话，因此不一定等于全部订单数。

## 本地运行

```sh
npm ci
npx wrangler d1 migrations apply luma-ritual-demo --local
# 创建 .dev.vars，内容为 ADMIN_PASSWORD=<自行设置的强密码>
npm run dev
```

预览：`http://localhost:4180`。

```sh
npm run build
npm test
TEST_BASE_URL=http://localhost:4180 npm test
```

最后一条执行真实本地接口测试，需先启动预览；不设置 TEST_BASE_URL 时跳过集成测试。

## 部署

```sh
npx wrangler login
npx wrangler d1 migrations apply luma-ritual-demo --remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

配置中的 Cloudflare 账号、D1 数据库及 `glow.bool.win` 绑定属于本项目部署。迁移其它账号前修改 `wrangler.jsonc`。

`npm run deploy` 同时部署静态资源与 Worker。无需构建依赖 CDN，无外部字体或图片请求。

自动部署由 Cloudflare Workers Builds 执行，连接 `leoyanglab/luma-ritual` 的 `main` 分支。构建命令为 `npm run build && npm test`，部署命令为 `npx wrangler deploy`。检查或测试失败时不执行部署。非 main 分支的预览构建关闭。运行时的统计后台密码保留在 Cloudflare Worker Secret 中，不需要写入仓库。

## 演示边界

商品、成分、评价、物流及价格均为虚构示例。非 USD 币种使用固定演示汇率，税费/关税为零。服务端不接收结账姓名、地址或邮箱。没有真实库存、银行支付、发货、退款或真实客服，亦没有商家商品管理后台。真实商业运营需要另行接入上述服务及相应业务规则。
