#!/bin/bash
# Smart Browser - 智能浏览器调度器
# 根据场景自动选择 browser-use 或 agent-browser
# 支持错误处理、日志记录、会话管理

# 配置
BROWSER_USE_API_KEY="bu_asA1iDkZjaZlZoWaGoWJrh-ocb3ZyiygObrc1XFx5Jo"
LOG_FILE="/tmp/smart-browser.log"
SESSION_FILE="/tmp/smart-browser.session"

# 设置环境变量
export BROWSER_USE_API_KEY

# 日志函数
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
    # 检查 browser-use
    if ! command -v browser-use &> /dev/null; then
        error_exit "browser-use not installed. Run: pip install agentmail"
    fi
    
    # 检查 agent-browser (可选)
    if ! command -v agent-browser &> /dev/null; then
        log "WARNING: agent-browser not installed, will use browser-use only"
    fi
}

# 判断是否有本地GUI
has_gui() {
    [ -n "$DISPLAY" ] || [ -n "$WAYLAND_DISPLAY" ]
}

# 判断是否为AI任务
is_ai_task() {
    local cmd="$1"
    echo "$cmd" | grep -iqE "run|agent|ai|research|search|extract|crawl"
}

# 判断是否需要交互
is_interactive() {
    local cmd="$1"
    echo "$cmd" | grep -iqE "click|type|fill|input|select|hover|scroll"
}

# 获取或创建会话
get_session() {
    if [ -f "$SESSION_FILE" ]; then
        local session_id=$(cat "$SESSION_FILE")
        log "Using existing session: $session_id"
        echo "$session_id"
    else
        # 创建新会话
        local new_session=$(browser-use session create --json 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -n "$new_session" ]; then
            echo "$new_session" > "$SESSION_FILE"
            log "Created new session: $new_session"
            echo "$new_session"
        fi
    fi
}

# 路由决策
route_browser() {
    local cmd="$1"
    shift
    local args="$@"
    
    # AI任务 → browser-use
    if is_ai_task "$cmd"; then
        log "Mode: AI task → browser-use"
        echo "🤖 Using browser-use (AI mode)"
        browser-use --browser remote run "$args" 2>&1
        return $?
    
    # 沙盒环境(无GUI) → browser-use
    elif ! has_gui; then
        log "Mode: remote (no GUI) → browser-use"
        echo "🌐 Using browser-use (remote)"
        
        # 交互式命令使用会话
        if is_interactive "$cmd"; then
            local session_id=$(get_session)
            if [ -n "$session_id" ]; then
                browser-use --browser remote --session "$session_id" "$cmd" "$args" 2>&1
                return $?
            fi
        fi
        
        browser-use --browser remote "$cmd" "$args" 2>&1
        return $?
    
    # 本地有GUI → agent-browser
    else
        log "Mode: local (GUI) → agent-browser"
        echo "🖥️ Using agent-browser (local)"
        agent-browser "$cmd" "$args" 2>&1
        return $?
    fi
}

# 会话管理
session_manager() {
    local action="$1"
    case $action in
        list)
            echo "📋 Browser sessions:"
            browser-use session list 2>&1
            ;;
        clean)
            log "Cleaning up sessions..."
            browser-use session stop --all 2>&1
            rm -f "$SESSION_FILE"
            echo "✅ Sessions cleaned"
            ;;
        new)
            rm -f "$SESSION_FILE"
            get_session
            echo "✅ New session created"
            ;;
        *)
            echo "Usage: smart-browser session [list|clean|new]"
            ;;
    esac
}

# 帮助信息
show_help() {
    cat << EOF
🤖 Smart Browser - 智能浏览器调度器

用法: smart-browser <command> [args...]

命令:
  open <url>              打开网页
  state                   获取页面元素
  click <index>          点击元素
  type <text>            输入文字
  input <index> <text>   点击后输入
  screenshot [file]      截图
  run <task>             AI Agent任务
  close                  关闭浏览器
  session <action>       会话管理 [list|clean|new]

示例:
  smart-browser open https://example.com
  smart-browser run "搜索AI新闻并总结"
  smart-browser state
  smart-browser click 0
  smart-browser session list

自动选择逻辑:
  - AI任务 (run/agent/search) → browser-use
  - 沙盒环境 (无GUI) → browser-use
  - 本地有GUI → agent-browser

会话管理:
  smart-browser session list   查看所有会话
  smart-browser session clean  清理所有会话
  smart-browser session new   创建新会话
EOF
}

# 主入口
main() {
    # 检查依赖
    check_dependencies
    
    # 无参数显示帮助
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    local cmd="$1"
    
    # 会话管理命令
    if [ "$cmd" = "session" ]; then
        session_manager "$2"
        exit $?
    fi
    
    # 帮助命令
    if [ "$cmd" = "-h" ] || [ "$cmd" = "--help" ]; then
        show_help
        exit 0
    fi
    
    # 执行路由
    route_browser "$@"
}

main "$@"
