import router from '@adonisjs/core/services/router'

const HealthController = () => import('#controllers/http/health_controller')
const StatusController = () => import('#controllers/http/status_controller')
const TradeController = () => import('#controllers/http/trade_controller')
const PositionController = () => import('#controllers/http/position_controller')
const DashboardController = () => import('#controllers/http/dashboard_controller')
const LogController = () => import('#controllers/http/log_controller')
const BalanceController = () => import('#controllers/http/balance_controller')
const ConfigController = () => import('#controllers/http/config_controller')
const StatsController = () => import('#controllers/http/stats_controller')
const DebugLogController = () => import('#controllers/http/debug_log_controller')
const TradingSettingsController = () => import('#controllers/http/trading_settings_controller')

router.get('/api/test', [HealthController, 'test'])
router.get('/api/status', [StatusController, 'index'])
router.get('/api/trades', [TradeController, 'index'])
router.get('/api/positions', [PositionController, 'index'])
router.get('/api/all', [DashboardController, 'all'])
router.get('/api/logs', [LogController, 'index'])
router.get('/api/balance-history', [BalanceController, 'history'])
router.get('/api/config', [ConfigController, 'index'])
router.get('/api/stats', [StatsController, 'index'])
router.get('/api/debug', [DebugLogController, 'index'])
router.get('/api/trading-settings', [TradingSettingsController, 'index'])
router.put('/api/trading-settings', [TradingSettingsController, 'update'])

// Serve index.html for all other routes
router.get('*', async ({ response }) => {
  const fs = await import('fs')
  const path = await import('path')
  const htmlPath = path.join(process.cwd(), 'index.html')
  if (fs.existsSync(htmlPath)) {
    return response.download(htmlPath)
  }
  return response.notFound()
})
