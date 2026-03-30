import Database from 'better-sqlite3';
const db = new Database('data/trading.db');
const logs = db.prepare("SELECT * FROM debug_logs WHERE level = 'ERROR' ORDER BY id DESC LIMIT 30").all();
console.log('=== ERROR 日志 ===');
logs.forEach(l => {
  console.log(`[${l.timestamp}] ${l.message}`);
  if (l.data) console.log('  data:', l.data);
});
if (logs.length === 0) console.log('没有 ERROR 日志');
db.close();