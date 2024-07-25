---
title: "闭包与装饰器"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 10
BookToC: false
---

```python

"""
Author: wangy325
Date: 2024-07-22 00:25:10
Description: 闭包(closure)与装饰器(注解 decorator)
"""
import datetime
import time
from contextlib import contextmanager


# 闭包 closure
# 闭包是一个特殊的函数
# 闭包有一个'内嵌'函数
# 闭包返回这个内嵌函数
# 内置函数可以访问外部的函数的变量

# 以下用闭包解一个一元一次方程 a*x + b = y


def liner(a, b):
    def coordinate(x):
        return a * x + b

    return coordinate


# 3x + 4 = ?
f = liner(3, 4)
# 3 * 2 + 4 = ?
print(f(2))
# 所以闭包就等价于
g = (liner(3, 4)(x) for x in range(2, 3))
for e in g:
    print(e)

# ############# #
#     装饰器     #
# ############# #
'''
装饰器是python的一种语法糖
使用@开头, 类似于Java的注解
装饰器的作用, 很强
可以改变方法的行为, 而不直接修改方法的代码
可以实现类似AOP的功能
'''


# 装饰器应用场景：
# • 日志记录： 在函数执行之前和之后添加日志记录。
# • 计时器：  记录函数执行时间。
# • 权限控制：  检查用户权限，只有满足条件才能执行函数。
# • 缓存：  缓存函数的返回值，避免重复计算。
# • 异常处理：  在函数执行过程中捕获并处理异常。


#  装饰器的基本写法
def timer(func):
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        print(f'函数{func.__name__}开始执行, 开始时间: {start}')
        rel = func(*args, **kwargs)
        time.sleep(1)
        end = time.perf_counter()
        print(f'函数{func.__name__}执行结束, 运行耗时: {end - start}')
        return rel

    return wrapper


# 可以看到, 装饰器其实使用了闭包


@timer
def add(x, y):
    return x + y


i = add(1, 3)

# 接合上面闭包的概念, 实际上使用装饰器相当于调用闭包:
# 把函数的运行推迟
# 而在运行前,后做一些事情
j = timer(lambda x, y: x + y)(1, 3)


print(f"i:{i}, j:{j}")


# ##
# 装饰器当然可以传递参数
# 使用了多层闭包
# ##
def log(level):
    def inner(func):
        def wrapper(*args, **kwargs):
            print(f'[{level}]: fun {func.__name__} start...')
            rel = func(*args, **kwargs)
            print(f'[{level}]: fun {func.__name__} done... ')
            return rel

        return wrapper

    return inner


@log("INFO")
def cal(x, y):
    return x * y


cal(3, 6)


#
# 或者, 更加灵活地处理装饰器的参数
# 装饰器参数作为装饰器的业务逻辑
#
def decorator(profile=False, logger=False):
    def inner(func):
        def wrapper(*args, **kwargs):
            if profile:
                start_time = time.time()
            result = func(*args, **kwargs)
            if profile:
                end_time = time.time()
                print(f"{func.__name__} took {end_time - start_time} seconds")
            if logger:
                print(f"calling {func.__name__} with args: {args}, kwargs: {kwargs}")
            return result

        return wrapper

    return inner


@decorator(profile=True, logger=True)
def say_hi():
    time.sleep(1)
    print("Hi")


say_hi()


# ############# #
#   with语句    #
# ############# #

# with语句除了自动关闭文件/资源之外
# 还可以用作'上下文管理器类'
# https://docs.python.org/zh-cn/3/reference/compound_stmts.html#the-with-statement
# 

class MyContextManager:
    def __enter__(self):
        print('进入上下文管理器类')
        return self

    def __exit__(self, ext_type, ext_value, exc_tb):
        print('退出上下文管理器')


with MyContextManager() as m:
    print('在上下文管理器中执行操作')


@contextmanager
def my_context_manager():
    print("进入上下文管理器")
    try:
        yield "上下文管理器中的值"
    finally:
        print("退出上下文管理器")


with my_context_manager() as value:
    print(f"在上下文管理器中获取值：{value}")

```
