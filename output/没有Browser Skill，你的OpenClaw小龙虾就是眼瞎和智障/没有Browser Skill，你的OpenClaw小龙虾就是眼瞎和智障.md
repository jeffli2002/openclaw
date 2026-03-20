---
title: 没有Browser Skill，你的OpenClaw小龙虾就是眼瞎和智障
author: AI黎镭
date: "2026-03-07 20:25:11"
source: "https://mp.weixin.qq.com/s/Qm8P2m7GZvMVtdE3wLfUzQ"
---

# 没有Browser Skill，你的OpenClaw小龙虾就是眼瞎和智障

当OpenClaw小龙虾成了AI时代的可以免费领取的鸡蛋，好像人手必须有一个，不然就不是一个会AI的人。但说句扎心的，大部分人即使装了也是白搭，因为他根本不知道这玩意能怎么用。

最常见的操作，让它帮你搜索网页信息或者提取一些核心文章内容。经常得到的回答。

“抱歉，我抓取不到网站内容。”

这就是大多数人使用OpenClaw和其他AI Agent工具时候的困惑。

## 为什么OpenClaw需要浏览器？

OpenClaw的核心价值是帮我们干活，而不是仅仅回答问题。

但现实中：

- 让它查最网页内容，它说“抱歉，我我只能搜索到标题。”
- 让它自动填表，它说“我做不到”
- 让它帮你抢票，它说“无法访问外部网站”

就像雇了个超级聪明的助手，但这个助手是个盲人。

没有浏览器能力的AI Agent，就是个高级玩具。

## 我的Browser方案架构

经过实测，我搭建了一套**智能路由**方案。以下是每个工具的使用指南：

### 1. Tavily - 通用搜索

**是什么：**专门为AI搜索优化的搜索引擎

**如何获取：**

- 访问 tavily.com
- 注册账号 → 进入 Dashboard
- 获取 API Key（每月1000次免费额度）
- 在 OpenClaw 配置：把 API Key 写入 credentials/tavily.json

**怎么用：**直接告诉AI“帮我搜一下xxx”，自动调用

### 2. Brave Search API - 搜索兜底

**是什么：**Brave浏览器的搜索API，原本它是我的首选工具，也是OpenClaw官方指定的浏览器搜索API。但是2月份调整了策略，没有免费额度了，所以它只能成为我备选。

**如何获取：**

- 访问 brave.com/search/api
- 注册开发者账号 → 获取 API Key
- OpenClaw 已内置集成，只需配置凭据

**怎么用：**Tavily 额度用完自动切换，无需手动

### 3. yt-dlp - YouTube 字幕

**是什么：**专门下载 YouTube 视频和字幕的工具

**如何获取：**pip install yt-dlp

**怎么用：**告诉AI“提取这个YouTube视频的字幕”

### 4. Supadata - 社交媒体 Transcript

**是什么：**提取 YouTube 等平台的 transcript

**如何安装：**clawhub install supadata

**怎么用：**告诉AI“获取这个视频的完整 transcript”

### 5. Camoufox - 浏览器底层

**是什么：**反检测浏览器，模拟真人访问微信、YouTube等

**如何获取：**OpenClaw 已内置，开箱即用

**怎么用：**Agent-Reach 和 公众号文章Skill 都基于它

### 6. Agent-Reach - 社交媒体内容

**是什么：**获取 YouTube/Twitter/小红书/抖音 的视频信息、帖子内容

**如何安装：**clawhub install agent-reach

**怎么用：**告诉AI“这个YouTube视频在讲什么”

注意：只能获取视频信息，不能抓字幕。用 yt-dlp 或 Supadata 抓字幕。

### 7. 公众号文章搜索Skill - 微信专属

**是什么：**专门抓取公众号文章转为 Markdown

**底层架构：**基于 Camoufox（反检测浏览器）+ markdownify + 图片本地化

**如何获取：**

- 关注公众号加入私享圈
- 安装：复制 skills/wechat-article 到你的 OpenClaw skills 目录

**怎么用：**告诉AI“搜一下这个公众号的历史文章”

### 8. Browser-use - 网页操作

**是什么：**AI直接控制浏览器操作任意网页

**如何获取：**OpenClaw 已内置集成

**实时查看：**https://live.browser-use.com

**怎么用：**告诉AI“帮我填一下这个表单”

### 9. Agent-Browser - 本地浏览器

**是什么：**本地GUI环境使用的浏览器

**如何安装：**clawhub install agent-browser

## 智能路由工作原理

你只需要告诉AI要做什么，它会自动选择最合适的工具：

| 你说 | 自动路由到 |
| --- | --- |
| “帮我搜一下xxx” | Tavily → Brave（兜底） |
| “这个YouTube视频在讲什么” | Agent-Reach（获取视频信息） |
| “提取这个YouTube视频字幕” | yt-dlp 或 Supadata |
| “看看小红书/Twitter” | Agent-Reach |
| “搜一下公众号文章” | 公众号文章搜索Skill |
| “帮我填表/抢票/登录” | Browser-use |

## 一张表速查

| 场景 | 工具 | 获取方式 |
| --- | --- | --- |
| 通用搜索 | Tavily → Brave | tavily.com 注册 |
| YouTube 视频信息 | Agent-Reach | clawhub install |
| YouTube 字幕 | yt-dlp / Supadata | 内置 / clawhub |
| 小红书/Twitter | Agent-Reach | clawhub install |
| 公众号文章 | 公众号搜索Skill | 关注公众号获取 |
| 登录操作网页 | Browser-use | 内置 |
| 本地GUI | Agent-Browser | clawhub install |

## 为什么选这个方案？

1. 不用写代码：一切交给AI处理，你只需要动动嘴

2. 官方集成：Browser-use 开箱即用

3. ClawHub 安装：Agent-Reach、Supadata、Agent-Browser 一行命令安装

4. 公众号Skill：关注公众号进入私享圈

## 结论

没有浏览器能力的OpenClaw，就是个chatbot，干不了实事。

2026年，选对浏览器方案，有时比选对AI模型更重要。

你的OpenClaw 有眼睛了吗？

如果你觉得这篇文章有帮助，欢迎关注我们

更多OpenClaw小龙虾好玩的用法，参考历史文章。

[我的OpenClaw龙虾终于不失忆了，多层Memory架构深度解析](https://mp.weixin.qq.com/s?__biz=MzUzNjU3NTQ4Mw==&mid=2247484290&idx=1&sn=c2de7771b022aac1f3f68715ecd9e3df&scene=21#wechat_redirect)

[OpenClaw 打造一人公司，5个Agents终于协同工作了](https://mp.weixin.qq.com/s?__biz=MzUzNjU3NTQ4Mw==&mid=2247484229&idx=1&sn=ad4974a3e03f4e6bca57862e34fddd71&scene=21#wechat_redirect)

[用 OpenClaw + Skill 实现微信公众号全自动创作发布](https://mp.weixin.qq.com/s?__biz=MzUzNjU3NTQ4Mw==&mid=2247484176&idx=1&sn=64c3c5afc25220f91c65e2a4eec33a77&scene=21#wechat_redirect)

[6个OpenClaw应用场景：2026改变你的人生](https://mp.weixin.qq.com/s?__biz=MzUzNjU3NTQ4Mw==&mid=2247484151&idx=1&sn=96937ef6ee436330bfafaf35755ca59c&scene=21#wechat_redirect)

[我的AI可以"自我进化"了：EvoMap接入全过程](https://mp.weixin.qq.com/s?__biz=MzUzNjU3NTQ4Mw==&mid=2247484143&idx=1&sn=ddc7f73fad15bbd723e04697601229c4&scene=21#wechat_redirect)

[用 OpenClaw 打造 AI 一人公司，实操案例分享](https://mp.weixin.qq.com/s?__biz=MzUzNjU3NTQ4Mw==&mid=2247484031&idx=1&sn=4ee433e794f5f5eabb649fd31a2300d1&scene=21#wechat_redirect)

[7个skills，我让AI运营15个账号250万粉丝](https://mp.weixin.qq.com/s?__biz=MzUzNjU3NTQ4Mw==&mid=2247484117&idx=1&sn=ec9f8667e5485b1aa0deb89798016dcb&scene=21#wechat_redirect)
