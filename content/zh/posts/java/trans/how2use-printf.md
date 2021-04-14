---
title: "How to Use printf in Java"
date: 2020-12-10
lastmod: 2020-12-10
draft: false
description: ""
tags:
-
categories:
-

series:
- 翻译计划
image:
---


# 1 Introduction

In this tutorial, we'll demonstrate different examples of formatting with the printf() method.

The method is part of the `java.io.PrintStream` class and provides String formatting similar to the printf() function in C.

<!--more-->

#  2 Syntax
We can use one of the following PrintStream methods to format the output:

```java
System.out.printf(format, arguments);
System.out.printf(locale, format, arguments);
```

We specify the formatting rules using the format parameter. Rules start with the `%` character.

Let's look at a quick example before we dive into the details of the various formatting rules:

```java
System.out.printf("Hello %s!%n", "World");
```
This produces the following output:

    Hello World!

As shown above, the format string contains plain text and two formatting rules. The first rule is used to format the string argument. The second rule adds a newline character to the end of the string.

## 2.1 Format Rules

Let's have a look at format string more closely. It consists of literals and format specifiers. Format specifiers include flags, width, precision, and conversion characters in the following sequence:


> `%[flags][width][.precision]conversion-character`

Specifiers in the brackets are optional.

Internally, printf() uses the [`java.util.Formatter`](https://www.baeldung.com/java-string-formatter) class to parse the format string and generate the output. Additional format string options can be found in the Formatter [Javadoc](https://docs.oracle.com/javase/7/docs/api/java/util/Formatter.html#syntax).

## 2.2 Conversion Characters
The conversion-character is required and determines how the argument is formatted. Conversion characters are only valid for certain data types. Some common ones are:

- ***s*** – formats strings
- ***d*** – formats decimal integers
- ***f*** – formats the floating-point numbers
- ***t***– formats date/time values

We'll explore these and a few others later in the article.

## 2.3 Optional Modifiers

**The [*flags*] define standard ways to modify the output** and are most common for formatting integers and floating point numbers.

**The [*width*] specifies the field width for outputting the argument**. It represents the minimum number of characters written to the output.

**The [*.precision*] specifies the number of digits of precision** when outputting floating-point values. Additionally, we can use it to define the length of a substring to extract from a String.

# 3 Line Separator

**To break the string into separate lines, we have a `%n` specifier:**

```java
System.out.printf("baeldung%nline%nterminator");
```

The code snippet above will produce the following output:

    baeldung
    line
    terminator

The `%n` separator printf() will automatically insert the host system's native line separator.

# 4 Boolean Formatting

**To format boolean values, we use the `%b` format. It works the following way: If the input value is true, the output is *true*. Otherwise, the output is *false*.

So, if we do:

```Java
System.out.printf("%b%n", null);
System.out.printf("%B%n", false);
System.out.printf("%B%n", 5.3);
System.out.printf("%b%n", "random text");
```

Then we'll see:

    false
    FALSE
    TRUE
    true

Notice that we can use `%B` for **uppercase formatting**.

# 5 String Formatting

To format a simple string, we'll use the `%s` combination. Additionally, we can **make the string uppercase**:

```Java
printf("'%s' %n", "baeldung");
printf("'%S' %n", "baeldung");
```

And the output is:

    'baeldung'
    'BAELDUNG'

Also, to specify a minimum length, we can specify a width:

```Java
printf("'%15s' %n", "baeldung");
printf("'%1s' %n", "baeldung");
```

Which gives us:

    '       baeldung'
    'baeldung'

If we need to left-justify our string, then we can use the `-` flag:

```Java
printf("'%-10s' %n", "baeldung");
```
And the output is:

    'baeldung  '

Even more, we can **limit the number of characters** in our output by specifying a precision:

```Java
System.out.printf("%2.2s", "Hi there!");
System.out.printf("%10.2s", "Hi there!");
System.out.printf("%1.2s", "Hi there!");
```

The first ‘x' number in `%x.ys` syntax is the width. ‘y' is the number of chars.

For our example here, the output is:

    Hi
          Hi
    Hi

# 6 Char Formatting

The result of `%c` is a Unicode character:

```Java
System.out.printf("%c%n", 's');
System.out.printf("%C%n", 's');
```

The capital letter C will uppercase the result:

    s
    S

But, if we give it an invalid argument, then Formatter will throw *IllegalFormatConversionException*.

# 7 Number Formatting

## 7.1 Integer Formatting

The `printf()` method accepts all the integers available in the language; byte, short, int, long and BigInteger if we use `%d`:

```Java
System.out.printf("simple integer: %d%n", 10000L);
```

With the help of the ‘d' character, we'll have:

    simple integer: 10000

In case we need to format our number with the **thousands separator**, we can use the `,` flag. And we can also format our results for different locales:

```Java
System.out.printf(Locale.US, "%,d %n", 10000);
System.out.printf(Locale.ITALY, "%,d %n", 10000);
```

As we see, the formatting in the US is different than in Italy:

    10,000
    10.000

## 7.2 Float and Double Formatting

To format a float number, we'll need the `%f` format:

```Java
System.out.printf("%f%n", 5.1473);
```
Which will output:

    5.147300

Of course, the first thing that comes to mind is to **control the precision**

```Java
System.out.printf("'%5.2f'%n", 5.1473);
```
Here we define the width of our number as 5, and the length of the decimal part is 2:

    ' 5.15'

Here we have one space padding from the beginning of the number to support the predefined width.

To have our output in **scientific notation**, we just use the `%e` conversion character:

```Java
System.out.printf("'%5.2e'%n", 5.1473);
```
And the result is the following:

    '5.15e+00'

# 8 Date and Time Formatting

For date and time formatting, the conversion string is a sequence of two characters: the `t` or `T` character and the conversion suffix. Let's explore the most common time and date formatting suffix characters with the examples.

Definitely, for more advanced formatting we can use [DateTimeFormatter](https://www.baeldung.com/java-datetimeformatter) which has been available since Java 8.

## 8.1 Time Formatting

First, let's see the list of some useful suffix characters for Time Formatting:

- `H`, `M`, `S`  – characters are responsible for extracting the hours, minutes and second from the input Date
- `L`, `N`  – to represent the time in milliseconds and nanoseconds accordingly
- `p` – adds am/pm formatting
- `z` – prints out the timezone offset
Now, let's say we wanted to print out the time part of a Date:

```Java
Date date = new Date();
System.out.printf("%tT%n", date);
```
The code above along with ‘%tT' combination produces the following output:

    13:51:15

In case we need more detailed formatting, we can call for different time segments:

```Java
System.out.printf("hours %tH: minutes %tM: seconds %tS%n", date, date, date);
```
Having used ‘H', ‘M', and ‘S' we get:

    hours 13: minutes 51: seconds 15

Though, listing date multiple times is a pain. Alternatively, to **get rid of multiple arguments**, we can use the index reference of our input parameter which is 1$ in our case:

```Java
System.out.printf("%1$tH:%1$tM:%1$tS %1$tp %1$tL %1$tN %1$tz %n", date);
```

Here we want as an output the current time, am/pm,  time in milliseconds, nanoseconds and the timezone offset:

    13:51:15 pm 061 061000000 +0400

## 8.2 Date Formatting

Like time formatting, we have special formatting characters for date formatting:

- `A` – prints out the full day of the week
- `d` – formats a two-digit day of the month
- `B` – is for the full month name
- `m` – formats a two-digit month
- `Y` – outputs a year in four digits
- `y` – outputs the last two digits of the year

So, if we wanted to show the day of the week, followed by the month:

```Java
System.out.printf("%1$tA, %1$tB %1$tY %n", date);
```
Then using ‘A', ‘B', and ‘Y', we'd get:

    Thursday, November 2018

To have our results all in numeric format, we can replace the ‘A', ‘B', ‘Y ‘ letters with ‘d', ‘m', ‘y':

```java
System.out.printf("%1$td.%1$tm.%1$ty %n", date);
```

Which will result in:

    22.11.18

# 9 Summary

In this article, we discussed how to use the PrintStream#printf method to format output. We looked at the different format patterns used to control the output for common data types.

---

# Reference

- [Formatting with printf() in Java](https://www.baeldung.com/java-printstream-printf#conversion_chars)
