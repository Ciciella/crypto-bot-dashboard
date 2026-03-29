import { fetchPositionsAndBalance, futuresApi } from './gate_api.js'
import { getDb } from './database.js'

// ============ Strategy Identity ============
const MY_STRATEGY = 'arbitrage'

// ============ Configuration ============
interface Config {
  symbols: string[]
  hedgeAmount: number
  mode: string
  fundingThreshold: number
  maxPosition: number
  rebalanceThreshold: number
  checkInterval: number
  exchanges: string[]
}

const CONFIG: Config = {
  symbols: ['BTC_USDT', 'ETH_USDT'],
  hedgeAmount: 1,
  mode: 'live',
  fundingThreshold: 0.01,
  maxPosition: 10,
  rebalanceThreshold: 2,
  checkInterval: 60000,
  exchanges: ['gate'],
}

// ============ Logging ============
function log(msg: string) {
  console.log(`[ArbitrageBot] [${new Date().toLocaleTimeString()}] ${msg}`)
}

// ============ State ============
let positions: Map<string, { long: number; short: number }> = new Map()

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

async function getPositions() {
  try {
    const result = await fetchPositionsAndBalance()
    if (result.error) {
      log(`获取持仓失败: ${result.error}`)
      return []
    }
    return result.positions
  } catch (e: any) {
    log(`获取持仓错误: ${e.message}`)
    return []
  }
}

async function getFundingRate(symbol: string): Promise<number> {
  try {
    const currency = symbol.replace('_USDT', '/USDT')
    const url = `https://api-testnet.gateapi.io/api/v4/futures/usdt/funding_rate?currency_pair=${currency}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.rate) {
      return parseFloat(data.rate) * 100 // Convert to percentage
    }
    return 0
  } catch (e: any) {
    log(`获取资金费率失败: ${e.message}`)
    return 0
  }
}

async function openPosition(symbol: string, side: 'buy' | 'sell', size: number): Promise<boolean> {
  try {
    const order = {
      contract: symbol,
      type: side === 'buy' ? 'buy' : 'sell',
      size: String(Math.abs(size)),
    }

    await futuresApi.createFuturesOrder(order)
    log(`开${side === 'buy' ? '多' : '空'}仓: ${symbol} ${size}`)
    return true
  } catch (e: any) {
    const msg = e.response?.body?.message || e.message
    log(`开仓失败: ${msg}`)
    return false
  }
}

async function closePosition(symbol: string, side: 'buy' | 'sell', size: number): Promise<boolean> {
  try {
    const order = {
      contract: symbol,
      type: side === 'buy' ? 'sell' : 'buy', // Opposite to close
      size: String(Math.abs(size)),
    }

    await futuresApi.createFuturesOrder(order)
    log(`平${side === 'buy' ? '多' : '空'}仓: ${symbol} ${size}`)
    return true
  } catch (e: any) {
    const msg = e.response?.body?.message || e.message
    log(`平仓失败: ${msg}`)
    return false
  }
}

async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    const currency = symbol.replace('_USDT', '/USDT')
    const url = `https://api-testnet.gateapi.io/api/v4/futures/usdt/candlesticks?currency_pair=${currency}&interval=1m&limit=1`

    const response = await fetch(url)
    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      return parseFloat(data[0][2])
    }
    return 0
  } catch (e: any) {
    log(`获取价格失败: ${e.message}`)
    return 0
  }
}

// ============ Strategy Check ============
function isActiveStrategy(): boolean {
  try {
    const row = getDb().prepare('SELECT active_strategy FROM settings WHERE id = 1').get() as any
    return row?.active_strategy === MY_STRATEGY
  } catch {
    return true
  }
}

// ============ Arbitrage Logic ============
async function checkFundingArbitrage() {
  const balance = await getFuturesBalance()
  if (!balance || balance.available < CONFIG.hedgeAmount * 10) {
    log(`余额不足，无法进行套利`)
    return
  }

  for (const symbol of CONFIG.symbols) {
    const fundingRate = await getFundingRate(symbol)
    log(`资金费率: ${symbol} = ${fundingRate.toFixed(4)}%`)

    if (fundingRate > CONFIG.fundingThreshold) {
      // 开多空对冲仓位赚取资金费率
      log(`资金费率 > ${CONFIG.fundingThreshold}%, 开启对冲`)

      // Get current positions
      const currentPositions = await getPositions()
      const symbolPos = currentPositions.find(p => p.symbol === symbol)

      if (!symbolPos || symbolPos.size === 0) {
        // Open both long and short
        await openPosition(symbol, 'buy', CONFIG.hedgeAmount)
        await openPosition(symbol, 'sell', CONFIG.hedgeAmount)

        const pos = positions.get(symbol) || { long: 0, short: 0 }
        pos.long += CONFIG.hedgeAmount
        pos.short += CONFIG.hedgeAmount
        positions.set(symbol, pos)

        log(`对冲仓位开启: ${symbol} 多${CONFIG.hedgeAmount} + 空${CONFIG.hedgeAmount}`)
      }
    } else if (fundingRate < -CONFIG.fundingThreshold) {
      // Negative funding rate - do the opposite
      log(`资金费率 < -${CONFIG.fundingThreshold}%, 反向套利`)
      // Similar logic but opposite sides
    }
  }

  // Check if we need to rebalance
  const currentPositions = await getPositions()
  for (const pos of currentPositions) {
    const storedPos = positions.get(pos.symbol)
    if (storedPos) {
      const diff = Math.abs(pos.size - storedPos.long)
      if (diff / storedPos.long > CONFIG.rebalanceThreshold / 100) {
        log(`价差超过 ${CONFIG.rebalanceThreshold}%, 需要重新平衡`)
      }
    }
  }

  // Log status
  log(`状态: 余额=${balance.available.toFixed(2)} USDT, 对冲数=${positions.size}`)
}

// ============ Bot Lifecycle ============
let botInterval: NodeJS.Timeout | null = null

export async function startArbitrageBot() {
  // Check if this strategy is active
  if (!isActiveStrategy()) {
    const row = getDb().prepare('SELECT active_strategy FROM settings WHERE id = 1').get() as any
    log(`[ArbitrageBot] 当前策略是 ${row?.active_strategy || '未知'}，不启动 Arbitrage Bot`)
    return
  }

  log('资金费率套利机器人启动')
  log(`配置: ${CONFIG.symbols.join(', ')}, 阈值=${CONFIG.fundingThreshold}%`)

  // Initial check
  await checkFundingArbitrage()

  // Schedule regular checks
  botInterval = setInterval(async () => {
    // Check if strategy is still active
    if (!isActiveStrategy()) {
      const row = getDb().prepare('SELECT active_strategy FROM settings WHERE id = 1').get() as any
      log(`[ArbitrageBot] 策略已切换到 ${row?.active_strategy || '未知'}，正在停止...`)
      stopArbitrageBot()
      return
    }

    await checkFundingArbitrage()
  }, CONFIG.checkInterval)

  process.on('SIGINT', () => {
    log('关闭套利机器人...')
    if (botInterval) clearInterval(botInterval)
    process.exit(0)
  })
}

export function stopArbitrageBot() {
  if (botInterval) {
    clearInterval(botInterval)
    botInterval = null
  }
  log('套利机器人已停止')
}
