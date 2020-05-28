---
title: "关于forever启动node服务的问题"
date: 2019-08-28
draft: false
tags: [node.js]
categories: [JS]
author: "wangy325"

hasJCKLanguage: true
# You can also close(false) or open(true) something for this content.
# P.S. comment can only be closed
# comment: false
toc: true
autoCollapseToc: false

# reward: false
---


在使用jenkins自动构建node.js项目的时候，由于对forever的不熟悉，构建脚本一直存在一点小问题。

<!--more-->

现在简单记录下整个node环境搭建以及部署的流程。

## 1. node环境的安装

最简单的方法是直接使用node已经编译好的可执行文件, 解压之后，将可执行文件链接到`$PATH`中：

```
wget https://nodejs.org/dist/v10.16.3/node-v10.16.3-linux-x64.tar.xz
# unarchive file to /usr/local
tar -xf node-v10.16.3-linux-x64.tar.xz -C /usr/local
# create link, so you can run node everywhere
ln -sf /usr/local/node-v10.16.3-linux-x64/bin/node /usr/bin
ln -sf /usr/local/node-v10.16.3-linux-x64/bin/npm /usr/bin
# check whether node install successful
node
10.16.3
```

## 2. 安装forever

```shell
npm install forever -g
ln -sf /usr/local/node-v10.16.3-linux-x64/bin/forever /usr/bin
```

说明：直接全局安装forever之后，运行`forever`会出现`command not found`错误，同上，执行`ln ..`就可以了。

## 3. 使用forever启动脚本

```shell
forever start -l /locate/of/log/alog.log -a /locate/of/startScript/satrt.js
```

上述命令可以使用相对路径。

启动成功后，我们看一下后台进程和forever的list：

```shell
ps aux | grep node 
root     25573  0.0  0.9 571244 35412 ?        Ssl  15:50   0:00 /usr/local/node-v10.15.3-linux x64/bin/node /usr/local/node-v10.15.3-linux-x64/lib/node_modules/forever/bin/monitor ./bin/dev.js
root     25580  0.0  0.8 604868 34252 ?        Sl   15:50   0:01 /usr/local/node-v10.15.3-linux-x64/bin/node /opt/webManager/bin/dev.js
root     26236  0.0  0.0 112708   984 pts/1    S+   17:43   0:00 grep --color=auto node

forever list
info:    Forever processes running
data:  uid command      script     forever pid   id logfile         uptime               
data:  [0] UNdQ /*/node  bin/dev.js 25573   25580    /*/a.log       0:2:18:18 
```

可以看到一个node进程和一个monitor进程。

我们在重新构建的时候，一般会选择杀掉服务进程，然后重启服务。此时，面对2个进程，只杀掉一个进程，是不行的。

1. 如果单独杀掉monitor进程，node进程还在，也就是说项目并没有停止运行，此时，如果再次使用forever启动，脚本也不会启动。此时，`forever list`显示的uptime 为 `STOPED`
2. 如果单独杀掉node进程， forever monitor会自动重新启动脚本

因此，在重新构建时，应该杀掉monitor和node两个进程。

------

EDIT：或者可以直接使用forever安全[停止脚本](https://stackoverflow.com/questions/14556852/how-to-stop-node-js-application-using-forever-module-on-windows)

```shell
forever stop 0
```