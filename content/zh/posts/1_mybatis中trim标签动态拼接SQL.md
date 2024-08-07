---
title: "MyBatis的trim标签"
date: 2018-09-21
draft: false
description: "mybatis的基础知识。"
author: "wangy325"
# weight: 6
categories: [java]
tags: []
---


`trim`标记是一个格式化的标记，可以完成`set`或者是`where`标记的功能。

<!--more-->

## 样例一

```sql
　　select * from user

　　<trim prefix="WHERE" prefixoverride="AND |OR">

　　　　<if test="name != null and name.length()>0"> AND name=#{name}</if>

　　　　<if test="gender != null and gender.length()>0"> AND gender=#{gender}</if>

　　</trim>
```

假如说`name`和`gender`的值都不为`null`的话打印的SQL为：`select * from user where name = 'xx' and gender = 'xx'`

在红色标记的地方是不存在第一个and的，上面两个属性的意思如下：

> prefix：前缀
>
> prefixoverride：去掉第一个`and`或者是`or`

## 样例二

```sql
　　update user

　　<trim prefix="set" suffixoverride="," suffix=" where id = #{id} ">

　　　　<if test="name != null and name.length()>0"> name=#{name} , </if>

　　　　<if test="gender != null and gender.length()>0"> gender=#{gender} ,  </if>

　　</trim>
```

假如说`name`和`gender`的值都不为`null`的话打印的SQL为：`update user set name='xx' , gender='xx' where id='x'`

在红色标记的地方不存在逗号，而且自动加了一个set前缀和where后缀，上面三个属性的意义如下，其中prefix意义如上：

> suffixoverride：去掉最后一个逗号（也可以是其他的标记，就像是上面前缀中的and一样）
>
> suffix：后缀

实例:

```sql
insert into yd_submit_fail
<trim prefix="(" suffix=")" suffixOverrides="," >  
	<if test="id != null" >
		id,
	</if>
	<if test="createTime != null" >
		createTime,
	</if>
	<if test="updateTime != null" >
		updateTime,
	</if>
</trim>
<trim prefix= "values ("  suffix =")"  suffixOverrides=",">
	<if test="id != null" >
		{#id},
	</if>
	<if test="createTime != null" >
		{#createTime},
	</if>
	<if test="updateTime != null" >
		{#updateTime},
	</if>
</trim>
```
