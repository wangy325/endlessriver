---
#bookFlatSection: true
bookCollapseSection: true
weight: 3
title: "并发编程"
bookComments: false
---

本部分主要讨论了Java并发相关的内容。主要分为几大部分：

1. 线程与任务的概念

    [第一部分](./1线程与任务_1.md)主要讨论线程相关的
      - 创建
      - 生命周期
      - 优先级
      - 守护线程
      - 中断状态

    等相关问题，其中以*线程的中断状态*这一概念最为重要难懂。

    [第二部分](./1线程与任务_2.md)主要讨论了线程`Thread`类提供的相关方法，以及创建线程的惯用法，包括

      - 线程让步（yield）
      - 线程休眠（sleep）
      - 加入线程（join）
      - 自管理线程- 创建线程的惯用法
      - 捕获线程的异常

    其中，`join()`方法和`sleep()`方法，比较常用。

2. 资源访问受限
  
    并发代码比较“危险”的根本原因，就在于不同的线程，操作了同一份数据。这份数据就是“共享资源”。因此，要想并发程序健壮，这份资源的访问必须受到限制，进程们可不能像无事发生一样，任意地去访问它们。

    这就是这部分讨论的主题。

    这部分由一个经典的[转帐问题](./2资源访问受限_1.md)切入。引入了Java并发中的一系列同步机制和概念：

    - [锁和条件](./2资源访问受限_2_锁和条件.md)
    - [synchronized关键字](./2资源访问受限_3_synchronized.md)
    - [原子性和可见性](./2资源访问受限_4_原子性与原子类.md)
    - [线程本地存储](./2资源访问受限_5_线程本地存储.md)

3. [获取任务的返回值](./3获取任务的返回值.md)

    讨论了另一种创建线程的方式。以及从执行任务的线程中获取任务执行的结果，便于后续计算。

    JUC使用`Callable`和`Future`接口完成这些工作。

    另外，还讨论了`Runnable`和`Callable`的结合体——`FutureTask`。

4. [死锁](./4死锁.md)

    简单地讨论了死锁出现的可能原因以及避免死锁的方式。

5. [终结任务](./5终结任务.md)

    主要讨论了多线程协同的情况下，如何合适地终止任务。

6. [生产-消费模式及阻塞队列](./6生产者-消费者与阻塞队列.md)

    讨论了生产-消费模型，以及使用阻塞队列实现安全生产-消费的原理。

    简单介绍了3种阻塞队列：

      - ArrayBlockQueue
      - LinkedBlockingQueue
      - SynchronousQueue

    的工作原理以及存取元素的阻塞机制。

7. [执行器和线程池](./7_1_Executors_and_ExecutorService.md)

    这部分介绍Java的线程池“框架”。主要介绍了`ThreadPoolExecutor`的[核心概念](./7_2_ThreadPoolExecutor1.md)，以及线程在线程池中的[执行流程](./7_3_ThreadPoolExecutor2.md)。

    顺便讨论了如何优雅地关闭线程池。

    最后，介绍了一个新的接口`CompletionService`，它利用一个阻塞队列来管理多个任务的返回值。

8. 计划执行任务

    这部分是Java线程池的延伸，主要讨论了如何让任务有计划地执行。主要使用了`ScheduledExecutorService`，和第8部分一样，分别讨论了[核心概念](./8_1_ScheduledExecutorService1.md)和[执行流程](./8_2_ScheduledExecutorService2.md)。

    最后，讨论了关闭线程池的方法。

9. 重要的并发组件

    Java 1.5以后的并发类库新加入了一些用于解决并发问题的新构件，合理地使用这些构件能够帮助我们写出更加简单且健壮的并发程序。本节内容介绍`java.util.concurrent`包中一些具有代表性的构件，包括

    - [CountDownLatch](./9_1_countdownlatch.md)
    - [CyclicBarrier](./9_2_cyclicbarrier.md)
    - [Semaphore](./9_3_semaphore.md)
    - [Exchanger](./9_4_exchanger.md)
    - [PriorityBlockingQueue 和 DelayQueue](./9_5_priorityblockqueue_delayqueue.md)


TODO:

- [ ] AQS
- [ ] Fork/Join

