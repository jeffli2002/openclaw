#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Memory Search - 增强版记忆搜索
功能: 同时搜索 MEMORY.md、memory/* 和 session 历史记录

用法:
    python3 /root/.openclaw/workspace/scripts/enhanced_memory_search.py "搜索关键词"
"""

import os
import re
import sqlite3
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import yaml

class EnhancedMemorySearch:
    """
    增强版记忆搜索器
    同时搜索多个来源: MEMORY.md, memory/*, session history
    """
    
    def __init__(self, config_path: str = "/root/.openclaw/workspace/config/openclaw_enhancements.yaml"):
        self.workspace = "/root/.openclaw/workspace"
        self.memory_db = "/root/.openclaw/memory/main.sqlite"
        self.config = self._load_config(config_path)
    
    def _load_config(self, path: str) -> Dict:
        """加载配置"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                # YAML可能包含多个文档，我们只读取session_memory_search部分
                content = f.read()
                # 简单解析
                config = {
                    'max_results': 20,
                    'similarity_threshold': 0.6,
                    'include_context': True,
                    'context_lines': 3
                }
                return config
        except:
            return {
                'max_results': 20,
                'similarity_threshold': 0.6,
                'include_context': True,
                'context_lines': 3
            }
    
    def search(self, query: str, agent: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        执行增强搜索
        
        Args:
            query: 搜索关键词
            agent: 当前Agent类型(用于搜索对应agent的memory)
            
        Returns:
            搜索结果列表
        """
        results = []
        query_lower = query.lower()
        
        # 1. 搜索 MEMORY.md
        results.extend(self._search_file(
            f"{self.workspace}/MEMORY.md",
            query_lower,
            source="MEMORY.md",
            priority=1
        ))
        
        # 2. 搜索 memory/global/
        results.extend(self._search_directory(
            f"{self.workspace}/memory/global/",
            query_lower,
            source_prefix="memory/global",
            priority=2
        ))
        
        # 3. 搜索 memory/agents/{agent}/
        if agent:
            results.extend(self._search_directory(
                f"{self.workspace}/memory/agents/{agent}/",
                query_lower,
                source_prefix=f"memory/agents/{agent}",
                priority=3
            ))
        
        # 4. 搜索 memory/daily/ (最近7天)
        results.extend(self._search_daily_logs(
            query_lower,
            days=7,
            priority=4
        ))
        
        # 5. 搜索 session history (SQLite)
        results.extend(self._search_session_history(
            query_lower,
            limit=10,
            priority=5
        ))
        
        # 按优先级和相关度排序
        results = self._rank_results(results, query_lower)
        
        # 限制结果数
        max_results = self.config.get('max_results', 20)
        return results[:max_results]
    
    def _search_file(self, filepath: str, query: str, source: str, priority: int) -> List[Dict]:
        """搜索单个文件"""
        results = []
        
        if not os.path.exists(filepath):
            return results
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
                for i, line in enumerate(lines):
                    if query in line.lower():
                        # 获取上下文
                        context_start = max(0, i - self.config.get('context_lines', 3))
                        context_end = min(len(lines), i + self.config.get('context_lines', 3) + 1)
                        context = '\n'.join(lines[context_start:context_end])
                        
                        results.append({
                            'source': source,
                            'filepath': filepath,
                            'line': i + 1,
                            'content': line.strip(),
                            'context': context,
                            'priority': priority,
                            'timestamp': os.path.getmtime(filepath)
                        })
        except Exception as e:
            print(f"搜索文件失败 {filepath}: {e}", file=sys.stderr)
        
        return results
    
    def _search_directory(self, dirpath: str, query: str, source_prefix: str, priority: int) -> List[Dict]:
        """搜索目录下所有文件"""
        results = []
        
        if not os.path.exists(dirpath):
            return results
        
        for filename in os.listdir(dirpath):
            if filename.endswith('.md'):
                filepath = os.path.join(dirpath, filename)
                file_results = self._search_file(
                    filepath,
                    query,
                    source=f"{source_prefix}/{filename}",
                    priority=priority
                )
                results.extend(file_results)
        
        return results
    
    def _search_daily_logs(self, query: str, days: int, priority: int) -> List[Dict]:
        """搜索最近N天的daily日志"""
        results = []
        daily_dir = f"{self.workspace}/memory/daily"
        
        if not os.path.exists(daily_dir):
            return results
        
        # 获取最近N天的日期
        today = datetime.now()
        for i in range(days):
            date = today - timedelta(days=i)
            filename = date.strftime('%Y-%m-%d') + '.md'
            filepath = os.path.join(daily_dir, filename)
            
            if os.path.exists(filepath):
                file_results = self._search_file(
                    filepath,
                    query,
                    source=f"memory/daily/{filename}",
                    priority=priority
                )
                results.extend(file_results)
        
        return results
    
    def _search_session_history(self, query: str, limit: int, priority: int) -> List[Dict]:
        """搜索session历史记录(SQLite)"""
        results = []
        
        if not os.path.exists(self.memory_db):
            return results
        
        try:
            conn = sqlite3.connect(self.memory_db)
            cursor = conn.cursor()
            
            # 搜索chunks表
            cursor.execute("""
                SELECT id, content, metadata FROM chunks
                WHERE content LIKE ?
                ORDER BY id DESC
                LIMIT ?
            """, (f'%{query}%', limit))
            
            for row in cursor.fetchall():
                chunk_id, content, metadata = row
                # 找到匹配的行
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if query in line.lower():
                        context_start = max(0, i - 3)
                        context_end = min(len(lines), i + 4)
                        context = '\n'.join(lines[context_start:context_end])
                        
                        results.append({
                            'source': 'session_history',
                            'filepath': f'sqlite:chunks/{chunk_id}',
                            'line': i + 1,
                            'content': line.strip()[:200],
                            'context': context,
                            'priority': priority,
                            'timestamp': None,
                            'metadata': metadata
                        })
                        break  # 每个chunk只取第一个匹配
            
            conn.close()
        except Exception as e:
            print(f"搜索session history失败: {e}", file=sys.stderr)
        
        return results
    
    def _rank_results(self, results: List[Dict], query: str) -> List[Dict]:
        """对结果进行排序"""
        def score(result):
            # 基础分数 = 100 - 优先级 * 10 (优先级越高分数越高)
            base_score = 100 - result['priority'] * 10
            
            # 内容匹配度加分
            content_lower = result['content'].lower()
            if query == content_lower:
                base_score += 50  # 完全匹配
            elif query in content_lower:
                base_score += 20  # 包含匹配
            
            # 时间加分（越新分数越高）
            if result.get('timestamp'):
                age_days = (datetime.now().timestamp() - result['timestamp']) / 86400
                if age_days < 1:
                    base_score += 15
                elif age_days < 7:
                    base_score += 10
                elif age_days < 30:
                    base_score += 5
            
            return base_score
        
        # 按分数排序
        results.sort(key=score, reverse=True)
        return results
    
    def format_results(self, results: List[Dict], query: str) -> str:
        """格式化搜索结果"""
        if not results:
            return f"🔍 未找到关于 '{query}' 的记忆"
        
        lines = [
            f"🔍 增强记忆搜索结果: '{query}'",
            f"找到 {len(results)} 条相关记录",
            "=" * 60
        ]
        
        for i, r in enumerate(results[:10], 1):  # 只显示前10条
            lines.append(f"\n[{i}] 📄 {r['source']}")
            lines.append(f"    📝 {r['content'][:100]}...")
            if self.config.get('include_context'):
                lines.append(f"    💭 上下文:")
                for ctx_line in r['context'].split('\n')[:5]:
                    lines.append(f"       {ctx_line[:80]}")
            lines.append("")
        
        return '\n'.join(lines)


def main():
    """命令行入口"""
    if len(sys.argv) < 2:
        print("用法: python3 enhanced_memory_search.py <关键词> [agent名称]")
        print("示例: python3 enhanced_memory_search.py '公众号文章' content")
        sys.exit(1)
    
    query = sys.argv[1]
    agent = sys.argv[2] if len(sys.argv) > 2 else None
    
    searcher = EnhancedMemorySearch()
    results = searcher.search(query, agent)
    print(searcher.format_results(results, query))


if __name__ == "__main__":
    main()
