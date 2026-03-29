/**
 * Reset Data Command
 * Run: npm run reset:data
 * 
 * Clears all trading logs and records from the database.
 */

import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { all, get, run } from '../app/services/database.js'

const TABLES = ['trades', 'check_logs', 'debug_logs', 'heartbeat']

function getCounts(db: DatabaseSync): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const table of TABLES) {
    try {
      const result = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }
      counts[table] = result.c
    } catch {
      counts[table] = 0
    }
  }
  return counts
}

async function main() {
  const dbPath = path.join(process.cwd(), 'trading.db')
  const db = new DatabaseSync(dbPath)

  console.log('='.repeat(50))
  console.log('[ResetData] 重置交易数据')
  console.log('='.repeat(50))

  // Show current counts
  const counts = getCounts(db)
  console.log('\n当前数据统计:')
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count} 条记录`)
  }
  console.log('')

  // Calculate totals
  const totalTrades = counts.trades
  let totalPnl = 0
  try {
    const pnlResult = db.prepare('SELECT SUM(pnl) as p FROM trades WHERE pnl IS NOT NULL').get() as { p: number | null }
    totalPnl = pnlResult.p ?? 0
  } catch {}

  if (totalTrades > 0) {
    console.log(`累计交易: ${totalTrades} 笔, 总盈亏: ${totalPnl.toFixed(4)} USDT`)
    console.log('')
  }

  // Ask for confirmation
  process.stdout.write('确定要清空所有数据吗？此操作不可恢复。\n请输入 "yes" 确认: ')
  
  const answer = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase())
    })
  })

  if (answer !== 'yes') {
    console.log('\n[ResetData] 已取消操作')
    db.close()
    process.exit(0)
    return
  }

  // Clear all tables
  console.log('\n正在清空数据...')
  for (const table of TABLES) {
    try {
      db.prepare(`DELETE FROM ${table}`).run()
      console.log(`  ✓ ${table} 已清空`)
    } catch (e: any) {
      console.log(`  ✗ ${table} 清空失败: ${e.message}`)
    }
  }

  // Reset auto-increment (optional, for cleanliness)
  for (const table of TABLES) {
    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name='${table}'`).run()
    } catch {
      // Ignore if sequence table doesn't exist
    }
  }

  console.log('\n[ResetData] 数据重置完成!')
  db.close()
}

main().catch((e) => {
  console.error('[ResetData] 错误:', e.message)
  process.exit(1)
})
