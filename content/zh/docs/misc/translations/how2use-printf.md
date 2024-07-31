---
title: "使用printf格式化输出"
date: 2020-12-10
draft: false
tags: [translation]
categories: [java]
image:
---

这篇文章介绍了几种常见的使用`printf()`方法进行格式化输出的方法。

`printf()`方法隶属于`java.io.PrintStream`类，提供了和C语言中相似的格式化字符串输出的方法。

<!--more-->

#  1 语法

`printf()`有一些重载方法，可以用来格式化输出：

```java
System.out.printf(format, arguments);
System.out.printf(locale, format, arguments);
```

`format`参数[^1]用来指定格式化规则，一般以百分号`%`开头。

[^1]: 下文统称为格式化参数，其本身也是一个字符串。

在进一步剖析格式化规则之前，不妨看一个简单的例子：

```java
System.out.printf("Hello %s!%n", "World");
```

上面的代码输出如下内容：

    Hello World!

如上所示，格式化参数包含一个字符串（Hello）和2个格式化规则。第一个规则（%s）用来格式化字符串参数（World），第二个规则（%n）则表示在末尾添加一个换行符。

## 1.1 格式化规则

格式化参数由纯字符串以及格式化标志符组成，其中格式化标志符包括标记（flags）、宽度、精度、转换字符组成：

> `%[flags][width][.precision]conversion-character`

Specifiers in the brackets are optional.
方括号内的标识符是可选的。

实际上，`printf()`使用 [`java.util.Formatter`](https://www.baeldung.com/java-string-formatter)类来转换格式字符串并进行输出。完整的格式化选项可以从Formatter的 [Javadoc](https://docs.oracle.com/javase/7/docs/api/java/util/Formatter.html#syntax)中获取。

## 1.2 转换字符

The conversion-character is required and determines how the argument is formatted. Conversion characters are only valid for certain data types. Some common ones are:
转换字符是必须的，其决定如何格式化传入的字符串参数。转换字符对应指定的数据类型，一些常见的转换字符有：

- ***s*** – 用来格式化字符串
- ***d*** –用来格式化小数
- ***f*** – 用来格式化浮点数
- ***t***– 用来格式化日期/时间类型

下文会详细解释这些和一些其他转换字符。

## 2.3 可选修饰符

**The [*flags*] define standard ways to modify the output** and are most common for formatting integers and floating point numbers.
**[*flags*]定义了修改输出的标准方法**，是用来格式化整数和浮点数的最常用方法。

**The [*width*] specifies the field width for outputting the argument**. It represents the minimum number of characters written to the output.
**[*width*]约定了输出参数的宽度（占位）**，它约定的是输出的最小字符数。

**The [*.precision*] specifies the number of digits of precision** when outputting floating-point values. Additionally, we can use it to define the length of a substring to extract from a String.
**[*.precision*]约定了浮点数的数据精度**，此外，还可以通过其来约定格式化时字符串的长度。

# 2 换行符

使用`%n`来将字符串换行：

```java
System.out.printf("baeldung%nline%nterminator");
```

上述代码的输出像这样：

    baeldung
    line
    terminator

 `printf()`方法中的`%n`会自动插入当前系统中的换行符[^2]。

 [^2]: windows系统的默认换行符为'\r\n'（回车换行），linux/unix下为'\n'。


# 3 布尔值的格式化

`printf()`使用`%b`来格式化布尔值，当传入的值（？）是true，其输出*true*，否则输出*false*。

参考下例：

```Java
System.out.printf("%b%n", null);
System.out.printf("%B%n", false);
System.out.printf("%B%n", 5.3);
System.out.printf("%b%n", "random text");
```

上面的输出为：

    false
    FALSE
    TRUE
    true

可以`%B`来使printf输出大写。

# 4 字符串格式化

`printf()`使用`%s`来格式化字符串。同样地，`%S`用于输出大写。


如代码

```Java
printf("'%s' %n", "baeldung");
printf("'%S' %n", "baeldung");
```

输出:

    'baeldung'
    'BAELDUNG'

前文提过，可以使用[*width*]来约定字符串的最小长度：

```Java
printf("'%15s' %n", "baeldung");
printf("'%1s' %n", "baeldung");
```

输出为:

    '       baeldung'
    'baeldung'

从输出可知，默认格式为右对齐，并且当字符串长度**大于**约定的最小长度时，*witdh*配置无效。

如果想使输出左对齐，可以添加`-`标记（`flags`）

如

```Java
printf("'%-10s' %n", "baeldung");
```

将输出:

    'baeldung  '

此外，可以通过[*.precision*]控制输出字符串的**字符数**：

```Java
System.out.printf("%2.2s", "Hi there!");
System.out.printf("%10.2s", "Hi there!");
System.out.printf("%1.2s", "Hi there!");
```

 `%x.ys` 格式中的'x'代表*width*，'y'代表*precision*。

所以，上例中的输出为：

    Hi
          Hi
    Hi

可以看到，precision参数控制着输出字符的个数。

# 5 字符格式化

The result of `%c` is a Unicode character:
`printf()`使用`%c`来格式化Unicode字符。同样地，`%C`用于输出大写。

```Java
System.out.printf("%c%n", 's');
System.out.printf("%C%n", 's');
```

输出:

    s
    S

值得一提的是，如果传入无效参数，将会抛出*IllegalFormatConversionException*。

# 6 数字格式化

## 6.1 整数格式化

 `printf()` 方法使用`%d`来格式化整型，其接受所有Java语言的整数： byte、short、 int、 long以及BigInteger。

```Java
System.out.printf("simple integer: %d%n", 10000L);
```

在'd'的作用下，上例的输出为：

    simple integer: 10000

有时候，可能需要千位分隔符来使较大的数据更易读，可以使用`,`标记。并且可以根据不同地区的使用规范来使用不同的分隔符：

```Java
System.out.printf(Locale.US, "%,d %n", 10000);
System.out.printf(Locale.ITALY, "%,d %n", 10000);
```

如我们所见，美国和印度锁使用的千位分隔符是不同的：

    10,000
    10.000

## 6.2 浮点数和双精度浮点数格式化

使用 `%f` 来格式化浮点数:

```Java
System.out.printf("%f%n", 5.1473);
```

输出:

    5.147300

看到这个输出，我们首先想到的就是**控制精度**：

```Java
System.out.printf("'%5.2f'%n", 5.1473);
```

上例中，我们约定了数字占用字符宽度[*width*]为5，小数部分的长度[*.precision*]为2:

    ' 5.15'

可以看到，输出的数字开头存在1个字符的空白填充——由于约定的宽度为5。

此外，为了获取科学计数法输出，只需要使用`%e`转换字符即可：

```Java
System.out.printf("'%5.2e'%n", 5.1473);
```

将输出：

    '5.15e+00'

# 7 日期和时间格式化

至于日期和时间的格式化，需要使用`t`或`T`加上一些特殊含义的后缀组合。下面的示例中展示了一些常用的日期时间格式化的后缀字符。

实际上，Java8提供了更加完整易用的 [DateTimeFormatter](https://www.baeldung.com/java-datetimeformatter)来进行日期时间的格式化[^3]。

[^3]: 关于Java8的新日期时间库，也可以参考[这篇文章](../../java/basic/11_java-new-time-api.md)

## 7.1 时间格式化

首先介绍关于常用时间格式化的后缀字符及其含义：

- `H`, `M`, `S`  – 时/分/秒
- `L`, `N`  – 毫秒/纳秒
- `p` – 上午/下午（am/pm）
- `z` – 时区

接下来，试试格式化输出日期：

```Java
Date date = new Date();
System.out.printf("%tT%n", date);
```

'%tT' 格式输出如下所示：

    13:51:15

如果需要更详细的输出，不妨看看使用上面的后缀字符：

```Java
System.out.printf("hours %tH: minutes %tM: seconds %tS%n", date, date, date);
```

通过使用‘H’，‘M’，‘S’，得到如下输出：

    hours 13: minutes 51: seconds 15

你肯定会觉得要获取一个时间单位，就要传入一个date实例很麻烦，Java的设计者也是这么认为，所以，可以通过使用参数索引字符`1$`来规避掉需要重复传递的参数：

```Java
System.out.printf("%1$tH:%1$tM:%1$tS %1$tp %1$tL %1$tN %1$tz %n", date);
```

看，借助`1$`，传入一个date实例就获取了所有的信息：

    13:51:15 pm 061 061000000 +0400

## 7.2 日期格式化

和时间格式化类似，日期格式化也有特定的字符后缀：

- `A` – 输出星期全名
- `d` – 输出2位数的日期
- `B` – 输出完整的月份名称
- `m` – 输出2位数的月份
- `Y` – 输出4位数的年份
- `y` – 输出2位数的年份

如果我们想打印星期，可以这样做：

```Java
System.out.printf("%1$tA, %1$tB %1$tY %n", date);
```

输出：

    Thursday, November 2018

也可以获得数字形式的输出：

```java
System.out.printf("%1$td.%1$tm.%1$ty %n", date);
```

输出：

    22.11.18

# 8 总结

此文讨论了`printf()`的常见用法，介绍了使用`printf()`对常见数据类型进行格式化输出的方法。

---

- 原文地址 [Formatting with printf() in Java](https://www.baeldung.com/java-printstream-printf#conversion_chars)
