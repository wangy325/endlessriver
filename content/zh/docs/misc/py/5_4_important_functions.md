---
title: "4个重要的内置函数"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 5
BookToC: false
---

```python
"""
Author: wangy325
Date: 2024-07-22 16:57:01
Description: 
"""
# ############### #
#   4个重要的函数   #
#   filter()      #
#   map()         #
#   reduce()      #
#   zip()         #
# ############### #

# Tips: 在命令行界面使用help()可以查看内置函数的帮助文档
# filter()函数
'''
class filter(object)
 |  filter(function or None, iterable) --> filter object
 |
 |  Return an iterator yielding those items of iterable for which function(item)
 |  is true. If function is None, return the items that are true
'''

l = [1, 2, 3, 4]
f = filter(lambda x: x > 2, l)
print(type(f))  # <class 'filter'>

for e in f:
    print(e, end=', ')
print()

for p in filter(lambda e: e.startswith('a'),
                ['apple', 'ass', 'pine', 'cindy', 'ark']):
    print(p, end=', ')
print()

# map()函数
# 将2个容器里的元素一一对应运算,
# 直到少的那个容器所有元素都参与运算
# 这个*map*不是k-v映射哦
'''
class map(object)
 |  map(func, *iterables) --> map object
 |
 |  Make an iterator that computes the function using arguments from
 |  each of the iterables.  Stops when the shortest iterable is exhausted.
'''
m = [2, 3, 4, 5, 6]
mm = map(lambda x, y: x + y, l, m)
print(type(mm))  # <class 'map'>
for e in mm:
    print(e, end=", ")
print()

# zip()函数
# 返回一个元组集
# 元素的数量取决于实参列表中元素最短长度
# 元组中元素的个数取决于实参的数量
'''
class zip(object)
 |  zip(*iterables, strict=False) --> Yield tuples until an input is exhausted.
 |
 |     >>> list(zip('abcdefg', range(3), range(4)))
 |     [('a', 0, 0), ('b', 1, 1), ('c', 2, 2)]
 |
 |  The zip object yields n-length tuples, where n is the number of iterables
 |  passed as positional arguments to zip().  The i-th element in every tuple
 |  comes from the i-th iterable argument to zip().  This continues until the
 |  shortest argument is exhausted.
 |
 |  If strict is true and one of the arguments is exhausted before the others,
 |  raise a ValueError.
'''
d = dict(zip('abc', ['va', 'vb', 'vc']))
for k, v in d.items():
    print(f'{k}: {v}')

lz = list(zip('abcdefg', range(5), range(4)))
for t in lz:
    print(t, end=", ")
print()

# reduce()函数
# 对可迭代参数的所有元素依次运算
# 返回运算后的值
# 可选一个初始值作为运算参数
'''
reduce(...)
    reduce(function, iterable[, initial]) -> value

    Apply a function of two arguments cumulatively to the items of a sequence
    or iterable, from left to right, so as to reduce the iterable to a single
    value.  For example, reduce(lambda x, y: x+y, [1, 2, 3, 4, 5]) calculates
    ((((1+2)+3)+4)+5).  If initial is present, it is placed before the items
    of the iterable in the calculation, and serves as a default when the
    iterable is empty.
'''
from functools import reduce

val = reduce(lambda x, y: x + y, ['p','p','l','e'], 'a')
print(val)  # apple

```
