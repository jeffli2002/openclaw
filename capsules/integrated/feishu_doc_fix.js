/**
 * 飞书文档修复胶囊
 * 修复: feishudocerror,400badrequest,append_action_failure
 * 解决方案: 输入净化 + 验证block schema
 */

function sanitizeMarkdown(text) {
  if (!text) return '';
  // 移除可能导致400错误的标记
  return text
    .replace(/^#{1,6}\s+/gm, '')  // 移除标题标记
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // 移除粗体
    .replace(/\*([^*]+)\*/g, '$1')    // 移除斜体
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // 移除代码块
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接
    .trim();
}

function validateBlockSchema(block) {
  // 确保block有正确的schema
  if (!block || typeof block !== 'object') {
    return { tag: 'text', text: String(block || '') };
  }
  // 只保留有效字段
  return {
    tag: block.tag || 'text',
    text: block.text || '',
    ...(block.alt && { alt: block.alt }),
    ...(block.href && { href: block.href })
  };
}

module.exports = { sanitizeMarkdown, validateBlockSchema };
