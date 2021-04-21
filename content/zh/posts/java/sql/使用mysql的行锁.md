---
title: "MySQL锁的简单使用"
date: 2021-03-24
lastmod: 2021-03-24
draft: true
description: ""
tags:
- 锁
- 事务
categories:
- MySQL

series:

libraries:
-
author: "wangy325"
image:
---

对于MySQL数据库而言，事务的隔离级别在不同程度上保证了数据一致性。这能够满足大部分的业务需求，但是，仍然有那么一小戳事情，仅仅依靠事务不能完美解决。

我们知道，事务能读取到事务开始前就存在的数据，如果事务A需要对某条数据data1进行修改，在事务A还没有提交之前，事务B虽然不能读取到事务A对data1的修改（read committed隔离级别以上），但是能够读取data1原始的数据快照，并且能够再读取到的数据基础上对其进行修改（在事务A提交之后）。

<!--more-->

> 试想，如果是商品库存数据或者其他业务敏感数据，这可能导致什么后果？



#
