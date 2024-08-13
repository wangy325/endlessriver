---
#bookFlatSection: true
bookCollapseSection: true
weight: 2
title: "集合框架"
BookToC: false
BookComments: false
---

<center>

![JXUL1s.png](/img/collections/Collection.png)

<p style="color:grey;font-style:italic;font-size:.9rem">Java集合框架结构简图</p>

</center>


> 1. 未列出枚举集（`EnumSet`/`EnumMap`）
> 2. 未列出`IdentityHashMap`
> 3. 未列出`java.util.concurrent`包下的实现

上图列出了集合框架的常见实现，Java集合框架系列文章介绍了图中列出的大部分内容。

主要讨论三大接口：

1. List

    List是**有序集合**，或称之为**序列**。List的实现可以准确地控制插入元素的位置，也可以通过元素的**索引**(*index*)访问之，还可以在集合中搜索元素

    和[Set](./3_Set.md)不同，List允许元素重复出现，甚至允许多个`null`元素出现

    List定义了4个由索引执行的操作

    > E get(int index);
    >
    > E set(int index, E element);
    >
    > void add(int index, E element);
    >
    > E remove(int index);

    `ArrayList`由于实现了`RandomAccess`接口，其在使用索引随机访问时性能不会受影响，但是`LinkedList`执行索引操作的耗时是与集合大小正相关的。

    因此，在不清楚List的实现类型的时候[^1]，通**过迭代器遍历集合中的元素进行操作比直接使用索引更可取**。

    [^1]: 这种情况在获取集合视图(Collection view)时经常出现。

    `List`提供了一个独有的迭代器***ListIterator***，其提供了插入/替换元素的操作，并且支持**双向迭代**。

    关于`List`，分2文讨论：

    - [ArrayList](./1_List_arraylist.md)
    - [LinkedList](./1_List_linkedlist.md)

2. Set

    `Set`是**不含重复元素的集**，严格来讲，`Set`不允许当`e1.equals(e2)`为真时， *e1* 和 *e2* 同时出现在集合中。`Set`最多允许一个`null`元素。

    将**可变对象**置入`Set`时需要特别小心，当对象的改动影响到了元素之间的`equals()`比较的结果，那么`Set`的行为就变得不确定了。因此，**不能将Set本身作为Set的元素**。

    集的部分，主要讨论了`HashSet`和`TreeSet`：

    - [HashSet](./3_Set.md/#hashset)
    - [TreeSet](./3_Set.md/#treeset)

3. Map

    `Map`即映射，即键-值对，键不允许重复，并且一个键最多映射一个值。`Map`不在Java集合框架的范畴，但是其由集合框架的内容实现。自然也在集合框架的讨论之内。

    映射提供3种**集合视图**

    - 键集 （Set实现）
    - 值集 （Collection实现）
    - Map.Entry集（Set实现）

    关于`Map`的内容，主要讨论了3个：

    - [HashMap](./4_Map_hash_tree_map.md/#hashmap)
    - [TreeMap](./4_Map_hash_tree_map.md/#treemap)
    - [LinkedHashMap](./4_Map_linkedhashmap.md)

有关线程安全的集合将在并发编程部分讨论。

