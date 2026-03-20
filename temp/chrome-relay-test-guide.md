# OpenClaw Chrome Browser Relay 测试指南

## 当前环境
- OpenClaw 版本：2026.3.13
- 测试时间：2026-03-16

## 测试步骤

### 步骤1：安装 Chrome 扩展

1. 打开 Chrome 浏览器
2. 访问 Chrome Web Store 搜索 "OpenClaw Browser Relay"
3. 点击 "Add to Chrome" 安装

或者直接访问：
https://chromewebstore.google.com/search/openclaw%20browser%20relay

### 步骤2：启用扩展

1. 安装完成后，点击 Chrome 工具栏的扩展图标
2. 找到 "OpenClaw Browser Relay" 或 "ClawdBot"
3. 点击 "ON" 按钮启用

### 步骤3：测试控制

在飞书/Discord/Telegram 中向 OpenClaw 发送：

```
请打开浏览器，访问 google.com，然后搜索 "OpenClaw AI agent"
```

## 预期结果

- OpenClaw 应该能够控制你的 Chrome 浏览器
- 自动打开 Google
- 自动输入搜索词
- 自动点击搜索

## 安全建议

1. **创建独立的 Chrome 配置**：不要用主账号，建一个专门的自动化配置
2. **使用时开启，不用时关闭**：控制风险
3. **不要在自动化配置中登录敏感账号**

## 常见问题

### Q: 扩展显示 "debugging this browser"
A: 正常，表示 OpenClaw 已连接到浏览器

### Q: 没有响应
A: 检查扩展是否已开启 ON 状态

### Q: 需要权限
A: 点击扩展图标 → 设置 → 确保权限已授权
