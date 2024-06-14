---
title: "Java集合框架之Map"
date: 2020-05-10
draft: false
categories: []
author: "wangy325"
weight: 4
---


Map即映射，即键-值对，键不允许重复，并且一个键最多映射一个值。Map不在Java集合框架的范畴，但是其由集合框架的内容实现。自然也在集合框架的讨论之内。

映射提供3种**集合视图**

- 键集 （Set实现）
- 值集 （Collection实现）
- Map.Entry集（Set实现）

<!--more-->

由于Map的键是Set，因此使用可变对象作为Map的key时，**需要覆盖 *equals* 和 *hashCode* 方法**，**Map不能使用自身作为key**

Java 8对Map接口进行了优化，新增了主要是针对**函数式接口**的 *默认* 方法（方法体被省略）：

> - default V ***merge***(K key, V value,
>               BiFunction<? super V, ? super V, ? extends V> remappingFunction) {...}
> - default V ***compute***(K key,
>               BiFunction<? super K, ? super V, ? extends V> remappingFunction) {...}
> - default V ***computeIfPresent***(K key,
>               BiFunction<? super K, ? super V, ? extends V> remappingFunction) {...}
> - default V ***computeIfAbsent***(K key,
>               Function<? super K, ? extends V> mappingFunction) {...}
> - default V ***replace***(K key, V value) {...}
> - default boolean ***replace***(K key, V oldValue, V newValue) {...}
> - default boolean ***remove***(Object key, Object value) {...}
> - default V ***putIfAbsent***(K key, V value) {...}
> - default void ***replaceAll***(BiFunction<? super K, ? super V, ? extends V> function) {...}
> - default V ***getOrDefault***(Object key, V defaultValue) {...}

上述方法使用的不多，主要用来对Map键值进行更新，按需查阅API文档。

## 1 HashMap

HashMap是由散列表对键进行散列的，允许null键和null值。HashMap是无序的，这点和HashSet是一样的

> HashMap和**Hashtable**大致相同，区别在与Hashtable是同步的，且Hashtable**不允许null**

HashMap的初始化和扩容机制叙述参见[散列表](../set/#1-span-id-hashtable-散列集-span)，如果初始化时不指定容量（桶数？容量不是键值对数目），默认为16。容量总是2<sup>n</sup>，最大容量是2<sup>30</sup>，每次扩容加倍，**当桶数大于最大桶数后，不再rehash**。容量总是为2的幂次的原理和[ArrayDeque一致](../queue/#3-arraydeque)，通过5次位运算将低位全部转为1，然后执行+1操作进位，变成下一个2<sup>n</sup>。因此HashMap带参构造器指定的capacity最后会初始化为大于其的最近的2<sup>n</sup>（1变2，3变4，5变8，9变16...）。

HashMap使用`table`和`entrySet`分别表示桶数和当前映射中的键值对数：

> transient Node<K,V>[] table;	桶数组，桶由链表构成；
>
> transient Set<Map.Entry<K,V>> entrySet; 映射中的键值对数，size
>
> int threshold; 临界键值对数，等于 table.length * loadFactor，当size > threshold时，触发扩容
>
> final float loadFactor; 装载因子，默认0.75

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
  System.out.println(("buckets after rehash: " + ((Object[]) table.get(hm)).length));
}
/* output:
initial buckets size: 8
initial threshold: 6
number of entries: 6
buckets after rehash: 16
*///:~
```

上例证实了HashMap的扩容过程，当映射中的**元素数大于桶数与装载因子之积**时，便会扩容。

Map中提供3种**集合视图**，键的，值的和entry的，视图并不能对映射进行完全结构性控制，比如向Map中添加条目，则只能使用`Map.put`方法，使用视图时，除了**删除**这一改变Map结构的操作，其他操作会抛出*UnsurportedOperationException*。

HashMap的集合视图都支持迭代器，并可以通过任意视图的迭代器**删除**键值对，但是不支持新增和替换键值对。

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

值得一提的事，和[SortedSet](../set/#2-treeset)的子集视图一样，**对原集合和视图的修改是相互的**，不会引发  *ConcurrentModificationException* ，但是其对映射的操作是有限的，比如`keySet.add(2)`就抛出 *UnsupportedOperationException* ，迭代器不支持操作。查看源码即可知：

![HashMap的迭代器](/img/HashMap_1.jpg)

<p style="text-align:center;font-size:.9rem;font-style:italic">HashMap内部视图和迭代器方法表</p>

可以看到，视图实现的方法有限，并没有实现集合的所有方法。因此当使用视图调用add方法时，直接在**AbstractCollection**里抛出异常：

```java
public boolean add(E e) {
  throw new UnsupportedOperationException();
}
```

## 2 LinkedHashMap

LinkedHashMap(链表散列映射)是HashMap的导出类，像LinkedHashSet与HashSet的关系一样。

其与HashMap的差别在于其使用LinkedList来维护键值对插入的顺序，其插入机制和HashMap是一致的。

LinkedHashMap和HashMap的[性能相差不大](../set/#1-2-linkedhashset)与HashSet和LinkedHashSet一致：

| | |
|:--|:--|
|HashMap|HashMap基于散列表，插入和查询键值对的开销是固定的|
|LinkedHashMap|和HashMap类似，不过其使用LinkedList维护内部次序，因此其迭代顺序是插入顺序或者LRU（最近最少使用）次序，性能稍差于HashMap|


### 2.1 LinkedHashMap的元素排序

一般地，LinkedHashMap使用**插入顺序**（ *insertion order* ）。但有特殊情况，LinkedHashMap提供构造参数`accessOrder`，来根据**访问顺序**（ *access order* ）对映射条目进行迭代。

主要构造器：

```java
/**
 * Constructs an empty LinkedHashMap instance with the
 * specified initial capacity, load factor and ordering mode.
 *
 * @param  initialCapacity the initial capacity
 * @param  loadFactor      the load factor
 * @param  accessOrder     the ordering mode - true for
 *         access-order, false for insertion-order
 * @throws IllegalArgumentException if the initial capacity is negative
 *         or the load factor is nonpositive
 */
public LinkedHashMap(int initialCapacity,
                         float loadFactor,
                         boolean accessOrder) {
  super(initialCapacity, loadFactor);
  this.accessOrder = accessOrder;
}
```

当使用访问顺序时，映射条目的会按照最少访问——最多访问的顺序迭代，也就是说每次**有效访问**，受到影响的条目都会“移动”到链表的尾部，这个性质非常适合 **“最近最少使用”**（LRU）高速缓存。

#### 2.1.1 有效访问

那么哪些方法是有效访问呢？

- put
- get
- putIfAbsent
- getOrdefault
- compute
- computeIfAbsent
- computeIfPresent
- merge
- replace

其中，replace方法只有**成功替换值之后才是有效访问**

```java
static {
  map.put("hebe", "不醉不会");
  map.put("andy", "谢谢你的爱");
  map.put("lala", "寻人启事");
  map.put("yoga", "成全");
}
static void accessOrderTest() {
  Map<String, String> lhm = new LinkedHashMap<>(8, 0.75f, true);
  lhm.putAll(map);
  System.out.println("entry in access order:");
  // 有效访问会将entry移动至队尾
  lhm.replace("yoga", "说谎");
  // Java 8新增方法
  lhm.computeIfPresent("hebe", (k, v) -> "魔鬼中的天使");
  lhm.put("chua", "坠落");
  lhm.get("lala");
  lhm.forEach((k, v) -> System.out.println("\t" + k + ": " + v));
}
/* output:
entry in access order:
	andy: 谢谢你的爱
	yoga: 说谎
	hebe: 魔鬼中的天使
	chua: 坠落
	lala: 寻人启事
*///:~
```

值得一提的是，对LinkedHashMap的**视图操作不影响迭代顺序**：

```java
static void viewTest() {
  Map<String, String> lhm = new LinkedHashMap<>(8, 0.75f, true);
  lhm.putAll(map);
  lhm.forEach((k, v) -> System.out.println("\t" + k + ": " + v));
  Set<Map.Entry<String, String>> entries = lhm.entrySet();
  // 视图操作不会影响映射的排序
  Iterator<Map.Entry<String, String>> i = entries.iterator();
  for (Map.Entry<String, String> entry : entries) {
    entry.setValue("魔鬼中的天使");
    break;
  }
  System.out.println("------");
  lhm.forEach((k, v) -> System.out.println("\t" + k + ": " + v));
  i.next();
}
/* output:
	hebe: 不醉不会
	lala: 寻人启事
	yoga: 成全
	andy: 谢谢你的爱
------
	hebe: 魔鬼中的天使
	lala: 寻人启事
	yoga: 成全
	andy: 谢谢你的爱
*///：～
```

#### 2.1.2 移除最老K-V对

关于LinkedHashMap的一个重要的用途，还有一个重要的方法，利用好此方法可以将LinkedHashMap作为缓存使用。

```java
protected boolean removeEldestEntry(Map.Entry<K,V> eldest) {
 return false;
}
```

这个方法在`put`或者`putAll`方法**插入新条目**到映射之后调用，也就是说，使用put更新已有key的value不会触发此操作[^1]。

[^1]: 实际上使用`put`方法更新已有键值对时，触发的是另一个方法：`afterNodeAccess`，此方法将条目移动至队尾（如果使用访问顺序）。

如果方法返回false，不执行操作；返回true，则移除参数`eldest`条目。

参数 `eldest`是映射的“最旧的”元素——当前最先插入/最少访问的元素，即队头元素：

```java
void afterNodeInsertion(boolean evict) { // possibly remove eldest
    LinkedHashMap.Entry<K,V> first;
    // if true，移除队头元素
    if (evict && (first = head) != null && removeEldestEntry(first)) {
        K key = first.key;
        removeNode(hash(key), key, null, false, true);
    }
}
```

不重写的前提下，`removeEldestEntry`方法始终返回false——也就是说**永远不会作任何操作**，可以继承此方法（从访问权限修饰符也知道），改变方法行为。

此法可以用来在put和putAll之后操作映射，如此做之后，此法一定要返回false，不再允许映射有后续的操作，原因很简单——若在操作时就remove了`eldest`，返回true之后该如何？

`removeEldestEntry`可以作用于插入顺序和访问顺序的LinkedeHashSet中：

```java
private static void eldestRemoveTest() {
  class Access<K, V> extends LinkedHashMap<K, V> {
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
      return size() > 1;
    }
  }
  Access<Integer, String> access = new Access<>();
  access.put(1, "apple");
  // Access中始终只有最后插入的一个条目
  access.put(2, "google");
  access.forEach((k, v) -> System.out.println(k + ": " + v));
}
/* output
2: google
*///:~
```

上例中，每次put后调用`removeEldestEntry`方法，最终映射中只有最后插入的条目。

```java
static void lruCacheTest() {
    class Cache<K, V> extends LinkedHashMap<K, V> {
        private final int count = 50;

        private Cache(int initialCapacity, float loadFactor, boolean accessOrder) {
            super(initialCapacity, loadFactor, accessOrder);
        }

        /**
         * 此方法总是返回false
         *
         * @param eldest
         * @return false
         */
        @Override
        protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
            Set<Map.Entry<K, V>> entries = entrySet();
            // lambda表达式中使用外部变量需要保证线程安全
            AtomicInteger vs = new AtomicInteger();
            entries.removeIf(next -> {
                V value = next.getValue();
                if (value instanceof Integer) {
                    if ((Integer) value > 0) {
                        vs.addAndGet((Integer) value);
                        return (Integer) value < 10;
                    }
                }
                return false;
            });
            // 打印次数反映此法的调用次数
            System.out.println(vs.intValue() == count);
            //若在此方法中对集合进行修改，那么必须返回false
            return false;
        }
    }
    Cache<Integer, Integer> cache = new Cache<>(8, 0.75f, true);
    // 初始化映射集， afterNodeInsertion
    cache.put(1, 0);
    cache.put(2, 0);
    cache.put(3, 0);
    cache.put(4, 0);
    cache.put(5, 0);
    for (int i = 0; i < cache.count; i++) {
        int key = new Random().nextInt(50) % 5 + 1;
        int value = cache.get(key);
        if (i == cache.count - 1) {
            //保证最后一次访问removeEldestEntry方法
            cache.remove(key);
        }
        // 将值增1，实现计数器效果
        // 此处不能使用compute方法，因此法会调用afterNodeInsertion
        // 设计的目的在最后一次put之后调用afterNodeInsertion方法，而使用compute会调用2次
//            cache.put(key, cache.compute(key, (k, v) -> Integer.sum(value, 1)));
        cache.put(key, ++value);

    }
    System.out.println("-------");

    cache.forEach((k, v) -> System.out.println(k + ": " + v));
}
/* output:
false
false
false
false
false
true
-------
1: 11
2: 12
4: 14
*///:~
```

上例对一个容量为5的LinkedList进行50次随机访问，每次访问后记录访问次数（用value自增），最后删除访问次数不到10次的条目。可以看到，`removeEldestEntry`方法调用了6次，最后映射集中只有访问次数大于10次的键值对了。

### 2.1 LinkedHashMap如何链接节点

我们知道，LinkedHashMap在HashMap的基础上使用LinkedList（并不是集合框架中的LinkedList，独立实现）将键值对链接起来，因此键值对才能够被有序迭代，那么这一动作是在什么时候发生的呢？

这一过程涉及到2个方法：

```Java
// 覆盖了HashMap的newNode方法
Node<K,V> newNode(int hash, K key, V value, Node<K,V> e) {
    LinkedHashMap.Entry<K,V> p =
        new LinkedHashMap.Entry<K,V>(hash, key, value, e);
    // 链接节点
    linkNodeLast(p);
    return p;
}
// link at the end of list
private void linkNodeLast(LinkedHashMap.Entry<K,V> p) {
    LinkedHashMap.Entry<K,V> last = tail;
    tail = p;
    if (last == null)
        head = p;
    else {
        p.before = last;
        last.after = p;
    }
}
```

上面的两个方法可以看到，每次插入键值对到映射中时，总会和前一个节点建立连接。

### 2.2 LinkedHashMap的回调方法

LinkedHashMap中有3个重要的回调方法，是LinkedHashMap维护链表以及实现顺序迭代的重要依赖。

#### afterNodeRemoval

```Java
// 删除键值对之后调用
void afterNodeRemoval(Node<K,V> e) { // unlink
    LinkedHashMap.Entry<K,V> p =
        (LinkedHashMap.Entry<K,V>)e, b = p.before, a = p.after;
    p.before = p.after = null;
    if (b == null){
        // e = head
        head = a;
    }else{
        // 将b.after指向a
        b.after = a;
    }
    if (a == null){
        // e = tail
        tail = b;
    }else{
        // 将a.before指向b
        a.before = b;
    }
    // 连接完成
}
```

#### afterNodeInsertion

```Java
// 插入新节点之后调用
void afterNodeInsertion(boolean evict) { // possibly remove eldest
    LinkedHashMap.Entry<K,V> first;
    // 注意判断条件，需要removeEldestEntry方法返回true
    // removeEldestEntry方法默认返回false
    //因此默认行为是不删除节点
    if (evict && (first = head) != null && removeEldestEntry(first)) {
        K key = first.key;
        // 移除队头节点
        removeNode(hash(key), key, null, false, true);
        //will call afterNodeRemoval
    }
}
```

#### afterNodeAccess

如果构造LinkedHashMap时指定构造参数`accessOrder=true`，那么此法将访问的节点移动至队尾

```Java
void afterNodeAccess(Node<K,V> e) { // move node to last
    LinkedHashMap.Entry<K,V> last;
    // 访问顺序，且访问节点不为tail
    if (accessOrder && (last = tail) != e) {
        LinkedHashMap.Entry<K,V> p =
            (LinkedHashMap.Entry<K,V>)e, b = p.before, a = p.after;
        // 置空p.after，因要将p放到队尾
        p.after = null;
        if (b == null){
            // b == null说明e==head
            head = a;
        }else{
            // 将e的前一节点与e的后一节点连接
            b.after = a;
        }
        if (a != null){
            // 将e的后一节点与e的前一节点连接
            a.before = b;
        }else{
            // 这个条件会被满足吗？
            last = b;
        }
        if (last == null){
            // 这个条件会被满足吗
            head = p;
        }else {
            // 将p作为最后节点
            p.before = last;
            last.after = p;
        }
        tail = p;
        ++modCount;
    }
}
```

上述方法的流程图为：

 ![节点访问之后的操作](/img/afterNodeAccess_flow.svg)

## 3 TreeMap

TreeSet是TreeMap的KeySet的封装，TreeMap是使用**红—黑树**对键进行排序的有序映射。

TreeMap的继承结构和TreeSet极为相似，对应地，TreeMap是SortedMap和NavigableMap的实现，SortedMap/NavigableMap的接口声明和SortedSet/NavgableSet相似，所声明的方法名都是**自解释型**的，具体可查看JDK文档。

要将条目插入TreeMap中，key必须是可排序的，排序方式可以是自然排序或者定义比较器，和TreeSet一样，比较器规则必须和equals方法的结果保持一致，以避免映射中出现重复key-value。

TreeMap的**集合视图**和对应的迭代器表现和HashMap一致。

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

上例中分别对HashMap使用自然排序和指定比较器的方法，可以看到映射中key的排序差异。

当指定TreeMap实现类的名字SortedMap或NavigableMap的实现时，方可使用SortedMap和NavigableMap的实用方法，由于方法名都是解释型的，此处不多作表述：

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

> 由于subMap方法是“包前不包尾”的（其他获取子映射视图的方法也一样），为了包尾，可以使用上例的方法。

NavigableMap对获取子映射视图的方法进行了扩展，不作过多表述。

