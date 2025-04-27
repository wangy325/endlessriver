---
title: '一个基于Gemini的聊天机器人'
date: 2025-04-23
categories: ['Utility', 'Python']
tags: []

---

其实，用[AI聊天机器人](../2024/20240708_使用PythonAnywhere托管电报机器人.md)有一段时间了，使用过程中会遇到不同的问题。简单列举一二，作此文契。

1. 由于免费托管在`pythonanywhere`，直接运行的脚本基本上隔天就会挂掉。原因未知，可能是由于免费账户资源上限？需要频繁手动重启。
2. 由于Telegram的API消息长度限制，Gemini返回过长消息会直接报错。

基于上面的2个问题，决定改造一下项目。

<!--more-->

>*还是基于[这个](https://github.com/H-T-H/Gemini-Telegram-Bot.git)开源项目。*
>
>*这个项目也已经更新了，并使用流式输出，这种方式对于聊天机器人来说，可能并不好。尤其是在于处理需要分片的超长文本返回时，颇为不利。*

于是在保留所使用[Telegram API](https://github.com/eternnoir/pyTelegramBotAPI)的基础上，对项目进行了大面积重写。

项目结构比较简单，主要分为几个核心的功能：

1. `bot`初始化
2. `bot`的消息处理器注册：针对不同的消息类型，实现不同的业务
3. 调用`Gemini`的能力，主要使用了`连续对话`以及`内容生成`能力
4. 适时的异常处理
5. 添加了使用`pydevd`进行本地调试的代码

核心功能：

1. 增加`WEBHOOK`方式启动机器人，以方便以`webservice`的方式在`koyeb`部署，这也是现在运行的方式。虽然还是使用免费资源。
但相比`pythonanywhere`的频繁重启，要好上不少。

2. 使用[`markdown-it`](https://github.com/executablebooks/markdown-it-py)对Gemini返回的长文本分片，保留`markdown`格式，特别是
返回中存在代码片时，比暴力分片优美。

3. 使用了最新的`2.0-flash-exp`和`2.5-flash-exp`模型。

4. 增加了机器人的（视觉）能力，能够识别图片，音频，视频，文档中的内容。

5. 增加了图片生成的能力（仅`Gemini 2.0-flash`支持）。

6. 支持使用源代码和`docker`镜像部署


项目地址: https://github.com/wangy325/snipy/tree/main/pys/atelebot
