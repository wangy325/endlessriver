---
title: "spring声明式事务的使用"
date: 2021-06-04
lastmod: 2021-06-04
description: "介绍了spring声明式事务不同调用方式/隔离级别下的有效性。"
draft: true
tags:
- spring
- 事务
categories:
- SpringBoot

author: "wangy325"
---

##  1 从`@Transactional`注解开始

`@Transactional`注解是使用spring-transaction的最便捷方式。也是使用Spring框架开发最先接触的内容。

当你在一个服务的方法上使用`@Transactional`注解时，意味着你希望为此方法开启事务支持。如果你的项目成功配置了**数据源**和**事务管理器**，Spring会为此方法使用如下默认设置开启事务：

- 事务传播属性：`PROPAGATION.REQUIRED`
- 事务隔离级别：`ISOLATION_DEFAULT` （使用数据库的默认隔离级别）
- 只读事务：否
- 事务超时时间取决与数据库的事务超时设置（MYSQL innodb默认为50s），若数据库不支持事务超时则不设置
- 事务回滚：RuntimeException时回回滚（unchecked exception）; Error和CheckedException（如IOException等）时不回滚

像这样，不做任何其他的配置，就可轻松使用事务控制。这是Spring给Java开发带来的便利，对于业务简单的场景，简单的`@Transactional`注解即可满足业务需求——完全使用数据库的事务来处理业务。

> 使用`@Transactional`注解之前，需要配置相关`TransactionManager`；
> 对于Spring-Boot项目，可以使用`@EnableTransactionManagement`注解，该注解的作用和`<tx: annotation-driven/>`相当，其为Spring事务控制开启注解支持。

### 1.1 普通方法调用`@Transactional`方法

声明式事务的开启都是由`@Transactional`注解开始的，事务的开始必然是从普通方法到`@Transactional`方法的调用。因此，形如如下的方法调用，事务必然生效：

```Java
public void A() throws Exception{
    service.B();
}

@Transactional
public void B() throws Exception{
    // ...
}
```

上述代码片段中，**方法`B`的事务会生效，并且和方法A方法没有关系；而方法`A`是不受事务控制的**。

这种行为较容易理解， `@Transactional`注解的作用范围只在注解的方法内生效。

### 1.2 `@Transactional`方法调用普通方法

如果反过来，当`@Transactional`方法调用普通方法，会有怎样的事务行为呢？

```Java
@Transactional
public void A() throws Exception{
    B();
}
public void B() throws Exception{
    // ...
}
```

~~实际上，此种情形**只有`A`方法存在事务，`B`方法没有事务**，不过，有一些行为表现得好像方法`B` *使用了*方法`A`的事务一样：~~

此种情形下，方法`B`实际上被方法`A`的事务所管理：

1. 当`B`抛出异常时：
    - 若方法`A`捕获异常，则方法`A`和方法`B`**均提交**；
    - 若方法`A`不捕获异常，则方法`A`和方法`B`**均回滚**；
2. 当方法`A`抛出异常时，方法`A`和方法`B`**均回滚**；

总之，若方法`A`捕获了方法`B`抛出异常，则事务提交；若方法`A`没有捕获方法`B`抛出的异常，则认为方法`A`抛出异常，则事务回滚。

**若`A`方法抛出异常，则事务回滚，值得一题的是，这种情形下，`B`方法若执行，也会回滚**。

## 2 理解Spring声明式事务

仅仅依靠`@EnableTransactionManagement`和`@Transactional`注解来使用Spring声明式事务显然是不够的，你必须理解其实现原理，才能有效配置使其按照预期工作。Spring事务实际上是通过**Spring AOP**代理来对目标类/方法添加环绕通知增强来实现的。事务通知（transaction advice）通过XML或者注解的形式配置。

借助AOP代理以及元数据（XML或注解）配置，Spring会使用合适的`TransactionManager`以及`TransactionInterceptor`来对调用方法增强。

> Spring 事务支持2种编程模型：强制性（imperative programming model）和响应式（reactive programming model），目前前者使用的比较多。
>
> 强制性事务使用`PlatformTransactionManager`，这是常见且应熟识的；而响应式事务使用`ReactiveTransactionManager`。

`@Transactional`注解的作用域为当前执行线程，即**当前方法及其调用方法**中发生的数据访问和操作，均被`PlatformTransactionManager`所提供的事务所管理。不过，对于方法内部**新启动的线程，事务不会生效**。

下图粗略展示了调用使用`@Transactional`注解的方法时，事务代理的作用方式：

![事务代理作用示意图](/img/transaction_work_flow.png)

## 3 配置`@Transactional`注解

`@Transactional` 注解能够在**接口**，**类**和**方法**上使用。

当在类上使用`@Transactional`注解时，该类所有的方法以及**其子类**的方法都会被Spring事务管理。

在方法上使用`@Transactional`注解时，意味着为这个方法开启Spring事务，这是最常用的方式。需要注意的是，如果在非public方法上使用`@Transactional`注解，Spring不会抛出任何异常，但是Spring事务不会生效。

在接口或接口方法上使用`@Transactional`注解，Spring事务只有在使用**基于接口的代理**时才会生效。所以当你在使用基于
