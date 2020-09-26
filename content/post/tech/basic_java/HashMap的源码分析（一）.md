---
title: "HashMap的源码分析（一）"
date: 2020-09-24
lastmod: 2020-09-24
draft: false
tags: [Java基础, 集合框架]
categories: [Java]
author: "wangy325"

hasJCKLanguage: true

weight: 10
mathjax: true
autoCollapseToc: false
---

本文内容简单分析了JDK8中HashMap源码的几个重要方法，便于理解散列表在Java集合框架中的具体应用。

HashMap基于散列表，散列表中每一个Node节点（桶）是链表数组，当两个条目（entry）的key的hash值对桶数（capacity）取模的值相等时，这两个entry会存储在同一个链表数组中。但当链表数组中元素达到一定数目时，链表数组结构会转变为**树结构**

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

### 2.2 插入键值对与扩容

键值对的插入与扩容密不可分，接下来从这两个方法来阐述HashMap的键值对插入过程


插入（更新）键值对：

```Java
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

初始化/扩容映射集：

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
