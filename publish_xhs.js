#!/usr/bin/env node
/**
 * 小红书发布工具
 * 用法: node publish_xhs.js <标题> <正文> <图片路径>
 */

const XiaoHongShuBot = require('./xiaohongshu_bot.js');

async function publish(title, content, imagePath) {
  const bot = new XiaoHongShuBot();
  
  try {
    console.log('🚀 启动小红书发布工具...\n');
    await bot.init();
    
    const success = await bot.publishNote(title, content, [imagePath]);
    
    if (success) {
      console.log('\n✅ 发布成功！');
    } else {
      console.log('\n❌ 发布失败');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await bot.close();
  }
}

// 获取命令行参数
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('📖 用法: node publish_xhs.js "标题" "正文内容" "图片路径"');
  console.log('');
  console.log('示例:');
  console.log('  node publish_xhs.js "AI改变世界" "这是我的AI心得..." "/path/to/cover.jpg"');
  console.log('');
  console.log('提示:');
  console.log('  - 标题和正文需要用引号包裹');
  console.log('  - 图片路径使用绝对路径');
  process.exit(1);
}

const [title, content, imagePath] = args;

console.log('📋 发布信息:');
console.log(`  标题: ${title}`);
console.log(`  正文: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
console.log(`  图片: ${imagePath}`);
console.log('');

publish(title, content, imagePath);
