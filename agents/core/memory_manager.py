#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Memory Manager - 记忆管理器
职责: 统一管理所有Memory读写操作
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

class MemoryManager:
    """
    Memory Manager - 集中式记忆管理
    
    设计原则:
    - 只有Chief有写入权限
    - Sub-Agent只读
    - 所有报告append-only
    
    目录结构:
    memory/
    ├── chief/
    │   ├── strategic_memory.md
    │   ├── company_rules.md
    │   └── vision.md
    ├── projects/
    │   └── default_project.md
    ├── reports/
    │   └── YYYYMMDD_report.md
    └── agent_cache/
        └── {agent_type}/
    """
    
    def __init__(self, base_path: str = "/root/.openclaw/workspace/memory"):
        self.base_path = base_path
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保目录存在"""
        dirs = [
            f"{self.base_path}/chief",
            f"{self.base_path}/projects",
            f"{self.base_path}/reports",
            f"{self.base_path}/agent_cache",
        ]
        for d in dirs:
            os.makedirs(d, exist_ok=True)
    
    # ==================== 读取操作 ====================
    
    def read_strategic_memory(self) -> str:
        """读取战略记忆"""
        return self._read_file("chief/strategic_memory.md")
    
    def read_company_rules(self) -> str:
        """读取公司规则"""
        return self._read_file("chief/company_rules.md")
    
    def read_vision(self) -> str:
        """读取愿景"""
        return self._read_file("chief/vision.md")
    
    def read_project(self, project_name: str = "default") -> str:
        """读取项目状态"""
        return self._read_file(f"projects/{project_name}.md")
    
    def search_memory(self, query: str) -> List[Dict[str, Any]]:
        """搜索记忆 (简化版)"""
        results = []
        
        # 搜索 chief 目录
        for filename in ["strategic_memory.md", "company_rules.md", "vision.md"]:
            filepath = f"{self.base_path}/chief/{filename}"
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if query.lower() in content.lower():
                        results.append({
                            "source": f"chief/{filename}",
                            "content": content[:500]
                        })
        
        return results
    
    # ==================== 写入操作 ====================
    
    def record_task(self, agent_type: str, task: str, result: Dict[str, Any]):
        """记录任务执行结果 (append-only)"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"{self.base_path}/reports/{timestamp}_{agent_type}_task.md"
        
        content = f"""# 任务记录 | {timestamp}

## Agent: {agent_type}
## 任务: {task}

### 结果
```json
{json.dumps(result, ensure_ascii=False, indent=2)}
```

---
*由 Chief Agent 记录*
"""
        
        self._write_file(report_file, content)
    
    def update_strategic_memory(self, content: str):
        """更新战略记忆"""
        self._write_file("chief/strategic_memory.md", content)
    
    def append_strategic_memory(self, new_content: str):
        """追加战略记忆"""
        existing = self.read_strategic_memory()
        updated = existing + f"\n\n---\n\n## {datetime.now().strftime('%Y-%m-%d')}\n\n{new_content}"
        self._write_file("chief/strategic_memory.md", updated)
    
    def update_company_rules(self, content: str):
        """更新公司规则"""
        self._write_file("chief/company_rules.md", content)
    
    def update_vision(self, content: str):
        """更新愿景"""
        self._write_file("chief/vision.md", content)
    
    def update_project(self, project_name: str, content: str):
        """更新项目状态"""
        self._write_file(f"projects/{project_name}.md", content)
    
    # ==================== Agent缓存 ====================
    
    def write_agent_cache(self, agent_type: str, session_id: str, content: str):
        """写入Agent执行缓存"""
        cache_dir = f"{self.base_path}/agent_cache/{agent_type}"
        os.makedirs(cache_dir, exist_ok=True)
        
        cache_file = f"{cache_dir}/{session_id}.md"
        self._write_file(cache_file, content)
    
    def read_agent_context(self, agent_type: str) -> Optional[str]:
        """读取Agent上下文 (仅用于执行，不参与战略)"""
        cache_dir = f"{self.base_path}/agent_cache/{agent_type}"
        
        if not os.path.exists(cache_dir):
            return None
        
        # 读取最新的缓存
        files = sorted(os.listdir(cache_dir), reverse=True)
        if files:
            return self._read_file(f"agent_cache/{agent_type}/{files[0]}")
        
        return None
    
    # ==================== 辅助方法 ====================
    
    def _read_file(self, relative_path: str) -> str:
        """读取文件"""
        filepath = f"{self.base_path}/{relative_path}"
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        return ""
    
    def _write_file(self, relative_path: str, content: str):
        """写入文件"""
        filepath = f"{self.base_path}/{relative_path}"
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def get_status(self) -> Dict[str, Any]:
        """获取Memory状态"""
        return {
            "base_path": self.base_path,
            "chief_files": os.listdir(f"{self.base_path}/chief") if os.path.exists(f"{self.base_path}/chief") else [],
            "projects": os.listdir(f"{self.base_path}/projects") if os.path.exists(f"{self.base_path}/projects") else [],
            "reports_count": len(os.listdir(f"{self.base_path}/reports")) if os.path.exists(f"{self.base_path}/reports") else 0,
        }
