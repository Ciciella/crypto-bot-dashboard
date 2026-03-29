import type { HttpContext } from '@adonisjs/core/http'

export default class ConfigController {
  async index({ response }: HttpContext) {
    const config = {
      symbol: 'BTC_USDT',
      mode: 'live',
      timeframe: '15m + 1h',
      baseTradeAmount: 5,
      maxPositions: 3,
      takeProfitPercent: 3,
      stopLossPercent: 2,
      rsiPeriod: 14,
      rsiOversold: 40,
      rsiOverbought: 70,
      maShort: 10,
      maLong: 20,
      checkIntervalWithPosition: 30,
      checkIntervalWithoutPosition: 5,
      confirmRequired: 1,
      cooldownMinutes: 15
    }

    return response.json({
      success: true,
      config
    })
  }
}
