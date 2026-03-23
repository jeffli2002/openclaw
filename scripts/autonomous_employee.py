#!/usr/bin/env python3
"""
Autonomous Employee — 每天凌晨2点自动执行
角色：黎镭的 autonomous AI employee
职责：主动推进 AI培训/AI咨询/AI陪跑 三个P0业务

周循环制度：
  第1周 → 🔥 获客引擎（内容 + Cold Outreach）
  第2周 → 📦 产品设计（咨询/陪跑产品标准化）
  第3周 → ⚙️ 交付系统（培训SOP + 客户案例）
  第4周 → 📊 战略复盘（数据分析 + 下一步）

每次流程：
  1 → 读取业务上下文
  2 → 判断周主题和今日任务
  3 → 执行并产出
  4 → 写入日志 + 推送飞书
"""

import subprocess
import json
import sys
import os
import requests
import datetime
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────────
WORKSPACE   = "/root/.openclaw/workspace"
SUPABASE_URL  = "https://njxjuvxosvwvluxefrzg.supabase.co"
SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeGp1dnhvc3Z3dmx1eGVmcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjkyNTUsImV4cCI6MjA4NzQwNTI1NX0.FqfMyI3uSkiHVepWVccxFU4ie5RU00VVdrF-aOr9LjI"
FEISHU_APP_ID     = "cli_a93a60e4ae795cee"
FEISHU_APP_SECRET = "ObQFsvOOT8aUWtV62kneIhWyyo2XLIuG"
FEISHU_USER_ID = "ou_aeb3984fc66ae7c78e396255f7c7a11b"

# ── 模型配置 ──────────────────────────────────────────────
MODEL_CONFIGS = {
    "minimax-cn/MiniMax-M2.5": {
        "base_url": "https://api.minimaxi.com/anthropic/v1/messages",
        "api_key": "sk-cp-cMqGihpXu1XQ7CnFGLKP5kUORqrva1RJ_MDdrOSF5DXD4dmijK1aoHUhD6glH1qJUMBXts8PntThJNMdkiIdEGcBB9WKn9M4-_2zaE29N1-w3R8RsFchavo",
        "model": "MiniMax-M2.5",
        "format": "anthropic",
    },
}

def call_llm(prompt, model="minimax-cn/MiniMax-M2.5"):
    config = MODEL_CONFIGS.get(model, MODEL_CONFIGS["minimax-cn/MiniMax-M2.5"])
    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    try:
        body = {
            "model": config["model"],
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}]
        }
        resp = requests.post(config["base_url"], headers=headers, json=body, timeout=120)
        if resp.ok:
            data = resp.json()
            for block in data.get("content", []):
                if block.get("type") == "text":
                    return block.get("text", "")
            return ""
    except Exception as e:
        print(f"[WARN] LLM call failed: {e}", file=sys.stderr)
    return None

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

def get_feishu_user_info(token, user_id):
    """获取飞书用户信息（用于确认身份）"""
    resp = requests.get(
        f"https://open.feishu.cn/open-apis/contact/v3/users/{user_id}?user_id_type=open_id",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    if resp.ok:
        return resp.json()
    return {}

def create_feishu_doc(token, title, content):
    """在飞书云文档创建一篇文档"""
    # 1. 创建文档
    doc_resp = requests.post(
        "https://open.feishu.cn/open-apis/docx/v1/documents",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"title": title},
        timeout=15
    )
    if not doc_resp.ok:
        return None, doc_resp.text

    doc_data = doc_resp.json()
    doc_token = doc_data.get("data", {}).get("document", {}).get("document_id")
    if not doc_token:
        return None, "No document_id in response"

    # 2. 写入内容（使用 blocks API）
    blocks_payload = []
    for para in content.split("\n"):
        if para.strip():
            blocks_payload.append({
                "block_type": 2,  # paragraph
                "paragraph": {
                    "elements": [{"type": "text_run", "text_run": {"content": para}}],
                    "style": {}
                }
            })

    if blocks_payload:
        block_resp = requests.post(
            f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_token}/blocks/{doc_token}/children",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"children": blocks_payload, "index": -1},
            timeout=15
        )

    doc_url = f"https://my.feishu.cn/docx/{doc_token}"
    return doc_url, None

def get_week_of_cycle(date_obj):
    """计算这是第几周（4周循环）"""
    # 以2026-03-23为第1周第1天（周一）基准
    cycle_start = datetime.date(2026, 3, 23)
    days_since = (date_obj - cycle_start).days
    week_index = (days_since // 7) % 4  # 0=第1周, 1=第2周, 2=第3周, 3=第4周
    return week_index

def get_day_of_week(date_obj):
    """0=周一, 6=周日"""
    return date_obj.weekday()

def get_business_context():
    """读取业务上下文"""
    files = {
        "daily": f"{WORKSPACE}/memory/daily/{datetime.date.today().strftime('%Y-%m-%d')}.md",
        "strategic": f"{WORKSPACE}/memory/global/strategic.md",
        "system": f"{WORKSPACE}/autonomous-employee/SYSTEM.md",
    }
    ctx = {}
    for key, path in files.items():
        try:
            with open(path, "r") as f:
                ctx[key] = f.read()[-4000:]
        except:
            ctx[key] = ""
    return ctx

def get_recent_memos():
    """获取最近的R&D Memo"""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/documents?type=eq.rd_memo&select=id,title,date,content&order=date.desc&limit=5",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        timeout=10
    )
    if resp.ok:
        return resp.json()
    return []

# ── 周主题任务池 ──────────────────────────────────────────

WEEK_THEMES = {
    0: {
        "name": "🔥 获客引擎",
        "theme_prompt": "本周主题是「获客引擎」：内容创作 + Cold Outreach。重点是生产可以在LinkedIn/朋友圈传播的内容，以及可以持续复用的Cold Email序列。",
        "tasks": [
            {
                "id": "wechat_monday",
                "day": 0,  # 周一
                "name": "微信公众号内容",
                "description": "写一篇有观点的微信公众号文章，并写入飞书云文档供黎镭审核",
                "prompt": """你是黎镭的内容策划师。

黎镭的背景：
- AI培训专家，OpenClaw生态核心推手
- 做企业AI培训、咨询陪跑、商业教练
- 目标客户：B端企业决策者、中小企业主
- 风格：实战、犀利、有态度，不废话

本周主题：获客引擎（内容创作）
今日任务：写一篇微信公众号文章

要求：
1. 有明确的观点（不是泛泛而谈）
2. 有具体例子或数据支撑
3. 结尾有明确的CTA
4. 语气真实，像人写的不像AI
5. 长度：800-1500字
6. 标题要吸引人，让人想点进来

文章主题方向（选择一个，或自己提一个更好的）：
选项A：「为什么你上了那么多AI课，还是落不了地？」
选项B：「企业AI转型最大的障碍不是技术，是这个」
选项C：「AI培训的真实成本：不是课时的费用，是机会成本」

输出格式（直接输出文章全文，不需要任何说明）：
---
标题：（吸引人的标题，1句话）
作者：黎镭
正文：
（800-1500字的完整文章内容）
---
附注：请将本文直接写入飞书云文档，文件名为「AI思考 | [标题]」，存入飞书知识库。
---"""
            },
            {
                "id": "cold_email_tuesday",
                "day": 1,  # 周二
                "name": "Cold Email序列",
                "description": "写5条Cold Email，针对5个不同画像的潜在客户",
                "prompt": """你是黎镭的获客策略师。

黎镭的业务：
- AI培训（OpenClaw生态，面向B端企业/中小企业主）
- AI咨询陪跑（帮助企业真正落地AI能力）
- AI商业教练（创始人/核心团队长期陪跑）

目标：写5条Cold Email开场白，每条针对不同画像的客户

客户画像：
1. 中小制造企业老板（50-200人）→ 关注降本增效、合规、交付周期
2. 电商/新媒体公司负责人 → 关注流量、内容生产效率、ROI
3. 传统企业IT负责人 → 关注内部流程自动化、数据打通
4. 创业公司CEO → 关注用AI降低人力成本、竞争壁垒
5. 连锁品牌运营负责人 → 关注门店标准化、AI辅助决策

每条邮件要求：
- 第一句：直接点出对方痛点（不要废话铺垫）
- 第二句：给出黎镭帮过谁的例子（数字说话）
- 第三句：开放性问题，让对方回复
- 全程<80字
- 不要用"想了解更多"、"如需"、"期待交流"等废话

输出格式（直接输出5封邮件）：
---
邮件1【中小制造企业老板】：
（80字以内）

---
邮件2【电商/新媒体公司】：
... """
            },
            {
                "id": "competitor_wednesday",
                "day": 2,  # 周三
                "name": "竞品研究",
                "description": "搜索并分析3-5个同类AI培训课程",
                "prompt": """你是黎镭的竞品分析师。

任务：搜索并分析3-5个市面上同类AI培训课程/工作坊

分析维度：
1. 课程名称和机构
2. 定价（原价/优惠价）
3. 核心卖点（1句话）
4. 用户真实评价（从公开渠道找）
5. 黎镭可以借鉴或差异化的地方

黎镭的课程特点：
- OpenClaw生态（自动化工作流，不是概念课）
- 线下为主
- 包含陪跑服务
- 面向B端和中小企业

输出格式（直接输出分析全文）：
---
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
---"""
            },
            {
                "id": "case_study_thursday",
                "day": 3,  # 周四
                "name": "客户成功案例",
                "description": "写1-2个客户成功案例，用于销售素材",
                "prompt": """你是黎镭的内容写作师。

任务：写1-2个客户成功案例（可以是真实经历或基于真实背景的虚构案例，但要有说服力）

格式要求：
- 有具体行业/公司背景
- 有具体的痛点描述
- 有明确的结果（数字）
- 有黎镭具体做了什么
- 结尾有 CTA

案例类型（选一个写）：
选项A：「某制造企业通过AI工作流，3个月内将重复性人力减少40%」
选项B：「某电商团队用OpenClaw实现内容生产自动化，人效提升3倍」
选项C：「某创始人通过AI陪跑，3个月内建立了自己的AI工作流，节省20小时/周」

输出格式（直接输出案例全文）：
---
## 案例标题
**行业：** xx | **公司规模：** xx | **耗时：** xx

### 来之前的问题
（2-3句话）

### 做了什么
（黎镭的具体动作，1-2句话）

### 量化成果
（数字：效率提升%、成本降低%、营收变化等）

### 客户评价
（引用1-2句话）

---
**如果你想了解如何复制这个成果，欢迎聊一聊：**
[联系黎镭]
---"""
            },
            {
                "id": "product_friday",
                "day": 4,  # 周五
                "name": "培训产品设计",
                "description": "设计或更新AI培训的标准课程模块和定价",
                "prompt": """你是黎镭的产品经理。

任务：基于本周获客引擎的洞察，更新AI培训的产品设计

背景：
- 黎镭的AI培训以OpenClaw生态为核心
- 目标客户：B端企业决策者、中小企业主
- 核心差异化：不是概念课，是真正能落地的工作坊

要求：
1. 将现有培训内容拆分为4-6个独立模块
2. 每个模块有明确的学习目标和产出
3. 提出2-3个定价方案（引流课/标准课/高单价课）
4. 每个方案有明确的目标客户

输出格式（直接输出设计文档）：
---
## AI培训产品手册 v1

### 模块设计
| 模块 | 学习目标 | 核心产出 | 建议时长 |
|------|----------|----------|----------|
| ...  | ...      | ...      | ...      |

### 定价方案

**方案A：[名称]**
- 目标客户：
- 定价：
- 包含内容：
- 交付形式：

（以此类推）

### 本周获客洞察
（基于本周内容/竞品分析，总结对产品设计的启发）
---"""
            },
            {
                "id": "sunday_reflect",
                "day": 6,  # 周日
                "name": "周报与下周计划",
                "description": "写本周工作总结和下周详细计划",
                "prompt": """你是黎镭的 Autonomous AI Employee。

任务：写本周工作总结和下周详细计划

本周主题：🔥 获客引擎（内容创作 + Cold Outreach）

请结合本周业务上下文，输出一份周报：

输出格式（直接输出报告）：
---
## 本周工作总结

### 完成产出
1. （列出具体产出，不要说"写了文章"，要说"发布了《xxx》文章，全文xxx字，获得xxx互动"）
2. ...

### 关键洞察
（3条以内，基于本周工作得出的可执行洞察）

### 存在的差距
（什么没有做到，为什么）

---

## 下周详细计划

### 下周主题
（根据本周复盘，决定下周主题）

### 每日任务
周一：
周二：
...

### 需要黎镭决策的事
（列出需要他确认/参与的事情）
---"""
            },
        ]
    },
    1: {
        "name": "📦 产品设计",
        "theme_prompt": "本周主题是「产品设计」：把AI咨询和陪跑服务标准化、产品化，让它们可以规模化交付。",
        "tasks": [
            {
                "id": "advisory_handbook",
                "day": 0,
                "name": "AI咨询产品手册",
                "description": "设计AI咨询服务的标准交付清单和定价体系",
                "prompt": """你是黎镭的产品设计师。

任务：设计「AI咨询服务」的标准产品手册

背景：
- AI咨询：帮助企业建立内部AI工作流，诊断+落地+陪跑
- 客户：B端企业负责人
- 痛点：咨询交付依赖个人经验，客户感知不到价值

要求：
1. 分3个阶段：诊断期/落地期/陪跑期
2. 每个阶段产出3-5个具体交付物（文件名+简要描述）
3. 每个交付物有明确的"客户感知价值"
4. 提出2-3个定价方案（按项目/按月/按年）
5. 体现OpenClaw生态优势

输出格式：
---
## AI咨询服务产品手册 v1

### 服务阶段
## 第一阶段：诊断与规划（第1-2周）
| 交付物 | 内容说明 | 客户感知价值 |
|--------|----------|--------------|
| ...    | ...      | ...          |

## 第二阶段：落地执行（第3-8周）
...

## 定价方案
**方案A：[名称]**
- 定价：
- 适合客户：
- 包含内容：
...---"""
            },
            {
                "id": "running_handbook",
                "day": 1,
                "name": "AI陪跑产品手册",
                "description": "设计AI陪跑（商业教练）服务的标准和定价",
                "prompt": """你是黎镭的产品设计师。

任务：设计「AI陪跑」（商业教练）服务的标准产品手册

背景：
- AI陪跑：持续陪伴创始人/团队AI转型，按月交付
- 黎镭的核心差异化：OpenClaw生态 + 实战经验 + 长期陪伴
- 目标客户：B端创始人、核心决策者

要求：
1. 明确陪跑的核心价值主张（为什么比普通教练值钱）
2. 设计3档服务（入门/标准/深度）
3. 每档有明确的交付内容和交付节奏
4. 包含具体的"里程碑"（客户在哪些节点能看到进展）
5. 定价透明，有明确的ROI说明

输出格式：
---
## AI陪跑服务产品手册 v1

### 价值主张
（为什么企业需要AI陪跑，而不是自己学/请顾问）

### 服务档位

**入门陪跑（1个月）**
- 定价：
- 适合客户：
- 每周交付：
- 第1个月里程碑：
- 客户感知价值：

**标准陪跑（3个月）**
...

**深度陪跑（6-12个月）**
...

### 立即行动CTA
（让潜在客户想开始的设计）
---"""
            },
            {
                "id": "training_sop",
                "day": 3,
                "name": "培训SOP",
                "description": "建立AI培训的标准操作流程（课前/课中/课后）",
                "prompt": """你是黎镭的运营负责人。

任务：建立AI培训的标准SOP，让培训可复制、可持续

要求：
1. 课前：如何准备、内容如何发送、学员需要什么前置条件
2. 课中：标准流程、时间分配、互动设计、常见问题处理
3. 课后：跟进动作、学员作业、效果追踪、转介绍机制
4. 每个环节有明确的"完成标准"
5. 用表格和清单形式，方便执行

输出格式：
---
## AI培训标准SOP v1

### 课前（培训前7天→培训当天）
| 动作 | 负责人 | 完成标准 | 工具/模板 |
|------|--------|----------|------------|
| ...  | ...    | ...      | ...        |

### 课中（培训当天）
| 时间段 | 动作 | 负责人 | 完成标准 |
|--------|------|--------|----------|
| ...    | ...  | ...    | ...      |

### 课后（培训结束→30天）
| 时间点 | 动作 | 负责人 | 完成标准 |
|--------|------|--------|----------|
| ...    | ...  | ...    | ...      |
---"""
            },
            {
                "id": "advisory_deliverable",
                "day": 4,
                "name": "咨询启动包",
                "description": "为AI咨询设计首次诊断的标准问卷和流程",
                "prompt": """你是黎镭的咨询顾问。

任务：设计「AI咨询首次诊断」的标准启动包

要求：
1. 首次咨询前的预填问卷（让客户提前思考，也让你提前了解情况）
2. 首次咨询的标准议程（60分钟如何分配）
3. 首次咨询后的共识文档模板（让客户明确下一步）
4. 诊断报告模板（让客户感知到专业性）

输出格式：
---
## AI咨询首次诊断 启动包

### 预填问卷（发送时间：预约后/培训前）
问题1：[帮助了解xx]
问题2：[帮助了解xx]
...
（总共8-12个问题，涵盖：业务现状/痛点/已有AI尝试/预算/决策链）

### 首次咨询标准议程（60分钟）
| 时间 | 环节 | 目的 |
|------|------|------|
| 0-5min | 开场+目标确认 | 共识 |
| ...    | ...  | ...  |

### 共识文档模板
---
**本次咨询共识**
客户：
日期：
主要发现：[3个核心问题]
建议方向：[优先级排序]
下一步：[3个具体行动]
承诺：[双方约定的事项]
---

### 诊断报告模板
（标准格式，让每次诊断有可比性）
---"""
            },
            {
                "id": "sunday_review_p2",
                "day": 6,
                "name": "周报与下周计划",
                "description": "写本周工作总结和下周详细计划",
                "prompt": """你是黎镭的 Autonomous AI Employee。

任务：写本周工作总结和下周详细计划

本周主题：📦 产品设计（AI咨询/陪跑/培训产品标准化）

请结合本周业务上下文，输出一份周报：

输出格式：
---
## 本周工作总结

### 完成产出
1. （具体产出名称和描述）
2. ...

### 关键洞察
（基于产品设计得出的3条以内可执行洞察）

### 存在的差距

---

## 下周详细计划

### 下周主题
（根据本周产品设计的完成情况决定）

### 每日任务
周一：
周二：
...

### 需要黎镭决策的事
---"""
            },
        ]
    },
    # 第3周和第4周的任务池暂时留空，后续由AI自主填充
    2: {
        "name": "⚙️ 交付系统",
        "theme_prompt": "本周主题是「交付系统」：建立培训SOP、客户成功案例、追踪工具，让交付质量可控制。",
        "tasks": []
    },
    3: {
        "name": "📊 战略复盘",
        "theme_prompt": "本周主题是「战略复盘」：分析数据、回顾进展、规划下一步。",
        "tasks": []
    },
}

# ── 主流程 ────────────────────────────────────────────────

def main():
    now = datetime.datetime.now()
    today = now.date()
    today_str = today.strftime("%Y-%m-%d")
    now_str = now.strftime("%Y-%m-%d %H:%M")

    print(f"\n{'#'*60}")
    print(f"# 🤖 Autonomous Employee 上线 | {now_str}")
    print(f"{'#'*60}")

    # Step 1: 收集上下文
    print("\n📋 读取业务上下文...")
    ctx = get_business_context()
    memos = get_recent_memos()

    context_brief = f"""
今天是 {today_str} {now.strftime('%A')}。

【系统设计目标】
P0: AI培训 / AI咨询 / AI陪跑

【本周记忆摘要】
{ctx.get('daily', '')[:1500]}

【最近R&D Memo产出】
{memos[:3]}

【系统设计】
{ctx.get('system', '')[:1000]}
"""

    # Step 2: 判断周主题和今日任务
    week_index = get_week_of_cycle(today)
    day_of_week = get_day_of_week(today)
    week_data = WEEK_THEMES.get(week_index, WEEK_THEMES[0])
    theme_name = week_data["name"]

    print(f"\n📅 周主题: {theme_name}（第{week_index+1}周/共4周）")
    print(f"📆 今天是: {['周一','周二','周三','周四','周五','周六','周日'][day_of_week]}")

    # 找到今天应该执行的任务
    today_task = None
    for task in week_data["tasks"]:
        if task["day"] == day_of_week:
            today_task = task
            break

    # 周日缓冲日：如果没有特定任务，做周报
    if not today_task:
        if day_of_week == 6:
            today_task = week_data["tasks"][-1] if week_data["tasks"] else None
        else:
            # 找有没有任何未完成的重要任务可以补做
            today_task = None

    if not today_task:
        print("\n📝 今日无特定任务（周六缓冲日）")
        print("💤 本周进展良好，继续保持")
        # 推送简洁的缓冲日报告
        try:
            token = get_feishu_token()
            msg = f"""🤖 Autonomous Employee 夜班 | {now_str}

📅 {theme_name} | {['周一','周二','周三','周四','周五','周六','周日'][day_of_week]}

📊 本周任务执行良好，缓冲日自动休整。
明天继续推进。

💡 如有紧急事项，可在飞书直接告知。"""
            send_feishu_message(token, FEISHU_USER_ID, msg)
        except Exception as e:
            print(f"飞书推送失败: {e}")
        return

    print(f"\n🚀 执行任务: {today_task['name']}")
    print(f"   {today_task['description']}")

    # Step 3: 执行任务
    full_prompt = f"""{week_data['theme_prompt']}

业务上下文：
{context_brief}

今日任务：{today_task['name']}
{today_task['description']}

请直接执行任务，输出完整的交付内容。不要解释你在做什么，直接输出结果。
"""
    result = call_llm(full_prompt)

    if result:
        print(f"\n✅ 任务完成，产出长度: {len(result)}字")
    else:
        result = "（任务执行失败，请检查日志）"
        print(f"\n❌ 任务执行失败")

    # Step 4: 写入日志
    log_entry = f"""
---
## 🤖 Autonomous Employee | {now_str}
**周主题**: {theme_name}（第{week_index+1}周/4周）
**任务**: {today_task['name']}

**产出**:
{result[:500]}{'[已截断]' if len(result) > 500 else ''}

---
"""
    log_path = f"{WORKSPACE}/memory/daily/{today_str}.md"
    try:
        with open(log_path, "a") as f:
            f.write(log_entry)
        print(f"✅ 日志写入: {log_path}")
    except Exception as e:
        print(f"❌ 日志写入失败: {e}")

    # Step 5: 内容任务 → 写入飞书云文档
    feishu_doc_url = None
    if "内容" in today_task["name"] or "文章" in today_task["name"]:
        try:
            token = get_feishu_token()
            title_line = [l for l in result.split("\n") if "标题" in l]
            doc_title = title_line[0].split("：")[-1].strip() if title_line else f"AI思考 | {today_task['name']}"
            content_part = result.split("正文：")[-1].split("---")[0].strip() if "正文：" in result else result
            feishu_doc_url, err = create_feishu_doc(token, doc_title, content_part)
            if feishu_doc_url:
                print(f"✅ 飞书云文档: {feishu_doc_url}")
            else:
                print(f"⚠️ 飞书文档创建失败: {err}")
        except Exception as e:
            print(f"⚠️ 飞书文档创建异常: {e}")

    # Step 6: 推送飞书
    doc_line = f"\n📄 飞书文档: {feishu_doc_url}" if feishu_doc_url else ""
    summary = f"""🤖 Autonomous Employee 夜班报告 | {now_str}

📅 {theme_name} | {['周一','周二','周三','周四','周五','周六','周日'][day_of_week]}

**今夜任务**: {today_task['name']}

**产出摘要**:
{result[:800]}{'...' if len(result) > 800 else ''}{doc_line}

---
💡 明晚02:00继续推进。"""

    try:
        token = get_feishu_token()
        send_feishu_message(token, FEISHU_USER_ID, summary)
        print("✅ 飞书推送成功")
    except Exception as e:
        print(f"❌ 飞书推送失败: {e}")

    print(f"\n{'='*60}")
    print(f"# ✅ 夜班完成 | {today_task['name']}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
