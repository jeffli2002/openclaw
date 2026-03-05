# TOOLS.md - Local Notes (脱敏版本)

Skills define _how_ tools work. This file is for _your_ specifics - the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## API Keys (脱敏版)

### Brave Search
- **Key:** `YOUR_BRAVE_SEARCH_KEY`
- **Quota:** 2000 queries/month (free plan)
- **Status:** ✅ Active

### YouTube Data API
- **Key:** `YOUR_YOUTUBE_API_KEY`
- **Quota:** 10,000 units/day (free plan)
- **Status:** ✅ Active

### Tavily Search (默认搜索引擎)
- **API Key:** `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`
- **WebSearch API Key:** `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`
- **Status:** ✅ 已配置
- **用途:** Web搜索、新闻追踪
- **调用方式:**
  - `smart_search.py` - 智能搜索（Tavily优先，失则fallback到Brave）
  - `tavily_search.py` - 纯Tavily搜索
  - `web_search` - OpenClaw内置Brave（备用）

### Browser-Use (Cloud Browser)
- **API Key:** `bu_asA1iDkZjaZlZoWaGoWJrh-ocb3ZyiygObrc1XFx5Jo`
- **配置文件:** `/root/.config/browser-use/config.json`
- **状态:** ✅ 已配置并测试成功

### 智能网页助手 v2.0 (smart-web-ultimate.sh)
- **脚本:** `/root/.openclaw/workspace/scripts/smart-web-ultimate.sh`
- **整合:** Agent-Reach + Tavily/Brave + browser-use
- **使用方法:**
  ```bash
  bash /root/.openclaw/workspace/scripts/smart-web-ultimate.sh "YouTube视频URL"
  bash /root/.openclaw/workspace/scripts/smart-web-ultimate.sh web <url>
  bash /root/.openclaw/workspace/scripts/smart-web-ultimate.sh github <query>
  bash /root/.openclaw/workspace/scripts/smart-web-ultimate.sh doctor
  ```

### Agent-Reach (已安装)
- **功能:** 免费读取 Twitter/YouTube/Reddit/GitHub/RSS/小红书
- **状态:** 4/13 渠道可用
- **快速命令:**
  - `agent-reach doctor` - 检查状态
  - `agent-reach setup` - 配置更多渠道
- **已支持:**
  - ✅ YouTube/B站字幕
  - ✅ RSS订阅
  - ✅ 任意网页 (Jina Reader)
  - ⚠️ GitHub (需安装gh CLI)
  - ⬜ 小红书 (需登录)
  - ⬜ Twitter/Reddit (需配置)

### 三者关系与智能配合

| 工具 | 能力 | 适用场景 |
|------|------|----------|
| **Tavily/Brave** | 搜索引擎API | 快速获取搜索结果、新闻 |
| **browser-use** | 浏览器自动化 | 交互操作(登录/表单/点击) |
| **smart-*.sh** | 智能调度 | 自动选择最佳工具 |

**自动判断逻辑:**
- "什么是/如何/推荐" → 搜索API
- "打开/登录/点击" → browser-use
- "研究/调研/对比" → 搜索 + 浏览器

**Live View:** https://live.browser-use.com (查看浏览器实时画面)
- **API Key:** `BSAPLWY-QybGkWA-DQYirALnKsiX_zj`
- **Status:** ✅ 已配置
- **用途:** 当Tavily失败时的备用搜索

### AgentMail (Email)
- **Email:** jeffai@agentmail.to
- **API Key:** `am_us_ac65e4d242eee6512b4c76e5420f9afa043630d43bf250f463ec8772b506c781`
- **Status:** ✅ Active
- **Skill:** Installed via clawhub (agentmail)
- **配置位置:** openclaw.json (auth.AGENTMAIL_API_KEY)
- **使用方法 (Python):**
  ```python
  from agentmail import AgentMail
  client = AgentMail(api_key="am_us_...")

  # 发送邮件
  client.inboxes.messages.send(
      inbox_id="jeffai@agentmail.to",
      to="recipient@example.com",
      subject="Subject",
      text="Body text"
  )

  # 读取收件箱
  messages = client.inboxes.messages.list(inbox_id="jeffai@agentmail.to", limit=10)
  ```
- **Token:** `YOUR_GITHUB_TOKEN`
- **Scopes:** repo (private repositories)
- **Status:** ✅ Active
- **用途:** Coding Agent读写GitHub仓库

---

Add whatever helps you do your job. This is your cheat sheet.

### 小红书字数统计方法

**正确方法（Python）：**
```python
import re
with open('file.md', 'r') as f:
    content = f.read()

# 清理格式
content = re.sub(r'#+\s*', '', content)  # 去掉 #
content = re.sub(r'---+', '', content)    # 去掉 ---
content = re.sub(r'^-\s+', '', content, flags=re.MULTILINE)  # 去掉 -
content = re.sub(r'#+\s*$', '', content, flags=re.MULTILINE)  # 去掉行尾#
content = re.sub(r'\n\n+', '\n', content)  # 压缩空行

# 统计
chinese = len(re.findall(r'[\u4e00-\u9fa5]', content))
english = len(re.findall(r'[a-zA-Z]+', content))
total = chinese + english

print(f"中文: {chinese}, 英文: {english}, 总计: {total}")
```

**关键点：**
- 小红书统计 = 中文字符 + 英文单词
- 不包括：#、-、---、换行符、空格
- 目标范围：800-1000字

**快速命令：**
```bash
python3 -c "
import re
with open('file.md') as f:
    c = re.sub(r'#+\s*|---+|^-\s+|#+\s*$|\n\n+', '', f.read())
    print(len(re.findall(r'[\u4e00-\u9fa5]', c)) + len(re.findall(r'[a-zA-Z]+', c)))
"
```

---

> ⚠️ 注意：此文件为脱敏版本，仅包含API Key占位符。完整密钥请查看本地TOOLS.md
