---
title: "final关键字"
date: 2020-04-17
categories: [java]
author: "wangy325"
weight: 4
---

不同的使用环境下，`final`关键字的含义有细微差别，但通常它指“这是无法改变的”。

<!--more-->


##  final数据

`final`关键字通常用来表示一块数据是恒定不变的：

###  常量

- 比如一个永不改变的`编译时常量` ---> 对应前文所谓`静态常量`:

  - `public final double PI = 3.14`

  - 如果使用`static final`来修饰变量，那么它就是一个标准的编译时常量（静态常量）。

  - `public static final double PI = 3.14`

  - 在Java中，编译时常量必须是**基本数据类型**或**字符串**，声明时必须赋值。

- 一个在`运行时被初始化`的值，你不希望它被改变

  - `public final int RANDOM = new Random().nextInt(47)`

一个既是`final`也是`static`的域只占用一段不能改变的存储空间

当对非基本数据类型使用`final`时，其含义稍微有点变化，其使**引用恒定不变**，这就是说被`final`修饰的对象引用无法使其指向另一个对象，但是对象内容却是可以被修改的。

{{< code items="FinalProperty" lang="java" >}}

{{< hint info >}}
>`Unable to make field private final byte[] java.lang.String.value accessible`

这个限制，即无法通过反射访问`java.lang.String`类的私有 value 字段，是在**Java 9**中引入的模块化系统 (Project Jigsaw) 的一部分。

更具体地说，这是由**强封装**(strong encapsulation) 机制强制执行的。 在**Java 9**之前，虽然 value 字段是私有的，但仍然可以通过反射 API 的 `setAccessible(true)`方法来访问和修改它。 **Java 9**引入了模块的概念，并且默认情况下，模块不会导出其内部实现细节。`java.lang`包属于`java.base`模块，而`java.base`模块默认情况下不会导出`java.lang.String`的内部字段。

因此，从**Java 9**开始，尝试通过反射访问`java.lang.String` 的 value 字段会抛出`java.lang.IllegalAccessException`异常，除非你采取一些特殊的措施来绕过模块系统的限制 (例如，使用 --add-opens 命令行参数)
{{< /hint >}}


Java允许声明一个`空白final域`，但是这个`final`域在使用前必须使用构造器（常见）或表达式初始化。

```java
// 在构造器中初始化 final 域
public class MyClass {
    private final int x;

    public MyClass(int value) {
        x = value; // 在构造器中初始化 final 域
    }

    public int getX() {
        return x;
    }
}
// 在实例初始化块中初始化 final 域
public class MyClass {
    private final int x;

    {
        x = 10; // 在实例初始化块中初始化 final 域
    }

    public MyClass() {
        // 构造器可以为空，因为 x 已经在实例初始化块中初始化了
    }

    public int getX() {
        return x;
    }
}
// 在静态初始化块中初始化 final 域
public class MyClass {
    private static final int x;

    static {
        x = 10; // 在静态初始化块中初始化静态 final 域
    }

    public static int getX() {
        return x;
    }
}
```


###  参数

此外，Java允许参数列表中将参数指明为`final`，这意味着你无法**在方法中更改参数引用所指向的对象，但是对象状态也是可变的**。

> 注意此处的表述。作为对比，Java引用对象作为参数时，[参数引用指向的对象是可以改变的](./3_传值还是传引用.md/#引用的对象可变)（尽管这个改变不能应用到对象引用上---对象引用不可变）

{{< update 2025-05-06 >}}
实际上表述的意思是一样的，对象可以改变（状态），对象的引用（地址）不可变。
{{< /update >}}

[Employee2](./3_传值还是传引用.md/#employee)使用之前的代码：

{{< code items="FinalParam" lang="java">}}


`final`参数一般用来向匿名内部类中传递数据。

实际上，**Java并没有提供任何对象恒定不变的途径**，虽然可以通过编程取得对象恒定不变的效果<sup>单例</sup>。

## final方法--阻止继承

当将一个方法声明为`final`时，其主要作用就是**锁定方法**，阻止继承，这往往是出于设计的考虑。

需要特殊说明的是：如果一个方法是`private`的，那么它就被`隐式`地声明为`final`了，因为由于无法取用`private`方法，也就无法覆盖之。

参考如下代码：

{{< code items="FinalMethodT" lang="java">}}


基类和导出类的`p`方法，看上去像是导出类覆盖了基类的方法，实际上这是一种“字面”的覆盖，因为`private`方法并不是基类接口的一部分，它和导出类的`p`方法只是具有**相同名称**而已。

还需要注意的是，即使使用了`向上转型`试图调用基类的方法，实际上却失败了，因为子类覆盖了这个方法。这种行为在Java中被称为`动态绑定`，即**编译器知道实际引用的对象类型，从而去调用对应的方法**。

##  final类--阻止继承

如果将一个类声明为`final`的（通常使用`final class ...`），意味着这个类不能被继承。

也就是说，该类的所有方法都含有一个隐式的`final`修饰符。

`final`类的域可以**是或不是**`final`，规则同[final数据](./4_final关键字.md/#final数据)一致。

---

参考: https://docs.oracle.com/javase/specs/jls/se18/html/jls-17.html#jls-17.5
