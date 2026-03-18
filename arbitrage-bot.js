/**
 * 资金费率套利机器人
 * 
 * 原理:
 * - 在不同交易所或同一交易所多空对冲
 * - 赚取资金费率 (Funding Rate)
 * - 同时做多和做空，锁定价差收益
 * 
 * 注意: 这是简化版本，实际套利需要更多风控
 */

const { execSync } = require('child_process');

// ============ 配置 ============
const CONFIG = {
  symbols: ['BTC_USDT', 'ETH_USDT'],  // 交易对
  
  // 交易参数
  hedgeAmount: 1,              // 对冲数量 (BTC/ETH)
  mode: 'live',
  
  // 风控
  fundingThreshold: 0.01,     // 资金费率 > 0.01% 才开仓
  maxPosition: 10,            // 最大持仓
  rebalanceThreshold: 2,     // 价差超过 2% 时重新平衡
  
  // 检查间隔
  checkInterval: 60 * 1000,  // 1分钟检查一次
  
  // 交易所 (目前只支持 Gate 测试网)
  exchanges: ['gate']
};

// ============ Gate.io API ============
const GateApi = require('gate-api');
const { gateio } = require('./secrets');
const apiClient = new GateApi.ApiClient();
apiClient.basePath = gateio.basePath;
apiClient.setApiKeySecret(gateio.apiKey, gateio.apiSecret);
const futuresApi = new GateApi.FuturesApi(apiClient);

// ============ 工具函数 ============
function log(msg) {
  console.log(`[套利] [${new Date().toLocaleTimeString()}] ${msg}`);
}

function exec(cmd) {
  return JSON.parse(execSync(cmd, { encoding: 'utf8', timeout: 20000 }));
}

function getCurrentPrice(coin) {
  const data = exec(`node skills/crypto-market-data/scripts/get_crypto_price.js ${coin}`);
  return data[coin]?.usd;
}

async function getBalance() {
  try {
    const result = await futuresApi.listFuturesAccounts('usdt');
    const data = result.body;
    return {
      total: parseFloat(data.total || 0),
      available: parseFloat(data.available || 0)
    };
  } catch (e) {
    log(`❌ 获取余额失败: ${e.message}`);
    return null;
  }
}

// 获取持仓
async function getPositions(symbol) {
  try {
    const result = await futuresApi.listPositions('usdt');
    const positions = result.body;
    const pos = positions.find(p => p.contract === symbol && p.size && parseFloat(p.size) !== 0);
    if (pos) {
      return {
        size: parseFloat(pos.size),
        entryPrice: parseFloat(pos.entryPrice || pos.price)
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 获取资金费率 (Gate API)
async function getFundingRate(symbol) {
  try {
    // Gate 的资金费率接口
    const result = await futuresApi.listFuturesTickers(symbol);
    const ticker = result.body[0];
    if (ticker) {
      return {
        fundingRate: parseFloat(ticker.funding_rate || 0) * 100, // 转为百分比
        fundingTime: parseInt(ticker.funding_next_time || 0)
      };
    }
    return { fundingRate: 0, fundingTime: 0 };
  } catch (e) {
    log(`⚠️ 获取资金费率失败: ${e.message}`);
    return { fundingRate: 0, fundingTime: 0 };
  }
}

// 开仓
async function openPosition(symbol, side, price, amount) {
  try {
    const size = side === 'long' ? amount.toString() : (-amount).toString();
    const order = {
      contract: symbol,
      size: size,
      price: price.toString(),
      tif: 'gtc'
    };
    await futuresApi.createFuturesOrder('usdt', order);
    log(`✅ ${side === 'long' ? '做多' : '做空'} ${symbol}: ${amount} @ $${price.toFixed(2)}`);
    return true;
  } catch (e) {
    log(`❌ 开仓失败: ${e.message}`);
    return false;
  }
}

// 平仓
async function closePosition(symbol, side, price, amount) {
  try {
    const size = side === 'long' ? (-amount).toString() : amount.toString();
    const order = {
      contract: symbol,
      size: size,
      price: price.toString(),
      tif: 'gtc'
    };
    await futuresApi.createFuturesOrder('usdt', order);
    log(`✅ 平仓 ${symbol}: ${amount} @ $${price.toFixed(2)}`);
    return true;
  } catch (e) {
    log(`❌ 平仓失败: ${e.message}`);
    return false;
  }
}

// ============ 套利策略 ============
class ArbitrageBot {
  constructor() {
    this.positions = {};      // 当前持仓
    this.totalFundingEarned = 0;  // 累计资金费率收益
    this.lastFundingCheck = 0;   // 上次检查资金费率时间
  }
  
  // 初始化
  async init() {
    log('📊 检查当前持仓状态...');
    for (const symbol of CONFIG.symbols) {
      const pos = await getPositions(symbol);
      this.positions[symbol] = pos || { size: 0, entryPrice: 0 };
    }
  }
  
  // 检查资金费率
  async checkFundingRates() {
    const now = Date.now();
    // 每8小时检查一次资金费率 (资金结算周期)
    if (now - this.lastFundingCheck < 8 * 60 * 60 * 1000) {
      return;
    }
    
    this.lastFundingCheck = now;
    
    for (const symbol of CONFIG.symbols) {
      const funding = await getFundingRate(symbol);
      const rate = funding.fundingRate;
      
      log(`💰 ${symbol} 资金费率: ${rate.toFixed(4)}%`);
      
      // 如果资金费率为正 (多头付钱给空头)，做多赚取费率
      if (rate > CONFIG.fundingThreshold) {
        log(`🟢 资金费率有利，做多 ${symbol}`);
        // 实际逻辑: 需要同时开多空仓位锁定价差
        // 这里简化: 只做多赚费率
      }
      
      // 如果资金费率为负 (空头付钱给多头)，做空赚取费率
      if (rate < -CONFIG.fundingThreshold) {
        log(`🔴 资金费率有利，做空 ${symbol}`);
      }
    }
  }
  
  // 打印状态
  printStatus(currentPrices) {
    log('📊 当前状态:');
    for (const symbol of CONFIG.symbols) {
      const pos = this.positions[symbol];
      const price = currentPrices[symbol.replace('_USDT', '')];
      log(`   ${symbol}: 持仓 ${pos?.size || 0} @ $${price?.toFixed(2) || 'N/A'}`);
    }
    log(`   累计资金费率收益: $${this.totalFundingEarned.toFixed(2)}`);
  }
}

// ============ 主循环 ============
const arbBot = new ArbitrageBot();

async function tradeCycle() {
  log('='.repeat(40));
  
  try {
    // 获取价格
    const prices = {};
    for (const symbol of CONFIG.symbols) {
      const coin = symbol.replace('_USDT', '').toLowerCase();
      if (coin === 'btc') coin = 'bitcoin';
      if (coin === 'eth') coin = 'ethereum';
      prices[symbol] = getCurrentPrice(coin);
    }
    
    const [balance] = await Promise.all([getBalance()]);
    
    log(`💰 余额: ${balance?.available?.toFixed(2)} USDT`);
    
    // 检查资金费率
    await arbBot.checkFundingRates();
    
    // 打印状态
    arbBot.printStatus(prices);
    
    // 策略说明
    log('📝 策略说明:');
    log('   1. 资金费率套利需要多空同时开仓锁定价差');
    log('   2. 简化版: 监控资金费率，在有利时手动开仓');
    log('   3. 实际套利需对接多家交易所 API');
    
  } catch (e) {
    log(`❌ 错误: ${e.message}`);
  }
}

// ============ 启动 ============
log('🤖 资金费率套利机器人启动');
log(`📋 交易对: ${CONFIG.symbols.join(', ')}`);
log(`💰 资金费率阈值: >${CONFIG.fundingThreshold}%`);

// 初始化
arbBot.init().then(() => {
  const isOnceMode = process.argv.includes('--once');
  
  if (isOnceMode) {
    tradeCycle().then(() => process.exit(0));
  } else {
    tradeCycle();
    setInterval(tradeCycle, CONFIG.checkInterval);
  }
});
