# smart-search

网络搜索工具，支持 Tavily（优先）和 Brave（兜底）双引擎，自动容错。

## 调用方式

```bash
python3 /root/.openclaw/workspace/scripts/smart_search.py "搜索关键词" --max-results 10 --json
```

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `query` | 搜索关键词（位置参数） | 必填 |
| `--max-results`, `-n` | 最大结果数 | 10 |
| `--json`, `-j` | 输出纯 JSON（Agent 工具调用必须加） | 文本模式 |
| `--provider`, `-p` | 强制使用 `tavily` / `brave` / `auto` | auto |

## 输出格式（--json 模式）

```json
{
  "ok": true,
  "provider": "Tavily",
  "query": "OpenClaw AI agent service case",
  "count": 10,
  "results": [
    {
      "title": "Article Title",
      "url": "https://example.com/article",
      "content": "Full content or description snippet...",
      "score": 0.95
    }
  ],
  "answer": "AI-generated short answer to the query"
}
```

**失败时：**
```json
{
  "ok": false,
  "provider": "Brave",
  "query": "...",
  "count": 0,
  "results": [],
  "error": "No Brave API key"
}
```

## API Key 配置

两个 API Key 均从 `/root/.openclaw/credentials/` 读取：
- `tavily.json` — 格式：`{"api_key": "tvly-..."}`
- `brave.json` — 格式：`{"api_key": "BSAw..."}`

如 Tavily 失败，自动降级到 Brave；两者均失败返回 error。

## 适用场景

- 选题研究（搜索 YouTube / Twitter / 公众号 / 新闻链接）
- 文章素材采集
- 竞品分析
- 任何需要网络搜索的场景

## 使用示例

**Agent 调用（推荐）：**
```
exec: python3 /root/.openclaw/workspace/scripts/smart_search.py "OpenClaw AI agent freelance service case 2026" --max-results 10 --json
```

**强制 Brave（当 Tavily 被限流时）：**
```
exec: python3 /root/.openclaw/workspace/scripts/smart_search.py "关键词" --provider brave --json
```

## 注意事项

- Tavily 返回的 `content` 字段是完整摘要，质量高于 Brave 的 description
- Tavily 有 `answer` 字段（AI 摘要），适合快速获取答案
- `--json` 模式不含 emoji 和日志，输出可直接解析，是 Agent 工具调用的标准格式
