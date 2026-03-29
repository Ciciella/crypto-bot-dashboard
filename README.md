# Open Fortune Claw - 加密货币交易机器人

> 自动化加密货币交易系统，支持趋势交易、网格交易、资金费率套利等多种策略

## 功能特性

- **Dashboard** - 实时查看交易状态、持仓、盈亏
- **趋势交易** - 基于 RSI、MA、MACD 等指标自动交易，支持 DCA 加仓
- **网格交易** - 区间震荡自动低买高卖
- **资金费率套利** - 跨交易所对冲赚取资金费率
- **自动盯盘** - 7×24 小时自动执行交易策略

## 技术栈

- **框架**: AdonisJS 7 + TypeScript
- **数据库**: SQLite (Node.js 内置)
- **API**: Gate.io Futures API (测试网)
- **运行环境**: Node.js >= 22

## 项目结构

```
open-fortune-claw/
├── app/
│   ├── controllers/Http/          # HTTP 控制器
│   │   ├── balance_controller.ts    # 余额历史
│   │   ├── config_controller.ts      # 配置读取
│   │   ├── dashboard_controller.ts   # Dashboard 数据
│   │   ├── debug_log_controller.ts   # 调试日志
│   │   ├── health_controller.ts      # 健康检查
│   │   ├── log_controller.ts         # 操作日志
│   │   ├── position_controller.ts    # 当前持仓
│   │   ├── stats_controller.ts       # 统计数据
│   │   ├── status_controller.ts      # 机器人状态
│   │   ├── trade_controller.ts       # 交易历史
│   │   └── trading_settings_controller.ts  # 交易设置
│   └── services/                    # 业务逻辑
│       ├── arbitrage_bot.ts         # 资金费率套利机器人
│       ├── database.ts              # SQLite 数据库封装
│       ├── gate_api.ts              # Gate.io API 封装
│       ├── grid_bot.ts              # 网格交易机器人
│       └── trend_bot.ts             # 趋势交易机器人
├── bin/
│   └── server.ts                    # HTTP 服务器入口
├── commands/                        # CLI 命令
│   ├── index.ts                     # 命令导出
│   ├── trend_bot_command.ts         # 趋势机器人命令
│   ├── grid_bot_command.ts          # 网格机器人命令
│   ├── arbitrage_bot_command.ts     # 套利机器人命令
│   └── reset_data_command.ts        # 重置数据命令
├── config/                          # 配置文件
│   └── app.ts                       # AdonisJS 应用配置
├── start/
│   ├── kernel.ts                    # HTTP 内核
│   └── routes.ts                    # 路由定义
├── index.html                       # Dashboard 前端页面
├── trading-settings.json            # 交易设置 (杠杆等)
├── bot-status.json                  # 机器人运行状态
├── trading.db                       # SQLite 数据库
├── .env.example                     # 环境变量模板
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，或创建以下环境变量：

```bash
GATE_TESTNET_API_KEY=你的APIKey
GATE_TESTNET_API_SECRET=你的APISecret
PORT=3000
```

或编辑 `trading-settings.json` 配置杠杆：

```json
{
  "leverage": 10
}
```

### 3. 启动 Dashboard

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 启动交易机器人

```bash
# 趋势交易机器人
npm run trend:bot

# 网格交易机器人
npm run grid:bot

# 资金费率套利机器人
npm run arbitrage:bot

# 重置所有数据
npm run reset:data
```

## API 接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/test` | 健康检查 |
| GET | `/api/status` | 机器人状态 |
| GET | `/api/trades` | 交易历史 |
| GET | `/api/positions` | 当前持仓 |
| GET | `/api/all` | Dashboard 全部数据 |
| GET | `/api/logs` | 操作日志 |
| GET | `/api/balance-history` | 余额历史 |
| GET | `/api/config` | 配置信息 |
| GET | `/api/stats` | 统计数据 |
| GET | `/api/debug` | 调试日志 |
| GET | `/api/trading-settings` | 获取交易设置 |
| PUT | `/api/trading-settings` | 更新交易设置 |

## 交易策略

### 趋势交易 (Trend Bot)

- **指标**: RSI、EMA、MACD
- **开仓条件**: RSI 超卖 + 趋势向上 + MACD 柱为正
- **平仓条件**: RSI 超买 或 触发止盈/止损
- **DCA 加仓**: 下跌时自动分批加仓降低成本
- **默认配置**: 10x 杠杆，15 分钟K线，RSI(14)

### 网格交易 (Grid Bot)

- **原理**: 在价格区间内均匀布单，低买高卖
- **参数**: 网格数量、区间幅度、每格下单量
- **风控**: 整体止损、紧急停止

### 资金费率套利 (Arbitrage Bot)

- **原理**: 跨交易所做多空对冲，赚取资金费率
- **监控**: BTC_USDT、ETH_USDT 等交易对
- **阈值**: 默认 0.01% 资金费率触发

## 数据库表

| 表名 | 用途 |
|------|------|
| `trades` | 交易记录 |
| `check_logs` | 策略检查日志 |
| `debug_logs` | 调试日志 |
| `heartbeat` | 机器人心跳 |

## 注意事项

- 使用 Gate.io **测试网**，不会产生真实资金
- API 密钥通过环境变量管理，请勿提交到 GitHub
- 交易有风险，请谨慎使用

## 推荐注册

### Gate.io 合约交易所

使用邀请链接注册可获得 **20% 手续费返佣**：

邀请链接: https://www.gateport.business/share/VVIVAQGKAQ

## License

MIT
