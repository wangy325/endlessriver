---
title: "CompletionService"
date: 2020-11-03
author: "wangy325"
weight: 16
categories: [java]
tags: [concurrency]
BookToC: false
---


在提交单个任务时，使用`submit()`或者`execute()`方法或许能够满足要求，但如果需要控制多个任务时，依次提交的操作看起来“有些繁琐”，此时我们可以使用`ExecutorService`提供的`invokeAny/invokeAll`方法，在介绍`CompletionService`接口时，我们不妨先看看这两个方法。

之前介绍`AbstractExecutorService`时提到，这两个方法是在这个抽象类中实现的，其中前者在获取到一个任务的返回值时便取消其他（未执行或正在执行的任务）任务，而后者需要等待所有的任务执行完成之后才能对任务的返回进行处理，接下来我们分别来看：

`invokeAll`会阻塞等待所有的任务执行完成。

```java
public <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks)
    throws InterruptedException {
    if (tasks == null)
        throw new NullPointerException();
    ArrayList<Future<T>> futures = new ArrayList<Future<T>>(tasks.size());
    boolean done = false;
    try {
        for (Callable<T> t : tasks) {
            RunnableFuture<T> f = newTaskFor(t);
            futures.add(f);
            execute(f);
        }
        // 有序迭代
        for (int i = 0, size = futures.size(); i < size; i++) {
            Future<T> f = futures.get(i);
            if (!f.isDone()) {
                try {
                    // 阻塞等待任务执行完成
                    f.get();
                } catch (CancellationException ignore) {
                } catch (ExecutionException ignore) {
                }
            }
        }
        done = true;
        return futures;
    } finally {
        if (!done)
            // 处理因异常而未正常执行的任务
            for (int i = 0, size = futures.size(); i < size; i++)
                futures.get(i).cancel(true);
    }
}

// invokeAny
public <T> T invokeAny(Collection<? extends Callable<T>> tasks)
    throws InterruptedException, ExecutionException {
    try {
        return doInvokeAny(tasks, false, 0);
    } catch (TimeoutException cannotHappen) {
        assert false;
        return null;
    }
}
private <T> T doInvokeAny(Collection<? extends Callable<T>> tasks,
                          boolean timed, long nanos)
    throws InterruptedException, ExecutionException, TimeoutException {
    if (tasks == null)
        throw new NullPointerException();
    int ntasks = tasks.size();
    if (ntasks == 0)
        throw new IllegalArgumentException();
    ArrayList<Future<T>> futures = new ArrayList<Future<T>>(ntasks);
    ExecutorCompletionService<T> ecs =
        new ExecutorCompletionService<T>(this);

    try {
        // Record exceptions so that if we fail to obtain any
        // result, we can throw the last exception we got.
        ExecutionException ee = null;
        final long deadline = timed ? System.nanoTime() + nanos : 0L;
        Iterator<? extends Callable<T>> it = tasks.iterator();

        // Start one task for sure; the rest incrementally
        futures.add(ecs.submit(it.next()));
        --ntasks;
        int active = 1;

        for (;;) {
            // 并没阻塞第一个任务，此时可能第一个任务还未执行完
            Future<T> f = ecs.poll();
            if (f == null) {
                if (ntasks > 0) {
                    --ntasks;
                    // 不等待上一个任务的结果，直接新执行一个任务
                    futures.add(ecs.submit(it.next()));
                    ++active;
                }
                else if (active == 0)
                    break;
                else if (timed) {
                    f = ecs.poll(nanos, TimeUnit.NANOSECONDS);
                    if (f == null)
                        throw new TimeoutException();
                    nanos = deadline - System.nanoTime();
                }
                else
                    // 没有可执行的任务了，则等待一个结果
                    f = ecs.take();
            }
            // 有结果则返回
            if (f != null) {
                --active;
                try {
                    return f.get();
                } catch (ExecutionException eex) {
                    ee = eex;
                } catch (RuntimeException rex) {
                    ee = new ExecutionException(rex);
                }
            }
        }

        if (ee == null)
            ee = new ExecutionException();
        throw ee;

    } finally {
        for (int i = 0, size = futures.size(); i < size; i++)
            // 取消还未执行或者执行中的任务
            // 中断任务
            futures.get(i).cancel(true);
    }
}
```

可以看到，与`invokeAll`不同的是，`invokeAny`方法是在循环的启动任务，直到获取到任一任务的返回值为止，而未执行或正在执行的任务则会被中断。

下面的示例中，我们修改了[阻塞队列-查找关键字](./6阻塞队列使用2例.md/#查找关键字)应用，让任务在成功搜寻到含有关键字的文件时就视为任务完成，取消其他任务的执行，这样一种场景之下，我们可以使用`invokeAny`方法：

```Java
public class Search1Keyword extends SearchKeyword {

    String empty = "";

    public static void main(String[] args) {
        Search1Keyword s1k = new Search1Keyword();
        s1k.find();
    }

    @Override
    void find() {
        // 带资源的try块
        try (Scanner in = new Scanner(System.in)) {
            System.out.print("Enter keyword (e.g. volatile): ");
            keyword = in.nextLine();

            Producer p = new Producer();
            List<Callable<String>> tasks = new ArrayList<>();

            ExecutorService pool = Executors.newCachedThreadPool();

            for (int i = 1; i <= 10; i++) {
                // run consumer
                tasks.add(new Consumer1());
            }
            pool.execute(p);
            // 此方法并不那么单纯，其结果只取一个，但是任务可能执行了多个
            String res = pool.invokeAny(tasks);
            System.out.println(res);
            pool.shutdown();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    class Consumer1 implements Callable<String> {

        @Override
        public String call() throws Exception {
            try {
                while (!done) {
                    File file = queue.take();
                    if (file == DUMMY) {
                        done = true;
                    } else {
                        String s = search1(file, keyword);
                        if (s.length() > 0) {
                            return s;
                        }
                    }
                }
            } catch (Exception e) {
                // ignore
            }
            return empty;
        }
    }

    public String search1(File file, String keyword) throws FileNotFoundException {
        StringBuilder sb = new StringBuilder("");

        try (Scanner in = new Scanner(file, "UTF-8")) {
            int lineNumber = 0;
            while (in.hasNextLine()) {
                if (!Thread.interrupted()) {
                    lineNumber++;
                    String line = in.nextLine();
                    if (line.contains(keyword)) {
                        sb.append("[").append(Thread.currentThread().getName()).append("]: ")
                            .append(file.getPath()).append(lineNumber).append(line).append("\n");
                    }
                } else {
                    // thread interrupted by future.cancel()
                    System.out.printf("[%s] %s%n", Thread.currentThread().getName(), " interrupted");
                    return empty;
                }
            }
        }
        return sb.toString();
    }
}
/* output (sample1)
Enter keyword (e.g. volatile): take
[pool-1-thread-5]: TestBlockingQueue.java39    LiftOff take() throws InterruptedException {
[pool-1-thread-5]: TestBlockingQueue.java40        return rockets.take();
[pool-1-thread-5]: TestBlockingQueue.java65                    LiftOff rocket = take();
[pool-1-thread-5]: TestBlockingQueue.java78                System.out.println("Interrupted during take()");

[pool-1-thread-11]  interrupted
[pool-1-thread-10]  interrupted
[pool-1-thread-6]  interrupted
[pool-1-thread-4]  interrupted
[pool-1-thread-9]  interrupted
[pool-1-thread-3]  interrupted
[pool-1-thread-7]  interrupted
[pool-1-thread-8]  interrupted

(sample2)
Enter keyword (e.g. volatile): take
[pool-1-thread-4]: Search1Keyword.java66                    File file = queue.take();

[pool-1-thread-2]  interrupted
[pool-1-thread-10]  interrupted
[pool-1-thread-8]  interrupted
[pool-1-thread-5]  interrupted
[pool-1-thread-11]  interrupted
[pool-1-thread-7]  interrupted
[pool-1-thread-9]  interrupted
*/
```

我们将对一个包含关键字的文件进行的完整搜寻视为任务结束，虽然还可能有其他文件还有关键字，但是搜寻任务不再执行。从输出可以看到，输出的只包含一个文件的关键字信息。另外，我们使用10个任务，其中sample1中其他9个任务都被中断，而sample2中只有7个任务被interrupt，说明情况1中，所有的任务都开始执行了，而情况2中，还有未开始执行的任务(其永远不能执行了)。

试着思考一个问题，既然`invokeAny`只需要获取一个任务的返回值即可，那为什么不直接启动第一个任务然后阻塞获取其返回值，而要启动（那么）多任务呢？启动一个任务不是更加简单么？

我们分析源码时，发现invokeAny使用了`ExecutorCompletionService`，这个类继承自接口`CompletionService`，可以用来管理任务提交之后的`Future<T>`对象——将已经完成的`Future`其放在一个阻塞队列中取用，这样我们就可以回答上面的问题了：

`invokeAny`利用`ExecutorCompletionService`提交任务，并管理任务的返回，这样可以避免单独启动一个任务而需要阻塞很长时间的弊端，启动的多个任务只要有一个任务完成，其放置已完成Future的阻塞队列将变得可用而使invokeAny快速结束。

`ExecutorCompletionService`的快速用法为:

```java
ExecutorCompletionService<T> ecs = new ExecutorCompletionService<>(executor) ;
for(Callable<T> task : tasks){
    ecs.submit(task);
}
for (int i = 0; i < tasks.size() ; i++ ) {
    // get return value
    ecs.take().get();
}
```
