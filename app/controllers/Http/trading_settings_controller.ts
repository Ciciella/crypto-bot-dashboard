import type { HttpContext } from '@adonisjs/core/http'
import fs from 'fs'
import path from 'path'

const SETTINGS_PATH = path.join(process.cwd(), 'trading-settings.json')
const MAX_LEVERAGE = 100

export default class TradingSettingsController {
  async index({ response }: HttpContext) {
    try {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
      return response.json({ success: true, settings })
    } catch (e: any) {
      return response.json({ success: false, error: e.message })
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const body = await request.body()
      let leverage = parseInt(body.leverage)
      let warning = null

      if (isNaN(leverage) || leverage < 1) {
        return response.status(400).json({
          success: false,
          error: '杠杆倍数必须大于等于1'
        })
      }

      // Cap at safe maximum
      if (leverage > MAX_LEVERAGE) {
        warning = `杠杆已限制在安全值 ${MAX_LEVERAGE}x（原始请求: ${leverage}x）`
        leverage = MAX_LEVERAGE
      }

      const settings = {
        leverage,
        updatedAt: new Date().toISOString()
      }

      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))

      const result: any = { success: true, settings }
      if (warning) result.warning = warning
      return response.json(result)
    } catch (e: any) {
      return response.status(500).json({ success: false, error: e.message })
    }
  }
}
