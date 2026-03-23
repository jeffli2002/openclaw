#!/usr/bin/env python3
"""
Autonomous Employee — 每天凌晨2点自动执行
角色：黎镭的 autonomous AI employee
职责：主动思考 + 自主执行一个对业务有实际推进的任务

每天流程：
  Step 1 → 读取业务上下文（Supabase memory + 项目状态 + 今日进展）
  Step 2 → 分析当前最需要推进的方向
  Step 3 → 选择1个高优先级任务并执行
  Step 4 → 把执行结果写入日志 + 推送飞书
"""

import subprocess
import json
import sys
import os
import requests
import datetime
import random
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────────
WORKSPACE   = "/root/.openclaw/workspace"
SUPABASE_URL  = "https://njxjuvxosvwvluxefrzg.supabase.co"
SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeGp1dnhvc3Z3dmx1eGVmcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjkyNTUsImV4cCI6MjA4NzQwNTI1NX0.FqfMyI3uSkiHVepWVccxFU4ie5RU00VVdrF-aOr9LjI"
FEISHU_APP_ID     = "cli_a93a60e4ae795cee"
FEISHU_APP_SECRET = "ObQFsvOOT8aUWtV62kneIhWyyo2XLIuG"
FEISHU_USER_ID = "ou_aeb3984fc66ae7c78e396255f7c7a11b"

P0_PROJECTS = ["AI培训", "AI咨询", "AI陪跑"]

# ── 工具函数 ──────────────────────────────────────────────

def get_feishu_token():
    resp = requests.post(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": FEISHU_APP_ID, "app_secret": FEISHU_APP_SECRET},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()["tenant_access_token"]

def send_feishu_message(token, user_id, text):
    resp = requests.post(
        "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=user_id",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"receive_id": user_id, "msg_type": "text", "content": json.dumps({"text": text})},
        timeout=15
    )
    return resp.json()

def call_llm(prompt, model="minimax-cn/MiniMax-M2.7"):
    cmd = ["openclaw", "chat", "--model", model, "--json", prompt]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180, cwd=WORKSPACE)
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception as e:
        print(f"[WARN] LLM call failed: {e}", file=sys.stderr)
    return None

def read_memory_files():
    """读取关键记忆文件"""
    files = {
        "daily_today": f"{WORKSPACE}/memory/daily/{datetime.date.today().strftime('%Y-%m-%d')}.md",
        "strategic": f"{WORKSPACE}/memory/global/strategic.md",
        "agents": f"{WORKSPACE}/AGENTS.md",
    }
    content = {}
    for key, path in files.items():
        try:
            with open(path, "r") as f:
                content[key] = f.read()[-3000:]  # 最后3000字
        except:
            content[key] = ""
    return content

def get_supabase_recent_docs():
    """获取最近的生产内容"""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/documents?select=id,title,date,type&order=date.desc&limit=10",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        timeout=10
    )
    if resp.ok:
        return resp.json()
    return []

def get_cron_status():
    """检查今天的cron执行情况"""
    result = subprocess.run(
        ["openclaw", "cron", "list", "--json"],
        capture_output=True, text=True, timeout=15
    )
    if result.returncode == 0:
        try:
            data = json.loads(result.stdout)
            today = datetime.date.today().strftime("%Y-%m-%d")
            running = []
            for job in data.get("jobs", []):
                last = job.get("lastRun", "")
                if today in last or not last:
                    running.append(job.get("name", ""))
            return running
        except:
            pass
    return []

# ── 任务池 — 自主员工可选择的高价值任务 ────────────────────

TASK_POOL = [
    {
        "id": "content_research",
        "name": "内容调研 — AI培训潜在客户案例",
        "description": "搜索并整理3个AI培训成功案例（国内/海外），分析可借鉴点，为培训内容增加真实案例素材",
        "model": "minimax-cn/MiniMax-M2.7",
        "prompt_template": """你是黎镭的AI培训业务内容研究员。

业务背景：
- P0方向：AI培训（OpenClaw生态）、AI咨询、AI陪跑
- 目标客户：B端企业、中小企业主、职业人士
- 核心差异化：不是卖课，是真正帮企业落地AI能力

任务：搜索并整理3个AI培训/企业AI教练的成功案例，要求：
1. 有具体数字和效果描述
2. 涵盖不同行业（制造/零售/金融/医疗等）
3. 包含可量化的成果（如效率提升%、成本降低、营收增长）

输出格式（直接输出，不要解释）：
## 案例1：[行业/公司名]
- 背景痛点：（1-2句话）
- 解决方案：（核心动作）
- 量化成果：（数字说话）

## 案例2：[行业/公司名]
...

## 可借鉴点
（3条，黎镭可以用在自己的AI培训设计里）
"""
    },
    {
        "id": "messaging_audit",
        "name": "文案审计 — 优化朋友圈/群发文案",
        "description": "审查最近的朋友圈或群发内容，分析转化率和吸引力，提出改进建议",
        "model": "minimax-cn/MiniMax-M2.7",
        "prompt_template": """你是黎镭的AI培训业务增长顾问。

业务背景：
- P0方向：AI培训（OpenClaw生态线下课）、AI咨询、AI陪跑
- 目标客户：B端企业决策者、中小企业主、职场人士
- 定位：不是知识付费，是实战型AI能力培训+陪跑

任务：基于以下业务信息，写3条朋友圈/群发文案草稿，要求：
1. 每条<100字，直击痛点
2. 有明确的行动号召（不是问句，是明确让对方做什么）
3. 体现"实战、落地、陪跑"差异化，不谈概念
4. 语气像真实的人说话，不是广告

目标客户最痛的3个点：
- 知道AI重要，但不知道从哪里开始
- 上了很多课，落地不了
- 团队不会用AI，工作效率没变化

输出（直接输出，不要解释）：
文案1：（主题：开场痛点）
文案2：（主题：成果展示）
文案3：（主题：紧迫感/限时）
"""
    },
    {
        "id": "offer_design",
        "name": "产品设计 — AI咨询标准化交付件",
        "description": "为AI咨询产品设计一套标准化的交付物清单，让咨询产品更可感知、更有价值感",
        "model": "minimax-cn/MiniMax-M2.7",
        "prompt_template": """你是黎镭的AI咨询业务产品经理。

业务背景：
- AI咨询陪跑：帮助企业建立内部AI工作流，周期通常1-3个月
- 客户：B端企业负责人
- 痛点：咨询交付依赖个人经验，客户感知不到价值，续费难

任务：设计一套"咨询交付物清单"，让客户每个阶段都清楚得到了什么。

要求：
1. 分3个阶段（诊断期/落地期/陪跑期）
2. 每个阶段产出3-5个具体交付物（文件名+简要描述）
3. 每个交付物有明确的"客户感知价值"（客户看到/用到的感觉）
4. 体现黎镭的OpenClaw生态优势

输出格式（直接输出，不要解释）：
## 第一阶段：诊断与规划（第1-2周）
| 交付物 | 内容说明 | 客户感知价值 |
|--------|----------|--------------|
| ...    | ...      | ...          |

## 第二阶段：落地执行（第3-8周）
...

## 第三阶段：陪跑与迭代（第9-12周）
...
"""
    },
    {
        "id": "competitor_research",
        "name": "竞品研究 — 同类AI培训课程分析",
        "description": "搜索3-5个同类AI培训课程，分析它们的定价、卖点、用户评价，找差异化机会",
        "model": "minimax-cn/MiniMax-M2.7",
        "prompt_template": """你是黎镭的AI培训业务竞品分析师。

任务：搜索并分析当前市面上3-5个同类AI培训课程/工作坊

需要分析维度：
1. 课程名称和机构
2. 定价（原价/优惠价）
3. 核心卖点（用1句话概括）
4. 用户真实评价（从公开渠道找）
5. 黎镭可以借鉴或差异化的地方

黎镭的课程特点：
- OpenClaw生态（自动化工作流）
- 线下为主
- 包含陪跑服务
- 面向B端和中小企业

输出格式（直接输出，不要解释）：
## 竞品1：[课程名/机构]
- 定价：
- 核心卖点：
- 真实评价：（引用1-2句）
- 黎镭差异化机会：

（以此类推）

## 综合分析
- 市场定价区间：
- 最大差异化机会：
- 黎镭最应该强调的3个卖点：
"""
    },
    {
        "id": "email_outreach",
        "name": "cold_email — 5条潜在客户开场白",
        "description": "为AI培训写5条不同角度的Cold Email开场白，针对5类不同画像的潜在客户",
        "model": "minimax-cn/MiniMax-M2.7",
        "prompt_template": """你是黎镭的AI培训获客策略师。

业务背景：
- 黎镭做AI培训和咨询陪跑，目标客户是企业决策者/老板
- 需要主动拓展客户，不能只靠自然流量
- Cold Email是核心获客渠道之一

任务：写5条Cold Email开场白，每条针对不同画像的客户：

客户画像：
1. 中小制造企业老板（50-200人）— 关注降本增效
2. 电商/新媒体公司负责人 — 关注流量和内容生产效率
3. 传统企业IT负责人 — 关注内部流程自动化
4. 创业公司CEO — 关注用AI降低人力成本
5. 连锁品牌运营负责人 — 关注门店标准化和AI辅助决策

要求每条邮件：
- 第一句话直接点出对方的痛点（不要废话）
- 第二句话给出黎镭帮过谁的例子（数字说话）
- 第三句话是开放性提问，让对方回复
- 全程<80字
- 不要用"想了解更多"、"如需""等废话

输出格式（直接输出，不要解释）：
邮件1【中小制造企业老板】：
（80字以内）
---
邮件2【电商/新媒体公司】：
...
"""
    },
    {
        "id": "second_brain_research",
        "name": "Second Brain — 研究竞品功能改进",
        "description": "查看Second Brain现有功能，分析哪些功能可以增加用户粘性和付费意愿",
        "model": "minimax-cn/MiniMax-M2.7",
        "prompt_template": """你是Second Brain的产品研究员。

Second Brain是什么：
- 黎镭的AI知识管理+智能体协同工具
- 基于Next.js + Supabase
- 用户可以看到记忆、文档、任务、Agent状态

任务：基于对Second Brain现状的理解（记忆系统+文档+Agent协同），提出3个可以显著提升用户价值感的功能建议。

分析维度：
1. 用户最常用的功能是什么？哪些地方最可能流失用户？
2. 哪些功能竞品有但Second Brain没有？
3. 哪些功能是黎镭的独特优势，可以放大？

输出格式（直接输出，不要解释）：
## 功能建议1：[功能名]
- 用户价值：（为什么用户会想要这个）
- 实现思路：（1-2句话）
- 优先级：（高/中/低）理由

## 功能建议2：...

## 功能建议3：...
"""
    },
    {
        "id": "linkedin_content",
        "name": "LinkedIn选题 — 本周3篇内容规划",
        "description": "围绕AI培训和OpenClaw，写3个适合LinkedIn发布的内容选题",
        "model": "minimax-cn/MiniMax-M2.7",
        "prompt_template": """你是黎镭的LinkedIn内容策划师。

业务背景：
- 黎镭在LinkedIn展示AI培训和OpenClaw生态的专业形象
- 目标：建立专业认知，吸引B端决策者
- 内容风格：实战、犀利、不废话、不卖课感

任务：为本周规划3篇LinkedIn内容选题，要求：
1. 每个选题有明确的"钩子"（让人想点进来的理由）
2. 每篇有具体角度，不是泛泛而谈
3. 体现黎镭的真实经验和观点，不是AI生成感
4. 适合B端决策者阅读

本周时间：{today}

输出格式（直接输出，不要解释）：
## 选题1：【标题】（发布日：周一）
- 角度：
- 核心观点（3句）：
- 结尾行动号召：

## 选题2：【标题】（发布日：周三）
...

## 选题3：【标题】（发布日：周五/周六）
...
"""
    },
]

# ── 主流程 ────────────────────────────────────────────────

def main():
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    print(f"\n{'#'*60}")
    print(f"# 🤖 Autonomous Employee 上线 | {now}")
    print(f"{'#'*60}")

    # Step 1: 收集业务上下文
    print("\n📋 收集业务上下文...")
    mem = read_memory_files()
    docs = get_supabase_recent_docs()
    crons = get_cron_status()

    context = f"""
今天是 {today_str}。以下是当前业务上下文：

【今日记忆摘要】
{mem.get('daily_today', '无')[-1500:]}

【战略记忆】
{mem.get('strategic', '无')[-1000:]}

【最近生产内容】
{docs}

【今天已跑的Cron任务】
{crons}

【P0业务方向】
- AI培训（OpenClaw生态线下课）
- AI咨询（长期陪跑）
- AI陪跑（商业教练）
"""

    # Step 2: 选择任务
    print("\n🧠 分析业务状态，选择最优任务...")
    selection_prompt = f"""你是黎镭的Autonomous AI Employee。

{context}

今天已经有很多任务在跑了。作为 autonomous employee，你需要选择1个高价值的任务来执行。

任务池（只能选1个）：
{tasks_json}

选择标准：
1. 哪个任务对当前业务推进最有直接价值？
2. 哪个任务还没有被今天其他cron覆盖？
3. 执行结果能直接产生可交付的成果（文案/文档/分析/建议）？

请只输出选中的任务ID，不要解释：
"""
    
    tasks_json = "\n".join([f"- {t['id']}: {t['name']} — {t['description']}" for t in TASK_POOL])
    selection_prompt = selection_prompt.replace("{tasks_json}", tasks_json)
    selection_prompt = selection_prompt.replace("{today}", today_str)

    chosen_id = call_llm(selection_prompt, "minimax-cn/MiniMax-M2.7")
    chosen_task = next((t for t in TASK_POOL if t["id"] == (chosen_id or "").strip()), None)
    
    if not chosen_task:
        # Fallback: random
        chosen_task = random.choice(TASK_POOL)
        print(f"[WARN] LLM selection failed, randomly chose: {chosen_task['name']}")
    else:
        print(f"✅ 选择任务: {chosen_task['name']}")

    # Step 3: 执行任务
    print(f"\n🚀 执行任务: {chosen_task['name']}")
    prompt = chosen_task["prompt_template"].replace("{today}", today_str)
    result = call_llm(prompt, chosen_task["model"])
    
    if result:
        print(f"✅ 任务完成，结果长度: {len(result)}字")
    else:
        result = "（任务执行失败，请检查日志）"
        print(f"❌ 任务执行失败")

    # Step 4: 写入日志
    log_entry = f"""
---
## 🤖 Autonomous Employee | {now}

**任务**: {chosen_task['name']}
**任务ID**: {chosen_task['id']}

**执行结果**:
{result}

---
"""
    
    log_path = f"{WORKSPACE}/memory/daily/{today_str}.md"
    try:
        with open(log_path, "a") as f:
            f.write(log_entry)
        print(f"✅ 日志写入: {log_path}")
    except Exception as e:
        print(f"❌ 日志写入失败: {e}")

    # Step 5: 推送飞书
    summary = f"""🤖 Autonomous Employee 夜班报告 | {now}

**今夜任务**: {chosen_task['name']}

**产出摘要**:
{result[:800]}{'...' if len(result) > 800 else ''}

---
💡 明天继续推进。"""

    try:
        feishu_token = get_feishu_token()
        send_feishu_message(feishu_token, FEISHU_USER_ID, summary)
        print("✅ 飞书推送成功")
    except Exception as e:
        print(f"❌ 飞书推送失败: {e}")

    print(f"\n{'='*60}")
    print(f"# ✅ Autonomous Employee 夜班完成 | {chosen_task['name']}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
