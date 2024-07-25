---
title: "LinkedHashMap"
date: 2020-05-10
draft: false
categories: [java]
tags: [collections]
author: "wangy325"
weight: 6
---


`LinkedHashMap`(链表散列映射)是`HashMap`的导出类，像`LinkedHashSet`与`HashSet`的关系一样。

其与`HashMap`的差别在于其使用`LinkedList`来维护键值对插入的顺序，其插入机制和`HashMap`是一致的。

`LinkedHashMap`和`HashMap`的[性能相差不大](./3_Set.md/#linkedhashset)与`HashSet`和`LinkedHashSet`一致：

| 集合 | 特征 |
|:--:|:--:|
|HashMap|HashMap基于散列表，插入和查询键值对的开销是固定的|
|LinkedHashMap|和HashMap类似，不过其使用LinkedList维护内部次序，因此其迭代顺序是插入顺序或者LRU（最近最少使用）次序，性能稍差于HashMap|

<!--more-->

## 元素排序

一般地，`LinkedHashMap`使用**插入顺序**（ *insertion order* ）。但有特殊情况，`LinkedHashMap`提供构造参数`accessOrder`，来根据**访问顺序**（ *access order* ）对映射条目进行迭代。

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

### 有效访问

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

值得一提的是，对`LinkedHashMap`的**视图操作不影响迭代顺序**：

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

### 移除最老K-V对

关于`LinkedHashMap`的一个重要的用途，还有一个重要的方法，利用好此方法可以将`LinkedHashMap`作为缓存使用。

```java
protected boolean removeEldestEntry(Map.Entry<K,V> eldest) {
 return false;
}
```

这个方法在`put`或者`putAll`方法**插入新条目**到映射之后被调用，也就是说，使用put更新已有key的value不会触发此操作[^1]。

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

`removeEldestEntry`可以作用于插入顺序和访问顺序的`LinkedeHashMap`中：

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

上例对一个容量为5的`LinkedList`进行50次随机访问，每次访问后记录访问次数（用value自增），最后删除访问次数不到10次的条目。可以看到，`removeEldestEntry`方法调用了6次，最后映射集中只有访问次数大于10次的键值对了。

### 如何链接节点

我们知道，`LinkedHashMap`在`HashMap`的基础上使用`LinkedList`（并不是集合框架中的`LinkedList`，独立实现）将键值对链接起来，因此键值对才能够被有序迭代，那么这一动作是在什么时候发生的呢？

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

## 回调方法

`LinkedHashMap`中有3个重要的回调方法，是`LinkedHashMap`维护链表以及实现顺序迭代的重要依赖。

### afterNodeRemoval

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

### afterNodeInsertion

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

### afterNodeAccess

如果构造`LinkedHashMap`时指定构造参数`accessOrder=true`，那么此法将访问的节点移动至队尾

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

<center>

 ![节点访问之后的操作](/img/collections/afterNodeAccess_flow.svg)

</center>

 ---
