---
title: "在SpringBoot项目中使用MockMvc进行接口测试"
date: 2021-02-07
lastmod: 2020-02-22
draft: true
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

简单来说，[Mockito](https://site.mockito.org/)是一个模拟创建对象的框架，利用它提供的API，可以简化单元测试工作。Mockito的API易读性是很好的，并且错误信息也很简明。`spring-boot-starter-test`模块中引入了`mockito`依赖，如果你使用springboot，那么就可以直接使用Mockito进行单元测试。

我们从[官方API文档](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)的的引例开始，看看Mockito是如何工作的：

```java

 // 学会使用静态导入，代码会更简洁
 import static org.mockito.Mockito.*;

 // mock List接口对象
 List mockedList = mock(List.class);

 // 使用Mock的List对象
 mockedList.add("one");
 mockedList.clear();

 // 校验某个行为是否发生过1次
 verify(mockedList).add("one");
 verify(mockedList).clear();
```

一旦mock对象被创建，mock会记住对其的所有操作，之后，你便可以选择性的校验这些操作。

```java
 // 也可以mock实体类对象
 LinkedList mockedList = mock(LinkedList.class);

 // 为操作绑定返回值（stubbing）
 when(mockedList.get(0)).thenReturn("first");
 when(mockedList.get(1)).thenThrow(new RuntimeException());

 // 打印 first
 System.out.println(mockedList.get(0));

 // 抛出 RunTimeException
 System.out.println(mockedList.get(1));

 // 打印null，因为get(999)的返回值没有指定
 System.out.println(mockedList.get(999));

 // 尽管也可以对绑定操作进行校验，不过这通常是非必要的
 // 如果你希望获取get(0)的返回值，那么你应该在代码里进行测试
 // 如果get(0)的返回值无关紧要，那么就没有必要进行绑定
 verify(mockedList).get(0);
```

# MockMvc发起请求

# JsonPath

# 补充内容：服务层的测试

# 参考

- mockito：https://site.mockito.org/
- mockito API：https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html
- MockMvc doc：https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/test/web/servlet/MockMvc.html
- json-path：https://github.com/json-path/JsonPath
- https://stackoverflow.com/questions/47276920/mockito-error-however-there-was-exactly-1-interaction-with-this-mock
