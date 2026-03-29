import type { HttpContext } from '@adonisjs/core/http'
import { fetchPositionsAndBalance } from '#services/gate_api'

export default class PositionController {
  async index({ response }: HttpContext) {
    const result = await fetchPositionsAndBalance()

    return response.json({
      positions: result.positions,
      balance: result.balance,
      error: result.error
    })
  }
}
