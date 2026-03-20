const { chromium } = require('playwright');

async function testPublish() {
  console.log('🧪 测试发布功能...\n');
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    storageState: '/root/.openclaw/workspace/xhs_auth.json',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  
  // 访问创作中心
  console.log('🌐 访问创作中心...');
  await page.goto('https://creator.xiaohongshu.com/publish/publish', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  
  await page.waitForTimeout(5000);
  
  // 截图看是否能进入发布页面
  await page.screenshot({ path: '/root/.openclaw/workspace/xhs_creator_test.png' });
  console.log('📸 已截图保存');
  
  // 检查是否在发布页面
  const url = page.url();
  console.log('当前URL:', url);
  
  if (url.includes('creator.xiaohongshu.com')) {
    console.log('✅ 成功进入创作中心！');
  } else {
    console.log('⚠️ 可能需要重新登录');
  }
  
  await browser.close();
}

testPublish().catch(console.error);
