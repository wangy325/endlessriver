---
title: "static关键字"
date: 2020-04-14
lastmod: 2020-05-27
draft: false
tags: [Java基础]
categories: [Java]
author: "wangy325"

hasJCKLanguage: true
# You can also close(false) or open(true) something for this content.
# P.S. comment can only be closed
comment: false
toc: true
autoCollapseToc: false
postMetaInFooter: false
hiddenFromHomePage: false
# You can also define another contentCopyright. e.g. contentCopyright: "This is another copyright."
contentCopyright: false
reward: false
mathjax: false
mathjaxEnableSingleDollar: false
mathjaxEnableAutoNumber: false

# You unlisted posts you might want not want the header or footer to show
hideHeaderAndFooter: false

# You can enable or disable out-of-date content warning for individual post.
# Comment this out to use the global config.
#enableOutdatedInfoWarning: false

flowchartDiagrams:
  enable: false
  options: ""

sequenceDiagrams:
  enable: false
  options: ""
---

介绍static关键字

<!--more-->

## 2.1 静态域

如果将一个域定义为`static`，那么每个类中都只有一个这样的域。参考如下例子：

```java
class Employee{
  private static int nextId = 1;
  private int id;
  ...
}
```

每一个`Employee`都有自己的一个`id`域，但是这个类的所有实例都共享一个`nextId`域。记住，即使没有`Employee`实例，静态域`nextId`也存在，它属于类而不属于任何对象。静态域只在类加载的时候初始化一次，并且是先于非`static`域初始化的

以下是一个简单的`static`关键字使用示例：

```java
class Employee {
    static int nextId = 0;
    private int id;
    private String name;
    private int salary;

    public Employee(String name, int salary) {
        this.name = name;
        this.salary = salary;
    }

    public void setId() {
        this.id = nextId;
        nextId++;
    }

    public static int getNextId() {
        return nextId;
    }
 // ...get()
}

public class TestStatic {

    public static void main(String[] args) {
        Employee[] x = new Employee[3];
        x[0] = new Employee("alex", 5000);
        x[1] = new Employee("bob", 6000);
        x[2] = new Employee("cup", 7000);

        for (Employee e : x) {
            e.setId();
            System.out.println("id = " + e.getId()
                + " name = " + e.getName() + " salary = " + e.getSalary());
        }
        System.out.println("the nextId is:  " + Employee.getNextId());
    }
}
/* output:
id = 0 name = alex salary = 5000
id = 1 name = bob salary = 6000
id = 2 name = cup salary = 7000
the nextId is:  3
///:~
```



## 2.2 静态常量

使用`static final`修饰的域可以作为静态常量，静态常量一般被声明为`public`,通常作为工具包的常量被其他类使用，如`Math.PI`

## 2.3 <span id = "m20">静态方法</span>

使用`static`修饰的方法被称为静态方法，和静态常量一样，通常被声明为`public`，供其他类通过类名直接调用，如`Math.pow(x,a)`用于计算x<sup>a</sup>。静态方法不能访问对象域，因为其不能操作对象，但是其可以访问类的静态域

尽管可以通过对象实例来调用类的静态方法，但是不推荐如此做，编译器也会提示`应该使用类调用静态方法`，因为对象尽管可以调用静态方法，但是往往静态方法的返回与对象无关（静态方法只能操作静态域，而不能操作对象属性），反而会造成混淆

Java对于`static`的语义可以理解为：

> 属于类但是不属于对象的字段和方法

## 2.4 工厂方法

也是一种静态方法，不过其用来构造对象，因此被称为`静态工厂方法`，例如`NumberFormat.getCurrencyInstance()`就是一个利用工厂方法获取对象的例子
