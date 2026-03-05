#!/bin/bash
# Smart Web Ultimate - 智能网页助手 v2.0
# 整合 Agent-Reach + Tavily/Brave + browser-use
# 根据任务类型自动选择最佳工具

# 配置
BROWSER_USE_API_KEY="bu_asA1iDkZjaZlZoWaGoWJrh-ocb3ZyiygObrc1XFx5Jo"
XREACH_AUTH_TOKEN="41d25c54e34668229d0356c04221d4058f0761b7"
XREACH_CT0="24a15787d231809f64a14dc33ce3624bd2da7e68150db25bc9f72a05f219d8983e6ed506ec9064c53fbe609b90ee0a9acd4923a10b7b5170e3bf9024aa141ed94f9a36f018eb8a2891412be5ce1b08a6"
export BROWSER_USE_API_KEY XREACH_AUTH_TOKEN XREACH_CT0

# 日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# 错误处理
error_exit() {
    log "ERROR: $1"
    echo "❌ Error: $1"
    exit 1
}

# 检查依赖
check_dependencies() {
    command -v browser-use &> /dev/null || error_exit "browser-use not installed"
    command -v agent-reach &> /dev/null || error_exit "agent-reach not installed"
    [ -f "/root/.openclaw/workspace/scripts/smart_search.py" ] || error_exit "smart_search.py not found"
}

# 判断任务类型
analyze_task() {
    local task="$1"
    local lower=$(echo "$task" | tr '[:upper:]' '[:lower:]')
    
    # Agent-Reach 专长 (免费平台)
    if echo "$lower" | grep -qE "youtube|视频|字幕|b站|bilibili|bilibili"; then
        echo "agent-reach-youtube"
    elif echo "$lower" | grep -qE "twitter|推特|tweet"; then
        echo "agent-reach-twitter"
    elif echo "$lower" | grep -qE "reddit|论坛"; then
        echo "agent-reach-reddit"
    elif echo "$lower" | grep -qE "github|代码|仓库|issue"; then
        echo "agent-reach-github"
    elif echo "$lower" | grep -qE "rss|订阅"; then
        echo "agent-reach-rss"
    elif echo "$lower" | grep -qE "小红书|xhs"; then
        echo "agent-reach-xiaohongshu"
    # 简单信息查询 → 搜索
    elif echo "$lower" | grep -qE "什么是|what is|how to|怎么|如何|为什么|why|哪个好|推荐|排行榜"; then
        echo "search"
    # 交互操作 → 浏览器
    elif echo "$lower" | grep -qE "打开|登录|填|点击|截图|抓取|进入|自动化|帮我买|帮我注册|帮我下单"; then
        echo "browser"
    # 研究型 → 搜索+浏览器
    elif echo "$lower" | grep -qE "研究|调研|分析|比较|对比|评测|攻略"; then
        echo "hybrid"
    # 新闻/最新 → 搜索
    elif echo "$lower" | grep -qE "新闻|news 最新|今日|昨天|最近"; then
        echo "search"
    # 网页读取
    elif echo "$lower" | grep -qE "读取网页|读取链接|看看这个|这个网页"; then
        echo "agent-reach-web"
    # 默认搜索
    else
        echo "search"
    fi
}

# ========== Agent-Reach 系列 ==========

# YouTube/B站
do_agent_reach_youtube() {
    local query="$*"
    echo "📺 提取视频: $query"
    # 使用 yt-dlp 提取字幕和信息
    yt-dlp --list-subs --dump-json --no-download "$query" 2>&1 | head -20 || \
    echo "无法提取，请提供完整视频URL"
}

# Twitter
do_agent_reach_twitter() {
    local query="$*"
    echo "🐦 Twitter: $query"
    # 使用 xreach 搜索
    export PATH="$PATH:/root/.nvm/versions/node/v22.22.0/bin"
    xreach --auth-token "$XREACH_AUTH_TOKEN" --ct0 "$XREACH_CT0" search "$query" -n 10 2>&1 | head -30
}

# Reddit
do_agent_reach_reddit() {
    local query="$*"
    echo "📖 Reddit: $query"
    # 使用 agent-reach 或通过 Exa 搜索
    echo "Reddit 搜索请 search通过 web"
}

# GitHub
do_agent_reach_github() {
    local query="$*"
    echo "🐙 GitHub: $query"
    if command -v gh &> /dev/null; then
        gh search repos "$query" --limit 10 2>&1
    else
        echo "GitHub CLI 未安装"
    fi
}

# RSS
do_agent_reach_rss() {
    local url="$*"
    echo "📡 RSS: $url"
    agent-reach read "$url" 2>&1 || \
    feedparser "$url" 2>&1 | head -30
}

# 网页读取 (Jina Reader)
do_agent_reach_web() {
    local url="$*"
    echo "🌐 读取网页: $url"
    curl -s "https://r.jina.ai/$url" 2>&1 | head -100
}

# 小红书
do_agent_reach_xiaohongshu() {
    local query="$*"
    echo "📕 小红书: $query"
    echo "小红书需要登录配置，请运行: agent-reach setup"
}

# ========== 搜索 ==========
do_search() {
    local query="$*"
    log "Searching: $query"
    echo "🔍 搜索: $query"
    echo "---"
    
    # 使用 smart_search.py
    python3 /root/.openclaw/workspace/scripts/smart_search.py "$query" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "---"
        echo "✅ 搜索完成"
        return 0
    fi
    
    # 备用 web_search
    echo "🔄 使用备用搜索..."
    web_search --query "$query" --count 5 2>&1
}

# ========== 浏览器 ==========
do_browser() {
    local task="$*"
    log "Browser task: $task"
    echo "🌐 浏览器任务: $task"
    
    browser-use --browser remote run "$task" 2>&1
}

# ========== 混合任务 ==========
do_hybrid() {
    local task="$*"
    log "Hybrid task: $task"
    
    # 提取搜索关键词
    local keywords=$(echo "$task" | sed 's/研究//g' | sed 's/调研//g' | sed 's/分析//g' | sed 's/比较//g' | sed 's/对比//g')
    
    echo "📊 研究任务: $task"
    echo ""
    
    # 第一步: 搜索
    echo "=== 第一步: 搜索相关信息 ==="
    do_search "$keywords"
    echo ""
    
    # 第二步: 浏览器深度研究
    echo "=== 第二步: 深度研究 ==="
    echo "🌐 打开浏览器深入分析..."
    do_browser "$task"
}

# 快速命令
do_quick() {
    local cmd="$1"
    shift
    
    case $cmd in
        news)
            do_search "最新新闻 $(date +%Y年%m月%d日)"
            ;;
        weather)
            curl -s "wttr.in/Shanghai?format=%c%t+%h" 2>&1 || echo "无法获取天气"
            ;;
        youtube)
            do_agent_reach_youtube "$@"
            ;;
        github)
            do_agent_reach_github "$@"
            ;;
        web)
            do_agent_reach_web "$@"
            ;;
        doctor)
            agent-reach doctor
            ;;
        setup)
            agent-reach setup
            ;;
        *)
            echo "未知命令: $cmd"
            ;;
    esac
}

# 帮助
show_help() {
    cat << EOF
🌐 Smart Web Ultimate v2.0 - 智能网页助手

用法: smart-web-ultimate <command> [args...]

命令:
  <任务描述>           自动分析并执行

快速命令:
  news                 获取今日新闻
  weather              获取天气
  youtube <url>        提取YouTube/B站字幕
  github <query>       搜索GitHub仓库
  web <url>            读取任意网页
  doctor               检查Agent-Reach状态
  setup                配置Agent-Reach

自动判断:
  YouTube/B站视频     → Agent-Reach (yt-dlp)
  Twitter/推特        → Agent-Reach (xreach)
  GitHub代码          → Agent-Reach (gh CLI)
  RSS订阅             → Agent-Reach (feedparser)
  小红书              → Agent-Reach (需配置)
  网页读取            → Agent-Reach (Jina Reader)
  信息查询            → 搜索API (Tavily优先)
  交互操作            → browser-use
  研究调研            → 搜索 + 浏览器
EOF
}

# 主入口
main() {
    check_dependencies
    
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    local cmd="$1"
    
    # 快速命令
    if [ "$cmd" = "news" ] || [ "$cmd" = "weather" ] || [ "$cmd" = "youtube" ] || \
       [ "$cmd" = "github" ] || [ "$cmd" = "web" ] || [ "$cmd" = "doctor" ] || \
       [ "$cmd" = "setup" ]; then
        do_quick "$@"
        exit $?
    fi
    
    # 帮助
    if [ "$cmd" = "-h" ] || [ "$cmd" = "--help" ]; then
        show_help
        exit 0
    fi
    
    # 分析任务类型
    local task="$*"
    local mode=$(analyze_task "$task")
    
    log "Task: $task | Mode: $mode"
    
    case $mode in
        agent-reach-youtube)
            do_agent_reach_youtube "$task"
            ;;
        agent-reach-twitter)
            do_agent_reach_twitter "$task"
            ;;
        agent-reach-reddit)
            do_agent_reach_reddit "$task"
            ;;
        agent-reach-github)
            do_agent_reach_github "$task"
            ;;
        agent-reach-rss)
            do_agent_reach_rss "$task"
            ;;
        agent-reach-xiaohongshu)
            do_agent_reach_xiaohongshu "$task"
            ;;
        agent-reach-web)
            do_agent_reach_web "$task"
            ;;
        search)
            do_search "$task"
            ;;
        browser)
            do_browser "$task"
            ;;
        hybrid)
            do_hybrid "$task"
            ;;
    esac
}

main "$@"
