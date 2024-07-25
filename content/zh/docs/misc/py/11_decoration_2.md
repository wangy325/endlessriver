---
title: "装饰器2"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 11
BookToC: false
---

```python
"""
Author: wangy325
Date: 2024-07-24 10:20:20
Description: 介绍python内建的装饰器和更多内容
"""


# 以下是python标准装饰器
# ########################################## #
#   @property   可以将方法转换为属性访问         #
#   @staticmethod  定义静态方法                #
#   @classmethod   定义类方法                  #
#   @abstractmethod 定义抽象方法               #
#   @dataclass  定义数据类                     #
# ########################################## #


class MyClass:
    __annotations__ = {
        'name': str,
        'age': int
    }

    def __init__(self, name: str, age: int):
        self._name = name
        self.age = age

    @property
    def name(self):
        return self._name

    @staticmethod
    def add(x, y):
        """
        静态方法不包含隐式参数cls

        所以可以处理任何业务

        一般用来处理和类相关, 但是又不需要访问类的变量和方法的操作
        :param x: int
        :param y: int
        :return: val of x plus y
        """
        return x + y

    @classmethod
    def get_instance(cls):
        """
        类方法和普通方法不一样, 普通方法默认包含隐含参数self, 代表实例

        类方法默认包含隐含参数cls, 代表类
        :return: 一个实例
        """
        return cls('anna', 18)

    @classmethod
    def from_dict(cls, data: dict):
        return cls(data['name'], data['age'])


# 直接访问类方法
instance = MyClass.get_instance()
from_dict = MyClass.from_dict({'name': 'alice', 'age': 18, 'gender': 'male'})
# name()方法被当作属性访问了
print(instance.name)
# 看看静态方法
print(f"call static method: {MyClass.add(1, 2)}")


# 9_decoration.py 中的装饰器都是基于方法实现, 并且在方法上使用
# 但是, 装饰器也可以基于类实现, 以及在类上使用
# 例如下面的使用缓存的栗子
#
#  Tips: __call__() 方法是一个特殊方法，它使你的类实例可以像函数
#  一样被调用。换句话说，当你使用 () 运算符调用一个类的实例时，实际
#  上会调用这个实例的 __call__() 方法


class MyCache:
    """
    装饰器类

    需要实现 __init__和__call__方法

    其中__init__用来初始化以及传递装饰器参数

    __call__方法是装饰器的具体方法
    """
    caches = {}

    def __init__(self, key):
        self.key = key

    def __call__(self, func):
        def wrapper(*args, **kwargs):
            cache_key = self.key(*args, **kwargs)
            if cache_key not in self.caches:
                self.caches[cache_key] = func(*args, **kwargs)
                return self.caches[cache_key]

        return wrapper

    @staticmethod
    def get_caches():
        return MyCache.caches


@MyCache(key=lambda x, y: (x, y))
def s_val(x, y):
    return x + y


s_val(1, 2)
s_val(2, 3)

#  等价于以下函数调用式
# MyCache(key=lambda x, y: (x, y))(s_val)(3, 4)
print(MyCache.get_caches())


# 使用装饰器装饰类
# 一般不建议这么做
# 抽象和继承是更好的办法
# 下面是一个简单的栗子
def rel_cache(cls):
    print(f"class {cls} has been decorated.")
    # seems not work
    cls.x = 100
    return cls


@rel_cache
class rel:
    x, y = 1, 2

    def __init__(self, x, y):
        self.x = x
        self.y = y

    def add(self):
        return self.x + self.y


rel1 = rel(3, 4)
# 等价于
# rel2 = rel_cache(rel(3, 4))

print(rel1.add())


# 一个奇怪的功能, 装饰器可以给类添加新的功能
# 估计应该, 也许, 可能没什么用
# 用继承实现, 更直观

def class_dec(func):
    def wrapper(cls):
        cls.new_func = func
        return cls
    return wrapper


def new_func(*args):
    print("new func here.")


@class_dec(new_func)
class c:
    pass


c1 = c()
c1.new_func()

# 综上, 类可以用作装饰器
# 但是不要在类上使用装饰器, 这样不如继承来得自然
# 而且装饰器的粒度应该是方法级别的,
# ?? 极少数的可能需要类级别 ?? 标准库中是否存在用于类的装饰器??
# 例如功能性的装饰器, 如记录已经加载的类, 如标记一个类是特殊类型等等

```
