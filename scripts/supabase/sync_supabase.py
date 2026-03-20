#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase Sync - 简化版同步脚本
同步: workspace 配置、cron jobs、memory 文件
"""

import glob
import json
import os
import sys
from datetime import datetime, timezone
from supabase import create_client

CREDENTIALS_PATH = '/root/.openclaw/credentials/supabase.json'
with open(CREDENTIALS_PATH, 'r') as f:
    creds = json.load(f)
SUPABASE_URL = creds['url']
SUPABASE_KEY = creds['service_key']

client = create_client(SUPABASE_URL, SUPABASE_KEY)
workspace = '/root/.openclaw/workspace'
cron_dir = '/root/.openclaw/cron'

def sync_documents():
    """同步核心文档"""
    print('📄 同步 Documents...')
    doc_files = ['GITHUB_BACKUP_STRATEGY.md', 'second-brain-prd.md']
    docs = []
    for doc in doc_files:
        path = os.path.join(workspace, doc)
        if os.path.exists(path):
            stats = os.stat(path)
            docs.append({
                'id': f'doc-{doc.replace(".md", "")}',
                'title': doc,
                'path': f'workspace/{doc}',
                'type': 'config',
                'date': datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d'),
                'size': stats.st_size,
            })
    if docs:
        client.table('documents').upsert(docs).execute()
        print(f'  ✓ {len(docs)} 文档')
    return len(docs)

def sync_memories():
    """同步 memory 文件"""
    print('📔 同步 Memories...')
    memories = []
    mem_paths = [
        f'{workspace}/memory/global/*.md',
        f'{workspace}/memory/agents/*/memory.md',
    ]
    now = datetime.now(timezone.utc).isoformat()
    for pattern in mem_paths:
        for fp in glob.glob(pattern):
            name = os.path.basename(fp)
            with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()[:2000]
            memories.append({
                'id': f'mem-{name.replace(".md", "")}',
                'title': name,
                'content': content,
                'type': 'memory',
                'date': datetime.now().strftime('%Y-%m-%d'),
                'updated_at': now,
            })
    if memories:
        # 去重
        seen = set()
        unique = []
        for m in memories:
            if m['id'] not in seen:
                seen.add(m['id'])
                unique.append(m)
        client.table('memories').upsert(unique).execute()
        print(f'  ✓ {len(unique)} 记忆')
    return len(memories)

def sync_cron_jobs():
    """同步 cron jobs 状态 - 暂跳过，表不存在"""
    print('⏰ 同步 Cron Jobs... (跳过，表不存在)')
    return 0

def main():
    print(f'🚀 Supabase Sync - {datetime.now().strftime("%Y-%m-%d %H:%M")}')
    print('='*40)
    
    try:
        doc_count = sync_documents()
        mem_count = sync_memories()
        job_count = sync_cron_jobs()
        
        print('='*40)
        print(f'✅ 同步完成: {doc_count} 文档, {mem_count} 记忆, {job_count} jobs')
        return 0
    except Exception as e:
        print(f'❌ 同步失败: {e}')
        return 1

if __name__ == '__main__':
    sys.exit(main())
