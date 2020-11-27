---
title: "List"
date: 2020-04-29
lastmod: 2020-05-27
draft: false
tags: [Java基础, 集合框架,list]
categories: [java]
author: "wangy325"

hasJCKLanguage: true

weight: 10
mathjax: true
autoCollapseToc: false

---

接下来的集合框架系列文章讲解了常见的集合框架实现，此系列涉及到的实现都是**线程不安全**的

![JXUL1s.png](/img/Collection.png)

<p style="text-align:center;font-style:italic;font-size:.9rem">Java集合框架简图</p>

<!-- > 1. 未列出枚举集（EnumSet/EnumMap）
> 2. 未列出IdentityHashMap
> 3. 未列出java.util.concurrent包下的实现 -->

上图列出了集合框架的常见实现，Java集合框架系列文章介绍了图中列出的大部分内容

<!--more-->

## List

List是**有序集合**，或称之为**序列**。List的实现可以准确地控制插入元素的位置，也可以通过元素的**索引**(*index*)访问之，还可以在集合中搜索元素

和[Set](#set)不同，List允许元素重复出现，甚至允许多个null元素出现

List定义了4个由索引执行的操作

> E get(int index);
>
> E set(int index, E element);
>
> void add(int index, E element);
>
> E remove(int index);

ArrayList由于实现了`RandomAccess`接口，其在使用索引随机访问时性能不会受影响，但是LinkedList执行索引操作的耗时是与集合大小正相关的。因此，在不清楚List的实现类型的时候[^7]，通**过迭代器遍历集合中的元素进行操作比直接使用索引更可取**

List提供了一个独有的迭代器***ListIterator***，其提供了插入/替换元素的操作，并且支持**双向迭代**

### 1 ArrayList

ArrayList是Java集合框架中使用最为频繁的实现，其本质是一个**有序的**可自由扩容的**对象数组**。它实现了`RandomAccess`这个**标记接口**，意味着其在随机访问性能上有一定优势

下图显示了ArrayList的继承关系

![JIvHtH.png](/img/ArrayList.png)

<p style="text-align:center;font-style:italic;font-size:.9rem">ArrayList继承关系</p>

#### 1.1 初始化及扩容机制

ArrayList初始化为一个空的对象数组，如果**不在构造对象时指定初始容量大小，那么ArrayList的默认初始化一个容量为10的对象数组**，其扩容规则是每当新增加对象超出对象数组的容量时，将对象数组的容量**增加当前容量的1/2**

参考如下示例：

```java
static void initializeTest() throws NoSuchFieldException, IllegalAccessException {
  List<Integer> list = new ArrayList<>();
  // initial size = 10

  for (int i = 0; i <16; i++){
    list.add(new Random().nextInt(100));
    // 本体是elementData
    Field field = list.getClass().getDeclaredField("elementData");
    field.setAccessible(true);
    // 获取list的“elementData”
    Object[] o = (Object[]) field.get(list);
    // size是ArrayList的长度，length是elementData的长度
    System.out.println("size = " + (i+1) + ",
                       length = " + o.length + " ,
                       element = " + Arrays.toString(o));
   }
}
/* output:
size = 1, length = 10 ,element = [15, null, null, null, null, null, null, null, null, null]
size = 2, length = 10 ,element = [15, 15, null, null, null, null, null, null, null, null]
size = 3, length = 10 ,element = [15, 15, 31, null, null, null, null, null, null, null]
size = 4, length = 10 ,element = [15, 15, 31, 40, null, null, null, null, null, null]
size = 5, length = 10 ,element = [15, 15, 31, 40, 47, null, null, null, null, null]
size = 6, length = 10 ,element = [15, 15, 31, 40, 47, 26, null, null, null, null]
size = 7, length = 10 ,element = [15, 15, 31, 40, 47, 26, 47, null, null, null]
size = 8, length = 10 ,element = [15, 15, 31, 40, 47, 26, 47, 41, null, null]
size = 9, length = 10 ,element = [15, 15, 31, 40, 47, 26, 47, 41, 91, null]
size = 10, length = 10 ,element = [15, 15, 31, 40, 47, 26, 47, 41, 91, 69]
size = 11, length = 15 ,element = [15, 15, 31, 40, 47, 26, 47, 41, 91, 69, 32, null, null, null, null]
size = 12, length = 15 ,element = [15, 15, 31, 40, 47, 26, 47, 41, 91, 69, 32, 94, null, null, null]
size = 13, length = 15 ,element = [15, 15, 31, 40, 47, 26, 47, 41, 91, 69, 32, 94, 25, null, null]
size = 14, length = 15 ,element = [15, 15, 31, 40, 47, 26, 47, 41, 91, 69, 32, 94, 25, 11, null]
size = 15, length = 15 ,element = [15, 15, 31, 40, 47, 26, 47, 41, 91, 69, 32, 94, 25, 11, 80]
size = 16, length = 22 ,element = [15, 15, 31, 40, 47, 26, 47, 41, 91, 69, 32, 94, 25, 11, 80, 86, null, null, null, null, null, null]
*///:~
```

ArrayList的内容存储在`elementData`对象数组中，通过在运行时获取对象信息，能够窥视ArrayList的初始化过程：

- `elementData`初始化为容量默认为10，内容为空的对象数组`new Object[10] = {}`

- 添加第10个元素时，此时`elementData`的容量也是10，无法容纳更多元素，需扩容，源码所见：

  ```java
  if (minCapacity - elementData.length > 0){
    int oldCapacity = elementData.length;
    // 扩容  扩容方式为将容量增加一半
    int newCapacity = oldCapacity + (oldCapacity >> 1);
    if (newCapacity - minCapacity < 0)
      newCapacity = minCapacity;
    if (newCapacity - MAX_ARRAY_SIZE > 0)
      newCapacity = hugeCapacity(minCapacity);
    // minCapacity is usually close to size, so this is a win:
    elementData = Arrays.copyOf(elementData, newCapacity);
  }
  ```

- 使用`Arrays.copyOf()`方法将`elementData`重新引用至新的拷贝数组——这一过程去尾

#### 1.2 迭代器

集合框架的继承关系图显示，Collection接口继承了 *Iterable* 接口，这意味着所有的集合实现都**可以使用迭代器**操作集合

作为使用最广的集合实现，ArrayList可以获取 *Iterator* 和 *ListIterator* 的实现，后者继承了前者，在前者的基础上新增了一些用于可逆迭代（ *cursor在集合中来回穿梭* ）的特性，如`previous()`，`previousIndex()`等方法

![JoCR9e.png](/img/Iterator.png)

<p style="font-size:.9rem; text-align:center;font-style:italic">迭代器方法表</p>

下面代码简单展示了迭代器的使用：

```java
static void iteratorTest() {
  List<String> a = new ArrayList<String>() {{
    add("apple");
    add("google");
    add("amazon");
    add("cisco");
    add("facebook");
    add("twitter");
  }};
  Iterator<String> iterator = a.iterator();
  a.remove(2);
  // throw ConcurrentModificationException
  //        System.out.println(iterator.next());
  // 重新获取迭代器，避免上述异常
  Iterator<String> newIterator = a.iterator();
  newIterator.next();
  // Java 8新增方法，迭代剩余元素
  newIterator.forEachRemaining(s -> {
    s= s.replaceFirst("g","G");
    System.out.println(s);
  });
}
/* output:
Google
cisco
facebook
twitter
*///:~
```

```java
static void listIteratorTest() {
  ListIterator<String> listIterator = a.listIterator();
  listIterator.next();
  // do not change cursor
  listIterator.set("Apple");
  listIterator.previous();
  while (listIterator.hasNext()) {
    System.out.println(listIterator.next());
  }
  System.out.println("-------");
  // cursor changed
  listIterator.remove();
  listIterator.add("TWITTER"); // cursor in the end
  // reverse output
  while (listIterator.hasPrevious()) {
    System.out.println(listIterator.previous());
  }
}
/* output:
Apple
google
twitter
-------
TWITTER
google
Apple
*///:~
```

关于**集合的迭代器**[^1]，作如下说明：

1 当集合和迭代器持有的“计数器”不一致时，迭代器的 *ConcurrentModificationException* 出现：

计数器：记录发生集合**结构性变化**的次数，一般指集合元素增删，更新集合元素值一般不会被视作结构性				变化[^2]；迭代器也维护一个计数器，此数字初始化为原集合计数器的值

需要记住的是，迭代器的计数器只能通过迭代器维护（ *调用迭代器的add()，remove()等方法会更新计数器* ），而集合的计数器却可以通过迭代器和集合维护，亦即通过迭代器更新的计数器会同步更新集合的计数器（ *因为迭代器方法也是通过集合方法实现的* ）；**反之不亦然**，记住，在获取迭代器之后，在使用**集合而非迭代器**的方法修改集合结构，那么迭代器会发生异常（ *2个计数器值不一致* ）

参考ArrayList.Itr.remove()[^3]源码：

```java
public void remove() {
  if (lastRet < 0)
    throw new IllegalStateException();
  checkForComodification();

  try {
    ArrayList.this.remove(lastRet);
    cursor = lastRet;
    lastRet = -1;
    // 更新计数器
    expectedModCount = modCount;
  } catch (IndexOutOfBoundsException ex) {
    throw new ConcurrentModificationException();
  }
}
final void checkForComodification() {
  // 一致性检查
  if (modCount != expectedModCount)
    throw new ConcurrentModificationException();
}
```


2 不论是 *Iterator* 或 *ListIterator* 接口在Java集合框架中都没有**独立的实现类**，都是作为**集合具体实现的内部类**存在的，这种机制使得不同的集合类型，拥有“定制”的迭代器类型，这意味着方法表并不是一成不变的，如ArrayList.ListIterator就缺失`hasNext()`方法

<img src="/img/listIterator_partial.png" alt="JfiSYj.png"  />

<p style="text-align:center;font-style:italic;font-size:.9rem"><span id="llterator">LinkedList</span>(左)和ArrayList(右)内部ListIterator的实现差异</p>

这种只定义接口**而使用内部类实现**的现象在Java集合框架中非常常见，理解这一点有利于理解**集合视图**( ***Collection view*** )，接下来这个概念将多次出现

按照理论，ListItr实现了ListIterator接口应该覆盖所有方法，Intellij IDEA编译器对于ArrayList的内部类ListItr给出了 *method should be defined since the class is not abstract*的批注，这或许是Java源码的豁免权

实际上，ArrayList.ListItr继承了ArrayList.Itr，因此，ListItr缺失的方法由Itr实现了

3 Java 8的改进

Java 8 新增的**函数式接口**，在集合框架中得到广泛使用，关于Java 8对集合框架的优化，后文将单独说明

在迭代器 *Iterator* 接口中，新增了一个方法

```java
default void forEachRemaining(Consumer<? super E> action) {
 Objects.requireNonNull(action);
 while (hasNext())
   action.accept(next());
}
```

这是一[默认方法](#default_method)，其接受一个 *Consumer* 参数，用来对元素执行操作，需要注意的是此迭代器的指针( *cursor* )并不是0，而是当前实际的指针，亦即此法用于**迭代还未被此迭代器迭代的元素**

#### 1.3 SubList

SubList是ArrayList的内部类，是方法`subList(int fromIndex, int toIndex)`的返回对象，也就是说，ArrayList.subList()的返回**不是一个ArrayList实例**，而是一个**视图**

所谓**集合视图**，可以通俗的理解为集合的内部类[^5]，如此Sublist，其一个主要的特点是**可以更改原集合**（作用可以理解为原集合的一个代理）

```java
private class SubList extends AbstractList<E> implements RandomAccess {
  //...
}
```

SubList可以看作一个"类ArrayList"，方法也有很多共性，而往往只需要注意差异即可

参考下例：

```java
static void subListTest(){
  List<String> a = new ArrayList<String>() {{
    add("apple");
    add("google");
    add("amazon");
    add("cisco");
  }};
  List<String> strings = a.subList(1, 2); // [google]
  System.out.println("Is subList instance of ArrayList? "
                     + (strings instanceof ArrayList)
                     + "\n-------");
  // a.add("Java") // ERROR! cause ConcurrentModificationException for subList
  ListIterator<String> subIterator = strings.listIterator();
  while (subIterator.hasNext()){
    subIterator.set(subIterator.next().toUpperCase() + " revised by subList");
  }
  // 增加元素
  subIterator.add("foobar added by subList");
  a.forEach(System.out::println);
  // 删除子集，父集也删除元素
  strings.clear();
  System.out.println("-------");
  a.forEach(System.out::println);
}
/* output:
Is subList instance of ArrayList? false
-------
apple
GOOGLE revised by subList
foobar added by subList
amazon
cisco
-------
apple
amazon
cisco
*///:~
```

之所以将其称为**视图**，一个很重要的原因就是，这个类所有**有利数据**全部来自外围类(ArrayList)，其能够修改外围类的能力来自于**直接对外围类方法的调用**[^11]：

```java
public void add(int index, E e) {
  rangeCheckForAdd(index);
  checkForComodification();
  // 实际上调用的就是外围类的方法
  parent.add(parentOffset + index, e);
  this.modCount = parent.modCount;
  this.size++;
}
```

实际上，可以将SubList理解为ArrayList实用工具的巧妙封装

> 和迭代器一样，获取SubList之后，对原集合进行结构性改变，也会引起*ConcurrentModificationException*

#### 1.4 插入与删除

前文提到，尽管ArrayList因实现了Random接口而具有很好的随机读取性，ArrayList也有一些缺点，比如**差强人意的插入和删除**

ArrayList方法：

```java
public void add(int index, E e) {...}
public E remove(int index) {...}
public boolean remove(Object o) {...}
...
```

实现了从插入集合到指定索引为止或从集合中删除（指定索引）元素，但这些操作并不是ArrayList的强项，拿`add(int index, E e)`为例：

```java
public void add(int index, E element) {
  rangeCheckForAdd(index);

  ensureCapacityInternal(size + 1);  // Increments modCount!!
  // 拷贝数组--实际上是将数组index位置以后的所有元素”后移一位“
  System.arraycopy(elementData, index, elementData, index + 1,
                   size - index);
  elementData[index] = element;
  size++;
}
```

同理，从ArrayList的删除相关方法中也可以看到类似的操作，这意味着在操作大量数据的时候，ArrayList可能会遇到性能问题。在对象数组长度很小时，这种影响一般可以忽略

### 2 LinkedList

LinkedList是基于**链表**的有序集合，~~其不能像ArrayList一样通过索引(*index*)访问元素~~，同时LinkedList还实现了双端队列Deque接口，意味着LinkedList可以**实现队列的操作**

![JIv7Ae.png](/img/LinkedList.png)

<p style="text-align:center;font-style:italic;font-size:.9rem">LinkedList继承关系图</p>

链表将每个对象存放在独立的节点(Node)中，节点中还保存对序列中前、后节点的引用。理论上，LinkedList**没有容量限制**

![J4sq7d.png](/img/doubly-linked_list.png)

<p style="text-align:center;font-style:italic;font-size:.9rem">LinkedList的基本数据结构<sup>  from Core Java</sup></p>

#### 2.1 Node

**Node**（节点）是LinkedList的存储载体，每向LinkedList中增加/删除一个元素，就会增加/减少一个Node，Node定义了3个字段，其含义分别是：

> E item：存入LinkedList的内容
>
> Node\<E\> prev：前一个节点的引用
>
> Node\<E\> next：后一个节点的引用

结合LinkedList的字段来看，LinkedList定义了两个个Node相关的引用：

> transient Node\<E\> first：总是指向LinkedList的第一个节点
>
> transient Node\<E\> last：总是指向LinkedList的最后一个节点

LinkedList有如下规律：

1. `first.prev`总是为null
2. `last.next`总是为null
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

利用Node，对链表中的元素的删除和插入操作将变得便利，只需要同时修改自身及前后节点的引用即可将元素置入链中

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

上述源码解释了如何将一个新的元素插入到链表中

#### 2.2 迭代器

LinkedList没有 *Iterator* 的实现，只有 *ListIterator* 的实现，里面定义了相当充分的[操作元素的方法](#llterator)，由于LinkedList也是List的实现类，故也可调用接口定义的`iterator()`方法[^4]，不过其实际上返回的是 *LinkedList.ListIterator* 实例

![JoCYkT.png](/img/LinkedList调用iterator的时序图.png)

<p style="font-size:.9rem;font-style:italic;text-align:center">LinkedList调用iterator()的时序图</p>

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

#### 2.3 对比ArrayList

ArrayList的优势在于可以利用 *index* 快速访问集合中的元素，劣势在于对于容量大的集合，插入和删除的效率稍低

LinkedList基于链表，~~插入和删除操作效率高~~<sup>并不总这样</sup>；但由于没有元素索引( *index* )，使用`get(int index)`和`set(int index , E e)`的效率稍低[^6]

在LinkedList中，和索引相关的操作有：

> public E get(int index)
>
> public E set(int index, E element)
>
> public void add(int index, E element)
>
> public E remove(int index)
>
> public int indexOf(Object o) 	获取对象首次出现的位置
>
> public int lastIndexOf(Object o)	获取对象最后出现的位置

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

可以看到，`node(int index)`**总是从头/尾开始逐一遍历**，当集合较大时，这种操作的效率是很低的

既然如此，LinkedList**插入和删除的效率如何高**呢？答案就是**使用迭代器**，由于迭代器持有指针(*cursor*)，**免去了遍历集合获取节点的时间消耗**，因而插入和删除只需要修改前后节点的引用即可：

![JTEuRK.png](/img/linkedlist_remove.png)

<p style="text-align:center;font-size:.9rem;font-style:italic">从LinkedList删除一个元素<sup> from Core Java</sup></sup></p>

> 所以，不要在LinkedList中使用带有索引(*index*)参数的操作，这会大大降低程序的运行效率，若要使用索引，请使用ArrayList

#### 2.4 作为双端队列

LinkedList除了实现了List接口之外，还实现了Deque接口，也就是说，**LinkedList还是一个双端队列**，具体请参照[Queue—Java集合框架系列之二](../queue/)


[^1]: 集合框架所有迭代器都是如此
[^2]: 这一论点的普适性有待验证
[^3]: 这只是一种表述形式，实际上ArrayList的迭代器是私有内部类，无法使用该语法访问，下同
[^4]: 这和ArrayList的ListIterator没有实现`hasNext()`一样，实际上也是可以使用的(接口动态绑定超类方法)，这种情况在集合框架中很常见
[^5]: 是否一直如此？集合框架中的视图（子集、键集、条目映射、Collections视图等等）都是基于基本接口的内部类实现
[^6]: LinkedList使用和索引相关的操作get()/set()/add()/remove()的效率是一致的
[^7]: 这种情况在获取集合视图(Collection view)时经常出现
[^8]: 每个桶里都有元素么？每个桶至多有多少元素？通过源码来看HashSet和HashMap一个桶里至多有一个元素

[^9]: 实际上使用put更新已有key的value时，触发的是另一个方法：`afterNodeAccess`，此方法将条目移动至队尾（如果使用访问顺序）
[^10]: 排序和查找有重载方法，具体请查看API文档
[^11]: SubList并没有集合视图的共性，其操作集合的方法是独特的；它被称为集合视图的原因是其不是标准的Java集合框架成员
