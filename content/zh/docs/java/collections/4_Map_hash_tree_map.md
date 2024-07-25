---
title: "HashMap和TreeMap"
date: 2020-05-10
draft: false
categories: [java]
tags: [collections]
author: "wangy325"
weight: 5
---


由于`Map`的键是`Set`，因此使用可变对象作为`Map`的key时，**需要覆盖 *equals* 和 *hashCode* 方法**，**Map不能使用自身作为key**。

Java 8对`Map`接口进行了优化，新增了主要是针对**函数式接口**的 *默认* 方法（方法体被省略）：

    default V merge (K key, V value,
      BiFunction<? super V, ? super V, ? extends V> remappingFunction) {...}
    default V compute (K key,
      BiFunction<? super K, ? super V, ? extends V> remappingFunction) {...}
    default V computeIfPresent (K key,
      BiFunction<? super K, ? super V, ? extends V> remappingFunction) {...}
    default V computeIfAbsent (K key,
      Function<? super K, ? extends V> mappingFunction) {...}
    default V replace (K key, V value) {...}
    default boolean replace(K key, V oldValue, V newValue) {...}
    default boolean remove (Object key, Object value) {...}
    default V putIfAbsent (K key, V value) {...}
    default void replaceAll (
      BiFunction<? super K, ? super V, ? extends V> function) {...}
    default V getOrDefault (Object key, V defaultValue) {...}

上述方法使用的不多，主要用来对Map键值进行更新，按需查阅API文档。

<!--more-->

## HashMap

HashMap是由散列表对键进行散列的，允许null键和null值。HashMap是无序的，这点和HashSet是一样的

> HashMap和**Hashtable**大致相同，区别在与Hashtable是同步的，且Hashtable**不允许null**

HashMap的初始化和扩容机制叙述参见[散列表](./3_Set.md/#散列集)，如果初始化时不指定容量（桶数？容量不是键值对数目），默认为16。容量总是2<sup>n</sup>，最大容量是2<sup>30</sup>，每次扩容加倍，**当桶数大于最大桶数后，不再rehash**。容量总是为2的幂次的原理和[ArrayDeque](./2_Queue.md/#arraydeque)一致，通过5次位运算将低位全部转为1，然后执行+1操作进位，变成下一个2<sup>n</sup>。因此HashMap带参构造器指定的capacity最后会初始化为大于其的最近的2<sup>n</sup>（1变2，3变4，5变8，9变16...）。


`HashMap`使用`table`和`entrySet`分别表示桶数和当前映射中的键值对数：

    transient Node<K,V>[] table;	桶数组，桶由链表构成；

    transient Set<Map.Entry<K,V>> entrySet; 映射中的键值对数，size

    int threshold; 

    临界键值对数，等于 table.length * loadFactor，当size > threshold时，触发扩容

    final float loadFactor; 装载因子，默认0.75

```java
static void bucketsTest() throws Exception {
  //load factor 0.75
  HashMap<String, String> hm = new HashMap<>(7);
  hm.put("1", "ok");
  hm.put("2", "fine");
  hm.put("3", "nice");
  hm.put("4", "no");
  hm.put("5", "ops");
  hm.put("6", "fuck");

  Class<?> cls = HashMap.class;

  Field table = cls.getDeclaredField("table");
  Field threshold = cls.getDeclaredField("threshold");
  // can not access
  // Class<?> node = Class.forName("java.util.HashMap$Node");
  table.setAccessible(true);
  threshold.setAccessible(true);
  // Node<K,V>[]
  Object[] o = (Object[]) table.get(hm);
  System.out.println("initial buckets size: " + o.length);
  System.out.println("initial threshold: " + threshold.get(hm));

  Set<Map.Entry<String, String>> entries = hm.entrySet();
  System.out.println("number of entries: " + entries.size());
  // 遍历
  /*entries.forEach((e) -> {
    System.out.println(e.getKey() + e.getValue());
  });*/
  hm.put("apple", "music");
  // reshash needed
  System.out.println(("buckets after rehash: " 
  + ((Object[]) table.get(hm)).length));
}
/* output:
initial buckets size: 8
initial threshold: 6
number of entries: 6
buckets after rehash: 16
*///:~
```

上例证实了`HashMap`的扩容过程，当映射中的**元素数大于桶数与装载因子之积**时，便会扩容。

Map中提供3种**集合视图**，键的，值的和entry的，视图并不能对映射进行完全结构性控制，比如向Map中添加条目，则只能使用`Map.put`方法，使用视图时，除了**删除**这一改变Map结构的操作，其他操作会抛出*UnsurportedOperationException*。

`HashMap`的集合视图都支持迭代器，并可以通过任意视图的迭代器**删除**键值对，但是不支持新增和替换键值对。

```java
private static void viewTest() {
  Map<Integer, String> hm = new HashMap<>(8);
  hm.put(1,"难忘的一天");
  Set<Integer> keySet = hm.keySet();
  //keySet.add(2); // unsupported operation exception
  Iterator<Integer> ikey = keySet.iterator();
  ikey.next();
  // can remove key-value pair by keySet
  ikey.remove();
  ikey.forEachRemaining(System.out::println);

  Collection<String> values = hm.values();
  // already deleted
  System.out.println("values contains: " + values.contains("难忘的一天"));
  // values.add("你瞒我瞒"); // unsupported either
  hm.put(1,"你瞒我瞒");
  hm.put(2,"樱花树下");
  // ikey.next(); // fast-fail iterator, ikey is out of date
  boolean remove = values.remove("你瞒我瞒");
  Iterator<String> ivalue = values.iterator();
  ivalue.next();
  ivalue.remove();

  hm.put(1,"红豆");
  hm.put(2,"风衣");
  Set<Map.Entry<Integer, String>> entries = hm.entrySet();
  // entries.add() // unsupported either
  System.out.println("entry size: " + entries.size());
  // remove entry with particular key-value
  entries.remove(new Map.Entry<Integer, String>() {
    @Override
    public Integer getKey() {
      return 1;
    }
    @Override
    public String getValue() {
      return "红豆";
    }
    @Override
    public String setValue(String value) {
      return null;
    }
  });
  hm.forEach((k,v) -> System.out.println("key:" + k + ", value:" + v));
  Iterator<Map.Entry<Integer, String>> ientry = entries.iterator();
  ientry.next();
  ientry.remove();
  ientry.forEachRemaining(System.out::println);
}
/* output
values contains: false
entry size: 2
key: 2, value:风衣
*///:~
```

值得一提的事，和[SortedSet](./3_Set.md/#treeset)的子集视图一样，**对原集合和视图的修改是相互的**，不会引发  *ConcurrentModificationException* ，但是其对映射的操作是有限的，比如`keySet.add(2)`就抛出 *UnsupportedOperationException* ，迭代器不支持操作。查看源码即可知：

![HashMap的迭代器](/img/collections/HashMap_1.jpg)

<p style="text-align:center;font-size:.8rem;font-style:italic;color:grey">HashMap内部视图和迭代器方法表</p>

可以看到，视图实现的方法有限，并没有实现集合的所有方法。因此当使用视图调用`add()`方法时，直接在**AbstractCollection**里抛出异常：

```java
public boolean add(E e) {
  throw new UnsupportedOperationException();
}
```



## TreeMap

`TreeSet`是`TreeMap`的`KeySet`的封装，`TreeMap`是使用**红—黑树**对键进行排序的有序映射。

`TreeMap`的继承结构和`TreeSet`极为相似，对应地，`TreeMap`是`SortedMap`和`NavigableMap`的实现，SortedMap/NavigableMap的接口声明和SortedSet/NavgableSet相似，所声明的方法名都是**自解释型**的，具体可查看JDK文档。

要将条目插入`TreeMap`中，key必须是可排序的，排序方式可以是自然排序或者定义比较器，和`TreeSet`一样，比较器规则必须和`equals`方法的结果保持一致，以避免映射中出现重复key-value。

`TreeMap`的**集合视图**和对应的迭代器表现和`HashMap`一致。

- 视图和映射的作用是相互的，即修改映射，视图随之修改，反之亦然，但是视图支持的操作是有限的，注意 *UnsupportedOperationException*；
- 迭代器是 *fail-fast* 的， 只支持remove一个改变映射结构的方法；

```java
static {
  map.put("hebe", "不醉不会");
  map.put("AMIT","母系社会");
  map.put("Lin","可惜没如果");
  map.put("andy", "一起走过的日子");
  map.put("lala", "寻人启事");
  map.put("yoga", "说谎");
}
static void treeMapTest() {
  Map<String, String> tm = new TreeMap<>(map);
  Set<Map.Entry<String, String>> entries = tm.entrySet();
  tm.put("andy", "来生缘"); // 映射和entrySet是互相作用的
  for (Map.Entry<String, String> entry : entries) {
    entry.setValue("难搞");
    break;
  }
  tm.computeIfPresent("lala", (k, v) -> "失落沙洲");
  // Unsupported Operation Exception
  // entries.add(new Map.Entry<String, String>() {...});
  tm.forEach((k, v) -> System.out.println(k + ": " + v));

  // test iterator
  Iterator<Map.Entry<String, String>> ie = entries.iterator();
  ie.next();
  ie.remove();
  // tm.putAll(map); //ConcurrentModificationException
  ie.next();
  ie.forEachRemaining(x -> System.out.print(x + "\t"));
  // 指定比较器
  Map<String, String> tm2 = new TreeMap<>(String::compareToIgnoreCase);
  tm2.putAll(map);
  System.out.println();
  tm2.forEach((k,v)-> System.out.println(k +": " + v));
}
/* output:
AMIT: 难搞
Lin: 可惜没如果
andy: 来生缘
hebe: 不醉不会
lala: 失落沙洲
yoga: 说谎
andy=来生缘	hebe=不醉不会	lala=失落沙洲	yoga=说谎
AMIT: 母系社会
andy: 一起走过的日子
hebe: 不醉不会
lala: 寻人启事
Lin: 可惜没如果
yoga: 说谎
*///:~
```

上例中分别对`HashMap`使用自然排序和指定比较器的方法，可以看到映射中key的排序差异。

当指定`TreeMap`实现类的名字`SortedMap`或`NavigableMap`的实现时，方可使用`SortedMap`和`NavigableMap`的实用方法，由于方法名都是解释型的，此处不多作表述：

```Java
 static void navigableTest() {
     TreeMap<String, String> tm = new TreeMap<>(map);
      System.out.println(tm.firstEntry().getKey());
      // 使用一个比key 'andy'大的值，即可包含这个key，"+ 0"是一个实用手段
      SortedMap<String, String> subMap = tm.subMap("AMIT", "andy" + "0");
      subMap.compute("AMIT", (k, v) -> "彩虹");
      subMap.forEach((k, v) -> System.out.println(k + ", " + v));

      //NavigableMap接口方法，返回大于或等于给定key的一个entry
      System.out.println(tm.ceilingEntry("AMIT").getValue());
 }
/* output:
AMIT
AMIT, 彩虹
Lin, 可惜没如果
andy, 一起走过的日子
彩虹
*///:~
```

> 由于`subMap`方法是“包前不包尾”的（其他获取子映射视图的方法也一样），为了包尾，可以使用上例的方法。

`NavigableMap`对获取子映射视图的方法进行了扩展，不作过多表述。

---


