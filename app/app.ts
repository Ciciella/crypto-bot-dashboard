import { ApplicationService } from '@adonisjs/core/types'
import { startTrendBot, stopTrendBot } from '#services/trend_bot'

export default class App {
  public onStart?: () => void | Promise<void>

  constructor(protected app: ApplicationService) {}

  async boot() {}

  async start() {
    // Auto-start trading bot if configured
    const autoStartBot = process.env.AUTO_START_BOT
    if (autoStartBot) {
      console.log(`[App] Auto-starting ${autoStartBot} bot...`)
      switch (autoStartBot) {
        case 'trend':
          await startTrendBot()
          break
        default:
          console.log(`[App] Unknown bot type: ${autoStartBot}`)
      }
    }

    if (this.onStart) {
      await this.onStart()
    }
  }

  async ready() {}

  async shutdown() {
    console.log('[App] Shutting down...')
    stopTrendBot()
  }
}
