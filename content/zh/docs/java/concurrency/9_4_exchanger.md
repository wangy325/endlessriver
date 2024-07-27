---
title: "并发组件-Exchanger"
date: 2020-11-16
author: "wangy325"
weight: 22
categories: [java]
tags: [concurrency]
BookToC: false
---

##  Exchanger

`Exchanger`是在两个任务之间交换对象的栅栏。当这些任务进入栅栏时，各自拥有一个对象，离开时交换它们拥有的对象。栅栏可以用来设计缓存对象，2个任务分别来使用和清空缓存，当缓存空间满时，则在Exchanger上交换缓存，缓存得以重复使用[^7]。

<!--more-->

```java
public class DataBuffer<T> {

    private Queue<T> buffer;
    /** 利用size构造一个有界队列 */
    private final int size;

    public DataBuffer(Class<? extends Queue<T>> cls, int size) throws Exception {
        this(cls, size, null);
    }

    public DataBuffer(Class<? extends Queue<T>> cls, int size, Generator<T> gen) throws Exception {
        if (cls == null) throw new NullPointerException();
        // 检查cls的类型，如果不是队列，则抛出异常
        if (!Queue.class.isAssignableFrom(cls)) throw new ClassCastException();
        if (size < 0) throw new IllegalArgumentException();
        this.size = size;
        try {
            Constructor<? extends Queue<T>> c = cls.getConstructor(int.class);
            c.setAccessible(true);
            this.buffer = c.newInstance(size);
        } catch (NoSuchMethodException | SecurityException | InvocationTargetException e) {
            this.buffer = cls.newInstance();
        }

        if (gen != null) {
            for (int i = 0; i < size; i++)
                buffer.offer(gen.next());
        }
    }

    synchronized boolean isFull() {
        return buffer.size() >= size;
    }

    synchronized boolean isEmpty() {
        return buffer.isEmpty();
    }

    synchronized int bufferSize() {
        return buffer.size();
    }

    synchronized public Queue<T> getBuffer() {
        return buffer;
    }

    synchronized boolean addToBuffer(T t) {
        if (!isFull()) {
            return buffer.offer(t);
        }
        return false;
    }

    synchronized T takeFromBuffer() {
        if (!isEmpty()) {
            buffer.remove();
        }
        return null;
    }
}
```

`DataBuffer`接受一个`Queue<T>`类型参数，用来初始化缓存队列，并且利用size指定了缓存队列的容量，作为是“达到栅栏”的前置条件。

```java
public class BufferSwap {

    private class FillTask<T> implements Runnable {
        private DataBuffer<T> db;
        private final Exchanger<DataBuffer<T>> ex;
        private final Generator<T> gen;

        public FillTask(DataBuffer<T> db, Generator<T> gen, Exchanger<DataBuffer<T>> ex) {
            this.db = db;
            this.gen = gen;
            this.ex = ex;
        }

        @Override
        public void run() {
            try {
                while (db != null) {
                    if (db.isFull()) {
                        db = ex.exchange(db);
                    } else {
                        db.addToBuffer(gen.next());
                    }
                }
            } catch (InterruptedException e) {
                // right to exit here
            }
        }
    }

    private class EmptyTask<T> implements Runnable {

        private DataBuffer<T> db;
        private final Exchanger<DataBuffer<T>> ex;
        private final int ecLimit;

        public EmptyTask(DataBuffer<T> db, Exchanger<DataBuffer<T>> ex, int limit) {
            this.db = db;
            this.ex = ex;
            this.ecLimit = limit;
        }

        @Override
        public void run() {
            try {
                while (ec.intValue() < ecLimit) {
                    if (db.isEmpty()) {
                        db = ex.exchange(db);
                        ec.incrementAndGet();
                    } else {
                        db.takeFromBuffer();
                    }
                }
            } catch (InterruptedException e) {
                // exit by interrupted
            }
        }
    }

    /** 交换缓存的次数，用来限制程序的运行 */
    private final AtomicInteger ec = new AtomicInteger();

    /**
     * @param size  the buffer size
     * @param limit the exchange time limit
     */
    void test(int size, int limit) {
        Exchanger<DataBuffer<Fat>> xh = new Exchanger<>();
        Generator<Fat> generator = BasicGenerator.create(Fat.class);
        // ignore class check
        // can not solve the issue actually...
        DataBuffer<Fat> fullBuffer, emptyBuffer;
        try {
            fullBuffer = new DataBuffer(ArrayBlockingQueue.class, size, generator);
            emptyBuffer = new DataBuffer(ArrayBlockingQueue.class, size);
        } catch (Exception e) {
            System.out.println("initialization failure");
            return;
        }
        ExecutorService pool = Executors.newCachedThreadPool();
        Future<?> t1 = pool.submit(this.new FillTask(fullBuffer, generator, xh));
        Future<?> done = pool.submit(this.new EmptyTask<>(emptyBuffer, xh, limit));
        for (; ; ) {
            if (done.isDone()) {
                t1.cancel(true);
                break;
            }
        }
        pool.shutdown();
        Queue<Fat> full = fullBuffer.getBuffer();
        System.out.print("fullTask's buffer: ");
        for (Fat fat : full) {
            System.out.printf("%s\t", fat);
        }
        System.out.println();
        System.ocvnut.println("++++++++++++++++++++++++++++++++");
        Queue<Fat> empty = emptyBuffer.getBuffer();
        System.out.print("emptyTask's buffer:");
        for (Fat fat : empty) {
            System.out.printf("%s\t", fat);
        }
    }

    public static void main(String[] args) {
        BufferSwap bs = new BufferSwap();
        bs.test(10, 100);
    }
}
/* output
fillTask's buffer: Fat-1000	Fat-1001	Fat-1002	Fat-1003	Fat-1004	Fat-1005	Fat-1006	Fat-1007	Fat-1008	Fat-1009
++++++++++++++++++++++++++++++++
emptyTask's buffer: Fat-990	Fat-991	Fat-992	Fat-993	Fat-994	Fat-995	Fat-996	Fat-997	Fat-998	Fat-999
*///:~
```

`BufferSwap`中有2个任务，`FillTask`用来使用缓存，当缓存队列未满时，一直向缓存中添加对象，一旦缓存已满，则进入“栅栏”；而`EmptyTask`用来清空已满的缓存队列，知道缓存队列为空进入”栅栏”，同时为了限制缓存交换的次数，我们在缓存交换达到限制时停止`EmptyTask`。在`test()`方法中，我们初始化了2个缓存对象`fullBuffer`和`emptyBuffer`，前者会初始化一个满的缓存，后者则会初始化一个空的缓存。本例中传入的类型参数是`ArrayBlockingQueue.class`，并且忽略了类型检查[^8]。

之后提交这2个缓存任务，使用`Future<?>`来检查`EmptyTask`的状态并适时取消`FillTask`。这样做时可行的，因为`FillTask`一定会在最后一次交换之后继续使用而占满缓存空间进入“栅栏”处阻塞，使用`Future.cancel()`可以中断其阻塞并抛出中断异常，从而结束运行。随后重看2个任务阻塞队列中的对象，输出符合期望[^note]。

[^note]: 这里还存在一个潜在问题：`EmptyTask`完成时取消`FillTask`，`FillTask`的状态会影响程序的结果，若后者是在Exchanger处被阻塞时取消，那将抛出中断异常，程序输出如示例中说的那样；若后者在向缓存中添加对象时被中断，`shutdown()`方法无法立刻中止`FillTask`的运行，它将继续运行至进入栅栏而抛出异常，但是，主线程中的遍历(在使用普通队列时)就可能会抛出ConcorrentModificationException。解决此问题的方法是在`FillTask`中分别处理2种取消的情况，或者在主线程中使用`awaitTermination`等待`FillTask`抛出异常而终结。

[^7]: 这个示例演化自`Exchanger`的javaDoc：https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/Exchanger.html。
[^8]: 忽略类型检查的原因是因为尚不能处理泛型编程的所有问题。理论上这里传入任意Queue<T>实现类都是可以的，但是由于示例中所用的实例Fat并没有实现Comparable接口，所以当传入优先级队列时，构造器会抛出初始化异常。
