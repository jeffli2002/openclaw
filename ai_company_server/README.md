# AI Company Server

云端Agent编排服务

## 快速启动

### 1. 本地开发
```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --reload
```

### 2. Docker部署
```bash
# 构建镜像
docker build -t ai-company-api .

# 运行
docker-compose up -d
```

## API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 健康检查 |
| `/health` | GET | 服务状态 |
| `/api/task/execute` | POST | 执行任务 |
| `/api/agents/status` | GET | Agent状态 |
| `/api/memory` | POST | Memory操作 |

## 环境变量

```bash
OPENAI_API_KEY=sk-xxx
MINIMAX_API_KEY=xxx
KIMI_API_KEY=xxx
```

## 架构

```
OpenClaw → Cloud API → Orchestrator → Workers → Memory
```

## 目录结构

```
ai_company_server/
├── app/
│   ├── main.py          # FastAPI入口
│   ├── chief_agent.py   # Chief调度
│   ├── orchestrator.py   # 任务编排
│   ├── memory_manager.py # 记忆管理
│   ├── agents/          # Agent实现
│   └── prompts/         # Prompt模板
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```
