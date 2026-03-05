# 战略记忆 - 虾仔的长期记忆

> 最后更新: 2026-02-26
> 维护者: Chief Agent (虾仔)

---

## 2026-02-27: 胶囊集成 + Cron自动化

**任务**：从EvoMap拉取高下载量(≥5次)胶囊并集成

**筛选条件**：
- confidence >= 0.9 (置信度)
- success_streak >= 5 (成功次数)

**安全检查**：已整合到Cron任务
- 认证凭据：password/passwd/secret/api_key/token/bearer/authorization
- 代码执行：eval/exec/subprocess/os.system/child_process/__import__
- 恶意文件：.exe/.sh/rm -rf
- 编码解码：base64.b64decode

**Cron任务更新**：
- daily-skill-evolution (22:00) 已加入安全检查逻辑
- 报告新增"安全检查结果"和"可疑胶囊"章节

**已集成胶囊 (13个)**：见 strategic.md 上一条记录

**问题**：daily-content-publish (9:00) 任务从2月25日9点直接跳到2月27日9点，2月26日被跳过

**原因**：
- Gateway在2月26日01:09:39被重启
- 重启后cron调度器恢复时计算下次运行时间出错
- 应该是02-26 09:00，但计算成了02-27 09:00

**临时修复**：
- 手动触发任务：`openclaw cron run <job-id>`

**长期方案**：
- 在heartbeat中增加cron任务检查
- 检测nextRunAtMs是否在合理时间范围内
- 如果异常则告警并手动修复
- 已添加HEARTBEAT.md检查项：检查nextRunAtMs是否在预期时间±1小时内

---

## 2026-02-26: Twitter监控Cron任务失败

**问题**：twitter-browser-monitor连续13次执行失败，错误信息"⚠️ ✉️ Message failed"

**原因**：
1. Delivery配置错误 - cron的`delivery.channel`设为`feishu`但target格式不正确
2. Isolated模式下cron的announce机制无法正确调用飞书消息发送API

**修复方案**：
- 将delivery设为`mode: none`（禁用cron自动投递）
- 在任务指令payload中添加显式的message工具调用，让agent自己发送消息

**经验**：
1. Cron任务的announce delivery在isolated session模式下有局限性
2. 对于需要消息推送的任务，最好让agent自己调用message工具
3. 测试时先用`message`工具测试通道是否可用，再配置cron

---

## 2026-02-25: Git仓库覆盖事故

**事故**：yanglaojin项目被完全覆盖，原有几十个文件丢失

**原因**：
- 本地新建文件夹后直接force push
- 没有先clone远程仓库
- 没有git pull就push

**教训**：
1. **永远不要对有内容的远程仓库force push**
2. 重要操作前先创建本地备份
3. 先了解项目当前状态，不假设
4. 对生产级项目操作要谨慎
5. 重要操作前向用户确认

**正确流程**：
```bash
git clone https://github.com/xxx/xxx.git
cd xxx
# 添加修改
git add .
git commit -m "feat: ..."
git push  # 不要-f
```

---

## 架构演变 (2026-02-26)

### 新Memory分层架构

从"每个Agent独立memory"升级为"集中式记忆 + 分布式执行"：

```
memory/
├── chief/
│   ├── strategic_memory.md   # 本文件 - 战略记忆
│   ├── company_rules.md      # 公司规则
│   └── vision.md            # 长期愿景
│
├── projects/
│   └── default_project.md   # 项目状态
│
├── reports/
│   └── 20260226_report.md   # 日报存档
│
└── agents//              # Sub-Agent执行缓存
    ├── growth/
    ├── coding/
    └── ...
```

**核心规则**：
- 只有Chief有写长期记忆权限
- Sub-Agent只执行任务，不存长期记忆
- 所有报告append-only，无rewrite
