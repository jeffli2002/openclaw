"""
AI Company Server - FastAPI入口
"""

import os
from pathlib import Path

# 加载.env文件
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn

from .orchestrator import Orchestrator
from .chief_agent import ChiefAgent
from .memory_manager import MemoryManager

app = FastAPI(
    title="AI Company Orchestrator API",
    description="Chief Agent调度中心API",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化组件
chief_agent = ChiefAgent()
memory_manager = MemoryManager()

# ============ 请求模型 ============

class TaskRequest(BaseModel):
    task: str
    agent_type: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class MemoryRequest(BaseModel):
    memory_type: str  # strategic/company_rules/vision/project
    content: str
    operation: str = "write"  # write/read/search

# ============ API端点 ============

@app.get("/")
async def root():
    return {"status": "ok", "service": "AI Company Orchestrator"}

@app.get("/health")
async def health():
    return {"status": "healthy", "chief": chief_agent.get_status()}

# 任务执行
@app.post("/api/task/execute")
async def execute_task(request: TaskRequest):
    """执行任务"""
    try:
        result = chief_agent.process_task(request.task)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Agent状态
@app.get("/api/agents/status")
async def get_agents_status():
    """获取所有Agent状态"""
    return chief_agent.get_status()

# Memory操作
@app.post("/api/memory")
async def memory_operation(request: MemoryRequest):
    """Memory读写操作"""
    try:
        if request.operation == "read":
            if request.memory_type == "strategic":
                content = memory_manager.read_strategic_memory()
            elif request.memory_type == "company_rules":
                content = memory_manager.read_company_rules()
            elif request.memory_type == "vision":
                content = memory_manager.read_vision()
            else:
                content = memory_manager.read_project(request.memory_type)
            return {"success": True, "content": content}
            
        elif request.operation == "write":
            if request.memory_type == "strategic":
                memory_manager.update_strategic_memory(request.content)
            elif request.memory_type == "company_rules":
                memory_manager.update_company_rules(request.content)
            elif request.memory_type == "vision":
                memory_manager.update_vision(request.content)
            else:
                memory_manager.update_project(request.memory_type, request.content)
            return {"success": True, "message": "Saved"}
            
        else:
            raise HTTPException(status_code=400, detail="Invalid operation")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Memory搜索
@app.get("/api/memory/search")
async def search_memory(q: str):
    """搜索Memory"""
    results = memory_manager.search_memory(q)
    return {"success": True, "results": results}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
