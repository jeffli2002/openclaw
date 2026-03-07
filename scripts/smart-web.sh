#!/bin/bash
# Smart Web Assistant - 智能组合 Tavily/Brave + browser-use
# 根据任务类型自动选择最佳工具

# 配置
BROWSER_USE_API_KEY="bu_asA1iDkZjaZlZoWaGoWJrh-ocb3ZyiygObrc1XFx5Jo"
LOG_FILE="/tmp/smart-web.log"

export BROWSER_USE_API_KEY

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
    [ -f "/root/.openclaw/workspace/scripts/smart_search.py" ] || error_exit "smart_search.py not found"
}

# 判断任务类型
analyze_task() {
    local task="$1"
    local lower=$(echo "$task" | tr '[:upper:]' '[:lower:]')
    
    # 简单信息查询 → 搜索
    if echo "$lower" | grep -qE "什么是|what is|how to|怎么|如何|为什么|why|哪个好|推荐|排行榜"; then
        echo "search"
    # 交互操作 → 浏览器
    elif echo "$lower" | grep -qE "打开|登录|填|点击|截图|抓取|进入|自动化|帮我买|帮我注册|帮我下单"; then
        echo "browser"
    # 研究型 → 搜索+浏览器
    elif echo "$lower" | grep -qE "研究|调研|分析|比较|对比|评测|攻略"; then
        echo "hybrid"
    # 新闻/最新 → 搜索
    elif echo "$lower" | grep -qE "新闻|news|最新|今日|昨天|最近"; then
        echo "search"
    # 默认搜索
    else
        echo "search"
    fi
}

# 执行搜索
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

# 执行浏览器任务
do_browser() {
    local task="$*"
    log "Browser task: $task"
    echo "🌐 浏览器任务: $task"
    
    browser-use --browser remote run "$task" 2>&1
}

# 执行混合任务 (搜索 + 浏览器)
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
            python3 /root/.openclaw/workspace/skills/weather/weather.py 2>/dev/null || \
            curl -s "wttr.in/Shanghai?format=%c%t+%h" || echo "无法获取天气"
            ;;
        price)
            local product="$*"
            do_search "$product 价格"
            ;;
        compare)
            local items="$*"
            do_hybrid "对比 $items"
            ;;
        *)
            echo "未知命令: $cmd"
            ;;
    esac
}

# 帮助
show_help() {
    cat << EOF
🌐 Smart Web - 智能网页助手

用法: smart-web <command> [args...]

命令:
  <任务描述>           自动分析并执行
  
快速命令:
  news                 获取今日新闻
  weather              获取天气
  price <产品>         查询产品价格
  compare <物品>       对比物品

示例:
  smart-web "什么是AI"
  smart-web "如何学习Python"
  smart-web "打开google.com"
  smart-web "研究iPhone vs Samsung"
  smart-web news
  smart-web price iPhone16

自动判断:
  信息查询 → 搜索API (Tavily优先)
  交互操作 → browser-use
  研究调研 → 搜索 + 浏览器
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
    if [ "$cmd" = "news" ] || [ "$cmd" = "weather" ] || [ "$cmd" = "price" ] || [ "$cmd" = "compare" ]; then
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
