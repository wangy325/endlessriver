---
title: "Collections工具类"
date: 2020-05-12
categories: [java]
tags: [collections]
author: "wangy325"
weight: 8
---


集合框架中一个重要的类，其实是Collection接口的**伴随类**，其中定义了许多实用方法，用来获取**集合视图**，或提供一些方便的操作集合元素的**算法**。

由于视图是直接封装的Collection接口，**因此其方法有些局限**，并且由于特殊的设计，部分操作是不允许的（会抛出 *UnsupportedOperationExceptin* ）。

<!--more-->

## 不可修改视图

顾名思义，一旦获取，其内容不再可以修改，Java集合框架中可以用于获取的不可修改视图有：

![YMsn4e.png](/img/collections/unmodifiable_view.png)

<p style="color:grey;text-align:center;font-size:.8rem;font-style:italic">Collections通过静态方法获取的8个不可修改视图</p>

Java中提供的获取**不可修改视图**的方法，只能用来遍历原集合中的信息，无法通过任何手段（集合，迭代器，entry等）修改集合，例如，当调用add方法时，Java的处理方式就是抛出 *UnsupportedOperationException* 异常：

```java
public class UnmodifiableViewTest {
    static List<String> l = new ArrayList<String>() {{
        add("fan");
        add("bar");
        add("foo");
        add("anchor");
        add("ripe");
        add("rope");
        add("hope");
    }};
    static Set<String> s = new HashSet<>(l);
    static Map<String, String> m = new HashMap<String, String>() {{
        put("c", "cable");
        put("b", "bar");
        put("f", "floyd");
        put("e", "echo");
        put("a", "anchor");
        put("d", "dribble");
    }};

    public static void main(String[] args) {
//        unmodifiableList();
//        unmodifiableSet();
        unmodifiableMap();
    }

    static void unmodifiableList() {
        List<String> ul = Collections.unmodifiableList(l);
        // 对视图集的元素增删会抛出UnsupportedOperationException
        // strings.add("add");
        // strings.remove("bar");
        // strings.removeAll(l);
        ul.forEach(System.out::print);
        //可以操作迭代器
        ListIterator<String> iterator = ul.listIterator();
        System.out.println(iterator.nextIndex());
//        List<String> ul_sub = l.subList(1, 3);
        List<String> ul_sub = ul.subList(1, 3);
        // 子集对元素的操作也是不支持的
//        ul_sub.removeIf(s -> s.equals("foo"));
        ul_sub.forEach(System.out::println);
    }

    static void unmodifiableSet() {
        Set<String> set = Collections.unmodifiableSet(s);
        System.out.println(set.contains("anchor"));
        Iterator<String> i = set.iterator();
        i.next();
        // 迭代器无法移除元素是必然的
        // i.remove();
        // set.clear();
        TreeSet<String> ts = new TreeSet<>(s);
        // 使用sorted set构建
        NavigableSet<String> ns = Collections.unmodifiableNavigableSet(ts);
        // 无法从集中移除元素 UnsupportedOperationException
//        String s = ns.pollFirst();
        System.out.println(ns.first());
        NavigableSet<String> anchor = ns.headSet("anchor", true);
        // 子集也不能被修改
//        anchor.remove("anchor");
        anchor.forEach(System.out::println);
    }

    static void unmodifiableMap() {
        Map<String, String> map = Collections.unmodifiableMap(m);
        // 不支持的操作
        // map.replace("a","apple");
        Set<Map.Entry<String, String>> e = map.entrySet();
        System.out.println(map.get("f"));

        TreeMap<String, String> tm = new TreeMap<>(m);
        // 使用sorted map
        NavigableMap<String, String> nm = 
              Collections.unmodifiableNavigableMap(tm);
        System.out.println(nm.ceilingEntry("car").getValue());
        NavigableMap<String, String> sm = nm.subMap("b", true, "d", true);
        // 不支持的操作
        // sm.remove("c");
        sm.forEach((k, v) -> System.out.println(k + ", " + v));
        NavigableMap<String, String> descendingMap = sm.descendingMap();
        descendingMap.forEach((k, v) -> System.out.println(k + ", " + v));
    }
}
```

稍微查看源码就知道，不可修改视图的工作方式：

```java
 static class UnmodifiableList<E> extends UnmodifiableCollection<E>
   implements List<E>
 {
   //...
   public E get(int index) {return list.get(index);}
   public E set(int index, E element) {
     throw new UnsupportedOperationException();
   }
   public void add(int index, E element) {
     throw new UnsupportedOperationException();
   }
   public E remove(int index) {
     throw new UnsupportedOperationException();
   }
   //...
 }
```

不可修改视图的封装思路就是，当试图改变集合时，**不予处理并抛出异常**。

## 同步视图

由于Java集合框架中的组成都不是同步的（`Vector`和`Hashtable`除外）， *Java SE 8 API Specification* 里面重复出现的一段话就是：

> ***Note that this implementation is not synchronized.*** If multiple threads access an `ArrayList` instance concurrently, and at least one of the threads modifies the list structurally, it *must* be synchronized externally. (A structural modification is any operation that adds or deletes one or more elements, or explicitly resizes the backing array; merely setting the value of an element is not a structural modification.) This is typically accomplished by synchronizing on some object that naturally encapsulates the list. If no such object exists, the list should be "wrapped" using the `Collections.synchronizedList`method. This is best done at creation time, to prevent accidental unsynchronized access to the list:
> `List list = Collections.synchronizedList(new ArrayList(...));`

因此同步视图就是用来处理并发访问的，除了同步视图之外，`java.util.concurrent`包里提供了线程安全的集合，用于并发环境。

![YQFoad.png](/img/collections/Synchronized_view.png)

<p style="text-align:center;font-size:.8rem;font-style:italic;color:grey">Collections通过静态方法获取的8个同步视图（不包含SynchronizedRandomAccessList）</p>

## 受查视图

受查视图用来对泛型类发生问题时提供调试支持。

![YQXSk8.png](/img/collections/checked_view.png)

<p style="text-align:center;font-size:.8rem;font-style:italic;color:grey">Collections通过静态方法获取的9个受查视图（不包含checkededRandomAccessList）</p>

## 实用方法

### 空集

Collections提供了一些**返回空集合、映射、迭代器**的方法，实际上返回的是Collections所封装的对应的对象。

向返回的空集合中插入元素会抛出 *UnsupportedOperationException*。

```java
static void emptyList(){
  List<Object> emptyList = Collections.emptyList();
  //emptyList.add(1); // USOE
  System.out.println(emptyList.size()); // actual 0
}
```

### 单一元素集合

Collections还提供了返回指定1个元素的集合或映射：

```java
static void singletonList(){
  Set<String> singlton = Collections.singleton("singlton");
  System.out.println(singlton.size()); // actual 1
  // singlton.add("sin"); // USOE
  // singlton.clear(); // USOE
}
```

同样地，单一元素集合也是**不可修改**的。

### 其他有利算法

Collections类还包含了很多有利的算法，如：

> Collections.sort(List\<T>)

根据对集合元素按照**自然顺序升序排序**，而

> Collections.binarySearch(List<? extends Comparable<? super T>\> list, T key)

会**二分查找**集合中的元素，其前提是元素是自然升序排序的[^10]

除此之外，Collections还定义了一些实用方法，简单列出部分：

    public static void reverse(List<?> list)

    public static void shuffle(List<?> list)

    public static void shuffle(List<?> list, Random rnd)

    public static <T extends Object & Comparable<? super T>> T min(Collection<? extends T> coll)

    public static <T> T min(Collection<? extends T> coll, Comparator<? super T> comp)

    public static <T extends Object & Comparable<? super T>> T max(Collection<? extends T> coll)

    public static <T> T max(Collection<? extends T> coll, Comparator<? super T> comp)

---

[^10]: 排序和查找有重载方法，具体请查看API文档
