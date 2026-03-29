import type { HttpContext } from '@adonisjs/core/http'
import { get, all } from '#services/database'

export default class StatsController {
  async index({ response }: HttpContext) {
    const totalLogs = get('SELECT COUNT(*) as count FROM check_logs')
    const total = totalLogs?.count || 0

    const tradeLogs = get("SELECT COUNT(*) as count FROM check_logs WHERE action != 'none'")
    const trades = tradeLogs?.count || 0

    const lastCheck = get('SELECT timestamp, price, signal_buy, signal_sell FROM check_logs ORDER BY id DESC LIMIT 1')

    return response.json({
      success: true,
      totalChecks: total,
      totalTrades: trades,
      lastCheck: lastCheck ? {
        timestamp: lastCheck.timestamp,
        price: lastCheck.price,
        signal_buy: lastCheck.signal_buy,
        signal_sell: lastCheck.signal_sell
      } : null
    })
  }
}
