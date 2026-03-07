# 微信公众号文章抓取 Skill

用于将微信公众号文章转换为 Markdown 格式，支持图片本地下载。

## 工具位置

- 主程序：`/root/.openclaw/workspace/tools/wechat-article-for-ai/main.py`
- MCP Server：`/root/.openclaw/workspace/tools/wechat-article-for-ai/mcp_server.py`

## 安装依赖

首次使用需安装依赖：
```bash
cd /root/.openclaw/workspace/tools/wechat-article-for-ai
pip install -r requirements.txt
```

依赖已预装：camoufox、markdownify、beautifulsoup4、httpx、aiohttp

## 使用方式

### CLI 方式（推荐）

```bash
cd /root/.openclaw/workspace/tools/wechat-article-for-ai
python3 main.py "微信公众号文章链接" -o /root/.openclaw/workspace/output/wechat-articles
```

**参数说明**：
- `-o, --output DIR` - 输出目录（默认：./output）
- `-v, --verbose` - 开启调试日志
- `--no-images` - 不下载图片，保持远程 URL
- `--force` - 覆盖已存在的输出

**示例**：
```bash
# 抓取单篇文章
python3 main.py "https://mp.weixin.qq.com/s/xxxxxxxx" -o /root/.openclaw/workspace/output

# 批量抓取
python3 main.py -f urls.txt -o /root/.openclaw/workspace/output -v
```

### 输出结构

```
output/
 └── 文章标题/
     ├── 文章标题.md          # Markdown 文件
     └── images/              # 本地图片目录
         ├── img_001.jpg
         ├── img_002.png
         └── ...
```

### MCP Server 方式

如需作为工具调用，可启动 MCP Server：
```bash
cd /root/.openclaw/workspace/tools/wechat-article-for-ai
python3 mcp_server.py
```

暴露工具：
- `convert_article` - 转换单篇文章
- `batch_convert` - 批量转换

## 注意事项

1. **验证码处理**：如遇到验证码，使用 `--no-headless` 参数手动处理
2. **反爬限制**：微信有频率限制，连续抓取建议间隔
3. **图片下载**：失败图片会保留远程 URL，可重试 `--force`

## 常见问题

**Q: 超时怎么办？**
A: 检查网络，或增加超时时间（工具默认 30s）

**Q: 图片下载失败？**
A: 使用 `--force` 重试，失败图片保留远程 URL

**Q: 内容为空？**
A: 可能是被限流，等待后重试
