---
title: "Executors与Executor框架"
date: 2020-11-03
author: "wangy325"
weight: 13
categories: [java]
tags: [concurrency]
---



`Executors`可以称作执行器。Java并发系列的文章到目前为止，虽然没有特别说明，但是使用执行器(Executor(s))的次数已经难以计数了，`Executors`提供了一些非常方便的静态方法，可以根据需要创建不同的`ExecutorService`，然后调用其`execute(Runnable)`或`submit(Callable<T>)`方法。

在并发条件下，执行器还有一个非常明显的优势，它使用**线程池**管理线程，减少了系统创建和销毁线程的开销。在一般的Java并发过程中，也建议使用执行器完成任务而非显式地创建线程。

本文将从执行器开始，阐述Java中的线程池。

<!--more-->

##  Executors类

`java.util.concurrent.Executors`类提供了许多静态方法来获取不同类型的 **线程池**，下表列出其常用方法[^1]：

[^1]: 表中没有提及关于构建`Fork/Join`线程池的方法，这部分内容将在后续补全<sup>坑</sup>。

|方法|概要|
| :-- | :--|
|`newFixedThreadPool`|创建固定大小的线程池，线程会一直保留|
|`newCachedThreadPool`|创建线程池，该线程池在必要时创建新线程，旧线程也会被重用，线程空闲60s被销毁|
|`newSingleThreadExecutor`|相当于newFixedThreadPool(1)，其能保证任务顺序执行|
|*`newScheduledThreadPool`*|创建计划执行一次或周期执行的线程池|
|*`newSingleThreadScheduledExecutor`*|创建计划执行一次或周期执行的单线程池|

<p style="text-align:center; font-size:.8rem; font-style:italic;color:grey">Executors用于构造线程池的部分方法</p>


上表中的前3个方法返回`ThreadPoolExecutor`实例，后面2个方法返回`ScheduledExecutorService`实例，不管是`ThreadPoolExecutor`或是`ScheduledExecutorService`，都是`ExecutorService`的实现，`ExecutorService`接口是设计用来处理任务的接口，其顶层接口是`java.util.concurrent.Executor`，该接口简单地定义了一个执行任务的方法：


```Java
public interface Executor {
    /**
     * Executes the given command at some time in the future.  The command
     * may execute in a new thread, in a pooled thread, or in the calling
     * thread, at the discretion of the {@code Executor} implementation.
     *
     * @param command the runnable task
     * @throws RejectedExecutionException if this task cannot be
     * accepted for execution
     * @throws NullPointerException if command is null
     */
    void execute(Runnable command);
}
```

因此对执行器的讨论最终要回到对`Executor`及其实现上来。

<!-- ![Executor框架组成](/img/executor.png) -->

<center style = "font-size:.8rem; font-style:italic;color:grey">

<img src="/img/juc/executor.png" alt="Executor框架组成"  position="center" />
<p>
Java Executor框架的主要构成
</center>

下图展示了Executor框架的执行逻辑[^2]

{{< mermaid >}}
flowchart LR
    A(["Main Thread"]) -->|Create| B(Rannable)
    A --> | Create| C("Callable<\V>")
    B --> | execute| D(ExecutorServiceth)
    B --> |submit| D
    C --> |submit| D
    D --> |return| G(Future<\V>)
    A --> |get| G
    A --> | cancel| H

	subgraph D["EcecutorServiceth"]
		E(ThreadPoolExecutor)
        
        F(ScheduledThreadPoolExecutor)
	end
    subgraph G[Future<\V>]
        H(FutureTask<\V>)
    end
{{< /mermaid >}}


[^2]: 引自《Java并发编程的艺术》方腾飞等著

从上面的框架组成图中，可以清晰的看到使用`Executors`能够构建所有线程池实例，`ExecutorService`接口定义了一系列和线程池以及任务相关的基本方法，用于检查关闭/关闭线程池，提交任务，执行任务等。

`AbstractExecutorService`直接实现了`ExecutorService`的`invokeAny/invokeAll`方法。此外，从该类的源码可以清晰地看到，所有的任务都是通过转化为`RunnableFuture`(FutureTask)而后通过`execute(Runnable)`方法执行的。

```java
protected <T> RunnableFuture<T> newTaskFor(Callable<T> callable) {
    return new FutureTask<T>(callable);
}

public <T> Future<T> submit(Callable<T> task) {
    if (task == null) throw new NullPointerException();
    RunnableFuture<T> ftask = newTaskFor(task);
    execute(ftask);
    return ftask;
}

protected <T> RunnableFuture<T> newTaskFor(Runnable runnable, T value) {
    return new FutureTask<T>(runnable, value);
}

public Future<?> submit(Runnable task) {
   if (task == null) throw new NullPointerException();
   RunnableFuture<Void> ftask = newTaskFor(task, null);
   execute(ftask);
   return ftask;
}

public <T> Future<T> submit(Runnable task, T result) {
    if (task == null) throw new NullPointerException();
    RunnableFuture<T> ftask = newTaskFor(task, result);
    execute(ftask);
    return ftask;
}
```

     ScheduledExecutorService 接口继承自 ExecutorService，
        定义了用于计划执行或周期执行的线程池方法。

     ThreadPoolExecutor 
        继承自 AbstractExecutorService，是线程池重要的实现之一。

     ScheduledThreadPoolExecutor 
        继承自 ScheduledExecutorService，是线程池重要的实现之二。

     ForkJoinPool 
        继承自 AbstractExecutorService，是线程池的重要实现之三，关于它的内容将单独展开。

     DelegatedExecutorService 
        继承自 AbstractExecutorService ，它是 Executors 的内部类，
        是一个仅仅实现了 ExecutorService 方法的包装类，
        其有两个子类分别是 DelegatedScheduledExecutorServide
        和  FinalizableDelegatedExecutorService。

     CompletionService 接口有一个子类 ExecutorCompletionService，
        该类由执行器实例化，用来管理执行器执行的任务的结果。

## ExecutorService接口

`ExecutorService`是次顶层接口，定义了线程池操作任务的基本方法。

    // 继承自Executor的方法
    void execute(Runnable command);

    void shutdown();
        /*有序地关闭线程池，已经提交（在运行或已经在队列中）的任务不会受到影响，将继续执行，
        但线程池不接受新任务的提交

        此法不会在当前线程上等待线程池后台任务的执行结果（或者任务执行后的作用），换言之，
        如果想要获取任务执行之后的结果，调用此法无法达到目的*/

    List<Runnable> shutdownNow();
        /*尝试去停止(stop)所有活动的任务，已提交且队列中的中的任务将取消执行，并返回取消的任务队列。
        向正在执行的任务发送中断命令，那些无法响应中断命令的任务将无法中止

        和shutdown()方法一样，此法不会等待正在执行的任务终止*/

    boolean isShutdown();
        // 如果线程池已经关闭，返回true

    boolean isTerminated();
        /*如果所有的任务都完成（中止运行或正常运行完成），则返回true

        注意，若没有先调用shutdown()或shutdownNow()，此方法不可能返回true*/

    boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException;
        /*线程池shutdown请求之后，阻塞当前线程，等待任务执行。当超时，任务执行完毕，或当前线程被中断
        任一情况发生时，终止阻塞*/

    <T> Future<T> submit(Callable<T> task);
        // 提交一个有返回结果的Callable任务

    <T> Future<T> submit(Runnable task, T result);
        // 提交一个Runnable并指定其返回result

    Future<?> submit(Runnable task);
        /*提交一个Runnable，返回的Future<?>的get方法将返回null，其主要目的是利用Future的其他
        方法控制任务的执行*/

    <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks)
            throws InterruptedException;
        /*执行集合中包含的任务，并返回一个Future<T>集合，Future<T>集合包含各个任务的执行状态及结果

        Future<T>集合中的的顺序和任务集合中的迭代顺序是一致的

        这个方法会等待所有的任务执行完成（正常执行或抛出异常），如果任务集合在执行过程中被修改，那么
        任务的结果将会变为undefined*/

    <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks,
                                    long timeout, TimeUnit unit)
            throws InterruptedException;
        /* 执行集合中包含的任务，在所有任务执行完成或超时之前返回一个Future<T>集合。在返回之前，
        未能执行的任务将被取消

        其他的特征和重载方法一致*/

    <T> T invokeAny(Collection<? extends Callable<T>> tasks)
            throws InterruptedException, ExecutionException;
        /* 执行给定的任务集合中的任务，返回任何一个成功执行的任务的结果，其他未完成的任务被取消

        如果任务集合在执行过程中被修改，那么任务的结果将会变为undefined*/

    <T> T invokeAny(Collection<? extends Callable<T>> tasks,
                        long timeout, TimeUnit unit)
            throws InterruptedException, ExecutionException, TimeoutException;
        /* 执行给定的任务集合中的任务，在超时之前返回任何一个成功执行的任务的结果，
        其他未完成的任务被取消

        如果任务集合在执行过程中被修改，那么任务的结果将会变为undefined*/


如上所示，ExecutorService定义了线程池的基本方法，其中`invokeAny`和`invokeAll`方法在`AbstractExecutorService`中实现。


