const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 400, height: 750 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  // Inject anti-detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  
  // Go to xiaohongshu
  await page.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'networkidle', timeout: 60000 });
  
  await page.waitForTimeout(3000);
  
  // Try to click login button or avatar to trigger login popup
  try {
    // Try clicking the avatar/login icon
    await page.click('[class*="avatar"], [class*="login"], .user-icon, button:has-text("登录"), a:has-text("登录")', { timeout: 5000 });
    console.log('Clicked login button');
  } catch (e) {
    console.log('No login button found, trying to navigate to login page');
    await page.goto('https://www.xiaohongshu.com/login', { timeout: 30000 });
  }
  
  await page.waitForTimeout(5000);
  
  // Take screenshot
  await page.screenshot({ path: '/root/.openclaw/workspace/xhs_qr_v2.png', fullPage: false });
  console.log('Screenshot saved');
  
  // Wait
  await new Promise(r => setTimeout(r, 120000));
  
  await context.storageState({ path: '/root/.openclaw/workspace/xhs_auth.json' });
  console.log('Auth saved');
  
  await browser.close();
})();
