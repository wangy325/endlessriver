---
title: 语法糖--模式匹配
date: 2025-05-23
categories: []
tags: []
BookToC: false
---

最近使用WPF写`Irvue`的PC端平替，接触到了C#的一些语言特性，发现还挺有意思的。

例如这样的写法：

```csharp
if (serializer.Deserialize(stream) is WindowPosition position)
{
   //...
}
```

代码的可读性非常好，非常接近自然语言了已经是。简单查了一下，这个语法叫做**模式匹配**，在C# 7.0中引入的。

<!--more-->

{{< hint info >}}
内容由Gemini生成。
{{< /hint>}}

C# 中的模式匹配（Pattern Matching）特性的一种应用，具体来说是类型模式（Type Pattern）。它相比于传统的类型检查和转换方式，具有以下几个优点：

1. 简洁性 (Conciseness):

    它将类型检查 (is WindowPosition) 和类型转换/变量赋值 (position) 合并到了一步。传统的写法可能需要两步：先检查类型，再进行强制类型转换并赋值给一个新变量。

    * 传统写法示例：

    ```csharp
    object obj = serializer.Deserialize(stream);
    if (obj is WindowPosition)
    {
        WindowPosition position = (WindowPosition)obj;
        // 现在可以使用 position 变量了
    }
    ```

    * 使用`as`运算符的传统写法示例：

    ```csharp
    WindowPosition position = serializer.Deserialize(stream) as WindowPosition;
    if (position != null)
    {
        // 现在可以使用 position 变量了
    }
    ```

    模式匹配的写法明显更紧凑。

2. 可读性 (Readability):
    语句`is WindowPosition position`直接表达了意图：“如果反序列化的结果是`WindowPosition`类型，那么就把它赋值给一个名为`position`的变量”。这使得代码的逻辑更加清晰易懂。

3. 作用域安全 (Scope Safety):
    通过模式匹配声明的变量 (`position`) 只在 `if` 语句为 `true` 的代码块内部有效。这意味着你不可能在对象不是 `WindowPosition` 类型的情况下错误地使用 `position` 变量，从而减少了潜在的运行时错误（如 `InvalidCastException`）。在传统的 `as` 写法中，`position` 变量可能在 `if` 块外部仍然存在（尽管值为 `null`），需要额外的 `null` 检查。

4. 处理 `null` 值 (Null Handling):
    模式匹配 `is Type variable` 可以正确处理源表达式为 `null` 的情况。如果 `serializer.Deserialize(stream)` 返回 `null`，那么 `null is WindowPosition` 会评估为 `false`，`if` 块不会执行，这符合预期。

总而言之， 这种写法利用了 C# 的模式匹配特性，使得类型检查、转换和变量声明更加简洁、可读且安全，是现代 C# 中推荐的写法。

## Java中的模式匹配

Java 在较新的版本中引入了类似的语法糖，称为 `instanceof` 的模式匹配 (Pattern Matching for instanceof)。

这个特性在Java 14中作为预览功能引入，并在Java 16中成为标准功能 ([JEP 394](https://openjdk.org/jeps/394))。

它的语法和 C# 的非常相似：

```java
Object obj = serializer.deserialize(stream); // 假设 deserialize 返回 Object

if (obj instanceof WindowPosition position) {
    // 在这个 if 块内部，obj 已经被确认是 WindowPosition 类型，
    // 并且自动转换并赋值给了名为 position 的 WindowPosition 类型的变量。
    // 你可以直接在这里使用 position 变量。
    System.out.println("Deserialized object is a WindowPosition at x=" + position.getX() + ", y=" + position.getY());
} else {
    // obj 不是 WindowPosition 类型
    System.out.println("Deserialized object is not a WindowPosition.");
}
```

对比传统的 Java 写法：

```java
Object obj = serializer.deserialize(stream);

if (obj instanceof WindowPosition) {
    WindowPosition position = (WindowPosition) obj; // 需要显式类型转换
    // 在这里使用 position 变量
    System.out.println("Deserialized object is a WindowPosition at x=" + position.getX() + ", y=" + position.getY());
} else {
    System.out.println("Deserialized object is not a WindowPosition.");
}
```

优点与 C# 的类似：

1. 简洁性： 将类型检查 (instanceof) 和类型转换/变量声明 (WindowPosition position) 合并到一步。

2. 可读性： 代码意图更清晰，直接表达“如果对象是某个类型，就把它当作那个类型并赋值给一个变量”。

3. 作用域安全： 模式变量 (position) 只在 instanceof 检查为 true 的作用域内有效，避免了在类型不匹配的情况下误用变量。

所以，Java 16 及以上版本提供了与 C# `is Type variable` 类似的 `instanceof Type variable` 语法糖，用于简化类型检查和转换的代码。
