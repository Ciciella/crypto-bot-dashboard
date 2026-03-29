import { fetchPositionsAndBalance, futuresApi } from './gate_api.js'
import { getDb } from './database.js'
import fs from 'fs'
import path from 'path'

// ============ Strategy Identity ============
const MY_STRATEGY = 'grid'

// ============ Configuration ============
interface Config {
  symbol: string
  gridCount: number
  priceRangePercent: number
  baseAmount: number
  mode: string
  takeProfitPercent: number
  stopLossPercent: number
  checkInterval: number
  maxPosition: number
  emergencyStop: boolean
}

const CONFIG: Config = {
  symbol: 'BTC_USDT',
  gridCount: 10,
  priceRangePercent: 10,
  baseAmount: 1,
  mode: 'live',
  takeProfitPercent: 1,
  stopLossPercent: 15,
  checkInterval: 30000,
  maxPosition: 20,
  emergencyStop: false,
}

// ============ Logging ============
function log(msg: string) {
  console.log(`[GridBot] [${new Date().toLocaleTimeString()}] ${msg}`)
}

// ============ State ============
let gridOrders: Array<{
  id: string
  price: number
  side: 'buy' | 'sell'
  size: number
  filled: boolean
}> = []

let currentPrice = 0
let gridRange = { low: 0, high: 0 }
let totalProfit = 0

// ============ Strategy Check ============
function isActiveStrategy(): boolean {
  try {
    const row = getDb().prepare('SELECT active_strategy FROM settings WHERE id = 1').get() as any
    return row?.active_strategy === MY_STRATEGY
  } catch {
    return true
  }
}

// ============ API Functions ============
async function getFuturesBalance() {
  try {
    const result = await fetchPositionsAndBalance()
    if (result.error) {
      log(`获取余额失败: ${result.error}`)
      return null
    }
    return result.balance
  } catch (e: any) {
    log(`获取余额错误: ${e.message}`)
    return null
  }
}

async function getPosition() {
  try {
    const result = await fetchPositionsAndBalance()
    if (result.error) {
      log(`获取持仓失败: ${result.error}`)
      return null
    }
    if (result.positions.length > 0) {
      return result.positions[0]
    }
    return null
  } catch (e: any) {
    log(`获取持仓错误: ${e.message}`)
    return null
  }
}

async function placeOrder(side: 'buy' | 'sell', price: number, size: number): Promise<string | null> {
  try {
    const order = {
      contract: CONFIG.symbol,
      type: side === 'buy' ? 'buy' : 'sell',
      price: String(price),
      size: String(Math.abs(size)),
    }

    const result = await futuresApi.createFuturesOrder(order)
    const orderId = result.body.id ? String(result.body.id) : `grid-${Date.now()}`
    log(`${side === 'buy' ? '买入' : '卖出'}订单: ${size} @ $${price}, ID: ${orderId}`)
    return orderId
  } catch (e: any) {
    const msg = e.response?.body?.message || e.message
    log(`下单失败: ${msg}`)
    return null
  }
}

async function getCurrentPrice(): Promise<number> {
  try {
    const currency = CONFIG.symbol.replace('_USDT', '/USDT')
    const url = `https://api-testnet.gateapi.io/api/v4/futures/usdt/candlesticks?currency_pair=${currency}&interval=1m&limit=1`

    const response = await fetch(url)
    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      return parseFloat(data[0][2]) // close price
    }
    return 0
  } catch (e: any) {
    log(`获取价格失败: ${e.message}`)
    return 0
  }
}

// ============ Grid Functions ============
function calculateGridRange(price: number) {
  const halfRange = price * (CONFIG.priceRangePercent / 100)
  gridRange = {
    low: price - halfRange,
    high: price + halfRange,
  }
  log(`网格区间: $${gridRange.low.toLocaleString()} ~ $${gridRange.high.toLocaleString()}`)
}

function createGridOrders() {
  gridOrders = []
  const gridStep = (gridRange.high - gridRange.low) / CONFIG.gridCount

  for (let i = 0; i < CONFIG.gridCount; i++) {
    const buyPrice = gridRange.low + gridStep * i
    const sellPrice = gridRange.low + gridStep * (i + 1)

    gridOrders.push({
      id: `grid-buy-${i}`,
      price: buyPrice,
      side: 'buy',
      size: CONFIG.baseAmount,
      filled: false,
    })

    gridOrders.push({
      id: `grid-sell-${i}`,
      price: sellPrice,
      side: 'sell',
      size: CONFIG.baseAmount,
      filled: false,
    })
  }

  log(`创建 ${gridOrders.length} 个网格订单`)
}

async function checkAndFillOrders() {
  const position = await getPosition()
  const balance = await getFuturesBalance()

  if (!position || !balance) return

  currentPrice = position.current_price || await getCurrentPrice()
  if (!currentPrice) return

  // Check if price is still in range
  if (currentPrice < gridRange.low || currentPrice > gridRange.high) {
    log(`价格超出网格区间，重新计算...`)
    calculateGridRange(currentPrice)
    createGridOrders()
    return
  }

  // Check each grid order
  for (const order of gridOrders) {
    if (order.filled) continue

    // Check if price crossed the order price
    const crossed = order.side === 'buy'
      ? currentPrice <= order.price
      : currentPrice >= order.price

    if (crossed) {
      log(`触发${order.side === 'buy' ? '买入' : '卖出'}: $${order.price}`)
      const orderId = await placeOrder(order.side, order.price, order.size)
      if (orderId) {
        order.filled = true
        if (order.side === 'sell') {
          totalProfit += CONFIG.takeProfitPercent
        }
      }
    }
  }

  // Check stop loss
  const pnlPercent = position.entry_price
    ? ((currentPrice - position.entry_price) / position.entry_price) * 100
    : 0

  if (pnlPercent <= -CONFIG.stopLossPercent) {
    log(`触发整体止损! 亏损${pnlPercent.toFixed(2)}%`)
    CONFIG.emergencyStop = true
  }

  log(`状态: 价格=$${currentPrice}, 持仓=${position.size}BTC, 盈利=${totalProfit.toFixed(2)}%, PnL=${pnlPercent.toFixed(2)}%`)
}

// ============ Bot Lifecycle ============
let botInterval: NodeJS.Timeout | null = null

export async function startGridBot() {
  // Check if this strategy is active
  if (!isActiveStrategy()) {
    const row = getDb().prepare('SELECT active_strategy FROM settings WHERE id = 1').get() as any
    log(`[GridBot] 当前策略是 ${row?.active_strategy || '未知'}，不启动 Grid Bot`)
    return
  }

  log('网格交易机器人启动')
  log(`配置: ${CONFIG.symbol}, 网格数=${CONFIG.gridCount}, 区间±${CONFIG.priceRangePercent}%`)

  // Initialize
  const price = await getCurrentPrice()
  if (price > 0) {
    calculateGridRange(price)
    createGridOrders()
  }

  // Initial check
  await checkAndFillOrders()

  // Schedule regular checks
  botInterval = setInterval(async () => {
    // Check if strategy is still active
    if (!isActiveStrategy()) {
      const row = getDb().prepare('SELECT active_strategy FROM settings WHERE id = 1').get() as any
      log(`[GridBot] 策略已切换到 ${row?.active_strategy || '未知'}，正在停止...`)
      stopGridBot()
      return
    }

    if (CONFIG.emergencyStop) {
      log('紧急停止触发，停止检查')
      return
    }
    await checkAndFillOrders()
  }, CONFIG.checkInterval)

  process.on('SIGINT', () => {
    log('关闭网格机器人...')
    if (botInterval) clearInterval(botInterval)
    process.exit(0)
  })
}

export function stopGridBot() {
  if (botInterval) {
    clearInterval(botInterval)
    botInterval = null
  }
  log('网格机器人已停止')
}
