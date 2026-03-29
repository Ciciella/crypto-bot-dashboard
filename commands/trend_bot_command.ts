/**
 * Trend Trading Bot Entry Point
 * Run: npm run trend:bot
 */

import 'dotenv/config'
import { startTrendBot, stopTrendBot } from '../app/services/trend_bot.js'

console.log('[TrendBot] 启动中...')

startTrendBot().catch((error) => {
  console.error('[TrendBot] 启动失败:', error.message)
  process.exit(1)
})

// Keep process running
process.on('SIGINT', () => {
  console.log('[TrendBot] 收到 SIGINT，正在关闭...')
  stopTrendBot()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('[TrendBot] 收到 SIGTERM，正在关闭...')
  stopTrendBot()
  process.exit(0)
})
