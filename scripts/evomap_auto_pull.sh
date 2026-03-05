#!/bin/bash
# EvoMap 胶囊自动拉取脚本
# 条件: confidence >= 0.9 AND success_streak >= 5
# 安全检查: 密码/Token/API Key/代码执行等

LOG_FILE="/root/.openclaw/workspace/logs/evomap_pull_$(date +%Y%m%d).log"
CAPSULES_DIR="/root/.openclaw/workspace/capsules/pending"
NODE_ID="node_c7e3076d"

echo "=== $(date) 胶囊拉取开始 ===" >> $LOG_FILE

# 1. 从EvoMap获取胶囊
timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
message_id="msg_$(date +%s)_$$"

response=$(curl -s -X POST "https://evomap.ai/a2a/fetch" \
  -H "Content-Type: application/json" \
  -d "{
    \"protocol\": \"gep-a2a\",
    \"protocol_version\": \"1.0.0\",
    \"message_type\": \"fetch\",
    \"message_id\": \"$message_id\",
    \"sender_id\": \"$NODE_ID\",
    \"timestamp\": \"$timestamp\",
    \"payload\": {
      \"asset_type\": \"Capsule\",
      \"status\": \"promfilters\": {\"oted\"},
      \"include_payload\": true,
      \"limit\": 50
    }
  }")

echo "获取到胶囊数据" >> $LOG_FILE

# 2. Python处理: 筛选 + 安全检查
python3 << 'PYTHON'
import json, re, sys, os
from datetime import datetime

LOG_FILE = "/root/.openclaw/workspace/logs/evomap_pull_$(date +%Y%m%d).log"
CAPSULES_DIR = "/root/.openclaw/workspace/capsules/pending"
os.makedirs(CAPSULES_DIR, exist_ok=True)

# 读取API响应
data = json.loads('''$response''')
results = data.get('payload', {}).get('results', [])

# 安全检查模式
dangerous_patterns = [
    (r'password\s*[=:]\s*[\"\'].+[\"\']', '硬编码密码'),
    (r'passwd\s*[=:]\s*[\"\'].+[\"\']', '密码变量'),
    (r'secret\s*[=:]\s*[\"\'].+[\"\']', '密钥泄露'),
    (r'api[_-]?key\s*[=:]\s*[\"\'].{20,}[\"\']', 'API Key'),
    (r'token\s*[=:]\s*[\"\'].{20,}[\"\']', 'Token'),
    (r'bearer\s+[a-zA-Z0-9_-]{20,}', 'Bearer Token'),
    (r'authorization\s*[:=]\s*[\"\'].+[\"\']', 'Authorization'),
    (r'eval\s*\(', 'eval执行'),
    (r'exec\s*\(', 'exec执行'),
    (r'subprocess\s*\.\s*(call|Popen|spawn)', 'subprocess'),
    (r'os\s*\.\s*system', 'os.system'),
    (r'child_process\s*\.\s*exec', 'child_process'),
    (r'__import__\s*\(', '动态导入'),
    (r'\.exe[\"\'/]', 'exe文件'),
    (r'rm\s+-rf', '删除命令'),
    (r'base64\.b64decode', 'base64解码'),
]

qualified = []
unsafe = []

for a in results:
    payload = a.get('payload', {})
    conf = a.get('confidence', 0)
    streak = payload.get('success_streak', 0)
    
    # 条件筛选
    if conf < 0.9 or streak < 5:
        continue
    
    # 安全检查
    payload_str = json.dumps(payload)
    is_dangerous = False
    found_risks = []
    for pattern, desc in dangerous_patterns:
        if re.search(pattern, payload_str, re.IGNORECASE):
            is_dangerous = True
            found_risks.append(desc)
    
    aid = a.get('asset_id', '').split(':')[-1][:16]
    
    if is_dangerous:
        unsafe.append((aid, found_risks))
    else:
        # 保存胶囊
        filename = f'{CAPSULES_DIR}/{aid}.json'
        with open(filename, 'w') as f:
            json.dump(a, f, indent=2)
        qualified.append((aid, conf, streak))

# 输出日志
print(f"=== $(date +%Y-%m-%d\ %H:%M:%S) ===", file=open(LOG_FILE, 'a'))
print(f"获取: {len(results)} 个胶囊", file=open(LOG_FILE, 'a'))
print(f"符合条件+安全: {len(qualified)} 个", file=open(LOG_FILE, 'a'))
print(f"可疑(已排除): {len(unsafe)} 个", file=open(LOG_FILE, 'a'))
for aid, conf, streak in qualified:
    print(f"  + {aid}: conf={conf}, streak={streak}", file=open(LOG_FILE, 'a'))
for aid, risks in unsafe:
    print(f"  - {aid}: {risks}", file=open(LOG_FILE, 'a'))
print("", file=open(LOG_FILE, 'a'))
PYTHON

echo "=== 胶囊拉取完成 ===" >> $LOG_FILE
