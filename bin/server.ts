/**
 * Dashboard API Server
 * Simple HTTP server with AdonisJS-style controllers
 * 
 * Run: npm run dev
 */

import 'dotenv/config'
import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startTrendBot } from '../app/services/trend_bot.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = Number(process.env.PORT) || 3000

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

// Read request body
function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

// Helper: create controller instance and call method
async function callController(ctrlPath: string, method: string, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const bodyStr = await readRequestBody(req)
  let body = {}
  try { body = JSON.parse(bodyStr) } catch {}

  const ctx = {
    request: {
      url: () => req.url,
      method: () => req.method,
      qs: () => Object.fromEntries(url.searchParams),
      body: () => Promise.resolve(body),
      input: (key: string) => url.searchParams.get(key) || '',
      all: () => body,
    },
    response: {
      json: (data: any) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(data))
      },
      status: (code: number) => ({
        json: (data: any) => {
          res.writeHead(code, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(data))
        }
      }),
      notFound: () => {
        res.writeHead(404)
        res.end('Not Found')
      },
      download: async (filePath: string) => {
        try {
          const content = await readFile(filePath)
          res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] || 'text/html' })
          res.end(content)
        } catch {
          res.writeHead(404)
          res.end('Not Found')
        }
      },
    }
  }

  const mod = await import(ctrlPath)
  const CtrlClass = mod.default
  const instance = new CtrlClass()
  await instance[method](ctx)
}

// Route definitions: [method, path, controllerPath, methodName]
const routes: [string, string, string, string][] = [
  ['GET', '/api/test', '#controllers/http/health_controller', 'test'],
  ['GET', '/api/status', '#controllers/http/status_controller', 'index'],
  ['GET', '/api/trades', '#controllers/http/trade_controller', 'index'],
  ['GET', '/api/positions', '#controllers/http/position_controller', 'index'],
  ['GET', '/api/all', '#controllers/http/dashboard_controller', 'all'],
  ['GET', '/api/logs', '#controllers/http/log_controller', 'index'],
  ['GET', '/api/balance-history', '#controllers/http/balance_controller', 'history'],
  ['GET', '/api/config', '#controllers/http/config_controller', 'index'],
  ['GET', '/api/stats', '#controllers/http/stats_controller', 'index'],
  ['GET', '/api/debug', '#controllers/http/debug_log_controller', 'index'],
  ['GET', '/api/trading-settings', '#controllers/http/trading_settings_controller', 'index'],
  ['PUT', '/api/trading-settings', '#controllers/http/trading_settings_controller', 'update'],
]

// Resolve # to absolute path
function resolveCtrlPath(path: string): string {
  if (path.startsWith('#controllers')) {
    return path.replace('#controllers', '../app/controllers')
  }
  return path
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  // CORS
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value))
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`)
    const pathname = url.pathname
    const method = req.method?.toUpperCase() || 'GET'

    // Static files (not API)
    if (method === 'GET' && !pathname.startsWith('/api')) {
      const filePath = join(__dirname, '..', pathname === '/' ? 'index.html' : pathname)
      try {
        const content = await readFile(filePath)
        res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] || 'text/plain' })
        res.end(content)
        return
      } catch { /* fall through */ }
    }

    // Find matching route
    const route = routes.find(([m, p]) => m === method && p === pathname)
    if (route) {
      const [, , ctrlPath, methodName] = route
      await callController(resolveCtrlPath(ctrlPath), methodName, req, res)
      return
    }

    res.writeHead(404)
    res.end('Not Found')
  } catch (error: any) {
    console.error('Request error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: error.message }))
  }
}

// Start TrendBot
startTrendBot()

const server = createServer(handleRequest)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dashboard API running: http://localhost:${PORT}`)
  console.log(`   - GET /              (Dashboard)`)
  console.log(`   - GET /api/test      (Health Check)`)
  console.log(`   - GET /api/status    (Bot Status)`)
  console.log(`   - GET /api/trades    (Trade History)`)
  console.log(`   - GET /api/positions (Current Positions)`)
  console.log(`   - GET /api/all       (Dashboard Data)`)
  console.log(`   - GET /api/logs`)
  console.log(`   - GET /api/balance-history`)
  console.log(`   - GET /api/config`)
  console.log(`   - GET /api/stats`)
  console.log(`   - GET /api/debug`)
  console.log(`   - GET/PUT /api/trading-settings`)
})
