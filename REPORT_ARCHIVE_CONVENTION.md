# 报告归档规范 (Report Archive Convention)

> 最后更新：2026-03-21

## 核心理念

**所有报告统一归档到 `/root/.openclaw/workspace/reports/`**，不再使用其他路径作为长期存储。

## 路径规范

### ✅ 规范路径

| 报告类型 | 路径 | 文件名格式 |
|---------|------|-----------|
| Chief 每日汇报 | `reports/` | `chief-daily-report-YYYY-MM-DD.md` |
| AI 行业日报 | `reports/` | `ai-daily-YYYY-MM-DD.md` |
| OpenClaw 产品动态 | `reports/` | `openclaw-news-monitor-YYYY-MM-DD.md` |
| KOL 每日动态 | `reports/` | `kol-daily-YYYY-MM-DD.md` |
| 产品竞品分析 | `reports/` | `product-competitor-analysis-YYYY-MM-DD.md` |
| TrustMRR 报告 | `reports/` | `trustmrr-detailed-YYYY-MM-DD.md` |
| 生成内容 (HTML/MD/图片) | `output/` | 按项目组织，子目录为项目名 |

### ❌ 已废弃路径（不再写入）

| 废弃路径 | 说明 | 迁移状态 |
|---------|------|---------|
| `memory/reports/` | 曾做临时暂存 | 已迁移到 `reports/` |
| `ai-daily/` | 与 `reports/` 重复 | 已迁移到 `reports/ai-daily-*.md` |
| `outputs/content-factory/` | Content Factory 暂存 | 仅保留 `output/` 为正式路径 |

## 归档检查清单

每次生成报告后，确认：
- [ ] 文件已写入 `/root/.openclaw/workspace/reports/`
- [ ] 文件名符合格式（类型-日期.md）
- [ ] `memory/reports/` 中无对应文件（避免重复）

## 技能路径配置

| 技能 | 归档路径 |
|-----|---------|
| `ai-daily-newsletter` | `reports/ai-daily-YYYY-MM-DD.md` |
| `openclaw-news-monitor` | `reports/openclaw-news-monitor-YYYY-MM-DD.md` |
| `chief-agent-report` | `reports/chief-daily-report-YYYY-MM-DD.md` |
| `content-factory` | `output/`（HTML 文章）和 `reports/`（评分报告）|
| `xiaohongshu-skills` | 直接发布，不做本地归档 |
| `wechat-article` | `output/`（抓取的文章 Markdown）|
