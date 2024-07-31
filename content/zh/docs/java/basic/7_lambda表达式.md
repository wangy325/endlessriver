---
title: "Lambda与函数式接口"
date: 2020-04-22
categories: [java]
series: []
author: "wangy325"
weight: 7
---

>Java 函数式接口和Lambda表达式是 Java 8 中引入的一个重要概念，它允许你将行为作为参数传递给方法，从而实现更简洁、更灵活的代码。


##  Lambda表达式

Lambda表达式是一个**可传递的代码块**，可以在以后执行**一次或多次**。

<!--more-->

从一个比较器说起：

```java
public class Intro {
    public static void main(String[] args) {
        String[] s = new String[]{"baidu","alibaba","tencent","baida","kingdee"};
      	// String类实现了Comparable接口，可以直接使用sort方法实现字典序排序
      	// 为什么是字典序？因为String类的实现逻辑是字典序
        Arrays.sort(s);
        System.out.println(Arrays.toString(s));

        Arrays.sort(s, new StringLengthComparator());
      	//等效使用Lambda表达式实现
      	//Arrays.sort(s, (o1, o2) -> o1.length() - o2.length());
        System.out.println(Arrays.toString(s));
    }
}
// 比较器实现——先按字符串长度排序
class StringLengthComparator implements Comparator<String>{
    @Override
    public int compare(String o1, String o2) {
        return o1.length() - o2.length();
    }
}
/* output
[alibaba, baida, baidu, kingdee, tencent]
[baida, baidu, alibaba, kingdee, tencent]
*///:~
```

上例中，`compare`方法不是立即调用，在数组完成排序之前，`sort`方法会一直调用`compare`方法，只要元素的排列顺序不正确就会重新排列元素。

```java
API:	 public static <T> void sort(T[] a, Comparator<? super T> c)
```

`sort`方法需要一个比较器作为参数，接口`Comparator`**只有一个抽象方法**`compare`，要实现排序，实现`compare`方法即可，这正是`StringLengthComparator`类所做的事情。


由于`StringLengthComparator`类只有一个方法，这相当于将一段代码块（函数）传递给`sort`。实际上这就是Java处理函数式编程的方式：Java是面向对象语言，因此**必须构造一个对象，这个对象有一个方法包含所需的逻辑代码**。

此例中，如果使用Lambda表达式`Arrays.sort(s, (o1, o2) -> o1.length() - o2.length());`，那么`Arrays.sort`会接收实现了`Comparator<String>`的某个类的对象，并在这个对象上调用`compare`方法去执行Lambda表达式的“体”，这些对象和类的管理完全取决于具体实现，与传统的内联类相比，更加高效。

Lambda表达式可以**将代码块传递给某个对象**。形如：

```java
(String o1, String o2) -> o1.length() - o2.length()
```

就是一个Lambda表达式，由**参数**、**箭头**（->）以及**表达式**3部分组成。为什么和代码示例中有细微差别？这里声明了String参数类型。

如果可以**推导**出Lambda表达式的参数类型（多数情况如此），那么可以省略类型声明：

```java
(o1, o2) -> o1.length() - o2.length()
```

即便Lambda表达式没有参数，也必须保留参数括号，以下Lambda展示了**表达式**有多句的情况——使用`{}`，看起来就像一个Java方法：

```java
() -> {for (int i = 0, i<10, i++) System.out.println(i);}
```

如果Lambda表达式只有**一个参数**，并且这个参数类型可以**推导得出**，甚至连`()`都可以省略：

```java
new ArrayList().removeIf(e -> e == null)
```

无需指定Lambda表达式的返回类型。**Lambda表达式的返回类型总是可以根据上下文推导得出**。

## <span id="func_interface">函数式接口</span>

> 对于只有一个抽象方法的接口，需要这种接口的对象时，就可以提供一个Lambda表达式，这种接口叫**函数式接口**

`java.util.Comparator`接口就是一个函数式接口，它只有一个抽象方法：

```java
int compare(T o1, T o2);
```

其他方法均被声明为**默认方法**。

`java.util.function`包中定义了很多通用的函数式接口，上文中的`Predicate`便是。ArrayList中的forEach方法参数就是此包中的另一个函数式接口`Consumer`:

```java
public void forEach(Consumer<? super E> action)
```

可以用此接口快速遍历集合元素

  > `list.forEach(e -> System.out.println(e))`
  >
  > `list.forEach(System.out::println)`<sub>方法引用</sub>

Java API使用`@FunctionalInterface`注解来标注函数式接口。

类似地，`org.springframework.jdbc.core.RowMapper`也被声明为一个函数式接口，它只有一个方法`mapRow`，用来处理SQL语句的回调：

```java
T mapRow(ResultSet rs,int rowNum) throws SQLException
```


##  方法引用

如果有现成的方法完成想要传递到其他代码的操作，例如你只想通过forEach打印集合中的元素，可以使用

```java
list.forEach(e -> System.out.println(e))
```

就像之前提到的那样，但是，也可以直接把println方法传递给forEach，就像这样：

```java
list.forEach(System.out::println)
```

这就是**方法引用**，它和上面的Lambda表达式是等价的。

**如果Lambda表达式的“体”直接调用了某个方法，而没有其他多余代码，那么这个Lambda表达式可以等价转换为方法引用**。

还是参考比较器的例子：

```java
public class Intro {
    public static void main(String[] args) {
        String[] s = new String[]{"baidu", "alibaba", "tencent", "baida", "kingdee"};
		// lmabda statement original
		/*Arrays.sort(s, (o1,o2) -> {
          if (o1.length() != o2.length()) return o1.length() - o2.length();
        	return o1.compareTo(o2);
        })*/

      	// Lambda expression with method reference
        Arrays.sort(s, (o1,o2) -> localCompare(o1, o2) );

      	// method reference
      	Arrays.sort(s, Intro::localCompare)
        System.out.println(Arrays.toString(s));

    private static int localCompare(String o1, String o2) {
        if (o1.length() != o2.length()) return o1.length() - o2.length();
        return o1.compareTo(o2);
    }
}
```

原始的Lambda表达式有2行代码（2个逻辑），可以将其重构为一个方法，并在Lambda表达式中引用该方法，这样做之后，原Lambda表达式的“体”就变成了一个简单的方法调用，那么它便可以等价为方法引用：

```java
Arrays.sort(s, Intro::localCompare)
````

方法引用根据调用者和方法类型区分，有3种形式

1. object.instanceMethod：对象调用实例方法

2. Class.staticMethod：类调用静态方法

3. Class.instanceMethod：类调用实例方法

前2者较容易理解，第3种情况需要特殊说明，参考如下示例：

```java
//...
Arrays.sort(s, new Comparator<String>() {
            @Override
            public int compare(String s3, String str) {
                return s3.compareToIgnoreCase(str);
            }
        });
Arrays.sort(s, (s3, str) -> s3.compareToIgnoreCase(str));
Arrays.sort(s, String::compareToIgnoreCase);
//...
```

当使用类调用实例方法时，第一个参数会成为方法的目标，第二个参数作为方法的参数<sup>需求证</sup>。

方法引用种可以使用`this`和`super`关键字，分别表示调用当前类和超类的方法。

##  变量作用域

在使用Spring JDBC操作数据库时，需要用到`RowMapper`的回调来处理返回数据，前文已提及，`RowMapper`是一个函数式接口，可以等价为Lambda表达式：

```java
public List<Spitter> findAll() {
        return jdbcOperations.query(SPITTER_SELECT,
                                    (rs, rowNum) -> this.mapResult(rs, rowNum));
    }
// skip mapResult...
```

可以看到，Lambda表达式中使用了`this`关键字，指定的是**创建这个Lambda表达式的方法**的`this`，通俗地讲，就是调用传入Lambda参数方法的实例，此处的`this`可以省略。

之前的所述的Lambda表达式都没有涉及一个概念：**<span id= "free_veaiable">自由变量</span>**，这是除了表达式和参数之外，Lambda的另一个组成部分，指的是**不是参数且不在表达式中定义的变量**。

```java
static void repeatMessage(String msg, int delay) {
        ActionListener listener = e -> {
            System.out.println(msg);
            Toolkit.getDefaultToolkit().beep();
        };
        new Timer(delay, listener).start();
    }
```

当调用`repeatMessage("Hello World", 1000);`时，控制台每隔1s输出Hello World

上例的Lambda中，`msg`就是一个**自由变量**，它来自于repeatMessage方法的参数变量。在运行过程中，Lambda表达式可能会延迟执行或者执行很多次，这时候主线程可能已经结束，repeatMessage方法的参数变量也可能已经销毁了，这个变量是如何保存的呢？

实际上，Lambda表达式在运行时“捕获”了自由变量的值，可以把Lambda表达式理解为一个含有方法的实例对象，自由变量的的值便复制到了这个实例对象中

*当在Lambda表达式中使用自由变量时，<span id="constrain">有几个约束</span>：*

1） 不能在Lambda表达式中改变自由变量的值

 ```java
  static void countDown(int start, int delay){
    ActionListener listener = evevt -> {
      // start--; // ERROR! can't mutate captured variable
      System.out.println(start);
    };
    new Timer(delay, listener).start();
  }
```

这是出于线程安全的考虑。


2） 不能引用在外部改变了值的自由变量

 ```java
  static void repeat(String text, int count){
    for (int i = 1, i<= count, i++){
        ActionListener listener = evevt -> {
        	// System.out.println(i + "text"); // ERROR! can't refer to changing i
      	};
      new Timer(1000, listener).start();
    }
  }
 ```


3） 注意变量的命名

  ```java
  int first = 1;
  Compartor<String> comp = (first, second) -> first.length() - senond.length();
  // ERROR variable first already exists
  ```

Lambda表达式的“体”和“嵌套块”具有相同的作用域。
