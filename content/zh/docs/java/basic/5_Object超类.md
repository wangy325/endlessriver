---
title: "Object超类"
date: 2020-04-19
categories: [java]
series: []
author: "wangy325"
weight: 5
---

在Java中，如果一个类没有明确地指出超类，那么Object就是这个类的超类。实际上，Object类是所有类超类，这个类定义了一些重要的方法。

<!--more-->

## equals

`equals`方法用来比较两个对象是否相等。不过，在Object类中，这是判断两个对象是否具有**相同的引用**。

当对象引用`a`和`b`指向同一个对象即认为`a`等于`b`，看起来，这似乎合乎情理，但是在很多情况下，需要比较**对象的状态**的相等性，所以，Object类的`equals`方法往往是没有什么用处的。

Java语言规范要求equals方法具有以下特性：

- 自反性：对于任何**非空**引用`x`，`x.equals(x)`为`true`；
- 对称性：对于任何引用`x`、`y`，当且仅当`y.equals(x)`为`true`时，`x.equals(y)`才为`true`；
- 传递性：对于任何引用`x`、`y`、`z`，若`x.equals(y)`为`true`，`y.equals(z)`为`true`，那么`x.equals(z)`也应该为`true`；
- 一致性：对于任何引用`x`、`y`，若对象引用和`equals`方法未发生变化，那么多次调用应返回一致的结果；
- 对于任何非空引用`x`，`x.equals(null)`为`false`。

参考之前`Employee2`类的`equals`方法：

```java
class Employee2 {
    // skip...
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
      	if (o.getClass() != getClass()) return false;

        Employee2 employee2 = (Employee2) o;

        /*if (salary != employee2.salary) return false;
        return name != null ? name.equals(employee2.name) : employee2.name == null;*/

      	// or using Objects.equals(Object a, Object b) to compare
      	return Objects.equals(name,employee2.name)
           && salary == employee2.salary;
    }
```

这是一个典型的覆盖`equals`方法的策略：

1. 检测`o`和`this`是否同一引用，若是，则返回`true`
2. 检测`o`是否为空，若为空，则返回`false`
3. 检测`o`和`this`是否是同一类型，若否，则返回`false`
4. 将`o`转换为`this`类
5. 比较`o`和`this`域的相等性

> 在导出类中调用equals方法时，要先调用基类的equals方法，基类的方法通过之后，再比较导出类的相关域的相等性。

参考如下例子：

```java
class Manager extends Employee2{
  // skip...
  @Override
    public boolean equals(Object o) {
      if(!super.equals(o)) return false;

      // super.equals checked that o and this belong to same class
      Manager m = (Manager)o;
      return bonus == m.bonus;
    }
}
```

以上的2个`equals`方法说明的是若导出类**拥有自己的相等概念**，那么在第3步类型判断中必须使用`getClass`，这样，基类和导出类（或者不同导出类）之前必然是不等的。

考虑一种情况：若想在基类和导出类之间（或不同导出类之间）进行相等比较，那么只需要比较基类共有的域即可，即是否相等由基类判断，该如何处理呢？

参考如下例子：

```java
class Stu{
  // skip...
  @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        if (!(o instanceof Stu)) return false;

        Stu stu = (Stu) o;

        return stu.age == age
          && Objects.equals(stu.name, name)
          && Objects.equals(stu.code, code);
    }
}
```

这个equals方法有几处变化：

1. 这个方法是`final`的
2. 判断类型使用的是`instanceof`而非`getClass`

将方法声明为`final`即保证了**基类对相等概念的控制权**（导出类无法覆盖equals方法），这还不够，使用`instanceof`保证了基类和导出类（或不同导出类）之间域的相等性比较的可能

> 应该谨慎使用`instanceof`判断操作符号。

## hashCode

*hash code* （散列码）是由对象导出的一个整型值

Java语言对<span id="hashCode">hashCode方法有如下规范</span>：

- 在同一次Java程序运行过程中，无论调用多少次对象的hashCode方法，返回的应该是同一个整型值；而在不同程序运行过程中则无此要求；
- 对于任何对象`a`、`b`，若`a.equals(b)`为`true`，那么`a`和`b`的hashCode返回值应该相等；
- 对于任何对象`a`、`b`，若`a.equals(b)`为`false`，`a`和`b`的hashCode返回值**没有必要一定不等**；需要指出的是，给不同对象分配不同的hashcode值有利于提升哈希表的性能；

基于第2点规范，**若重新定义了`equals`方法，那么必须重新定义`hashCode`方法**。

```java
public class HashT {
    public static void main(String[] args) {
        String s = "s";
        String t = new String("s");
        StringBuilder sb = new StringBuilder(s);
        StringBuilder tb = new StringBuilder(t);
        System.out.println(s.hashCode() + " : " +sb.hashCode());
        System.out.println(t.hashCode() + " : " +tb.hashCode());
    }
}
/* output
115 : 1956725890
115 : 356573597
*///:~
```

注意，`s`和`t`哈希值相同时因为String类覆盖了hashCode方法，其值是由字符串字面量值计算来的，而StringBuilder没有覆盖hashCode方法，其值是Object默认的hashCode方法导出的**对象存储地址**。

---

参考: [再论Object超类](../concurrency/2资源访问受限_5_线程本地存储.md/#再论object超类)
