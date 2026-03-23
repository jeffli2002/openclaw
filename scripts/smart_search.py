#!/usr/bin/env python3
"""
Smart Search - 智能网络搜索（Tavily 优先，Brave 兜底）
支持 --json 结构化输出模式，兼容 Agent 工具调用
"""

import os
import sys
import json
import argparse
import requests
from typing import List, Dict, Any, Optional

CRED_DIR = "/root/.openclaw/credentials"


def get_credential(filename: str) -> Optional[str]:
    """从 credentials 目录读取 API Key"""
    path = os.path.join(CRED_DIR, filename)
    try:
        with open(path) as f:
            return json.load(f).get("api_key", "")
    except Exception:
        return None


def search_tavily(query: str, max_results: int = 10) -> Dict[str, Any]:
    """
    直接调用 Tavily API（不通过子进程）
    Returns: {"ok": bool, "results": list, "error": str or None}
    """
    api_key = get_credential("tavily.json")
    if not api_key:
        return {"ok": False, "results": [], "error": "No Tavily API key in credentials/tavily.json"}

    url = "https://api.tavily.com/search"
    headers = {"Content-Type": "application/json"}
    data = {
        "api_key": api_key,
        "query": query,
        "max_results": max_results,
        "include_answer": True,
        "include_raw_content": False,
        "include_images": False,
    }

    try:
        resp = requests.post(url, json=data, headers=headers, timeout=30)
        resp.raise_for_status()
        raw = resp.json()

        results = []
        for item in raw.get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
                "score": item.get("score", 0),
            })

        answer = raw.get("answer", "")
        return {"ok": True, "results": results, "answer": answer, "error": None}
    except Exception as e:
        return {"ok": False, "results": [], "error": str(e)}


def search_brave(query: str, max_results: int = 10) -> Dict[str, Any]:
    """
    调用 Brave Search API
    Returns: {"ok": bool, "results": list, "error": str or None}
    """
    api_key = get_credential("brave.json")
    if not api_key:
        return {"ok": False, "results": [], "error": "No Brave API key in credentials/brave.json"}

    url = f"https://api.search.brave.com/res/v1/web/search?q={query}&count={max_results}"
    headers = {
        "X-Subscription-Token": api_key,
        "Accept": "application/json",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code != 200:
            return {"ok": False, "results": [], "error": f"Brave API error: {resp.status_code}"}

        data = resp.json()
        results = []
        for item in data.get("web", {}).get("results", []):
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("description", ""),
                "score": 0,
            })
        return {"ok": True, "results": results, "answer": "", "error": None}
    except Exception as e:
        return {"ok": False, "results": [], "error": str(e)}


def format_text(results: List[Dict], answer: str = "") -> str:
    """人类可读的文本格式"""
    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"{i}. {r.get('title', 'No title')}")
        lines.append(f"   URL: {r.get('url', 'No URL')}")
        content = r.get("content", "")
        if content:
            truncated = content[:200] + "..." if len(content) > 200 else content
            lines.append(f"   {truncated}")
        lines.append("")
    if answer:
        lines.insert(0, f"📌 AI 摘要: {answer}\n")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Smart Search: Tavily → Brave (structured output)")
    parser.add_argument("query", help="Search query string")
    parser.add_argument("--max-results", "-n", type=int, default=10, help="Max results (default: 10)")
    parser.add_argument("--json", "-j", action="store_true", help="Output pure JSON (no logs/emoji)")
    parser.add_argument("--provider", "-p", choices=["auto", "tavily", "brave"], default="auto",
                        help="Force specific provider")

    args = parser.parse_args()

    # 执行搜索
    if args.provider == "auto":
        result = search_tavily(args.query, args.max_results)
        provider = "Tavily"
        if not result["ok"]:
            result = search_brave(args.query, args.max_results)
            provider = "Brave"
    elif args.provider == "tavily":
        result = search_tavily(args.query, args.max_results)
        provider = "Tavily"
    else:
        result = search_brave(args.query, args.max_results)
        provider = "Brave"

    # JSON 模式：纯结构化输出（Agent 工具调用用这个）
    if args.json:
        output = {
            "ok": result["ok"],
            "provider": provider,
            "query": args.query,
            "count": len(result.get("results", [])),
            "results": result.get("results", []),
        }
        if result.get("answer"):
            output["answer"] = result["answer"]
        if result.get("error"):
            output["error"] = result["error"]
        print(json.dumps(output, indent=2, ensure_ascii=False))
        sys.exit(0 if result["ok"] else 1)

    # 人类模式：带日志和 emoji
    if result["ok"]:
        print(f"✅ {provider} succeeded — {len(result['results'])} results")
        if result.get("answer"):
            print(f"\n📌 AI 摘要:\n{result['answer']}\n")
        print(format_text(result["results"]))
    else:
        print(f"❌ All providers failed: {result.get('error', 'unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
