import type { HttpContext } from '@adonisjs/core/http'
import { all, get } from '#services/database'

export default class DashboardController {
  async all({ response }: HttpContext) {
    const trades = all('SELECT * FROM trades ORDER BY timestamp DESC LIMIT 50')
    const latestLog = get('SELECT * FROM check_logs ORDER BY id DESC LIMIT 1')

    return response.json({
      status: latestLog ? 'online' : 'offline',
      balance: latestLog ? {
        total: latestLog.balance_total,
        available: latestLog.balance_available
      } : null,
      positions: [],
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
      lastUpdate: latestLog ? new Date(latestLog.timestamp).getTime() : 0
    })
  }
}
