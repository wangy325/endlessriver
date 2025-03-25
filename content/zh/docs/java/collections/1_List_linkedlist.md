---
title: "LinkedList"
date: 2020-04-29
categories: [java]
tags: [集合框架]
author: "wangy325"
weight: 2
---


`LinkedList`是基于**双向链表**实现的有序集合，~~其不能像ArrayList一样通过索引(*index*)访问元素~~，同时`LinkedList`还实现了`Deque`接口，意味着`LinkedList`可以**实现双端队列的操作**。

<!--more-->

![JIv7Ae.png](/img/collections/LinkedList.png)

<p style="text-align:center;font-style:italic;font-size:.8rem;color:grey">LinkedList继承关系图</p>

链表将每个对象存放在独立的节点(Node)中，节点中还保存对序列中前、后节点的引用。理论上，`LinkedList`**没有容量限制**（取决于你的物理内存大小）。

![J4sq7d.png](/img/collections/doubly-linked_list.png)

<p style="text-align:center;font-style:italic;font-size:.8rem;color:grey">LinkedList的基本数据结构<sup> from Core Java</sup></p>

### Node(节点)

**Node**（节点）是`LinkedList`的存储载体，每向`LinkedList`中增加/删除一个元素，就会增加/减少一个Node，Node定义了3个字段，其含义分别是：

> `E item`：存入`LinkedList`的内容
>
> `Node<E> prev`：前一个节点的引用
>
> `Node<E> next`：后一个节点的引用

结合`LinkedList`的字段来看，`LinkedList`定义了两个个Node相关的引用：

> `transient Node<E> first`：总是指向`LinkedList`的第一个节点
>
> `transient Node<E> last`：总是指向`LinkedList`的最后一个节点

`LinkedList`有如下规律：

1. `first.prev`总是为`null`
2. `last.next`总是为`null`
3. 当LinkedList只有一个元素时，`first == last`

下面的代码验证了上述推论：

```java
static void initializeTest() throws Exception {
  List<String> a = new LinkedList<>();
  a.add("google");
  //        a.add("chrome");
  //        a.add("photos");

  Class<?> cls = LinkedList.class;
  // LinkedList field
  Field ff = cls.getDeclaredField("first");
  Field lf = cls.getDeclaredField("last");
  ff.setAccessible(true);
  lf.setAccessible(true);
  Object first =  ff.get(a);
  Object last = lf.get(a);
  Class<?> node = Class.forName("java.util.LinkedList$Node");
  // LinkedList$Node field
  Field item = node.getDeclaredField("item");
  Field next = node.getDeclaredField("next");
  Field prev = node.getDeclaredField("prev");
  item.setAccessible(true);
  next.setAccessible(true);
  prev.setAccessible(true);
  // first
  System.out.println("first: " + first);
  Object firstItem = item.get(first);
  Object firstPrev = prev.get(first); // Node
  Object firstNext = next.get(first); // Node
  System.out.println("\t" + "item: " + firstItem +"\n\t" +
                     "prev: " + firstPrev + "\n\t" +
                     "next: " + firstNext + "\n");
  // last
  System.out.println("last: " + last);
  Object lastItem = item.get(last);
  Object lastPrev = prev.get(last);
  Object lastNext = next.get(last);
  System.out.println("\t" + "item: " + lastItem +"\n\t" +
                     "prev: " + lastPrev + "\n\t" +
                     "next: " + lastNext);
}
/* output:
first: java.util.LinkedList$Node@512ddf17
  item: google
  prev: null
  next: null

last: java.util.LinkedList$Node@512ddf17
  item: google
  prev: null
  next: null

// 当有3个元素时，first的next == last的prev
first: java.util.LinkedList$Node@512ddf17
  item: google
  prev: null
  next: java.util.LinkedList$Node@2c13da15

last: java.util.LinkedList$Node@77556fd
  item: photos
  prev: java.util.LinkedList$Node@2c13da15
  next: null
*///:~
```

利用Node，对链表中的元素的删除和插入操作将变得便利，只需要同时修改自身及前后节点的引用即可将元素置入链中。

参考如下源码：

```java
/**
 * Inserts element e before non-null Node succ.
 */
void linkBefore(E e, Node<E> succ) {
  // assert succ != null;
  final Node<E> pred = succ.prev;
  final Node<E> newNode = new Node<>(pred, e, succ);
  succ.prev = newNode;
  if (pred == null)
    first = newNode;
  else
    pred.next = newNode;
  size++;
  modCount++;
}
```

上述源码解释了如何将一个新的元素插入到链表中。

### 迭代器

`LinkedList`没有 *Iterator* 的实现，只有 *ListIterator* 的实现，里面定义了相当充分的操作元素的方法，由于`LinkedList`也是`List`的实现类，故也可调用接口定义的`iterator()`方法[^4]，不过其实际上返回的是 *LinkedList.ListIterator* 实例。

[^4]: 这和`ArrayList`的`ListIterator`没有实现`hasNext()`一样，实际上也是可以使用的(接口动态绑定超类方法)，这种情况在集合框架中很常见

![JoCYkT.png](/img/collections/LinkedList调用iterator的时序图.png)

<p style="color:grey;font-size:.8rem;font-style:italic;text-align:center">LinkedList调用iterator()的时序图</p>

尽管如此，由于使用`LinkedList.iterator()`方法返回的是Iterator，其对集合的操作性降低到只有4个方法。由于我们知道其实际返回的是Listiterator，我们可以将该返回值**向下转型**：

```java
ListIterator<String> i = (ListIterator<String>) list.iterator();
// 等价于
ListIterator<String> listIterator = list.listIterator();
// 等价于
ListIterator<String> listIterator1 = list.listIterator(0);
```

参考如下示例：

```java
static void iteratorTest(){
  List<String> list = new LinkedList<String>(){{
    add("Java");
    add("Python");
    add("JavaScript");
    add("C");
  }};
  ListIterator<String> i = (ListIterator<String>) list.iterator();
  while (i.hasNext()){
    if (i.next().equals("JavaScript")){
      i.set("JS");
    }
  }
  i.remove();
  i.add("C++");
  // 反向迭代
  while (i.hasPrevious()){
    System.out.println(i.previous());
  }
  System.out.println("-------");
  ListIterator<String> iterator = list.listIterator(2);
  iterator.forEachRemaining(System.out::println);
}
/* output:
C++
JS
Python
Java
-------
JS
C++
*///:~
```

> ListIterator\<E\> listIterator(int index);
>
> 此方法用于获取 *index* （含）之后的元素的迭代器

### 与ArrayList对比

`ArrayList`的优势在于可以利用 *index* 快速访问集合中的元素，劣势在于对于容量大的集合，插入和删除的效率稍低。

`LinkedList`基于链表，~~插入和删除操作效率高~~<sup>并不总这样</sup>；但由于没有元素索引( *index* )，使用`get(int index)`和`set(int index , E e)`的效率稍低[^6]

[^6]: `LinkedList`使用和索引相关的操作`get()`/`set()`/`add()`/`remove()`的效率是一致的

在`LinkedList`中，和索引相关的操作有：

```java
public E get(int index)

public E set(int index, E element)

public void add(int index, E element)

public E remove(int index)

public int indexOf(Object o)  //获取对象首次出现的位置

public int lastIndexOf(Object o)  //获取对象最后出现的位置
```

除了`indexOf`和`lastIndexOf`方法之外，其他的四个方法的实现都和这个方法有关：

```java
public void add(int index, E element) {
  checkPositionIndex(index);

  if (index == size)
    linkLast(element);
  else
    linkBefore(element, node(index));
}
/**
 * Returns the (non-null) Node at the specified element index.
 */
Node<E> node(int index) {
  // assert isElementIndex(index);

  if (index < (size >> 1)) {
    Node<E> x = first;
    for (int i = 0; i < index; i++)
      x = x.next;
    return x;
  } else {
    Node<E> x = last;
    for (int i = size - 1; i > index; i--)
      x = x.prev;
    return x;
  }
}
```

可以看到，`node(int index)`**总是从头/尾开始逐一遍历**，当集合较大时，这种操作的效率是很低的。

既然如此，`LinkedList`**插入和删除的效率如何高**呢？答案就是**使用迭代器**，由于迭代器持有指针(*cursor*)，**免去了遍历集合获取节点的时间消耗**，因而插入和删除只需要修改前后节点的引用即可：

![JTEuRK.png](/img/collections/linkedlist_remove.jpg)

<p style="text-align:center;font-size:.8rem;font-style:italic;color:grey">从LinkedList删除一个元素<sup> from Core Java</sup></sup></p>

> 所以，不要在`LinkedList`中使用带有索引(*index*)参数的操作，这会大大降低程序的运行效率，若要使用索引，请使用`ArrayList`。

### 作为双端队列

`LinkedList`除了实现了`List`接口之外，还实现了`Deque`接口，也就是说，**LinkedList还是一个双端队列**，具体请参照[Queue](./2_Queue.md/#linkedlist)

---
