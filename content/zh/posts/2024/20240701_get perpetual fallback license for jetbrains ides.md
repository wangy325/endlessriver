---
title: " 获取JetBrains IDE的永久回退授权"
date: 2024-07-01
author: wangy325
categories: [utility]
tags: [软件]
enableGitInfo: true
BookToC: false
# weight: 
---

{{< hint warning >}}
此文并不是为推广或鼓励使用破解软件。

如果条件允许，请购买正版软件，以支持开发者并体验最新的功能。
{{< /hint >}}

<!--more-->

实在是~~白嫖成瘾~~（囊中羞涩），自从教育优惠过期之后，就一直使用的破解版本。其中经历诸多曲折，不提也罢。

> 实际上，只要购买过指定版本的IDE一年，就可以获得永久回退授权，虽不能再享受更新，IDE功能是可以正常使用的。

针对没有购买过正版IDE的用户，2025年03月12日前还可行的操作方法：

1. 访问[网站](https://3.jetbra.in/)

    这个网站列出了可用的站点，选择一个进去即可。

2. 下载页面顶部的`jetbra.zip`文件

    - `jetbra.zip`文件后面可以看到支持的IDE版本。
    - 根据页面上显示的IDE版本，（如`2023.2.x`，一般较最新版落后），去[官网](https://www.jetbrains.com/idea/download/other.html)下载对应版本号的IDE版本，并安装。
    - 在终端进入第一步下载的`jetbra`文件夹，运行 `bash scripts/install.sh`，会自动配置。如果是windows用户，直接双击运行`.bat`脚本文件（具体查看readme.txt文件的NEW部分）。
3. 在第2步打开的网站上，找到你要破解的IDE，复制激活码，打开IDE，使用激活码激活即可。你会获得一个有过期时间但是**永久回退**的授权，不用关心过期时间，也不要更新IDE。
4. 如果还需要激活其他IDE，重复操作第3步即可，注意下载第2步中网页上显示的可激活的版本，不同的IDE可以激活的版本可能会有差异。
5. 此过程中不要登录jetbrains账户，完成之后可以登录。

> ⚠️⚠️⚠️特殊说明
>
>如果遇到IDE无法打开的情况，或者授权失效的情况，可能是网站的内容有更新。
>请到网站查看最新的内容。
>
> 如果最新的内容更新后还是失败，注意查看用户目录下是否存在`.jetbrains`隐藏文件夹，如果存在，则使用新的`jetbra.zip`解压后的文件替换之。

{{< update 2025-02-10 >}}
MacOS下，重启后，可能会导致激活失败，再运行上述第二步中的脚本即可。Windows系统下没有遇到这个问题。
{{< /update >}}
