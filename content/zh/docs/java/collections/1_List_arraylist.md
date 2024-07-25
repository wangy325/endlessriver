---
title: "ArrayList"
date: 2020-04-29
categories: [java]
tags: [collections]
author: "wangy325"
weight: 1
---


`ArrayList`是Java集合框架中使用最为频繁的实现，其本质是一个**有序的**可自由扩容的**对象数组**。它实现了`RandomAccess`这个**标记接口**，意味着其在随机访问性能上有一定优势。

<!--more-->


<center>

![JIvHtH.png](/img/collections/ArrayList.png)

<p style="color:grey;text-align:center;font-style:italic;font-size:.8rem">ArrayList继承关系</p>

</center>

###  初始化及扩容机制

`ArrayList`初始化为一个空的对象数组，如果**不在构造对象时指定初始容量大小，那么`ArrayList`的默认初始化一个容量为10的对象数组**，其扩容规则是每当新增加对象超出对象数组的容量时，将对象数组的容量**增加当前容量的1/2**。

参考如下示例：

```java
static void initializeTest() 
throws NoSuchFieldException, IllegalAccessException {
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
size = 1, length = 10 ,element = [15, ...]
size = 2, length = 10 ,element = [15, ...]
size = 3, length = 10 ,element = [15, ...]
size = 4, length = 10 ,element = [15, ...]
size = 5, length = 10 ,element = [15, ...]
size = 6, length = 10 ,element = [15, ...]
size = 7, length = 10 ,element = [15, ...]
size = 8, length = 10 ,element = [15, ...]
size = 9, length = 10 ,element = [15, ...]
size = 10, length = 10 ,element = [15, ...]
size = 11, length = 15 ,element = [15, ...]
size = 12, length = 15 ,element = [15, ...]
size = 13, length = 15 ,element = [15, ...]
size = 14, length = 15 ,element = [15, ...]
size = 15, length = 15 ,element = [15, ...]
size = 16, length = 22 ,element = [15, ...]
*///:~
```

`ArrayList`的内容存储在`elementData`对象数组中，通过在运行时获取对象信息，能够窥视`ArrayList`的初始化过程：

1. `elementData`初始化为容量默认为10，内容为空的对象数组`new Object[10] = {}`

2. 添加第10个元素时，此时`elementData`的容量也是10，无法容纳更多元素，需扩容，源码如下：

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

3. 使用`Arrays.copyOf()`方法将`elementData`重新引用至新的拷贝数组——这一过程去尾。数组扩容也有一定的开销，实际使用过程中最好预估并定义`ArrayList`的初始容量，避免因数据增长频繁扩容。

###  迭代器

集合框架的继承关系图显示，`Collection`接口继承了 *Iterable* 接口，这意味着所有的集合实现都**可以使用迭代器**操作集合。

作为使用最广的集合实现，`ArrayList`可以获取 *Iterator* 和 *ListIterator* 的实现，后者继承了前者，在前者的基础上新增了一些用于可逆迭代（ *cursor在集合中来回穿梭* ）的特性，如`previous()`，`previousIndex()`等方法。

<center>

<!-- ![JoCR9e.png](/img/collections/Iterator.png) -->
<img src =  "/img/collections/Iterator.png" alt = "" width="50%">

<p style="color:grey;font-size:.8rem; text-align:center;font-style:italic">迭代器方法表</p>

</center>

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

[^1]: 集合框架所有实现的迭代器都是如此


1. 当集合和迭代器持有的“计数器”不一致时，迭代器的 *ConcurrentModificationException* 出现：

    **计数器**：记录发生集合**结构性变化**的次数，一般指集合元素增删，更新集合元素值一般不会被视作结构性变化[^2]；迭代器也维护一个计数器，此数字初始化为原集合计数器的值。

    [^2]: 这一论点的普适性有待验证

    需要记住的是，迭代器的计数器只能通过迭代器维护（ *调用迭代器的add()，remove()等方法会更新计数器* ，因此不会抛出上述异常），而集合的计数器却可以通过迭代器和集合维护，亦即通过迭代器更新的计数器会同步更新集合的计数器（ *因为迭代器方法也是通过集合方法实现的* ）；**反之不亦然**，记住，在获取迭代器之后，在使用**集合而非迭代器**的方法修改集合结构，那么迭代器会发生异常（ *2个计数器值不一致* ）

    参考`ArrayList.Itr.remove()`[^3]源码：

    [^3]: 这只是一种表述形式，实际上`ArrayList`的迭代器是私有内部类，无法使用该语法访问，下同

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


2. 不论是 *Iterator* 或 *ListIterator* 接口在Java集合框架中都没有**独立的实现类**，都是作为**集合具体实现的内部类**存在的，这种机制使得不同的集合类型，拥有“定制”的迭代器类型，这意味着方法表并不是一成不变的，如`ArrayList.ListIterator`就缺失`hasNext()`方法。

    <center>

    ![list的迭代器（部分）](/img/collections/listIterator_partial.jpg)

    <p style="text-align:center;font-style:italic;font-size:.9rem;color:grey"><span id="llterator">LinkedList</span>(左)和ArrayList(右)内部ListIterator的实现差异</p>

    </center>

    这种只定义接口**而使用内部类实现**的现象在Java集合框架中非常常见，理解这一点有利于理解**集合视图**( ***Collection view*** )，接下来这个概念将多次出现。

    按照理论，`ListItr`实现了`ListIterator`接口应该覆盖所有方法，Intellij IDEA编译器对于ArrayList的内部类`ListItr`给出了 *method should be defined since the class is not abstract*的批注，这或许是Java源码的豁免权。

    实际上，`ArrayList.ListItr`同时也继承了`ArrayList.Itr`，因此，`ListItr`缺失的方法由`Itr`实现了。

3. Java 8的改进

    Java 8 新增的**函数式接口**，在集合框架中得到广泛使用，关于Java 8对集合框架的优化，后文将单独说明（挖坑？）。

    例如在迭代器 *Iterator* 接口中，新增了一个方法：

    ```java
    default void forEachRemaining(Consumer<? super E> action) {
    Objects.requireNonNull(action);
    while (hasNext())
      action.accept(next());
    }
    ```

    这是一[默认方法](../basic/6_抽象类与接口.md/#默认方法)，其接受一个 *Consumer* 参数，用来对元素执行操作，需要注意的是此迭代器的指针( *cursor* )并不是0，而是当前实际的指针，亦即此法用于**迭代还未被此迭代器迭代的元素**

### SubList(集合视图)

`SubList`是`ArrayList`的内部类，是方法`subList(int fromIndex, int toIndex)`的返回对象，也就是说，`ArrayList.subList()`的返回**不是一个ArrayList实例**，而是一个**视图**。

```java
public List<E> subList(int fromIndex, int toIndex) {
    subListRangeCheck(fromIndex, toIndex, size);
    return new SubList<>(this, fromIndex, toIndex);
}
```

所谓**集合视图**，可以通俗的理解为集合的内部类[^5]，如`Sublist`，其一个主要的特点是**可以更改原集合**（作用可以理解为原集合的一个代理）。

[^5]: 是否一直如此？集合框架中的视图（子集、键集、条目映射、Collections视图等等）都是基于基本接口的内部类实现

```java
private class SubList extends AbstractList<E> implements RandomAccess {
  //...
}
```

`SubList`可以看作一个"类ArrayList"，方法也有很多共性，而往往只需要注意差异即可。

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

[^11]: `SubList`并没有集合视图的共性，其操作集合的方法是独特的；它被称为集合视图的原因是其不是标准的Java集合框架成员

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

实际上，可以将`SubList`理解为`ArrayList`实用工具的巧妙封装。

> 和迭代器一样，获取SubList之后，对原集合进行结构性改变，也会引起*ConcurrentModificationException*。

###  插入与删除

前文提到，尽管`ArrayList`因实现了`Random`接口而具有很好的随机读取性，但是`ArrayList`也有一些缺点，比如**差强人意的插入和删除**。

ArrayList方法：

```java
public void add(int index, E e) {...}
public E remove(int index) {...}
public boolean remove(Object o) {...}
...
```

实现了从插入集合到指定索引为止或从集合中删除（指定索引）元素，但这些操作并不是`ArrayList`的强项，以`add(int index, E e)`为例：

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

同理，从`ArrayList`的删除相关方法中也可以看到类似的操作，这意味着在操作大量数据的时候，`ArrayList`可能会遇到性能问题。在对象数组长度很小时，这种影响一般可以忽略。


---
