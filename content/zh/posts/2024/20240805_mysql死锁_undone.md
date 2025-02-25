---
title: "MySQL死锁"
date: 2024-08-05
author: "wangy325"
tags: [undone]
categories: [mysql]
BookToC: false
---

MySQL死锁是指多个事务之间，由于每个事务持有另一个事务所需的锁而无法继续执行的情况。因所有事务都在等待相同的资源变得可用，而没有一个事务释放它所持有的锁。

多个事务以相反的顺序锁定多个表中的行（通过诸如UPDATE或SELECT ... FOR UPDATE之类的语句），就可能发生死锁。

死锁也可能发生在这些语句锁定索引记录和间隙范围时，每个事务获取一些锁但由于时间问题而没有获取其他锁。

<!--more-->

以下是一个死锁的栗子：

{{< hint info >}}
使用`SET GLOBAL innodb_print_all_deadlocks = ON`命令，可以查看死锁信息。
{{< /hint >}}

首先客户端A，开启事务，并获取`animals`表的相关锁：

```sql
mysql> set global innodb_print_all_deadlocks = on;
Query OK, 0 rows affected (0.01 sec)

mysql> create table animals (name varchar(10) primary key, value int) engine = InnoDB;
Query OK, 0 rows affected (0.03 sec)

mysql> create table birds (name varchar(10) primary key, value int ) engine = InnoDB;
Query OK, 0 rows affected (0.03 sec)

mysql> insert into animals(name, value) values ('cow', 1);
Query OK, 1 row affected (0.01 sec)

mysql> insert into birds(name, value) values ('pigeon', 1);
Query OK, 1 row affected (0.00 sec)

mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select value from animals where name = 'cow' for share;
+-------+
| value |
+-------+
|     1 |
+-------+
1 row in set (0.00 sec)
```

接着，客户端B开启事务，并且获取`birds`表相关锁，并视图更新`animals`表事务A获得锁的内容：

```sql
mysql> start transaction;
Query OK, 0 rows affected (0.00 sec)

mysql> select value from birds where name = 'pigeon' for share;
+-------+
| value |
+-------+
|     1 |
+-------+
1 row in set (0.00 sec)
mysql> update animals set value = 2 where name = 'cow';
```

这时候可以看到更新操作是被阻塞的，它在等待客户端A释放锁。

再打开一个新客户端，查看InnoDB的事务和锁信息：

```sql
mysql> SELECT ENGINE_TRANSACTION_ID as Trx_Id,
    ->               OBJECT_NAME as `Table`,
    ->               INDEX_NAME as `Index`,
    ->               LOCK_DATA as Data,
    ->               LOCK_MODE as Mode,
    ->               LOCK_STATUS as Status,
    ->               LOCK_TYPE as Type
    ->         FROM performance_schema.data_locks;
+-----------------+---------+---------+----------+---------------+---------+--------+
| Trx_Id          | Table   | Index   | Data     | Mode          | Status  | Type   |
+-----------------+---------+---------+----------+---------------+---------+--------+
| 422089830973440 | birds   | NULL    | NULL     | IS            | GRANTED | TABLE  |
| 422089830973440 | birds   | PRIMARY | 'pigeon' | S,GAP         | GRANTED | RECORD |
| 422089830973440 | birds   | PRIMARY | 'pigeon' | S,REC_NOT_GAP | GRANTED | RECORD |
| 422089830972632 | animals | NULL    | NULL     | IS            | GRANTED | TABLE  |
| 422089830972632 | animals | PRIMARY | 'cow'    | S,REC_NOT_GAP | GRANTED | RECORD |
+-----------------+---------+---------+----------+---------------+---------+--------+
5 rows in set (0.01 sec)

mysql> SELECT REQUESTING_ENGINE_LOCK_ID as Req_Lock_Id,
    ->               REQUESTING_ENGINE_TRANSACTION_ID as Req_Trx_Id,
    ->               BLOCKING_ENGINE_LOCK_ID as Blk_Lock_Id,
    ->               BLOCKING_ENGINE_TRANSACTION_ID as Blk_Trx_Id
    ->         FROM performance_schema.data_lock_waits;
+----------------------------------------+------------+----------------------------------------+-----------------+
| Req_Lock_Id                            | Req_Trx_Id | Blk_Lock_Id                            | Blk_Trx_Id      |
+----------------------------------------+------------+----------------------------------------+-----------------+
| 140614854262784:69:4:2:140614746300912 |       6700 | 140614854261976:69:4:2:140614746294048 | 422089830972632 |
+----------------------------------------+------------+----------------------------------------+-----------------+
1 row in set (0.01 sec)
```

从`performance_schema.data_lock_waits`表可以看到，此时有2个事务，`422089830973440`和`422089830972632`，分别代表客户端B`birds`表的锁和客户端A`animals`表的锁。

从等待锁的信息来看，等待锁的事务Id是`6700`，而等待释放锁的事务Id是`422089830972632`，正是客户端A开启的事务锁占用的`animals`表的锁。

若此时再次查看事务信息：

```sql
mysql> SELECT ENGINE_LOCK_ID as Lock_Id,
    ->               ENGINE_TRANSACTION_ID as Trx_id,
    ->               OBJECT_NAME as `Table`,
    ->               INDEX_NAME as `Index`,
    ->               LOCK_DATA as Data,
    ->               LOCK_MODE as Mode,
    ->               LOCK_STATUS as Status,
    ->               LOCK_TYPE as Type
    ->         FROM performance_schema.data_locks;
+----------------------------------------+-----------------+---------+---------+----------+---------------+---------+--------+
| Lock_Id                                | Trx_id          | Table   | Index   | Data     | Mode          | Status  | Type   |
+----------------------------------------+-----------------+---------+---------+----------+---------------+---------+--------+
| 140614854262784:1135:140614746303224   |            6700 | animals | NULL    | NULL     | IX            | GRANTED | TABLE  |
| 140614854262784:1136:140614746303136   |            6700 | birds   | NULL    | NULL     | IS            | GRANTED | TABLE  |
| 140614854262784:70:4:2:140614746300224 |            6700 | birds   | PRIMARY | 'pigeon' | S,GAP         | GRANTED | RECORD |
| 140614854262784:70:4:2:140614746300568 |            6700 | birds   | PRIMARY | 'pigeon' | S,REC_NOT_GAP | GRANTED | RECORD |
| 140614854261976:1135:140614746297040   | 422089830972632 | animals | NULL    | NULL     | IS            | GRANTED | TABLE  |
| 140614854261976:69:4:2:140614746294048 | 422089830972632 | animals | PRIMARY | 'cow'    | S,REC_NOT_GAP | GRANTED | RECORD |
+----------------------------------------+-----------------+---------+---------+----------+---------------+---------+--------+
6 rows in set (0.00 sec)
```

可以发现，事务（客户端B）相关的`birds`表的事务Id从`422089830973440`变成了`6700`。

这是因为，**当事务（客户端B）尝试修改数据库时，InnoDB使用序列事务Id**，这就会改变事务（客户端B）的Id。

所以，这和上面的信息对应。实际上就是客户端B等待客户端A释放`animals`表的锁。

这时，如果在客户端A尝试修改`birds`表的内容，那么就会发生死锁：

```sql
mysql> update birds set value = 2 where name = 'pigeon';
ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction
```

InnoDB的死锁是立刻发生的，并且InnoDB回滚了造成死锁的事务，也就是上述客户端A的更新操作。

因此，客户端B的更新操作可以继续执行了。

```sql
mysql> update animals set value = 2 where name = 'cow';
Query OK, 1 row affected (19.42 sec)
Rows matched: 1  Changed: 1  Warnings: 0
```

{{< hint warning >}}
此时，事务A确实被回滚了。可以通过查询`performance_schema.data_locks`表得到验证：

```sql
mysql> SELECT ENGINE_LOCK_ID as Lock_Id,
    ->               ENGINE_TRANSACTION_ID as Trx_id,
    ->               OBJECT_NAME as `Table`,
    ->               INDEX_NAME as `Index`,
    ->               LOCK_DATA as Data,
    ->               LOCK_MODE as Mode,
    ->               LOCK_STATUS as Status,
    ->               LOCK_TYPE as Type
    ->         FROM performance_schema.data_locks;
+----------------------------------------+--------+---------+---------+----------+---------------+---------+--------+
| Lock_Id                                | Trx_id | Table   | Index   | Data     | Mode          | Status  | Type   |
+----------------------------------------+--------+---------+---------+----------+---------------+---------+--------+
| 140614854262784:1135:140614746303224   |   6700 | animals | NULL    | NULL     | IX            | GRANTED | TABLE  |
| 140614854262784:1136:140614746303136   |   6700 | birds   | NULL    | NULL     | IS            | GRANTED | TABLE  |
| 140614854262784:70:4:2:140614746300224 |   6700 | birds   | PRIMARY | 'pigeon' | S,GAP         | GRANTED | RECORD |
| 140614854262784:70:4:2:140614746300568 |   6700 | birds   | PRIMARY | 'pigeon' | S,REC_NOT_GAP | GRANTED | RECORD |
| 140614854262784:69:4:2:140614746301256 |   6700 | animals | PRIMARY | 'cow'    | X,REC_NOT_GAP | GRANTED | RECORD |
+----------------------------------------+--------+---------+---------+----------+---------------+---------+--------+
5 rows in set (0.00 sec)
```

可以看到，事务ID全部是`6700`，说明是客户端B的事务，已经没有客户端A相关的信息了。

{{< /hint >}}

虽然死锁发生后很快被InnoDB处理，我们还是可以查看到死锁的信息：

通过`Information Schema`可以查看死锁的数量：

```sql
mysql> SELECT `count` FROM INFORMATION_SCHEMA.INNODB_METRICS
          WHERE NAME="lock_deadlocks";
+-------+
| count |
+-------+
|     1 |
+-------+
1 row in set (0.00 sec)
```

此外，通过`SHOW ENGINE INNODB STATUS` 命令可以查看存储引擎的相关信息，里面包含了死锁的信息：

```sql
mysql> show engine innodb status ;
------------------------
LATEST DETECTED DEADLOCK
------------------------
2024-08-05 13:51:17 140614374082112
*** (1) TRANSACTION:
TRANSACTION 6700, ACTIVE 608 sec starting index read
mysql tables in use 1, locked 1
LOCK WAIT 5 lock struct(s), heap size 1128, 4 row lock(s)
MySQL thread id 10, OS thread handle 140614683272768, query id 70 localhost root updating
update animals set value = 2 where name = 'cow'

*** (1) HOLDS THE LOCK(S):
RECORD LOCKS space id 70 page no 4 n bits 72 index PRIMARY of table `foobar`.`birds` trx id 6700 lock mode S locks rec but not gap
Record lock, heap no 2 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
 0: len 6; hex 706967656f6e; asc pigeon;;
 1: len 6; hex 000000001a2b; asc      +;;
 2: len 7; hex 81000001220110; asc     "  ;;
 3: len 4; hex 80000001; asc     ;;


*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 69 page no 4 n bits 72 index PRIMARY of table `foobar`.`animals` trx id 6700 lock_mode X locks rec but not gap waiting
Record lock, heap no 2 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
 0: len 3; hex 636f77; asc cow;;
 1: len 6; hex 000000001a29; asc      );;
 2: len 7; hex 810000011b0110; asc        ;;
 3: len 4; hex 80000001; asc     ;;


*** (2) TRANSACTION:
TRANSACTION 6701, ACTIVE 651 sec starting index read
mysql tables in use 1, locked 1
LOCK WAIT 4 lock struct(s), heap size 1128, 2 row lock(s)
MySQL thread id 8, OS thread handle 140614684329536, query id 71 localhost root updating
update birds set value = 2 where name = 'pigeon'

*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 69 page no 4 n bits 72 index PRIMARY of table `foobar`.`animals` trx id 6701 lock mode S locks rec but not gap
Record lock, heap no 2 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
 0: len 3; hex 636f77; asc cow;;
 1: len 6; hex 000000001a29; asc      );;
 2: len 7; hex 810000011b0110; asc        ;;
 3: len 4; hex 80000001; asc     ;;


*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 70 page no 4 n bits 72 index PRIMARY of table `foobar`.`birds` trx id 6701 lock_mode X locks rec but not gap waiting
Record lock, heap no 2 PHYSICAL RECORD: n_fields 4; compact format; info bits 0
 0: len 6; hex 706967656f6e; asc pigeon;;
 1: len 6; hex 000000001a2b; asc      +;;
 2: len 7; hex 81000001220110; asc     "  ;;
 3: len 4; hex 80000001; asc     ;;

*** WE ROLL BACK TRANSACTION (2)
```

TODO：

- [ ] 死锁的检测和处理
- [ ] 如何避免死锁

### References

- https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-example.html
- https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html
