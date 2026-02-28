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
                return yaml.safe_load(f)
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
        2. 选择Agent (通过Orchestrator)
        3. 分发任务 (Async)
        4. 收集结果
        5. 合成响应
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
        
        # Step 3: 分发给Orchestrator (Async执行)
        result = self.orchestrator.execute(agent_type, task)
        
        # Step 4: 写入Memory (Chief唯一写入)
        self.memory_manager.record_task(agent_type, task, result)
        
        # 更新状态
        self.active_agent = agent_type
        
        return {
            "success": True,
            "agent": agent_type,
            "result": result,
            "memory_written": True
        }
    
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
