#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Memory Flusher - 内存 Flush 工具
功能: 在 compaction 前自动 flush 内存，防止数据丢失

用法:
    python3 /root/.openclaw/workspace/scripts/memory_flusher.py [--before-compaction|--before-close|--before-switch]
"""

import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import argparse

class MemoryFlusher:
    """
    内存 Flush 工具
    在关键操作前自动保存当前上下文到 memory
    """
    
    def __init__(self):
        self.workspace = "/root/.openclaw/workspace"
        self.daily_dir = f"{self.workspace}/memory/daily"
        
    def flush_before_compaction(self, agent: str = "main", context: Optional[Dict] = None):
        """
        在 compaction 前执行 flush
        
        Args:
            agent: 当前Agent名称
            context: 需要保存的上下文信息
        """
        print(f"🔄 [{datetime.now().isoformat()}] Memory Flush Before Compaction")
        print(f"   Agent: {agent}")
        
        flushed = []
        
        # 1. Flush 当前会话摘要到 daily log
        if context:
            flushed.append(self._flush_to_daily(context, agent))
        
        # 2. Flush agent 状态到对应 memory
        flushed.append(self._flush_agent_state(agent))
        
        # 3. 创建 flush 记录
        self._create_flush_record("compaction", agent, flushed)
        
        print(f"   ✅ Flush 完成: {len([f for f in flushed if f])} 项")
        return True
    
    def flush_before_session_close(self, agent: str = "main", context: Optional[Dict] = None):
        """在会话关闭前执行 flush"""
        print(f"🔄 [{datetime.now().isoformat()}] Memory Flush Before Session Close")
        print(f"   Agent: {agent}")
        
        flushed = []
        
        if context:
            flushed.append(self._flush_to_daily(context, agent))
        
        flushed.append(self._flush_agent_state(agent))
        self._create_flush_record("session_close", agent, flushed)
        
        print(f"   ✅ Flush 完成: {len([f for f in flushed if f])} 项")
        return True
    
    def flush_before_agent_switch(self, from_agent: str, to_agent: str, context: Optional[Dict] = None):
        """在 Agent 切换前执行 flush"""
        print(f"🔄 [{datetime.now().isoformat()}] Memory Flush Before Agent Switch")
        print(f"   From: {from_agent} -> To: {to_agent}")
        
        flushed = []
        
        # 保存当前Agent的状态
        if context:
            context['switching_to'] = to_agent
            flushed.append(self._flush_to_daily(context, from_agent))
        
        flushed.append(self._flush_agent_state(from_agent))
        
        # 记录切换事件
        self._record_agent_switch(from_agent, to_agent)
        
        self._create_flush_record("agent_switch", from_agent, flushed)
        
        print(f"   ✅ Flush 完成: {len([f for f in flushed if f])} 项")
        return True
    
    def _flush_to_daily(self, context: Dict, agent: str) -> bool:
        """将上下文 flush 到 daily log"""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            daily_file = f"{self.daily_dir}/{today}.md"
            
            # 确保目录存在
            os.makedirs(self.daily_dir, exist_ok=True)
            
            # 构建内容
            timestamp = datetime.now().strftime('%H:%M:%S')
            content = f"""\n## [{timestamp}] {agent.upper()} | Session Flush\n\n"""
            
            if 'key_decisions' in context:
                content += "### 关键决策\n"
                for d in context['key_decisions']:
                    content += f"- {d}\n"
                content += "\n"
            
            if 'important_data' in context:
                content += "### 重要数据\n"
                for k, v in context['important_data'].items():
                    content += f"- {k}: {v}\n"
                content += "\n"
            
            if 'user_preferences' in context:
                content += "### 用户偏好\n"
                for p in context['user_preferences']:
                    content += f"- {p}\n"
                content += "\n"
            
            if 'todos' in context:
                content += "### 待办事项\n"
                for t in context['todos']:
                    content += f"- [ ] {t}\n"
                content += "\n"
            
            if 'summary' in context:
                content += f"### 会话摘要\n{context['summary']}\n\n"
            
            # 追加到文件
            mode = 'a' if os.path.exists(daily_file) else 'w'
            with open(daily_file, mode, encoding='utf-8') as f:
                if mode == 'w':
                    f.write(f"# Daily Log - {today}\n\n")
                f.write(content)
            
            print(f"   ✓ Daily log 已更新: {daily_file}")
            return True
            
        except Exception as e:
            print(f"   ✗ Flush 到 daily 失败: {e}")
            return False
    
    def _flush_agent_state(self, agent: str) -> bool:
        """Flush agent 状态到对应 memory"""
        try:
            agent_memory_file = f"{self.workspace}/memory/agents/{agent}/memory.md"
            
            # 确保目录存在
            os.makedirs(os.path.dirname(agent_memory_file), exist_ok=True)
            
            # 记录状态更新时间
            timestamp = datetime.now().isoformat()
            content = f"""\n## [{timestamp}] State Flush\n
- Last Flush: {timestamp}
- Status: active

"""
            
            mode = 'a' if os.path.exists(agent_memory_file) else 'w'
            with open(agent_memory_file, mode, encoding='utf-8') as f:
                if mode == 'w':
                    f.write(f"# {agent.upper()} Agent Memory\n\n")
                f.write(content)
            
            print(f"   ✓ Agent memory 已更新: {agent_memory_file}")
            return True
            
        except Exception as e:
            print(f"   ✗ Flush agent state 失败: {e}")
            return False
    
    def _create_flush_record(self, event_type: str, agent: str, flushed_items: List[bool]):
        """创建 flush 记录"""
        try:
            flush_dir = f"{self.workspace}/memory/flush_logs"
            os.makedirs(flush_dir, exist_ok=True)
            
            today = datetime.now().strftime('%Y-%m-%d')
            flush_file = f"{flush_dir}/{today}.jsonl"
            
            record = {
                'timestamp': datetime.now().isoformat(),
                'event_type': event_type,
                'agent': agent,
                'flushed_count': len([f for f in flushed_items if f]),
                'total_items': len(flushed_items)
            }
            
            with open(flush_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(record, ensure_ascii=False) + '\n')
                
        except Exception as e:
            print(f"   ⚠ 创建 flush record 失败: {e}")
    
    def _record_agent_switch(self, from_agent: str, to_agent: str):
        """记录 Agent 切换事件"""
        try:
            switch_log = f"{self.workspace}/memory/agent_switches.md"
            
            timestamp = datetime.now().isoformat()
            content = f"- [{timestamp}] {from_agent} → {to_agent}\n"
            
            mode = 'a' if os.path.exists(switch_log) else 'w'
            with open(switch_log, mode, encoding='utf-8') as f:
                if mode == 'w':
                    f.write("# Agent Switch Log\n\n")
                f.write(content)
                
        except Exception as e:
            print(f"   ⚠ 记录 agent switch 失败: {e}")


def main():
    parser = argparse.ArgumentParser(description='Memory Flush 工具')
    parser.add_argument('--before-compaction', action='store_true', help='Compaction 前 flush')
    parser.add_argument('--before-close', action='store_true', help='Session 关闭前 flush')
    parser.add_argument('--before-switch', action='store_true', help='Agent 切换前 flush')
    parser.add_argument('--from-agent', default='main', help='当前 Agent')
    parser.add_argument('--to-agent', help='目标 Agent（切换时使用）')
    
    args = parser.parse_args()
    
    flusher = MemoryFlusher()
    
    if args.before_compaction:
        flusher.flush_before_compaction(args.from_agent)
    elif args.before_close:
        flusher.flush_before_session_close(args.from_agent)
    elif args.before_switch:
        if not args.to_agent:
            print("错误: --before-switch 需要 --to-agent 参数")
            sys.exit(1)
        flusher.flush_before_agent_switch(args.from_agent, args.to_agent)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
