---
title: "流程控制语句"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 1
BookToC: false
---

```python
# 用户输入一个数字
number = int(input("请输入一个数字："))

# 使用 if-else 语句判断数字的奇偶性
if number > 0:
    print(f"{number} 是正数")
elif number < 0:
    print(f"{number} 是负数")
else:
    print(f"{number} 是0")

# 使用 for 循环打印 1 到 5 的数字
print("使用 for 循环打印 1 到 10 的奇数：")
for i in range(1, 10, 2):
    print(i)

# 使用 while 循环计算 1 到 10 的数字之和
print("使用 while 循环计算 1 到 10 的数字之和：")
sum = 0
i = 1
while i <= 10:
    sum += i
    i += 1
print(f"1 到 10 的数字之和为：{sum}")

""" 在 for 循环中,else 子句会在循环成功结束最后一次迭代之后执行。
在 while 循环中,它会在循环条件变为假值后执行。
无论哪种循环,如果因为 break 而结束,那么 else 子句就 不会 执行。 """
print('计算2-10之间的质数: ')
for i in range(2, 10):
    for j in range(2, i):
        if (i % j == 0):
            print(i, 'equals', j, '*', i // j)
            break
    else:
        print(i, 'is a prime number')
```

