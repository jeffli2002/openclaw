/**
 * 跨会话记忆连续性
 * 修复: session_amnesia,context_loss,cross_session_gap
 * 解决方案: 使用RECENT_EVENTS.md作为24h滚动事件源 + 每日memory
 */

const path = require('path');
const fs = require('fs');

const MEMORY_DIR = '/root/.openclaw/workspace/memory';
const RECENT_EVENTS_FILE = path.join(MEMORY_DIR, 'RECENT_EVENTS.md');

function loadRecentEvents() {
  try {
    if (fs.existsSync(RECENT_EVENTS_FILE)) {
      const content = fs.readFileSync(RECENT_EVENTS_FILE, 'utf-8');
      return parseEvents(content);
    }
  } catch (e) {
    console.error('加载RECENT_EVENTS失败:', e);
  }
  return [];
}

function parseEvents(content) {
  // 解析事件格式: ## 2026-02-27 14:30
  // 事件内容...
  const events = [];
  const lines = content.split('\n');
  let currentEvent = null;
  
  for (const line of lines) {
    const timeMatch = line.match(/^## (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
    if (timeMatch) {
      if (currentEvent) events.push(currentEvent);
      currentEvent = { time: timeMatch[1], content: '' };
    } else if (currentEvent) {
      currentEvent.content += line + '\n';
    }
  }
  if (currentEvent) events.push(currentEvent);
  
  return events.slice(-20); // 最近20条
}

function saveEvent(event) {
  try {
    let content = '';
    if (fs.existsSync(RECENT_EVENTS_FILE)) {
      content = fs.readFileSync(RECENT_EVENTS_FILE, 'utf-8');
    }
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newEntry = `## ${timestamp}\n${event}\n\n`;
    
    // 保持最近24小时的事件（简单实现：保留最后10000字符）
    const combined = newEntry + content;
    fs.writeFileSync(RECENT_EVENTS_FILE, combined.slice(0, 10000));
  } catch (e) {
    console.error('保存事件失败:', e);
  }
}

module.exports = { loadRecentEvents, saveEvent };
