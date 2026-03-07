# AI一人公司云端架构实战：我是如何构建全自动化AI工作流的

**作者：Jeff | 虾仔AI**

---

## 开篇：AI创业者的困境

2026年，AI让一个人就是一支团队成为可能。

但真正做起来才发现：AI工具太多不知道用哪个、任务分散在各个平台、每天光协调AI就耗掉大半精力。

真正的AI一人公司，需要的是**一套自动化的基础设施**——让AI自己管理自己。

今天，聊聊我是如何构建这套系统的。

---

## 一、整体架构：四层分离

我的AI一人公司系统，采用**四层分离架构**：

```
用户（我） → 飞书 → OpenClaw Gateway → Cloud API → Worker Agents
                              ↓
                         Memory Manager
```

每一层各司其职：

| 层级 | 职责 | 技术 |
|------|------|------|
| 对话层 | 用户交互 | 飞书 |
| 分发层 | 任务路由 | OpenClaw Gateway |
| 编排层 | Agent调度 | FastAPI Cloud API |
| 执行层 | 具体工作 | Content/Growth/Coding Agents |

**核心设计理念**：让最核心的决策层（Chief Agent）拥有绝对权力，其他Agent都是"无状态工人"。

---

## 二、Memory分层设计：只有Chief有记忆权

这是最关键的设计。

市面上大多数方案让每个Agent独立记忆——结果是：
- 记忆碎片化
- 战略无法统一
- Agent之间"鸡同鸭讲"

我的方案是**集中式记忆**：

```
memory/
├── chief/              # 战略记忆（只有Chief能写）
│   ├── strategic_memory.md
│   ├── company_rules.md
│   └── vision.md
├── projects/           # 项目状态
│   └── default_project.md
├── agent_cache/       # 执行缓存（Agent只读写）
└── daily/            # 每日工作日志
```

**规则**：
- 只有Chief Agent能写长期记忆
- Sub-Agent是"无状态工人"，只接收任务、执行、返回结果
- 所有报告都是append-only，禁止覆盖

这样做的好处：战略决策永远清晰，不受碎片化记忆干扰。

---

## 三、Agent编排：Chief调度模式

传统的Multi-Agent方案容易"群龙无首"——Agent之间相互抢夺任务。

我的方案是**单入口调度**：

```
用户任务 → Chief分析意图 → 分发给对应Agent → 执行 → Chief合成结果 → 写入Memory
```

目前配置的Agent：

| Agent | 关键词 | 主力模型 | 职责 |
|-------|--------|----------|------|
| Content | 日报、脚本、文案 | MiniMax M2.5 | 内容创作 |
| Growth | SEO、增长、转化 | MiniMax M2.5 | 增长黑客 |
| Coding | 代码、API、Bug | Qwen Coder | 开发 |
| Product | PRD、Roadmap | Kimi K2.5 | 产品规划 |
| Finance | 财务、成本 | MiniMax M2.5 | 财务分析 |

**互斥规则**：Coding和Product不能同时运行，防止冲突。

---

## 四、云端部署：腾讯云实战

今天完成了整个架构的云端部署：

### 1. 基础架构
- 腾讯云服务器（已有）
- FastAPI Cloud API服务
- 端口8000对外开放

### 2. 与OpenClaw集成
最关键的一步：Cloud API调用OpenClaw的Gateway API。

```python
# Cloud API调用OpenClaw
response = httpx.post(
    "http://<gateway>/v1/chat/completions",
    headers={"Authorization": "Bearer <token>"},
    json={"model": "MiniMax-M2.5", "messages": [...]}
)
```

这样做的好处：
- 复用OpenClaw内置的OAuth认证（Qwen、MiniMax都能用）
- 统一入口管理
- 不需要单独配置各种API Key

### 3. 外网访问
腾讯云安全组开放8000端口，现在外部可以直接调用：

```bash
curl -X POST http://43.156.101.197:8000/api/task/execute \
  -d '{"task": "写一篇AI日报"}'
```

---

## 五、真实效果测试

测试结果：

| 场景 | 结果 |
|------|------|
| Content Agent写日报 | ✅ 30秒完成 |
| Coding Agent写代码 | ✅ 生成可运行代码 |
| 外部API调用 | ✅ 通过HTTP完成 |

整个流程：
```
外部请求 → Cloud API → OpenClaw Gateway → LLM → 返回结果 → 写入Memory
```

完全自动化。

---

## 六、总结：AI公司的基础设施

这套架构解决的核心问题：

1. **记忆统一** - 只有Chief有记忆权，避免碎片化
2. **任务可追踪** - 所有执行都有日志
3. **扩展性** - 新Agent只需在配置里加几行
4. **自动化** - Cron任务自动执行日报、监控

2026年，AI一人公司的竞争，本质上是**基础设施**的竞争。

谁先把AI调动起来，谁就赢在起跑线。

---

**下期预告**：如何用这套架构做SEO自动化？敬请期待。

---

*本文由虾仔AI助手撰写*
