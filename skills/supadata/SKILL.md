# Supadata Skill

<<<<<<< HEAD
Extract content transcripts from YouTube, TikTok, Instagram, X (Twitter), Facebook, and other platforms using Supadata API, with automatic translation using DeepSeek.

## Description

This skill provides transcript extraction capabilities from various video and social media platforms, with built-in translation support.

## Capabilities

- Extract transcripts from YouTube videos
- Extract transcripts from TikTok videos  
- Extract transcripts from Instagram videos/posts
- Extract transcripts from X (Twitter) videos
- Extract transcripts from Facebook videos
- Get video metadata (title, author, engagement metrics)
- Get YouTube channel and playlist metadata
- **Translate transcripts to any language using DeepSeek**

## Usage

Simply ask to extract and optionally translate transcripts.

Examples:
- "Get transcript from: https://youtube.com/watch?v=..."
- "Extract and translate to Chinese: https://www.tiktok.com/@user/video/..."
- "Get transcript in Japanese: https://x.com/user/status/..."

## Supported Platforms
=======
提取 YouTube、TikTok、Twitter、Facebook 等平台的视频字幕 Transcript。

## 配置

**凭据**：`/root/.openclaw/credentials/supadata.json`
```json
{
  "api_key": "sd_xxxxxxxxxxxxxx",
  "base_url": "https://api.supadata.ai/v1"
}
```

## 调用方式

```bash
# 方式1：直接运行脚本
python3 /root/.openclaw/workspace/skills/supadata/scripts/supadata_client.py transcript --url "https://youtu.be/VIDEO_ID"

# 方式2：Python 调用
cd /root/.openclaw/workspace/skills/supadata/scripts
python3 -c "
from supadata_client import SupadataClient
client = SupadataClient()
result = client.get_transcript('https://youtu.be/eaEwIIKEKPw')
print(result)
"
```

## 功能

- YouTube 字幕提取
- TikTok 字幕提取
- Twitter/X 视频字幕提取
- Facebook 视频字幕提取
- 视频元数据获取

## 示例

提取 YouTube 视频字幕：
```python
from supadata_client import SupadataClient
client = SupadataClient()
result = client.get_transcript("https://youtu.be/eaEwIIKEKPw")
# 返回 JSON，包含 content 字段（字幕段列表）
```

## 支持平台
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856

- YouTube (youtube.com, youtu.be)
- TikTok (tiktok.com)
- Instagram (instagram.com)
- X/Twitter (x.com, twitter.com)
- Facebook (facebook.com)
<<<<<<< HEAD
- Public video files (MP4, WebM, etc.)

## Translation

Translations are powered by DeepSeek API and support:
- Chinese (中文)
- English
- Japanese (日本語)
- Korean (한국어)
- Spanish
- French
- German
- And many more...

Just specify the target language when requesting the transcript!
=======
>>>>>>> 8d2abf78b8490403831aae82052e8e107054b856
