---
name: wechat-article
description: 微信公众号文章抓取工具。将微信公众号文章转换为 Markdown 格式，支持图片本地下载。当用户提到抓取微信公众号文章、提取公众号内容、爬取微信文章时触发。
---

# 微信公众号文章抓取

将微信公众号文章转换为 Markdown 格式，支持图片本地下载。

## 脚本位置

- 主程序：`scripts/main.py`
- MCP Server：`scripts/mcp_server.py`

## 快速使用

```bash
cd ~/.openclaw/workspace/skills/wechat-article
python3 scripts/main.py "文章URL" -o /root/.openclaw/workspace/output
```

## 参数

| 参数 | 说明 |
|------|------|
| `-o DIR` | 输出目录（默认 ./output） |
| `-v` | 调试日志 |
| `--no-images` | 不下载图片，保持远程 URL |
| `--force` | 覆盖已存在文件 |
| `--no-headless` | 显示浏览器（用于处理验证码） |

## 输出结构

```
output/
 └── 文章标题/
     ├── 文章标题.md
     └── images/
         ├── img_001.jpg
         └── ...
```

## 注意事项

1. 验证码：遇到验证页面时加 `--no-headless` 手动处理
2. 反爬：微信有频率限制，建议间隔操作
3. 图片失败：保留远程 URL，可用 `--force` 重试

## 依赖

- camoufox
- markdownify
- beautifulsoup4
- httpx
- aiohttp

---

## 外部依赖与 Fallback

### 依赖层级

| 依赖 | 类型 | Fallback 策略 |
|------|------|--------------|
| Camoufox 浏览器 | Chrome/Firefox 自动化 | `--no-headless` 手动处理验证码 |
| WeChat 文章页面 | 网络请求 | 3× 指数退避重试 |
| 图片下载 | HTTP 异步 | 3× 线性退避重试，失败保留远程 URL |
| 验证码页面 | 反爬检测 | 抛出 `CaptchaError`，提示用户手动处理 |

### 错误类型

| 错误 | 含义 | 处理方式 |
|------|------|---------|
| `CaptchaError` | 微信验证页面 | 用 `--no-headless` 手动解决 |
| `NetworkError` | 重试耗尽仍失败 | 检查网络，稍后重试 |
| `ParseError` | HTML 结构解析失败 | 可能是微信改版，报 issue |

### 推荐重试间隔

```python
# 指数退避：1s → 2s → 4s
# 线性退避（图片）：1s → 2s → 3s
```

如需更高级的重试策略，可参考 `/root/.openclaw/workspace/skills/content-factory/scripts/fallback_wrapper.py` 中的 `CircuitBreaker` 模式。
