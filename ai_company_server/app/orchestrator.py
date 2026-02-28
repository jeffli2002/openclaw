#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Async Orchestrator - 异步任务编排器
职责: 并行/串行执行Sub-Agent任务
"""

import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional

class Orchestrator:
    """
    Async Orchestrator - 任务编排核心
    
    职责:
    - 接收Chief分发的任务
    - 加载对应Agent的Prompt
    - 调用LLM执行
    - 返回结构化结果
    
    设计原则:
    - Isolated Sub Agents (Stateless Workers)
    - Zero cross-agent context pollution
    - Async parallel execution when possible
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.prompts_path = "/root/.openclaw/workspace/agents/prompts"
        
        # 引入LLM客户端
        from .llm_client import LLMClient
        self.llm = LLMClient()
    
    def execute(self, agent_type: str, task: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        执行任务 (同步入口)
        
        Args:
            agent_type: Agent类型 (content/growth/coding等)
            task: 任务描述
            context: 可选上下文
        
        Returns:
            结构化结果
        """
        print(f"\n[Orchestrator] 开始执行任务")
        print(f"  Agent: {agent_type}")
        print(f"  Task: {task[:30]}...")
        
        # Step 1: 加载Prompt
        prompt = self._load_prompt(agent_type)
        
        # Step 2: 构建消息
        messages = self._build_messages(prompt, task, context)
        
        # Step 3: 获取模型配置
        model_config = self._get_model_config(agent_type)
        
        # Step 4: 调用LLM
        result = self.llm.chat(messages, model_config)
        
        # Step 5: 返回结果
        return {
            "agent_type": agent_type,
            "task": task,
            "result": result,
            "model": model_config["primary"],
            "timestamp": datetime.now().isoformat()
        }
    
    async def execute_async(self, agent_type: str, task: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        异步执行任务 (并行入口)
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.execute, agent_type, task, context)
    
    async def execute_parallel(self, tasks: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        并行执行多个任务
        
        Args:
            tasks: [{"agent": "content", "task": "xxx"}, ...]
        
        Returns:
            结果列表
        """
        print(f"\n[Orchestrator] 并行执行 {len(tasks)} 个任务")
        
        coroutines = [
            self.execute_async(t["agent"], t["task"], t.get("context"))
            for t in tasks
        ]
        
        results = await asyncio.gather(*coroutines)
        return results
    
    def _load_prompt(self, agent_type: str) -> str:
        """加载Agent的Prompt模板"""
        prompt_file = f"{self.prompts_path}/{agent_type}_prompt.md"
        
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read()
        
        return self._default_prompt(agent_type)
    
    def _default_prompt(self, agent_type: str) -> str:
        """默认Prompt"""
        return f"""# {agent_type.upper()} Agent

你是 {agent_type} Agent，负责帮助用户完成相关任务。

## 角色定义
- 你是专业领域的专家
- 你是一个无状态的Worker (Stateless Worker)
- 你不存储长期记忆，所有上下文由Chief提供

## 执行原则
1. 专注完成当前任务
2. 不自行做战略决策
3. 完成后返回结构化结果

请帮助用户完成任务。"""
    
    def _build_messages(self, system_prompt: str, task: str, context: Optional[Dict]) -> List[Dict]:
        """构建消息列表"""
        messages = [{"role": "system", "content": system_prompt}]
        
        # 添加上下文 (如果有)
        if context:
            context_str = f"\n\n## 上下文信息\n{self._format_context(context)}"
            messages.append({"role": "system", "content": context_str})
        
        # 添加任务
        messages.append({"role": "user", "content": task})
        
        return messages
    
    def _format_context(self, context: Dict) -> str:
        """格式化上下文"""
        parts = []
        for key, value in context.items():
            parts.append(f"- **{key}**: {value}")
        return "\n".join(parts)
    
    def _get_model_config(self, agent_type: str) -> Dict[str, Any]:
        """获取模型配置"""
        agent_config = self.config.get("agents", {}).get(agent_type, {})
        
        return {
            "primary": agent_config.get("model", "minimax-portal/MiniMax-M2.5"),
            "fallbacks": agent_config.get("fallbacks", []),
            "temperature": 0.7,
            "max_tokens": 8192
        }

import os  # 添加这行
