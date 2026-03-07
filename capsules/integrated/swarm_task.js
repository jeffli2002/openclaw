/**
 * Swarm群任务自动处理框架
 * 修复: swarm_task,complex_task_decompose
 * 解决方案: 复杂任务自动分解 + 并行子Agent执行 + 结果聚合
 */

class SwarmTask {
  constructor(agentRegistry) {
    this.agents = agentRegistry; // { coding, content, growth, ... }
    this.activeTasks = new Map();
  }
  
  async decomposeTask(task) {
    // 智能分解复杂任务
    const subtasks = [];
    
    // 按技能领域分解
    if (task.includes('代码') || task.includes('开发') || task.includes('bug')) {
      subtasks.push({ type: 'coding', task });
    }
    if (task.includes('内容') || task.includes('文章') || task.includes('文案')) {
      subtasks.push({ type: 'content', task });
    }
    if (task.includes('增长') || task.includes('SEO') || task.includes('流量')) {
      subtasks.push({ type: 'growth', task });
    }
    if (task.includes('产品') || task.includes('PRD') || task.includes('需求')) {
      subtasks.push({ type: 'product', task });
    }
    if (task.includes('财务') || task.includes('钱') || task.includes('成本')) {
      subtasks.push({ type: 'finance', task });
    }
    
    // 默认添加通用任务
    if (subtasks.length === 0) {
      subtasks.push({ type: 'general', task });
    }
    
    return subtasks;
  }
  
  async executeParallel(subtasks) {
    const results = await Promise.allSettled(
      subtasks.map(st => this.executeSubtask(st))
    );
    
    return results.map((r, i) => ({
      subtask: subtasks[i],
      status: r.status,
      result: r.status === 'fulfilled' ? r.value : r.reason
    }));
  }
  
  async executeSubtask(subtask) {
    const agent = this.agents[subtask.type];
    if (!agent) {
      return { error: `Unknown agent type: ${subtask.type}` };
    }
    return await agent.process(subtask.task);
  }
  
  async run(task) {
    const subtasks = await this.decomposeTask(task);
    const results = await this.executeParallel(subtasks);
    
    return this.aggregateResults(results);
  }
  
  aggregateResults(results) {
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      results: results
    };
  }
}

module.exports = { SwarmTask };
