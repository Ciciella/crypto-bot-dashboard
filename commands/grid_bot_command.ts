import { BaseCommand } from '@adonisjs/core/ace'
import { startGridBot, stopGridBot } from '#services/grid_bot'

export default class GridBotCommand extends BaseCommand {
  static commandName = 'grid:bot'
  static description = 'Run the grid trading bot'

  async run() {
    this.logger.info('Starting grid trading bot...')

    try {
      await startGridBot()
    } catch (error: any) {
      this.logger.error(`Bot error: ${error.message}`)
    }

    // Keep the process running
    process.on('SIGINT', () => {
      this.logger.info('Shutting down grid bot...')
      stopGridBot()
      process.exit(0)
    })
  }
}
