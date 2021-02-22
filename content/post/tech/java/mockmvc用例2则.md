---
title: "在SpringBoot项目中使用MockMvc进行接口测试"
date: 2021-02-07
lastmod: 2020-02-22
draft: false
tags: [测试, mockito]
categories: [java,springboot,mockito]
author: "wangy325"
hasJCKLanguage: true
weight: 10
mathjax: true
autoCollapseToc: false
---

> 现在流行在项目中使用[swagger](swagger.io)对接口进行测试，这确实很方便、直观。
>
> 但是MockMvc作为spring-test包中指定的测试框架，在没有使用swagger的项目中，使用其进行测试是很好的选择。

本文简单介绍在springboot项目中使用[Mockito](https://site.mockito.org/)和[MockMvc](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/MockMvc.html)对控制器进行测试。

<!--more-->

# 了解Mockito

mock: 模仿。


# 参考

- mockito：https://site.mockito.org/
- mockito API：https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html
- MockMvc doc：https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/MockMvc.html
- json-path：https://github.com/json-path/JsonPath
- https://stackoverflow.com/questions/47276920/mockito-error-however-there-was-exactly-1-interaction-with-this-mock
- 