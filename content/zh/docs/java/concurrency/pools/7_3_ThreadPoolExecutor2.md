---
title: "ThreadPoolExecutor-2"
date: 2020-11-03
author: "wangy325"
weight: 15
categories: [java]
tags: [并发]
---

[前文](./7_2_ThreadPoolExecutor1.md/#threadpoolexecutor)说过，`ThreadPoolExecutor`实例代表了Java线程池，前面我们介绍了`ThreadPoolExecutor`的构造器和几个核心概念，在本节中，我们着重介绍线程池的执行过程以及线程池的关闭。

<!--more-->

## 线程池的运行状态

线程池的运行状态表示了线程池的生命周期，在代码实现中它们使用用一个整数表示：

|状态|描述|
|:--:|:--:|
|***RUNNING***|接受新任务的提交，执行队列中的任务|
|***SHUTDOWN***|不接受新任务的提交，执行队列中的任务|
|***STOP***|不接受新任务的提交，不执行队列中的任务，中断正在执行的任务|
|***TIDYING***|所有任务终止，workerCount = 0 ，执行terminated()方法|
|***TERMINATED***|terminated()方法执行完毕|

为了方便地判断线程池的运行状态，给上述线程池状态约定了单调的演化关系：

|状态变化|条件|
|:--:|:--:|
|***RUNNING*** -> ***SHUTDOWN***|调用`shutdown()`方法，或者隐式调用了`finalize()`[^6]|
|(***RUNNING***或***SHUTDOWN***) -> ***STOP***|调用`shutdownNow()`方法|
| ***SHUTDOWN*** -> ***TIDYING***| 当线程池和任务队列都为空时|
|***STOP*** -> ***TIDYING***|线程池为空|
|***TIDYING*** -> ***TERMINATED***|当`terminated()`方法执行完成|

可以看到，线程池的状态是单调演化的，除了RUNNING状态可以接受任务并执行外，其他的状态都将导致线程池资源关闭。`ThreadPoolExecutor`类中有几个获取线程池状态的方法：

```java
/** 若线程池的状态不是RUNNING，那么该方法就返回true*/
public boolean isShutdown() {
    return ! isRunning(ctl.get());
}

/** 若线程池的状态不是RUNNING，并且状态没有还没有切换到TERMINATED，该方法就返回true
这个方法返回true说明线程池正处于terminae的过程中*/
public boolean isTerminating() {
    int c = ctl.get();
    return ! isRunning(c) && runStateLessThan(c, TERMINATED);
}

/** 若线程的状态为TERMINATED，该方法返回true*/
public boolean isTerminated() {
    return runStateAtLeast(ctl.get(), TERMINATED);
}
```

## 线程池中任务的执行过程

了解了线程池的工作状态，接下来我们尝试去深入任务是如何在线程池中被执行的，以及线程池中核心线程，任务队列以及非核心线程之间是如何协同工作的。

在[任务队列](./7_2_ThreadPoolExecutor1.md/#任务队列)中，我们阐述了任务队列与线程池之间存在交互关系，这种交互关系体现了线程池执行任务的重要过程。

<center style="font-size:.8rem;font-style:italic;color:grey">

<img src="/img/juc/executor_flow.svg" alt="线程池执行流程图" width="600px" position="center"/>
<p>
线程池执行流程图

</center>
上面的流程图展示了任务提交到线程池到执行或被拒绝的过程，和在任务队列中的描述相当，接下来我们从源码的角度阐述这一过程。

###  提交任务

在介绍[ExecutorService](./7_2_ThreadPoolExecutor1.md/#executorservice接口)时我们提到了`AbstractExecutorService`基类，它有两个重要的作用：

1. 将所有的任务提交转变为执行一个`FutureTask`
2. 实现了`invokeAny/invokeAll`方法

了解到这一点之后，我们将线程池的任务执行重心放在`ThreadPoolExecutor`的`execute(Runnable)`方法上：

```Java
public void execute(Runnable command) {
    if (command == null)
        throw new NullPointerException();

    int c = ctl.get();
    // 当前工作线程数 < corePoolSize
    if (workerCountOf(c) < corePoolSize) {
        // 直接添加新的工作线程执行之
        if (addWorker(command, true))
            return;
        // 若新建失败，则表示rs >= shutdown，任务将会被拒绝
        c = ctl.get();
    }
    // 否则将任务放入队列
    if (isRunning(c) && workQueue.offer(command)) {
        // 线程状态RUNNING，任务已放入队列
        // double check
        int recheck = ctl.get();
        // 这里double-check的原因是：
        if (! isRunning(recheck) && remove(command))
            // 1. 线程池可能被shutdown了，这时候直接从队列移除任务并拒绝之
            reject(command);
        else if (workerCountOf(recheck) == 0)
            // 2. 若corePoolSize = 0，而非核心线程都完成了任务
            // 空闲线程超时被销毁之后，就可能出现workerCount = 0 的情况
            // 此时添加一个非核心线程去执行队列中的任务
            addWorker(null, false);
    }
    // 队列满了，则尝试新建一个非核心线程执行任务，否则拒绝之
    else if (!addWorker(command, false))
        reject(command);
}

/**使用Worker包装线程来执行任务*/
private boolean addWorker(Runnable firstTask, boolean core) {
    // 循环判断，直到满足新建Worker的条件为止
    retry:
    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);

        // Check if queue empty only if necessary.
        // 解释一下这个return false的逻辑
        /* 1. 若rs = runnning，继续添加worker
         * 2. 若rs >= shutdown
         *      2.1 rs >= stop 不新建worker(return false)
         *      2.2 rs = shutdown，firstTask != null，
         *              不新建worker (shutdown之后不接受新任务提交)
         *      2.3 rs = shutdown，firstTask = null，workQueue为空，不新建worker
         */
        if (rs >= SHUTDOWN &&
            ! (rs == SHUTDOWN &&
               firstTask == null &&
               ! workQueue.isEmpty()))
            return false;

        for (;;) {
            int wc = workerCountOf(c);
            if (wc >= CAPACITY ||
                wc >= (core ? corePoolSize : maximumPoolSize))
                // 线程数量超限
                return false;
            if (compareAndIncrementWorkerCount(c))
                break retry;
            c = ctl.get();  // Re-read ctl
            if (runStateOf(c) != rs)
                continue retry;
            // else CAS failed due to workerCount change; retry inner loop
        }
    }

    boolean workerStarted = false;
    boolean workerAdded = false;
    Worker w = null;
    try {
        w = new Worker(firstTask);
        /*
        Worker(Runnable firstTask) {
            setState(-1); // inhibit interrupts until runWorker
            this.firstTask = firstTask;
            this.thread = getThreadFactory().newThread(this);
        }
        */
        final Thread t = w.thread;
        if (t != null) {
            final ReentrantLock mainLock = this.mainLock;
            mainLock.lock();
            try {
                // Recheck while holding lock.
                // Back out on ThreadFactory failure or if
                // shut down before lock acquired.
                int rs = runStateOf(ctl.get());
                // 状态为RUNNING时可以新建Worker执行任务
                // 状态为SHUTDOWN时，任务必须为空(不可提交任务)
                if (rs < SHUTDOWN ||
                    (rs == SHUTDOWN && firstTask == null)) {
                    if (t.isAlive()) // precheck that t is startable
                        throw new IllegalThreadStateException();
                    // 调整字段值
                    workers.add(w);
                    int s = workers.size();
                    if (s > largestPoolSize)
                        largestPoolSize = s;
                    workerAdded = true;
                }
            } finally {
                mainLock.unlock();
            }
            // 运行任务
            if (workerAdded) {
                // 从Worker的构造器来看，线程t的构造器参数是Worker
                // 因此start()实际上执行的是Worker的run()方法
                t.start();
                workerStarted = true;
            }
        }
    } finally {
        // 线程池创建线程失败，清理资源
        if (! workerStarted)
            addWorkerFailed(w);
    }
    // 返回true表示线程已创建并启动
    // 根据调用参数的不同，启动的线程可能直接执行任务
    // 也可能从队列中获取任务执行
    return workerStarted;
}
```

<center style="font-size:.8rem;font-style:italic;color:grey">

<img  src= "/img/juc/thread_pool_add_worker.jpg" alt="线程池添加worker的流程" width="600px" position="center"/>
<p>
线程池添加worker的流程
</center>

###  创建空线程

前面介绍[核心概念](./7_2_ThreadPoolExecutor1.md/#核心线程池与最大线程池)的时候说到，线程池初始化成功之后，池中是没有活动线程的，不过线程池具有很好的灵活性，可以进行动态配置。使用`prestartCoreThread()`和`prestartAllCoreThreads()`方法可以向线程池中添加**核心**线程，这些线程并没有使用任务初始化，不过其会尝试去队列中获取任务执行，若队列为空，这些线程就会挂起(waiting)[^7]。

```java
/** 创建一个核心线程*/
public boolean prestartCoreThread() {
    return workerCountOf(ctl.get()) < corePoolSize &&
        addWorker(null, true);
}
/** 创建所有核心线程*/
public int prestartAllCoreThreads() {
    int n = 0;
    while (addWorker(null, true))
        ++n;
    return n;
}
```

###  执行任务

线程池创建线程是为了执行任务，`addWorker()`方法成功时会启动线程，线程则会调用Worker的`run()`方法。

```java
public void run() {
    runWorker(this);
}

/**该方法会循环进行，并且在getTask()方法处阻塞*/
final void runWorker(Worker w) {
    Thread wt = Thread.currentThread();
    // 任务即为创建Worker的入参
    Runnable task = w.firstTask;
    w.firstTask = null;
    w.unlock(); // allow interrupts
    boolean completedAbruptly = true;
    try {
        // 只要有任务提交或队列不为空，则一直执行
        while (task != null || (task = getTask()) != null) {
            w.lock();
            // If pool is stopping, ensure thread is interrupted;
            // if not, ensure thread is not interrupted.  This
            // requires a recheck in second case to deal with
            // shutdownNow race while clearing interrupt
            // 如果线程池状态为STOP（调用shutdownNow()），则中断线程
            if ((runStateAtLeast(ctl.get(), STOP) ||
                 (Thread.interrupted() &&
                  runStateAtLeast(ctl.get(), STOP))) &&
                !wt.isInterrupted())
                wt.interrupt();
            try {
                // 可扩展方法
                beforeExecute(wt, task);
                Throwable thrown = null;
                try {
                    task.run();
                } catch (RuntimeException x) {
                    thrown = x; throw x;
                } catch (Error x) {
                    thrown = x; throw x;
                } catch (Throwable x) {
                    thrown = x; throw new Error(x);
                } finally {
                    // 可扩展方法
                    afterExecute(task, thrown);
                }
            } finally {
                task = null;
                w.completedTasks++;
                w.unlock();
            }
        }
        completedAbruptly = false;
    } finally {
        // while循环结束后的动作
        processWorkerExit(w, completedAbruptly);
    }
}

/** 该方法从队列中获取任务，方法会被阻塞(核心线程)或超时阻塞（非核心线程）*/
private Runnable getTask() {
    boolean timedOut = false; // Did the last poll() time out?

    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);

        // Check if queue empty only if necessary.
        // 如果状态为SHUTDOWN，但队列不为空，仍从队列中执行任务
        // 如果状态为STOP，则直接return null
        if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {
            // workerCount - 1
            decrementWorkerCount();
            return null;
        }

        int wc = workerCountOf(c);

        // Are workers subject to culling?
        // 当allowCoreThreadTimeOut被设置时，核心线程超时阻塞
        boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;

        if ((wc > maximumPoolSize || (timed && timedOut))
            && (wc > 1 || workQueue.isEmpty())) {
            if (compareAndDecrementWorkerCount(c))
                return null;
            continue;
        }

        try {
            // 阻塞队列获取队头任务
            Runnable r = timed ?
                workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :
                workQueue.take();
            if (r != null)
                return r;
            // 超时未获取到任务 --> line 79 --> return null
            timedOut = true;
        } catch (InterruptedException retry) {
            timedOut = false;
        }
    }
}
```

<center style="font-size:.8rem;font-style:italic;color:grey">

<img src="/img/juc/thread_pool_run_task.jpg" alt="线程池执行任务的流程" width="600px" position="center" />
<p>
线程池执行任务的流程
</center>

可以看到，线程池中的线程初始化之后，其执行任务的过程是阻塞的，也就是说，线程池中的线程一直处于“stand by”状态，除此之外，我们还可以得到以下信息：

- 如果没有设置`allowCoreThreadTimeOut`，核心线程执行任务的过程将一直进行
- 非核心线程的执行任务的过程将在超时之后，方法不返回，循环再次进行，将在try块之前的if语句块中返回null
- 当线程池状态为SHUTDOWN时，若队列不为空，仍会去队列中获取任务执行；若状态为STOP，将不会从队列中获取任务

当出现下列任一情况时，`getTask()`会返回null结束线程运行：

1. workerCount > maximumPoolSize，一般在动配置maximumPoolSize之后出现
2. 线程池状态为STOP
3. 线程池状态为SHUTDOWN，且队列为空
4. 当线程获取队列中的任务超时，且该线程不是队列中的唯一线程或队列为空

前面3点都比较好理解，第4点有点难以理解，我们使用一个corePoolSize=0的线程池特例加以说明：

```java
void cachedPool(){
    ThreadPoolExecutor service = 
        (ThreadPoolExecutor) Executors.newCachedThreadPool();

    // service 5秒之后即关闭
    service.setKeepAliveTime(5,TimeUnit.SECONDS);
    service.submit(()->{
        System.out.println("task done");
    });
}
```

我们知道，`newCachedThreadPool`构建一个corePoolSize=0的线程池，因此池中所有的任务在空闲超时都会被超时销毁，我们不妨来看看这一过程是如何发生的；我们将`keepAliveTime`重新设置为5s，并且向线程池中提交一个任务。

> 线程池首先会新建一个线程执行任务，调用的是addWorker(firstTask, false)方法；
>
> 在runWorker的第二次循环时，由于firstTask已经被执行，将调用`getTask()`方法去队列中获取任务。我们知道队列中没有任务，超时时间为5s，5s之后getTask()方法将`timeout`置为true后进入第二次循环；
>
> 注意此次循环：
>
> ```Java
> if ((wc > maximumPoolSize || (timed && timedOut))
>     && (wc > 1 || workQueue.isEmpty())) {
>     if (compareAndDecrementWorkerCount(c))
>         return null;
>     continue;
> }
> ```
>
> 不难看出来，第一次wc =1 并且timeout=false，显然是不满足if的条件；第二次则不同，timeout此时为true，workQueue.isEmpty为true，if条件满足；
>
> 此时将 wc-1，并且返回null

返回null之后，runWorker()方法的while循环也会结束，接下来会执行`processWorkerExit(w, completedAbruptly)`方法：

```java
/**while循环正常结束，completedAbruptly为false*/
private void processWorkerExit(Worker w, boolean completedAbruptly) {
    if (completedAbruptly) // If abrupt, then workerCount wasn't adjusted
        decrementWorkerCount();

    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        // 统计已经完成的任务数
        completedTaskCount += w.completedTasks;
        // 将Worker从HashSet中移除
        workers.remove(w);
    } finally {
        mainLock.unlock();
    }

    // 正如其名，「尝试」终止线程池
    tryTerminate();

    int c = ctl.get();
    // 若线程池状态为RUNNING or SHUTDOWN
    if (runStateLessThan(c, STOP)) {
        if (!completedAbruptly) {
            // 线程池中的最小线程数
            int min = allowCoreThreadTimeOut ? 0 : corePoolSize;
            if (min == 0 && ! workQueue.isEmpty())
                //队列非空时，要保证池中有线程运行任务
                min = 1;
            if (workerCountOf(c) >= min)
                // 池中还有线程，可以安心返回
                return; // replacement not needed
        }
        // 否则，向池中加入一个线程
        addWorker(null, false);
    }
}
```

在上面方法的最后if条件中，`wc=min=0`，池中没有线程并且任务队列为空，线程成功完成使命，结束运行。

综上所述，被创建的线程除了执行被提交的任务之外，还会被阻塞执行队列中的任务，而核心线程和非核心线程在空闲时又会存在处理方式的差异。

值得一提的是，在上面的`newFixedThreadPool()`的例子中，线程池提交完任务之后，并没有调用关闭方法，那么线程池能关闭么？

通过上面的分析，例子中的线程在执行完任务后超时被销毁，此时池中没有线程在运行，队列中也没有任务，**那么就意味着所有的逻辑都已经完成，并没有发生阻塞，线程池中的线程数为0，任务队列为空**，虽然如此，线程池的状态还是***RUNNING***！线程池并没有终止，其还可以继续提交任务运行，实际上，线程池回到了*初始化* 时的状态。

##  如何合理地关闭线程池

`ThreadPoolExecutor`提供了2个关闭线程池的方法

```java
public void shutdown() {
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        // 检查权限
        checkShutdownAccess();
        // 修改线程池状态为SHUTDOWN
        advanceRunState(SHUTDOWN);
        // 中断所有空闲（waiting）的线程
        // 在condition.await()上阻塞的线程能够响应中断，
        // 这就是线程池能够关闭而不阻塞的原因
        // 阻塞的线程被中断唤醒后继续在getTask()上继续执行，
        // 在线程池状态判断时return null而结束
        interruptIdleWorkers();
        onShutdown(); // hook for ScheduledThreadPoolExecutor
    } finally {
        mainLock.unlock();
    }
    // 执行terminated()（空）方法，将线程状态设置为TERMINATED
    tryTerminate();
}

public List<Runnable> shutdownNow() {
    List<Runnable> tasks;
    final ReentrantLock mainLock = this.mainLock;
    mainLock.lock();
    try {
        // 权限检查
        checkShutdownAccess();
        // 修改线程池状态为STOP
        advanceRunState(STOP);
        // 中断所有线程
        interruptWorkers();
        // 队列中未执行的任务
        tasks = drainQueue();
    } finally {
        mainLock.unlock();
    }
    tryTerminate();
    return tasks;
}

final void tryTerminate() {
    for (;;) {
        int c = ctl.get();
        /*直接返回的条件：
         * 1. 线程池状态为RUNNING
         * 2. 线程池状态为 TIDYING 或 TERMINATED
         * 3. 线程状态为 SHUTDOWN， 且队列不为空
         */
        if (isRunning(c) ||
            runStateAtLeast(c, TIDYING) ||
            (runStateOf(c) == SHUTDOWN && ! workQueue.isEmpty()))
            return;
        // 若工作线程数 > 0 , 中断一个空闲线程并返回
        if (workerCountOf(c) != 0) { // Eligible to terminate
            interruptIdleWorkers(ONLY_ONE);
            return;
        }

        final ReentrantLock mainLock = this.mainLock;
        mainLock.lock();
        try {
            // 设置线程池状态为TIDYING
            if (ctl.compareAndSet(c, ctlOf(TIDYING, 0))) {
                try {
                    // 运行terminated()方法
                    terminated();
                } finally {
                    // 设置线程状态为TERMINATED
                    ctl.set(ctlOf(TERMINATED, 0));
                    // 唤醒awaitTermination方法
                    termination.signalAll();
                }
                return;
            }
        } finally {
            mainLock.unlock();
        }
        // else retry on failed CAS
    }
}
```

从上面的分析，我们可以清晰地看到`shutdown()`和`shutdownNow()`的区别，前者只中断了空闲线程，后者中断了所有线程；结合前文`getTask()`方法的表述，前者未被中断的线程还可继续执行并从任务队列中获取任务执行，而后者已经无法从队列中获取任务执行了，这与本节开头对线程池的[运行状态](#线程池的运行状态)的描述一致。

`shutdown()`和`shutdownNow()`方法都不能中断正在执行的任务，不过后者对正在执行的任务发送了中断命令，如果任务能够响应中断，即可以作出相应操作。如果想在`shutdown()`或`shutdownNow()`执行之后继续获取任务的返回值，只能使用`awaitTermination()`方法愚蠢地等待。`awaitTermination()`方法阻塞当前调用该方法的线程，直到任务执行完毕、超时、调用线程被中断3者任一条件发生。

需要说明的是，如果`awaitTermination()`阻塞过程中线程池的状态变为***TERNMINATD***，说明任务执行完毕，返回true；否则返回false或抛出中断异常。

下面的示例代码演示了`shutdown()`和`shutdownNow()`方法的区别：

```Java
public class ExecutorShutdown {

    static int pointer = 0;
    /** 容量为1的线程池，其能保证提交的任务都是序列化执行的 */
    ThreadPoolExecutor service
        = (ThreadPoolExecutor) Executors.newFixedThreadPool(1);

    @SneakyThrows
    public static void main(String[] args) {
        ExecutorShutdown es = new ExecutorShutdown();
        es.shutdown();
//        es.awaitTermination(1, TimeUnit.SECONDS);

    }

    void shutdown() {
        service.execute(new ComplexTask());
        // 对于newFixedThreadPool(1),EasyTask在任务队列中
        service.execute(new EasyTask());
        service.shutdown();
        // shutdown之后，任务并没有执行完成，pointer的值还是0
        System.out.println("pointer:" + pointer);

        // 获取待任务队列
        System.out.println("workQueue: " + service.getQueue());
        // 判断该执行器是否被关闭
        System.out.println("is executor shutdown? " + service.isShutdown());
        // 执行器关闭之后所有任务是否都完成
        // 如果没有调用shutdown()或shutdownNow()就直接调用isTerminated()，该方法必返回false
        System.out.println("is executor terminated? " + service.isTerminated());
        System.out.println("pointer:" + pointer);
    }

    void awaitTermination(int timeout, TimeUnit unit) {
        service.execute(new ComplexTask());
        service.execute(new EasyTask());
        List<Runnable> tasks;
        try {
            if (service.awaitTermination(timeout, unit)) {
                service.shutdown();
            } else {
                if(!(tasks = service.shutdownNow()).isEmpty()){
                    System.out.println("丢弃任务" + tasks);
                }
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println("workQueue: " + service.getQueue());
        System.out.println("is executor shutdown? " + service.isShutdown());
        System.out.println("is executor terminated? " + service.isTerminated());
    }

    abstract class Task {
        @Override
        public String toString() {
            return getClass().getSimpleName() + "@" + Integer.toHexString(hashCode());
        }
    }

    class ComplexTask extends Task implements Runnable {
        @Override
        public void run() {
            // 响应中断，调用shutdownNow()可以结束任务
            System.out.println("[" + Thread.currentThread() 
                + "@" + this + "]，开始执行");
            // never finish unless interrupted
            for (; ; ) {
                if (!Thread.interrupted()) {
                    pointer++;
                } else {
                    System.out.println("[" + Thread.currentThread() 
                        + "@" + this + "]，被中断");
                    break;
                }
            }
        }
    }

    class EasyTask extends Task implements Runnable {
        @Override
        public void run() {
            System.out.println("[" + Thread.currentThread()
                 + "@" + this + "]，开始执行");
            pointer++;
            System.out.println("[" + Thread.currentThread() 
                + "@" + this + "]，执行完成");
        }
    }
}
/* output
调用shutdown：
[Thread[pool-1-thread-1,5,main]@ComplexTask@48d82c9c]，开始执行
pointer:0
workQueue: [EasyTask@14ae5a5]
is executor shutdown? true
is executor terminated? false
pointer:813

调用awaitTermination：
[Thread[pool-1-thread-1,5,main]@ComplexTask@7ac59a98]，开始执行
[Thread[pool-1-thread-1,5,main]@ComplexTask@7ac59a98]，被中断
丢弃任务[EasyTask@7f31245a]
workQueue: []
is executor shutdown? true
is executor terminated? true
*///:~
```

上例中我们设计了一个可以正常执行的任务EasyTask和一个无限循环执行的任务ComplexTask，后者响应中断，如果不中断线程，ComplexTask将一直运行下去。我们使用一个固定容量为1的线程池运行任务，并且先提交ComplexTask，ComplexTask无法结束运行，那么EasyTask将会放入队列中。

从运行的结果上来看，使用`shutdown()`无法结束线程池的运行，虽然主线程结束，但线程池一直在后台运行，同时EasyTask也还在任务队列中，主线程结束后线程池的还没有终止，程序会一直在后台运行。

当调用`awaitTermination(timeout, unit)`时，很明显这个方法将超时并返回false，最终执行`shutdownNow()`，shutdownNow给ComplexTask任务发送中断命令，其在下一次循环检查到中断，结束执行。同时任务队列中的EasyTask被丢弃，任务队列为空，主线程结束后，线程池也成功终止。

如果ComplexTask在设计时，没有响应中断，而使用死循环执行任务，那么`shutdownNow()`方法仍然无法终止线程池，这就是官方文档中关于`shutdownNow()`方法描述的语义：

> *There are no guarantees beyond best-effort attempts to stop
     processing actively executing tasks.  This implementation
     cancels tasks via {@link Thread#interrupt}, so any task that
     fails to respond to interrupts may never terminate.*


[^6]: 目前笔者还未找到隐式调用`finalize()`方法导致线程池关闭的例证
[^7]: 若corePoolSize=0，这些方法不会创建线程