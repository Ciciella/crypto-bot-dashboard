import type { HttpContext } from '@adonisjs/core/http'
import { all, get } from '#services/database'
import { fetchPositionsAndBalance } from '#services/gate_api'

export default class TradeController {
  async index({ response }: HttpContext) {
    const trades = all('SELECT * FROM trades ORDER BY timestamp DESC LIMIT 50')

    const latestLog = get('SELECT * FROM check_logs ORDER BY id DESC LIMIT 1')

    // 获取实时持仓
    const gateResult = await fetchPositionsAndBalance()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayTrades = trades.filter((t: any) => new Date(t.timestamp) >= today)

    const totalPnl = gateResult.balance?.unrealisedPnl || latestLog?.balance_total || 0
    const todayPnl = todayTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)

    return response.json({
      trades: trades.map((t: any) => ({
        id: t.id,
        type: t.type,
        side: t.side,
        amount: t.amount,
        price: t.price,
        strategy: t.strategy || 'trend-bot',
        reason: t.reason || '-',
        timestamp: t.timestamp,
        pnl: t.pnl || 0
      })),
      positions: gateResult.positions,
      stats: {
        totalTrades: trades.length,
        todayTrades: todayTrades.length,
        totalPnl: totalPnl,
        todayPnl: todayPnl
      },
      error: gateResult.error
    })
  }
}
