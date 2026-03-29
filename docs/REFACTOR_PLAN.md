# 重构计划：合并到 AdonisJS

> 状态：规划中 | 创建时间：2026-03-28

---

## 目标

将所有交易机器人合并到 AdonisJS 项目中，实现：
1. 运行项目时自动启动 API 服务 + 交易服务
2. 使用 AdonisJS 原生模式（非自定义 HTTP 服务器）
3. 测试完成后删除旧代码

---

## 🗂️ 预删除文件清单（测试完成后删除）

### 已删除 ✅
- [x] `dashboard-api.js` — 功能已被 `bin/server.ts` + controllers 替代
- [x] `trend-bot.js` — 逻辑移入 `app/services/trend_bot.ts`
- [x] `grid-bot.js` — 逻辑移入 `app/services/grid_bot.ts`
- [x] `arbitrage-bot.js` — 逻辑移入 `app/services/arbitrage_bot.ts`
- [x] `secrets.js` — 已迁移到 `.env`
- [x] `secrets.js.example` — 已迁移到 `.env.example`
- [x] `gate_api.js` (根目录) — 已迁移到 `app/services/gate_api.ts`
- [x] `bot.log`, `dashboard.log`, `tunnel.log` — 运行时日志已清理

### 仍需保留（仍在使用）
- [ ] `config.js` — Dashboard (index.html) 依赖此文件的 API_BASE_URL
- [ ] `trading-settings.json` — trend_bot service 读取杠杆设置
- [ ] `bot-status.json` — trend_bot service 写入运行状态

### 旧命令包装器（已重构为直接入口）
- [x] `commands/trend_bot_command.ts` — 重写为直接调用 service
- [x] `commands/grid_bot_command.ts` — 重写为直接调用 service
- [x] `commands/arbitrage_bot_command.ts` — 重写为直接调用 service

---

## 📊 当前状态分析

### 已有的 AdonisJS 结构 ✅
```
bin/server.ts          # 自定义 HTTP 服务器（非原生 AdonisJS）
bin/ace.ts             # ACE CLI 入口
app/
  commands/            # 已有 trend_bot_command.ts, grid_bot_command.ts, arbitrage_bot_command.ts
  controllers/Http/    # 已有各类控制器
  services/            # 已有 gate_api.ts（但使用旧式 regex 解析 secrets.js）
start/
  routes.ts
  kernel.ts
```

### 问题
- `bin/server.ts` 是自定义 HTTP 服务器，未使用 AdonisJS 原生 HTTP 层
- Controllers 有自定义 context，架构不标准
- `app/services/gate_api.ts` 仍用 regex 解析 `secrets.js`
- 旧 `.js` 文件与 AdonisJS commands 并存

---

## 🗂️ 预删除文件清单（测试完成后删除）



---

## 🏗️ 重构步骤

### ✅ Phase 1: 修复 AdonisJS HTTP 层
1. ✅ 替换 `bin/server.ts` 为 custom HTTP + AdonisJS controllers
2. ✅ 在 `start/routes.ts` 中定义所有 API 路由
3. ✅ 使用自定义 context 模式确保 controllers 工作
4. ✅ 删除旧的 dashboard-api.js

### ✅ Phase 2: 统一 API 配置
1. ✅ 更新 `app/services/gate_api.ts` 使用 `dotenv` 和 `process.env`
2. ✅ 删除根目录的 `gate_api.js`

### ✅ Phase 3: 合并 Trading Bots 到 AdonisJS Services
1. ✅ 将 `trend-bot.js` 逻辑移入 `app/services/trend_bot.ts`
2. ✅ 将 `grid-bot.js` 逻辑移入 `app/services/grid_bot.ts`
3. ✅ 将 `arbitrage-bot.js` 逻辑移入 `app/services/arbitrage_bot.ts`
4. ✅ 重写 `commands/` 为直接调用 service 的入口

### ✅ Phase 4: 自动启动服务
1. ✅ `app/app.ts` 支持 `AUTO_START_BOT` 环境变量

### ✅ Phase 5: 测试验证
1. ✅ `npm run dev` API 服务器正常运行
2. ✅ `npm run trend:bot` 交易机器人正常运行
3. ✅ 所有 API 端点测试通过
4. ✅ 杠杆修改功能正常（含10x上限保护）

### ✅ Phase 6: 删除旧代码
1. ✅ 已删除旧 JS 文件和 secrets.js
2. ✅ 清理了运行时日志

---

## 📁 目标文件结构（重构后）

```
open-fortune-claw/
├── bin/
│   ├── server.ts        # API HTTP 服务器
│   └── ace.ts           # ACE CLI
├── app/
│   ├── app.ts           # Application bootstrap
│   ├── commands/        # AdonisJS commands
│   │   ├── trend_bot_command.ts      # 真正的 bot 命令
│   │   ├── grid_bot_command.ts
│   │   └── arbitrage_bot_command.ts
│   ├── controllers/
│   │   └── Http/        # API controllers
│   └── services/        # 业务逻辑
│       ├── gate_api.ts  # 统一的 Gate.io API
│       ├── trend_bot.ts
│       ├── grid_bot.ts
│       ├── arbitrage_bot.ts
│       └── database.ts
├── config/              # AdonisJS 配置
├── start/
│   ├── routes.ts        # API 路由定义
│   └── kernel.ts
├── .env                 # API 密钥
├── .gitignore
└── package.json
```

---

## ⏳ 依赖项

- `dotenv` — 已在 package.json
- `better-sqlite3` — trend-bot.js 已在用
- `gate-api` — 已在用

---

## 🔧 待解决问题

1. **双数据库问题**: `better-sqlite3` (sync) vs `sqlite3` (async) — 需要统一
2. **进程管理**: 如何同时运行 API 服务器和交易 bots — 考虑使用 ` concurrently` 或 separate processes
3. **DCA 状态持久化**: 需要写入数据库而非内存
