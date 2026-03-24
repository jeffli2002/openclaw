# 长期愿景

> 最后更新: 2026-03-24

---

## 身份定位

- **AI一人公司创始人** - Jeff的AI助理
- **AI内容创业者** - 面向全球和中国用户

---

## 核心产品方向（优先级从高到低）

1. **AI培训** - 面向中国用户的线下/线上培训，核心产品，Jeff连续强调三天
2. **AI咨询** - 面向中国企业的AI落地咨询
3. **AI陪跑** - 长期陪跑服务
4. **AI SaaS工具** - 面向全球用户的工具产品（次级）
5. **AI内容创业** - 内容产出辅助（支撑作用）

**Jeff原话（连续强调三天）：** "我的产品重点方向是AI培训和咨询"

---

## 核心目标

### 短期 (2026 Q1-Q2)
- 搭建稳定的Agent基础设施
- 实现内容自动化生产
- 建立增长飞轮

### 中期 (2026 Q3-Q4)
- 产品化AI能力
- 建立付费用户群体
- 实现收入增长

### 长期 (2027+)
- 成为AI一人公司的标杆
- 建立可复制的AI运营方法论
- 帮助更多一人公司实现AI自动化

---

## 成功标准

- 系统稳定运行 > 99%
- 内容产出效率 > 10x
- 用户增长 > 10%/月
- 被动收入 > 50%总收入

---

## 🔧 运营体系（2026-03 上线）

### R&D 智囊团三角辩论
- **流程**：策略师(MiniMax-M2.7) · 产品官(Kimi 2.5) · 批评者(GPT-5.4) → 三角辩论 → 最终Memo
- **Cron**：rd-triangle-debate-am (09:00) / rd-triangle-debate-pm (21:00)
- **P0项目**：AI培训 / AI咨询 / AI陪跑
- **存储**：Supabase documents表（type=rd_memo），Second Brain前端读取/api/rd-memos
- **Dashboard**：飞书Bitable（app_token: L0qDbUS5ma16tmsd5NkcX35Jnml）

### Autonomous Employee 夜班
- 每晚 02:00 自动运行，分析业务 → 自主选择高价值任务 → 执行 → 推送飞书报告
- **Cron**：autonomous-employee-night-shift (02:00 Asia/Shanghai)
- **脚本**：/root/.openclaw/workspace/scripts/autonomous_employee.py
- **任务池**：内容调研 / 文案审计 / 产品设计 / 竞品研究 / Cold Email / Second Brain改进 / LinkedIn选题

### 飞书集成已知限制
- feishu_bitable_update_record 可正常写入
- 直接HTTP API调用飞书Bitable会403（需要用户身份代理）
- base:record:delete 权限已开通但仍403，需用户身份代理
- Bitable下拉选项无法通过API自动更新（需手动维护）

---

## 📌 Second Brain 关键地址

- **GitHub 仓库**：`https://github.com/jeffli2002/2ndbrain`
  - 本地 remote：origin 和 secondbrain 均指向此仓库
- **Vercel**：`https://vercel.com/jeff-lees-projects-92a56a05/2ndbrain`
- **飞书 Bitable R&D Dashboard**：`https://my.feishu.cn/base/L0qDbUS5ma16tmsd5NkcX35Jnml`
