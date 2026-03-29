import type { HttpContext } from '@adonisjs/core/http'
import { all } from '#services/database'

export default class BalanceController {
  async history({ request, response }: HttpContext) {
    const days = request.qs().days ? parseInt(request.qs().days) : 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const logs = all('SELECT * FROM check_logs WHERE timestamp >= ? ORDER BY id ASC', [since])

    // Group by hour
    const hourlyData: Record<string, any> = {}
    logs.forEach((log: any) => {
      const date = new Date(log.timestamp)
      const hour = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString()
      if (!hourlyData[hour] || (log.balance_total && log.balance_total > hourlyData[hour].balance_total)) {
        hourlyData[hour] = {
          timestamp: hour,
          balance_total: log.balance_total,
          balance_available: log.balance_available
        }
      }
    })

    const history = Object.values(hourlyData).sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return response.json({
      success: true,
      history
    })
  }
}
