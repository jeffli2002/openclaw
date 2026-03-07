# Coding Agent Memory

## 职责
- AI SaaS工具开发
- 代码审查与优化
- 技术架构设计

## 当前任务
- [待添加]

## 技术栈
- Next.js / React
- TypeScript
- Python / FastAPI

## GitHub 配置
- **仓库地址:** https://github.com/jeffli2002/openclaw
- **Token:** [请在TOOLS.md中获取]
- **Scopes:** repo (private repositories)
- **用途:** 读写GitHub私有仓库

## 重要笔记
- GitHub 定时同步标准流程：先在 `/root/.openclaw/workspace` 检查 `git status --short --branch`，确认是否有未提交改动；再执行 `git fetch origin --prune` 判断远端差异；仅在工作区干净且确认无冲突后执行 `git push origin HEAD:main`。
- [待添加]
