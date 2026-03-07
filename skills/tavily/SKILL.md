---
name: tavily
description: Search the web using Tavily AI search engine. Returns comprehensive results with source citations. Supports general search, news, and fact-checking.
homepage: https://tavily.com
metadata: {"clawdbot":{"emoji":"🔍","requires":{"bins":["python3"],"env":["TAVILY_API_KEY","TAVILY_WEBSEARCH_API_KEY"]},"primaryEnv":"TAVILY_WEBSEARCH_API_KEY"}}
---

# Tavily Search

Web search powered by Tavily AI, providing accurate and comprehensive results.

## Search

Single query:
```bash
python3 {baseDir}/scripts/tavily_search.py "your search query"
```

With custom result count:
```bash
python3 {baseDir}/scripts/tavily_search.py "AI news" --max-results 5
```

JSON output:
```bash
python3 {baseDir}/scripts/tavily_search.py "OpenClaw" --format json
```

## Options

- `--max-results, -n`: Number of results (default: 10)
- `--format, -f`: Output format - text or json (default: text)

## Environment Variables

- `TAVILY_API_KEY` - Basic Tavily API key
- `TAVILY_WEBSEARCH_API_KEY` - Tavily Web Search API key (preferred)

## Notes

- Returns results with relevance scores
- Supports AI-powered answer extraction
- Faster and more accurate than traditional search engines
