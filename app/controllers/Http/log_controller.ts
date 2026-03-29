import type { HttpContext } from '@adonisjs/core/http'
import { all } from '#services/database'

export default class LogController {
  async index({ request, response }: HttpContext) {
    const limit = request.qs().limit ? parseInt(request.qs().limit) : 50

    const logs = all(`SELECT * FROM check_logs ORDER BY id DESC LIMIT ?`, [limit])

    return response.json({
      success: true,
      logs: logs.map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        price: log.price,
        rsi: log.rsi,
        ma10: log.ma10,
        ma20: log.ma20,
        ma50: log.ma50,
        macd_hist: log.macd_hist,
        trend: log.trend,
        signal_buy: log.signal_buy,
        signal_sell: log.signal_sell,
        action: log.action,
        pnl_percent: log.pnl_percent,
        position_size: log.position_size,
        signal_reason: log.signal_reason
      }))
    })
  }
}
