---
title: "一个简单的sql优化示例"
date: 2018-11-14
author: "wangy325"
weight: 3
---


<!--more-->

例如，我在执行以下sql语句的时候

```sql
SELECT projectId FROM lywl_equip_package WHERE salesId in (
		SELECT
		t1.id
		FROM
			cmp_datapackage_user t1
		LEFT JOIN cmp_datapackage t2 ON t1.datapackage_id = t2.id
		WHERE
			t1.sales_cycle > 1
		AND t1.is_valid = 1
		AND t1.is_share = 0
		AND t1.sales_price <> 9999
		AND t1.sales_name REGEXP '移动.*/(季度|半年|年)'
		AND t2.operator =1
		AND t2.is_share = 1
		AND t2.datapackage_cycle = 1
	)
```

以上sql查询的是订购移动跨月销售品的设备id, 查询耗时 6.462s。

由于 lywl_equip_package 数据量比较大, in 查询每次都将 lywl_equip_package 的数据与in 语句中的匹配, 耗时较为严重。

但是作如下改动之后,sql的查询效率就快很多：

```sql
SELECT
tt2.projectId
  FROM (
  	SELECT
  		t1.id
  	FROM
  		cmp_datapackage_user t1
  	LEFT JOIN cmp_datapackage t2 ON t1.datapackage_id = t2.id
  	WHERE
  		t1.sales_cycle > 1
  	AND t1.is_valid = 1
  	AND t1.is_share = 0
  	AND t1.sales_price <> 9999
  	AND t1.sales_name REGEXP '移动.*/(季度|半年|年)'
  	AND t2.operator =1
  	AND t2.is_share = 1
  	AND t2.datapackage_cycle = 1
  ) tt1
  LEFT JOIN lywl_equip_package tt2 ON tt2.salesId = tt1.id
```

查询时间 0.246s

以上的操作在于, 将IN查询中的结果储存为一张临时表,然后将其作为主表,左连接lywl_equip_package.以数据少的表作为主表,可以提升查询效率。
