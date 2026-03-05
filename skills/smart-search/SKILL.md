---
name: smart-search
description: Smart web search that uses Tavily first, falls back to Brave if failed. Provides AI-powered search with better results.
homepage: https://tavily.com
metadata: {"clawdbot":{"emoji":"🔍","requires":{"bins":["python3"],"env":["TAVILY_WEBSEARCH_API_KEY","BRAVE_API_KEY"]},"primaryEnv":"TAVILY_WEBSEARCH_API_KEY"}}
---

# Smart Search

智能搜索引擎：Tavily 优先，Brave 作为备用

## 搜索

```bash
python3 {baseDir}/scripts/smart_search.py "your search query"
```

选项：
- `--max-results, -n`: 结果数量 (默认: 10)
- `--verbose, -v`: 显示详细过程

## 工作流程

1. **首选 Tavily** - AI驱动的精确搜索
2. **备用 Brave** - 如果Tavily失败，自动切换

## 环境变量

- `TAVILY_WEBSEARCH_API_KEY` - Tavily API (优先)
- `TAVILY_API_KEY` - Tavily 备用
- `BRAVE_API_KEY` - Brave API (备用)

## 示例

```bash
# 搜索AI新闻
python3 {baseDir}/scripts/smart_search.py "AI news"

# 只返回5个结果
python3 {baseDir}/scripts/smart_search.py "OpenClaw" --max-results 5
```

## 注意

- 搜索结果包含来源URL和内容摘要
- 如果Tavily失败会自动切换到Brave
- 两者都失败会显示错误信息
