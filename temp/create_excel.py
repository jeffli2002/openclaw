import pandas as pd

# 15个AI相关开源项目数据
data = [
    {
        "排名": 1,
        "项目名称": "NVIDIA/NemoClaw",
        "Stars": 8007,
        "Forks": 834,
        "语言": "TypeScript",
        "最新更新": "2026-03-18",
        "项目简介": "NVIDIA plugin for secure installation of OpenClaw",
        "适用场景": "OpenClaw安全部署、NVIDIA GPU环境配置"
    },
    {
        "排名": 2,
        "项目名称": "aiming-lab/AutoResearchClaw",
        "Stars": 6172,
        "Forks": 617,
        "语言": "Python",
        "最新更新": "2026-03-18",
        "项目简介": "Fully autonomous & self-evolving research from idea to paper",
        "适用场景": "学术研究自动化、AI科研、论文生成"
    },
    {
        "排名": 3,
        "项目名称": "calesthio/Crucix",
        "Stars": 4376,
        "Forks": 596,
        "语言": "JavaScript",
        "最新更新": "2026-03-18",
        "项目简介": "Your personal intelligence agent. Watches the world from multiple data sources and pings you when something changes",
        "适用场景": "个人AI助手、实时监控、自动化提醒"
    },
    {
        "排名": 4,
        "项目名称": "pasky/chrome-cdp-skill",
        "Stars": 2196,
        "Forks": 117,
        "语言": "JavaScript",
        "最新更新": "2026-03-18",
        "项目简介": "Give your AI agent access to your live Chrome session",
        "适用场景": "浏览器自动化、AI网页操作、已打开标签页复用"
    },
    {
        "排名": 5,
        "项目名称": "jackwener/opencli",
        "Stars": 1790,
        "Forks": 165,
        "语言": "TypeScript",
        "最新更新": "2026-03-18",
        "项目简介": "Make any website your CLI. A powerful, AI-native runtime for seamless browser automation",
        "适用场景": "社交媒体自动化、数据抓取、内容平台CLI"
    },
    {
        "排名": 6,
        "项目名称": "uditgoenka/autoresearch",
        "Stars": 1369,
        "Forks": 106,
        "语言": "Shell",
        "最新更新": "2026-03-18",
        "项目简介": "Claude Autoresearch Skill — Autonomous goal-directed iteration for Claude Code",
        "适用场景": "Claude Code增强、自动循环迭代、科研coding"
    },
    {
        "排名": 7,
        "项目名称": "Infatoshi/OpenSquirrel",
        "Stars": 1085,
        "Forks": 68,
        "语言": "Rust",
        "最新更新": "2026-03-18",
        "项目简介": "A native Rust/GUI control plane for running Claude Code, Codex, Cursor, and OpenCode",
        "适用场景": "多AI工具并行运行、Agent控制面板、本地AI开发环境"
    },
    {
        "排名": 8,
        "项目名称": "HKUDS/ClawTeam",
        "Stars": 965,
        "Forks": 129,
        "语言": "Python",
        "最新更新": "2026-03-18",
        "项目简介": "ClawTeam: Agent Swarm Intelligence (One Command → Full Automation)",
        "适用场景": "Agent群体智能、自动化工作流、多Agent协作"
    },
    {
        "排名": 9,
        "项目名称": "Lum1104/Understand-Anything",
        "Stars": 865,
        "Forks": 76,
        "语言": "TypeScript",
        "最新更新": "2026-03-18",
        "项目简介": "Claude Code skills that turn any codebase into an interactive knowledge graph",
        "适用场景": "代码理解、知识图谱生成、代码搜索"
    },
    {
        "排名": 10,
        "项目名称": "VoltAgent/awesome-codex-subagents",
        "Stars": 677,
        "Forks": 53,
        "语言": "-",
        "最新更新": "2026-03-18",
        "项目简介": "A collection of 130+ specialized Codex subagents covering a wide range of development use cases",
        "适用场景": "Codex扩展、开发者工具集、AI编程增强"
    },
    {
        "排名": 11,
        "项目名称": "nikmcfly/MiroFish-Offline",
        "Stars": 675,
        "Forks": 156,
        "语言": "Python",
        "最新更新": "2026-03-18",
        "项目简介": "Offline multi-agent simulation & prediction engine with Neo4j + Ollama local stack",
        "适用场景": "本地多Agent模拟、离线AI、Swarm智能"
    },
    {
        "排名": 12,
        "项目名称": "adammiribyan/zeroboot",
        "Stars": 554,
        "Forks": 22,
        "语言": "Rust",
        "最新更新": "2026-03-18",
        "项目简介": "Sub-millisecond VM sandboxes for AI agents via copy-on-write forking",
        "适用场景": "AI代码执行沙箱、VM隔离、安全沙箱"
    },
    {
        "排名": 13,
        "项目名称": "KeyID-AI/agent-kit",
        "Stars": 504,
        "Forks": 5,
        "语言": "JavaScript",
        "最新更新": "2026-03-18",
        "项目简介": "Give Claude/Cursor email powers. 27 MCP tools — inbox, send, reply, contacts, search",
        "适用场景": "Email自动化、MCP工具、Claude增强"
    },
    {
        "排名": 14,
        "项目名称": "deusyu/translate-book",
        "Stars": 401,
        "Forks": 41,
        "语言": "Python",
        "最新更新": "2026-03-18",
        "项目简介": "Claude Code skill that translates entire books (PDF/DOCX/EPUB) into any language",
        "适用场景": "书籍翻译、多语言转换、文档处理"
    },
    {
        "排名": 15,
        "项目名称": "collaborator-ai/collab-public",
        "Stars": 432,
        "Forks": 22,
        "语言": "Shell",
        "最新更新": "2026-03-18",
        "项目简介": "Collaborator is a place to build with agents",
        "适用场景": "Agent协作平台、团队AI开发"
    }
]

# 创建DataFrame
df = pd.DataFrame(data)

# 保存为Excel
df.to_excel("/root/.openclaw/workspace/temp/ai-github-trending-2026-03-19.xlsx", index=False)
print("Excel文件已保存")
