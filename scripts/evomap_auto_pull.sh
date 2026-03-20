#!/bin/bash
# EvoMap 胶囊自动拉取脚本 v6
# 条件: confidence >= 0.9 AND success_streak >= 5

LOG_FILE="/root/.openclaw/workspace/logs/evomap_pull_$(date +%Y%m%d).log"
CAPSULES_DIR="/root/.openclaw/workspace/capsules/pending"
CREDENTIALS_FILE="/root/.openclaw/credentials/evomap.json"
RESPONSE_FILE="/tmp/evomap_response_$$.json"

mkdir -p "$(dirname "$LOG_FILE")" "$CAPSULES_DIR"

echo "=== $(date) 胶囊拉取开始 ===" >> "$LOG_FILE"

# 读取凭证
if [ -f "$CREDENTIALS_FILE" ]; then
    NODE_ID=$(cat "$CREDENTIALS_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('node_id',''))" 2>/dev/null)
    NODE_SECRET=$(cat "$CREDENTIALS_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('node_secret',''))" 2>/dev/null)
fi

if [ -z "$NODE_ID" ] || [ -z "$NODE_SECRET" ]; then
    echo "缺少 EvoMap 凭证" >> "$LOG_FILE"
    exit 1
fi

echo "使用节点: $NODE_ID" >> "$LOG_FILE"

# 1. 从EvoMap获取胶囊
timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
message_id="msg_$(date +%s)_$RANDOM"

curl -s -X POST "https://evomap.ai/a2a/fetch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NODE_SECRET" \
  -d "{
    \"protocol\": \"gep-a2a\",
    \"protocol_version\": \"1.0.0\",
    \"message_type\": \"fetch\",
    \"message_id\": \"$message_id\",
    \"sender_id\": \"$NODE_ID\",
    \"timestamp\": \"$timestamp\",
    \"payload\": {
      \"asset_type\": \"Capsule\",
      \"limit\": 50
    }
  }" > "$RESPONSE_FILE"

# 检查响应
if ! python3 -c "import json; json.load(open('$RESPONSE_FILE'))" 2>/dev/null; then
    echo "API 响应无效" >> "$LOG_FILE"
    rm -f "$RESPONSE_FILE"
    exit 1
fi

error_msg=$(python3 -c "import json; d=json.load(open('$RESPONSE_FILE')); print(d.get('error',''))")
if [ -n "$error_msg" ]; then
    echo "API 错误: $error_msg" >> "$LOG_FILE"
    rm -f "$RESPONSE_FILE"
    exit 1
fi

echo "获取到胶囊数据，开始筛选..." >> "$LOG_FILE"

# 2. Python处理
python3 << PYEOF
import json, re, os, sys

RESPONSE_FILE = "$RESPONSE_FILE"
LOG_FILE = "$LOG_FILE"
CAPSULES_DIR = "$CAPSULES_DIR"

with open(RESPONSE_FILE, 'r') as f:
    data = json.load(f)

# 结构: payload.results[].result
results = data.get('payload', {}).get('results', [])
print(f"获取到 {len(results)} 个胶囊", file=sys.stderr)

saved = 0

for item in results:
    # confidence 和 success_streak 在顶层
    confidence = item.get('confidence', 0)
    streak = item.get('success_streak', 0)
    
    # 筛选条件: confidence >= 0.9 AND success_streak >= 5
    if confidence < 0.9 or streak < 50:
        continue
    
    # 获取内容进行安全检查
    payload = item.get('payload', {})
    name = payload.get('id', '')
    code = payload.get('code', '')
    
    # 跳过含敏感词的胶囊
    sensitive = ['password', 'token', 'api_key', 'secret', 'eval(', 'exec(', 'subprocess']
    text_to_check = f"{name} {code}".lower()
    if any(s in text_to_check for s in sensitive):
        continue
    
    # 保存胶囊
    capsule_id = item.get('asset_id', 'unknown')
    filename = f"{CAPSULES_DIR}/{capsule_id}.json"
    
    with open(filename, 'w') as f:
        json.dump(item, f, indent=2)
    
    saved += 1
    print(f"保存: {name[:50]} (conf:{confidence}, streak:{streak})", file=sys.stderr)

print(f"完成: 保存{saved}个胶囊", file=sys.stderr)
PYEOF

rm -f "$RESPONSE_FILE"
echo "=== $(date) 胶囊拉取结束 ===" >> "$LOG_FILE"
