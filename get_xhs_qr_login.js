const { chromium } = require('playwright');
const fs = require('fs');

async function getLoginQR() {
  console.log('🎫 获取小红书登录二维码...\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  
  // 访问小红书首页
  await page.goto('https://www.xiaohongshu.com/', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  
  await page.waitForTimeout(3000);
  
  // 点击登录按钮
  try {
    await page.click('.login-btn, button:has-text("登录"), .user-icon', { timeout: 5000 });
  } catch (e) {
    // 如果没有登录按钮，可能已经弹出登录框
  }
  
  await page.waitForTimeout(3000);
  
  // 截图二维码
  await page.screenshot({ path: '/root/.openclaw/workspace/xhs_qr_login.png' });
  console.log('📸 二维码已保存');
  
  // 等待用户登录
  console.log('⏳ 等待扫码登录（60秒）...');
  await new Promise(r => setTimeout(r, 60000));
  
  // 保存登录状态
  await context.storageState({ path: '/root/.openclaw/workspace/xhs_auth.json' });
  console.log('✅ 登录状态已保存');
  
  await browser.close();
}

getLoginQR().catch(console.error);
