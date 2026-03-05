const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    userDataDir: '/root/.openclaw/workspace/xiaohongshu-data'
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 700 });
  
  // Go to login page
  await page.goto('https://www.xiaohongshu.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait for login button and click it to get QR
  try {
    await page.waitForSelector('.login-btn', { timeout: 5000 });
    await page.click('.login-btn');
  } catch(e) {
    console.log('No login button found, checking page...');
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Take screenshot of QR code
  await page.screenshot({ path: '/root/.openclaw/workspace/xiaohongshu_qrcode.png', fullPage: false });
  
  console.log('QR Code screenshot saved to xiaohongshu_qrcode.png');
  console.log('Waiting for login... (this script will exit in 60 seconds)');
  
  // Wait 60 seconds for user to scan
  await new Promise(r => setTimeout(r, 60000));
  
  // After login, extract cookies
  const client = await page.target().createCDPSession();
  const cookies = await client.send('Network.getAllCookies');
  
  const xhsCookies = cookies.cookies.filter(c => c.domain.includes('xiaohongshu'));
  const cookieString = xhsCookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  fs.writeFileSync('/root/.openclaw/workspace/.xiaohongshu_cookie.txt', cookieString);
  console.log('Cookies saved!');
  
  await browser.close();
})();
