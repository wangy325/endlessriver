---
title: "MySQL字符串处理函数"
date: 2018-09-21
author: "wangy325"
weight: 2
tags: []
categories: [mysql]
---

本文介绍了mysql的几个方便的字符串处理函数，通常用于简单的查询结果处理。适用在mapper.xml的语句标签中对数据库字段数据进行简单的处理。

<!--more-->

#### SUBSTRING_INDEX(str,delim,count)

> 根据索引获取子字符串
> @param str 待处理字符串
> @delim 关键字
> @count 关键字出现的次数

```sql
SELECT SUBSTRING_INDEX('www.google.com/welcome','/',1);
-- www.google.com
SELECT SUBSTRING_INDEX(SUBSTRING_INDEX('www.google.com/welcome','/',1),'.',-2);
-- google.com
-- 当count为负数的时候,从尾部开始计算
```

#### SUBSTRING(str,pos,len)

> 获取指定长度的字串
> @str 原字符串
> @pos 开始截取的位置(包含)
> @len 子串长度

```sql
SELECT SUBSTRING("www.google.com", 5, 6);
SELECT SUBSTRING("www.google.com" FROM 5 FOR 6);
-- google
```

*此方法还有一些重载方法*

#### REPLACE(str,from_str,to_str)

> 替换字符串的内容 @str 原字符串
> @from_str 目标字符串(子串)
> @to_str 替换的字符串

```sql
SELECT REPLACE('www.google.com','google','baidu');
-- www.baidu.com
```

#### ALTER

##### 新增字段 (ADD)

> 在某张表中添加字段使用ADD关键字
> 支持批量添加
> 如果要在某个字段之后添加字段,可使用 AFTER 关键字

```sql
ALTER TABLE TABLE_NAME ADD (COL_NAME DATATYPE [UNSIGNED DEFAULT NOT NULL COMMENT],COLNAME2 DATATYPE,...);

ALTER TABLE TABLE_NAME ADD COL_NAME DATATYPE AFTER `col_name`;
```

##### 修改字段 (MODIFY CHANGE)

> 修改字段属性(数据类型,默认值,非空约束等)使用 MODIFY
> 修改字段名字以及数据类型,默认值,非空约束等使用 CHANGE

```sql
-- 修改字段属性
ALTER TABLE t1 MODIFY col1 BIGINT UNSIGNED DEFAULT 1 COMMENT 'my column';
-- 修改字段名字和属性
ALTER TABLE t1 CHANGE a b INT(11) DEFAULT 0 NOT NULL COMMENT 'comment';
```
