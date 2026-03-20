# Memory Leak Detector Skill

## 功能
Node.js 内存泄漏检测工具，用于监控 OpenClaw 进程内存使用情况。

## 使用方法

```javascript
const { LeakDetector } = require('./leak-detector.js');

const detector = new LeakDetector({
  intervalMs: 30000,    // 检测间隔(ms)
  threshold: 50 * 1024 * 1024,  // 增长阈值(50MB)
  maxSnapshots: 5      // 最大快照数
});

// 监听泄漏警告
detector.on('warning', (info) => {
  console.log('⚠️ Memory leak detected:', info);
});

detector.on('stable', () => {
  console.log('✅ Memory stable');
});

// 手动触发检测
detector.check();

// 获取报告
console.log(detector.getReport());
```

## 事件

| 事件 | 说明 |
|------|------|
| warning | 检测到内存异常增长 |
| stable | 内存使用稳定 |
| critical | 内存使用超过临界值 |

## 输出示例
```javascript
{
  snapshots: [
    { ts: 1234567890, heapUsed: 100MB, rss: 150MB },
    { ts: 1234567920, heapUsed: 120MB, rss: 160MB },
  ],
  trend: 'growing',  // growing | stable | shrinking
  leakDetected: false
}
```
