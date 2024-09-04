---
title: "并发组件-PBQ/DQ"
date: 2020-11-16
author: "wangy325"
weight: 23
categories: [java]
tags: [并发]
BookToC: true
---

##  PriorityBlockingQueue

`PriorityBlockingQueue`就是一个基础的可阻塞的[优先级队列](../../collections/2_Queue.md/#priorityqueue)，当队列为空时，从队列中获取元素时被阻塞。其余特性和优先级队列是一致的。

下例展示了如何构建一个<span id ="pt">可以放入优先级队列</span>的任务：

```java
public class PrioritizedTask implements Runnable, Comparable<PrioritizedTask> {
    protected static List<PrioritizedTask> sequence = new ArrayList<>();
    private Random rand = new Random(47);
    private static int counter = 0;
    private final int id = counter++;
    private final int priority;


    public PrioritizedTask(int priority) {
        this.priority = priority;
        sequence.add(this);
    }

    @Override
    public int compareTo(PrioritizedTask arg) {
        return priority < arg.priority ? 1 :
            (priority > arg.priority ? -1 : 0);
    }

    @Override
    public void run() {
        try {
            TimeUnit.MILLISECONDS.sleep(rand.nextInt(250));
        } catch (InterruptedException e) {
            // Acceptable way to exit
        }
        System.out.println(this);
    }

    @Override
    public String toString() {
        return String.format("[%1$-3d]", priority) +
            " Task " + id;
    }

    public String summary() {
        return "(" + id + ":" + priority + ")";
    }

    public static class EndSentinel extends PrioritizedTask {
        private ExecutorService exec;

        public EndSentinel(ExecutorService e) {
            super(-1); // Lowest priority in this program
            exec = e;
        }

        @Override
        public void run() {
            int count = 0;
            for (PrioritizedTask pt : sequence) {
                System.out.print(pt.summary());
                if (++count % 5 == 0)
                    System.out.println();
            }
            System.out.println();
            System.out.println(this + " Calling shutdownNow()");
            exec.shutdownNow();
        }
    }
}
```

`PrioritizedTask`实现了Runnable和Comparable接口，有一个int型`priority`域，用来表示任务的优先级，在`compareTo`方法中的逻辑表示，优先级高的将会优先出队。其还有一个静态域，用来记录所有任务被置入队列的顺序。`PrioritizedTask`有一个静态内部类，也是其子类，它被称作“结束哨兵”，它的优先级为-1，代表它会最后出队，当执行这个任务时，代表任务所有的任务执行完毕，可以关闭线程池资源。

在接下来的示例中，将模拟生产者和消费者，执行PriorityBlockingQueue中的任务，我们可以从程序的输出观察优先级队列的出队（被执行）的顺序：

```java
public class PriorityBlockingQueueDemo {

    static class PrioritizedTaskProducer implements Runnable {
        private Random rand = new Random(47);
        private Queue<Runnable> queue;
        private ExecutorService exec;

        public PrioritizedTaskProducer(
            Queue<Runnable> q, ExecutorService e) {
            queue = q;
            exec = e; // Used for EndSentinel
        }

        @Override
        public void run() {
            // Unbounded queue; never blocks.
            // Fill it up fast with random priorities:
            for (int i = 0; i < 20; i++) {
                queue.add(new PrioritizedTask(rand.nextInt(10)));
                Thread.yield();
            }
            // Trickle in highest-priority jobs:
            try {
                for (int i = 0; i < 10; i++) {
                    TimeUnit.MILLISECONDS.sleep(250);
                    queue.add(new PrioritizedTask(10));
                }
                // Add jobs, lowest priority first:
                for (int i = 0; i < 10; i++)
                    queue.add(new PrioritizedTask(i));
                // A sentinel to stop all the tasks:
                queue.add(new PrioritizedTask.EndSentinel(exec));
            } catch (InterruptedException e) {
                // Acceptable way to exit
            }
            System.out.println("Finished PrioritizedTaskProducer");
        }
    }

    static class PrioritizedTaskConsumer implements Runnable {
        private PriorityBlockingQueue<Runnable> q;

        public PrioritizedTaskConsumer(
            PriorityBlockingQueue<Runnable> q) {
            this.q = q;
        }

        @Override
        public void run() {
            try {
                while (!Thread.interrupted())
                    // Use current thread to run the task:
                    q.take().run();
            } catch (InterruptedException e) {
                // Acceptable way to exit
            }
            System.out.println("Finished PrioritizedTaskConsumer");
        }
    }

    public static void main(String[] args) throws Exception {
        ExecutorService exec = Executors.newCachedThreadPool();
        PriorityBlockingQueue<Runnable> queue = new PriorityBlockingQueue<>();
        exec.execute(new PrioritizedTaskProducer(queue, exec));
        exec.execute(new PrioritizedTaskConsumer(queue));
    }
}
/* output(partial)
[9  ] Task 5
[9  ] Task 13
[9  ] Task 14
[8  ] Task 10
... other 15 tasks
[0  ] Task 18
[10 ] Task 20
... other 7 tasks
[10 ] Task 28
Finished PrioritizedTaskProducer
[10 ] Task 29
... other 9 tasks
[0  ] Task 30
(0:8)(1:5)(2:3)(3:1)(4:1)
(5:9)(6:8)(7:0)(8:2)(9:7)
(10:8)(11:8)(12:1)(13:9)(14:9)
(15:8)(16:8)(17:1)(18:0)(19:8)
(20:10)(21:10)(22:10)(23:10)(24:10)
(25:10)(26:10)(27:10)(28:10)(29:10)
(30:0)(31:1)(32:2)(33:3)(34:4)
(35:5)(36:6)(37:7)(38:8)(39:9)
(40:-1)
[-1 ] Task 40 Calling shutdownNow()
Finished PrioritizedTaskConsumer
*///:~
```

`PrioritizedTaskProducer`任务负责向队列添加40个任务，前20个任务不间断地添加进队，且随机0-10的优先级；后10个任务是间隔固定时间添加优先级为10的任务，最后10个任务不间断添加优先级递增到9的任务，最后添加"结束哨兵"任务，其将打印所有任务添加到队列的顺序。`PrioritizedTaskConsumer`则是不间断的尝试从队列中取出任务执行。从输出可以看到，队列中如果有优先级高的任务，它一定是先出队的。

这个例子不需要任何显式同步，因为阻塞队列提供了所需的同步。

##  DelayQueue

`DelayQueue`是一个无界的阻塞队列，利用`PriorityQueue`实现，用于存放实现`Delay`接口[^9]的对象，队列中的对象只能在其到期之后才能被取出。同时其还是一个有序队列，即队头的元素将最先到期，若没有任何元素到期，就不会有队头元素，`poll()`方法将返回`null`，因此DelayQueue**不接受**`null`作为元素。

实际上，在了解了`ScheduledThreadPoolExecutor.ScheduledFutureTask`的[出队规则](../pools/8_2_ScheduledExecutorService2.md/#任务出队)之后，`DelayQueue`的出队的实现也就不言自明了——当`leader`被设置时，表明有任务即将出队，其他任务进入等待，该任务出队之后重置`leader`：

```java
// Delayqueue.take
public E take() throws InterruptedException {
    final ReentrantLock lock = this.lock;
    lock.lockInterruptibly();
    try {
        for (;;) {
            E first = q.peek();
            if (first == null)
                available.await();
            else {
                long delay = first.getDelay(NANOSECONDS);
                if (delay <= 0)
                    return q.poll();
                first = null; // don't retain ref while waiting
                if (leader != null)
                    available.await();
                else {
                    Thread thisThread = Thread.currentThread();
                    leader = thisThread;
                    try {
                        available.awaitNanos(delay);
                    } finally {
                        if (leader == thisThread)
                            leader = null;
                    }
                }
            }
        }
    } finally {
        if (leader == null && q.peek() != null)
            available.signal();
        lock.unlock();
    }
}
```

下例展示了如何构造一个可以放入`DelayQueue`中的任务：

```java
public class DelayQueueDemo {

    private static class DelayedTask implements Runnable, Delayed {
        protected static List<DelayedTask> sequence = new ArrayList<>();
        private static int counter = 0;
        private final int id = counter++;
        private final int delta;
        /** 到期时间 */
        private final long trigger;

        public DelayedTask(int delayInMilliseconds) {
            delta = delayInMilliseconds;
            trigger = System.nanoTime() + NANOSECONDS.convert(delta, MILLISECONDS);
            sequence.add(this);
        }

        @Override
        public long getDelay(TimeUnit unit) {
            return unit.convert(trigger - System.nanoTime(), NANOSECONDS);
        }

        @Override
        public int compareTo(Delayed arg) {
            DelayedTask that = (DelayedTask) arg;
            if (trigger < that.trigger) return -1;
            if (trigger > that.trigger) return 1;
            return 0;
        }

        @Override
        public void run() {
            System.out.print(this + " ");
        }

        @Override
        public String toString() {
            return String.format("[%1$-4d]", delta) + " Task " + id;
        }

        public String summary() {
            return "(" + id + ":" + delta + ")";
        }

        static class EndSentinel extends DelayedTask {
            private ExecutorService exec;

            public EndSentinel(int delay, ExecutorService e) {
                super(delay);
                exec = e;
            }

            @Override
            public void run() {
                System.out.println();
                for (DelayedTask pt : sequence) {
                    System.out.print(pt.summary() + " ");
                }
                System.out.println();
                System.out.println(this + " Calling shutdownNow()");
                exec.shutdownNow();
            }
        }
    }

    static class DelayedTaskConsumer implements Runnable {
        private DelayQueue<DelayedTask> q;

        public DelayedTaskConsumer(DelayQueue<DelayedTask> q) {
            this.q = q;
        }

        @Override
        public void run() {
            try {
                while (!Thread.interrupted())
                    // Run task with the current thread
                    q.take().run();
            } catch (InterruptedException e) {
                // Acceptable way to exit
            }
            System.out.println("Finished DelayedTaskConsumer");
        }
    }

    public static void main(String[] args) {
        Random rand = new Random(47);
        ExecutorService exec = Executors.newCachedThreadPool();
        DelayQueue<DelayedTask> queue = new DelayQueue<>();
        // Fill with tasks that have random delays:
        for (int i = 0; i < 20; i++)
            queue.put(new DelayedTask(rand.nextInt(5000)));
        // Set the stopping point
        queue.add(new DelayedTask.EndSentinel(5000, exec));
        exec.execute(new DelayedTaskConsumer(queue));
    }
}
/* output（sample）
[128 ] Task 11 [200 ] Task 7 [429 ] Task 5 [520 ] Task 18 [555 ] Task 1 [961 ] Task 4 [998 ] Task 16 [1207] Task 9 [1693] Task 2 [1809] Task 14 [1861] Task 3 [2278] Task 15 [3288] Task 10 [3551] Task 12 [4258] Task 0 [4258] Task 19 [4522] Task 8 [4589] Task 13 [4861] Task 17 [4868] Task 6
(0:4258) (1:555) (2:1693) (3:1861) (4:961) (5:429) (6:4868) (7:200) (8:4522) (9:1207) (10:3288) (11:128) (12:3551) (13:4589) (14:1809) (15:2278) (16:998) (17:4861) (18:520) (19:4258) (20:5000)
[5000] Task 20 Calling shutdownNow()
Finished DelayedTaskConsumer
*///:~
```

从输出可以看到，任务入队的顺序和任务出队的顺序没有任何关系，任务是按照超时先后出队的。

---

[^9]: Delay接口实际上继承了Comparable接口。