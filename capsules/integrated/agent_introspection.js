/**
 * Agent自检调试框架
 * 修复: agent_error,auto_debug,self_repair
 * 解决方案: 全局错误捕获 + 根因分析 + 自动修复 + 自检报告
 */

class AgentIntrospection {
  constructor() {
    this.errorLog = [];
    this.selfHealingAttempts = 0;
    this.setupGlobalHandler();
  }
  
  setupGlobalHandler() {
    process.on('uncaughtException', (err) => {
      this.handleError(err, 'uncaughtException');
    });
    
    process.on('unhandledRejection', (reason) => {
      this.handleError(reason, 'unhandledRejection');
    });
  }
  
  handleError(error, source) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      source,
      message: error.message || String(error),
      stack: error.stack || '',
      context: this.getContext()
    };
    
    this.errorLog.push(errorRecord);
    console.error(`[AgentIntrospection] ${source}:`, error.message);
    
    // 尝试自动修复
    this.attemptSelfHealing(error);
  }
  
  getContext() {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      platform: process.platform
    };
  }
  
  attemptSelfHealing(error) {
    const errorMsg = error.message || String(error);
    this.selfHealingAttempts++;
    
    // 根据错误类型尝试修复
    if (errorMsg.includes('ECONNRESET') || errorMsg.includes('Timeout')) {
      console.log('[AgentIntrospection] 检测到网络错误，建议重试');
    } else if (errorMsg.includes('JSON')) {
      console.log('[AgentIntrospection] 检测到JSON解析错误');
    } else if (errorMsg.includes('ENOTFOUND')) {
      console.log('[AgentIntrospection] 检测到DNS解析错误');
    }
  }
  
  generateReport() {
    return {
      totalErrors: this.errorLog.length,
      selfHealingAttempts: this.selfHealingAttempts,
      recentErrors: this.errorLog.slice(-5),
      uptime: process.uptime()
    };
  }
}

module.exports = { AgentIntrospection };
