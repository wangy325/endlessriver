---
title: "异常处理"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 7
BookToC: false
---

```python
"""
Author: wangy325
Date: 2024-07-16 21:07:13
Description: 异常的处理和抛出, else语句, finally语句, 异常组
"""


class B(Exception):
    pass


class C(B):
    pass


class D(C):
    pass


for els in [B, C, D]:
    try:
        raise els
    except D:
        print('D')
    except C:
        print('C')
    except B:
        print('B')
'''
展示了异常的传递和匹配:
抛出的异常是exception捕获异常的子类可以匹配上, 反之不行
这很好理解啊
`raise`语句相当于主动抛出异常
`else`子句只有在try语句没有发生异常时才执行.
所以, `else`语句可以避免意外捕获一些非try块引发的异常.
'''
a, b = 1, '2'
try:
    c = a + b
except TypeError as e:
    print(f'{e.__class__}: {e} ')
else:
    print(f'else block: {c}')
    
# But, how about a exception occurs in else subsentence?
# Solution 1: use extra try...exception to handle that.
# Solution 2: use finally subsentence to reraise exception.
# Best way is, make sure your else subsentence clean.
try:
    print('try ok!')
except SystemError:
    print('never mind')
else:
    try:
        2 / 0
    except ZeroDivisionError as e:
        print(f'else error: {e}')


def how_finally_works(x, y):
    try:
        return x / y
    except ZeroDivisionError as exp:
        print(f"{exp}: can not divide by 0")
        return 0
    finally:
        print('finally...')
        return -1


# 返回finally子句的值
print(how_finally_works(2, 3), end='\n---------\n')
print(how_finally_works(2, 0), end='\n---------\n')
print(how_finally_works('a', 'b'), end='\n---------\n')
'''
1) finally 子句一定会执行(调用1,2,3)
2) finally 子句的返回值会覆盖try块的返回值(调用2)
3) finally 子句有return语句, 会覆盖未处理的异常(调用3)

他么的, 究竟是谁会在finally块中写返回值啊
'''


def how_finally_works2():
    try:
        slt = []
        for i in reversed(range(-1, 3)):
            if i < 0:
                break
            slt.append( 10 / i)
        # return slt
    except ZeroDivisionError as e:
        print(f'{e.__class__}: {e}')
    else:
        print('else here.')
        return slt
    finally:
        print('finally here.')

print(how_finally_works2())
'''
1. 如果try子句中存在return语句, 且没有发生异常, 则else子句不再执行.
2. 如果try子句中存在return语句, 发生异常且被捕获, finally语句在return之前执行
'''

print('-----ExceptionGroup-----')
def f():
    es = [OSError('error 1'), SystemError('error 2')]
    raise ExceptionGroup('there are problems: ', es)

f()
'''
ExceptionGroup 是3.11之后引进的新特性
'''
```
