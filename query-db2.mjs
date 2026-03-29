import Database from 'better-sqlite3';
const db = new Database('trading.db');

// Heartbeat uptime
const heartbeats = db.prepare('SELECT COUNT(*) as c FROM heartbeat WHERE status=?').get('alive');
const lastHeartbeat = db.prepare('SELECT timestamp, price, position_size, balance_available, pnl_percent FROM heartbeat ORDER BY id DESC LIMIT 1').get();
const firstHeartbeat = db.prepare('SELECT timestamp FROM heartbeat ORDER BY id ASC LIMIT 1').get();
const totalChecks = db.prepare('SELECT COUNT(*) as c FROM check_logs').get();

// Recent PnL by day
const pnlByDay = db.prepare(`
  SELECT DATE(timestamp) as day, SUM(pnl) as pnl, COUNT(*) as trades
  FROM trades WHERE pnl IS NOT NULL AND pnl != 0
  GROUP BY DATE(timestamp)
  ORDER BY day DESC LIMIT 10
`).all();

console.log('=== 运行时统计 ===');
console.log('心跳次数:', heartbeats.c);
console.log('运行时长:', firstHeartbeat ? `${Math.round((new Date(lastHeartbeat.timestamp).getTime() - new Date(firstHeartbeat.timestamp).getTime()) / 86400000)} 天` : 'N/A');
console.log('技术检查次数:', totalChecks.c);
console.log('\n=== 当前状态 ===');
console.log('价格:', lastHeartbeat.price);
console.log('持仓:', lastHeartbeat.position_size, 'BTC');
console.log('可用余额:', lastHeartbeat.balance_available, 'USDT');
console.log('持仓盈亏:', lastHeartbeat.pnl_percent ? `${lastHeartbeat.pnl_percent.toFixed(2)}%` : 'N/A');
console.log('\n=== 每日盈亏 (最近10天) ===');
pnlByDay.forEach(d => {
  console.log(`${d.day}: ${d.pnl?.toFixed(4) || 0} USDT (${d.trades}笔)`);
});

db.close();
