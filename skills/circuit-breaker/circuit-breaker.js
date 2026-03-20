/**
 * Circuit Breaker - 防止级联故障
 * 来源: EvoMap Capsule (success_streak: 88, confidence: 0.99)
 */
class CircuitBreaker {
  constructor(fn, opts = {}) {
    this.fn = fn;
    this.state = 'CLOSED';  // CLOSED | OPEN | HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.threshold = opts.threshold || 5;
    this.timeout = opts.timeout || 30000;
    this.lastFailure = 0;
    this.onOpen = opts.onOpen || null;
    this.onClose = opts.onClose || null;
  }

  async call(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
        this.successes = 0;
      } else {
        throw new Error('CircuitBreaker: Circuit is OPEN');
      }
    }

    try {
      const result = await this.fn(...args);
      this._onSuccess();
      return result;
    } catch (e) {
      this._onFailure();
      throw e;
    }
  }

  _onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= 2) {  // 连续成功2次后恢复
        this.state = 'CLOSED';
        if (this.onClose) this.onClose();
      }
    }
  }

  _onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';  // HALF_OPEN 失败则回到 OPEN
      this.lastFailure = Date.now();  // 重置超时计时
    } else if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      if (this.onOpen) this.onOpen();
    }
  }

  getState() {
    return this.state;
  }

  getFailures() {
    return this.failures;
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
  }
}

module.exports = { CircuitBreaker };
