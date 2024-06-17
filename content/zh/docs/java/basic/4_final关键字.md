---
title: "final关键字"
date: 2020-04-17
tags: []
categories: []
author: "wangy325"
weight: 4
---

# final关键字

不同的使用环境下，`final`关键字的含义有细微差别，但通常它指“这是无法改变的”。

<!--more-->


#  <span id="m3">final数据</span>

`final`关键字通常用来表示一块数据是恒定不变的：

##  常量

- 比如一个永不改变的`编译时常量` ---> 对应前文所谓`静态常量`

  `public final double PI = 3.14`

  如果使用`static final`来修饰变量，那么它就是一个标准的编译时常量（静态常量）

  `public static final double PI = 3.14`

  在Java中，编译时常量必须是**基本数据类型**或**字符串**，声明时必须赋值

- 一个在`运行时被初始化`的值，你不希望它被改变

  `public final int RANDOM = new Random().nextInt(47)`

一个既是`final`也是`static`的域只占用一段不能改变的存储空间

当对非基本数据类型使用`final`时，其含义稍微有点变化，其使**引用恒定不变**，这就是说被`final`修饰的对象引用无法使其指向另一个对象，但是对象内容却是可以被修改的。

Java允许声明一个`空白final域`，但是这个`final`域在使用前必须使用构造器（常见）或表达式初始化。


##  参数

此外，Java允许参数列表中将参数指明为`final`，这意味着你无法**在方法中更改参数引用所指向的对象**，但是对象状态也是可变的。

> 注意此处的表述。作为对比，Java引用对象作为参数时，[参数引用指向的对象是可以改变的](#m1)（尽管这个改变不能应用到对象引用上---对象引用不可变）

参考如下代码<sup>[Employee2](#m2)</sup>：

```java
// 继续使用上例中的Employee2
public class FinalParam {

    static void with(final Employee2 e){
        raiseSalary(e);
      	// object it's self can be modified  
        System.out.println("salary of e = " + e.getSalary());
    }

    static void raiseSalary(final Employee2 e){
        e.raiseSalary(3);
    }

    static void swap(final Employee2 j, final Employee2 k){
        Employee temp = j;
        // object reference can not be modified
        // k = temp; // not allowed
        // j = k; // not allowed
    }
    static void  g(final int i){
        // i++; // not allowed
    }

    public static void main(String[] args) {
        Employee x = new Employee("ali", 1000);
        with(x);
        System.out.println("salary of x = " + x.getSalary());
    }
}
/* output:
salary of e = 3000
salary of x = 3000
*///:~
```

`final`参数一般用来向匿名内部类中传递数据。

实际上，**Java并没有提供任何对象恒定不变的途径**，虽然可以通过编程取得对象恒定不变的效果<sup>单例</sup>。

# final方法--阻止继承

当将一个方法声明为`final`时，其主要作用就是**锁定方法**，阻止继承，这往往是出于设计的考虑。

需要特殊说明的是：如果一个方法是`private`的，那么它就被`隐式`地声明为`final`了，因为由于无法取用`private`方法，也就无法覆盖之。

参考如下代码：

```java
public class FinalMethodT{
    public static void main(String[] args) {
        FinalMethodExt x = new FinalMethodExt();
        x.f();
        x.g();
        x.p();
        System.out.println("----");
        // upcast
        FinalMethod y = x;
        y.f();
        y.g();
        // y.p() // can't access
        System.out.println("----");
        FinalMethod z = new FinalMethod();
        z.f();
        z.g();
//        z.p(); // can't access
    }
}

class FinalMethod {
    void f(){
        System.out.println("f()");
    }

    final void g(){
        System.out.println("g()");
    }

   // final is redundant actually
    private final void p(){
        System.out.println("p()");
    }
}
class FinalMethodExt extends FinalMethod{

    void f() {
        System.out.println("ext f()");
    }
    // cannot override
    // final void g(){ System.out.println("ext g()"); }

    final void p(){
        System.out.println("ext p()");
    }
}
/* output:
ext f()
g()
ext p()
----
ext f()
g()
----
f()
g()
*///:~
```

基类和导出类的`p`方法，看上去像是导出类覆盖了基类的方法，实际上这是一种“字面”的覆盖，因为`private`方法并不是基类接口的一部分，它和导出类的`p`方法只是具有**相同名称**而已。

还需要注意的是，即使使用了`向上转型`试图调用基类的方法，实际上却失败了，因为子类覆盖了这个方法。这种行为在Java中被称为`动态绑定`，即**编译器知道实际引用的对象类型，从而去调用对应的方法**。

#  final类--阻止继承

如果将一个类声明为`final`的（通常使用`final class ...`），意味着这个类不能被继承。

也就是说，该类的所有方法都含有一个隐式的`final`修饰符。

`final`类的域可以**是或不是**`final`，规则同[final数据](#m3)一致。
