const { chromium } = require('playwright');
const fs = require('fs');

async function saveLogin() {
  console.log('💾 保存登录状态...\n');
  
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
  
  await page.waitForTimeout(5000);
  
  // 保存登录状态
  await context.storageState({ path: '/root/.openclaw/workspace/xhs_auth.json' });
  console.log('✅ 登录状态已保存到 xhs_auth.json');
  
  // 同时保存cookie文本
  const cookies = await context.cookies();
  const cookieStr = cookies.filter(c => c.domain.includes('xiaohongshu'))
    .map(c => `${c.name}=${c.value}`).join(';');
  fs.writeFileSync('/root/.openclaw/workspace/xhs_cookie.txt', cookieStr);
  console.log('✅ Cookie已保存到 xhs_cookie.txt');
  
  // 截图确认
  await page.screenshot({ path: '/root/.openclaw/workspace/xhs_logged_in.png' });
  console.log('📸 已截图保存');
  
  await browser.close();
  console.log('\n🎉 全部完成！现在可以发布笔记和点赞了');
}

saveLogin().catch(console.error);
