import 'dotenv/config'
import { ApiClient, FuturesApi } from 'gate-api'

// Gate.io API configuration using environment variables
const config = {
  apiKey: process.env.GATE_TESTNET_API_KEY || process.env.GATE_API_KEY || '',
  apiSecret: process.env.GATE_TESTNET_API_SECRET || process.env.GATE_API_SECRET || '',
  basePath: 'https://api-testnet.gateapi.io/api/v4'
}

const client = new ApiClient()
client.basePath = config.basePath
client.setApiKeySecret(config.apiKey, config.apiSecret)

const futuresApi = new FuturesApi(client)

export interface Position {
  symbol: string
  side: 'long' | 'short'
  amount: number
  entry_price: number
  current_price: number
  pnl: number
  leverage: number
  updated_at: string
}

export interface Balance {
  total: number
  available: number
  unrealisedPnl: number
}

export interface GateApiResult {
  positions: Position[]
  balance: Balance | null
  error?: string
}

export async function fetchPositionsAndBalance(): Promise<GateApiResult> {
  try {
    // 获取持仓
    const positionsResult = await futuresApi.listPositions('usdt')
    const posList = Array.isArray(positionsResult.body) ? positionsResult.body : []

    const positions: Position[] = posList
      .filter((p: any) => parseFloat(String(p.size)) !== 0)
      .map((p: any) => ({
        symbol: String(p.contract),
        side: parseFloat(String(p.size)) > 0 ? 'long' : 'short',
        amount: Math.abs(parseFloat(String(p.size))),
        entry_price: parseFloat(String(p.entryPrice)),
        current_price: parseFloat(String(p.markPrice)),
        pnl: parseFloat(String(p.unrealisedPnl)),
        leverage: p.leverage || 20,
        updated_at: new Date().toISOString()
      }))

    // 获取账户余额
    const accounts = await futuresApi.listFuturesAccounts('usdt')
    const balance: Balance = {
      total: parseFloat(String(accounts.body.total || '0')),
      available: parseFloat(String(accounts.body.available || '0')),
      unrealisedPnl: parseFloat(String(accounts.body.unrealisedPnl || '0'))
    }

    return { positions, balance }
  } catch (e: any) {
    const errorMsg = e.response?.body?.message || e.message || '获取持仓失败'
    console.error('Gate.io API 错误:', errorMsg)
    return {
      positions: [],
      balance: null,
      error: errorMsg
    }
  }
}

export { futuresApi }
