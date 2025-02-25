---
title: "为Spring-Boot应用程序设置参数的几种方式"
date: 2024-11-30
author: wangy325
BookToC: false
categories: []
tags: [Spring]
---

除了在`application.yml`或`application.properties`中配置Spring-Boot应用程序的参数外，还可以通过运行`java -jar`命令行的方式来配置参数。

比如`java -jar -Dspring.profiles.active=dev app.jar`就是常使用的命令之一。

> 当然，`java -jar`命令不止配置Spring参数，还可以配置JVM参数。本文只以Spring-Boot应用程序为例。

有时候，可能会看见这样的应用启动方式：`java -jar --spring.profiles.active=dev app.jar`，它也是可行的。这两个分别是什么呢？

<!--more-->

在控制台输入`java -h`，查看java命令的运行帮助，可以看到相关信息（只截取部分）：

```cmd
java -h
-D<名称>=<值>
                  设置系统属性
要为长选项指定参数, 可以使用 --<名称>=<值> 或
--<名称> <值>
```

### 1）应用参数

如前所述，使用`--k=v`形式的，添加的是应用参数。应用参数配置的优先级最高。

### 2）系统属性

使用`-Dk=v`形式设置的是系统属性。以下是引用的一段关于系统属性的描述：

>- 系统属性是与 Java 应用程序相关的键值对。它们由 Java 运行时环境（JRE）维护，常用于存储 Java 运行时的配置信息。
>- 系统属性通常用于 Java 程序内部，以反映程序行为或特定的 Java 环境设置，如文件编码、用户目录、操作系统名称等等。
>- 可以编程地在应用程序中设置或修改，通常通过 `System.setProperty()` 来设置属性。

系统属性配置的参数优先级低于应用参数。

### 3）环境变量

除了`java -h`提供的形式之外，还可以通过设置环境变量来设置应用的运行参数。以下是引用的一段关于环境变量的描述：

>- 环境变量是在操作系统层面定义的，影响整个系统或用户会话的配置参数。
>- 它们在操作系统中配置，用于提供有关系统的信息，或者为操作系统中运行的应用程序提供配置信息，如路径、主目录等。
>- 环境变量一般由操作系统设置，不在 Java 程序运行时动态更改。

{{< hint danger >}}
如果使用PC或者虚拟机，请注意环境变量的设置可能是全局的。如果多个应用程序通过环境变量来配置同名参数，会出现问题。

如果使用容器，那么配置环境变量是可取的方式之一。
{{< /hint >}}

在终端中设置环境变量并且启动Java程序即可。如：

```cmd
export SPRING_PROFILES_ACTIVE=DEV

java -jar app.jar
```

>需要注意的是，环境变量的命名一般使用大写并使用下划线(_)分隔的方式。

环境变量配置的参数的优先级低于系统属性。

在jetbrains IDEA中的应用运行配置界面，其实可以看到上面三种配置参数的方式 ：

<center style="font-size:.9rem;font-style:italic;color:grey">

![img](/img/post/shot2024-11-30at19.54.39.png)
IDEA 2023.2.3的应用程序运行配置界面
</center>

以上。

