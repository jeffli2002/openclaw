#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chief Agent - AI CEO 助理 + 决策中枢
职责: 唯一决策者 + Memory所有者 + 任务分发
"""

import os
from datetime import datetime
from typing import Optional, Dict, Any, List

class ChiefAgent:
    """
    Chief Agent - 架构核心
    
    职责:
    - 接收用户任务
    - 决策分发给哪个Agent
    - 合成结果
    - 写入Memory (唯一写入权)
    
    设计原则:
    - Zero cross-agent context pollution
    - Chief-only memory authority
    - Async parallel worker execution
    """
    
    def __init__(self, config_path: str = "agents/config/agent_registry.yaml"):
        self.active_agent: Optional[str] = None
        self.config = self._load_config(config_path)
        
        # Memory路径 (集中管理)
        self.memory_base = "/root/.openclaw/workspace/memory"
        
        # 引入子模块
        from .orchestrator import Orchestrator
        from .memory_manager import MemoryManager
        from .scheduler import Scheduler
        
        self.orchestrator = Orchestrator(self.config)
        self.memory_manager = MemoryManager(self.memory_base)
        self.scheduler = Scheduler(self.config)
        
    def _load_config(self, path: str) -> Dict[str, Any]:
        """加载Agent注册表"""
        import yaml
        config_file = f"/root/.openclaw/workspace/{path}"
        if os.path.exists(config_file):
            with open(config_file, 'r', encoding='utf-8') as f:
                # 使用safe_load_all处理多文档YAML
                docs = list(yaml.safe_load_all(f))
                return docs[0] if docs else self._default_config()
        return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """默认配置"""
        return {
            "agents": {
                "content": {
                    "keywords": ["内容", "日报", "脚本", "社交媒体", "文案", "文章"],
                    "model": "minimax-portal/MiniMax-M2.5",
                    "fallbacks": ["kimi-coding/k2p5"],
                    "prompt": "content_prompt.md"
                },
                "growth": {
                    "keywords": ["增长", "SEO", "关键词", "转化", "漏斗", "获客"],
                    "model": "minimax-portal/MiniMax-M2.5",
                    "fallbacks": ["kimi-coding/k2p5"],
                    "prompt": "growth_prompt.md"
                },
                "coding": {
                    "keywords": ["代码", "编程", "API", "Bug", "重构", "架构", "开发"],
                    "model": "qwen-portal/qwen3.5-pro",
                    "fallbacks": ["minimax-portal/MiniMax-M2.5"],
                    "prompt": "coding_prompt.md",
                    "mutex_with": ["product"]
                },
                "product": {
                    "keywords": ["产品", "PRD", "Roadmap", "用户", "功能", "MVP"],
                    "model": "kimi-coding/k2p5",
                    "fallbacks": ["minimax-portal/MiniMax-M2.5"],
                    "prompt": "product_prompt.md",
                    "mutex_with": ["coding"]
                },
                "finance": {
                    "keywords": ["财务", "成本", "定价", "收入", "现金流", "ROI"],
                    "model": "minimax-portal/MiniMax-M2.5",
                    "fallbacks": ["kimi-coding/k2p5"],
                    "prompt": "finance_prompt.md"
                }
            }
        }
    
    def process_task(self, task: str) -> Dict[str, Any]:
        """
        主任务处理流程 (Chief核心逻辑)
        
        1. 解析任务意图
        2. 加载相关上下文（从Memory）
        3. 选择Agent (通过Orchestrator)
        4. 分发任务 (含上下文)
        5. 收集结果
        6. 写入Memory (Chief唯一职责)
        """
        print(f"\n{'='*60}")
        print(f"[Chief] 收到任务: {task[:50]}...")
        print(f"{'='*60}\n")
        
        # Step 1: 解析任务意图
        agent_type = self._identify_agent(task)
        print(f"[Step 1] 识别Agent类型: {agent_type}")
        
        # Step 2: 检查互斥
        can_execute, reason = self._check_mutex(agent_type)
        if not can_execute:
            return {"success": False, "error": reason}
        
        # Step 3: 加载相关上下文（从Memory）
        context = self._load_context(agent_type, task)
        print(f"[Step 3] 加载上下文: {list(context.keys()) if context else '无'}")
        
        # Step 4: 分发给Orchestrator (含上下文)
        result = self.orchestrator.execute(agent_type, task, context)
        
        # Step 5: 写入Memory (Chief唯一写入)
        self.memory_manager.record_task(agent_type, task, result)
        
        # 更新状态
        self.active_agent = agent_type
        
        return {
            "success": True,
            "agent": agent_type,
            "result": result,
            "context_loaded": bool(context),
            "memory_written": True
        }
    
    def _load_context(self, agent_type: str, task: str) -> Dict[str, Any]:
        """
        从Memory加载相关上下文
        Chief的核心职责：根据任务加载必要背景
        
        Memory分层架构：
        memory/
        ├── global/          # Chief可读写
        ├── agents/         # Sub-Agent命名空间
        │   ├── coding/   # Coding可读写
        │   ├── growth/   # Growth可读写
        │   ├── content/  # Content可读写
        │   └── finance/  # Finance可读写
        
        访问规则：
        - Chief: read all, write global
        - Sub-Agent: read/write own namespace only
        - 禁止跨agent访问
        """
        context = {}
        
        # 1. 读取global（所有Agent可读）
        global_memory = self.memory_manager.read_global()
        if global_memory:
            context["global"] = global_memory[:500]
        
        # 2. 读取对应Agent的namespace
        agent_memory = self.memory_manager.read_agent_memory(agent_type)
        if agent_memory:
            context["agent_namespace"] = agent_memory[:800]
        
        # 3. 加载GitHub信息（Coding Agent需要）
        if agent_type == "coding":
            github_info = self._load_github_context()
            if github_info:
                context["GitHub仓库"] = github_info
        
        return context
    
    def _load_github_context(self) -> Dict[str, Any]:
        """加载GitHub仓库信息供Coding Agent使用"""
        # 读取项目的Git信息
        import os
        
        github_context = {}
        
        # 项目Git仓库列表 (正确的仓库名)
        # 注意：ai-company-server部署在OpenClaw上不需要GitHub
        # content-factory是Skill不需要单独仓库
        repos = [
            {"name": "2ndbrain", "url": "https://github.com/jeffli2002/2ndbrain"},
            {"name": "mission-control", "url": "https://github.com/jeffli2002/mission-control"},
        ]
        
        for repo in repos:
            github_context[repo["name"]] = {
                "url": repo["url"],
                "status": "已配置"
            }
        
        if github_context:
            return github_context
        
        return None
    
    def _get_git_remote(self, repo_path: str) -> str:
        import subprocess
        try:
            result = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                cwd=repo_path.replace("/.git", ""),
                capture_output=True, text=True, timeout=5
            )
            return result.stdout.strip() if result.stdout else "未配置"
        except:
            return "未配置"
    
    def _get_git_branch(self, repo_path: str) -> str:
        import subprocess
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=repo_path.replace("/.git", ""),
                capture_output=True, text=True, timeout=5
            )
            return result.stdout.strip() if result.stdout else "main"
        except:
            return "main"
    
    def _identify_agent(self, task: str) -> str:
        """基于关键词识别Agent类型"""
        task_lower = task.lower()
        for agent_type, config in self.config.get("agents", {}).items():
            keywords = config.get("keywords", [])
            for keyword in keywords:
                if keyword in task_lower:
                    return agent_type
        return "content"  # 默认
    
    def _check_mutex(self, agent_type: str) -> tuple[bool, str]:
        """检查互斥规则"""
        agent_config = self.config.get("agents", {}).get(agent_type, {})
        mutex_with = agent_config.get("mutex_with", [])
        
        if self.active_agent and self.active_agent in mutex_with:
            return False, f"互斥: {self.active_agent} 正在运行"
        
        return True, "OK"
    
    def release(self):
        """释放当前Agent"""
        if self.active_agent:
            print(f"[Chief] 释放Agent: {self.active_agent}")
            self.active_agent = None
    
    def get_status(self) -> Dict[str, Any]:
        """获取系统状态"""
        return {
            "active_agent": self.active_agent,
            "available_agents": list(self.config.get("agents", {}).keys()),
            "memory_path": self.memory_base
        }
