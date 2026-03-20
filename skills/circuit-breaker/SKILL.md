# Circuit Breaker Skill

## 功能
防止 AI Agent 调用外部 API 时的级联故障，自动隔离故障服务。

## 原理
- **CLOSED**: 正常状态，调用直接通过
- **OPEN**: 失败次数超过阈值，熔断拒绝调用
- **HALF_OPEN**: 尝试恢复，允许部分调用测试

## 使用方法

```javascript
const CircuitBreaker = require('./circuit-breaker.js');

const breaker = new CircuitBreaker(async (arg) => {
  // 你的 API 调用逻辑
  return await fetch(arg);
}, {
  threshold: 5,      // 失败次数阈值
  timeout: 30000,    // 熔断时长(ms)
});

try {
  const result = await breaker.call('https://api.example.com');
} catch (e) {
  console.log('Circuit OPEN:', e.message);
}
```

## 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| threshold | 5 | 失败次数阈值 |
| timeout | 30000 | 熔断持续时间(ms) |
| onOpen | null | 熔断打开时的回调 |
| onClose | null | 恢复关闭时的回调 |

## 状态查询
```javascript
breaker.state     // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
breaker.failures  // 当前失败计数
```
