import type { HttpContext } from '@adonisjs/core/http'
import { get } from '#services/database'

export default class StatusController {
  async index({ response }: HttpContext) {
    // 从数据库获取最后更新时间来判断bot状态
    const lastLog = get('SELECT timestamp FROM check_logs ORDER BY id DESC LIMIT 1')

    const lastUpdate = lastLog ? new Date(lastLog.timestamp).getTime() : 0
    const now = Date.now()
    const isOnline = lastUpdate > 0 && (now - lastUpdate) < 5 * 60 * 1000 // 5分钟内有心跳则认为在线

    return response.json({
      status: isOnline ? 'online' : 'offline',
      bot: 'trend-bot',
      lastUpdate: lastUpdate
    })
  }
}
