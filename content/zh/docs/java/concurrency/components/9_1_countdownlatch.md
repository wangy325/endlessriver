---
title: "并发组件-CountDownLatch"
date: 2020-11-16
author: "wangy325"
weight: 19
categories: [java]
tags: [并发]
BookToC: false
---



##  CountDownLatch

在讨论线程的基本概念时，我们说过`join()`方法可使当前线程等待调用join方法的线程执行完，可以实现简单的[无锁同步](../conecptes/1线程与任务_2.md/#加入线程join)，使用`CountDownLatch`可以更加简单的实现这一目的。毕竟，`join()`方法的语义“加入一个线程”不是很容易就能让人理解。相较于`join()`方法，`CountDownLatch`的语义就明确多了。

<!--more-->

在有些文档上，将`CountDownLatch`译为"倒计时门闩【shuān】"，其维护一个计数器，这个计数器在`CountDownLatch`初始化之后便**不能重置**。在`CountDownLatch`上调用`countDown()`方法来将计数值减1，调用这个方法并不会引起阻塞。不过，在这个计数器为0之前，任何调用`CountDownLatch`的`await()`方法的任务都将阻塞。

`CountDownLatch`的典型用法是将一个任务分割为n个可以独立解决的部分，并创建一个计数器值为n（n为线程数量）的`CountDownLatch`，在每个任务完成时，调用`countDown()`方法将计数器减1，在等待所有任务完成的线程上调用`await()`方法，将任务阻塞，直到计数器为0之后再继续运行。


下面的代码演示了`CountdownLatch`的用法

```java
public class CountDownLatchDemo {

    private static class TaskPortion implements Runnable {
        private static int counter = 0;
        private final int id = counter++;
        private static Random rand = new Random(47);
        private final CountDownLatch latch;

        TaskPortion(CountDownLatch latch) {
            this.latch = latch;
        }

        @Override
        public void run() {
            try {
                doWork();
            } catch (InterruptedException ex) {
                // Acceptable way to exit
            } finally {
                latch.countDown();
            }
        }

        void doWork() throws InterruptedException {
            TimeUnit.MILLISECONDS.sleep(rand.nextInt(2000));
            System.out.println(this + "completed");
        }

        @Override
        public String toString() {
            return String.format("%1$-3d ", id);
        }
    }

    /** Waits on the CountDownLatch: */
    private static class WaitingTask implements Runnable {
        private static int counter = 0;
        private final int id = counter++;
        private final CountDownLatch latch;

        WaitingTask(CountDownLatch latch) {
            this.latch = latch;
        }

        @Override
        public void run() {
            try {
                latch.await();
                System.out.println("Latch barrier passed for " + this);
            } catch (InterruptedException ex) {
                System.out.println(this + " interrupted");
            }
        }

        @Override
        public String toString() {
            return String.format("WaitingTask %1$-3d ", id);
        }
    }

    static final int SIZE = 10;

    public static void main(String[] args) {
        ExecutorService exec = Executors.newCachedThreadPool();
        // 所有任务都必须使用同一个CountDownLatch对象
        CountDownLatch latch = new CountDownLatch(SIZE);
        exec.execute(new WaitingTask(latch));
        for (int i = 0; i < SIZE; i++) {
            exec.execute(new TaskPortion(latch));
        }
        System.out.println("Launched all tasks");
        exec.shutdown(); // Quit when all tasks complete
    }
}
/* output (sample)
Launched all tasks
7   completed
9   completed
5   completed
8   completed
1   completed
2   completed
6   completed
4   completed
0   completed
3   completed
Latch barrier passed for WaitingTask 0  
*///:~
```

上面的示例中，WaitingTask将会阻塞，直到所有的TaskPortion执行完成，TaskPortion完成之后调用了`countDown()`方法，注意，`countDown()`方法是在finally块中调用的，这是为了防止TaskPortion出现异常而导致任务一直阻塞。当计数器为0后，我们看到WaitingTask成功执行。

`await()`还有一个重载方法`await(long, TimeUnit)`，避免任务让线程一直等待。

