import { BaseCommand } from '@adonisjs/core/ace'
import { startArbitrageBot, stopArbitrageBot } from '#services/arbitrage_bot'

export default class ArbitrageBotCommand extends BaseCommand {
  static commandName = 'arbitrage:bot'
  static description = 'Run the arbitrage trading bot'

  async run() {
    this.logger.info('Starting arbitrage trading bot...')

    try {
      await startArbitrageBot()
    } catch (error: any) {
      this.logger.error(`Bot error: ${error.message}`)
    }

    // Keep the process running
    process.on('SIGINT', () => {
      this.logger.info('Shutting down arbitrage bot...')
      stopArbitrageBot()
      process.exit(0)
    })
  }
}
