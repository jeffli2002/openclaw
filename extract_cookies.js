const Database = require('better-sqlite3');
const db = new Database('/root/.openclaw/workspace/xiaohongshu-data/Default/Cookies', { readonly: true });

const cookies = db.prepare("SELECT name, value, host_key, path FROM cookies WHERE host_key LIKE '%xiaohongshu%'").all();

console.log('=== XIAOHONGSHU_COOKIE ===');
const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
console.log(cookieString);

console.log('\n=== 保存到文件 ===');
fs.writeFileSync('/root/.openclaw/workspace/.xiaohongshu_cookie.txt', cookieString);
console.log('Cookie已保存到 /root/.openclaw/workspace/.xiaohongshu_cookie.txt');

db.close();
