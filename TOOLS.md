# TOOLS.md - Local Notes (脱敏版本)

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

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
- **Default API Key:** `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`
- **WebSearch API Key:** `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`
- **Status:** ✅ 已配置
- **用途:** Web搜索、新闻追踪

### GitHub
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
