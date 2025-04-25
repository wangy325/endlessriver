---
title: "使用Coze的插件和工作流创建自定义AI工具"
date: 2024-06-21
author: wangy325
categories: [utility]
tags: [Integration]
enableGitInfo: true
BookToC: false
# weight: 15
---

{{< hint danger >}}
*Coze已经被笔者放弃，文章内容可能已经过时。*
{{< /hint >}}

[Coze](https://www.coze.com/docs/guides/welcome?_lang=zh)是一个提供AI机器人的HUB，利用它市场上提供的Bot，可以很方便地使用AI机器人工作或娱乐。除了市场上五花八门的AI机器人之外，Bot还提供了自定义工作流，插件等功能，用来创建自己的AI工具。

> ⚠️2024年07月03日起，创建的Coze机器人需要[购买套餐](https://www.coze.com/docs/guides/subscription?_lang=zh)才能继续使用了，最便宜需要$9/Month，看来字节也被薅羊毛薅到顶不住了😭️。
>
>目前免费用户有每日免费使用GPT-3.5-turbo模型100次的限制，其他的模型免费次数太少，基本不能碰了。
>
>这个改动对于免费用户来说，使用复杂工作流基本上属于流产，工作流一次调用可能需要使用多次LLM😅。

<!--more-->

本来使用Coze可以完成如下的工作，特别是工作流，有一些可玩性。

- [x] 创建工作流
    - 使用大模型分析输入（*prompt and persona*）
    - 拼装参数
    - 调用能力 （plugin or workflow）
    - 处理结果
- [x] 创建插件
    - 接入[Kimi AI](https://www.moonshot.cn/)
- [x] 与电报机器人整合

---
不过开始收费之后，一切都变了。

简单来讲，当日只能使用100次GPT-3.5-turbo的额度（含调试），所以在Coze上调试Gemini是不可行了，这样子很快就会使用完额度。

所以就有了接下来的尝试。

本文结束。

---

以下是且还能用的利用Coze，基于GPT-3.5-turbo 制作的几个简单telegram机器人。

- ~~[fkubot](https://www.coze.com/store/bot/7381770033120149512?panel=1&bid=6d2t48g9s1008)：综合机器人~~
- ~~[googy](https://www.coze.com/store/bot/7386697840699113473?panel=1&bid=6d2t4aq3c4g07)：谷歌搜索机器人~~
- ~~[kimi](https://www.coze.com/store/bot/7382246708547420178?panel=1&bid=6d2t4aefs9008)：Kimi聊天机器人~~
