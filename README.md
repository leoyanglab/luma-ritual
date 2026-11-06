# LUMA Ritual

基于 **H3 v2 SSR + Preact + Signals + Cloudflare Workers / D1** 的护肤品牌零售 Demo，采用 MIT 许可证。

- 商城：https://glow.bool.win
- 商品管理：https://glow.bool.win/admin
- 访问统计：https://glow.bool.win/analytics
- 源码：https://github.com/leoyanglab/luma-ritual

**虚构商品、模拟支付、模拟履约，不收取真实款项、不实际发货。** 顾客无需注册，使用游客结账；管理后台必须登录。

## 商城与互动

商品列表、分类、名称与成分搜索、肤质与质地筛选、价格筛选、排序、双语、四种显示币种、收藏、商品详情与移动端悬浮加购、购物车、优惠码、配送方式、模拟结账、订单记录及收据下载。

八项互动均已实现：早晚护肤流程搭配（拖放 / 下拉）、360° 概念包装模型、三步偏好向导、质地数字动画、最多三件商品对比、礼盒组合与留言、插画场景热点选购、带包邮进度的侧栏购物车。包装模型、质地动画和场景均为数字示意，并非真实扫描或实拍素材。

前台从 D1 商品目录读取数据。订单由服务端重新计算价格，忽略客户端提交的金额；使用随机请求 ID 防止重复下单。库存扣减和订单写入在同一 D1 事务中执行，缺货或下架会回滚整笔订单。

## 管理后台

`/admin` 使用与统计后台相同的站长密码：

- 概览：已上架商品、低库存、待处理订单及模拟金额。
- 商品：新增、编辑中英文名称与描述、价格、规格、成分、肤质标签、包装形状 / 颜色、上下架、登录后的草稿预览、导出 JSON。
- 库存：库存调整、下单扣减、取消返还、最近 100 条库存流水。
- 订单：编号搜索、状态筛选、分页、商品与金额明细、配送 / 礼盒留言、内部备注、模拟物流、当前页 CSV 导出。
- 状态：待处理 → 备货中 → 已模拟发货 → 演示完成；待处理 / 备货中可取消，取消只返还一次库存。
- 操作日志：最近 100 条商品、库存及订单操作。

商品与订单编辑采用版本校验，过期提交返回 409，避免覆盖其它操作。下架不删除历史订单。内部备注不会出现在顾客订单查询接口中。

## SSR 与 SEO

H3 v2 处理 HTTP 路由，Preact 在服务端生成文档片段，商城模板由服务端与客户端共用。Preact + Signals 驱动后台组件；商城交互状态使用 Signals。客户端由 esbuild 打包。

首页、列表、详情和互动页直接返回含内容的 HTML，无需等待 JavaScript 生成商品内容。使用真实路径（如 `/product/morning-serum`），兼容旧的 hash 链接跳转。

包含独立 title / description、canonical、双语 hreflang、Open Graph / Twitter PNG 分享图、WebSite / Product / Breadcrumb JSON-LD、robots.txt 和动态 sitemap.xml。失效商品返回 404，已下架商品不进入 sitemap。后台、统计、结账、订单等页面设置 noindex。示例评价不会标记成真实评分；演示商品不声明真实销售 Offer。

SEO 配置提供可抓取页面，不保证搜索引擎收录或排名。

## 运行与测试

需要 Node.js >= 20.19。

```sh
npm ci
# 新部署者：先修改 wrangler.jsonc 中的账号、域名与数据库绑定
npx wrangler d1 migrations apply luma-ritual-demo --local
# 在被 Git 忽略的 .dev.vars 中设置 ADMIN_PASSWORD=<自行设置的强密码>
npm run dev
```

预览地址：`http://localhost:4180`。本项目现有站长密码保存在本机 `.dev.vars`，不在 Git 中。

```sh
npm run build
npm test
# 启动预览后，额外运行真实本地 API 集成测试
TEST_BASE_URL=http://localhost:4180 npm test
```

测试覆盖 SSR 元数据与转义、404 / 空目录、服务端计价、权限与来源校验、商品编辑、过期版本、并发库存、重复下单、取消返库、订单状态与内部备注隔离。

## 部署

Cloudflare Workers Builds 已连接 `leoyanglab/luma-ritual` 的 `main` 分支。push 触发 `npm run build && npm test`，通过后部署。其它分支的预览构建关闭。

首次部署或新增迁移时，需要在发布新版服务端前应用数据库迁移：

```sh
npx wrangler login
npx wrangler d1 migrations apply luma-ritual-demo --remote
npx wrangler secret put ADMIN_PASSWORD
npm run build
npm run deploy
```

迁移 0002 将 8 款概念商品写入 D1，初始演示库存均为 100；迁移前的历史订单保留，但不追溯扣减库存。迁移 0003 添加配送、礼盒与优惠明细。修改商品与库存只在管理后台进行，不要通过重复执行种子 SQL 覆盖数据。

## 对标完善

参考 Aesop 的商品信息层级、Typology 的问卷选品及 The Ordinary 的分步搭配方式，补充了触感 / 成分摘要、库存状态、逐件匹配理由与组合筛选。移动端长详情页增加悬浮加购。仅参考通用交互结构，不复制品牌素材、配方或真实功效声明。

## 安全与隐私边界

管理密码只保存为 Worker Secret，登录使用 HttpOnly / Secure / SameSite=Strict Cookie，有效期 1 小时。写入操作校验同源 Origin，登录与写入接口有速率限制，请求体限制 16 KiB。数据库使用参数化查询。

HTML 使用 `Cache-Control: no-transform`，避免托管边缘自动注入另一套浏览器统计脚本。访客明确同意后才采集本站的匿名互动统计。不保存 IP 或结账姓名、邮箱、地址，不做浏览器指纹。页面会话使用随机标识。事件保留最多 90 天，在后续事件写入时清理。

新订单返回随机订单凭据，仅保存在下单浏览器。凭据用于查询或取消该订单；没有顾客账户或跨设备订单恢复。不要分享此凭据。历史无凭据订单只保留本地演示记录。

服务端保存商品、库存流水、操作日志、订单商品快照、演示金额、状态和时间，供站长管理。收货表单仅在浏览器内存中使用，不发送至服务端。订单与管理记录保留至站长清理或站点关闭。

访问统计中的订单金额为历史模拟下单总额，包含已取消订单；管理概览的有效模拟金额排除取消订单。两者均不是真实收入。

本站不包含真实银行支付、退款、物流发货、邮箱验证码、顾客注册或图片上传服务。真实运营需另行接入这些服务及适用业务规则。第三方依赖各自保留原许可证；生成的浏览器包附带依赖许可证说明。

## 代码阅读与维护

[代码结构与阅读顺序](docs/architecture.md) 说明入口、模块职责和状态边界。统一格式：`npm run format`；检查格式：`npm run format:check`。
