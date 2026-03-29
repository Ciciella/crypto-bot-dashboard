import type { HttpContext } from '@adonisjs/core/http'
import { getDb } from '../../services/database.js'

const VALID_STRATEGIES = ['trend', 'grid', 'arbitrage']

function ensureSettingsTable(db: ReturnType<typeof getDb>) {
  // Create settings table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      leverage INTEGER NOT NULL DEFAULT 10,
      active_strategy TEXT NOT NULL DEFAULT 'trend',
      updated_at TEXT NOT NULL
    )
  `)

  // Add active_strategy column if it doesn't exist (for existing databases without the column)
  try {
    db.exec("ALTER TABLE settings ADD COLUMN active_strategy TEXT NOT NULL DEFAULT 'trend'")
  } catch {
    // Column may already exist
  }

  // Initialize row if not exists
  const existing = db.prepare('SELECT id FROM settings WHERE id = 1').get()
  if (!existing) {
    db.prepare('INSERT INTO settings (id, leverage, active_strategy, updated_at) VALUES (1, 10, ?, ?)').run('trend', new Date().toISOString())
  }
}

export default class StrategyController {
  async index({ response }: HttpContext) {
    try {
      const db = getDb()
      ensureSettingsTable(db)

      const row = db.prepare('SELECT active_strategy FROM settings WHERE id = 1').get() as any
      return response.json({
        success: true,
        strategy: row?.active_strategy || 'trend'
      })
    } catch (e: any) {
      return response.json({ success: false, error: e.message })
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const body = await request.body()
      const strategy = body.strategy

      if (!VALID_STRATEGIES.includes(strategy)) {
        return response.status(400).json({
          success: false,
          error: `无效的策略: ${strategy}。可选: ${VALID_STRATEGIES.join(', ')}`
        })
      }

      const db = getDb()
      ensureSettingsTable(db)

      db.prepare('UPDATE settings SET active_strategy = ?, updated_at = ? WHERE id = 1').run(strategy, new Date().toISOString())

      return response.json({
        success: true,
        strategy
      })
    } catch (e: any) {
      return response.status(500).json({ success: false, error: e.message })
    }
  }
}
