---
title: "使用MarkdownIt库拆分Markdown文本"
date: 2025-04-27
categories: [python]
tags: []
BookToC: false
---

在处理大模型的返回结果过程中，有些时候大模型返回的文本过长，甚至超过Telegram消息的长度限制。

这个时候，就需要对消息进行拆分。

但是，不能简单地根据分片长度或者换行符（`\n`）暴力拆分，因为这样可能会破坏`Markdown`的格式，特别是当返回中有代码片段（`code fence`）
时。因为代码中存在换行符，故会被拆成2部分，导致代码片段的闭合符<code>```</code>影响后续的文本格式。

<!--more-->

本例是一个拆分长`Markdown并保留原来格式的示例。

其利用了`MarkdownIt`库，这个库能够将`Markdown`文本解析为`token`，每个`token`都有基本的属性，观察属性，可以总结规律。

基本的拆分原则是：

1. 不在type为`open`的token处拆分
2. 不对`ul`和`li`进行拆分
3. 不对`code fence`进行拆分

以下是**不完美**代码示例：

---


{{< code items="markdown_it_demo" lang="py" >}}
