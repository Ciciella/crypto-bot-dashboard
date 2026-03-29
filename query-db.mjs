import Database from 'better-sqlite3';
const db = new Database('trading.db');

const stats = db.prepare('SELECT COUNT(*) as c FROM trades').get();
const pnl = db.prepare('SELECT SUM(pnl) as p FROM trades').get();
const openLongs = db.prepare('SELECT COUNT(*) as c FROM trades WHERE side=? AND type=?').get('long', 'open');
const closes = db.prepare('SELECT COUNT(*) as c FROM trades WHERE type=?').get('close');
const wins = db.prepare('SELECT COUNT(*) as c FROM trades WHERE pnl > 0').get();
const losses = db.prepare('SELECT COUNT(*) as c FROM trades WHERE pnl < 0').get();
const recentTrades = db.prepare('SELECT * FROM trades ORDER BY id DESC LIMIT 5').all();

console.log('=== 交易统计 ===');
console.log('总交易次数:', stats.c);
console.log('开多次数:', openLongs.c);
console.log('平仓次数:', closes.c);
console.log('盈利次数:', wins.c);
console.log('亏损次数:', losses.c);
console.log('总盈亏:', pnl.p?.toFixed(4) || 0, 'USDT');
console.log('\n=== 最近5笔交易 ===');
recentTrades.forEach(t => {
  console.log(`${t.timestamp} | ${t.type} ${t.side} | ${t.amount} @ $${t.price} | PnL: ${t.pnl?.toFixed(4) || 0} | ${t.reason}`);
});

db.close();
