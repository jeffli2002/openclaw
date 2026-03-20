# Rate Limiter Skill

## 功能
Redis 分布式滑动窗口限流，精确度 99.9%。

## 依赖
- Redis (ioredis)

## 安装
```bash
npm install ioredis
```

## 使用方法

```javascript
const { createRateLimiter } = require('./rate-limiter.js');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

const limiter = createRateLimiter(redis, {
  key: 'api:rate_limit',
  limit: 100,        // 每 windowMs 最多请求数
  windowMs: 60000    // 时间窗口 1分钟
});

const result = await limiter();

if (!result.allowed) {
  console.log('Too many requests, retry after', result.resetMs, 'ms');
  return;
}

// 正常处理请求
```

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| key | required | Redis key 前缀 |
| limit | 100 | 时间窗口内最大请求数 |
| windowMs | 60000 | 时间窗口大小(ms) |

## 返回值

```javascript
{
  allowed: true/false,      // 是否允许请求
  remaining: 99,             // 剩余可用次数
  resetMs: 60000            // 窗口重置时间
}
```

## 高级用法

### 按用户限流
```javascript
const limiter = createRateLimiter(redis, {
  key: `rate:user:${userId}`,
  limit: 10,
  windowMs: 60000
});
```
