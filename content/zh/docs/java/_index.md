---
weight: 1
title: "Java核心"
bookFlatSection: true
bookCollapseSection: false
bookComments: false
BookToC: false
---

## Java入门

记录了Java相关的知识，包括了面向对象基础，集合框架、并发和JVM等相关内容。

### Java基础

{{< columns >}}
#### 1 必知必会
Java基础知识容易忽视、混淆的点，简单做一些记录。另外还有一些不常用的Java API，试着优雅的使用它们。

- [访问权限修饰符](basic/1_访问权限修饰符.md)
- [抽象类与接口](basic/6_抽象类与接口.md)
- [内部类](basic/8_内部类.md)
- [static关键字](basic/2_static关键字.md)
- ...
<--->  <!-- magic separator, between columns -->

#### 2 集合框架
集合框架，开发中使用最多的Java工具类，不管是List，还是Hash还是Map，随处可见，然而要用好它们，可能需要更好地了解它们...

- [数组](collections/1_List_arraylist.md)
- [链表](collections/1_List_linkedlist.md)
- [队列](collections/2_Queue.md)
- [映射集](collections/4_Map.md)
- [HashMap的源码分析](collections/6_HashMap的源码分析.md)
- ...
{{< /columns >}}

### 并发

并发，是Java的沼泽地，没有路线指引，只会越陷越深然后迷茫地翻过篇去。这里讨论了和并发相关的的重要概念以及Java提供的并发组件。有些部分深入源码，剖析了它们的实现逻辑，深入理解Java对并发的控制。

本部分内容由浅入深，首先讨论了线程的概念，生命周期以及另一个重要的概念——**任务**。以及为什么需要并发，并发过程中会遇到的**共享资源**的问题。接下来，阐述了并发过程中常遇到的问题——**死锁(Dead Lock)**。

- [线程与任务](concurrency/1线程与任务_1.md)
- [锁与同步](concurrency/2资源访问受限_2_锁和条件.md)
- [获取任务的返回值](concurrency/3获取任务的返回值.md)
- [终结任务](concurrency/5终结任务.md)
- [死锁](concurrency/4死锁.md)

接下来，开始讨论执行器和线程池。执行器可以看作执行任务的*trigger*，Java提供了不同类型的执行器和线程池，以应对不同的应用场景，各线程池的线程创建及销毁条件都有所区别，了解线程池中线程的创建、入队、销毁、拒绝机制，对于理解线程池以及Java并发有很大的帮助。此外，Java还提供了其他一些重要的并发组件，比如**阻塞队列**，**倒计时门栅**，**信号量**等等，一并作介绍。

- [执行器和线程池](concurrency/7_1_Executors.md)
- [计划执行任务](concurrency/8计划执行任务.md)
- [阻塞队列与生产-消费模式](concurrency/6生产者-消费者与阻塞队列.md)
- [其他重要的并发组件](concurrency/9其他重要的并发组件.md)

最后，简单地讨论了Java的内存模型，同时讨论了`volatile`这个曾经饱受争议的关键字，介绍了Java虚拟机执行程序的**指令重排**。

- [Java内存模型与valatile关键字](concurrency/10_Java内存模型与volatile关键字.md)

### JVM

关于Java JVM的讨论内容相对较少，周志明《深入理解Java虚拟机》尚未完全读完，也只是看了前面几个章节，所掌握的内容是寥寥无几。相信这一部分的内容，会越来越多。目前尚且只简单讨论了JVM的内存分区以及Java-GC。

- [Java内存区域](jvm/Java内存区域详解.md)
- [Java GC](jvm/java-gc.md)
