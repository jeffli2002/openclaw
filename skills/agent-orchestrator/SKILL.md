---
name: agent-orchestrator
description: |
  Agent Orchestrator - Chief调度中心
  调用方式: exec tool 通过Python执行
  
  功能:
  - Chief Agent任务分发
  - 多Agent调度 (content/growth/coding/product/finance)
  - 异步执行编排
  
  使用示例:
  ```
  python3 /root/.openclaw/workspace/agents/tool.py --agent coding --task "修复bug"
  ```
---

# Agent Orchestrator Skill

## 调用方式

### 1. 直接exec调用

```javascript
exec({
  command: 'cd /root/.openclaw/workspace/agents && python3 tool.py --agent coding --task "写排序算法"'
})
```

### 2. 通过函数调用

```javascript
const result = exec({
  command: `python3 /root/.openclaw/workspace/agents/tool.py --agent ${agentType} --task "${task}"`
});
```

## Agent类型

| Agent | 用途 | 关键词 |
|-------|------|--------|
| content | 内容创作 | 日报、脚本、文案 |
| growth | 增长黑客 | SEO、关键词、转化 |
| coding | 代码开发 | 编程、API、Bug |
| product | 产品规划 | PRD、Roadmap、MVP |
| finance | 财务分析 | 成本、定价、ROI |
| chief | 调度中心 | 协调、安排、汇报 |

## 返回格式

```json
{
  "success": true,
  "agent": "coding",
  "result": { /* Agent执行结果 */ },
  "memory_written": true
}
```

## 架构流程

```
OpenClaw (Main Agent)
    ↓ exec
Python Tool Interface
    ↓ 
Chief Agent (调度)
    ↓
Orchestrator (编排)
    ↓
Sub-Agent (执行)
    ↓
返回结果 → Chief合成 → 输出
```

## 集成到现有流程

在Chief Agent任务处理中，当识别到需要特定Agent时：

1. 关键词匹配Agent类型
2. 调用此tool执行
3. 获取结构化结果
4. Chief合成回复
5. 写入Memory

## 示例

### 内容创作任务
```javascript
exec({
  command: 'python3 /root/.openclaw/workspace/agents/tool.py --agent content --task "写AI日报"'
})
```

### 代码开发任务
```javascript
exec({
  command: 'python3 /root/.openclaw/workspace/agents/tool.py --agent coding --task "修复Second Brain Token计算bug"'
})
```

## 注意事项

- 确保Python环境可用 (python3)
- 依赖包在requirements.txt中
- 执行路径为 /root/.openclaw/workspace/agents
