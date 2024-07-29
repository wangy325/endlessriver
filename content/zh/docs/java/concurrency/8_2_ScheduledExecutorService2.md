---
title: "ScheduledExecutorService-2"
date: 2020-11-10
author: "wangy325"
weight: 18
categories: [java]
tags: [concurrency]
---


## 引例

[前文](./8_1_ScheduledExecutorService1.md/#scheduledfuturetask)介绍了`ScheduledFutureTask`和`DeleyedWorkQueue`这么多，都是为了更好地理解任务执行的流程，在这之前，我们不妨先看如下示例：

<!--more-->

```java
public class TestScheduledPoolExecutor {

    private AtomicInteger sequence = new AtomicInteger(0);

    private ScheduledThreadPoolExecutor service;

    public TestScheduledPoolExecutor(int poolSize) {
        this.service = new ScheduledThreadPoolExecutor(poolSize);
    }

    private void s() {
        System.out.println(Thread.currentThread() + " " + sequence.getAndIncrement());
    }

    private void c() {
        System.out.println(Thread.currentThread() + " c running");
        while (true) {
            // never finish loop unless interrupted
            if (Thread.interrupted()) {
                break;
            }
        }
        System.out.println(Thread.currentThread() + "c interrupted");
    }

    @SneakyThrows
    void basicTest() {
        service.schedule(this::s, 2, TimeUnit.SECONDS);
        service.schedule(this::c, 1, TimeUnit.SECONDS);
        // shutdown无法终止线程池
        service.shutdown();
        TimeUnit.SECONDS.sleep(5);
        System.exit(0);
    }

    public static void main(String[] args) {
        TestScheduledPoolExecutor ts = new TestScheduledPoolExecutor(0);
        ts.basicTest();
    }
}
```

在上例中，我们创建了2个任务s和c，前者简单地获取并递增sequence，后者则是一个响应中断的死循环。当我们使用不同数量的`corePoolSize`去运行任务时，得到的结果不一样:

    当corePoolSize = 0时，输出为
        Thread[pool-1-thread-1,5,main] c running

    当corePoolSize = 1时，输出为
        Thread[pool-1-thread-1,5,main] c running

    当corePoolSize > 1时，输出为
        Thread[pool-1-thread-1,5,main] c running
        Thread[pool-1-thread-2,5,main] 1


这种差异驱使我们去探索计划任务的提交与执行方式。

## 提交任务

```java
// 提交单次执行的任务
public ScheduledFuture<?> schedule(Runnable command,
                                  long delay,
                                  TimeUnit unit) {
   if (command == null || unit == null)
       throw new NullPointerException();
   // t = new ScheduledFutureTask(..)
   RunnableScheduledFuture<?> t = decorateTask(command,
       new ScheduledFutureTask<Void>(command, null,
                                     triggerTime(delay, unit)));
   // 执行任务的核心方法
   delayedExecute(t);
   return t;
}

// 提交周期执行的任务
public ScheduledFuture<?> scheduleWithFixedDelay(Runnable command,
                                                 long initialDelay,
                                                 long delay,
                                                 TimeUnit unit) {
    if (command == null || unit == null)
        throw new NullPointerException();
    if (delay <= 0)
        throw new IllegalArgumentException();
    ScheduledFutureTask<Void> sft =
        new ScheduledFutureTask<Void>(command,
                                      null,
                                      triggerTime(initialDelay, unit),
                                      unit.toNanos(-delay));
    // t = sft
    RunnableScheduledFuture<Void> t = decorateTask(command, sft);
    // 任务执行后将再次入队
    sft.outerTask = t;
    delayedExecute(t);
    return t;
}

private void delayedExecute(RunnableScheduledFuture<?> task) {
   if (isShutdown())
        // ctl > running，不接受任务提交
       reject(task);
   else {
       // 非空任务入队
       super.getQueue().add(task);
       // double check
       if (isShutdown() &&
           !canRunInCurrentRunState(task.isPeriodic()) &&
           remove(task))
           // 如果任务入队之后，线程池关闭
           // 且关闭策略不允许关闭之后继续执行
           // 且任务从队列中移除
           // 则取消任务
           task.cancel(false);
       else
           // add worker
           ensurePrestart();
   }
}

// 此方法保证了即使corePoolSize = 0的情况下也创建worker
void ensurePrestart() {
    // 获取当前工作线程数
    int wc = workerCountOf(ctl.get());
    if (wc < corePoolSize)
        // 尚可以新建核心线程
        addWorker(null, true);
    else if (wc == 0)
        // 新建非核心线程
        addWorker(null, false);
}
```

<center>

![xx](/img/juc/scheduledThreadPool_submit_flow.png)

<p style="text-align:center; font-size:.8rem; font-style:italic">ScheduledThreadPoolExecutor任务提交流程图</p>
</center>

我们可以从`ScheduledThreadPoolExecutor`的任务提交过程中总结几点规律：

1. 任务一定是先放入任务队列中的
2. 活动线程不可能超过核心线程池大小
3. 若`corePoolSize` > 0，则池中不可能存在非核心线程
4. 非核心线程只有在`corePoolSize` = 0且当前工作线程数为0时才可以创建，~~并且活动的非核心线程**只能存在一个**~~

上述规律的第4点容易得出线程池中**非核心线程数至多为1**的结论，这似乎是很合理的，因为想要创建非核心线程，wc必须为0。结合线程池的相关知识，我们知道非核心线程超时是会被销毁的，我们可以看看非核心线程在执行计划任务时的行为

```java
@SneakyThrows
void howManyThreads() {
    for (; ; ) {
        ScheduledFuture<?> schedule = 
            service.schedule(this::s, 0, TimeUnit.MILLISECONDS);
        // TimeUnit.MILLISECONDS.sleep(5); // uncomment this to create new worker
        for (; ; ) {
            if (schedule.isDone())
                break;
        }
        if (sequence.get() >= 10) {
            schedule.cancel(false);
            break;
        }
    }
    System.out.println("largest pool size: " + service.getLargestPoolSize());
    service.shutdown();
}
/* output(sample)
Thread[pool-1-thread-1,5,main] 1
Thread[pool-1-thread-1,5,main] 2
Thread[pool-1-thread-1,5,main] 3
Thread[pool-1-thread-2,5,main] 4
Thread[pool-1-thread-3,5,main] 5
Thread[pool-1-thread-4,5,main] 6
Thread[pool-1-thread-5,5,main] 7
Thread[pool-1-thread-7,5,main] 8
Thread[pool-1-thread-8,5,main] 9
Thread[pool-1-thread-10,5,main] 10
largest pool size: 2
*///:~
```

在上例中，我们保证当前提交的任务在执行完成之后再进行下一次提交，那么下一次的任务应该新建线程执行才对。但实际的情况并非如此，执行上个任务的线程仍然有机会继续执行接下来提交的任务，这是由于任务的执行以及线程的销毁都是耗时操作，可能在线程销毁（执行CP1）之前新的任务已经添加到队列中了。

除此之外，在所有任务执行完成之后，我们获取了线程池中同时执行任务的最大线程数，按照逻辑，这个值应该始终是1，实际的运行过程中却是一个不确定的数。这让人费解，新线程的创建前提是`workerCount==0`，即表明了池中是没有正在运行的线程，不过，可以猜测池中出现2个线程的过程大概出现在线程1即将销毁，执行[processWorkerExit](./7_3_ThreadPoolExecutor2.md/#执行任务)方法之前，将要销毁的worker还未从set中移除，而此时addworker读取到的size > 1，于是出现了largestPoolSie>1的情形。

如果取消上例中的休眠注释，就能规避上述的各种不确定情况，足够时长的休眠可以保证执行任务的线程执行任务并销毁。

## 任务入队

由于任务提交之后一定是先放入任务队列的，而基于`DelayedWorkQueue`的任务队列和普通的阻塞队列有些区别。任务队列通过调用`offer(Runnable x)`方法将任务放入队列中，只有在获取锁的情况下才能调用

```java
public boolean offer(Runnable x) {
    if (x == null)
        throw new NullPointerException();
    RunnableScheduledFuture<?> e = (RunnableScheduledFuture<?>)x;
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        int i = size;
        if (i >= queue.length)
            // 队列扩容 （grow 50%）
            grow();
        size = i + 1;
        if (i == 0) {
            queue[0] = e;
            setIndex(e, 0);
        } else {
            siftUp(i, e);
        }
        // 入队之前，若队列为空，且没有线程在超时等待
        if (queue[0] == e) {
            leader = null;
            // 唤醒等待的线程去获取任务执行（并非一定有线程等待）
            available.signal();
        }
    } finally {
        lock.unlock();
    }
    return true;
}
```

由于使用无界队列实现，`DelayedWorkQueue`任务入队的阻塞不会阻塞；但如果入队时队列为空，那么意味着：

1. 首个任务入队；
2. 所有任务都已经出队；

成功入队之后，将会唤醒一个阻塞的线程(可能没有阻塞的线程)去获取任务执行。

## 执行任务

与`ThreadPoolExecutor`不同的是，`ScheduledThreadPoolExecutor`所有任务都是先添加到任务队列中的，并且任务队列是*delay queue*，从*delay queue*中取出任务比简单的阻塞队列稍显复杂。不过其执行任务的基本逻辑和[`ThreadPoolExecutor`的任务执行过程](./7_3_ThreadPoolExecutor2.md/#执行任务)是一致的

而关于任务周期执行的机制，前文在阐述[ScheduledFutureTask](./8_1_ScheduledExecutorService1.md/#run)的`run()`方法时，已经提及，

- 它调用[FutureTask.runAndReset](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/FutureTask.html)方法执行任务，保证任务可以重复运行；
- 重新计算任务的下一次运行时间，并且将任务重新入队

## 任务出队

任务出队有主要两个方法，`poll(long timeout)`和`take()`，前者用于非核心线程，后者用于核心线程；同样地，只有在获取锁的时候才能出队

```java
public RunnableScheduledFuture<?> take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    // 注意此处可以被中断
    lock.lockInterruptibly();
    try {
        // 循环执行
        for (;;) {
            // queue[0]是最先超时的任务
            RunnableScheduledFuture<?> first = queue[0];
            if (first == null)
                // 队列为空，无限期等待，会被offer()方法唤醒
                available.await();
            else {
                long delay = first.getDelay(NANOSECONDS);
                if (delay <= 0)
                    // 任务已超时，返回该任务
                    return finishPoll(first);
                first = null; // don't retain ref while waiting
                // 任务未超时
                if (leader != null)
                    // 当leader已设置时，当前线程只能无限期等待
                    // 因为在其之前还有任务未执行
                    available.await();
                else {
                    // 否则将leader设置为当前（执行任务的）线程
                    Thread thisThread = Thread.currentThread();
                    leader = thisThread;
                    try {
                        // 等待任务超时
                        available.awaitNanos(delay);
                    } finally {
                        // 任务超时之后，将leader置空，再次进入循环
                        // 之后将获取任务并返回
                        // 此时其他的线程将可以设置leader并进入超时等待
                        if (leader == thisThread)
                            leader = null;
                    }
                }
            }
        }
    } finally {
        if (leader == null && queue[0] != null)
            //唤醒其他的线程去获取任务
            available.signal();
        lock.unlock();
    }
}

public RunnableScheduledFuture<?> poll(long timeout, TimeUnit unit)
    throws InterruptedException {
    // nanos如果不进行动态配置，就是0
    long nanos = unit.toNanos(timeout);
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        for (;;) {
            RunnableScheduledFuture<?> first = queue[0];
            if (first == null) {
                if (nanos <= 0)
                    // 若队列为空，且keepAliveTime<=0，直接返回null
                    return null;
                else
                    // 否则限时等待之后进入下次循环
                    nanos = available.awaitNanos(nanos);
            } else {
                long delay = first.getDelay(NANOSECONDS);
                if (delay <= 0)
                    // 运气好正好有任务到期，返回任务
                    return finishPoll(first);
                if (nanos <= 0)
                    // 任务未到期且keepAliveTime<=0，返回null
                    return null;
                first = null; // don't retain ref while waiting
                // 以下是设置keepAliveTime的情形
                if (nanos < delay || leader != null)
                    // 将nanos置0
                    nanos = available.awaitNanos(nanos);
                else {
                    Thread thisThread = Thread.currentThread();
                    leader = thisThread;
                    try {
                        // 分段等待
                        long timeLeft = available.awaitNanos(delay);
                        nanos -= delay - timeLeft;
                    } finally {
                        // 重重leader
                        if (leader == thisThread)
                            leader = null;
                    }
                }
            }
        }
    } finally {
        if (leader == null && queue[0] != null)
            // 唤醒其他线程
            available.signal();
        lock.unlock();
    }
}
```

<center>

![xx](/img/juc/delayed_worker_queue_take.jpg)

<p style="text-align:center; font-size:.8rem; font-style:italic;color:grey">ScheduledThreadPoolExecutor任务出队流程图</p>
</center>

理解了任务的入队与出队，我们就可以解释[本节开头示例](#引例)中不同`corePoolSize`引发的差异：

在分析任务的执行时，要始终留意`getTask()`方法中的这一段代码，为了方便描述，将其记为<span id="cp1">CP1<span>

>
```java
if ((wc > maximumPoolSize || (timed && timedOut))
    && (wc > 1 || workQueue.isEmpty())) {
    if (compareAndDecrementWorkerCount(c))
        return null;
    continue;
}
```

- 当`corePoolSize`为0时
    - 首次提交一个延迟2s的任务a，创建线程t1，显然a超时之前t1无法获取任务，但t1并不会因为keepAlive超时而在CP1处被结束（因为任务队列不为空），它只是一直在循环；
    - 接着提交一个延迟1s的任务b，由于t1未被销毁，所以提交任务b时并未新建线程，池中仍只有一个工作线程t1；
    - 任务b会先于a出队，故1s后b超时执行，由于b是死循环，无法结束，因此没有线程去执行超时的任务a

- 当`corePoolSize`为1时，虽然输出结果与`corePoolSize`为0时一致，但是其执行过程却有很大差别
    - 首次提交一个延迟2s的任务a，创建线程t1，t1会在take()获取队列时设置`leader`并进入超时等待状态；
    - 接着提交一个延迟1s的任务b，由于`corePoolSize`的限制，并未能创建新线程，池中仍只有一个工作线程t1。在任务b入队后，会唤醒阻塞的t1线程；
    - t1被唤醒之后清空`leader`，重新去队列中获取任务，由于b要比a先出队，此时t1会接着设置`leader`并在任务b的时间上超时等待；
    - 任务b超时之后开始执行，由于b是死循环，无法结束，因此没有线程去执行超时的任务a

- 当`corePoolSize`> 1时，情况又有所不同
    - 首次提交一个延迟2s的任务a，创建线程t1，t1会在take()获取队列时设置`leader`并进入超时等待状态；
    - 接着提交一个延迟1s的任务b，创建线程t2，池中有2个工作线程t1、t2。同样地，b入队后，会唤醒阻塞的t1；
    - t1被唤醒之后清空`leader`，重新去队列中获取任务，由于b要比a先出队，此时t1会接着设置`leader`并在任务b的时间上超时等待；
    - t1在超时等待时，由于`leader`已经被设置，t2只能无限阻塞；
    - t1超时后，执行任务b，同时清空`leader`并唤醒t2，t2设置`leader`并在任务a的时间上超时等待；
    - t2超时后，执行任务a