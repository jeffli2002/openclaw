/**
 * 飞书消息递送fallback链
 * 修复: feishuformaterror,markdown_render_failed,card_send_rejected
 * 解决方案: 富文本 -> 交互卡片 -> 纯文本 自动降级
 */

async function sendWithFallback(feishu, message, options = {}) {
  const { chatId, messageId } = options;
  
  // 方案1: 尝试富文本
  try {
    return await feishu.postMessage(chatId, message);
  } catch (e) {
    console.log('富文本失败，尝试卡片...');
  }
  
  // 方案2: 尝试交互卡片
  try {
    const card = buildCard(message);
    return await feishu.postCard(chatId, card);
  } catch (e) {
    console.log('卡片失败，尝试纯文本...');
  }
  
  // 方案3: 纯文本降级
  const plainText = stripMarkdown(message);
  return await feishu.postMessage(chatId, plainText);
}

function buildCard(content) {
  return {
    config: { wide_screen_mode: true },
    elements: [{
      tag: 'markdown',
      content: content
    }]
  };
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

module.exports = { sendWithFallback };
