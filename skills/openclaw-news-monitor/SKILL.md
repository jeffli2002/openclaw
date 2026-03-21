---
name: openclaw-news-monitor
description: 专门监控 OpenClaw 产品本身的版本更新、GitHub Issues、Release Notes、社区动态和生态信号。不监控 AI 行业新闻（那是 ai-daily-newsletter 的职责）。当需要生成 OpenClaw 产品动态报告、版本更新分析时触发。
---

# OpenClaw News Monitor

专门监控 OpenClaw 产品本身的动态，与 AI 行业新闻（`ai-daily-newsletter`）泾渭分明。

> **口径说明**：本技能只监控 OpenClaw 这一个产品。
> - 版本更新 / Release Notes
> - GitHub Issues 重要风险
> - 社区生态信号（star 数、讨论热度、安全争议）
> - 官方 Newsletter / 官方博客
>
> AI 行业动态（OpenAI/Anthropic/Google/中国AI公司）不在本技能范围内。

## 信息源

### 必查 API
- GitHub Releases API: `https://api.github.com/repos/openclaw/openclaw/releases/latest`
- GitHub Repo Stats: `https://api.github.com/repos/openclaw/openclaw`

### 官方渠道
- Release Page: `https://github.com/openclaw/openclaw/releases`
- Official Newsletter: `https://buttondown.com/openclaw-newsletter`
- GitHub Issues: `https://github.com/openclaw/openclaw/issues`

### 关键词验证
- openclaw
- OpenClaw

## 执行步骤

### 第一步：查 GitHub Releases
使用 `web_fetch` 获取最新 Release 页面：
```
https://api.github.com/repos/openclaw/openclaw/releases/latest
```
提取：版本号、发布日期、body 内容（更新日志）

### 第二步：查 GitHub Repo Stats
使用 `web_fetch` 获取：
```
https://api.github.com/repos/openclaw/openclaw
```
提取：stars、forks、open_issues、pushed_at

### 第三步：关键 Issue 扫描
使用 `web_search + freshness=pd` 搜索：
- "openclaw issue 2026" - 查找未关闭的重要 issue
- "openclaw bug 2026" - 查找 bug 报告
- "openclaw v2026" - 查找版本相关讨论

### 第四步：官方 Newsletter
使用 `web_fetch` 获取最新一期 Newsletter（通常在 buttondown）

### 第五步：组装报告

## 输出格式

```
# OpenClaw 动态监控报告

日期：YYYY-MM-DD

## 一句话结论
[当前最新稳定版 + 本轮最重要变化 + 当前最大风险点]

## 1) 最新版本与官方信号
- **最新稳定版**：`vX.X.X`
- **发布时间**：YYYY-MM-DD
- **GitHub 星标**：约 XXX stars

## 2) 本轮最重要更新
### A. [类别] [标题]
[说明意义]

## 3) 重要修复
### 路由 / 投递 / 插件
[列表]

### 浏览器 / 桌面 / 配置稳定性
[列表]

### Agent / Model 兼容
[列表]

## 4) 社区与生态信号
[star 趋势、Newsletter 要点、社区讨论热度]

## 5) 当前风险点
### 风险 N：[标题]
- issue: #XXXXX
- 现象：[描述]
- 含义：[影响]
- 建议：[如何应对]

## 6) 对 Jeff 有价值的观察
[从内容运营角度的解读]

## 7) 建议下轮继续监控
- [具体监控项]
```

## 归档路径

生成的 OpenClaw 监控报告统一归档到：`/root/.openclaw/workspace/reports/openclaw-news-monitor-YYYY-MM-DD.md`
