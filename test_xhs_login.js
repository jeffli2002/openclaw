const { chromium } = require('playwright');
const fs = require('fs');

async function testLogin() {
  console.log('🧪 测试小红书登录状态...\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const authFile = '/root/.openclaw/workspace/xhs_auth.json';
  
  if (!fs.existsSync(authFile)) {
    console.log('❌ 未找到登录状态文件');
    await browser.close();
    return;
  }

  const context = await browser.newContext({
    storageState: authFile,
    viewport: { width: 1280, height: 800 }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  
  // 访问小红书首页
  console.log('🌐 访问小红书...');
  await page.goto('https://www.xiaohongshu.com/', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  
  await page.waitForTimeout(3000);
  
  // 截图查看状态
  await page.screenshot({ path: '/root/.openclaw/workspace/xhs_login_test.png' });
  console.log('📸 已截图保存到 xhs_login_test.png');
  
  // 检查是否已登录（查找头像或用户名）
  const avatar = await page.locator('.avatar, .user-avatar, [class*="avatar"]').first();
  const hasAvatar = await avatar.isVisible().catch(() => false);
  
  if (hasAvatar) {
    console.log('✅ 登录状态正常！');
  } else {
    console.log('⚠️ 可能未登录或页面结构不同');
  }
  
  await browser.close();
  console.log('\n测试完成');
}

testLogin().catch(console.error);
