import { DatabaseSync } from 'node:sqlite'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'trading.db')

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH)
  }
  return db
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

// Helper to run a query and return all rows
export function all<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDb()
  const stmt = database.prepare(sql)
  return stmt.all(...params) as T[]
}

// Helper to run a query and return first row
export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const database = getDb()
  const stmt = database.prepare(sql)
  return stmt.get(...params) as T | undefined
}

// Helper to run a query and return run result
export function run(sql: string, params: any[] = []): { changes: number, lastInsertRowid: number | bigint } {
  const database = getDb()
  const stmt = database.prepare(sql)
  return stmt.run(...params)
}
