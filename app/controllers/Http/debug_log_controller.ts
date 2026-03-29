import type { HttpContext } from '@adonisjs/core/http'
import { all } from '#services/database'

export default class DebugLogController {
  async index({ request, response }: HttpContext) {
    const limit = request.qs().limit ? parseInt(request.qs().limit) : 50
    const level = request.qs().level
    const category = request.qs().category

    let sql = 'SELECT * FROM debug_logs ORDER BY id DESC LIMIT ?'
    const params: any[] = [limit]

    if (level || category) {
      const conditions: string[] = []
      if (level) { conditions.push('level = ?'); params.push(level) }
      if (category) { conditions.push('category = ?'); params.push(category) }
      sql = 'SELECT * FROM debug_logs WHERE ' + conditions.join(' AND ') + ' ORDER BY id DESC LIMIT ?'
    }

    const logs = all(sql, params)

    return response.json({
      success: true,
      logs: logs.map((log: any) => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        category: log.category,
        message: log.message,
        details: log.details
      }))
    })
  }
}
