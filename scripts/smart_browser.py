#!/usr/bin/env python3
"""
Smart Browser Router - 智能选择 browser-use 或 agent-browser

使用场景判断:
- browser-use: 远程/沙盒环境, AI Agent任务, 复杂多步骤操作
- agent-browser: 本地有GUI, 快速简单操作, 需要本地浏览器功能
"""

import os
import sys
import subprocess

# 配置
BROWSER_USE_API_KEY = os.environ.get("BROWSER_USE_API_KEY", "bu_asA1iDkZjaZlZoWaGoWJrh-ocb3ZyiygObrc1XFx5Jo")

def has_gui():
    """检查是否有本地GUI"""
    return os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")

def use_browser_use(task_type: str) -> bool:
    """
    判断是否使用 browser-use
    - AI Agent 任务
    - 远程/沙盒环境
    - 复杂多步骤操作
    """
    ai_tasks = ["run", "agent", "ai", "research", "search", "extract", "crawl"]
    complex_tasks = ["fill", "login", "scroll", "extract", "automation"]
    
    task_lower = task_type.lower()
    
    # AI任务或复杂任务用 browser-use
    if any(t in task_lower for t in ai_tasks):
        return True
    if any(t in task_lower for t in complex_tasks) and not has_gui():
        return True
    
    # 默认: 沙盒环境用 browser-use
    return not has_gui()

def exec_browser_use(args: list):
    """执行 browser-use"""
    env = os.environ.copy()
    env["BROWSER_USE_API_KEY"] = BROWSER_USE_API_KEY
    
    cmd = ["browser-use", "--browser", "remote"] + args
    print(f"→ Using browser-use: {' '.join(args[:2])}...")
    result = subprocess.run(cmd, env=env)
    return result.returncode

def exec_agent_browser(args: list):
    """执行 agent-browser"""
    cmd = ["agent-browser"] + args
    print(f"→ Using agent-browser: {' '.join(args[:2])}...")
    result = subprocess.run(cmd)
    return result.returncode

def smart_browser(args: list):
    """智能路由器"""
    if not args:
        print("Usage: smart-browser <command> [args...]")
        print("\nCommands:")
        print("  open <url>              - 打开网页")
        print("  run <task>              - AI Agent任务 (自动选择browser-use)")
        print("  state                   - 获取页面元素")
        print("  click <index>           - 点击元素")
        print("  screenshot [file]      - 截图")
        print("  close                   - 关闭浏览器")
        return 1
    
    command = args[0]
    
    # 判断使用哪个浏览器
    if use_browser_use(command):
        return exec_browser_use(args)
    else:
        return exec_agent_browser(args)

if __name__ == "__main__":
    sys.exit(smart_browser(sys.argv[1:]))
