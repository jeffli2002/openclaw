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
    - Chief: read all, write global
    - Sub-Agent: read/write own namespace only
    - 禁止跨agent访问
    
    目录结构 (新版):
    memory/
    ├── global/              # Chief可读写（全局战略）
    │   ├── strategic.md
    │   ├── rules.md
    │   └── vision.md
    ├── agents/              # Sub-Agent命名空间
    │   ├── coding/      # Coding可读写
    │   ├── growth/      # Growth可读写
    │   ├── content/     # Content可读写
    │   └── finance/    # Finance可读写
    └── reports/
    
    访问规则:
    - Chief: read all, write global
    - Sub-Agent: read/write own namespace only
    - 禁止跨agent访问
    """
    
    def __init__(self, base_path: str = "/root/.openclaw/workspace/memory"):
        self.base_path = base_path
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保目录存在"""
        dirs = [
            f"{self.base_path}/global",
            f"{self.base_path}/agents/coding",
            f"{self.base_path}/agents/growth",
            f"{self.base_path}/agents/content",
            f"{self.base_path}/agents/finance",
            f"{self.base_path}/agents/product",
            f"{self.base_path}/reports",
        ]
        for d in dirs:
            os.makedirs(d, exist_ok=True)
    
    # ========== Chief权限：全局读写 ==========
    
    def read_global(self) -> str:
        """读取全局Memory（Chief权限）"""
        return self._read_file("global/strategic.md")
    
    def write_global(self, content: str):
        """写入全局Memory（Chief权限）"""
        self._write_file("global/strategic.md", content)
    
    def read_rules(self) -> str:
        """读取规则"""
        return self._read_file("global/rules.md")
    
    def write_rules(self, content: str):
        """写入规则"""
        self._write_file("global/rules.md", content)
    
    def read_vision(self) -> str:
        """读取愿景"""
        return self._read_file("global/vision.md")
    
    def write_vision(self, content: str):
        """写入愿景"""
        self._write_file("global/vision.md", content)
    
    # ========== Sub-Agent权限：仅自己的namespace ==========
    
    def read_agent_memory(self, agent_type: str) -> str:
        """读取指定Agent的Memory（仅自己的namespace）"""
        safe_agent = self._sanitize_agent(agent_type)
        return self._read_file(f"agents/{safe_agent}/memory.md")
    
    def write_agent_memory(self, agent_type: str, content: str):
        """写入指定Agent的Memory（仅自己的namespace）"""
        safe_agent = self._sanitize_agent(agent_type)
        self._write_file(f"agents/{safe_agent}/memory.md", content)
    
    def append_agent_memory(self, agent_type: str, content: str):
        """追加Agent Memory（append-only）"""
        existing = self.read_agent_memory(agent_type)
        updated = existing + f"\n\n---\n\n{datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n{content}"
        self.write_agent_memory(agent_type, updated)
    
    def _sanitize_agent(self, agent_type: str) -> str:
        """安全验证：只允许指定的agent类型"""
        allowed = ["coding", "growth", "content", "finance", "product", "user"]
        if agent_type not in allowed:
            raise ValueError(f"Invalid agent type: {agent_type}")
        return agent_type
    
    # ========== 兼容旧接口 ==========
    
    def read_strategic_memory(self) -> str:
        """兼容旧接口"""
        return self.read_global()
    
    def read_company_rules(self) -> str:
        """兼容旧接口"""
        return self.read_rules()
    
    def update_strategic_memory(self, content: str):
        """兼容旧接口"""
        return self.write_global(content)
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
        return self._read_file("global/strategic_memory.md")
    
    def read_company_rules(self) -> str:
        """读取公司规则"""
        return self._read_file("global/company_rules.md")
    
    def read_vision(self) -> str:
        """读取愿景"""
        return self._read_file("global/vision.md")
    
    def read_project(self, project_name: str = "default") -> str:
        """读取项目状态"""
        return self._read_file(f"projects/{project_name}.md")
    
    def search_memory(self, query: str) -> List[Dict[str, Any]]:
        """搜索记忆 (简化版)"""
        results = []
        
        # 搜索 chief 目录
        for filename in ["strategic_memory.md", "company_rules.md", "vision.md"]:
            filepath = f"{self.base_path}/global/{filename}"
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if query.lower() in content.lower():
                        results.append({
                            "source": f"global/{filename}",
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
        self._write_file("global/strategic_memory.md", content)
    
    def append_strategic_memory(self, new_content: str):
        """追加战略记忆"""
        existing = self.read_strategic_memory()
        updated = existing + f"\n\n---\n\n## {datetime.now().strftime('%Y-%m-%d')}\n\n{new_content}"
        self._write_file("global/strategic_memory.md", updated)
    
    def update_company_rules(self, content: str):
        """更新公司规则"""
        self._write_file("global/company_rules.md", content)
    
    def update_vision(self, content: str):
        """更新愿景"""
        self._write_file("global/vision.md", content)
    
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
