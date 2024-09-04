---
title: "并发组件-Semaphore"
date: 2020-11-16
author: "wangy325"
weight: 21
categories: [java]
tags: [并发]
BookToC: false
---

## Semaphore

无论是显式锁还是通过`synchronized`关键字获取的隐式锁，其在任一时刻都只能让一个任务访问资源，而`Semaphore`（计数信号量）允许多个任务同时访问资源。可以把`Semaphore`看作是持有对象访问许可（permits）的“security”。访问对象时，须先通过`acquire()`获取许可，若此时没有许可可用，那么`acquire()`将阻塞，否则获取许可，可用许可数-1；使用完资源后，通过`release()`方法返还许可。事实上，并没有实际上的许可证对象，`Semaphore`通过协同各个线程工作，来达到目的。

`Semaphore`的构造器接受一个“公平性参数”。不传入此参数或传入*false*时，线程获取许可的顺序无法保证，即使线程阻塞了很久，其仍然可能被刚调用`acquire()`方法的线程“抢走”许可，这可能会导致线程“饿死”。当传入*true*时，`Semaphore`保证线程获取许可的顺序和其调用`acquire()`方法之后被执行的顺序一致[^4]，也就是先执行的任务先获取许可（FIFO）。需要说明的是，`tryAcquire()`方法不遵循公平性原则，如果有许可可用，它直接获取之。在使用`Semaphore`时，一般将其设置为**公平**的

[^4]: 并不能保证先调用`acquire()`方法的线程就能先获得许可，而是先调用方法的线程先执行内部逻辑的线程优先获取许可。所以有可能线程a先于线程b调用`acquire()`方法，但是却晚于线程b到达“等待点”。


`Semaphore`通常用于限制访问资源的线程数量，典型的例子就是控制“池”的并发访问量。下例中使用`Semaphore`控制池中的对象方法，当需要使用时，可以将它们“签出”（checkout），使用完毕之后再将其“签入”（checkin），使用泛型类封装功能[^5]。

[^5]: 这个示例演化自`Semaphore`的javaDoc: https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/Semaphore.html，来自TIJ。

```java
class Pool<T> {
    private final int size;
    final List<T> items = new ArrayList<>();
    private final boolean[] checkedOut;
    private final Semaphore available;

    public Pool(Class<T> classObject, int size) {
        this.size = size;
        checkedOut = new boolean[size];
        available = new Semaphore(size, true);
        // Load pool with objects that can be checked out:
        for (int i = 0; i < size; ++i) {
            try {
                // Assumes a default constructor:
                items.add(classObject.newInstance());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    T checkOut() throws InterruptedException {
        available.acquire();
        return getItem();
    }

    void checkIn(T x) {
        if (releaseItem(x)) {
            available.release();
            System.out.println("release " + x);
        }
    }

    void checkAllIn() {
        available.release(releaseAll());
    }

    private synchronized T getItem() {
        for (int i = 0; i < size; ++i) {
            if (!checkedOut[i]) {
                checkedOut[i] = true;
                return items.get(i);
            }
        }
        // Semaphore prevents reaching here
        return null;
    }

    private synchronized boolean releaseItem(T item) {
        int index = items.indexOf(item);
        if (index == -1) {
            return false; // Not in the list
        }
        if (checkedOut[index]) {
            checkedOut[index] = false;

            return true;
        }
        // Wasn't checked out
        return false;
    }

    private synchronized int releaseAll() {
        int r = 0;
        for (int i = 0; i < items.size(); i++) {
            if (checkedOut[i]) {
                checkedOut[i] = false;
                ++r;
            }
        }
        return r;
    }
}
```

这个池使用`checkout`和`checkIn`方法来签出和签入对象，在签出对象之前调用`acquire()`，如果没有可用对象，那么`checkOut`将阻塞。由于Semaphore的机制，`checkOut`方法并不需要使用同步，但是`getItem`方法则需要同步了，Semaphore协同多线程对资源的访问，但是并不能保证多线程对资源修改的并发安全，这是两回事[^6]。`checkIn`方法则判断给定对象是否被使用，是则签入之，否则不做任何操作，同样的，`releaseItem`方法也需要使用同步。

> *The semaphore encapsulates the synchronization needed to restrict access to the pool, separately from
any synchronization needed to maintain the consistency of the pool itself.*

[^6]: 如果使用是个“许可证数”为1的`Semaphore`，其作用相当于一个独占锁，任意时刻只有一个任务能够获取许可并且对资源进行修改，此时，`getItem`方法可以不使用同步。

接下来我们可以测试这个池能否正常工作了:

```java
public class SemaphoreDemo {

    private static class AcquireTask<T> implements Runnable {
        private static int counter = 0;
        private final int id = counter++;
        private final Pool<T> pool;

        public AcquireTask(Pool<T> pool) {
            this.pool = pool;
        }

        @Override
        public void run() {
            try {
                T item = pool.checkOut();
                System.out.println(this + " acquire " + item);
            } catch (InterruptedException e) {
                // Acceptable way to terminate
            }
        }

        @Override
        public String toString() {
            return "CheckoutTask-" + id;
        }
    }

    private static class ReleaseTask<T> implements Runnable {
        private static int counter = 0;
        private final int id = counter++;
        private final Pool<T> pool;

        public ReleaseTask(Pool<T> pool) {
            this.pool = pool;
        }

        @Override
        public void run() {
            try {
                List<T> items = pool.items;
                for (T item : items) {
                    pool.checkIn(item);
                }
            } catch (Exception e) {
                // Acceptable way to terminate
            }
        }

        @Override
        public String toString() {
            return "AcquireTask-" + id + " ";
        }
    }

    private static class Fat {
        private volatile double d; // Prevent optimization
        private static int counter = 0;
        private final int id = counter++;

        public Fat() {
            // Expensive, interruptible operation:
            for (int i = 1; i < 10000; i++) {
                d += (Math.PI + Math.E) / (double) i;
            }
        }

        @Override
        public String toString() {
            return "Fat-" + id;
        }
    }

    final static int SIZE = 5;

    private void test() throws InterruptedException {
        final Pool<Fat> pool = new Pool<>(Fat.class, SIZE);
        ExecutorService exec = Executors.newCachedThreadPool();
        for (int i = 0; i < SIZE; i++) {
            exec.execute(new AcquireTask<>(pool));
        }
        exec.execute(new ReleaseTask<>(pool));
        List<Fat> list = new ArrayList<>();
        for (int i = 0; i < SIZE; i++) {
            Fat f = pool.checkOut();
            System.out.println(i + ": main() acquire " + f);
            list.add(f);
        }
        Future<?> blocked = exec.submit(() -> {
            try {
                // Semaphore prevents additional checkout,
                // so call is blocked:
                pool.checkOut();
            } catch (InterruptedException e) {
                System.out.println("checkOut() Interrupted");
            }
        });
        TimeUnit.SECONDS.sleep(2);
        blocked.cancel(true); // Break out of blocked call
        // release all items
        pool.checkAllIn();
        for (Fat f : list) {
            pool.checkIn(f); // Second checkIn ignored
        }
        exec.shutdown();
    }

    public static void main(String[] args) throws Exception {
        SemaphoreDemo semaphoreDemo = new SemaphoreDemo();
        semaphoreDemo.test();
    }
}
/* output(sample)
AcquireTask-0 acquire Fat-0
AcquireTask-4 acquire Fat-4
AcquireTask-3 acquire Fat-3
AcquireTask-2 acquire Fat-2
AcquireTask-1 acquire Fat-1
release Fat-0
0: main() acquire Fat-0
release Fat-1
1: main() acquire Fat-1
release Fat-2
2: main() acquire Fat-2
release Fat-3
3: main() acquire Fat-3
release Fat-4
4: main() acquire Fat-4
checkOut() Interrupted
*///:~
```

上例`SemaphoreDemo`有两个任务，分别用于签入签出对象，程序首先使用`AcquireTask`签出所有对象，接着使用`ReleaseTask`签入对象。主线程接着依次签出所有对象，可以看到，主线程的签出过程是被阻塞的，只有对象签入之后，才能被签出。主线程签出所有对象之后，由于没有签入任务，接着的签出任务一定是被阻塞的，主线程休眠2s后中断了阻塞的任务。

---


