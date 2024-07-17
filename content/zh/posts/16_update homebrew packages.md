---
title: "更新使用Homebrew安装的软件包"
date: 2024-07-17
author: wangy325
tags: []
categories: [utility]
enableGitInfo: true
BookToC: false
---

使用`Homebrew`安装的软件包，安装完成之后，可能几年都不会去管一眼。不过么，等到几年后要升级的时候，还是会有点麻烦。主要是`Homebrew`慢（:--汗😓️。

<!--more-->

如果网络OK的话，只需要执行

    brew update && brew upgrade <your package name>

就可以了。

第一个命令，`brew update`用来获取可供安装的软件包的最新版本，下次安装的时候，就能安装最新的版本。

第二个命令，`brew upgrade <package>` 用来更新指定的软件包。


你以为这样就行了？对于有些软件包可能是的。不过，很有可能并不是这样的。

以python为例，`Homebrew`的可供安装的软件包是以小版本打包的，如python 3 可供安装的包有`python@3.8`，`python@3.9`，`python@3.10`等等。

上述`brew upgrade@3.9`命令，可能只是将python `3.9.14`升级到`3.9.19`，并不会升级到`3.10`。所以要安装python `3.10`，你需要直接安装。

    brew install python@3.10

> ~~你妈~~，一个小时，更新个python还没完事。

没问题的话，brew会处理好`/usr/local/bin`中`python3`的命令链接，此时python3已经指向更新的`3.10`了。

安装完成后系统会存在3个版本的python（实际上macOS 11.7系统自带一个老版本的python2，macOS 12则删掉了）。

卸载旧版本的python：

    brew uninstall python@3.9


如果Homebrew真的慢到不能工作，可以试试[使用国内的镜像](https://www.didispace.com/installation-guide/base-tools/homebrew.html#homebrew%E9%97%AE%E9%A2%98%E4%BF%AE%E5%A4%8D)，尽管可能没什么用，值得一试，不是么？
