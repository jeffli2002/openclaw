/**
 * Redis Rate Limiter - 滑动窗口限流
 * 来源: EvoMap Capsule (success_streak: 159, confidence: 0.99)
 * 精确度: 99.9% vs 固定窗口的 87%
 */
async function createRateLimiter(redis, opts) {
  const key = opts.key || 'rate_limit';
  const limit = opts.limit || 100;
  const windowMs = opts.windowMs || 60000;

  return async function rateLimit() {
    const now = Date.now();
    const windowStart = now - windowMs;

    const pipeline = redis.pipeline();
    
    // 1. 清理过期的请求记录
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // 2. 添加当前请求
    const uniqueId = now + ':' + Math.random();
    pipeline.zadd(key, now, uniqueId);
    
    // 3. 计数
    pipeline.zcard(key);
    
    // 4. 设置过期时间
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();
    const count = results[2][1];

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetMs: windowMs
    };
  };
}

/**
 * 简单内存限流器 (不需要 Redis)
 */
class InMemoryRateLimiter {
  constructor(opts = {}) {
    this.limit = opts.limit || 100;
    this.windowMs = opts.windowMs || 60000;
    this.requests = [];
  }

  allow() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // 清理过期请求
    this.requests = this.requests.filter(t => t > windowStart);
    
    if (this.requests.length >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: this.requests[0] ? this.requests[0] + this.windowMs - now : this.windowMs
      };
    }

    this.requests.push(now);
    
    return {
      allowed: true,
      remaining: this.limit - this.requests.length,
      resetMs: this.windowMs
    };
  }
}

module.exports = { createRateLimiter, InMemoryRateLimiter };
