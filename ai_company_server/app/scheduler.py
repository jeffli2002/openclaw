#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scheduler - 任务调度器
职责: 管理定时任务和调度逻辑
"""

import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

class Scheduler:
    """
    Scheduler - 任务调度器
    
    职责:
    - 管理Cron任务
    - 计算下次运行时间
    - 检查任务状态
    
    设计原则:
    - Async parallel execution
    - Zero cross-agent context pollution
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.tasks: Dict[str, Dict] = {}
        
        # 加载预定义任务
        self._load_tasks()
    
    def _load_tasks(self):
        """加载预定义任务"""
        # 从配置中读取Cron任务
        cron_tasks = self.config.get("cron_tasks", [])
        
        for task in cron_tasks:
            self.tasks[task["id"]] = {
                "name": task["name"],
                "schedule": task["schedule"],  # cron表达式或every X ms
                "agent": task["agent"],
                "enabled": task.get("enabled", True),
                "next_run": self._calculate_next_run(task["schedule"]),
                "last_run": None,
                "status": "idle"
            }
    
    def _calculate_next_run(self, schedule: Dict) -> float:
        """计算下次运行时间 (毫秒时间戳)"""
        now_ms = int(time.time() * 1000)
        
        if "everyMs" in schedule:
            # 每隔X毫秒执行
            return now_ms + schedule["everyMs"]
        elif "cron" in schedule:
            # Cron表达式 (简化版)
            # 实际应使用 cron-parser 库
            return now_ms + 3600000  # 默认1小时
        
        return now_ms + 3600000
    
    def get_due_tasks(self) -> List[Dict[str, Any]]:
        """获取到期的任务"""
        now_ms = int(time.time() * 1000)
        due_tasks = []
        
        for task_id, task in self.tasks.items():
            if not task["enabled"]:
                continue
            
            if task["next_run"] <= now_ms:
                due_tasks.append({
                    "id": task_id,
                    "name": task["name"],
                    "agent": task["agent"],
                    "scheduled_for": task["next_run"]
                })
        
        return due_tasks
    
    def mark_running(self, task_id: str):
        """标记任务正在运行"""
        if task_id in self.tasks:
            self.tasks[task_id]["status"] = "running"
    
    def mark_completed(self, task_id: str, success: bool = True):
        """标记任务完成"""
        if task_id in self.tasks:
            self.tasks[task_id]["status"] = "idle" if success else "error"
            self.tasks[task_id]["last_run"] = int(time.time() * 1000)
            self.tasks[task_id]["next_run"] = self._calculate_next_run(
                self.tasks[task_id]["schedule"]
            )
    
    def add_task(self, task_id: str, name: str, schedule: Dict, agent: str):
        """添加新任务"""
        self.tasks[task_id] = {
            "name": name,
            "schedule": schedule,
            "agent": agent,
            "enabled": True,
            "next_run": self._calculate_next_run(schedule),
            "last_run": None,
            "status": "idle"
        }
    
    def remove_task(self, task_id: str):
        """移除任务"""
        if task_id in self.tasks:
            del self.tasks[task_id]
    
    def enable_task(self, task_id: str):
        """启用任务"""
        if task_id in self.tasks:
            self.tasks[task_id]["enabled"] = True
    
    def disable_task(self, task_id: str):
        """禁用任务"""
        if task_id in self.tasks:
            self.tasks[task_id]["enabled"] = False
    
    def get_status(self) -> Dict[str, Any]:
        """获取调度器状态"""
        return {
            "total_tasks": len(self.tasks),
            "enabled_tasks": sum(1 for t in self.tasks.values() if t["enabled"]),
            "due_tasks": len(self.get_due_tasks()),
            "tasks": [
                {
                    "id": k,
                    "name": v["name"],
                    "status": v["status"],
                    "enabled": v["enabled"],
                    "next_run": datetime.fromtimestamp(v["next_run"]/1000).isoformat(),
                    "last_run": datetime.fromtimestamp(v["last_run"]/1000).isoformat() if v["last_run"] else None
                }
                for k, v in self.tasks.items()
            ]
        }
    
    def validate_schedule(self, schedule: Dict) -> bool:
        """验证调度配置"""
        required_keys = ["kind"]
        return all(k in schedule for k in required_keys)
