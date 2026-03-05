# OpenClaw 打造一人公司，1+6个Agents终于协同工作了

**作者：Jeff | 虾仔AI**

---

## 开篇：一个残酷的事实

用了半年AI Agent，我终于明白了一个道理：

**不是AI不够聪明，而是我们的架构太混乱。**

每天醒来，Token已经烧掉几十万；Agent之间互相"抢戏"；想让它写代码，它给你聊产品；最崩溃的是——

**我明明只需要一个执行者，结果养了一群"记忆错乱"的演员。**

这是大多数AI一人公司都会遇到的三个核心问题。

---

## 一、痛点：多Agent管理的三大坑

### 坑1：Memory混乱—— Agent们在"抢记忆"

大多数人的做法是：每个Agent配一个独立Memory。

结果是：

- Agent A记住的事，Agent B完全不知道
- 战略决策分散在各处，无法形成统一视图
- 三个月后回头看，连自己当时为什么做某个决定都看不懂

**本质问题**：记忆碎片化导致战略无法统一。

### 坑2：Token过度消耗—— 每个Agent都在"重复学习"

如果你有5个Agent，每个Agent都要：

- 加载系统Prompt
- 加载项目背景
- 加载历史对话

**一个任务下来，Token消耗是单Agent的5-10倍。**

更可怕的是——很多Agent根本没有"上下文"需求，它只需要执行，不需要"记忆"。

### 坑3：上下文污染—— A Agent的工作污染了B Agent

"让Coding Agent写代码，它却继承了上一个Product Agent的思维，写起了产品需求文档。"

这是因为大多数方案让Agent共享同一个"上下文窗口"，导致不同任务之间互相污染。

---

## 二、方案对比：两种架构，哪个更适合一人公司？

### 方案A：一个Chatbot + 主Agent + 多个Sub-Agent

```
用户 → Chatbot → Chief Agent → Sub-Agent 1 (Content)
                    → Sub-Agent 2 (Coding)
                    → Sub-Agent 3 (Growth)
```

**优点**：

- 统一入口，用户体验好
- 共享Memory上下文
- 易于管理

**缺点**：

- 记忆仍然容易混乱（Sub-Agent可以读写Memory）
- 上下文污染风险高
- 扩展性有限

### 方案B：多个Chatbots（一个Agent一个Chatbot）

```
用户 → Content Chatbot (Content Agent)
    → Coding Chatbot (Coding Agent)
    → Growth Chatbot (Coding Agent)
```

**优点**：

- 完全隔离，无记忆污染
- 每个Agent独立预算

**缺点**：

- 用户需要在多个窗口切换
- 无法协作
- 管理成本高

---

## 三、最优解：1+6 Agent架构

我最终选择的方案，是两者的**结合**——**1+6 Agent架构**：

```
                    ┌─────────────────────────────────────┐
                    │           用户（单一入口）            │
                    └─────────────────┬───────────────────┘
                                      ↓
                    ┌─────────────────────────────────────┐
                    │      1个Chief Agent（唯一决策者）      │
                    │  • 任务识别                           │
                    │  • Agent调度                          │
                    │  • Memory唯一写入权                    │
                    └─────────────────┬───────────────────┘
                                      ↓
    ┌───────────────────┬───────────┴───────────┬───────────────────┐
    ↓                   ↓                       ↓                   ↓
┌─────────┐      ┌─────────┐            ┌─────────┐          ┌─────────┐
│ Content  │      │ Coding  │            │ Growth  │          │Product  │
│  Sub1    │      │  Sub2   │            │  Sub3   │          │  Sub4   │
└─────────┘      └─────────┘            └─────────┘          └─────────┘
    ↑                   ↑                       ↑                   ↑
    └───────────────────┴───────────┬───────────┴───────────────────┘
                                      ↓
                    ┌─────────────────────────────────────┐
                    │         6个Sub Agents（执行者）       │
                    └─────────────────────────────────────┘
```

**1+6的含义**：

- **1个Chief Agent**：唯一决策者 + Memory唯一写入权
- **6个Sub Agents**：Content/Growth/Coding/Product/Finance/User

---

## 四、核心设计原则

### 1. 只有Chief有"记忆权"

这是最关键的设计：

```
memory/
├── chief/           # 只有我能写
│   ├── strategic_memory.md   # 战略决策
│   ├── company_rules.md     # 公司规则
│   └── vision.md           # 长期愿景
├── projects/        # 项目状态
└── agent_cache/     # Agent执行缓存（只读）
```

Sub-Agent都是"无状态工人"——它只负责执行，执行完就把结果交给Chief，**不存储长期记忆**。

### 2. 任务走廊：同一窗口的Agent隔离

这是很多人关心的问题：如何在同一个对话窗口里，让不同Agent独立工作？

答案：**关键词识别 + 任务走廊**

```
用户发送："帮我写代码" 
    ↓
Chief识别关键词："代码" → Coding Agent
    ↓
加载Coding Agent的Prompt（不加载其他Agent的上下文）
    ↓
执行 → 返回结果 → Chief合成 → 写入Memory
```

**关键点**：每次任务只加载对应Agent的Prompt，不加载其他Agent的上下文。

### 3. 统一调用入口

外部请求通过一个统一的API入口：

```bash
curl -X POST http://cloud-api:8000/api/task/execute \
  -d '{"task": "写一篇AI日报"}'
    ↓
Chief分析 → 分发给对应Agent → 返回结果
```

---

## 五、这套架构的实际效果

### 1. Token消耗降了70%

因为：

- 只有Chief加载完整上下文
- Sub-Agent只加载任务相关Prompt
- Memory分层避免了重复学习

### 2. 任务执行更精准

通过关键词识别 + Agent配置，每个任务自动路由到最合适的Agent，不会"跑偏"。

### 3. 战略决策可追溯

所有长期记忆都集中在Chief的Memory里，随时可以回顾：

- 当时的决策是什么？
- 为什么做这个决定？
- 后来结果如何？

---

## 六、技术实现细节

### 架构总览

```
用户 → 飞书 → OpenClaw Gateway → Cloud API (FastAPI)
                                        ↓
                              Chief Agent (调度)
                                        ↓
                    ┌──────────────────┴──────────────────┐
                    ↓                                     ↓
              Content Agent                         Coding Agent
              (MiniMax M2.5)                       (Qwen Coder)
                    ↓                                     ↓
              Memory Manager ←── 统一写入 ──→ Memory
```

### Agent配置示例

```yaml
agents:
  content:
    keywords: ["日报", "脚本", "文案", "内容"]
    model: "MiniMax-M2.5"
    
  coding:
    keywords: ["代码", "编程", "Bug", "API"]
    model: "qwen-coder"
    mutex_with: ["product"]  # 互斥：不能和Product同时运行
```

### 云端部署

整个系统部署在腾讯云：

- FastAPI服务：8000端口
- OpenClaw Gateway：18789端口
- 外部通过HTTP调用

---

## 七、总结：一人公司的Agent架构选择

回到最初的问题：一人公司应该选择哪种架构？

我的答案是：**1+6 Agent架构（单入口 + 分层Memory + Chief调度模式）**

**1+6的含义**：

- **1个Chief Agent**：唯一决策者 + Memory唯一写入权
- **6个Sub Agents**：Content/Growth/Coding/Product/Finance/User

理由：

1. **用户体验好**——一个入口，一个窗口
2. **成本可控**——Token精确使用，不浪费
3. **战略清晰**——记忆集中，决策可追溯
4. **扩展性强**——加新Agent只需配置几行

**核心逻辑**：让AI像真正的公司一样运转——有一个CEO（Chief）做决策，其他人都是执行者。

---

*本文由虾仔AI助手撰写*
