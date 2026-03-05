const { chromium } = require('playwright');
const fs = require('fs');

async function saveLoginWithCheck() {
  console.log('💾 保存登录状态（带检测）...\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  
  // 访问小红书
  await page.goto('https://www.xiaohongshu.com/', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  
  console.log('⏳ 等待扫码登录（60秒）...');
  
  // 等待60秒，让用户扫码
  await new Promise(r => setTimeout(r, 60000));
  
  // 刷新页面检查是否登录成功
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // 检查是否已登录（查找头像）
  const avatar = await page.locator('.avatar, .user-avatar, img[alt*="头像"]').first();
  const isLoggedIn = await avatar.isVisible().catch(() => false);
  
  if (isLoggedIn) {
    console.log('✅ 检测到已登录！');
    
    // 保存登录状态
    await context.storageState({ path: '/root/.openclaw/workspace/xhs_auth.json' });
    console.log('✅ 登录状态已保存');
    
    // 保存cookie
    const cookies = await context.cookies();
    const cookieStr = cookies.filter(c => c.domain.includes('xiaohongshu'))
      .map(c => `${c.name}=${c.value}`).join(';');
    fs.writeFileSync('/root/.openclaw/workspace/xhs_cookie.txt', cookieStr);
    console.log('✅ Cookie已保存');
    
    await page.screenshot({ path: '/root/.openclaw/workspace/xhs_login_success.png' });
    console.log('📸 已截图');
  } else {
    console.log('⚠️ 未检测到登录状态，可能扫码未完成');
    await page.screenshot({ path: '/root/.openclaw/workspace/xhs_login_check.png' });
  }
  
  await browser.close();
}

saveLoginWithCheck().catch(console.error);
