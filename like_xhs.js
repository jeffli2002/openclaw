#!/usr/bin/env node
/**
 * 小红书点赞工具
 * 用法: 
 *   node like_xhs.js <笔记URL>        # 点赞指定笔记
 *   node like_xhs.js --search "关键词" # 搜索并点赞前3个
 */

const XiaoHongShuBot = require('./xiaohongshu_bot.js');

async function likeNote(url) {
  const bot = new XiaoHongShuBot();
  
  try {
    console.log('🚀 启动小红书点赞工具...\n');
    await bot.init();
    
    const success = await bot.likeNote(url);
    
    if (success) {
      console.log('\n✅ 点赞完成！');
    } else {
      console.log('\n❌ 点赞失败');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await bot.close();
  }
}

async function searchAndLike(keyword, count = 3) {
  const bot = new XiaoHongShuBot();
  
  try {
    console.log('🚀 启动小红书搜索点赞工具...\n');
    await bot.init();
    
    const likedCount = await bot.searchAndLike(keyword, count);
    
    console.log(`\n✅ 共点赞 ${likedCount} 个笔记`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await bot.close();
  }
}

// 获取命令行参数
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('📖 用法:');
  console.log('  点赞指定笔记:');
  console.log('    node like_xhs.js "https://www.xiaohongshu.com/explore/xxx"');
  console.log('');
  console.log('  搜索并点赞:');
  console.log('    node like_xhs.js --search "AI" [数量]');
  console.log('');
  console.log('示例:');
  console.log('  node like_xhs.js "https://www.xiaohongshu.com/explore/123456"');
  console.log('  node like_xhs.js --search "AI" 5');
  process.exit(1);
}

if (args[0] === '--search') {
  const keyword = args[1];
  const count = parseInt(args[2]) || 3;
  
  if (!keyword) {
    console.log('❌ 请提供搜索关键词');
    process.exit(1);
  }
  
  console.log(`🔍 搜索关键词: "${keyword}"，点赞前 ${count} 个笔记\n`);
  searchAndLike(keyword, count);
} else {
  const url = args[0];
  console.log(`👍 点赞笔记: ${url}\n`);
  likeNote(url);
}
