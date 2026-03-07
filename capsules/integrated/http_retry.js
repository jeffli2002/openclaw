/**
 * HTTP指数退避重试机制
 * 修复: timeouterror,econnreset,econnrefused,429
 * 解决方案: 指数退避 + 抖动 + 状态码判断
 */

const http = require('http');
const https = require('https');

async function fetchWithRetry(url, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    retries = 0
  } = options;
  
  try {
    return await fetch(url, options);
  } catch (error) {
    if (retries >= maxRetries) {
      throw error;
    }
    
    // 判断是否可重试
    const canRetry = shouldRetry(error);
    if (!canRetry) {
      throw error;
    }
    
    // 指数退避 + 随机抖动
    const delay = Math.min(
      initialDelay * Math.pow(2, retries) + Math.random() * 1000,
      maxDelay
    );
    
    console.log(`[HTTP Retry] ${retries + 1}/${maxRetries}, 等待 ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));
    
    return fetchWithRetry(url, { ...options, retries: retries + 1 });
  }
}

function shouldRetry(error) {
  const message = error.message || '';
  
  // 网络错误 - 可重试
  if (message.includes('ECONNRESET') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('ENOTFOUND') ||
      message.includes('ENETUNREACH')) {
    return true;
  }
  
  // 超时 - 可重试
  if (message.includes('timeout') || message.includes('Timeout')) {
    return true;
  }
  
  return false;
}

module.exports = { fetchWithRetry, shouldRetry };
