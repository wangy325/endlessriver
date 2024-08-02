---
title: "MySQL锁的简单使用"
date: 2021-03-24
author: "wangy325"
weight: 5
tags: [undone]
categories: [mysql]
BookToC: true
---

对于MySQL数据库而言，[事务的隔离级别](./4_MySQL事务与隔离级别.md)在不同程度上保证了数据一致性。

我们知道，**事务**的四大特性：原子性、一致性、隔离性、持久性，其中**隔离性**就是通过**锁机制**来保证的。

>另外3个性质，通过MySQL的`redo log` 和`undo log`来保证。

MySQL对每条SQL语句的执行，都添加了一个隐式事务，言外之意，就是添加了隐式锁。

除了隐式锁之外，MySQL还可以使用显式锁。

这是从锁的可见性（或者使用方式）上来区分锁。本文不讨论MySQL的粒度锁（表锁，行锁，页锁）。

<!-- ~~我们知道，事务能读取到事务开始前就存在的数据，如果事务A需要对某条数据data1进行修改，在事务A还没有提交之前，事务B虽然不能读取到事务A对data1的修改（read committed隔离级别以上），但是能够读取data1原始的数据快照，并且能够再读取到的数据基础上对其进行修改（在事务A提交之后）。~~ -->

<!--more-->

实际开发中，很少的业务场景需要使用显式锁，基本上运用好MySQL的事务隔离机制，就可以处理好基本上95%<sup>大体上</sup>的问题。 本文简单地讨论了MySQL显式锁的使用。

MySQL显式锁可以简单地分为2类：

- 读锁（S锁，共享锁，*Share Lock*）
- 写锁（X锁，排它锁，*Exclusive Lock*）


### 读锁

MySQL使用

    select ...  lock in share mode

或者（8）

    select ... for share

意思很明确，读锁是共享的，不同的会话可以同时获取读锁，因为读并不会改变共享数据，可以提升并发性能。实际上，读”可能“不需要加锁。

耗时长的事务，可以对“读”加锁，来防止其他会话对数据进行改动。

>在MVCC的行为中，可重复读隔离级别下，新会话是可以改动其他事务读取的数据的，不过这个改动，在已经开始的事务中是不可见的（快照，以及保证可重复读）。



```console
mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from user where id = 1 for share;
+----+------+--------+------+------------+
| id | name | gender | age  | note       |
+----+------+--------+------+------------+
|  1 | anna |      1 |   17 | quiet girl |
+----+------+--------+------+------------+
1 row in set (0.00 sec)
```

<p style="font-size:.8rem;font-style:italic;text-align:center; color:grey">会话1: 开启事务，并且对id=1的数据行添加读锁</p>


```console
mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from user where id = 1 for share;
+----+------+--------+------+------------+
| id | name | gender | age  | note       |
+----+------+--------+------+------------+
|  1 | anna |      1 |   17 | quiet girl |
+----+------+--------+------+------------+
1 row in set (0.00 sec)

mysql> select * from user where id = 1 for update;
^C^C -- query aborted
ERROR 1317 (70100): Query execution was interrupted

mysql> update user set age = 16 where id = 1 ;
^C^C -- query aborted
ERROR 1317 (70100): Query execution was interrupted
```

<p style="font-size:.8rem;font-style:italic;text-align:center; color:grey">会话2: 开启事务，更新id=1的数据失败</p>


很明显可以看到：

- 不同的会话可以对同一数据加读锁；
- 不同的会话**无法获取**同一数据的写锁；
- 加读锁可以**保护数据**免被修改；

### 写锁

MySQL使用

    select ... for update

对数据加写锁。

```console
mysql> begin;
Query OK, 0 rows affected (0.00 sec)

mysql> select * from user where id = 1 for update;
+----+------+--------+------+------------+
| id | name | gender | age  | note       |
+----+------+--------+------+------------+
|  1 | anna |      1 |   17 | quiet girl |
+----+------+--------+------+------------+
1 row in set (0.00 sec)

mysql> update user set name = 'annie' where id  = 1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0
```

<p style="font-size:.8rem;font-style:italic;text-align:center; color:grey">会话1: 开启事务，对id=1的数据行添加写锁</p>

```console
mysql> select * from user where id = 1 for share ;
^C^C -- query aborted
ERROR 1317 (70100): Query execution was interrupted

mysql> update user set name = 'anna' where id = 1 ;
^C^C -- query aborted
ERROR 1317 (70100): Query execution was interrupted
mysql> select * from user where id = 1 for share skip locked;
Empty set (0.00 sec)

mysql> select * from user where id = 1;
+----+------+--------+------+------------+
| id | name | gender | age  | note       |
+----+------+--------+------+------------+
|  1 | anna |      1 |   17 | quiet girl |
+----+------+--------+------+------------+
1 row in set (0.00 sec)
```

<p style="font-size:.8rem;font-style:italic;text-align:center; color:grey">会话2: 开启事务，尝试获取id=1的数据行的锁</p>

可以看到，对数据加写锁之后：

- 其他会话无法获取读锁；
- 其他会话无法更新数据；
- MySQL提供了 `skip locked` 语句来跳过锁
- 可以查询事务开始前的数据，无法获取事务开始后其他会话的更新（MVCC）。

### 开发实践

在开发实践中，一般使用乐观锁机制。

{{< hint info >}}
一些中间件框架（如`mybatis-plus`）支持使用乐观锁更新数据。
{{< /hint  >}}

乐观锁是一种思想，它默认没有其他会话更改数据，因此总是尝试直接更改数据，而不是去加锁。这样可以提高读取性能。

实际开发实践中，最常用“版本号”来作为乐观锁的实现机制。意思就是在表中添加`version`字段。

其基本逻辑是：

{{< mermaid >}}
flowchart LR
A(更新前获取版本号 v1)  -->  B(更新时获取版本号 v2)
B --> C{v1 == v2?}
C --> |Y| D(更新 v = v1 + 1)
C --> |N| E(不更新)

{{< /mermaid >}}

```sql
update ... set version = version + 1 where `version` = version;
```

