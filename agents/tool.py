#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenClaw Tool Interface - Agent Orchestrator
暴露给OpenClaw的调用入口
"""

import sys
import json
import argparse

# 添加core到路径
sys.path.insert(0, '/root/.openclaw/workspace/agents')

from core.chief_agent import ChiefAgent

def dispatch_task(agent_type: str, task: str, context: dict = None) -> dict:
    """
    主调度函数 - 供OpenClaw调用
    
    Args:
        agent_type: Agent类型 (content/growth/coding/product/finance/chief)
        task: 任务描述
        context: 可选上下文
    
    Returns:
        执行结果
    """
    chief = ChiefAgent()
    
    # 如果需要特定agent，在task中标注
    if agent_type != 'chief':
        task = f"[{agent_type}] {task}"
    
    result = chief.process_task(task)
    return result

def main():
    """CLI入口"""
    parser = argparse.ArgumentParser(description='Agent Orchestrator Tool')
    parser.add_argument('--agent', required=True, 
                       help='Agent类型: content/growth/coding/product/finance/chief')
    parser.add_argument('--task', required=True, help='任务描述')
    parser.add_argument('--context', help='上下文JSON字符串')
    
    args = parser.parse_args()
    
    context = json.loads(args.context) if args.context else None
    
    result = dispatch_task(args.agent, args.task, context)
    
    # 输出JSON结果给OpenClaw
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
