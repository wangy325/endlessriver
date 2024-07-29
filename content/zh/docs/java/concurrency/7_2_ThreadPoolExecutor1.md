---
title: "ThreadPoolExecutor-1"
date: 2020-11-03
author: "wangy325"
weight: 14
categories: [java]
tags: [concurrency]
---


[前文](./7_1_Executors_and_ExecutorService.md)就已经提过，`Executors`执行器创建的线程池包括不同实现，可以应对不同的场景，那么Java中包含哪些实现呢？

本问就来讨论这些实现。

<!--more-->




## ThreadPoolExecutor

该类是执行器(线程池)的核心类，一般来讲，Java的线程池，指的就是`ThreadPoolExecutor`实例。

### 构造器

`ThreadPoolExecutor`提供了4个构造器用来构造线程池实例：

```java

public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue) {
   ...
}

public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue,
                          ThreadFactory threadFactory) {
    ...
}

public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue,
                          RejectedExecutionHandler handler) {
    ...
}

public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue,
                          ThreadFactory threadFactory,
                          RejectedExecutionHandler handler) {
    ...
}
```

从构造器来看呢，要构建一个线程池实例，至少需要提供5个参数，另外2个参数不提供则可以使用默认配置[^3]，这些参数分别是：

[^3]: 须调用合适的构造器，实际上所有参数必须提供，不过有些由构造器默认提供。

|参数|描述|
| :-- | :-- |
|*corePoolSize*| 核心线程池大小|
|*maximumPoolSize*| 最大线程池大小|
|*keepAliveTime* |非核心线程执行完任务后最长的空间等待时间，超时则销毁线程|
|*unit*|keepAliveTime的单位|
|*workQueue*|用于保存待执行任务的队列|
|*threadFactory*|用于创建线程的线程工厂|
|*handler*|线程池满载（队列无空间，且不能新建线程）后，处理新提交任务的拒绝策略|

这些构造器参数就是线程池的核心概念，理解这几个参数在线程池运行过程中的意义便理解了线程池的大半。


###  核心概念

#### 核心线程池与最大线程池

线程池的`getPoolSize()`方法返回的线程数不应该超过线程池的核心线程池大小（corePoolSize）**或** 最大线程池大小（maximumPoolSize）。线程池中的工作线程数不可能超过最大线程池大小。若想获得当前的正在执行任务的线程数，需使用`getActiveCount()`方法。


当一个任务被提交至线程池后，若：

- 当前工作线程数 < `corePoolSize`，新建一个线程来完成任务——尽管可能有空闲核心线程。
    (当工作线程数 < `corePoolSize`时，任务队列一定是空的)
- `corePoolSize` < 当前工作线程数 < maximumPoolSize，并且任务队列已满，那么新建一个**非核心线**程来完成任务。

当设置`corePoolSize`=`maximumPoolSize`时，你将获得一个固定容量的线程池；当将`maxPoolSize`设置为`Integer.MAX_VALUE`时，线程数没有限制，这有可能造成**内存泄漏**。

{{< hint info >}}
 本文约定当前工作线程指代线程池中存在的线程（`getPoolSize()`方法的返回值），其中可能存在部分空闲线程。当工作线程数少于核心线程数时：

1）当前线程池中的线程全是核心线程；

2）任务队列一定是空的；

3）当前某个线程可能是空闲的（执行完任务，在等待队列中的任务（runWorker方法阻塞））。
{{< /hint >}}

尽管在构建线程池实例时要指定`corePoolSize`和`maximumPoolSize`，在获得实例之后还可以通过`setCorePoolSize(int)`和`setMaximumPoolSize(int)`来对其进行修改。

>类似地，存活时间，线程工厂，拒绝策略其他参数都可以在线程池初始化之后再进行设置。

默认情况下，当线程池初始化成功之后，池中是**没有任何线程的**。不过，可以调用`prestartCoreThread()`和`prestartAllCoreThreads()`来向线程池中添加一个或所有核心线程。如果你使用一个非空的任务队列初始化线程池，这样做是有用的。

```Java
@SneakyThrows
void initPoolWithNonEmptyQueue() {
    BlockingQueue<Runnable> queue = new ArrayBlockingQueue<Runnable>(2) {{
        add(() -> {
            System.out.println("1st task done");
        });
        add(()->{
            System.out.println("2nd task done");
        });
    }};

    ThreadPoolExecutor.AbortPolicy abortPolicy = 
        new ThreadPoolExecutor.AbortPolicy();
    ThreadPoolExecutor poolExecutor = 
        new ThreadPoolExecutor(1, 1, 0, 
                    TimeUnit.MILLISECONDS, queue, abortPolicy);

    poolExecutor.prestartCoreThread();
    poolExecutor.shutdown();

}
/* output
1st task done
2nd task done
*///:~
```

使用`prestartCoreThread()`还有一个好处，它可以保证队列中的任务顺序执行。

#### 线程工厂

线程池中的线程使用线程工厂`ThreadFactory`创建，如果没有指定，将使用`Executors.defaultThreadFactory`。如果线程工厂在创建线程时失败而返回null，那么线程池将无法执行任何任务。

#### 存活时间

`keepAliveTime`针对的是**非核心线程**，非核心线程处理完任务后，若在`keepAliveTime`内没有新任务添加到队列并被其获取并运行，其将被销毁。这是一种资源保护策略，如果线程池的任务突然增多，可能又会创建非核心线程来完成任务。当`corePoolSize = maximumPoolSize`时，线程池无法创建非核心线程，此时keepAliveTime参数可能没有意义，一般将其设置为0。

但凡事并非绝对，`ThreadPoolExecutor`维护一个布尔型变量`allowCoreThreadTimeOut`，其默认值是false，用来控制核心线程池的“生命”：

```java
/**
 * If false (default), core threads stay alive even when idle.
 * If true, core threads use keepAliveTime to time out waiting
 * for work.
 */
private volatile boolean allowCoreThreadTimeOut;
```

这个变量的值由`allowCoreThreadTimeOut(boolean value)`方法修改

```java
public void allowCoreThreadTimeOut(boolean value) {
    if (value && keepAliveTime <= 0)
        throw new IllegalArgumentException(
            "Core threads must have nonzero keep alive times");
    if (value != allowCoreThreadTimeOut) {
        allowCoreThreadTimeOut = value;
        if (value)
            interruptIdleWorkers();
    }
}
```

可以看到，如果将变量`allowCoreThreadTimeOut`的值设置为`true`，那么空闲的核心线程池也将会在`keepAliveTime`超时之后被销毁(如果没有任务让其执行)。

#### 任务队列

任务队列是一个**阻塞队列**，一个线程池中只有一个任务队列。任务队列用于存放当前尚没有线程可执行之的任务，其和线程池之间存在如下的交互关系：

- 如果当前工作线程 < `corePoolSize`，线程池将创建新线程执行任务而非将任务放入队列
- 如果当前工作线程 > `corePoolSize`，线程池倾向于将任务放入队列而非创建新线程执行之
- 如果任务无法放入队列（满），并且当前工作线程 < maximumPoolSize，将创建新线程执行之，否则任务将**被拒绝**

任务队列有3种常见实现：

1. 直接运行(*direct handoffs*)，这种情形的任务队列一般由[SynchronousQueue](./6生产者-消费者与阻塞队列.md/#synchronousqueue)实现，这种队列的实现对线程池的要求严苛，如果没有可用的线程即刻执行任务，那么将任务放入队列将失败。在此情形下，一般将maximumPoolSize设置为Integer.MAX_
VALUE以防止线程池拒绝任务。这种实现可能会导致内存泄漏。

2. 无界任务队列， 一般由[LinkedBlockingQueue](./6生产者-消费者与阻塞队列.md/#linkedblockingqueue)实现，这种情形下，当当前工作线程达到`corePoolSize`之后，所有新提交的任务都会放入队列中，由于队列无界，就**不会**再创建新线程了，也不会拒绝任务。因此`maximumPoolSize`这一设置将无意义。如果任务源源不断地提交，有可能任务积压导致内存泄漏。

3. 有界队列，一般由[ArrayBlockingQueue](./6生产者-消费者与阻塞队列.md/#arrayblockingqueue)实现，使用有界队列可以避免资源耗尽，但是也增加了配置的难度，是应该配置更多的线程数更小的队列还是应该配置更大的队列更少的线程数，往往需要根据具体的任务来考量。

#### 拒绝策略

前面提到，如果线程池满，新提交的任务就会被线程池拒绝执行；同样的，如果线程池关闭了，提交任务也会被拒绝。线程池通过调用`RejectedExecutionHandler.rejectedExecution(Runnable, ThreadPoolExecutor)`来拒绝任务，`ThreadPoolExecutor`内建了4种不同的拒绝策略：

1. `ThreadPoolExecutor.AbortPolicy`，也是默认的拒绝策略，该策略直接抛出`RejectedExecutionException`的运行时异常

```Java
public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
    throw new RejectedExecutionException("Task " + r.toString() +
                                         " rejected from " +
                                         e.toString());
}
```

2. `ThreadPoolExecutor.CallerRunsPolicy`，如果线程池未关闭，该策略直接在执行`execute()`方法的线程上运行任务，否则该任务被丢弃

```java
public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
    if (!e.isShutdown()) {
        r.run();
    }
}
```

3. `ThreadPoolExecutor.DiscardPolicy`，该策略直接丢弃不能被执行的任务

```java
public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
}
```

4. `ThreadPoolExecutor.DiscardOldestPolicy`，如果线程池未关闭，则将队列头部的任务丢弃，然后继续执行`execute(Runnable)`方法

```java
public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
    if (!e.isShutdown()) {
        e.getQueue().poll();
        e.execute(r);
    }
}
```

### Executors构建的实例

`Executors`的三个方法(没有包含重载方法)返回该类的实例：

```java
public static ExecutorService newFixedThreadPool(int nThreads) {
        return new ThreadPoolExecutor(nThreads, nThreads,
                                      0L, TimeUnit.MILLISECONDS,
                                      new LinkedBlockingQueue<Runnable>());
}
/* 构建一个固定容量的线程池，该线程池的线程都是核心线程，任务队列使用无界队列；当线程数达到
corePoolSize时，新提交的任务都将放入队列，这个线程池不会拒绝任务*/


public static ExecutorService newCachedThreadPool() {
        return new ThreadPoolExecutor(0, Integer.MAX_VALUE,
                                      60L, TimeUnit.SECONDS,
                                      new SynchronousQueue<Runnable>());
}
/* 构建一个corePoolSize为0，maximumPoolSize无限制的线程池，线程池中的线程都是非核心线程，
当线程空闲超过60s后即被销毁，这个线程池的任务队列使用的是SynchronousQueue，因此一旦提交任务，
即会创建一个线程去执行之*/

public static ExecutorService newSingleThreadExecutor() {
        return new FinalizableDelegatedExecutorService
            (new ThreadPoolExecutor(1, 1,
                                    0L, TimeUnit.MILLISECONDS,
                                    new LinkedBlockingQueue<Runnable>()));
}
/* 构建一个corePoolSize = maximumPoolSize = 1的线程池，该线程池只有一个核心线程，任务
队列为无界队列，因此当核心线程已被创建后，所有提交的任务都放入队列，这个线程池不会拒绝任务。与
第一个静态方法不同的是，由于其使用FinalizableDelegatedExecutorService包装
ThreadPoolExecutor，这个线程池一旦初始化，不允许再进行动态配置*/
```

如上所示，前2个静态方法构造的都是特殊的`ThreadPoolExecutor实例`，初始化成功之后，都是可以通过`ThreadPoolExecutor`的实例方法进行动态配置的。

第3个静态方法有所不同，其生成了一个容量为1且不可改变的线程池，严格来说，它返回的不是`ThreadPoolExecutor`实例，而是由`ThreadPoolExecutor`包装的`FinalizableDelegatedExecutorService`实例。

{{< hint info >}}
`FinalizableDelegatedExecutorService`是Executors类（仅具有包访问权限）的内部类，`FinalizableDelegatedExecutorService`类继自`DelegatedExecutorService`，这是一个仅仅有`ExecutorService`接口方法的包装类，因此，当我们调用`newSingleThreadExecutor()`方法时，仅可以将其声明为`ExecutorService`。
{{< /hint  >}}

```Java
ExecutorService service = Executors.newSingleThreadExecutor();

// ！非法，不能强制类型转换
ThreadPoolExecutor pool = (ThreadPoolExecutor)Executors.newSingleThreadExecutor();
```

正因为其是一个仅仅可以执行`ExecutorService`接口方法的包装类，其无法在线程池初始化之后再动态配置。


扩展阅读: [ThreadPoolExecutor jdk1.8 Javadoc](/file/ThreadPoolExecutor_doc.pdf)

