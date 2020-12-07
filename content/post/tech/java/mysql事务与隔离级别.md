---
title: "mysql事务与隔离级别"
date: 2020-11-27
lastmod: 2020-11-27
draft: false
tags: [transation, tx-isolation]
categories: [mysql]

hasJCKLanguage: true

weight: 10
mathjax: true
autoCollapseToc: false

---

mysql事务属于老生常谈的内容了，并不指望这一篇文章将其搞透，本篇文章只是将mysql事务的外衣扒了，让其看起来不再那么神秘与华丽。有时候，新手总是对“事务”这两个字怀有莫名的恐惧感，因为其藏在mysql内部，偷偷地工作着，就好像你没有凝视深渊，而深渊却在凝视你。

事务的概念可以这样理解：

> 在mysql中，有些操作必须要分步完成，那么我们可以把这些分步完成的操作声明为一个“事务”，用来保证mysql数据一致性。
<p>
    对于单条sql语句而言，mysql将其处理为一个「隐式事务」。

看起来，事务的概念还是有些空泛。事实上，有了一定的并发基础后（这也是这篇文章写在java并发之后的原因），更加容易理解事务这个概念，这并不是说事务一个并发概念，不过，事务是有了并发之后才衍生的概念，这很容易理解。试想一个只容许一个客户端连接的mysql服务，是否需要“事务”呢？答案应该是否定的。单个客户端执行sql语句总是有序的，数据一致性就能得到保证了[^1]。试想，如果是多客户端的系统（事实上正是如此）同时执行sql语句，就好似多线程同时访问资源一样，对于数据库系统而言，所有的数据表都是共享资源[^2]，那么事务就像是那把保证并发安全的锁。

<!--more-->

# 事务的ACID性质

事务可以保证被声明为事务的分步操作要么都成功执行，要么都不执行。执行成功的那些步骤操作会被**回滚**，这样不会对mysql的数据完整性进行破坏。

- <span style="font-style:italic;font-weight:bold;color:#0047AB">Atomicity</span> 原子性

    原子性的概念和所有并发编程的概念一样，如果声明一个操作是原子的，那么这个操作要么执行，要么不执行。如果声明了一个事务，那么就可以把其看作一个「并发编程里面的[临界区](../%E8%B5%84%E6%BA%90%E8%AE%BF%E9%97%AE%E5%8F%97%E9%99%90/#6-%E4%B8%B4%E7%95%8C%E5%8C%BA)」，其包含的分步操作要么全部执行，要么全不执行。

- <span style="font-style:italic;font-weight:bold;color:#0047AB">Consistency</span> 一致性

    数据库的状态只会从一个一致状态转移到另一个一致状态，事务操作不应该影响数据的一致性。比如转账操作，A账户转出100，B账户一定会转入100。若A账户转出100之后系统崩溃，账户A也不会损失100元，因为事务没有提交，所有事务的修改不会提交到数据库中。

- <span style="font-style:italic;font-weight:bold;color:#0047AB">Isolation</span> 隔离性

    如果有多个事务并发执行，那么事务之间应该不能产生干扰，这也是保证数据安全性的重要环节。比如A账户转出100元，此时有另一个事务读取了A账户的值，读取到的账户的值不应该是A账户减去100元的值，而应该是原始值。

- <span style="font-style:italic;font-weight:bold;color:#0047AB">Durability</span> 持久性

    一旦事务被提交，其对数据的修改是永久性的。即使系统崩溃，修改的数据也不会丢失。

# 事务的隔离级别

如果事务满足ACID性质，那么数据安全性就不会受到威胁。那么，设计一个逻辑来保证事务的ACID性质不就解决问题了么，为什么还要设计事务的隔离级别呢？结合实际情况来看，并非所有的事务都需要满足ACID特性，有些数据对准确性要钱不高的的事务，是允许读取到其他事务修改的数据<sup><a>例证</a></sup>。另外，在实现过程中，一个满足ACID特性的数据库系统要复杂的多，系统需要做很多额外的操作来满足ACID特性，这样会造成额外的开销，系统会占用更多的资源而影响数据库的执行效率。这也是数据库中仍然有不支持事务的存储引擎一席之地的原因[^3]。

事务的隔离级别并不是mysql独有的，它是SQL标准中定义的，没种隔离级别都规定了一个事务中所做的修改在那些事务内和事务間是可见的，哪些是不可见的。较低的隔离级别支持更高的并发、拥有更高的效率。

- <span style="font-style:italic;font-weight:bold;color:#0047AB">READ UNCOMMITTED</span>（读未提交）

    这个隔离级别中，事务中的修改，即使没有提交，对其他事务都是可见的。其他事务可以读取到未提交的数据，这种情况称为**脏读**（***dirty read***）。这个级别会导致很多问题，一般很少使用。

- <span style="font-style:italic;font-weight:bold;color:#0047AB">READ COMMITTED</span>（读已提交）

    这个隔离级别中，满足隔离性的简单定义，一个事务开始前，只能读取到已经提交的事务所做的修改。换言之，一个事务对数据库所做的任何修改在其提交之前都其他事务都是不可见的。这会导致是个现象：一个事务可能2次读取到的数据是不一致的（事务A提交前与提交后），这种情况称为**不可重复读**（***nonrepeatable read***）

- <span style="font-style:italic;font-weight:bold;color:#0047AB">REPEATABLE READ</span>（可重复读）

    可重复读解决了脏读的问题，同时也保证了在事务了多次对同一个数据取样，读取到的数据是一致的。但是，理论上，该隔离级别的不能解决**幻读**（***phantom read***）的问题：幻读指的是某个事务在读取**某个范围**的记录时，另外一个事务又在该范围内插入了新的记录，那么，当之前的事务再次读取这个范围的记录时，就会出现**幻行**（***phantom row***）。不过InnoDB引擎通过MVCC(*multi version concurrency control*)多版本并发控制解决了幻读的问题。

    可重复读是mysql的**默认隔离级别**

- <span style="font-style:italic;font-weight:bold;color:#0047AB">SERIALIZABLE</span>（可串行化）

    SERIALIZABLE是最高的隔离级别，它通过强制所有的sql语句**串行**执行来避免幻读的问题。该隔离级别下，每一行使用到的数据都会加锁，所以当数据库请求量大的时候，就有可能造成大量的超时等待[^4]和锁争用的问题。这个隔离级别很少使用，因为其牺牲了很大量的性能来保证数据一致性，如果不是严格地要求数据一致性，可以考虑次=此隔离级别。

下表展示了事务隔离级别以及其可能引起的后果之间的额关系：

<!--
|隔离级别|脏读可能性|不可重复读可能性|幻读可能性|加锁读|
|:--:|:--:|:--:|:--:|:--:|
|READ UNCOMMITTED|Y|Y|Y|N|
|READ COMMITTED|N|Y|Y|N|
|REPEATABLE READ|N|N|Y|N|
|SERIALIZABLE|N|N|N|Y|
-->

<div class="table-wrapper"><table style="margin: auto;">
<thead>
<tr>
<th align="center">隔离级别</th>
<th align="center">脏读可能性</th>
<th align="center">不可重复读可能性</th>
<th align="center">幻读可能性</th>
<th align="center">加锁读</th>
</tr>
</thead>

<tbody>
<tr>
<td align="center">READ UNCOMMITTED</td>
<td align="center">Y</td>
<td align="center">Y</td>
<td align="center">Y</td>
<td align="center">N</td>
</tr>

<tr>
<td align="center">READ COMMITTED</td>
<td align="center">N</td>
<td align="center">Y</td>
<td align="center">Y</td>
<td align="center">N</td>
</tr>

<tr>
<td align="center">REPEATABLE READ</td>
<td align="center">N</td>
<td align="center">N</td>
<td align="center">Y</td>
<td align="center">N</td>
</tr>

<tr>
<td align="center">SERIALIZABLE</td>
<td align="center">N</td>
<td align="center">N</td>
<td align="center">N</td>
<td align="center">Y</td>
</tr>
</tbody>
</table></div>


# 查看数据库的基本信息

在实例演示之前，需要查看几个基本信息，来确保测试环境的一致性与可行性。这些基本信息包括，数据库当前所使用的引擎，数据库当前的事务隔离级别。

## 引擎

使用下面的命令查看当前数据库的引擎信息

```SQL
mysql> show  variables like '%engine%';
+----------------------------------+--------+
| Variable_name                    | Value  |
+----------------------------------+--------+
| default_storage_engine           | InnoDB |
| default_tmp_storage_engine       | InnoDB |
| disabled_storage_engines         |        |
| internal_tmp_disk_storage_engine | InnoDB |
+----------------------------------+--------+
4 rows in set (0.01 sec)
```
看到系统当前数据库（版本5.7）的默认存储引擎是InnoDB，InnoDB引擎支持事务，就用这个引擎测试。

我们使用供应商表`vendors`完成接下来的测试，先看看`vendors`表所使用的引擎：

```SQL
mysql> show table status like 'vendors' \G
*************************** 1. row ***************************
           Name: vendors
         Engine: InnoDB
        Version: 10
     Row_format: Dynamic
           Rows: 6
 Avg_row_length: 2730
    Data_length: 16384
Max_data_length: 0
   Index_length: 0
      Data_free: 0
 Auto_increment: 1008
    Create_time: 2020-11-25 18:37:46
    Update_time: NULL
     Check_time: NULL
      Collation: utf8_general_ci
       Checksum: NULL
 Create_options:
        Comment:
1 row in set (0.00 sec)
```
我们看到`vendors`表的引擎也是InnoDB。

## 隔离级别

使用如下命令查看当前数据库的事务隔离级别

```SQL
mysql> show variables like 'tx_isolation';
+---------------+-----------------+
| Variable_name | Value           |
+---------------+-----------------+
| tx_isolation  | REPEATABLE-READ |
+---------------+-----------------+
1 row in set (0.01 sec)
```
当前数据库的事务隔离级别为可重复读，加上InnoDB引擎的**MVCC**，基本上是满足事务的ACID特性的数据库系统。

在进行测试时，我们可以通过

```SQL
mysql> SET TRANSACTION ISOLATION LEVEL [tx_isolation];
```
来控制当前客户端连接的下个事务隔离级别——只对当前连接的**下一次事务生效**生效，这样便于测试。

更多关于`set transaction`命令的内容：https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html

在测试过程中，涉及到的客户端命令有：

- `begin`或者`start transaction`开始事务
- `rollback`回滚/结束事务
- `commit`提交/结束事务

# 读未提交 READ UNCOMMITTED

![脏读](/img/mysql-tx-read-uncommitted.jpg)

从上面的执行图可以看到：

- 会话1（左）和会话2（右）的事务隔离级别都设置为***READ UNCOMMITTED***
- 会话1将`vend_id`=1007对应的`vend_address`改为`sz`；
- 此时会话2中去读取`vend_id`=1007的数据，已经读取到了会话1**未提交**的更改；<span style=background-color:yellow;font-weight:bold><==脏读</span>
- 接着会话1将更改**回滚**；
- 会话2再次读取`vend_id`=1007的数据，发现数据列`vend_address`变为初始值。<span style=background-color:yellow;font-weight:bold><==不可重复读</span>

上面的执行流程完整的演示了在***READ UNCOMMITTED***隔离级别下的**脏读**和**不可重复读**现象。

# 读已提交 READ COMMITTED

![不可重复度](/img/mysql-tx-read-committed.jpg)

从上面的执行图可以看到：

- 会话1和会话2的事务隔离级别都设置为***READ COMMITTED***；
- 会话1将`vend_id`=1007对应的`vend_address`改为`sz`；
- 此时会话2中去读取`vend_id`=1007的数据，不能读取到会话1**未提交**的更改；<span style=background-color:yellow;font-weight:bold><==结果1</span>
- 会话1**提交**更改
- 会话2再次读取`vend_id`=1007的数据，读取到数据列`vend_address`的更改。<span style=background-color:yellow;font-weight:bold><==结果2</span>

上面的执行流程完整演示了在***READ COMMITTED***隔离级别下，两次读取到的结果不一致的现象，即在此隔离级别下**不可重复读**。


# 多版本并发控制（MVCC）

前文提到，mysql的InnoDB引擎使用MVCC解决了在可重复读(*REPEATABLE READ*)隔离级别下幻读(*phantom read*)的问题。因此，在执行可重复读隔离级别的测试之前，先介绍一下多版本并发控制(**M**ulti **V**ersion **C**ocurrency **C**ontrol)[^5]。

可以认为，MVCC是**行级锁**的一个变种，但是其在很多情况下避免了加锁操作[^6]，因此可以节省部分开销，获得更好的性能。

在InnoDB的MVCC中，通过在每行记录之后添加2个**隐藏的列**来实现的：

<!--
|\\|隐藏列1|隐藏列2|
|:--:|:--:|:--:|
|记录内容|行的创建时间|行的过期时间（删除时间）|
-->

<center>
<div class="table-wrapper"><table>
<thead>
<tr>
<th align="center">\\</th>
<th align="center">隐藏列1</th>
<th align="center">隐藏列2</th>
</tr>
</thead>

<tbody>
<tr>
<td align="center"><span style=font-weight:bold>记录内容</span></td>
<td align="center">行的创建时间</td>
<td align="center">行的过期时间（删除时间）</td>
</tr>
</tbody>
</table></div>
</center>

要注意的是，实际上存储的并不是实际的时间值，而是当前的**系统版本号**（system version number）。系统版本号有如下特征：

- 每开始一个新事务，系统版本号都会**递增** ；
- 事务**开始时**的版本号作为**事务的版本号**；
- 事务的版本号用来和查询到的每条记录的版本号对比，决定语句的操作；

在***REPEATABLE READ***隔离级别下，MVCC的具体行为是：

- SELECT
    InnoDB会根据一下条件检查每行记录：
    1. InnoDB只查找版本号**早于**当前事务版本号的数据（小于等于事务的版本号） 。这样做，可以保证当前事务**只能读取**事务开始前已经存在的数据行，或者该事务**自身插入或者修改**的数据行；
    2. 行的删除版本要么未定义，要么**大于**当前事务版本号。这可以保证事务开始前，读取到的行**未被删除**。

- INSERT
    InnoDB为新插入的每一行保存**当前系统版本号**所为**行版本号**。

- DELETE
    InnoDB为删除的每一行保存**当前系统版本号**作为**删除标识**。

- INSERT
    InnoDB为插入**一行新纪录**保存当前系统版本号作为**行版本号**，同时保存当前系统版本号到**原来的行**作为行删除标识

事实上，MVCC是通过保存数据在某个时间点的**快照**（***snapshot***）来实现的，也就是说不管事务执行多长时间，其所能看到的数据都是一致的。这就可能造成一个现象：

> 根据事务开始的时间的不同，**每个事务对同一张表，同一时刻看到的数据可能是不一致的**。

在接下来的演示中，我们将会看到MVCC在事务执行过程中的行为。


# 可重复读 REPEATABLE READ

![可重复读](/img/mysql-tx-repeatable-read.jpg)

这是一个相对完整的示例，演示了InnoDB引擎在默认事务隔离级别下，不同事务在处理同一行数据之间的表现，其中有一些结果出乎意料却又在MVCC以及事务隔离级别的“情理之中”。在这个示例中我们可以看到以下重要内容：

1. 事务只能读取到在其开始之前就已经存在的数据，或者其自身修改的数据；
2. 事务使用了**行级锁**来保证数据一致；
3. 事务B可以修改事务A创建但未提交的数据，并且事务B随即可读取之，这验证了第1点；
4. 事务A无法读取到事务B的修改（只要这个修改发生在事务A开始之后，无论事务B是否提交），这保证了**可重复读**；
5. 如果数据行在事务A在开始前已经存在，但随即被事务B**删除**，那么事务A无法再对数据行进行修改。但是事务A依旧可以读取到数据行的内容。这就是“快照”的概念在MVCC中的行为。

遗憾的是，笔者试图从MVCC“系统版本号”的概念去推断事务的执行，始终无法得出与预期一致的结果，所以关于MVCC“系统版本号”的工作机制，此文尚不能详述，不过，程序的执行期望却和前文描述的MVCC行为是一致的。其实，使用“快照”的概念去理解MVCC的行为，会显得更容易。

# 串行 SERIALIZABLE

![串行](/img/mysql-tx-serializable.jpg)

当使用最高的事务级别同时开启2个事务时，2个事务只能依次执行，换言之，会话2会阻塞会话1的`insert`操作，只有当会话2`commit/rollback`之后，会话1才会结束阻塞。

> 上图中第一次执行insert的时候，发现语句迟迟不返回，以为是语句故障，使用ctrl-c结束了语句执行，控制台输出：
>
> ```SQL
ERROR 1317 (70100): Query execution was interrupted
> ```
> 看到interruptted，间接证明了insert操作确实是处于阻塞状态

# 参考

- [高性能mysql 第3版](https://book.douban.com/subject/23008813/)
- [廖雪峰的官方网站-数据库事务](https://www.liaoxuefeng.com/wiki/1177760294764384/1179611198786848)
- [mysql document page](https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html#set-transaction-scope)
- [【推荐】数据库的事务和锁](https://juejin.cn/post/6844903645125820424#heading-15)[^7]


[^1]: 类比资源的序列访问，可能不太恰当，大可不必过分纠结于此。
[^2]: 当然可以使用权限控制将某个资源排除对特定连接的共享。
[^3]: 这也是有些业务不需要事务支持，使用MyISAM(*indexed sequencial access method*)作为数据库引擎的原因。
[^4]: 一些存储引擎在处理数据库死锁的时选用的方法。InnoDB并不是采用的此方法，其是将持有最少行锁的事务回滚。
[^5]: 不仅仅mysql，很多数据库系统包括Oracle，PostGreSQL都实现了MVCC，尽管其实现机制不尽相同。
[^6]: MVCC的并发控制有乐观加锁和悲观加锁两种方式，并不是所有的实现都不加锁，只有使用乐观锁是不加锁的。
[^7]: 此链接正文部分关于索引的讨论有些谬误，这些谬误在评论区可找到相关讨论。
