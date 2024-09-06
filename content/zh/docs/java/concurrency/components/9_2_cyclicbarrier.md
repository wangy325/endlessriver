---
title: "CyclicBarrier"
date: 2020-11-16
author: "wangy325"
weight: 20
categories: [java]
tags: [并发]
BookToC: false
---


## CyclicBarrier

`CyclicBarrier`被称为“同步屏障”，事实上就可以把它理解为一个屏障，多个任务调用屏障的`await()`方法将被阻塞，直到所有的任务都进入阻塞，那么屏障开启，所有任务继续执行。这看起来和`CountDownLatch`非常像，不过`CountDownLatch`只能触发一次，而`CyclicBarrier`可以多次重用，这是它们的主要区别之一。

和`CountDownLatch`一样，`CyclicBarrier`接受一个整型参数，表示可限制的线程数。除此之外，`CyclicBarrier`还可以接受一个`Runnable`作为参数，这个参数称作`barrierAction`，`barrierAction`在所有线程到达屏障之后即开始执行，其他任务**只能等待**`barrierAction`执行完毕之后才能继续执行，这是`CyclicBarrier`和`CountDownLatch`的区别之二。

<!--more-->

```java
public class TestCyclicBarrier {

    private static StringBuffer sb = new StringBuffer();
    /** CyclicBarrier的构造器任务总是会先执行完毕 */
    static CyclicBarrier c = new CyclicBarrier(2, () -> {
        sb.append(3);
    });
    private static final int ASSERT_VALUE = 312;

    static int run() {
        Thread t = new Thread(() -> {
            try {
                c.await();
            } catch (Exception e) {
                // ignore;
            }
            sb.append(1);
        });
        t.start();
        try {
            c.await();
            sb.append(2);
            t.join();
        } catch (Exception e) {
            // ignore
        }
        return Integer.parseInt(sb.toString()) | (sb.delete(0, sb.length())).length();
    }

    public static void main(String[] args) {

        for (; ; ) {
            int r;
            if ((r = run()) != ASSERT_VALUE) {
                // should be 321
                System.out.println(r);
                return;
            }
        }
    }
}
```

上例中，barrier有一个`barrierAction`和2个“屏障任务”，main方法的输出大概率为312，小概率为321，不会出现其他结果，所以main方法无论执行多长时间，其总会结束。由于`barrierAction`总是先执行，故结果总是3xx[^1]，其先执行完毕的原因在源码中很容易找到：

```Java
//...
// 所有任务到达屏障
if (index == 0) {  // tripped
boolean ranAction = false;
try {
    final Runnable command = barrierCommand;
    //直接在当前线程调用command的run方法
    if (command != null)
        command.run();
    ranAction = true;
    nextGeneration();  // 唤醒所有线程
    return 0;
    } finally {
        if (!ranAction)
            breakBarrier();
    }
}
//...
```

不过，屏障开启后，任务的执行顺序完全是由cpu调度的。同时，本例中的`CyclicBarrier`是静态域，在main方法重复执行时，并不会重新初始化，因此也直接证明了`CyclicBarrier`的可重用性——屏障开启后，任务继续执行后调用屏障的`await()`方法同样会阻塞而等待所有任务到达屏障，依次循环。

下例的“赛马游戏”[^2]完美地阐述了`CyclicBarrier`可以多次重用的特点，马每次跑一步，不过不同的马步长不同，等待所有的马都“跑出这一步”后，屏障开启，先确定是否有马到达终点，如有则结束赛跑，否则继续下一轮，直到有马越过终点线，下面是示例代码：

```java
public class HorseRace {

    static class Horse implements Runnable {
        private static int counter = 0;
        private final int id = counter++;
        private int strides = 0;
        private static Random rand = new Random(47);
        private static CyclicBarrier barrier;

        public Horse(CyclicBarrier b) {
            barrier = b;
        }

        public int getStrides() {
            return strides;
        }

        @Override
        public void run() {
            try {
                while (!Thread.interrupted()) {
                    strides += rand.nextInt(3); // Produces 0, 1 or 2
                    barrier.await();
                }
            } catch (InterruptedException e) {
                // A legitimate way to exit
            } catch (BrokenBarrierException e) {
                // This one we want to know about
                throw new RuntimeException(e);
            }
        }

        @Override
        public String toString() {
            return "Horse " + id + " ";
        }

        public String tracks() {
            StringBuilder s = new StringBuilder();
            for (int i = 0; i < getStrides(); i++) {
                s.append("*");
            }
            s.append(id);
            return s.toString();
        }
    }

    static final int FINISH_LINE = 20;
    private List<Horse> horses = new ArrayList<>();
    private ExecutorService exec = Executors.newCachedThreadPool();
    private CyclicBarrier barrier;

    /** 这是一构造器 */
    public HorseRace(int nHorses, final int pause) {
        barrier = new CyclicBarrier(nHorses, () -> {
            StringBuilder s = new StringBuilder();
            for (int i = 0; i < FINISH_LINE; i++) {
                s.append("="); // The fence on the racetrack
            }
            System.out.println(s);
            for (Horse horse : horses) {
                System.out.println(horse.tracks());
            }
            for (Horse horse : horses) {
                if (horse.getStrides() >= FINISH_LINE) {
                    System.out.println(horse + "won!");
                    exec.shutdownNow();
                    return;
                }
            }
            try {
                TimeUnit.MILLISECONDS.sleep(pause);
            } catch (InterruptedException e) {
                System.out.println("barrier-action sleep interrupted");
            }
        });
        for (int i = 0; i < nHorses; i++) {
            Horse horse = new Horse(barrier);
            horses.add(horse);
            exec.execute(horse);
        }
    }

    public static void main(String[] args) {
        int nHorses = 7;
        int pause = 200;
        if (args.length > 0) { // Optional argument
            int n = new Integer(args[0]);
            nHorses = n > 0 ? n : nHorses;
        }
        if (args.length > 1) { // Optional argument
            int p = new Integer(args[1]);
            pause = p > -1 ? p : pause;
        }
        new HorseRace(nHorses, pause);
    }
}
```

实际上程序通过获取每匹马的`strides`域来判断马是否到达终点。在TIJ原书中，对`strides`域的有关操作做了同步处理，而本例中移除了这些同步，这是否安全？虽然CyclicBarrier的`barrierAction`和`HorseRace`都访问了`strides`域，不过，二者访问域的时间一定是错开的：前者在所有马都到达屏障后开始访问，而此时的马处于阻塞状态，而马获得访问权时，`barrierAction`一定没在执行[^11]。因此本例中，不使用同步也是安全的。

[^11]: 虽然是这样，但上述代码并不能保证对`strides`的内存可见性，main线程获取的可能不是最新值，使用`volatail`关键字修饰`strides`域可解决问题。

`CyclicBarrier`还有一些特殊方法：

    public void reset();
        这个方法将CyclicBarrier重置到初始状态
        注意，这个方法会导致已经在屏障处等待的线程抛出BrokenBarrierException
        如果确实需要一个新的CyclicBarrier来执行操作，新建一个实例是更好的选择

    public int getNumberWaiting() ;
        这个方法获取在屏障等待的线程数

    public int getParties() ;
        这个方法获取所有的线程数（用来构建CyclicBarrier实例的int入参）

{{< hint danger >}}
下面的例子展示了在任务执行时**重置**`CyclicBarrier`的操作，这个示例只是为了展示上面几个方法的用法，**千万不要**在执行任务时贸然去做这样的操作！如果处理不得当将很大可能引发阻塞或其他并发问题。
{{< /hint >}}

>笔者本意是计划执行批量任务，这些任务有一个域来计算其运行次数，并可能在某个任务上调用`CyclicBarrier`的`reset()`方法，在`reset()`调用之前和之后的任务其运行次数会有差别，通过这个运行差异在`barrierAction`中来终结线程池。事实上这个预想完全落空了，`reset()`之后，如果不再次使所有线程重新到达屏障处等待，`barrierAction`就不可能执行。

```java
public class ResetCyclicBarrier {
    static void reSetBarrierIf(int parties, int bound) {
        TaskMayFail[] tasks = new TaskMayFail[parties];
        ThreadPoolExecutor exec = (ThreadPoolExecutor) Executors.newCachedThreadPool();
        exec.setKeepAliveTime(0, TimeUnit.SECONDS);
        AtomicInteger ai = new AtomicInteger();
        CyclicBarrier c2 = new CyclicBarrier(parties, () -> {
            // if reset barrier while task is running, the
            // barrier action can not reach in this cycle
            // until relaunch all parties to reach at barrier
            // in next round
            int i = 0;
            int r = tasks[i].runtime;
            while (i < parties) {
                if (r != tasks[i].runtime) {
                    System.out.println(tasks[i] + ":" + tasks[i].runtime + ": " + r);
                    exec.shutdownNow();
                    return;
                }
                r = tasks[i].runtime;
                i++;
            }
        });

        for (int i = 0; i < parties; i++) {
            TaskMayFail taskMayFail = new TaskMayFail(c2, ai, bound);
            tasks[i] = taskMayFail;
            exec.execute(taskMayFail);
        }
    }

    private static class TaskMayFail implements Runnable {
        static Random rand = new Random();
        static int count = 1;
        final CyclicBarrier cb;
        final AtomicInteger reSetCount;
        final int bound;
        final int id = count++;
        int runtime = 0;


        public TaskMayFail(CyclicBarrier cb, AtomicInteger reSetCount, int bound) {
            this.cb = cb;
            this.reSetCount = reSetCount;
            this.bound = bound;
        }

        @Override
        public String toString() {
            return "[TaskMayFail-" + id + "-runtime-" + runtime + "]";
        }

        @Override
        public void run() {
            try {
                while (!Thread.currentThread().isInterrupted()) {
                    if (rand.nextBoolean()) {
                        // bound值可调整reset的概率
                        if (rand.nextInt(bound) == 0) {
                            throw new ArithmeticException();
                        }
                    }
                    runtime++;
                    cb.await();
                }
            } catch (ArithmeticException ae) {
                reSetCount.incrementAndGet();
                while (cb.getNumberWaiting() < (cb.getParties() - reSetCount.intValue())) {
                    // waiting for all parties reach at barrier
                    // or all parties throws exception
                }
                // reset barrier
                cb.reset();
                System.out.printf("%s-%s reset %s%n",
                    Thread.currentThread().getName(),
                    this,
                    cb);
            } catch (InterruptedException | BrokenBarrierException ae) {
                reSetCount.incrementAndGet();
                // once barrier reset, other parties wait on barrier
                // will throw BrokenBarrierException
                System.out.printf("%s-%s return by broken barrier.%n",
                    Thread.currentThread().getName(),
                    this);
            } finally {
                Thread.currentThread().interrupt();
            }
        }

        public static void main(String[] args) {
            reSetBarrierIf(13, 100);
        }
    }
}
/* output (sample)
pool-1-thread-3-[TaskMayFail-3-runtime-19] reset java.util.concurrent.CyclicBarrier@618bfe9a
pool-1-thread-4-[TaskMayFail-4-runtime-20] return by broken barrier.
pool-1-thread-9-[TaskMayFail-9-runtime-20] return by broken barrier.
pool-1-thread-8-[TaskMayFail-8-runtime-20] return by broken barrier.
pool-1-thread-5-[TaskMayFail-5-runtime-20] return by broken barrier.
pool-1-thread-12-[TaskMayFail-12-runtime-20] return by broken barrier.
pool-1-thread-7-[TaskMayFail-7-runtime-20] return by broken barrier.
pool-1-thread-13-[TaskMayFail-13-runtime-20] return by broken barrier.
pool-1-thread-1-[TaskMayFail-1-runtime-20] return by broken barrier.
pool-1-thread-11-[TaskMayFail-11-runtime-20] return by broken barrier.
pool-1-thread-2-[TaskMayFail-2-runtime-20] return by broken barrier.
pool-1-thread-10-[TaskMayFail-10-runtime-20] return by broken barrier.
pool-1-thread-6-[TaskMayFail-6-runtime-19] reset java.util.concurrent.CyclicBarrier@618bfe9a
*///:~
```

从输出可以看到，`CyclicBarrier`可以重复使用。上例的设计很巧妙，因为屏障在开启之后，任务可能很快就抛出`ArithmeticException`而进入`reset`流程，而此时其他任务可能在屏障处等待或者还未执行，若此时贸然`reset`，那些等待的线程会抛出`BrokenBarrierException`并退出，但是未执行的线程并未意识到`reset`的发生（可以这么表述），依然进入阻塞，如果没有再次任务进入`reset`流程，程序很快将因为没有足够多的线程到达屏障而阻塞[^3]。

所以，上例引入一个原子变量，用于跟踪进入`reset`和已经退出的任务数，那么剩余的线程应该就是到达屏障的线程数，利用这个限制来保证**所有的线程都得到处理**，以简化问题的复杂性，一旦确定所有的线程都被处理，就可以执行`reset()`方法。同时`reset()`之后，`barrierAction`便无法执行。

---

[^1]: 这个示例演化自[《Java并发编程的艺术》方腾飞等.著](https://book.douban.com/subject/26591326/)，第八章8.2节代码清单8-4。不过该书中关于这段代码的运行解释是不正确的，本例也证明了这一点。
[^2]: 《Thinking in Java》 4th Edition, 第21章21.7.2示例代码。
[^3]: 就算有任务再次进入了`reset`流程，也依然可能存在上面描述的问题，这仅仅增加了程序运行的不稳定性。
