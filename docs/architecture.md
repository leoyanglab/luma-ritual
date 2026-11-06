# LUMA Ritual：代码结构与阅读顺序

## 从哪里开始

先读 `src/worker.js` 了解请求入口。商店从 `client/app.js` 进入，管理端从 `client/admin.jsx` 进入。控制器只持有状态和操作，界面工厂接收同一个控制器，不能复制 Signals。事件需要重置结算幂等键时调用入口传入的函数，避免把可变局部变量复制到另一个闭包。

## 目录职责

- `client/app.js`：启动、路由渲染、购物车与结算协调。
- `client/storefront/state.js`：Signals 状态与本地数据恢复。
- `client/storefront/events.js`：商店事件绑定；依赖由入口显式传入。
- `client/storefront/analytics.js`：站长统计页面与报表渲染。
- `client/admin.jsx`：管理端入口、登录与页面外壳。
- `client/admin/controller.js`：管理端 Signals、API 与写入操作。
- `client/admin/editors.jsx`：商品/订单表单和弹窗。
- `client/admin/dashboard.jsx`：概览、商品、库存、订单与审计列表。
- `client/admin/utils.js`：状态标签、显示格式、CSV 和商品初值。
- `public/catalog.js`、`views.js`、`seo.js`：客户端/SSR 共用的目录、模板和元信息。
- `src/worker.js` → `api.js` / `ssr.js`：请求分流、API 和服务端 HTML。
- `src/store.js`：D1 查询与事务；`migrations/`：数据库迁移。
- `scripts/build.mjs`：语法检查与浏览器打包；`public/app.js` 是生成产物，不手工修改。

## 修改约定

- 页面入口负责组合，功能放在对应组件或模块；共享规则放到领域/状态层。
- 浏览器操作在事件或客户端初始化中执行，保证服务端渲染时可安全导入。
- 每个请求或应用实例保有自己的状态；不要引入跨用户的全局可变状态。
- 保持现有接口、持久化键、权限和业务行为；数据库变化新增迁移。
- 修改源码后运行 `npm run format`；提交前运行 `npm run format:check`、`npm run build` 和 `npm test`。
- 格式由 `.prettierrc.json` 与 `.editorconfig` 统一，生成资源不手工编辑。

`npm test` 默认只运行离线测试；API/管理端测试需启动已迁移的本地 D1 服务，然后设置 `TEST_BASE_URL`。不要将测试指向生产服务。
