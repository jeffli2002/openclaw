#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chief Agent - 最小调度逻辑实现
现状定位：
- 负责 Chief 侧的任务分类与调度建议
- 优先复用 runtime 真相源：openclaw.json + agent_keyword_router.yaml
- 不假设一定存在可直接调用的 Sub Agent session
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

SCRIPTS_DIR = Path("/root/.openclaw/workspace/scripts")
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

try:
    from agent_keyword_router import AgentKeywordRouter
except Exception:
    AgentKeywordRouter = None


class ChiefAgent:
    """Chief Agent - AI CEO 助理和调度中枢"""

    def __init__(self, config_path: str = "agents/config.yaml"):
        self.active_agent: Optional[str] = None
        self.config_path = config_path
        self.router = AgentKeywordRouter() if AgentKeywordRouter else None
        self.config = self._load_config(config_path)
        self.memory_path = "/root/.openclaw/workspace/memory/global"
        os.makedirs(self.memory_path, exist_ok=True)

    def _load_runtime_models(self) -> Dict[str, Dict[str, Any]]:
        runtime_path = "/root/.openclaw/openclaw.json"
        models: Dict[str, Dict[str, Any]] = {}

        if not os.path.exists(runtime_path):
            return models

        with open(runtime_path, "r", encoding="utf-8") as f:
            runtime = json.load(f)

        for agent in runtime.get("agents", {}).get("list", []):
            agent_id = agent.get("id")
            model = agent.get("model", {})
            if not agent_id:
                continue
            models[agent_id] = {
                "model": model.get("primary"),
                "fallbacks": model.get("fallbacks", []),
                "memory_namespace": "chief" if agent_id == "main" else agent_id,
            }

        return models

    def _load_router_rules(self) -> Dict[str, Dict[str, Any]]:
        router_path = "/root/.openclaw/workspace/config/agent_keyword_router.yaml"
        rules: Dict[str, Dict[str, Any]] = {}

        if not os.path.exists(router_path):
            return rules

        with open(router_path, "r", encoding="utf-8") as f:
            router_config = yaml.safe_load(f) or {}

        for rule in router_config.get("rules", []):
            agent_id = rule.get("agent")
            if not agent_id:
                continue
            rules[agent_id] = {
                "keywords": [kw for kw in rule.get("keywords", []) if kw != "*"],
                "name": rule.get("name", agent_id),
            }

        return rules

    def _load_config(self, path: str) -> Dict[str, Any]:
        """从 runtime 配置和关键词路由规则生成当前可用配置。"""
        runtime_models = self._load_runtime_models()
        router_rules = self._load_router_rules()

        agents: Dict[str, Dict[str, Any]] = {}
        for agent_id, model_cfg in runtime_models.items():
            routed_id = "chief" if agent_id == "main" else agent_id
            rule_cfg = router_rules.get(routed_id, {})
            agents[routed_id] = {
                "keywords": rule_cfg.get("keywords", []),
                "name": rule_cfg.get("name", routed_id),
                "model": model_cfg.get("model"),
                "fallbacks": model_cfg.get("fallbacks", []),
                "memory_namespace": model_cfg.get("memory_namespace", routed_id),
            }

        if not agents:
            agents = {
                "chief": {
                    "keywords": [],
                    "name": "Chief Agent",
                    "model": "openai-code/gpt-5.4",
                    "fallbacks": ["minimax-cn/MiniMax-M2.5", "kimi-coding/k2p5"],
                    "memory_namespace": "chief",
                },
                "content": {
                    "keywords": ["内容", "日报", "文章", "公众号", "写作"],
                    "name": "Content Agent",
                    "model": "minimax-cn/MiniMax-M2.5",
                    "fallbacks": ["kimi-coding/k2p5"],
                    "memory_namespace": "content",
                },
                "growth": {
                    "keywords": ["增长", "SEO", "营销", "推广", "转化"],
                    "name": "Growth Agent",
                    "model": "minimax-cn/MiniMax-M2.5",
                    "fallbacks": ["kimi-coding/k2p5"],
                    "memory_namespace": "growth",
                },
                "coding": {
                    "keywords": ["代码", "编程", "API", "Bug", "重构", "架构", "开发"],
                    "name": "Coding Agent",
                    "model": "openai-code/gpt-5.4",
                    "fallbacks": ["minimax-cn/MiniMax-M2.5", "kimi-coding/k2p5"],
                    "memory_namespace": "coding",
                },
                "product": {
                    "keywords": ["产品", "PRD", "需求", "功能", "用户", "MVP"],
                    "name": "Product Agent",
                    "model": "minimax-cn/MiniMax-M2.5",
                    "fallbacks": ["kimi-coding/k2p5"],
                    "memory_namespace": "product",
                },
                "finance": {
                    "keywords": ["财务", "成本", "定价", "收入", "现金流", "ROI"],
                    "name": "Finance Agent",
                    "model": "minimax-cn/MiniMax-M2.5",
                    "fallbacks": ["kimi-coding/k2p5"],
                    "memory_namespace": "finance",
                },
            }

        return {"agents": agents}

    def dispatch(self, task: str) -> Dict[str, Any]:
        """返回任务分类与调度建议。"""
        agent_type = self._identify_task_type(task)
        can_execute, reason = self._select_agent(agent_type)
        if not can_execute:
            return {"success": False, "error": reason, "agent": None, "result": None}

        model_config = self._get_model_config(agent_type)
        result = {
            "agent": agent_type,
            "agent_name": self.config["agents"][agent_type].get("name", agent_type),
            "model": model_config["primary"],
            "fallbacks": model_config["fallbacks"],
            "task": task,
            "timestamp": datetime.now().isoformat(),
            "dispatch_mode": "chief_direct" if agent_type == "chief" else "delegate_candidate",
            "note": "若 runtime 无法直接委派到目标 Agent，则由 Chief 按该领域规则降级执行。"
            if agent_type != "chief"
            else "由 Chief 直接处理。",
        }

        self._save_to_memory(agent_type, task, result)
        self.active_agent = agent_type

        return {"success": True, "agent": agent_type, "config": model_config, "result": result}

    def _identify_task_type(self, task: str) -> str:
        if self.router:
            result = self.router.route_message(task)
            return result.get("target_agent", "chief")

        task_lower = task.lower()
        best_agent = "chief"
        best_score = 0

        for agent_type, config in self.config["agents"].items():
            keywords = config.get("keywords", [])
            matches = [keyword for keyword in keywords if keyword.lower() in task_lower]
            if len(matches) > best_score:
                best_score = len(matches)
                best_agent = agent_type

        return best_agent

    def _select_agent(self, agent_type: str) -> tuple[bool, str]:
        if agent_type not in self.config["agents"]:
            return False, f"未知 Agent: {agent_type}"
        return True, "OK"

    def _get_model_config(self, agent_type: str) -> Dict[str, Any]:
        cfg = self.config["agents"].get(agent_type, {})
        return {
            "primary": cfg.get("model", "openai-code/gpt-5.4"),
            "fallbacks": cfg.get("fallbacks", ["minimax-cn/MiniMax-M2.5", "kimi-coding/k2p5"]),
            "memory_namespace": cfg.get("memory_namespace", agent_type),
        }

    def _save_to_memory(self, agent_type: str, task: str, result: Dict[str, Any]):
        agent_cfg = self.config["agents"].get(agent_type, {})
        memory_namespace = agent_cfg.get("memory_namespace", agent_type)
        memory_file = f"{self.memory_path}/{memory_namespace}/tasks.jsonl"
        os.makedirs(os.path.dirname(memory_file), exist_ok=True)

        record = {
            "timestamp": datetime.now().isoformat(),
            "agent": agent_type,
            "task": task,
            "result_summary": str(result)[:300],
        }

        with open(memory_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    def release_agent(self):
        if self.active_agent:
            self.active_agent = None

    def get_status(self) -> Dict[str, Any]:
        return {
            "active_agent": self.active_agent,
            "available_agents": list(self.config["agents"].keys()),
            "memory_path": self.memory_path,
            "config_source": {
                "runtime": "/root/.openclaw/openclaw.json",
                "router": "/root/.openclaw/workspace/config/agent_keyword_router.yaml",
                "legacy": self.config_path,
            },
        }


if __name__ == "__main__":
    chief = ChiefAgent()
    for task in [
        "帮我写一篇AI日报",
        "修复这个 API bug",
        "设计一个用户增长策略",
        "你现在在干什么",
    ]:
        print(json.dumps(chief.dispatch(task), ensure_ascii=False, indent=2))
