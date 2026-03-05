#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auto Route Executor - 自动路由执行器
用途: 当Chief Agent收到消息时，自动解析关键词并路由到对应Agent

使用方法:
    python3 /root/.openclaw/workspace/scripts/auto_route.py "用户消息" [--sender user_id]
"""

import sys
import json
import argparse
from agent_keyword_router import AgentKeywordRouter

def main():
    parser = argparse.ArgumentParser(description='自动路由消息到对应Agent')
    parser.add_argument('message', help='用户消息内容')
    parser.add_argument('--sender', default='user', help='发送者ID')
    parser.add_argument('--json', action='store_true', help='输出JSON格式')
    
    args = parser.parse_args()
    
    # 创建路由器
    router = AgentKeywordRouter()
    
    # 执行路由
    result = router.route_message(args.message, args.sender)
    
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(router.format_route_result(result))
        print()
        print(f"🎯 建议操作:")
        print(f"   sessions_send(")
        print(f"       session_key='agent:{result['target_agent']}:auto-{result['timestamp'][:10]}',")
        print(f"       message='任务: {args.message}\\n匹配原因: 关键词 {', '.join(result['matched_keywords'])}'")
        print(f"   )")

if __name__ == "__main__":
    main()
