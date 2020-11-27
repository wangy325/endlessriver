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

# 实例

## 查看数据库的基本信息

在实例演示之前，需要查看几个基本信息，来确保测试环境的一致性与可行性。这些基本信息包括，数据库当前所使用的引擎，数据库当前的事务隔离级别。

### 引擎

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

### 隔离级别

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
当前数据库的事务隔离级别为可重复读，加上InnoDB引擎的MVCC，基本上是满足事务的ACID特性的数据库系统。

在进行测试时，我们可以通过

```SQL
mysql> SET TRANSACTION ISOLATION LEVEL [tx_isolation];
```
来控制当前客户端连接的下个事务隔离级别——只对当前连接的**下一次事务生效**生效，这样便于测试。

更多关于`set transaction`命令的内容：https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html

## 测试开始

在测试过程中，涉及到的客户端命令有：

- `begin`或者`start transaction`开始事务
- `rollback`回滚/结束事务
- `commit`提交/结束事务

### 脏读

![脏读](/img/mysql-tx-read-uncommitted.png)

从上面的执行图可以看到：

- 会话1（左）和会话2（右）的事务隔离级别都设置为*READ UNCOMMITTED*；
- 会话1将`vend_id`=1007对应的`vend_address`改为`sz`；
- 此时会话2中去读取`vend_id`=1007的数据，已经读取到了会话1**未提交**的更改；
- 接着会话1将更改回滚；
- 会话2再次读取`vend_id`=1007的数据，发现数据列`vend_address`变为初始值。

上面的执行流程完整的演示了在*READ UNCOMMITTED*隔离级别下的脏读现象。

### 不可重复读

![不可重复度](/img/mysql-tx-read-committed.png)

从上面的执行图可以看到：

- 会话1和会话2的事务隔离级别都设置为*READ COMMITTED*；
- 会话1将`vend_id`=1007对应的`vend_address`改为`sz`；
- 此时会话2中去读取`vend_id`=1007的数据，读取不到会话1**未提交**的更改；
- 会话1提交更改
- 会话2再次读取`vend_id`=1007的数据，读取到数据列`vend_address`的更改。

上面的执行流程完整演示了在*READ COMMITTED*隔离级别下的**不可重复读**现象。

### 可重复读

![可重复读](/img/mysql-tx-repeatable-read.png)

从上面的执行图可以看到：

- 会话2在会话1插入新记录并提交之后，都无法从数据库中读取到对应的记录；
- 会话2使用更新语句更新了那条会话1提交但会话2无法读取的数据；
- 会话2成功读取到了那条记录；
- 会话2提交；
- 会话1也读取到了会话2的更改。

### 串行

![串行](/img/mysql-tx-serializable.png)

当使用最高的事务级别同时开启2个事务时，2个事务只能一次执行，换言之，会话2会阻塞会话1的`insert`操作，只有当会话2`commit/rollback`之后，会话1才会结束阻塞。

> 上图中第一次执行insert的时候，发现语句迟迟不返回，以为是语句故障，使用ctrl-c结束了语句执行，控制台输出了
>
>> <code>ERROR 1317 (70100): Query execution was interrupted</code>
>
看到interruptted，间接证明了insert操作确实是处于阻塞状态


[^1]: 类比资源的序列访问，可能不太恰当，大可不必过分纠结于此。
[^2]: 当然可以使用权限控制将某个资源排除对特定连接的共享。
[^3]: 这也是有些业务不需要事务支持，使用MyISAM(*indexed sequencial access method*)作为数据库引擎的原因。
[^4]: 一些存储引擎在处理数据库死锁的时选用的方法。InnoDB并不是采用的此方法，其是将持有最少行锁的事务回滚。
