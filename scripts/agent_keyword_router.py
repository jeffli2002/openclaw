#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Agent Keyword Router - 关键词自动路由系统
职责:
- 对 Chief 私聊消息做领域分类
- 输出路由候选和执行建议
- 不直接调用 OpenClaw tools；真实分发由 runtime / tool 层完成
"""

import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import yaml


class AgentKeywordRouter:
    """Chief 私聊的关键词分类器。"""

    def __init__(self, config_path: str = "/root/.openclaw/workspace/config/agent_keyword_router.yaml"):
        self.config_path = config_path
        self.rules: List[Dict] = []
        self.behavior: Dict = {}
        self.special_rules: Dict = {}
        self.message_handling: Dict = {}
        self.load_config()

    def load_config(self):
        """加载路由配置。"""
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                config = yaml.safe_load(f) or {}
            self.rules = config.get("rules", [])
            self.behavior = config.get("behavior", {})
            self.special_rules = config.get("special_rules", {})
            self.message_handling = config.get("message_handling", {})
        except Exception as e:
            print(f"加载配置失败: {e}")
            self.rules = self._default_rules()
            self.behavior = {"match_mode": "first_match", "min_keywords": 1}
            self.special_rules = {}
            self.message_handling = {}

    def _default_rules(self) -> List[Dict]:
        return [
            {
                "agent": "content",
                "name": "Content Agent",
                "keywords": ["内容", "日报", "文章", "公众号", "写作"],
                "priority": 100,
            },
            {
                "agent": "coding",
                "name": "Coding Agent",
                "keywords": ["代码", "编程", "开发", "Bug", "API"],
                "priority": 100,
            },
            {
                "agent": "product",
                "name": "Product Agent",
                "keywords": ["产品", "PRD", "需求", "功能", "用户"],
                "priority": 100,
            },
            {
                "agent": "growth",
                "name": "Growth Agent",
                "keywords": ["增长", "SEO", "营销", "推广", "转化"],
                "priority": 100,
            },
            {
                "agent": "finance",
                "name": "Finance Agent",
                "keywords": ["财务", "成本", "定价", "收入", "ROI"],
                "priority": 100,
            },
            {
                "agent": "chief",
                "name": "Chief Agent",
                "keywords": ["*"],
                "priority": 0,
            },
        ]

    def extract_keywords(self, message: str) -> List[str]:
        """从消息中提取关键词。"""
        if not message:
            return []

        raw = message.strip()
        lowered = raw.lower()
        keywords = set()

        chinese_pattern = re.compile(r"[\u4e00-\u9fff]{2,12}")
        english_pattern = re.compile(r"[a-zA-Z][a-zA-Z0-9+._/-]*")
        tech_pattern = re.compile(r"\b[A-Z]{2,}\b")

        for kw in chinese_pattern.findall(raw):
            keywords.add(kw)
        for kw in english_pattern.findall(lowered):
            keywords.add(kw)
        for kw in tech_pattern.findall(raw.upper()):
            keywords.add(kw.lower())

        return sorted(keywords)

    def _normalize(self, value: str) -> str:
        return value.lower().strip()

    def _rule_matches(self, extracted_keywords: List[str], rule: Dict) -> Tuple[List[str], float]:
        agent_keywords = [self._normalize(kw) for kw in rule.get("keywords", []) if kw != "*"]
        priority = float(rule.get("priority", 0))
        matches = []

        for keyword in extracted_keywords:
            normalized_keyword = self._normalize(keyword)
            for agent_kw in agent_keywords:
                if (
                    normalized_keyword == agent_kw
                    or normalized_keyword in agent_kw
                    or agent_kw in normalized_keyword
                ):
                    matches.append(keyword)
                    break

        unique_matches = sorted(set(matches))
        score = len(unique_matches) * (priority / 100)
        return unique_matches, score

    def rank_agents(self, message: str) -> List[Dict]:
        """返回所有非通配候选，按分数从高到低排序。"""
        extracted_keywords = self.extract_keywords(message)
        candidates: List[Dict] = []

        for rule in self.rules:
            if "*" in rule.get("keywords", []):
                continue

            matches, score = self._rule_matches(extracted_keywords, rule)
            if matches:
                candidates.append(
                    {
                        "agent": rule.get("agent"),
                        "agent_name": rule.get("name"),
                        "priority": rule.get("priority", 0),
                        "matched_keywords": matches,
                        "score": score,
                    }
                )

        candidates.sort(key=lambda item: (-item["score"], -int(item.get("priority", 0)), item["agent"]))
        return candidates

    def _chief_rule(self) -> Dict:
        for rule in self.rules:
            if rule.get("agent") == "chief" or "*" in rule.get("keywords", []):
                return rule
        return {"agent": "chief", "name": "Chief Agent", "keywords": ["*"], "priority": 0}

    def _contains_any(self, message: str, keywords: List[str]) -> List[str]:
        lowered = message.lower()
        hits = []
        for keyword in keywords:
            if keyword.lower() in lowered:
                hits.append(keyword)
        return hits

    def route_message(self, message: str, sender: str = "user") -> Dict:
        """路由消息到对应 Agent（分类 + 建议，不直接执行）。"""
        extracted_keywords = self.extract_keywords(message)
        candidates = self.rank_agents(message)
        min_keywords = int(self.behavior.get("min_keywords", 1) or 1)
        chief_rule = self._chief_rule()

        primary_candidate: Optional[Dict] = None
        if candidates and len(candidates[0].get("matched_keywords", [])) >= min_keywords:
            primary_candidate = candidates[0]

        tied_candidates: List[Dict] = []
        if primary_candidate:
            tied_candidates = [
                candidate
                for candidate in candidates[1:]
                if candidate["score"] == primary_candidate["score"]
            ]

        is_ambiguous = bool(primary_candidate and tied_candidates)
        urgent_hits = self._contains_any(message, self.special_rules.get("urgent_keywords", []))
        long_task_hits = self._contains_any(message, self.special_rules.get("long_task_keywords", []))

        if primary_candidate is None:
            matched_agent = chief_rule.get("agent", "chief")
            agent_name = chief_rule.get("name", "Chief Agent")
            match_score = 0.0
            matched_keywords: List[str] = []
            recommended_action = "chief_handle_directly"
            execution_kind = "chief_direct"
        elif is_ambiguous:
            matched_agent = primary_candidate["agent"]
            agent_name = primary_candidate["agent_name"]
            match_score = primary_candidate["score"]
            matched_keywords = primary_candidate["matched_keywords"]
            recommended_action = "chief_triage_or_split_task"
            execution_kind = "triage"
        else:
            matched_agent = primary_candidate["agent"]
            agent_name = primary_candidate["agent_name"]
            match_score = primary_candidate["score"]
            matched_keywords = primary_candidate["matched_keywords"]
            if matched_agent == "chief":
                recommended_action = "chief_handle_directly"
                execution_kind = "chief_direct"
            else:
                recommended_action = "delegate_if_runtime_available_else_chief_degraded_mode"
                execution_kind = "delegate_candidate"

        notes = []
        if execution_kind == "delegate_candidate":
            notes.append("需要由 runtime/tool 层决定是 sessions_send、sessions_spawn 还是降级为 Chief 自处理。")
        if execution_kind == "triage":
            notes.append("命中多个高分领域，建议 Chief 先追问或拆分任务，再决定委派目标。")
        if not primary_candidate:
            notes.append("未命中明确领域关键词，按 Chief 兜底处理。")
        if urgent_hits:
            notes.append(f"检测到紧急标识: {', '.join(urgent_hits)}")
        if long_task_hits:
            notes.append(f"检测到长任务标识: {', '.join(long_task_hits)}")

        return {
            "timestamp": datetime.now().isoformat(),
            "sender": sender,
            "message": message,
            "extracted_keywords": extracted_keywords,
            "candidates": candidates,
            "matched_agent": matched_agent,
            "agent_name": agent_name,
            "match_score": match_score,
            "matched_keywords": matched_keywords,
            "secondary_agents": [candidate["agent"] for candidate in tied_candidates],
            "is_ambiguous": is_ambiguous,
            "is_urgent": bool(urgent_hits),
            "urgent_hits": urgent_hits,
            "is_long_task": bool(long_task_hits),
            "long_task_hits": long_task_hits,
            "action": "route_to_agent",
            "target_agent": matched_agent,
            "execution_plan": {
                "kind": execution_kind,
                "recommended_action": recommended_action,
                "requires_runtime_dispatch": execution_kind == "delegate_candidate",
                "fallback_when_dispatch_unavailable": "chief_degraded_mode"
                if execution_kind == "delegate_candidate"
                else None,
            },
            "notes": notes,
        }

    def format_route_result(self, result: Dict) -> str:
        """格式化路由结果为可读文本。"""
        top_candidates = result.get("candidates", [])[:3]
        candidate_summary = " / ".join(
            f"{item['agent']}({item['score']:.2f})" for item in top_candidates
        ) or "chief(0.00)"

        lines = [
            "🔀 Agent 路由结果",
            "",
            f"📨 消息: {result['message'][:80]}",
            f"🔍 提取关键词: {', '.join(result['extracted_keywords'][:12]) or '无'}",
            f"🏁 主候选: {result['agent_name']} ({result['target_agent']})",
            f"📊 候选排行: {candidate_summary}",
            f"✅ 命中关键词: {', '.join(result['matched_keywords']) or '默认兜底'}",
            f"🧭 建议动作: {result['execution_plan']['recommended_action']}",
        ]

        if result.get("secondary_agents"):
            lines.append(f"⚠️ 次高候选: {', '.join(result['secondary_agents'])}")
        if result.get("is_urgent"):
            lines.append(f"🚨 紧急标识: {', '.join(result['urgent_hits'])}")
        if result.get("is_long_task"):
            lines.append(f"🧱 长任务标识: {', '.join(result['long_task_hits'])}")
        for note in result.get("notes", []):
            lines.append(f"💡 {note}")

        return "\n".join(lines)


def main():
    router = AgentKeywordRouter()

    test_messages = [
        "帮我写一篇关于AI的公众号文章",
        "修复这个API的Bug",
        "设计一个用户增长策略",
        "计算一下这个产品的ROI",
        "帮我写个PRD文档",
        "随便聊聊",
    ]

    print("=" * 60)
    print("Agent 关键词路由测试")
    print("=" * 60)

    for msg in test_messages:
        result = router.route_message(msg)
        print("\n" + router.format_route_result(result))
        print("-" * 60)


if __name__ == "__main__":
    main()
