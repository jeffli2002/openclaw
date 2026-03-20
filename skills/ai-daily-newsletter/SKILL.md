# AI Daily Newsletter Skill

生成AI行业日报，精选24小时内重大新闻。

## 信息源

<<<<<<< HEAD
### 主要搜索源
- web_search + freshness=pd: "OpenAI Anthropic Google AI 2026"
- web_search + freshness=pd: "中国 AI DeepSeek 字节跳动 2026"
- web_search + freshness=pd: "AI funding startup 2026"

### 关键词（必搜）
=======
### 搜索策略：广义搜索 + 趋势发现

**核心原则**：
1. 不仅搜关键词，还要搜趋势（GitHub Trending、开源项目）
2. 模型版本是动态的，搜"MiniMax"时连带搜最新模型
3. 热点新闻词能触发更多相关报道

### 动态搜索 Query（每次必搜）

**第一层：AI行业趋势**
- `web_search`: "AI 2026 最新消息"
- `web_search`: "大模型 发布 2026"  
- `web_search`: "开源 AI 模型 GitHub 2026"

**第二层：国外巨头**
- `web_search + freshness=pd`: "OpenAI Anthropic Google AI 2026"
- `web_search + freshness=pd`: "Claude GPT-5 Gemini 2026"

**第三层：中国AI**
- `web_search + freshness=pd`: "中国 AI DeepSeek 字节跳动 2026"
- `web_search + freshness=pd`: "MiniMax 智谱 月之暗面 2026"
- `web_search + freshness=pd`: "小米大模型 mIMO 2026"
- `web_search + freshness=pd`: "阿里 Qwen 通义千问 2026"

**第四层：AI基础设施**
- `web_search + freshness=pd`: "OpenRouter HuggingFace 2026"
- `web_search + freshness=pd`: "AI API 开源 2026"

**第五层：融资/商业**
- `web_search + freshness=pd`: "AI funding startup 2026"

### 关键词（辅助验证）

当搜到相关新闻后，用以下关键词验证是否有遗漏：
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856
- OpenClaw
- Anthropic
- Gemini
- DeepSeek
- Qwen
- Seedance
- Seedream
<<<<<<< HEAD
- MiniMax
=======
- MiniMax / 迷你Max
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856
- ChatGPT
- Claude
- 豆包
- 元宝
<<<<<<< HEAD

### RSS订阅源（推荐）
**第一层（必读 - 每天）**
- 量子位
- TechCrunch AI
=======
- 小米 / mIMO / 米家
- OpenRouter
- HuggingFace
- Moonshot / Kimi
- 智谱 / GLM
- 月之暗面 / Moonshot
- 阶跃星辰 / StepFun

### RSS订阅源（趋势发现）

**第一层（必读 - 每天）**
- 量子位 - 国内AI news
- TechCrunch AI - 海外AI
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856
- Anthropic Blog
- Simon Willison

**第二层（周读）**
- VentureBeat
- Lilian Weng
- Sebastian Raschka
- Ben's Bites

**第三层（按需）**
- Arxiv CS.AI
- 机器之心
<<<<<<< HEAD

### RSS工具推荐
- Feedly (feedly.com) - AI摘要过滤
- Follow (follow.is) - 自动发现RSS，支持AI摘要
- Inoreader - 关键词过滤规则
=======
- GitHub Trending (ai|llm|agent|machine-learning)
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856

## 执行步骤

### 第一步：天气
使用 weather 工具获取北京今日天气。

<<<<<<< HEAD
### 第二步：搜索新闻
使用 web_search + freshness=pd 搜索：
- "OpenAI Anthropic Google AI 2026" + freshness=pd
- "DeepSeek Qwen MiniMax 字节跳动" + freshness=pd
- "AI funding startup 2026" + freshness=pd
- "OpenClaw Claude Gemini ChatGPT" + freshness=pd
- "豆包 元宝 Seedream Seedance" + freshness=pd

### 第三步：验证时效
=======
### 第二步：广义搜索（核心）
按顺序执行以下搜索：

1. **搜趋势**：`web_search` 搜索 "AI 2026 最新消息" 获取当天热点
2. **搜国外**：`web_search + freshness=pd` 搜索 "OpenAI Anthropic Google AI 2026"
3. **搜中国**：`web_search + freshness=pd` 搜索 "MiniMax 智谱 月之暗面 2026"
4. **搜基础设施**：`web_search + freshness=pd` 搜索 "OpenRouter HuggingFace 2026"
5. **搜GitHub**：`web_search` 搜索 "GitHub trending AI 开源 2026"
6. **补充搜**：
   - "小米 mIMO 大模型 2026"
   - "OpenRouter Hunter Alpha 2026"
   - "MiniMax M2.7 2026"

### 第三步：多源验证
- 每条新闻至少在2个不同来源看到才入选
- 用关键词列表二次检查是否有遗漏

### 第四步：验证时效
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856
- 检查每条新闻的发布时间
- 只选择过去24小时内的
- 超过时间的直接跳过

<<<<<<< HEAD
### 第四步：输出格式
=======
### 第五步：输出格式
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856
```
🌤️ 北京今日天气：[天气]

📰 AI日报 | [月日]

🔥 全球AI
1. [公司] [标题] - [发布时间]
   [1-2句话提炼]
   [显示全文](URL)

🇨🇳 中国AI
1. [公司] [标题] - [发布时间]
   [1-2句话提炼]
   [显示全文](URL)

💰 融资/商业
1. [公司] [事件] - [发布时间]
   [1-2句话提炼]
   [显示全文](URL)

—
📝 虾仔观点
[用3-5句话总结今日新闻的核心洞察和趋势]

📮 虾仔为您精选
```

## 格式要求

1. **链接格式**：`[显示全文](URL)` - 节省空间，点击可跳转
2. **提炼要求**：每条新闻1-2句话总结
3. **时效要求**：严格24小时内，超过一律不报
4. **虾仔观点**：最后必须加3-5句话核心洞察
5. **不显示完整URL**：只用超链接格式
<<<<<<< HEAD
=======
6. **飞书最终投递必须是完整版正文**：最终发给老板的飞书消息，必须包含当天所有入选新闻的完整正文分组，不得只发送"3条重磅/核心摘要"替代全文。
7. **摘要只能做导语，不能替代正文**：如需在开头加 1-2 句总览可以，但后面仍必须完整展开全部条目。
8. **归档与发送保持一致**：本地 Markdown、飞书云文档、飞书最终消息三者应保持同一批入选新闻，不能出现"归档完整版、飞书只发摘要"的缩水投递。
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856

## 发送

使用 message 工具发送到飞书：
- channel: feishu
- target: ou_aeb3984fc66ae7c78e396255f7c7a11b

## 注意事项

- 不确定的信息标注「待确认」
- 绝对不编造新闻
- 优先选择有原文链接的新闻
<<<<<<< HEAD
=======
- **搜索策略是广义的不是狭义的**：每次要搜趋势、搜热点，而不是只盯几个关键词
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856
