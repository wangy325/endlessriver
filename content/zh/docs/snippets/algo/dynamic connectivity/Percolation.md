---
title: Percolation(渗滤)
weight: 5
snippets: true
BookToC: false
date: 2026-04-29
categories: [java, algo]
---

---

这是Algorithms Part I第一章的练习部分。设计一个{{< katex >}}N*N {{< /katex >}}渗滤系统，每个格子初始化为封闭状态。每次打开一个格子，直到系统渗滤为止。计算渗滤所需的平均打开格子数占总格子数的比例。

提示：

1. 渗滤：意味系统第一行任意节点和最后一行任意节点连通。
2. 使用`WeightedQuickUnionUF`数据结构来建模系统，并使用两个虚拟节点来判断系统是否渗滤。

原文地址：[Percolation](https://coursera.cs.princeton.edu/algs4/assignments/percolation/specification.php)



