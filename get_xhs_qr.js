const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 400, height: 750 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
  });
  
  const page = await context.newPage();
  
  // Inject script to hide automation
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
  });
  
  // Go to xiaohongshu login
  await page.goto('https://www.xiaohongshu.com/', { waitUntil: 'networkidle', timeout: 60000 });
  
  await page.waitForTimeout(5000);
  
  // Click login button if exists
  try {
    await page.click('text=登录', { timeout: 5000 });
  } catch (e) {}
  
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: '/root/.openclaw/workspace/xhs_qr_new.png', fullPage: false });
  
  console.log('QR screenshot saved');
  
  // Wait 2 minutes for login
  console.log('Waiting 120 seconds for QR scan...');
  await new Promise(r => setTimeout(r, 120000));
  
  // Save storage state (cookies)
  await context.storageState({ path: '/root/.openclaw/workspace/xhs_auth.json' });
  console.log('Auth saved to xhs_auth.json');
  
  await browser.close();
})();
