---
title: "macOS monterey 安装多版本jdk"
date: 2024-11-20
author: wangy325
BookToC: true
categories: [utility]
tags: [软件]
---

{{< hint  info >}}
macOS monterey 下，`brew install openjdk@17` 和`brew install openjdk@8`均失败。

解释为brew不为旧版本的macOS提供支持。前者安装提示不具备编译jdk17的条件，后者走完进度条99%后提示不具备安装的配置文件。合着就是不给安装就是了。

我才从macOS big sur升级到monterey啊喂！

以下为报错提示：

>openjdk@17: A full installation of Xcode.app is required to compile
this software. Installing just the Command Line Tools is not sufficient.
>
>Xcode can be installed from the App Store.
>Error: openjdk@17: An unsatisfied requirement failed this build.

实际上安装xcode之后也是同样的报错提示，无法完成安装jdk17。

>No configurations found for /private/tmp/openjdkA8-20241120-68024-ewd1kw/jdk8u-jdk8u432-ga/! Please run configure to >create a configuration.
>Makefile:55: *** Cannot continue.  Stop.
>

{{< /hint >}}


经一番调查，发现brew默认会**自动更新**，而brew[4.3.0](https://brew.sh/2024/10/01/homebrew-4.4.0/)版本之后就不再对macOS Monterey提供支持了。

但是，通过进入homebrew的文件夹`/usr/local/Homebrew`，使用`git checkout`切换到4.2.21（4.3.0之前最后一个版本），并且在`.zshrc`中配置

    export HOMEBREW_NO_AUTO_UPDATE=1

之后再次安装jdk，依然还是失败。

遂直接从[archive](https://jdk.java.net/archive/)下载指定的jdk版本，手动安装。

macOS的Java虚拟机指定安装在`/Library/Java/JavaVirtualMachines`目录下。下载后的JDK解压后，直接移动到这个文件夹即可。

以JDK17为例：

```shell
 tar xvf openjdk-17*_bin.tar.gz
```

解压后得到一个`jdk-17.0.2.jdk`文件夹，将这个文件夹的内容移动到`/Library/Java/JavaVirtualMachines`目录。

接下来，就是配置环境变量了。

以我的系统为例，目前系统里有2个jdk：

```shell
➜  ~ ll /Library/Java/JavaVirtualMachines
total 0
drwxr-xr-x@ 4 wangy325  staff   128B Nov 19 20:20 jdk-17.0.2.jdk
lrwxr-xr-x  1 root      wheel    45B Oct 18  2022 openjdk-11.jdk -> /usr/local/opt/openjdk@11/libexec/openjdk.jdk
```

一个是手动安装的jdk17，一个是通过brew安装的jdk11（big sur时期）。

macOS可以通过`echo $(/usr/libexec/java_home  -v 11)`来查看java的安装位置信息。后面的`11`是java的版本。

因此，可以通过这个变量来配置环境变量。

在`.zshrc`中作以下配置：

```shell
export JAVA_11_HOME=$(/usr/libexec/java_home -v 11)
export JAVA_17_HOME=$(/usr/libexec/java_home -v 17)
export JAVA_HOME=$JAVA_17_HOME
export PATH=$PATH:$JAVA_HOME/bin
alias jdk11="export JAVA_HOME=$JAVA_11_HOME"
alias jdk17="export JAVA_HOME=$JAVA_17_HOME"
```

更新配置后，可以直接使用快捷命令`jdk11`和`jdk17`快速切换jdk版本。

