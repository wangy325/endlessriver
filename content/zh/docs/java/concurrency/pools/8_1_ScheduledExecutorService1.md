---
title: "ScheduledExecutorService(一)"
date: 2020-11-10
author: "wangy325"
weight: 17
categories: [java]
tags: [并发]
---

除了`ThreadPoolExecutor`之外，Java执行器（Executor）框架还提供了可以在指定延迟之后执行一次或周期执行任务的接口`ScheduledExecutorService`，较[java.util.Timer](https://docs.oracle.com/javase/8/docs/api/java/util/Timer.html)而言，它是更好的选择。


与[线程池](./7_2_ThreadPoolExecutor1.md/#threadpoolexecutor)不同的是，用于计划执行的`ScheduledThreadPoolExecutor`使用`ScheduledFutureTask`作为任务，使用`DelayedWorkQueue`作为任务队列，以实现计划（周期）执行的目的。

<!--more-->

![xx](/img/juc/scheduledFutureTask.png)
<p style="text-align:center; font-size:.8rem; font-style:italic;color:grey">ScheduledThreadPoolExecutor继承关系图</p>

从`ScheduledThreadPoolExecutor`的继承关系图可以看到，其是`ThreadPoolExecutor`的导出类，其提交任务和执行任务以及关闭线程池的逻辑应和线程池相差无几，其重点差别在于**任务对象以及任务队列**的封装上，后文将会详述`ScheduledThreadPoolExecutor`的任务计划执行以及周期执行机制。



##  ScheduledExecutorService

继承自`ExecutorService`接口，其方法定义了一个可以用于在指定延迟之后执行一次或周期执行的ExecutorService，它主要定义了如下4个方法：


    // 继承自ExecutorService 和Executor的方法被省略

    <V> ScheduledFuture<V> schedule(Callable<V> callable, long delay, TimeUnit unit)
        /* 在给定的延迟之后执行Callable任务，立即返回ScheduledFuture<V>，
        其可以获取任务的结果或者取消任务*/

    ScheduledFuture<?> schedule(Runnable command, long delay, TimeUnit unit)
         /* 在给定的延迟之后执行Runnable任务，
         立即返回ScheduledFuture<?>，其get()方法返回null*/

    ScheduledFuture<?> scheduleAtFixedRate(Runnable command, long initialDelay,
                                            long period, TimeUnit unit)
        /* 在给定的初始延迟initialDelay之后执行Runnable任务，
        接着在给定的时间间隔period之后再次执行任务，
        接着再间隔period之后再次执行任务...

        如果某次任务的执行耗时 > period，下次的计划执行将被延后，
        并不会同时执行多个任务

        如果某次执行抛出异常，那么接下来的执行将被中止。
        周期执行的任务只有线程池终止之后才会停止执行，也
        就是说周期任务永远不会主动完成

        返回值ScheduledFuture<?>代表将要执行的任务，
        取消任务时，其get()方法会抛出异常*/

    ScheduledFuture<?> scheduleWithFixedDelay(Runnable command, long initialDelay,
                                                long delay, TimeUnit unit)
        /* 在给定的初始延迟之后执行Runnable任务，
        接着在任务完成之后延迟delay之后再次执行，接着在上一个
        任务完成之后延迟delay再次执行...

        如果某次执行抛出异常，那么接下来的执行将被中止。
        周期执行的任务只有线程池终止之后才会停止执行，也
        就是说周期任务永远不会主动完成

        返回值ScheduledFuture<?>代表将要执行的任务，
        取消任务时，其get()方法会抛出异常*/


## ScheduledThreadPoolExecutor

由于其是`ThreadPoolExecutor`的导出类，故其主要逻辑和其父类一致，本节的讨论着重于二者差异的部分。

###  构造器

`ScheduledThreadPoolExecutor`的构造器就不再赘述了，基本上是父类的构造参数中抽取了几个便于理解的构造器，将其分列如下：

```java
public ScheduledThreadPoolExecutor(int corePoolSize) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue());
}
public ScheduledThreadPoolExecutor(int corePoolSize,
                               ThreadFactory threadFactory) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), threadFactory);
}
public ScheduledThreadPoolExecutor(int corePoolSize,
                                   RejectedExecutionHandler handler) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), handler);
}
public ScheduledThreadPoolExecutor(int corePoolSize,
                                   ThreadFactory threadFactory,
                                   RejectedExecutionHandler handler) {
    super(corePoolSize, Integer.MAX_VALUE, 0, NANOSECONDS,
          new DelayedWorkQueue(), threadFactory, handler);
}
```

`ScheduledThreadPoolExecutor`的实例均使用Integer.MAX_VALUE作为最大线程池数，这是否意味着其可以使用无限制的线程去运行任务呢？答案是否定的，`ScheduledThreadPoolExecutor`保证了其池中的线程数不会超过`corePoolSize`[^1]。

###  域

除了构造器中指定的参数之外，`ScheduledThreadPoolExecutor`还有一些其他参数，这些参数都可以在`ScheduledThreadPoolExecutor`初始化完成之后再进行动态配置。

```java
/** 线程池shutdown之后是否继续执行周期任务，true执行，默认为false*/
private volatile boolean continueExistingPeriodicTasksAfterShutdown;

/** 线程池shutdown之后是否继续执行计划任务，true执行，默认为true*/
private volatile boolean executeExistingDelayedTasksAfterShutdown = true;

/** 取消任务时是否将任务从队列中移除，true移除，默认false*/
private volatile boolean removeOnCancel = false;

/** 任务添加的顺序，初始化ScheduledFutureTask时使用*/
private static final AtomicLong sequencer = new AtomicLong();
```

###  方法

`ScheduledThreadPoolExecutor`使用最多的还是实现自`ScheduledExecutorService`接口的4个方法，用于计划（周期）执行任务，其中，作为线程池的execute和submit方法全部直接调用了scheduleXX方法。值得一提的是，`ScheduledThreadPoolExecutor`覆盖了`ThreadPoolExecutor`的`onShutdown()`方法，用于关闭线程池时的额外操作，该方法在父类中是空方法。

### 由Executors构建

一般地，我们会使用`Executors`来获取线程池，`Executors`提供了2个基本方法(不包括重载方法)来获取计划执行任务的线程池。

```java
/** 构造一个不可动态配置的ScheduledThreadPoolExecutor，其核心线程池数量为1*/
public static ScheduledExecutorService newSingleThreadScheduledExecutor() {
    return new DelegatedScheduledExecutorService
        (new ScheduledThreadPoolExecutor(1));
}

/** 构造一个核心线程池为1的ScheduledThreadPoolExecutor*/
public static ScheduledExecutorService newScheduledThreadPool(int corePoolSize) {
    return new ScheduledThreadPoolExecutor(corePoolSize);
}
```

我们可以自定义线程工厂(ThreadFactory)来调用其重载方法以自定义线程信息。


接下来，介绍让ScheduledExecutorService按照计划执行任务的核心，`ScheduledFutureTask`和 `DelayedWorkQueue`。

##  ScheduledFutureTask

```java
private class ScheduledFutureTask<V>
            extends FutureTask<V> implements RunnableScheduledFuture<V>
            {...}
```

提交给`ScheduledExecutorService`的任务都被包装成`ScheduledFutureTask`实例，相较FutureTask，其还实现了`RunnableScheduledFuture`接口，这个接口是RunnableFuture，ScheduledFuture的子接口，也就是Runnable，Future和Delay的实现类。

实现Delay接口是关键，它保证计划任务能够按时（周期）执行，并且任务能够按照执行顺序或者添加顺序被取出执行。

###  域

```java
// 每一个实例都有一个“序号”，用来维持其在队列中的位置
private final long sequenceNumber;

// 任务下一次执行的时间，纳秒表示
private long time;

// 任务周期执行的“周期”，纳秒表示，正数表示固定频率执行；
// 负数表示固定延迟执行，0表示不是周期执行的任务
private final long period;

// 用来重新插入队列中的任务 （周期执行的任务）
RunnableScheduledFuture<V> outerTask = this;

// 任务在队列中的索引（看出来是一个树）
int heapIndex;
```

###  构造器

```java
// 构造一个单次执行的任务
ScheduledFutureTask(Runnable r, V result, long ns) {
    super(r, result);
    this.time = ns;
    this.period = 0;
    this.sequenceNumber = sequencer.getAndIncrement();
}
// 构造单次执行的任务
ScheduledFutureTask(Callable<V> callable, long ns) {
    super(callable);
    this.time = ns;
    this.period = 0;
    this.sequenceNumber = sequencer.getAndIncrement();
}
// 构造周期执行的任务
ScheduledFutureTask(Runnable r, V result, long ns, long period) {
    super(r, result);
    this.time = ns;
    this.period = period;
    this.sequenceNumber = sequencer.getAndIncrement();
}
```

前2个构造器构造单次执行的任务，不过使用的任务不同罢了；第三个构造器构造周期执行的任务。每构造一个任务，任务的`sequenceNumber`便自增1。


### 方法


#### compareTo

由于Delay接口实现了Comparable接口，因此实现此方法对任务进行排序，其排序规则是：

- 先比较`time`，先执行的任务在前
- 若`time`相等，再比较`sequenceNumber`，先添加的任务在

####  setNextRunTime

设置周期任务下一次执行的时间

```java
private void setNextRunTime() {
   long p = period;
   if (p > 0)
       //  固定周期执行，上一次执行时间+period即可
       time += p;
   else
       // 固定delay执行
       time = triggerTime(-p);
}
```

#### run

执行任务的核心方法

```java
public void run() {
    // 检查是否周期任务
    boolean periodic = isPeriodic();
    if (!canRunInCurrentRunState(periodic))
        // 当前状态不允许运行任务
        cancel(false);
    else if (!periodic)
        // 执行单次任务
        ScheduledFutureTask.super.run();
    // 执行周期任务使用了runAndReset方法
    else if (ScheduledFutureTask.super.runAndReset()) {
        // 周期任务执行完毕一次
        // 设置下次执行的时间
        setNextRunTime();
        // 将任务添加到队列
        reExecutePeriodic(outerTask);
    }
}

// 将已经执行的任务再次放入任务队列中
void reExecutePeriodic(RunnableScheduledFuture<?> task) {
    if (canRunInCurrentRunState(true)) {
        // 再次入队
        super.getQueue().add(task);
        // double check
        if (!canRunInCurrentRunState(true) && remove(task))
            // 取消任务
            task.cancel(false);
        else
            // 创建（如果需要）worker，保证有线程执行任务
            ensurePrestart();
    }
}
```

##  DelayedWorkQueue

`ScheduledThreadPoolExecutor`使用`DeleyedWorkQueue`作为任务队列，它是一个特殊的***delay queue***，其维护一个有序的`ScheduledFutureTask`任务队列。在本节中，限于数据结构相关知识尚缺，将跳过叙述队列中的元素如何调整其在树中的位置，着重叙述任务入队及出队的逻辑。

```java
static class DelayedWorkQueue extends AbstractQueue<Runnable>
        implements BlockingQueue<Runnable> {
        }
```

该类中，有一个核心概念，它用一个私有域表示：

```java
// 这个域用来等待队列的队首元素出现
private Thread leader = null;
```

在*delay queue* 中，如果没有元素的delay超时，那么你将无法从队列中取出元素。当某个任务A的delay最先超时时，其将优先出队并执行，那么`leader`将被声明为执行任务A的线程TA，在该任务A超时之前，leader不会被重置，在这一段时间内，其他线程只能等待；若任务A超时出队，leader将被重置，此时线程TA将唤醒等待的其他线程，然后重复重置leader的过程。我们将在任务入队和出队时看到`leader`域的作用。



##  取消任务

默认情况下，如果取消一个任务的执行，该任务不会从队列中移除，不过我们可以动态地配置`removeOnCancel`域，在取消任务时同时将任务从队列中移除。被取消的任务不能继续执行,在线程池关闭的时候将从队列中移除。

```java
void cancelSchedule() {
    // default false
    service.setRemoveOnCancelPolicy(false);
    // task to cancelled
    service.schedule(this::s, 10, TimeUnit.SECONDS);
    BlockingQueue<Runnable> queue = service.getQueue();
    Runnable task = queue.peek();
    if (task instanceof RunnableScheduledFuture) {
        ((FutureTask<?>) task).cancel(false);
    }

    service.schedule(this::s, 1, TimeUnit.SECONDS);
    TimeUnit.SECONDS.sleep(2);
    // should be 1
    System.out.println("queue size: " + queue.size());

    service.shutdown();
    // removed by onShutdown hook method
    System.out.println("queue size: " + queue.size());
}

public static void main(String[] args) {
    TestScheduledPoolExecutor ts = new TestScheduledPoolExecutor(0);
    ts.cancelSchedule();
}
/* output
Thread[pool-1-thread-1,5,main] 1
queue size: 1
queue size: 0
*///:~
```

上例中，可以看到提交了2个任务，只有一个任务执行。首先提交的任务随即被取消了，第一次获取队列大小时，执行完一个任务，但是队列不为空，被取消的任务还在队列中，在线程池shutdown之后，任务随即被移除。如果使用`service.setRemoveOnCancelPolicy(true)`替换示例中的设置，那么两次获取的队列大小都是0。

这样的设计有一个好处，如果刻意取消一个任务，**特定条件下可以避免重复的销毁和创建工作线程**。在前面的讨论中，我们知道，核心线程空闲时是不会被销毁的，它会在任务队列上阻塞；但是非核心线程就不同了，如果队列为空，非核心线程会在[CP1](./8_2_ScheduledExecutorService2.md/#cp1)处结束运行，但是如果取消一个任务，并且任务没有从队列中移除的话，那么这个非核心线程就不会被销毁。

##  关闭线程池

除了继承`ThreadPoolExecutor`的[线程池关闭](./7_3_ThreadPoolExecutor2.md/#如何合理地关闭线程池)的逻辑之外，`ScheduledThreadPoolExecutor`关闭线程池和其基类还有些许差异，主要是其通过实现`onShutdown`方法，实现了新的关闭策略。

###  onShutDown方法

调用`shutdown`和`shutdownNow`方法的基本逻辑和基类一致，不过`shutdown`过程中的`onShutdown`方法引入了新的关闭策略

关闭策略由2个布尔值域控制，分别是

- executeExistingDelayedTasksAfterShutdown = true; shutdown之后默认执行计划（单次）任务
- continueExistingPeriodicTasksAfterShutdown;shutdown之后默认不执行周期任务

这两个域可以在线程池初始化之后进行动态配置，默认情况下，调用`shutdown`方法之后，

- 计划的（one-shot）任务将继续执行；
- 如果是周期任务，将从任务队列中移除；
- 已经取消的任务将会从队列中移除

调用`shutdownNow`方法的逻辑则完全和基类一致，其会中断所有任务，返回丢弃的任务列表

以下是`onShutdown`方法的具体实现：

```java
@Override void onShutdown() {
        BlockingQueue<Runnable> q = super.getQueue();
        boolean keepDelayed =
            getExecuteExistingDelayedTasksAfterShutdownPolicy();
        boolean keepPeriodic =
            getContinueExistingPeriodicTasksAfterShutdownPolicy();
        // 如果shutdown之后既不执行计划任务也不执行周期任务
        if (!keepDelayed && !keepPeriodic) {
            // 那么取消所有任务的执行，并清空队列
            for (Object e : q.toArray())
                if (e instanceof RunnableScheduledFuture<?>)
                    ((RunnableScheduledFuture<?>) e).cancel(false);
            q.clear();
        }
        else {
            // Traverse snapshot to avoid iterator exceptions
            for (Object e : q.toArray()) {
                if (e instanceof RunnableScheduledFuture) {
                    RunnableScheduledFuture<?> t =
                        (RunnableScheduledFuture<?>)e;
                    // 不管是在shutdown之后执行计划任务或者周期任务，都移除已经取消的任务
                    // 但是不移除计划执行的任务
                    if ((t.isPeriodic() ? !keepPeriodic : !keepDelayed) ||
                        t.isCancelled()) { // also remove if already cancelled
                        if (q.remove(t))
                            t.cancel(false);
                    }
                }
            }
        }
        tryTerminate();
    }
```

下面的示例中，我们重新设置了线程池的关闭策略，以观察线程池在关闭时候的行为

```java
@SneakyThrows
void shutdownPolicy() {
   // 如果任务在shutdown()之后仍在delay，那么将值设置为false可以取消任务的执行
   // 其默认值为true
   service.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);
   service.schedule(this::s, 1, TimeUnit.MILLISECONDS);

   // 如果是周期执行的任务，将此值设置为true可以在调用shutdown()之后让其继续执行，否则结束执行
   // 其默认值为false
   service.setContinueExistingPeriodicTasksAfterShutdownPolicy(true);
   service.scheduleWithFixedDelay(this::s, 2, 1, TimeUnit.SECONDS);

   service.shutdown();
   TimeUnit.SECONDS.sleep(10);
   // shutdownNow interrupt all tasks
   service.shutdownNow();
   // could be true or false
   System.out.println(service.isTerminated());
}
```

在`shutDown`之后，周期任务仍会一直执行，所以要使用`shutDownNow`来中止任务的执行

[^1]: 特殊地，当`corePoolSize = 0`时，池中仅可允许一个线程执行任务
