#!/usr/bin/env python3
"""
R&D 智囊团三角辩论调度器
每天执行两次（上午/下午），为每个P0项目产出结构化Memo

流程：
  Step 1 → 策略师(Strategist)独立提议  → MiniMax-M2.7
  Step 2 → 产品官(Product)独立提议     → Kimi 2.5
  Step 3 → 批评者(Advocate)独立提议     → GPT-5.4
  Step 4 → 三方互相点评
  Step 5 → 综合输出最终Memo
  Step 6 → 写入飞书Bitable + Supabase + 推送飞书
"""

import subprocess
import json
import sys
import os
import requests
import datetime
import uuid
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────────
WORKSPACE   = "/root/.openclaw/workspace"
SB_DIR      = "/root/.openclaw/workspace/projects/second-brain"

FEISHU_APP_ID     = "cli_a93a60e4ae795cee"
FEISHU_APP_SECRET = "ObQFsvOOT8aUWtV62kneIhWyyo2XLIuG"
BITABLE_APP_TOKEN = "L0qDbUS5ma16tmsd5NkcX35Jnml"
BITABLE_TABLE_ID  = "tblPisq0v0UyvL5Q"

SUPABASE_URL  = "https://njxjuvxosvwvluxefrzg.supabase.co"
SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeGp1dnhvc3Z3dmx1eGVmcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjkyNTUsImV4cCI6MjA4NzQwNTI1NX0.FqfMyI3uSkiHVepWVccxFU4ie5RU00VVdrF-aOr9LjI"

P0_PROJECTS = ["AI培训", "AI咨询", "AI陪跑"]

# 飞书用户
FEISHU_USER_ID = "ou_aeb3984fc66ae7c78e396255f7c7a11b"

# ── 模型 API 配置（从 models.json 读取）─────────────────────
MODEL_CONFIGS = {
    "minimax-cn/MiniMax-M2.7": {
        "provider": "minimax-portal",
        "model": "MiniMax-M2.7",
        "base_url": "https://api.minimaxi.com/anthropic/v1/messages",
        "api_key": "minimax-oauth",
        "format": "anthropic",
    },
    "minimax-cn/MiniMax-M2.5": {
        "provider": "minimax-cn",
        "model": "MiniMax-M2.5",
        "base_url": "https://api.minimaxi.com/anthropic/v1/messages",
        "api_key": "sk-cp-cMqGihpXu1XQ7CnFGLKP5kUORqrva1RJ_MDdrOSF5DXD4dmijK1aoHUhD6glH1qJUMBXts8PntThJNMdkiIdEGcBB9WKn9M4-_2zaE29N1-w3R8RsFchavo",
        "format": "anthropic",
    },
    "kimi-coding/k2p5": {
        "provider": "kimi-coding",
        "model": "k2p5",
        "base_url": "https://api.kimi.com/coding/v1/chat/completions",
        "api_key": "sk-kimi-X2PdPbADTlW5YKB4r1oNBlqA2mT_GCYy0Z8vT9ZqL3Xc",
        "format": "openai",
    },
    "openai-code/gpt-5.4": {
        "provider": "openai-code",
        "model": "gpt-5.4",
        "base_url": "https://capi.quan2go.com/openai/v1/chat/completions",
        "api_key": "012807E3-BF31-422B-8E6F-6D8B5A3F7C1E",
        "format": "openai",
    },
}

# 策略师默认用 M2.5（直接API key），M2.7需OAuth暂不可用
DEFAULT_STRATEGIST = "minimax-cn/MiniMax-M2.5"
DEFAULT_PRODUCT   = "kimi-coding/k2p5"
DEFAULT_ADVOCATE  = "openai-code/gpt-5.4"


def call_model(prompt: str, model_key: str, system_prompt: str = "") -> str:
    """通过直接 HTTP API 调用模型"""
    config = MODEL_CONFIGS.get(model_key)
    if not config:
        print(f"[WARN] Unknown model: {model_key}, falling back to MiniMax-M2.7")
        config = MODEL_CONFIGS[DEFAULT_STRATEGIST]

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": config['api_key'],
    }

    if config["format"] == "anthropic":
        body = {
            "model": config["model"],
            "max_tokens": 4096,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        if system_prompt:
            body["system"] = system_prompt
        resp = requests.post(config["base_url"], headers=headers, json=body, timeout=120)
        if resp.ok:
            data = resp.json()
            content = data.get("content", [])
            # Extract text from blocks (skip thinking blocks)
            for block in content:
                if block.get("type") == "text":
                    return block.get("text", "")
            return ""
    else:
        # OpenAI-compatible format
        body = {
            "model": config["model"],
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4096,
        }
        if system_prompt:
            body["messages"].insert(0, {"role": "system", "content": system_prompt})
        resp = requests.post(config["base_url"], headers=headers, json=body, timeout=120)

        if resp.ok:
            data = resp.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")

    print(f"[ERROR] API call failed: {resp.status_code} {resp.text[:200]}")
    return None

# ── 工具函数 ──────────────────────────────────────────────

def get_feishu_token():
    """获取飞书 tenant_access_token"""
    resp = requests.post(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()["tenant_access_token"]

def send_feishu_message(token, user_id, text):
    """发送飞书私信"""
    resp = requests.post(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=user_id",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "receive_id": user_id,
            "msg_type": "text",
            "content": json.dumps({"text": text})
        },
        timeout=15
    )
    return resp.json()

def write_bitable_record(token, round_num, project, strategist, product, advocate, memo):
    """写入飞书Bitable记录"""
    now_ms = int(datetime.datetime.now().timestamp() * 1000)
    resp = requests.post(
        f"https://open.feishu.cn/open-apis/bitable/v1/apps/{BITABLE_APP_TOKEN}/tables/{BITABLE_TABLE_ID}/records",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "fields": {
                "R&D 智囊团 Dashboard": f"第{round_num}轮 | {project}",
                "轮次": f"第{round_num}轮 | {project}",
                "状态": "已完成",
                "项目": project,
                "Strategist 提议": strategist,
                "Product 提议": product,
                "Devil's Advocate 提议": advocate,
                "最终 Memo": memo,
                "创建时间": now_ms,
            }
        },
        timeout=15
    )
    return resp.json()

def write_supabase_memo(round_num, project, strategist, product, advocate, memo):
    """写入Supabase documents表（type=rd_memo）"""
    memo_id = f"rd-{datetime.date.today().strftime('%Y%m%d')}-{round_num}"
    now_ms  = int(datetime.datetime.now().timestamp() * 1000)
    content_json = json.dumps({
        "round": round_num,
        "status": "已完成",
        "project": project,
        "strategist_proposal": strategist,
        "product_proposal": product,
        "devil_proposal": advocate,
        "final_memo": memo,
    }, ensure_ascii=False)

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/documents",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        },
        json={
            "id":       memo_id,
            "title":    f"R&D Memo #{round_num} | {project} | {datetime.date.today().strftime('%Y-%m-%d')}",
            "path":     f"/rd-memos/{memo_id}",
            "type":     "rd_memo",
            "date":     datetime.date.today().strftime("%Y-%m-%d"),
            "size":     len(content_json),
            "content":  content_json,
        },
        timeout=15
    )
    return resp.status_code in (200, 201)

def call_model(prompt, model, system_prompt=""):
    """通过 openclaw CLI 调用指定模型"""
    cmd = [
        "openclaw",
        "chat",
        "--model", model,
        "--json",
        system_prompt + "\n\n" + prompt if system_prompt else prompt
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=WORKSPACE
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception as e:
        print(f"[WARN] Model call failed: {e}", file=sys.stderr)
    return None

def generate_context_for_project(project):
    """为每个项目生成背景上下文"""
    ctx_map = {
        "AI培训": """你正在为一家AI培训创业公司进行产品研究。
核心产品：线下AI培训（尤其OpenClaw生态）+ 长期AI咨询陪跑 + 商业教练服务
目标客户：B端企业、中小企业主、职业人士
当前痛点：
- 培训内容缺乏系统性大纲
- 难以规模化复制优秀培训师
- 缺乏有效的客户转化路径
- 陪跑服务的交付标准化程度低""",

        "AI咨询": """你正在为一家AI培训创业公司进行产品研究。
核心产品：线下AI培训 + 长期AI咨询陪跑 + 商业教练服务
目标客户：B端企业、中小企业主、职业人士
当前痛点：
- 客户对AI应用的认知差异大
- 咨询交付依赖个人经验，难复制
- 缺乏清晰的咨询产品化路径
- 难以证明咨询的投资回报率""",

        "AI陪跑": """你正在为一家AI培训创业公司进行产品研究。
核心产品：线下AI培训 + 长期AI咨询陪跑 + 商业教练服务
目标客户：B端企业、中小企业主、职业人士
当前痛点：
- 陪跑周期长，客户容易中途放弃
- 缺乏标准化的陪跑内容和进度体系
- 教练/陪跑师的培训和质量控制难
- 难以规模化，拓展客户数量受限""",
    }
    return ctx_map.get(project, ctx_map["AI培训"])

# ── 三角辩论主流程 ────────────────────────────────────────

def run_triangle_debate(project: str, round_num: int) -> dict:
    """
    执行一轮三角辩论，返回结构化结果
    """
    print(f"\n{'='*60}")
    print(f"🎯 开始三角辩论 | 项目: {project} | 第{round_num}轮")
    print(f"{'='*60}")

    ctx = generate_context_for_project(project)
    today = datetime.date.today().strftime("%Y年%m月%d日")

    # ── Step 1: 策略师独立提议 (MiniMax-M2.7) ──
    strategist_prompt = f"""【角色】你是策略师（Strategist），专注增长与营收机会，从市场和竞品视角提出新想法。
【背景上下文】
{ctx}
【今日日期】{today}

请严格按以下格式输出你的提议（直接输出，不要有多余解释）：

## 提议
（用3-5句话描述你能为这个P0项目提出的1-2个具体、可落地的新想法或优化方向，聚焦营收和增长）

## 理由
（简述支撑这个提议的市场/用户/竞品依据，1-2句话）

## 预期收益
（量化描述这个提议如果成功落地，能带来什么具体收益）
"""

    strategist_resp = call_model(strategist_prompt, DEFAULT_STRATEGIST)
    print(f"\n📊 策略师提议: {strategist_resp[:100] if strategist_resp else 'FAILED'}...")
    strategist_text = strategist_resp or "（策略师提议生成失败）"

    # ── Step 2: 产品官独立提议 (Kimi 2.5) ──
    product_prompt = f"""【角色】你是产品官（Product Officer），关注产品体验与功能改进，从用户反馈和交互角度思考。
【背景上下文】
{ctx}
【今日日期】{today}

请严格按以下格式输出你的提议（直接输出，不要有多余解释）：

## 提议
（用3-5句话描述你能为这个P0项目提出的1-2个具体、可落地的新想法或优化方向，聚焦用户体验和产品价值）

## 理由
（简述支撑这个提议的用户需求、产品逻辑或体验改进依据，1-2句话）

## 预期收益
（量化描述这个提议如果成功落地，能带来什么具体收益）
"""

    product_resp = call_model(product_prompt, DEFAULT_PRODUCT)
    print(f"\n🎯 产品官提议: {str(product_resp[:100]) if product_resp else 'FAILED'}...")
    product_text = product_resp or "（产品官提议生成失败）"

    # ── Step 3: 批评者独立提议 (GPT-5.4) ──
    advocate_prompt = f"""【角色】你是批评者（Devil's Advocate），挑战其他两人的观点，找出漏洞与潜在风险。
【背景上下文】
{ctx}
【今日日期】{today}

请严格按以下格式输出你的提议（直接输出，不要有多余解释）：

## 提议
（用3-5句话描述你能为这个P0项目提出的1-2个具体、可落地的新想法或优化方向，聚焦风险控制和可持续性）

## 理由
（简述支撑这个提议的风险评估、潜在问题和竞品失败教训，1-2句话）

## 预期收益
（量化描述这个提议如果成功落地，能带来什么具体收益）
"""

    advocate_resp = call_model(advocate_prompt, DEFAULT_ADVOCATE)
    print(f"\n⚔️ 批评者提议: {str(advocate_resp[:100]) if advocate_resp else 'FAILED'}...")
    advocate_text = advocate_resp or "（批评者提议生成失败）"

    # ── Step 4: 三方互相点评 (MiniMax-M2.7 综合) ──
    debate_prompt = f"""【角色】你是三角辩论主持人，综合三方观点，主持辩论并输出最终Memo。
【三方提议】
---
策略师（Strategist）提议：
{strategist_text}
---
产品官（Product Officer）提议：
{product_text}
---
批评者（Devil's Advocate）提议：
{advocate_text}
---
【要求】
请完成以下输出（直接输出，不要有多余解释）：

## 三角辩论点评
（对于每条提议，给出另外两方的简短点评，30字以内）

## 最终Memo
（综合三方提议，输出一份结构清晰的最终建议，分3个层次：
- ✅ 短期（1-2周）：最应该立即行动的1件事
- 🔄 中期（1个月）：接下来应该推进的1件事  
- 📊 衡量标准：如何判断这个方向成功了（具体可量化指标）

每条建议不超过3句话。
"""

    final_resp = call_model(debate_prompt, DEFAULT_STRATEGIST)
    print(f"\n📝 最终Memo: {str(final_resp[:100]) if final_resp else 'FAILED'}...")
    final_memo = final_resp or "（最终Memo生成失败，请人工整理）"

    return {
        "strategist": strategist_text,
        "product": product_text,
        "advocate": advocate_text,
        "final_memo": final_memo,
    }

# ── 主函数 ────────────────────────────────────────────────

def main():
    today = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"\n{'#'*60}")
    print(f"# 🧠 R&D 智囊团三角辩论 | {today}")
    print(f"{'#'*60}")

    # 判断是今天第几轮（每天两次：上午9点=第1轮，下午=第2轮）
    hour = datetime.datetime.now().hour
    round_num = 1 if hour < 14 else 2

    feishu_token = get_feishu_token()
    all_memos = []

    for project in P0_PROJECTS:
        try:
            result = run_triangle_debate(project, round_num)

            # 写入飞书Bitable
            try:
                br = write_bitable_record(
                    feishu_token,
                    round_num,
                    project,
                    result["strategist"],
                    result["product"],
                    result["advocate"],
                    result["final_memo"]
                )
                print(f"✅ 飞书Bitable写入成功: {project}")
            except Exception as e:
                print(f"❌ 飞书Bitable写入失败: {e}", file=sys.stderr)

            # 写入Supabase
            try:
                write_supabase_memo(
                    round_num,
                    project,
                    result["strategist"],
                    result["product"],
                    result["advocate"],
                    result["final_memo"]
                )
                print(f"✅ Supabase写入成功: {project}")
            except Exception as e:
                print(f"❌ Supabase写入失败: {e}", file=sys.stderr)

            all_memos.append({
                "project": project,
                "round": round_num,
                **result
            })

        except Exception as e:
            print(f"❌ {project} 辩论出错: {e}", file=sys.stderr)
            continue

    # ── 推送飞书汇总 ─────────────────────────────────
    if all_memos:
        memo_lines = [f"🧠 R&D 智囊团 Memo | {today} | 第{round_num}轮\n"]
        for m in all_memos:
            memo_lines.append(f"\n{'='*40}")
            memo_lines.append(f"📌 项目：{m['project']}")
            memo_lines.append(f"\n📝 最终建议：\n{m['final_memo']}")

        feishu_text = "\n".join(memo_lines)
        try:
            send_feishu_message(feishu_token, FEISHU_USER_ID, feishu_text)
            print(f"\n✅ 飞书消息发送成功")
        except Exception as e:
            print(f"❌ 飞书消息发送失败: {e}", file=sys.stderr)

    print(f"\n{'='*60}")
    print(f"# ✅ 三角辩论完成 | 共处理 {len(all_memos)} 个项目")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
