const Database = require('better-sqlite3');
const db = new Database('/root/.openclaw/workspace/xiaohongshu-data/Default/Cookies', { readonly: true });

const stmt = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='cookies'");
console.log(stmt.get().sql);

db.close();
