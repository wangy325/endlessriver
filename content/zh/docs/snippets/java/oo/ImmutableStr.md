---
title: "Java字符串的不可变"
date: 2024-07-10
categories: [java]
BookToC: false
snippets: true
---

{{< update 2025-04-28 >}}
`openjdk 11`和`openjdk17`运行代码的结果会有不同。

出于安全策略，`setAccessible(true)`方法会抛出异常：
{{< /update >}}

```cmd
java.lang.reflect.InaccessibleObjectException:
Unable to make field private final byte[] java.lang.String.value accessible:
module java.base does not "opens java.lang" to unnamed module @1a2a0702
```

---
