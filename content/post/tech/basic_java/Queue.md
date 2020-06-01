---
title: "Queue—Java集合框架系列之二"
date: 2020-05-02
lastmod: 2020-05-27
draft: false
tags: [Java基础, 集合框架]
categories: [Java]
author: "wangy325"

hasJCKLanguage: true

weight: 10
mathjax: true
autoCollapseToc: false

---

Queue（队列），实际开发过程中，在单线程环境下使用的情况下不多，Queue作为集合框架中重要组成似乎习惯性被忽略，队列总是先持有元素，再处理元素[^注1]

<!--more-->

![J7NBrQ.png](/endlessriver/img/Queue.png)

<p style="text-align:center;font-size:.9rem;font-style:italic">Queue继承关系简图</p>



除了Collection定义的操作之外，Queue定义了额外的插入/删除/检查元素的操作，这些操作有2种形式：


|             | *Throws Exception* | *Returns special value* |
| :---------: | :----------------: | :---------------------: |
| **Insert**  |       add(e)       |        offer(e)         |
| **Remove**  |      remove()      |         poll()          |
| **Examine** |     element()      |         peek()          |


如表所示，add/remove/element方法失败后抛出异常。offer/poll/peek方法失败后返回一个特殊值（null或false，视具体操作不同），需要说明的是，`offer()`方法主要是为**有容量限制的队列**设计的

典型的队列遵从FIFO( *first-in-first-out* )原则，FIFO队列的新元素总是插入到队尾

当然有例外，**PriorityQueue** 就是之一，它根据给定（或默认）的比较器决定元素顺序；此外还有LIFO( *last-in-first-out* )队列（如栈）

不管是何种队列，都可以使用`remove()`或`poll()`**移除并返回** 队列头元素，至于头元素是“谁”就由队列的排序规则决定。此二者的区别体现在当队列为空时，`remove()`抛出异常，而`poll()`返回`null`

`element()`和`peek()`**获取但不移除** 队列头元素，区别在于当队列为空时，`element()`抛出异常，而`peek()`返回`null`

`offer()`方法尝试向队列中插入一个元素，否则返回`false`，而`Collection.add`方法失败之后会抛出（运行时）异常。因此`offer()`方法适用于定容或有界队列中插入元素

队列中不允许插入`null`，或者说**不应**将`null`插入队列中（LinkedList允许空值），因为`null`会作为队列方法的特殊返回值（空队列指示器）出现，若将`null`抽入队列，会引发歧义

**Queue有两个子接口：**

1. BlockingQueue

   Queue中并没有定义 **阻塞队列** 的相关方法，阻塞队列通常在 **并发编程** 中使用。阻塞队列的方法会等待元素出现或（有限）集合空间可用这2个条件之一满足才执行

2. Deque

   **双端队列** 是支持从 **队首和队尾添加/删除元素** 的线性集合，一般来说，Deque **没有容量限制**，但是其也支持有限长度的实现

   Deque定义了支持从双端访问元素的方法，和Queue一样，方法作用有3，形式有2:

   <table BORDER CELLPADDING=3 CELLSPACING=1>
     <tr>
       <td></td>
       <td ALIGN=CENTER COLSPAN = 2> <b>First Element (Head)</b></td>
       <td ALIGN=CENTER COLSPAN = 2> <b>Last Element (Tail)</b></td>
     </tr>
     <tr>
       <td></td>
       <td ALIGN=CENTER><em>Throws exception</em></td>
       <td ALIGN=CENTER><em>Special value</em></td>
       <td ALIGN=CENTER><em>Throws exception</em></td>
       <td ALIGN=CENTER><em>Special value</em></td>
     </tr>
     <tr>
       <td><b>Insert</b></td>
       <td ALIGN=CENTER>addFirst(e)</td>
       <td ALIGN=CENTER>offerFirst(e)</td>
       <td ALIGN=CENTER>addLast(e)</td>
       <td ALIGN=CENTER>offerLast(e)</td>
     </tr>
     <tr>
       <td><b>Remove</b></td>
       <td ALIGN=CENTER>removeFirst()</td>
       <td ALIGN=CENTER>pollFirst()</td>
       <td ALIGN=CENTER>removeLast()</td>
       <td ALIGN=CENTER>pollLast()</td>
     </tr>
     <tr>
       <td><b>Examine</b></td>
       <td ALIGN=CENTER><a>getFirst()</a></td>
       <td ALIGN=CENTER>peekFirst()</td>
       <td ALIGN=CENTER><a>getLast()</a></td>
       <td ALIGN=CENTER>peekLast()</td>
     </tr>
    </table>

   与Queue不同的是，获取而不删除的方法由`element()`变成了`getXXX()`，这些方法用来在队列头/尾中插入/删除/检查元素，当操作失败时有不同的处理：一组直接抛出异常，一组返回一个特殊值（null或false），同样地，返回特殊值的方法适用于有限容量的队列

   由于Deque继承自Queue，当**其作为Queue使用时，是一个FIFO队列**，新元素会添加至队尾，删除操作删除队首元素，因此下表的方法在Deque作为Queue使用时是等价的：


| Queue Methods | Equivalent Deque Methods |
| :-----------: | :----------------------: |
|    add(e)     |        addLast(e)        |
|   offer(e)    |       offerLast(e)       |
|   remove()    |      removeFirst()       |
|    poll()     |       pollFirst()        |
|   element()   |        getFirst()        |
|    peek()     |       peekFirst()        |


   此外，**Deque还可以作为LIFO队列**（栈）使用，当作为栈使用时，新元素会从队首添加或删除，这种情况下，`java.util.Stack`的方法和Deque的方法是等价的：

| Stack Methods | Equivalent Deque Methods |
| :-----------: | :----------------------: |
|    push(e)    |       addFirst(e)        |
|     pop()     |      removeFirst()       |
|    peek()     |       peekFirst()        |

   > ArrayDeque 就是一个LIFO队列实现

   和List不同的是，Deque**不提供**使用索引操作集合的方法

   和Queue一样，虽然没有严格约束不能插入`null`到队列中，也强烈不推荐将`null`值插入，原因和Queue是一样的

   除此之外，Deque还提供2个删除元素的方法：

   > boolean removeFirstOccurrence(Object o);
   >
   > boolean removeLastOccurrence(Object o);

### 1 PriorityQueue

**优先级队列**是一个有序队列，其**底层是由堆( *heap* )实现的**，堆是一个可以自我调整的**二叉树**。优先级队列的排序依据可以来自元素的自然排序（实现Comparable接口）或自定义比较器，当使用自然排序规则时，优先级队列不允许插入non-comparable对象

优先级队列不允许`null`值

优先级队列的第一个元素(head)总是按照排序规则计算出最小元素，如果有几个相等的最小元素，那么head为其中任意一个，当使用`poll(`)或`remove()`后，其他最小元素自动移动至head

> 优先级队列并没有对所有元素进行排序

优先级队列是自动扩容的，其扩容机制为：

- 当队列较小时（<64），容量翻倍
- 当队列长度>64时，容量增加一半（和ArrayList 一样）

优先级队列也有迭代器，此迭代器不能按照指定排序规则顺序迭代元素——优先级队列并没有对所有元素进行排序，若想获得所有元素的排序，可以使用`Arrays.sort(pq.toArray())`

参考下例：

```java
static void unsorted(){
  Queue<Integer> pq = new PriorityQueue<>();
  pq.add(7);
  pq.add(1);
  pq.add(12);
  pq.add(6);
  pq.add(9);
  pq.add(1);
  System.out.println("pq: " + Arrays.toString(pq.toArray()));
  Object[] array = pq.toArray();
  Arrays.sort(array);
  System.out.println("sorted array:" + Arrays.toString(array));
  // the least element always in the head of queue
  pq.poll();
  pq.forEach((e) ->{
    System.out.print(e + "\t");
  });
}
/* output:
pq: [1, 6, 1, 7, 9, 12]
sorted array:[1, 1, 6, 7, 9, 12]
1	6	12	7	9
*///:~
```

和上面的叙述一样，PriorityQueue并没有对所有元素进行排序，不过其保证了最小元素始终在队首，并且队列发生结构性变化时，队列中的元素“位置”也会发生变化

下例展示了如何在PriorityQueue中使用自定义比较器：

```java
static void userComparator() {
  class PC {
    private String model;
    private Double price;

    private PC(String model, Double price) {
      this.model = model;
      this.price = price;
    }
  }

  // compare by price descend
  Queue<PC> pq = new PriorityQueue<>((o1, o2) -> (int) (o2.price - o1.price));
  pq.add(new PC("dell", 15499d));
  pq.add(new PC("apple", 18899d));
  pq.add(new PC("samsung", 8999d));
  pq.add(new PC("asus", 12999d));
  pq.add(new PC("hp", 6399d));
  pq.add(new PC("lenovo", 16999d));

  pq.forEach(e -> System.out.print(e.price + "\t"));
  System.out.println();
  pq.remove();
  pq.forEach(e -> System.out.print(e.price + "\t"));
  System.out.println();
  pq.remove();
  pq.forEach(e -> System.out.print(e.price + "\t"));
  System.out.println();

  // compare by model ascend
  Queue<PC> pq1 = new PriorityQueue<>((o1,o2) -> (o1.model.compareTo(o2.model)));
  pq1.add(new PC("samsung", 8999d));
  pq1.add(new PC("apple", 18899d));
  pq1.add(new PC("lenovo", 16999d));
  pq1.add(new PC("asus", 12999d));
  pq1.add(new PC("dell", 15499d));
  pq1.add(new PC("hp", 6399d));
  pq1.forEach(e -> System.out.print(e.model + "\t"));
  System.out.println();
  pq1.remove();
  pq1.forEach(e -> System.out.print(e.model + "\t"));
  System.out.println();
  pq1.remove();
  pq1.forEach(e -> System.out.print(e.model + "\t"));
}
/* output:
18899.0	15499.0	16999.0	12999.0	6399.0	8999.0
16999.0	15499.0	8999.0	12999.0	6399.0
15499.0	12999.0	8999.0	6399.0
apple	asus	hp	samsung	dell	lenovo
asus	dell	hp	samsung	lenovo
dell	lenovo	hp	samsung
*///:~
```

从结果来看，元素在PriorityQueue里**并不是全排序的**，不过其会自动将”最小“的元素移动至队首

此例中，如果不在构造器中指定比较器，PriorityQueue会在运行时抛出 `ClassCastException`——试图将`PC`向上转型为Comparable时异常

### 2 LinkedList

LinkedList是Deque的实现，可以作为双端队列使用，其实现了Deque声明的所有方法

想讲LinkedList作为Deque使用，须将其声明为 Deque

```java
Deque<String> deque = new LinkedList<>();
```

LinkedList基于链表节点的灵活性，很容易就能够实现在首尾两端对元素进行操作

### 11.2.3 ArrayDeque

ArrayDeque是由**循环数组**实现的双端队列，没有容量限制，并且能够自动扩容，**不允许** 插入`null`值

ArrayDeque作为栈（ *LIFO* 队列）使用时，效率比`java.util.Stack`高

ArrayDeque作为Queue使用时，效率比LinkedList高

ArrayDeque的迭代器也是 *fail-fast* 的，意味着和ArrayList一样，在获取迭代器之后使用集合方法对队列进行结构性修改会引发 *ConcurrentModificationException*

ArrayDeque主要的字段域有：

```java
transient Object[] elements;
transient int head;
transient int tail;
private static final int MIN_INITIAL_CAPACITY = 8;
```

elements用于存储数据，head和tail分别用来标记队列的头尾。 *MIN_INITIAL_CAPACITY* 是创列的最小容量（2<sup>3</sup>）。当构造器没有指定容量时，初始化容量为16；只有当指定容量且**数值小于8时**才会使用8作为初始容量

<span id="resize">参考如下源码</span>：

```java
// ArrayDeque初始化时容量的计算
private static int calculateSize(int numElements) {
  int initialCapacity = MIN_INITIAL_CAPACITY;
  // Find the best power of two to hold elements.
  // Tests "<=" because arrays aren't kept full.
  if (numElements >= initialCapacity) {
    initialCapacity = numElements;
    initialCapacity |= (initialCapacity >>>  1);
    initialCapacity |= (initialCapacity >>>  2);
    initialCapacity |= (initialCapacity >>>  4);
    initialCapacity |= (initialCapacity >>>  8);
    initialCapacity |= (initialCapacity >>> 16);
    initialCapacity++;

    if (initialCapacity < 0)   // Too many elements, must back off
      initialCapacity >>>= 1;// Good luck allocating 2 ^ 30 elements
  }
  return initialCapacity;
}
```

若指定容量>8时，那么需要对其进行 **5次右移及位或运算保证最终的容量大小是2<sup>n</sup>**，比如传进来的参数是13，那么最后得到的容量就是2<sup>4</sup>

ArrayDeque中，当`head==tail`时触发扩容，容量增加一倍

参考如下源码：

```java
public void addFirst(E e) {
    //...
    if (head = (head - 1) & (elements.length - 1) == tail)
      doubleCapacity();
    //...
}
public void addLast(E e) {
    //...
    if (tail = (tail + 1) & (elements.length - 1) == head)
      doubleCapacity();
    //...
}
public E pollFirst() {
    //...
    if (head = (h + 1) & (elements.length - 1) == tail)
      doubleCapacity();
  	//...
}
public E pollLast() {
  	//...
    if (tail = (tail - 1) & (elements.length - 1) == head)
      doubleCapacity();
    //...
}
// 扩容
private void doubleCapacity() {
  assert head == tail;
  int p = head;
  int n = elements.length;
  int r = n - p; // number of elements to the right of p
  int newCapacity = n << 1;
  if (newCapacity < 0)
    throw new IllegalStateException("Sorry, deque too big");
  Object[] a = new Object[newCapacity];
  System.arraycopy(elements, p, a, 0, r);
  System.arraycopy(elements, 0, a, r, p);
  elements = a;
  head = 0;
  tail = n;
}
```

一般地，循环队列都是使用**模运算**实现的，而ArrayDeque通过**位运算**来实现循环队列，Java集合框架中很多地方都使用了位运算（如HashMap的扩容），位运算和模运算有如下关系：

> x % 2<sup>n</sup> = x & (2<sup>n</sup> - 1)

并且**位运算的效率远远高出模运算**，这就是Java设计的高明之处

当触发扩容时，将容量增加一倍，同时使用两次`System.arraycopy`将原数组拷贝到新数组中，现引用[ArrayDeque扩容](https://www.jianshu.com/p/b65c22587bdb)将其机制作简要阐述：

> 假如默认容量16，此时数组情况如图
> ![JOvQtx.png](/endlessriver/img/ArrayDeque_full.png)
>
> 当再次调用`addFirst("G")`时，
>
> ![JOvUHA.png](/endlessriver/img/ArrayDeque_full_2.png)
>
> 此时head==tail，触发扩容，将会创建一个大小为 **16*2** 的新数组，然后通过两次拷贝将原数组的数据复制到新数组
>
> - 第一次将***G-H***拷贝到新数组
> - 第二次将***A-F***拷贝到新数组
>
> ![JOvXU1.jpg](/endlessriver/img/ArrayDeque_full_3.jpg)
>
> <p style="text-align:center;font-style:italic;font-size:.9rem">ArrayDeque扩容图解<sup>  来源见水印</sup></p>

参考如下示例：

```java
void initializationTest() throws Exception {
  Deque<Integer> aq = new ArrayDeque<>(5);
  // actual circle array size: 8
  System.out.println("array size : " + getElements(aq).length);
  // double capacity while i = 7
  for (int i = 0; i < 8; i++) {
    aq.offerLast(i);
  }
  Object[] elements = getElements(aq);
  System.out.println(Arrays.toString(elements));
  aq.addLast(19);
  aq.forEach(e-> System.out.print(e + "\t"));
}

private <T> T[] getElements(Deque<?> aq) throws Exception {
  Class<?> cls = ArrayDeque.class;
  Field ef = cls.getDeclaredField("elements");
  ef.setAccessible(true);
  return  (T[]) ef.get(aq);
}
/* output:
array size : 8
[0, 1, 2, 3, 4, 5, 6, 7, null, null, null, null, null, null, null, null]
0	1	2	3	4	5	6	7	19
*///~
```

ArrayDeque的具体方法就不再赘述了，其囊括了作为Queue以及Stack的的实现


[^注1]: *A collection designed for holding elements prior to processing*
