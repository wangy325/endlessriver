---
title: "synchronized关键字"
date: 2020-05-20
categories: [java]
tags: [并发]
author: "wangy325"
weight: 5
---


自Java 1.0开始，每一个对象都有一个隐式**内部锁**（ *intrinsic lock* ），在Java API Specification中通常被称为**监视器**（ *monitor* ）。这个内部锁由`synchronized`关键字提供支持。`synchronized`关键字的语义就是“同步的”，这意味着使用这个关键字可以处理共享资源的冲突。

当访问被`synchronized`关键字保护的方法或代码块时，它将检查锁能否获得——**这个锁可以是当前类对象的锁，也可以是一个临时锁**( *ad-hoc lock* )，取决你如何使用，任务执行完成之后会释放锁。

和`ReentrantLock`一样，`synchronized`关键字获取的锁也是**独占锁**，并且也是“可重入”的，某个任务可以多次获得对象的锁，并由计数器维护获得锁的次数，当退出一个方法时，计数器-1，完全退出时，才释放锁，这和可重入锁的机制是一样的。

<!--more-->

类对象也持有一个锁，也就是说`synchronized`关键字**可作用于静态方法**。

关于什么时候该使用同步， [*Brian Goetz*](https://inside.java/u/BrianGoetz/) 提出过**同步规则**：

> *若向一个变量写入值，它可能接下来被另一个线程读取，或者正在读取一个上一次由另一个线程写过的值，那么必须使用同步，并且读写线程都必须使用**相同的监视器**同步*。

**监视器**是由 *Per Brinch Hansen* 和 *Tony Hoare* 提出的一种**无锁机制**，最初的监视器具有如下特性：

1. 监视器是只包含私有域的类
2. 每个监视器的类对象有一个相关的锁
3. 使用该锁对所有相关的方法加锁
4. 该锁可以有任意多个相关条件

Java不完全地采用了监视器的设计概念，这就是`synchronized`关键字。

>在**使用synchronized关键字时，将共享域设为私有是非常重要的**。由于域只能通过方法访问，而`synchronized`保证方法执行的有序性；
>
>若域不是私有的，其他任务可以直接操作域，这就可能产生冲突。

### 同步方法

当`synchronized`关键字作用于方法时，表示这个方法是同步的，执行方法时，首先会尝试获取当前对象的锁——这个对象一般是类的实例对象（ *this* ），若是静态方法，便是类对象。

```java
public synchronized void transfer(int from, int to, double amount) 
throws InterruptedException {
  if (accounts[from] < amount) wait();  // can be interrupted
  if (from == to) return;
  // transfer
  accounts[from] -= amount;
  System.out.println(Thread.currentThread() + " move away");
  accounts[to] += amount;
  System.out.printf("%s: %10.2f from %d to %d, Total Balance: %10.2f%n",
                    Thread.currentThread(),
                    amount,
                    from,
                    to,
                    totalBalance());
  notifyAll();  // wake up all threads waiting on this monitor
}
```

考虑转账的任务，**只需要将transfer()方法加上synchronized关键字即可保证安全**，运行此方法时，线程会先去获取Bank实例的内部锁，并将其他线程阻塞，此线程完成之后会释放这个对象锁，其他线程方可继续运行。

继续思考之前的问题，对于使用`synchronized`关键字的`transfer()`方法，里面调用了`totalBalance()`方法，那`totalBalance()`方法是否需要同步呢？前面说过「是否加锁应该以[资源是否共享为参照](./2资源访问受限_2_锁和条件.md/#条件)」，这其实和“同步法则“是的表述是一致的。如果有多个线程访问`transfer()`方法，正好此方法是**串行访问**（有序访问）的，那么`totalBalance()`方法无需同步；若还有其他线程对访问`totalBalance()`方法的资源，那么必须使用同步。

### 同步代码块

`synchronized`关键字也可以用于同步代码块（同步阻塞）。

在用于同步方法时，相当于`synchronized(this)`，而同步代码块则多了一点灵活性。

```java
synchronized (obj){ // synchronized block
  // critical section
}
```

示例中的`obj`可以是 *this* ，也可以是其他对象。

考虑[资源访问受限引论中的EvenGenerator](./2资源访问受限_1.md/#evenGenerator)类，在`next()`方法中可以使用同步代码块加锁可保证安全性：

```java
static class EvenGenerator extends AbstractIntGenerator {
  private Integer even = 0;
  private Object lock = new Object();

  @Override
  public int next() {
    // equals to using
    // synchronized (this){
    synchronized (lock) {
      ++even;
      Thread.yield();
      ++even;
      // return语句必须包含在同步代码块里
      return even;
    }
  }
}
```

上例中，`synchronized`关键字使用了“其他对象”作为“监视器”，注意，`synchronized`代码块必须包括所有读写域的代码，**包括return语句**。

> ~~从[字节码](#byteCode)来看，return语句也不是原子性的——它要先加载并获取变量域even的值，然后再返回~~
>
> Java语言规范规定对变量的读写都是原子的（long和double）除外，因此return语句是原子的。但是**单一语句的原子性并不能保证多线程的安全性**，如果锁在return之前被释放，那么return可能获取到其他线程修改后的值。

可以看到，使用`synchronized`关键字比使用显式锁代码更加简洁。

需要注意的是，尽管synchronized代码块中的锁可以是任意对象的，但是尽量不要把这种任意性视为绝对安全的。**一般在同步代码块中使用this或某“不可变”域（上例中）的锁**。

考虑如下示例：

```java
static class Bank {
  private final Vector<Double> accounts;

  public Bank(int accountCount, double money) {
    // initialize bank account
    accounts = new Vector<>(accountCount);
    List<Double> doubles = Collections.nCopies(accountCount, money);
    accounts.addAll(doubles);
  }

  public void transfer(int from, int to, double amount) {
    synchronized (accounts) {
      if (accounts.get(from) < amount) return;
      if (from == to) return;
      // transfer
      accounts.set(from, accounts.get(from) - amount);
      System.out.println(Thread.currentThread() + " move away");
      accounts.set(to, accounts.get(to) + amount);
      System.out.printf("%s: %10.2f from %d to %d, Total Balance: %10.2f%n",
                        Thread.currentThread(),
                        amount,
                        from,
                        to,
                        totalBalance());
    }
  }
}
```

上例中使用Vector作为账户的容器，Vector是线程安全的实现，是否可以不加锁呢？

不是的，Vector只能保证其实现方法是线程安全的，并不能保证transfer方法是同步的。换言之，accounts.set()方法是同步的，其完成之后该线程可能被剥夺运行权。

作为改进，在`transfer()`方法中截获了accounts的锁，尝试使其同步，它是可行的。但是这是否意味着可以任意使用其他对象的锁呢？Java核心卷I给出一段晦涩的评论[^7]：

[^7]: Java核心技术卷1 第14章并发第14.5.6节同步阻塞

~~如果冒昧地使用某个其他域（**客户端锁定**）的锁，可能不能保证安全性~~


{{< hint warning >}}
> *This approach works, but it is entirely dependent on the fact that the Vector class uses the intrinsic lock for all of its mutator methods. However, is this really a fact? The documentation of the Vector class makes no such promise. You have to carefully study the source code and hope that future versions do not introduce unsynchronized mutators. As you can see, client-side locking is very fragile and not generally recommended.*
{{< /hint >}}

其晦涩之处在于，`synchronized`使用accounts的内部锁保证同步，和Vector方法使用的锁是不是accounts的内部锁有什么联系？

### 如何使用同步

从之前的阐述我们知道，如果多个线程同时对共享资源进行访问，并且至少有一个线程对资源进行了写操作，那就需要同步。

在编写同步代码的时候，我常常困惑，应该在哪里使用同步呢？究竟是在线程上同步还是应该在资源方法上同步，还是所有位置都需要同步？

接下来我们从两个维度去剖析“在哪里同步”这个问题。

#### 在资源上同步

```java
// 资源
synchronized void next(){
    x++;
}

// 任务1
run(){
    next();
}

// 任务2
run(){
    next();
}
```

这是常见的模式。当在资源上同步时，使用多线程执行任务1和任务2，都不会出现线程安全的问题。因为每一个对x进行操作的线程都会被同步阻塞。这就是资源的序列化访问。

#### 在任务上同步

```java

final Lock lock ;
// 资源
void next(){
    x++;
}

// 任务1
run(){
    synchronized(lock){
        next();
    }
}

// 任务2
run(){
    next();
}
```

如上代码示例所示，我们在任务1的`run()`方法上使用同步，当多个线程实例执行任务1时，x是线程安全的。

需要提出的是，`run()`方法中的`synchronized`使用的锁**不能是this**，如果是`this`，那么同步块将毫无作用。


{{< hint warning >}}
> 因为`synchronized`是对持有对象的可重入锁，而*this*并不是指代的某个实例，而是所有构造的实例。
>
>可以使用`ClassName.class`来持有类对象的锁来代替。
{{< /hint >}}

但是若此时有线程执行任务2，那么此代码的安全隐患就出现了：任务2的操作和任务1的操作就会互相干扰!

若想保证线程安全，那么任务2的next方法也要和任务1一样使用同步，并且**使用相同的对象锁**。

这样的条件下，同时运行任务1和任务2，那么线程会在`lock`对象上获取锁而进入同步阻塞，从而保证安全性，和在资源上同步的效果是等同的。

#### 建议

从代码的简洁性，可读性与可复用性上来讲，在资源上使用同步显得更加优雅，两种实现方式的代码可以进行比较直观的对比：

```java
// 在任务上同步
public TV call() {
    while (true) {
        synchronized (tick) {
            TV tv = tl.get();
            tv.setT(Thread.currentThread());
            if (tick.getTick()) {
                tv.setV((tv.getV() == null ? 0 : tv.getV()) + 1);
                tl.set(tv);
                try {
                    // 给其他线程机会
                    tick.wait(10);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            } else {
                if (!tick.isTickSupply) break;
            }
        }
    }
    return tl.get();
}

// 在资源上使用同步
public TV call() {
    while (true) {
        TV tv = tl.get();
        tv.setT(Thread.currentThread());
        // getTick()方法同步
        if (tick.getTick()) {
            tv.setV((tv.getV() == null ? 0 : tv.getV()) + 1);
            tl.set(tv);
            TimeUnit.MILLISECONDS.sleep(1);
        } else {
            if (!tick.isTickSupply) break;
        }
    }
    return tl.get();
}
```

上述代码的作用是一样的，可以看到，在资源上使用同步比在任务上使用同步的代码更加易读，简洁。

正如之前所说的，在资源上使用同步还可以避免新建任务时又重新设计同步逻辑。

因此，在资源上使用同步是建议的方式。

扩展阅读: https://docs.oracle.com/javase/tutorial/essential/concurrency/syncmeth.html

---

