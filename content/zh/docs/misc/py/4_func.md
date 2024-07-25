---
title: "函数"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 4
BookToC: false
---

```python
# author: wangy
# date: 2024/7/9
# description:
"""
python 函数的几个小🌰️
1. 定义函数的关键字 `def`
2. 函数的返回值 `None`和return语句 斐波那契数
3. 解包赋值表达式
4. 函数的形参列表
    - 位置参数
    - 关键字参数
    - 特殊参数（元组和字典）
5. 解包表达式作为实参
6. Lambda表达式作为实参
"""


def func(length, width):
    s = length * width
    print(f'Square of rectangle is {s}.')


# 函数可以直接赋值给变量
mf = func
mf(5, 3)


def __fib(limit):
    '''
    - fibonacci斐波那契数列
    - 形参: limit: 最大数限制
    '''
    a, b = 0, 1
    while a < limit:
        print(a, end=' ')
        # python的解包赋值特性
        a, b = b, a + b
    print(end='\n')


__fib(100)
print(__fib.__doc__)


def __fib2(limit):
    a, b = 0, 1
    res = []
    while a < limit:
        res.append(a)
        a, b = b, a + b
    return res


print(__fib2(1000))


def __quit(retry, prompt='ready to quit? y/n', reminder='Please try again!'):
    '''
    形参列表，有多种形式的参数: 
    1. 不带默认值的参数，是必填参数
    2. 带默认值的参数是可选参数
    '''
    while True:
        reply = input(prompt)
        if reply in ('y', 'yes', 'yep', 'ye'):
            return True
        elif reply in ('n', 'no', 'nope'):
            return False
        retry -= 1
        if retry < 0:
            raise ValueError('invalid user response')
        print(reminder)
    print('\n')


# 仅仅使用必填参数
# print(__quit(2))
# 使用必填和部分可选参数
# print(__quit(2, 'Do you really want to quit(y/n)?'))
# 使用全部参数
print(__quit(2, 'Ready to quit(y/n)?', 'Please input yes or no.'))
"""
以上调用函数的方式全部是位置参数(posotional argument)

此外, 还可以使用关键字参数来调用函数

注意, 关键字参数必须在位置参数后面
"""

print(__quit(2, prompt='quit(y/n)?'))


# 特殊参数
def __sfunc(*tuple, **dict):
    """
    特殊参数 元组tuple 和字典dict
    """
    print(tuple, end='\n')
    print(dict)


__sfunc((1, 2), (3, 4), name='mask', age='53', nation='US')

# 如果实参单独定义，调用函数时需要解包
l = ('apple', 'orange', 'grape', 'watermelon')
t = {
    'title': 'data structure and algorithm analysis',
    'sub-title': 'descripted by Java',
    'publish': 'machine press'
}
'''
这里如果直接使用 `__sfunc(l, m)`程序并不会出错.

不过请看上一例, 这里的处理是将l和m作为元组的参数处理的. 
(这意为着, 函数`__sfunc`的形参数是任意可变的)

所以必须要**解包**实参列表, 才能将`l`和`m`分别作为位置参数.
'''
__sfunc(*l, **t)


# 参数使用的标记  / 和 *
def __fargtag(c=8, /, promt='inmput a integer:', *, remainder='func done'):
    """
    计算c的阶乘

    `c` before '/' means it's a positional argument

    `promot` after '/' means it's a positional or keyword argument

    `remainder` after '*' means it's a keyword arguments
    """
    c = int(input(promt))
    r = 1
    while c > 0:
        r = r * c
        c = c - 1
    print(remainder, r, end='\n')
    return r


__fargtag(remainder='final result is ')


def __argfunc(len: int, wid: int):
    return len * wid


def __cal(f: __argfunc, prompt='this func show a rectangle\'s square'):
    print(prompt)
    length = input('pls input length of retangle:')
    wid = input('pls input width of rectangle:')
    s = f(int(length), int(wid))
    print(f'Square is {s}\n')


__cal(__argfunc)
# or
__cal(f=lambda x, y: __argfunc(x, y))

# Lambda表达式
"""
lambda表达式是一种简洁的方式来定义匿名函数. 

lambda表达式可以在需要函数对象的任何地方使用, 并且通常用于简单的函数功能.

sort方法支持对paris列表的元组数据排序, 它的关键字参数key由一个Lambda表达式提供. 

Lambda的内涵是: 按照参数p(可以推导出元组)的索引为1的元素排序. 

已知索引为1的元素是字符串, 所以即按照字符串的字母表顺序排序. 

故排序后的paries是

[(4, 'four'), (1, 'one'), (3, 'three'), (2, 'two')]
"""

paris = [(1, 'one'), (2, 'two'), (3, 'three'), (4, 'four')]
paris.sort(key=lambda p: p[1])
print(paris)


# 完整的函数声明,包括参数数据类型,返回值类型
def full_dunc_def(arg: int,
                  arg2: str = 'optional arg',
                  arg3: tuple = (1, 'one')) -> str:
    """python函数的完整声明

    Args:
        arg (int): 
        arg2 (str, optional): Defaults to 'optional arg'.
        arg3 (tuple, optional): Defaults to (1, 'one').

    Returns:
        str: 声明为返回str, 但是python不强制返回值必须和声明一致.
    """
    print(arg2)
    print(arg3, end='\n')
    # return arg
    return arg3


print(full_dunc_def(1))


```
