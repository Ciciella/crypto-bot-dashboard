import type { HttpContext } from '@adonisjs/core/http'

export default class HealthController {
  async test({ response }: HttpContext) {
    return response.json({
      success: true,
      message: '内网穿透访问成功！',
      timestamp: new Date().toISOString(),
      server: 'open-fortune-claw'
    })
  }
}
