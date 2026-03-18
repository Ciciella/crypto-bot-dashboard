/**
 * 网格交易机器人
 * 在震荡行情中低买高卖
 * 
 * 原理: 
 * - 设置价格区间 (最低价 ~ 最高价)
 * - 在区间内均匀布置买入单
 * - 价格每上涨一格卖出获利
 * - 价格每下跌一格买入加仓
 */

const { execSync } = require('child_process');

// ============ 配置 ============
const CONFIG = {
  symbol: 'BTC_USDT',
  coin: 'bitcoin',
  
  // 网格参数
  gridCount: 10,             // 网格数量
  priceRangePercent: 10,     // 价格区间百分比 (±5%)
  
  // 交易参数
  baseAmount: 1,             // 每格买入数量 (BTC)
  mode: 'live',
  
  // 止盈止损
  takeProfitPercent: 1,      // 每格获利 1%
  stopLossPercent: 15,       // 整体止损 -15%
  
  // 检查间隔
  checkInterval: 30 * 1000,  // 30秒检查一次
  
  // 风控
  maxPosition: 20,            // 最多持有 20 BTC
  emergencyStop: false       // 紧急停止
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
  console.log(`[网格] [${new Date().toLocaleTimeString()}] ${msg}`);
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

async function getPosition() {
  try {
    const result = await futuresApi.listPositions('usdt');
    const positions = result.body;
    const pos = positions.find(p => p.contract === CONFIG.symbol && p.size && parseFloat(p.size) !== 0);
    if (pos) {
      return {
        size: parseFloat(pos.size),
        entryPrice: parseFloat(pos.entryPrice || pos.price)
      };
    }
    return null;
  } catch (e) {
    log(`❌ 获取持仓失败: ${e.message}`);
    return null;
  }
}

async function openLong(price, amount) {
  try {
    const order = {
      contract: CONFIG.symbol,
      size: amount.toString(),
      price: price.toString(),
      tif: 'gtc'
    };
    await futuresApi.createFuturesOrder('usdt', order);
    log(`✅ 买入: ${amount} BTC @ $${price.toFixed(2)}`);
    return true;
  } catch (e) {
    log(`❌ 买入失败: ${e.message}`);
    return false;
  }
}

async function closeLong(price, amount) {
  try {
    const order = {
      contract: CONFIG.symbol,
      size: (-amount).toString(),
      price: price.toString(),
      tif: 'gtc'
    };
    await futuresApi.createFuturesOrder('usdt', order);
    log(`✅ 卖出: ${amount} BTC @ $${price.toFixed(2)}`);
    return true;
  } catch (e) {
    log(`❌ 卖出失败: ${e.message}`);
    return false;
  }
}

// ============ 网格策略 ============
class GridBot {
  constructor() {
    this.grids = [];           // 网格价格
    this.orders = new Map();  // 挂单记录
    this.position = 0;        // 当前持仓
    this.totalInvested = 0;   // 总投入
    this.totalProfit = 0;     // 总利润
    this.initPrice = 0;        // 初始价格
  }
  
  // 初始化网格
  initGrids(currentPrice) {
    this.initPrice = currentPrice;
    const lowerPrice = currentPrice * (1 - CONFIG.priceRangePercent / 100);
    const upperPrice = currentPrice * (1 + CONFIG.priceRangePercent / 100);
    const gridStep = (upperPrice - lowerPrice) / CONFIG.gridCount;
    
    this.grids = [];
    for (let i = 0; i <= CONFIG.gridCount; i++) {
      this.grids.push({
        price: lowerPrice + i * gridStep,
        bought: false,
        sold: false
      });
    }
    
    log(`📊 网格初始化完成`);
    log(`   区间: $${lowerPrice.toFixed(2)} ~ $${upperPrice.toFixed(2)}`);
    log(`   步长: $${gridStep.toFixed(2)} (${CONFIG.takeProfitPercent}%)`);
    log(`   格数: ${CONFIG.gridCount + 1}`);
  }
  
  // 检查是否需要买入
  async checkBuy(currentPrice) {
    // 遍历网格，找到当前价格以下的第一个未买入格子
    for (let i = 0; i < this.grids.length; i++) {
      const grid = this.grids[i];
      if (!grid.bought && currentPrice <= grid.price) {
        // 检查持仓是否超过上限
        if (this.position >= CONFIG.maxPosition) {
          log(`⚠️ 持仓已达上限 ${CONFIG.maxPosition} BTC，跳过买入`);
          return;
        }
        
        log(`🟢 价格触及网格 $${grid.price.toFixed(2)}，买入 ${CONFIG.baseAmount} BTC`);
        const success = await openLong(grid.price, CONFIG.baseAmount);
        if (success) {
          grid.bought = true;
          this.position += CONFIG.baseAmount;
          this.totalInvested += grid.price * CONFIG.baseAmount;
        }
        return;
      }
    }
  }
  
  // 检查是否需要卖出
  async checkSell(currentPrice) {
    // 遍历网格，找到当前价格以上的第一个已买入未卖出格子
    for (let i = this.grids.length - 1; i >= 0; i--) {
      const grid = this.grids[i];
      if (grid.bought && !grid.sold && currentPrice >= grid.price * (1 + CONFIG.takeProfitPercent / 100)) {
        log(`🔴 价格触及 $${(grid.price * (1 + CONFIG.takeProfitPercent / 100)).toFixed(2)}，卖出 ${CONFIG.baseAmount} BTC`);
        const success = await closeLong(grid.price * (1 + CONFIG.takeProfitPercent / 100), CONFIG.baseAmount);
        if (success) {
          grid.sold = true;
          this.position -= CONFIG.baseAmount;
          const profit = grid.price * CONFIG.takeProfitPercent / 100 * CONFIG.baseAmount;
          this.totalProfit += profit;
        }
        return;
      }
    }
  }
  
  // 检查整体止损
  async checkStopLoss(currentPrice) {
    if (this.totalInvested === 0) return;
    
    const pnlPercent = (this.totalProfit / this.totalInvested) * 100;
    if (pnlPercent <= -CONFIG.stopLossPercent) {
      log(`🛑 触发整体止损: ${pnlPercent.toFixed(2)}% <= -${CONFIG.stopLossPercent}%`);
      CONFIG.emergencyStop = true;
    }
  }
  
  // 打印状态
  printStatus(currentPrice) {
    const boughtCount = this.grids.filter(g => g.bought).length;
    const soldCount = this.grids.filter(g => g.sold).length;
    const pnlPercent = this.totalInvested > 0 ? (this.totalProfit / this.totalInvested * 100).toFixed(2) : '0.00';
    
    log(`📊 状态: 持仓 ${this.position} BTC | 买入 ${boughtCount} 格 | 卖出 ${soldCount} 格 | 利润 $${this.totalProfit.toFixed(2)} (${pnlPercent}%)`);
  }
}

// ============ 主循环 ============
const gridBot = new GridBot();

async function tradeCycle() {
  log('='.repeat(40));
  
  if (CONFIG.emergencyStop) {
    log(`🛑 策略已停止`);
    return;
  }
  
  try {
    const currentPrice = getCurrentPrice(CONFIG.coin);
    const [balance, position] = await Promise.all([
      getBalance(),
      getPosition()
    ]);
    
    if (!currentPrice) {
      log('❌ 无法获取价格');
      return;
    }
    
    log(`💰 价格: $${currentPrice.toLocaleString()} | 余额: ${balance?.available?.toFixed(2)} USDT`);
    
    // 初始化网格 (只执行一次)
    if (gridBot.grids.length === 0) {
      gridBot.initGrids(currentPrice);
    }
    
    // 检查买入
    await gridBot.checkBuy(currentPrice);
    
    // 检查卖出
    await gridBot.checkSell(currentPrice);
    
    // 检查止损
    await gridBot.checkStopLoss(currentPrice);
    
    // 打印状态
    gridBot.printStatus(currentPrice);
    
  } catch (e) {
    log(`❌ 错误: ${e.message}`);
  }
}

// ============ 启动 ============
const isOnceMode = process.argv.includes('--once');

log('🤖 网格交易机器人启动');
log(`📋 网格数: ${CONFIG.gridCount}, 区间: ±${CONFIG.priceRangePercent / 2}%`);
log(`💰 每格获利: ${CONFIG.takeProfitPercent}%, 止损: -${CONFIG.stopLossPercent}%`);

if (isOnceMode) {
  tradeCycle().then(() => process.exit(0));
} else {
  tradeCycle();
  setInterval(tradeCycle, CONFIG.checkInterval);
}
