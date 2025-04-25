---
title: "一个免费托管python代码的站点"
date: 2024-07-08
author: wangy325
categories: [python]
tags: [Integration]
enableGitInfo: true
BookToC: false
# weight: 
---

基于`Coze`的收费策略，在上面（免费）使用`Gemini`的可能性不大了(每日20次`gemini-1.5-flash`请求)。于是尝试单独接入并部署一个电报机器人玩玩看。

GitHub上有关Telegram机器人的项目不少，并且使用python并接入google Gemini AI的也不在少数。随即[clone](https://github.com/H-T-H/Gemini-Telegram-Bot.git)了一个，查看文档之后，便可上手。

<!--more-->

本地调试遇到的问题

1. Docker镜像build不成功

    原计划按照项目文档，找[Zeabur](https://zeabur.com/docs/zh-CN/get-started)来托管`docker`容器，但是由于前一阵国内各镜像加速纷纷停止对docker-hub的支持，导致Docker build一直在失败，本地调试一直`request time out`。无奈作罢。

    照理讲，安装文档直接部署就可以了，不过有一种本地跑不起来不部署的执念😅。

    这几天试试搞个本地的镜像吧。

    >`docker`需要配置代理或者镜像加速
    >
    >在墙内想玩点东西，第一步往往是和墙作斗争，太难了😭️。

2. 本地运行

    不出意外，本地跑肯定是会遇到问题的:

    1）机器人`Token`的问题。由于之前telegram机器人的token在`Coze`上配置过，虽然Coze收费之后~~一怒之下~~删掉了bot，但是telegram机器人的`webhook`已经被设置了，不能再重复使用。此时配置项目并运行，会出现`webhook`冲突。处理办法是在telegram `botFather`处`revoke token`，重新设置后即可。

    2）`proxy`的问题。~~众所周知的原因~~，所以想要调试必须要使用代理：

    ```py
    import os
    # google api proxy
    os.environ['http_proxy']='http://127.0.0.1:7890'
    os.environ['https_proxy']='http://127.0.0.1:7890'
    os.environ['all_proxy']='socks5://127.0.0.1:7890'
    # use proxy when running locally
    # https://www.pythonanywhere.com/forums/topic/32151/
    from telebot import asyncio_helper
    asyncio_helper.proxy = 'http://127.0.0.1:7890'
    ```

    另外，Gemini[不支持香港地区](https://ai.google.dev/gemini-api/docs/available-regions?hl=zh-cn)😂。

幸运的是，处理完上面的问题，脚本正常跑起来了。

如何部署？

`Zeabur`最快的方式是从你的github拉取项目并自动构建，由于是测试性质，并且docker方式并没有在本地调试成功（这里除了镜像加速的问题，上述代理问题，容器运行之后一样会遇到）。就不在github创建仓库了。😅

[pythonanywhere](https://www.pythonanywhere.com)可以分配用户一定的免费资源[^1]，并且带有python解释器，可以[直接运行脚本](https://youtu.be/2TI-tCVhe9k?si=NPZTjEwEX0lWj88Q)，简直是完美的选择。

[^1]: 每天100s的处理器时间以及，总共512MB的磁盘空间。

静态配置参数`telegram token`和`Gemini api-key`，直接运行脚本即可成功创建[机器人](https://t.me/wygemibot)。

{{< update 2025-02-25 >}}
使用`pythonanywhere`托管的服务，无论是使用解释器直接运行还是使用命令行启动，基本上隔天就会被杀掉。可能是免费用户的原因，它的资源占用是按天重置的？
{{< /update  >}}


{{< update 2025-04-25 >}}
已经停止在`pythonanywhere`上部署代码，使用`koyeb`替代。
{{< /update >}}
