---
title: "HashMap的源码分析（一）"
date: 2020-09-24
lastmod: 2020-09-24
draft: false
tags: [Java进阶, 集合框架]
categories: [Java]
author: "wangy325"

hasJCKLanguage: true

weight: 10
mathjax: true
autoCollapseToc: false
---

本文内容简单分析了JDK8中HashMap源码的几个重要方法，便于理解散列表在Java集合框架中的具体应用。

HashMap基于散列表，散列表中每一个Node节点（桶）是链表，当两个条目（entry）的key的hash值对桶数（capacity）取模的值相等时，这两个entry会存储在同一个链表中。但当链表中元素达到一定数目时，链表结构会转变为**树结构**。

此文中没有讨论HashMap中涉及到树结构的源码。

<!--more-->

## 1.基础字段

HashMap中定义了如下字段：

```Java
// 默认初始容量为16
static final int DEFAULT_INITIAL_CAPACITY = 1 << 4;
//最大容量为2^30
static final int MAXIMUM_CAPACITY = 1 << 30;
//默认装载因子 0.75
static final float DEFAULT_LOAD_FACTOR = 0.75f;
//“树化”临界值，当链表数组中的条目数>=8时转变为树结构
static final int TREEIFY_THRESHOLD = 8;
//
static final int UNTREEIFY_THRESHOLD = 6;
//
static final int MIN_TREEIFY_CAPACITY = 64;
//hashmap存放键值对的容器，Node[]数组的大小就是hashmap的容量大小
transient Node<K,V>[] table;
//键值对集
transient Set<Map.Entry<K,V>> entrySet;
//键值对数目
transient int size;
//hashmap发生结构变化的计数器
transient int modCount;
//扩容临界键值对数临界值，当size>threshold时扩容
int threshold;
//装载因子，初始化时不指定默认为0.75
final float loadFactor;
```

## 2.初始化

### 2.1 构造器

HashMap提供了以下几个构造器

```Java
public HashMap(int initialCapacity, float loadFactor){
    if (initialCapacity < 0)
            throw new IllegalArgumentException("Illegal initial capacity: " + initialCapacity);
        if (initialCapacity > MAXIMUM_CAPACITY)
            initialCapacity = MAXIMUM_CAPACITY;
        if (loadFactor <= 0 || Float.isNaN(loadFactor))
            throw new IllegalArgumentException("Illegal load factor: " + loadFactor);
        // 字段初始化
        this.loadFactor = loadFactor;
        this.threshold = tableSizeFor(initialCapacity);
}

// 获取table size容量的方法，结果总是为2的幂
static final int tableSizeFor(int cap) {
        int n = cap - 1;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        return (n < 0) ? 1 : (n >= MAXIMUM_CAPACITY) ? MAXIMUM_CAPACITY : n + 1;
    }

public HashMap(int initialCapacity) {
    this(initialCapacity, DEFAULT_LOAD_FACTOR);
}

public HashMap() {
    this.loadFactor = DEFAULT_LOAD_FACTOR; // all other fields defaulted
}

public HashMap(Map<? extends K, ? extends V> m) {
    this.loadFactor = DEFAULT_LOAD_FACTOR; // 0.75
    putMapEntries(m, false);
}

// 使用已有Map初始化
final void putMapEntries(Map<? extends K, ? extends V> m, boolean evict) {
        int s = m.size();
        if (s > 0) {
            if (table == null) { // pre-size
                // 若无键值对在HashMap中，此处的计算出table size
                float ft = ((float)s / loadFactor) + 1.0F;
                int t = ((ft < (float)MAXIMUM_CAPACITY) ?
                         (int)ft : MAXIMUM_CAPACITY);
                if (t > threshold)
                    threshold = tableSizeFor(t);
            }
            //若参数集过大，先对原集合扩容
            else if (s > threshold)
                resize();
            // 将参数集中的键值对填入新的HashMap中
            for (Map.Entry<? extends K, ? extends V> e : m.entrySet()) {
                K key = e.getKey();
                V value = e.getValue();
                putVal(hash(key), key, value, false, evict);
            }
        }
    }
```
可以看到，除了最后一个构造器额外调用了`putVal()`方法外，构造器都只做了一些字段初始化工作，那么HashMap的键值对是如何“放入”的呢？

### 2.2 插入键值对

键值对的插入与扩容密不可分，接下来从这两个方法来阐述HashMap的键值对插入过程

当使用`put(K,V)`向映射中插入键值对时，实际上调用的是`putVal()`方法

```Java
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}

/**
 * Implements Map.put and related methods. 向HashMap中插入元素
 *
 * @param hash 键的hash值
 * @param key 键
 * @param value 值
 * @param onlyIfAbsent 若真，那么不修改原键的值（若原键值不为null）
 * @param evict if false, the table is in creation mode.
 * @return 之前键映射的值，若之前键不存在则返回null
 */
final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    // HashMap字段拷贝一份
    Node<K,V>[] tab; Node<K,V> p; int n, i;

    if ((tab = table) == null || (n = tab.length) == 0)
        /*
         * 若是第一次插入，则执行此操作
         * 此操作调用了resize方法，实际上做的是初始化table的操作
         */
        n = (tab = resize()).length;
    if ((p = tab[i = (n - 1) & hash]) == null)
        // (n-1) & hash == hash % n, 用于计算key-value放在哪个桶中
        // 若桶中尚未有内容，则新建一节点
        tab[i] = newNode(hash, key, value, null);
    else {
        // 若桶中有内容
        Node<K,V> e; K k;
        if (p.hash == hash && ((k = p.key) == key || (key != null && key.equals(k))))
            // 并且第一个节点和新节点的key值一样（更新值）
            e = p;
        else if (p instanceof TreeNode)
            // 树
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        else {
            //
            for (int binCount = 0; ; ++binCount) {
                if ((e = p.next) == null) {
                    //遍历桶中的节点，若至链尾，则在链尾加入节点
                    p.next = newNode(hash, key, value, null);
                    //同时判断此时链表中的node数，若 > 8，则由链表转化为二叉树
                    // binCount = 7时说明链表中已经有8个节点了，此时节点数已经 >8个了
                    if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                        //树化
                        treeifyBin(tab, hash);
                    break;
                }
                if (e.hash == hash && ((k = e.key) == key || (key != null && key.equals(k))))
                    //同理，key已存在，跳出for循环
                    break;
                // 将p顺延
                p = e;
            }
        }
        if (e != null) { // existing mapping for key
            V oldValue = e.value;
            // 满足条件会更新
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            // LinkedHashMap中用到
            afterNodeAccess(e);
            return oldValue;
        }
    }

    ++modCount;
    // 扩容判断
    if (++size > threshold)
        resize();
    // LinkedHashMap中用到
    afterNodeInsertion(evict);
    //key不存在，插入新key，返回null
    return null;
}
```
## 3.扩容

由`putVal()`方法可知，`resize()`方法在初始化过程中也发挥了作用。

```Java
/**
 * 初始化或扩容table
 *
 * @return the table
 */
final Node<K,V>[] resize() {
    /*
     * 初始化时，table == null， threshold=0或2^n，视构造器而定
     */
    Node<K,V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    int newCap, newThr = 0;
    if (oldCap > 0) {
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                 oldCap >= DEFAULT_INITIAL_CAPACITY)
            newThr = oldThr << 1; // double threshold
    }
    else if (oldThr > 0)
        // 有参构造使用传入值的2^n作为table size
        newCap = oldThr;
    else {               
        // 无参构造器初始化使用默认值作为table size
        newCap = DEFAULT_INITIAL_CAPACITY;
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY);
    }
    if (newThr == 0) {
        float ft = (float)newCap * loadFactor;
        //若table size > 2^30则使threshold为最大整数，扩容不再发生
        newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                  (int)ft : Integer.MAX_VALUE);
    }
    threshold = newThr;
    //以下是扩容之后的内容拷贝
    @SuppressWarnings({"rawtypes","unchecked"})
    Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];
    table = newTab;
    if (oldTab != null) {
        for (int j = 0; j < oldCap; ++j) {
            Node<K,V> e;
            if ((e = oldTab[j]) != null) {
                oldTab[j] = null;
                if (e.next == null)
                    //桶中只有一个元素，重新计算key值在桶中的位置
                    newTab[e.hash & (newCap - 1)] = e;
                else if (e instanceof TreeNode)
                    ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);
                else { // preserve order
                     //桶中有多个元素
                     //那么将桶中的元素分裂到2个链表里面去，然后分别放入新table
                     //比如原桶数是4，新桶数即为8，原3号桶中有3，7，11，15四个hash
                     //那么3&4和11&4为0，放在新桶的3号桶；7&4和15&4不为0，放在新桶的7号桶
                     //元素在新桶中保持原顺序不变，3的下一节点hash由7变成11
                    Node<K,V> loHead = null, loTail = null;
                    Node<K,V> hiHead = null, hiTail = null;
                    Node<K,V> next;
                    do {
                        next = e.next;
                        // 此处的逻辑比较晦涩，需仔细推敲
                        if ((e.hash & oldCap) == 0) {
                            /*
                             * 此处的逻辑为：
                             * 第一次循环将loTail和loHead均初始化为e
                             * 第二次将loTail.next改为满足条件((e.hash & oldCap) == 0)的e的更新值
                             * 这一过程将跳过中间不满足条件的节点
                             * 由于loHead和loTail都是指向e的引用，loHead.next随之而变
                             * 接下来将loTail指向e的更新值
                             * 如此往复，loHead-loTail形成一个新链
                             */
                            if (loTail == null)
                                loHead = e;
                            else
                                loTail.next = e;
                            loTail = e;
                        }
                        else {
                            if (hiTail == null)
                                hiHead = e;
                            else
                                hiTail.next = e;
                            hiTail = e;
                        }
                    } while ((e = next) != null);
                    if (loTail != null) {
                        // 去尾
                        // 有可能loTail还有子节点，而子节点不应该出现在当前链中
                        loTail.next = null;
                        newTab[j] = loHead;
                    }
                    if (hiTail != null) {
                        hiTail.next = null;
                        newTab[j + oldCap] = hiHead;
                    }
                }
            }
        }
    }
    return newTab;
}
```
上述`resize()`方法的结论可以通过以下代码验证

```Java
public class NodeTest<K, V> {

    final Node<K, V>[] table = new Node[4];
    final Node<K, V>[] newtab = new Node[8];

    // 构造代码块，构造NodeTest实例时执行
    {
        Node node = new Node(5, "five", null);

        Node node1 = new Node(3, "four", null);
        Node node2 = new Node(7, "three", node1);
        Node node3 = new Node(11, "two", node2);
        Node node4 = new Node(15, "one", node3);
        Node node5 = new Node(17, "six", node4);
        Node node6 = new Node(21, "seven", node5);

        Node node7 = new Node(22, "eight", null);
        Node node8 = new Node(23, "nine", null);

        table[0] = node;
        table[1] = node7;
        table[2] = node6;
        table[3] = node8;
    }

    public static void main(String[] args) {

        NodeTest<Integer, String> nt = new NodeTest<>();

        // 看看HashMap源码的resize方法的复制部分究竟搞什么飞机
        nt.resize(nt.table, nt.newtab);
        // 看看此时的newtab
        nt.printTable(nt.newtab);

    }

    public void printTable(Node<K, V>[] newtab) {
        Node<K, V> g, h;
        for (int i = 0; i < newtab.length; i++) {
            if ((g = newtab[i]) != null) {
                if (g.next == null) {
                    System.out.println("newtab[" + i + "]" + g.getKey() + ", " + g.getValue());
                } else {
                    do {
                        h = g.next;
                        System.out.println("newtab[" + i + "]" + g.getKey() + ", " + g.getValue());
                    } while ((g = h) != null);
                }
            }
        }
    }

    public void resize(Node<K, V>[] table, Node<K, V>[] newtab) {
        int oldcap = table.length;
        for (int j = 0; j < oldcap; ++j) {
            Node<K, V> e;
            if ((e = table[j]) != null) {
                table[j] = null;
                if (e.next == null) {
                    newtab[j] = e;
                } else { // preserve order
                    Node<K, V> loHead = null, loTail = null;
                    Node<K, V> hiHead = null, hiTail = null;
                    Node<K, V> next;
                    do {
                        next = e.next;
                        if ((e.key.hashCode() & oldcap) == 0) {
                            if (loTail == null) {
                                loHead = e;
                            } else {
                                loTail.next = e;
                            }
                            loTail = e;
                        } else {
                            if (hiTail == null) {
                                hiHead = e;
                            } else {
                                hiTail.next = e;
                            }
                            hiTail = e;
                        }
                    } while ((e = next) != null);

                    if (loTail != null) {
                        loTail.next = null;
                        newtab[j] = loHead;
                    }
                    if (hiTail != null) {
                        hiTail.next = null;
                        newtab[j + oldcap] = hiHead;
                    }
                }
            }
        }
    }

    static class Node<K, V> implements Map.Entry<K, V> {

        K key;
        V value;
        Node<K, V> next;

        public Node(K key, V value, Node<K, V> next) {
            this.key = key;
            this.value = value;
            this.next = next;
        }

        @Override

        public K getKey() {
            return key;
        }

        @Override
        public V getValue() {
            return value;
        }

        @Override
        public V setValue(V value) {
            return null;
        }
    }
}
/*
newtab[0]5, five
newtab[1]22, eight
newtab[2]17, six
newtab[2]11, two
newtab[2]3, four
newtab[3]23, nine
newtab[6]21, seven
newtab[6]15, one
newtab[6]7, three
*///:~
```
从输出可以看到，原`table[2]`的节点被拆分后分别放在`newtab[2]`和`newtab[6]`的桶里，并且节点的顺序没有变化

## 4.获取键值对

一般使用`get(K key)`方法获取映射中指定键的值，get方法相较`putVal()`要简单许多

> public V get(Object key)

```Java
public V get(Object key) {
    Node<K,V> e;
    //有key则返回对应value，否则返回null
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}

final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab; Node<K,V> first, e; int n; K k;
    // 直接通过hash找到key值存放的桶
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (first = tab[(n - 1) & hash]) != null) {
        if (first.hash == hash && // always check first node
            // 先从第一个节点查看，如key相等则返回此节点
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;
        if ((e = first.next) != null) {
            // 否则查找链表中的其他节点
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);
            do {
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
```

另外判断一个映射中是否存在某个键对应的值对应的方法

> public boolean containsKey(Object key) {return getNode(hash(key), key) != null;}

实际上也是调用的上面提到的`getNode()`方法

## 5. 删除键值对

使用`remove(K key)`删除映射中的键值对

```Java
public V remove(Object key) {
    Node<K,V> e;
    //返回null或对应key的value
    return (e = removeNode(hash(key), key, null, false, true)) == null ?
        null : e.value;
}

/**
 * Implements Map.remove and related methods.
 *
 * @param hash hash for key
 * @param key the key
 * @param value the value to match if matchValue, else ignored
 * @param matchValue if true only remove if value is equal
 * @param movable if false do not move other nodes while removing
 * @return the node, or null if none
 */
final Node<K,V> removeNode(int hash, Object key, Object value,
                           boolean matchValue, boolean movable) {
    Node<K,V>[] tab; Node<K,V> p; int n, index;
    // 直接定位存放键值对的桶
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (p = tab[index = (n - 1) & hash]) != null) {
        Node<K,V> node = null, e; K k; V v;
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            // 若第一个节点就是，那就是它了
            node = p;
        else if ((e = p.next) != null) {
            if (p instanceof TreeNode)
                node = ((TreeNode<K,V>)p).getTreeNode(hash, key);
            else {
                // 遍历链表定位key
                do {
                    if (e.hash == hash &&
                        ((k = e.key) == key ||
                         (key != null && key.equals(k)))) {
                        node = e;
                        break;
                    }
                    p = e;
                } while ((e = e.next) != null);
            }
        }
        // 调整链表
        if (node != null && (!matchValue || (v = node.value) == value ||
                             (value != null && value.equals(v)))) {
            if (node instanceof TreeNode)
                ((TreeNode<K,V>)node).removeTreeNode(this, tab, movable);
            else if (node == p)
                // 第一个节点
                tab[index] = node.next;
            else
                // 非第一个节点
                // else语句快的do循环保证了p一定是node的前一个节点
                p.next = node.next;
            ++modCount;
            --size;
            // LinkedHashMap用到
            afterNodeRemoval(node);
            return node;
        }
    }
    return null;
}
```
