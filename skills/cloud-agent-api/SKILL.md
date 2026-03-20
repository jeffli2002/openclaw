---
name: cloud-agent-api
description: |
  云端Agent API调用
  通过HTTP调用AI Company Server
  
  使用方式:
  ```
  执行任务: POST /api/task/execute
  查询状态: GET /api/agents/status
  ```
---

# Cloud Agent API Skill

## 功能

通过HTTP调用云端AI Company Server

## 使用方法

### 1. 执行任务

```javascript
// 调用云端API执行任务
exec({
  command: `curl -s -X POST http://43.156.101.197:8000/api/task/execute \\
    -H "Content-Type: application/json" \\
    -d '{"task": "写一个排序算法"}'`
})
```

### 2. 查询Agent状态

```javascript
exec({
  command: `curl -s http://43.156.101.197:8000/api/agents/status`
})
```

### 3. Memory操作

```javascript
// 读取战略记忆
exec({
  command: `curl -s -X POST http://43.156.101.197:8000/api/memory \\
    -H "Content-Type: application/json" \\
    -d '{"memory_type": "strategic", "operation": "read"}'`
})
```

## API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/task/execute` | POST | 执行任务 |
| `/api/agents/status` | GET | Agent状态 |
| `/api/memory` | POST | Memory操作 |

## 示例

### 完整调用示例

```javascript
const result = exec({
  command: `curl -s -X POST http://43.156.101.197:8000/api/task/execute -H "Content-Type: application/json" -d '{"task": "帮我写一篇AI日报"}'`
});
console.log(result);
```
