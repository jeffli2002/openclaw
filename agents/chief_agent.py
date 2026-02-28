#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chief Agent - 最小调度逻辑实现
MVP 版本：单 Agent 执行，无多线程，无复杂编排
"""

import json
import os
from datetime import datetime
from typing import Optional, Dict, Any

class ChiefAgent:
    """Chief Agent - AI CEO 助理和调度中枢"""
    
    def __init__(self, config_path: str = "agents/config.yaml"):
        self.active_agent: Optional[str] = None
        self.config = self._load_config(config_path)
        self.memory_path = "/root/.openclaw/workspace/memory/global"
        
        # 确保 memory 目录存在
        os.makedirs(self.memory_path, exist_ok=True)
        
    def _load_config(self, path: str) -> Dict[str, Any]:
        """加载配置文件"""
        # 简化版：直接返回配置字典
        # 实际使用时可接入 YAML 解析
        return {
            "agents": {
                "content": {
                    "keywords": ["内容", "日报", "脚本", "社交媒体", "文案", "文章"],
                    "model": "minimax-cn/MiniMax-M2.1",
                    "fallbacks": ["kimi-coding/k2p5", "qwen-portal/coder-model"],
                    "memory_namespace": "content"
                },
                "growth": {
                    "keywords": ["增长", "SEO", "关键词", "转化", "漏斗", "获客"],
                    "model": "qwen-portal/coder-model",
                    "fallbacks": ["minimax-cn/MiniMax-M2.1", "kimi-coding/k2p5"],
                    "memory_namespace": "growth"
                },
                "coding": {
                    "keywords": ["代码", "编程", "API", "Bug", "重构", "架构", "开发"],
                    "model": "kimi-coding/k2p5",
                    "fallbacks": ["qwen-portal/coder-model", "minimax-cn/MiniMax-M2.1"],
                    "memory_namespace": "coding",
                    "mutex_with": ["product"]  # 互斥 Agent
                },
                "product": {
                    "keywords": ["产品", "PRD", "Roadmap", "用户", "功能", "MVP"],
                    "model": "kimi-coding/k2p5",
                    "fallbacks": ["minimax-cn/MiniMax-M2.1", "qwen-portal/coder-model"],
                    "memory_namespace": "product",
                    "mutex_with": ["coding"]  # 互斥 Agent
                },
                "finance": {
                    "keywords": ["财务", "成本", "定价", "收入", "现金流", "ROI"],
                    "model": "minimax-cn/MiniMax-M2.1",
                    "fallbacks": ["qwen-portal/coder-model", "kimi-coding/k2p5"],
                    "memory_namespace": "finance"
                }
            }
        }
    
    def dispatch(self, task: str) -> Dict[str, Any]:
        """
        主调度逻辑（5步）
        
        1. 识别任务类型
        2. 选择对应角色
        3. 调用对应 system prompt
        4. 输出结果
        5. 记录到对应 memory
        """
        print(f"\n{'='*60}")
        print(f"[Chief Agent] 收到任务: {task[:50]}...")
        print(f"{'='*60}\n")
        
        # Step 1: 识别任务类型
        agent_type = self._identify_task_type(task)
        print(f"[Step 1] 识别任务类型: {agent_type}")
        
        # Step 2: 选择对应角色
        can_execute, reason = self._select_agent(agent_type)
        if not can_execute:
            return {
                "success": False,
                "error": reason,
                "agent": None,
                "result": None
            }
        print(f"[Step 2] 选择 Agent: {agent_type}")
        
        # Step 3: 调用对应 system prompt
        system_prompt = self._load_system_prompt(agent_type)
        model_config = self._get_model_config(agent_type)
        print(f"[Step 3] 加载 System Prompt 和模型配置")
        print(f"         主力模型: {model_config['primary']}")
        print(f"         Fallback: {', '.join(model_config['fallbacks'])}")
        
        # Step 4: 输出结果（简化版，实际调用模型）
        result = {
            "agent": agent_type,
            "system_prompt": system_prompt[:100] + "...",
            "model": model_config['primary'],
            "fallbacks": model_config['fallbacks'],
            "task": task,
            "timestamp": datetime.now().isoformat()
        }
        print(f"[Step 4] 准备执行...")
        
        # Step 5: 记录到对应 memory
        self._save_to_memory(agent_type, task, result)
        print(f"[Step 5] 记录到 memory namespace: {model_config['memory_namespace']}")
        
        # 更新当前 Agent
        self.active_agent = agent_type
        
        print(f"\n{'='*60}")
        print(f"[完成] Agent '{agent_type}' 已激活")
        print(f"{'='*60}\n")
        
        return {
            "success": True,
            "agent": agent_type,
            "config": model_config,
            "result": result
        }
    
    def _identify_task_type(self, task: str) -> str:
        """
        Step 1: 识别任务类型
        基于关键词匹配选择 Agent
        """
        task_lower = task.lower()
        
        # 关键词匹配
        for agent_type, config in self.config["agents"].items():
            keywords = config.get("keywords", [])
            for keyword in keywords:
                if keyword.lower() in task_lower:
                    return agent_type
        
        # 默认返回 content（内容创作最常用）
        return "content"
    
    def _select_agent(self, agent_type: str) -> tuple[bool, str]:
        """
        Step 2: 选择对应角色
        检查互斥规则，确保单 Agent 执行
        """
        agent_config = self.config["agents"].get(agent_type, {})
        
        # 检查互斥 Agent
        mutex_with = agent_config.get("mutex_with", [])
        if self.active_agent and self.active_agent in mutex_with:
            return False, f"无法激活 {agent_type}，因为 {self.active_agent} 正在运行（互斥规则）"
        
        # 检查当前是否有 Agent 在运行
        if self.active_agent and self.active_agent != agent_type:
            print(f"[注意] 切换 Agent: {self.active_agent} → {agent_type}")
        
        return True, "OK"
    
    def _load_system_prompt(self, agent_type: str) -> str:
        """Step 3: 加载 system prompt"""
        prompt_file = f"/root/.openclaw/workspace/agents/prompts/{agent_type}_system.md"
        
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read()
        
        # 如果文件不存在，返回默认提示
        return f"# {agent_type.upper()} Agent\n你是 {agent_type} Agent，请帮助用户完成任务。"
    
    def _get_model_config(self, agent_type: str) -> Dict[str, Any]:
        """获取模型配置（包含 fallback）"""
        return self.config["agents"].get(agent_type, {
            "model": "kimi-coding/k2p5",
            "fallbacks": ["minimax-cn/MiniMax-M2.1"],
            "memory_namespace": agent_type
        })
    
    def _save_to_memory(self, agent_type: str, task: str, result: Dict[str, Any]):
        """Step 5: 记录到对应 memory namespace"""
        memory_namespace = self.config["agents"][agent_type]["memory_namespace"]
        memory_file = f"{self.memory_path}/{memory_namespace}/tasks.jsonl"
        
        # 确保目录存在
        os.makedirs(os.path.dirname(memory_file), exist_ok=True)
        
        # 追加记录
        record = {
            "timestamp": datetime.now().isoformat(),
            "agent": agent_type,
            "task": task,
            "result_summary": str(result)[:200]
        }
        
        with open(memory_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
    
    def release_agent(self):
        """释放当前 Agent（任务完成后调用）"""
        if self.active_agent:
            print(f"[Chief] 释放 Agent: {self.active_agent}")
            self.active_agent = None
    
    def get_status(self) -> Dict[str, Any]:
        """获取当前状态"""
        return {
            "active_agent": self.active_agent,
            "available_agents": list(self.config["agents"].keys()),
            "memory_path": self.memory_path
        }


# ============================================
# 使用示例
# ============================================

if __name__ == "__main__":
    # 初始化 Chief Agent
    chief = ChiefAgent()
    
    print("="*60)
    print("Chief Agent - 最小调度逻辑 MVP")
    print("="*60)
    print(f"\n可用 Agents: {', '.join(chief.get_status()['available_agents'])}")
    print(f"Memory 路径: {chief.memory_path}\n")
    
    # 测试用例 1: Content Agent
    print("\n" + "="*60)
    print("测试 1: 内容创作任务")
    print("="*60)
    result1 = chief.dispatch("帮我写一份AI日报，包含今天的AI行业新闻")
    chief.release_agent()
    
    # 测试用例 2: Coding Agent
    print("\n" + "="*60)
    print("测试 2: 代码开发任务")
    print("="*60)
    result2 = chief.dispatch("帮我写一个Python脚本，爬取网页数据")
    chief.release_agent()
    
    # 测试用例 3: Product Agent（应显示互斥警告）
    print("\n" + "="*60)
    print("测试 3: 互斥规则测试（Coding 和 Product）")
    print("="*60)
    result3 = chief.dispatch("帮我写一个Python脚本")
    if result3["success"]:
        # 尝试并行启动 Product（应该失败）
        result4 = chief.dispatch("帮我写一份PRD文档")
        if not result4["success"]:
            print(f"[预期行为] 互斥检测生效: {result4['error']}")
    chief.release_agent()
    
    print("\n" + "="*60)
    print("所有测试完成！")
    print("="*60)
