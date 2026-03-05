#!/usr/bin/env python3
"""
Tavily Web Search Script
用于替代 Brave Search 的 Tavily 搜索引擎
"""

import os
import sys
import json
import argparse
import requests
from typing import List, Dict, Any

# Tavily API Key
TAVILY_API_KEY = os.environ.get("TAVILY_WEBSEARCH_API_KEY") or os.environ.get("TAVILY_API_KEY")

def search_tavily(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """
    使用 Tavily API 进行搜索
    
    Args:
        query: 搜索关键词
        max_results: 最大结果数
    
    Returns:
        搜索结果列表
    """
    if not TAVILY_API_KEY:
        return [{"error": "Tavily API key not found. Set TAVILY_API_KEY or TAVILY_WEBSEARCH_API_KEY environment variable."}]
    
    url = "https://api.tavily.com/search"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "max_results": max_results,
        "include_answer": True,
        "include_raw_content": False,
        "include_images": False
    }
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        response.raise_for_status()
        results = response.json()
        
        # 格式化结果
        formatted_results = []
        for item in results.get("results", []):
            formatted_results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
                "score": item.get("score", 0)
            })
        
        return formatted_results
        
    except Exception as e:
        return [{"error": str(e)}]

def main():
    parser = argparse.ArgumentParser(description="Tavily Web Search")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--max-results", "-n", type=int, default=10, help="Max results (default: 10)")
    parser.add_argument("--format", "-f", choices=["text", "json"], default="text", help="Output format")
    
    args = parser.parse_args()
    
    results = search_tavily(args.query, args.max_results)
    
    if args.format == "json":
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        # 文本格式输出
        for i, result in enumerate(results, 1):
            if "error" in result:
                print(f"Error: {result['error']}")
                break
            print(f"{i}. {result.get('title', 'No title')}")
            print(f"   URL: {result.get('url', 'No URL')}")
            content = result.get('content', '')
            if content:
                print(f"   Content: {content[:200]}..." if len(content) > 200 else f"   Content: {content}")
            print()

if __name__ == "__main__":
    main()
