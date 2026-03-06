# Content Agent Memory

## 职责
- 公众号内容创作
- 视频脚本撰写
- 社交媒体运营

## 当前任务
- 固化小红书 Publish Skill 的发布规则与 fallback 封面机制

## 内容策略
- 小红书标题上限 20 字符
- 正文总长度不超过 1000，建议控制在 800~1000
- 正文第一句话不能重复标题
- 开头必须带 emoji
- 结尾必须有 #tag
- 若未提供封面图，默认尝试使用 skill 内置 fallback 封面

## 重要笔记
- 2026-03-07：已将小红书发布规则写入 `skills/xiaohongshu-skills/skills/xhs-publish/SKILL.md`，并在 CLI / publish_pipeline 中增加发布前校验
