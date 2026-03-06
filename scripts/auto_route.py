#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auto Route Planner - 自动路由规划器
用途:
- 当 Chief Agent 收到私聊消息时，调用关键词分类器
- 输出“谁更适合处理”以及“当前应该怎么执行”的计划

注意:
- 这个脚本不会直接调用 OpenClaw 的 sessions_send / sessions_spawn
- 真正的任务分发需要由上层 runtime / tool 层执行
"""

import argparse
import json

from agent_keyword_router import AgentKeywordRouter


def build_dispatch_summary(result: dict) -> dict:
    execution_plan = result.get("execution_plan", {})
    kind = execution_plan.get("kind")
    target_agent = result.get("target_agent")

    if kind == "chief_direct":
        next_step = "Chief 直接处理"
    elif kind == "triage":
        next_step = "Chief 先追问/拆分任务，再决定是否委派"
    else:
        next_step = "若 runtime 已有目标 Agent 执行链路，则委派；否则进入 Chief 降级执行模式"

    return {
        "target_agent": target_agent,
        "execution_kind": kind,
        "recommended_action": execution_plan.get("recommended_action"),
        "requires_runtime_dispatch": execution_plan.get("requires_runtime_dispatch", False),
        "fallback_when_dispatch_unavailable": execution_plan.get(
            "fallback_when_dispatch_unavailable"
        ),
        "next_step": next_step,
        "runtime_note": "当前脚本只负责分类和执行建议，不直接触发 sessions_send / sessions_spawn。",
    }


def main():
    parser = argparse.ArgumentParser(description="自动路由消息到对应 Agent（分类 + 执行建议）")
    parser.add_argument("message", help="用户消息内容")
    parser.add_argument("--sender", default="user", help="发送者 ID")
    parser.add_argument("--json", action="store_true", help="输出 JSON 格式")
    args = parser.parse_args()

    router = AgentKeywordRouter()
    result = router.route_message(args.message, args.sender)
    dispatch_summary = build_dispatch_summary(result)

    if args.json:
        payload = {**result, "dispatch_summary": dispatch_summary}
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    print(router.format_route_result(result))
    print()
    print("🛠️ 执行建议")
    print(f"- 下一步: {dispatch_summary['next_step']}")
    print(f"- 是否依赖 runtime 分发: {'是' if dispatch_summary['requires_runtime_dispatch'] else '否'}")
    if dispatch_summary.get("fallback_when_dispatch_unavailable"):
        print(f"- 降级策略: {dispatch_summary['fallback_when_dispatch_unavailable']}")
    print(f"- 说明: {dispatch_summary['runtime_note']}")


if __name__ == "__main__":
    main()
