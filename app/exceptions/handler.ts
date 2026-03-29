import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

export default class ExceptionHandler_ extends ExceptionHandler {
  constructor() {
    super(console)
  }

  async handle(error: any, ctx: HttpContext) {
    if (error.status === 404) {
      return ctx.response.notFound({ error: error.message })
    }

    return ctx.response.internalServerError({ error: error.message })
  }

  async report(error: any, ctx: HttpContext) {
    console.error(error)
  }
}
