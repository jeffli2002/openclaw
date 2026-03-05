const { chromium } = require('playwright');
const fs = require('fs');

/**
 * 小红书自动化脚本
 * 功能：发布笔记、点赞
 */

class XiaoHongShuBot {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async init() {
    // 启动浏览器
    this.browser = await chromium.launch({
      headless: false,
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    // 加载已保存的登录状态
    const authFile = '/root/.openclaw/workspace/xhs_auth.json';
    if (fs.existsSync(authFile)) {
      this.context = await this.browser.newContext({
        storageState: authFile,
        viewport: { width: 1280, height: 800 }
      });
      console.log('✅ 已加载登录状态');
    } else {
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 }
      });
    }

    // 隐藏自动化特征
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      window.chrome = { runtime: {} };
    });

    this.page = await this.context.newPage();
  }

  /**
   * 发布图文笔记
   * @param {string} title - 标题
   * @param {string} content - 正文内容
   * @param {string[]} imagePaths - 图片路径数组
   */
  async publishNote(title, content, imagePaths) {
    try {
      console.log('📝 开始发布笔记...');
      
      // 访问创作中心
      await this.page.goto('https://creator.xiaohongshu.com/publish/publish', {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      await this.page.waitForTimeout(3000);
      
      // 上传图片
      console.log('📸 上传图片...');
      const uploadInput = await this.page.locator('input[type="file"]').first();
      for (const imagePath of imagePaths) {
        await uploadInput.setInputFiles(imagePath);
        await this.page.waitForTimeout(2000);
      }
      
      // 等待图片上传完成
      await this.page.waitForTimeout(5000);
      
      // 填写标题
      console.log('📝 填写标题...');
      const titleInput = await this.page.locator('[placeholder*="标题"], .title-input, [data-testid="title-input"]').first();
      await titleInput.fill(title);
      
      // 填写正文
      console.log('📝 填写正文...');
      const contentEditor = await this.page.locator('.content-editor, [contenteditable="true"], .ql-editor').first();
      await contentEditor.fill(content);
      
      // 点击发布按钮
      console.log('🚀 点击发布...');
      const publishBtn = await this.page.locator('button:has-text("发布"), button:has-text("立即发布"), .publish-btn').first();
      await publishBtn.click();
      
      // 等待发布完成
      await this.page.waitForTimeout(5000);
      
      console.log('✅ 笔记发布成功！');
      return true;
      
    } catch (error) {
      console.error('❌ 发布失败:', error.message);
      return false;
    }
  }

  /**
   * 点赞笔记
   * @param {string} noteUrl - 笔记URL
   */
  async likeNote(noteUrl) {
    try {
      console.log('👍 开始点赞...');
      
      await this.page.goto(noteUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      await this.page.waitForTimeout(3000);
      
      // 查找点赞按钮
      const likeBtn = await this.page.locator(
        '.like-btn, .icon-like, button:has-text("赞"), [data-testid="like-btn"]'
      ).first();
      
      // 检查是否已经点赞
      const isLiked = await likeBtn.evaluate(el => el.classList.contains('liked'));
      
      if (!isLiked) {
        await likeBtn.click();
        await this.page.waitForTimeout(2000);
        console.log('✅ 点赞成功！');
      } else {
        console.log('ℹ️ 已经点赞过了');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ 点赞失败:', error.message);
      return false;
    }
  }

  /**
   * 搜索并点赞
   * @param {string} keyword - 搜索关键词
   * @param {number} count - 点赞数量
   */
  async searchAndLike(keyword, count = 3) {
    try {
      console.log(`🔍 搜索: ${keyword}`);
      
      await this.page.goto(`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`, {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      await this.page.waitForTimeout(5000);
      
      // 获取笔记链接
      const noteLinks = await this.page.locator('a[href*="/explore/"]').all();
      console.log(`📊 找到 ${noteLinks.length} 个笔记`);
      
      let likedCount = 0;
      for (let i = 0; i < Math.min(count, noteLinks.length); i++) {
        const href = await noteLinks[i].getAttribute('href');
        const fullUrl = href.startsWith('http') ? href : `https://www.xiaohongshu.com${href}`;
        
        await this.likeNote(fullUrl);
        likedCount++;
        
        // 返回搜索页
        await this.page.goto(`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`, {
          waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(3000);
      }
      
      console.log(`✅ 共点赞 ${likedCount} 个笔记`);
      return likedCount;
      
    } catch (error) {
      console.error('❌ 搜索点赞失败:', error.message);
      return 0;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// 主函数
async function main() {
  const bot = new XiaoHongShuBot();
  
  try {
    await bot.init();
    
    // 示例：发布笔记（需要传入实际参数）
    // await bot.publishNote(
    //   '测试标题',
    //   '测试正文内容',
    //   ['/path/to/image1.jpg', '/path/to/image2.jpg']
    // );
    
    // 示例：点赞指定笔记
    // await bot.likeNote('https://www.xiaohongshu.com/explore/xxx');
    
    // 示例：搜索并点赞
    // await bot.searchAndLike('AI', 3);
    
    console.log('✅ 操作完成');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await bot.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = XiaoHongShuBot;
