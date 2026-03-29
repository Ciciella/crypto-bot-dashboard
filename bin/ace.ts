import { Ignitor } from '@adonisjs/core'

new Ignitor(import.meta.url)
  .ace()
  .handle(process.argv.slice(2))
