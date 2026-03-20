#!/usr/bin/env python3
"""
Smart Search - 先尝试 Tavily，失败则回退到 Brave
"""

import os
import sys
import json
import subprocess
import argparse

def run_command(cmd):
    """执行命令并返回结果"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def search_tavily(query, max_results=10):
    """使用 Tavily 搜索"""
    api_key = get_credential("tavily.json")
    if api_key:
        os.environ["TAVILY_API_KEY"] = api_key
    
    script = "/root/.openclaw/workspace/scripts/tavily_search.py"
    cmd = f'python3 {script} "{query}" --max-results {max_results}'
    
    code, stdout, stderr = run_command(cmd)
    
    if code == 0 and stdout and "error" not in stdout.lower():
        return True, stdout
    return False, stderr or "Tavily search failed"

def get_credential(filename):
    """从 credentials 目录读取凭据"""
    cred_path = f"/root/.openclaw/credentials/{filename}"
    try:
        with open(cred_path) as f:
            return json.load(f).get("api_key", "")
    except:
        return os.environ.get(filename.replace(".json", "").upper() + "_API_KEY", "")

def search_brave(query, max_results=10):
    """使用 Brave API 搜索"""
    api_key = get_credential("brave.json")
    
    if not api_key:
        return False, "No Brave API key"
    
    url = f"https://api.search.brave.com/res/v1/web/search?q={query}&count={max_results}"
    headers = {
        "X-Subscription-Token": api_key,
        "Accept": "application/json"
    }
    
    try:
        import requests
        resp = requests.get(url, headers=headers, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("web", {}).get("results", [])
            
            output = []
            for i, r in enumerate(results, 1):
                output.append(f"{i}. {r.get('title', 'No title')}")
                output.append(f"   URL: {r.get('url', 'No URL')}")
                desc = r.get('description', '')
                if desc:
                    output.append(f"   {desc[:200]}..." if len(desc) > 200 else f"   {desc}")
                output.append("")
            
            return True, "\n".join(output)
        else:
            return False, f"Brave API error: {resp.status_code}"
            
    except Exception as e:
        return False, str(e)

def main():
    parser = argparse.ArgumentParser(description="Smart Search: Tavily → Brave")
    parser.add_argument("query", help="Search query")
    parser.add_argument("--max-results", "-n", type=int, default=10)
    parser.add_argument("--verbose", "-v", action="store_true")
    
    args = parser.parse_args()
    
    print(f"🔍 Searching: {args.query}")
    
    # 先尝试 Tavily
    print("📡 Trying Tavily...")
    success, result = search_tavily(args.query, args.max_results)
    
    if success:
        print("✅ Tavily succeeded!")
        print(result)
        return
    
    # Tavily 失败，回退到 Brave
    print(f"⚠️ Tavily failed: {result[:100]}...")
    print("📡 Falling back to Brave...")
    
    success, result = search_brave(args.query, args.max_results)
    
    if success:
        print("✅ Brave succeeded!")
        print(result)
    else:
        print(f"❌ Both failed: {result}")

if __name__ == "__main__":
    main()
