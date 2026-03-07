const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 400, height: 750 }
  });
  
  const page = await context.newPage();
  
  // Go to xiaohongshu
  await page.goto('https://www.xiaohongshu.com/', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: '/root/.openclaw/workspace/xhs_login.png', fullPage: false });
  
  console.log('Screenshot saved to /root/.openclaw/workspace/xhs_login.png');
  
  // Keep browser open
  console.log('Browser open. Press Ctrl+C to exit and save cookies.');
  await new Promise(() => {});
})();
