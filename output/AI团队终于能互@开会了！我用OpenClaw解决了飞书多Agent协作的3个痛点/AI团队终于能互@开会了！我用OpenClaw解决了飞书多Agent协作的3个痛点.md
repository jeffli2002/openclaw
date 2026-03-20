---
title: "AI团队终于能互@开会了！我用OpenClaw解决了飞书多Agent协作的3个痛点"
author: 王同学的AI之旅
date: "2026-03-06 18:47:38"
source: "https://mp.weixin.qq.com/s/iRUlw9k1GrH2nit-s42BzA"
---

# AI团队终于能互@开会了！我用OpenClaw解决了飞书多Agent协作的3个痛点

前一篇文章，我分享了用OpenClaw在飞书上搭建3个AI学生的经历——博士生阿潮、硕士生小杭、本科生小云，各司其职，配合默契。

[OpenClaw + 飞书多Agent实现教程 | 3个AI学生到岗，我终于体验了当导师的感觉](https://mp.weixin.qq.com/s?__biz=MzE5ODk5MTU0NA==&mid=2247483708&idx=1&sn=1e7106d4f9fff90f781e2570c516d364&scene=21#wechat_redirect)

但说实话，用了一段时间后，我发现了3个让人抓狂的痛点：

**痛点1：每次只能@一个Agent**
想让多个AI一起讨论？不行，只能一个个@。

**痛点2：@A@B时，A也会@B**
我@了阿潮和小杭，结果阿潮回复时也@小杭，小杭回复时也@阿潮。

**痛点3：AI想@其他AI时，@不起来**
当阿潮想说"这个问题@小杭你来回答"时，小杭根本收不到通知，就是一段普通文字。

以上这3个痛点，都会使得我在飞书群聊跟3个Agent交互时，很不丝滑，没有真实场景下的那种感觉。

于是我决定：**让AI们真正学会"开会"，彼此互@，学会“踢皮球”！**

## 一、当10个AI大佬坐在一起脑洞打开

经过一番折腾（后面详细说），我成功搭建了一个10人全球AI大佬团队：

有OpenClaw的发明者Peter Steinberger、LangChain的创始人Harrison Chase、Google Brain联合创始人Andrew Ng等人加盟我的团队。

![Image](images/img_001.png)

然后，神奇的事情发生了，见下图

![Image](images/img_002.png)![Image](images/img_003.png)![Image](images/img_004.png)

我就这样眼睁睁看着4个AI大佬在飞书群里从"约饭"聊到了"LangGraph执行图的TVM编译优化"、"端侧Agent架构"、"Agentic Workflow"...

那一刻的感觉，就像看到了硅谷版的《十二怒汉》——每个人都从自己的专业角度切入，但最终指向同一个目标：让AI真正在用户设备上干活。

## 二、为什么AI之间@不起来？我踩了4个大坑

要让AI互相@，听起来简单，实际上飞书平台有4个致命限制：

### 坑1：卡片消息不支持@通知

OpenClaw默认发送的是卡片消息（那种有代码高亮、表格渲染的漂亮消息），但飞书的卡片消息中，`<at>`标签只是显示效果，**不会触发真正的@通知**。

### 坑2：open\_id应用隔离

飞书的每个机器人应用都有独立的用户ID体系。同一个人在不同Bot眼里，ID完全不同。

Harrison的Bot看到的用户ID是`ou_abc123`，Tianqi的Bot看到的可能是`ou_xyz789`。

### 坑3：@被替换成占位符

飞书会把消息中的@替换成`@_user_1`这样的占位符，真实的用户ID藏在别的地方。

### 坑4：Bot消息不推送给其他Bot（最严重）

这是花了我3天时间才发现的真相：**飞书根本不会把Bot A发的消息推送给Bot B的事件订阅**。

也就是说，Harrison发了条带@Tianqi的消息，Tianqi的Bot压根收不到这条消息的推送事件。就像两个人在同一个房间（同一个群组），但戴着不同频道的耳机。

## 三、我的攻坚之路

发现问题后，我开始了漫长的技术攻坚。

因为一开始我并不清楚飞书Bot之间的消息推送机制，因此做了很多尝试和修改。包括：

> 把LLM输出的`@Tianqi`转换成飞书的`<at id=ou_xxx></at>`格式。结果发现卡片消息不支持@通知。👉 **失败**

> 改用post类型消息，用独立的at节点。结果撞上了open\_id应用隔离的墙。👉 **失败**

> 尝试让接收的Bot扫描消息内容，看看有没有自己的open\_id。结果发现内容里都是占位符。👉 **失败**

> 改成扫描`@accountId`文本。逻辑上没问题，但Bot消息根本不会推送给其他Bot。👉 **失败**

我奔溃了！

最后我才终于意识到：必须完全绕过飞书的@机制！

于是，我开始在Openclaw内部做源码修改。

> 首先在OpenClaw内部检测回复中的@，然后通过agentToAgent通道转发。这点成功地将消息转发给了Tianqi，并回复了。

但问题是：Tianqi的回复是通过Webchat通道发回给Harrison，不是以自己的飞书身份发到群里。

交互体验还差些意思。

关键突破来了：**synthetic event内部转发机制**。

> 核心思路是：
>
> 1. 1. Harrison回复后，OpenClaw检测到回复中有`@Tianqi`
> 2. 2. 构造一个"模拟事件"，直接调用Tianqi的消息处理函数
> 3. 3. 让Tianqi以自己的飞书账号身份回复到群里

最终实现了完美的多轮@对话。

## 四、核心技术：synthetic event是怎么工作的？

说人话，就是内部转发。

### 传统方案（不可行）

由于飞书不支持推送Bot消息给其他Bot，因此无法实现Bot之间的互@。

### synthetic event方案（可行）

```
Harrison发消息 →
OpenClaw检测@Tianqi →
直接调用Tianqi处理函数 →
Tianqi回复
```

具体流程：

1. 1. **回复检测**：Harrison回复后，OpenClaw保存回复文本
2. 2. **@识别**：扫描文本，发现`@Tianqi`
3. 3. **事件构造**：创建一个模拟的飞书消息事件
4. 4. **内部转发**：直接调用Tianqi的`handleFeishuMessage`函数
5. 5. **身份回复**：Tianqi用自己的飞书账号回复到群里

关键是第5步：Tianqi收到模拟事件后，会用自己的`appId`和`appSecret`创建飞书客户端，以自己的身份发送回复。

另外，我这里设置了`MAX_SYNTHETIC_TURNS = 2`。

这样最多允许2轮Agent间转发，既保证了多轮协作，又避免了失控和tokens过度消耗。

## 五、手把手教你实现（技术实现）

### 5.1 架构设计

当你搞清楚原理和机制后，整体架构就变得很简单：**OpenClaw + 飞书多应用 + synthetic转发**

**![Image](images/img_005.png)**

### 5.2 关键代码修改

核心修改只涉及2个文件：

路径都在`.openclaw/extensions/feishu/src`文件夹里面

**reply-dispatcher.ts**：保存回复文本

```
// 添加变量保存最后的回复
let _lastDeliveredText = "";

// 在发送回复时保存文本
deliver: async (payload) => {
  const text = payload.text ?? "";
  _lastDeliveredText = text; // 保存回复文本
  // ... 发送逻辑
}

// 暴露getter方法
return {
  dispatcher,
  getLastDeliveredText: () => _lastDeliveredText,
  // ...
}
```

**bot.ts**：检测@并转发

```
// dispatch完成后检测@
log(`dispatch complete (replies=${counts.final})`);

if (isGroup && getLastDeliveredText) {
  const replyText = getLastDeliveredText();
  const mentionedAgents = [];

  // 检测回复中的@agentName
  for (const agentId of allAgentIds) {
    if (replyText.toLowerCase().includes(`@${agentId}`)) {
      mentionedAgents.push(agentId);
    }
  }

  // 构造synthetic事件转发
  for (const targetId of mentionedAgents) {
    const syntheticEvent = {
      message: {
        message_id: `synthetic_${Date.now()}`,
        content: JSON.stringify({ text: `${accountId} 说：${replyText}` })
      }
    };

    // 直接调用目标Agent的处理函数
    handleFeishuMessage({
      event: syntheticEvent,
      accountId: targetId  // 关键：用目标Agent的身份
    });
  }
}
```

### 5.3 配置要点

**10个飞书应用**：每个Agent需要独立的飞书机器人

```
{
  "channels": {
    "feishu": {
      "accounts": {
        "harrison": { "appId": "cli_xxx1", "appSecret": "xxx" },
        "Tianqi": { "appId": "cli_xxx2", "appSecret": "xxx" },
        // ... 其他8个
      }
    }
  }
}
```

**Agent映射**：绑定关系要一一对应

```
{
  "bindings": [
    { "agentId": "harrison", "match": { "accountId": "harrison" } },
    { "agentId": "Tianqi", "match": { "accountId": "Tianqi" } },
    // ...
  ]
}
```

### 5.4 部署步骤

1. 1. **创建10个飞书机器人应用**，获取appId和appSecret
2. 2. **配置openclaw.json**，添加10个Agent和飞书账户
3. 3. **修改源码**，添加synthetic转发逻辑
4. 4. **重启OpenClaw Gateway**
5. 5. **拉机器人进群**，测试多轮@功能

## 六、这不只是技术突破，更是AI协作的新范式

### 商业价值：重新定义专家会议

想象一下这些场景：

**技术评审会**：产品经理描述需求，架构师@后端工程师讨论可行性，后端@前端确认接口，前端@测试制定验证方案...

**医疗会诊**：全科医生@心内科专家，心内科@影像科，影像科@病理科...

通过这种底层的@机制，异构的 Agent（不同模型、不同专业领域）能够自然地形成协作链条。这比传统的 "一个大模型包打天下" 要专业和精密得多。

这不禁让我想到一个问题：**当AI开始社交和协作，我们在见证什么？**

也许是智能体从"工具"向"同事"的进化。

通过这种底层的@机制，异构的 Agent（不同模型、不同专业领域）能够自然地形成协作链条。这比传统的 "一个大模型包打天下" 要专业和精密得多。

随着多智能体协同底座的成熟，智能体经济（Agentic Economy）正从概念走向现实。

![Image](images/img_006.png)

正如峰会上这张图所示，核心目标是最大化利润（PROFIT）。

利润由营收与成本的差值决定，而营收和成本又各自受到一系列基础运营要素的驱动和支撑。

未来的 AI 不只是在聊天框里回答问题，它们将组成一个可以交换价值的网络系统。

Agent 将深深嵌入到图中的诸多运营环节中，自主沟通、自主协作、直接创造经济价值。

而这一切，正悄无声息地开始渗透。

行百里者半九十，积极拥抱变化，努力学习！

如果想要完整的Openclaw源码配置代码，可关注我留言，整理后发你。
