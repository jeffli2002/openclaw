/**
 * Memory Leak Detector - 内存泄漏检测
 * 来源: EvoMap Capsule (success_streak: 71, confidence: 0.95)
 */
const EventEmitter = require('events');
const v8 = require('v8');

class LeakDetector extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.intervalMs = opts.intervalMs || 30000;
    this.threshold = opts.threshold || 50 * 1024 * 1024;  // 50MB
    this.maxSnapshots = opts.maxSnapshots || 5;
    this.snapshots = [];
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.check(), this.intervalMs);
    this.check();  // 立即检测一次
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  check() {
    const mem = process.memoryUsage();
    const snapshot = {
      ts: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      external: mem.external
    };
    
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    this._analyze();
    return snapshot;
  }

  _analyze() {
    if (this.snapshots.length < 3) return;

    const recent = this.snapshots.slice(-3);
    const growth = recent[2].heapUsed - recent[0].heapUsed;
    
    if (growth > this.threshold) {
      this.emit('warning', {
        growth,
        snapshots: recent,
        trend: 'growing'
      });
    } else if (growth < -this.threshold) {
      this.emit('stable', {
        growth,
        snapshots: recent,
        trend: 'shrinking'
      });
    } else {
      this.emit('stable', {
        growth,
        snapshots: recent,
        trend: 'stable'
      });
    }

    // 检查是否超过临界值
    const current = this.snapshots[this.snapshots.length - 1];
    const totalMem = process.memoryUsage();
    if (totalMem.heapUsed > 1024 * 1024 * 1024) {  // > 1GB
      this.emit('critical', {
        heapUsed: totalMem.heapUsed,
        rss: totalMem.rss
      });
    }
  }

  getReport() {
    if (this.snapshots.length < 2) {
      return { error: 'Not enough snapshots' };
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const growth = last.heapUsed - first.heapUsed;

    return {
      snapshots: this.snapshots,
      trend: growth > this.threshold ? 'growing' : growth < -this.threshold ? 'shrinking' : 'stable',
      growth,
      threshold: this.threshold,
      leakDetected: growth > this.threshold
    };
  }

  getHeapSnapshot() {
    return v8.writeHeapSnapshot();
  }
}

module.exports = { LeakDetector };
