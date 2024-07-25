---
title: "字符串，元组和字典"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 2
BookToC: false
---

```python
'''
python的基本数据结构

- 序列
    1. 字符串 str
    2. 列表 list (列表推导式) data_list.py
    3. 元组 tuple 
- 集合 set
- 字典 dict
- 其他的编程技巧
'''


def __str():
    '''
    字符串不可变(immutable)
    '''
    print('who are you')
    # using \ to eacape.
    print('I\'m robot')
    # if u don't want to escape a str, like file path, use 'r' before quote.
    print(r'C:\file\path')
    # dispite the + calculation,
    # python also support * calculation, cool
    print('holy sh' + 7 * 'i' + 't!')

    # TypeError
    # str = 'python'
    # str[0] = 'P'


__str()


def __str_index_and_slice():
    '''
    在python中, 字符串是一种序列, 除了基本的操作之外, 还有序列的一些操作. 
    比如索引范访问, 切片等等.
    
    索引会越界, 但是切片不会. 不过不要去在切片里故意越界, 那样不好玩. 
    
    The index could be understand like:
    
    +---+---+---+---+---+---+
    | p | y | t | h | o | n |
    +---+---+---+---+---+---+
    0   1   2   3   4   5   6
    -6 -5  -4  -3  -2  -1
    '''
    # index access, index could be negtive
    s = 'py' 'thon'
    print(s[0])  # p
    print(s[5])  # n
    print(s[-4])  # t
    print(s[0] == s[-0])  # True

    # Slice 切片
    print(s[2:4])  # th
    print(s[2:])  # thon
    print(s[:5])  # pytho
    print(s[-3:])  # hon
    print(s[:-3])  #pyt
    print(s[-2:] == s[4:])  # True
    print(s[:-2] == s[:4])  # True
    print((s[:1] + s[1:]) == s)  # True


__str_index_and_slice()
'''
元组是不可变序列, 不支持修改元素值
支持序列的一般操作(索引取值, 切片, in/not in等等).
元组的元素可重复, 可为空
一般使用'(x, y, z)'来定义元组, 但'()'并不是必须的. 定义元组必须的其实是',' 
'''
t = 1, 'amg', None, 'amg'
print(t)
### 可嵌套
u = 'mpower', t
print(u)
### 定义空元组时, () 是必须的
emptyt = ()
### 定义单元素的元组时, ','是必须的
singleton = 'hello',
v = 1, '2', [3, 4]
print(v)  # (1, '2', [3, 4])
### 不可修改
# v[0] = 10   # TypeError: 'tuple' object does not support item assignment
### "可修改" 和Java的final关键字语义类似, 对象的引用不可变.
v[2][1] = 9
print(v)  # (1, '2', [3, 9])
'''
集合 set 是由不可重复的元素组成的无序[容器].
集合不能包含None. 
集合不是序列, 不支持序列的操作!
集合支持合(并)集, 交集, 差集 对称差分等[数学运算](https://zh.wikipedia.org/wiki/%E9%9B%86%E5%90%88%E4%BB%A3%E6%95%B0)

创建空集合只能用set()方法, 不能用{}, 因为{}用来创建空字典.
'''
barket = {"apple", 'orange', 'apple', 'pear', 'banaba', None}
print(barket)  # {'pear', 'orange', 'apple', 'banaba'}
print('apple' in barket)  # True
w = set('abracadabra')
x = set('alacazam')
print(w)
print(x)
print(w & x)  # 交集
print(w | x)  # 并集
print(w - x)  # 差集
print(x - w)  # 差集
print(w ^ x)  # 对称差集
### 集合也支持推导式
y = {x for x in 'abrhjschioqk' if x not in 'abc'}
print(y)
'''
字典 dict . 即k-v键值对.
字典的键可以是任何不可变类型: 数字, 字符串, 只包含字符串, 数字, 元组的元组和 None
和集合一样, 字典可以通过 dict() 方法和 {}来创建
关于字典的其他方法可以参见[API](https://docs.python.org/zh-cn/3/library/stdtypes.html#mapping-types-dict)
'''
tel = {"jack": 1100, "rose": 1234}
print(tel["jack"])  # 1100
### 删除键值对
del tel['rose']
print(tel)
### 添加键值对
tel['rose'] = 5201
### 使用list获取所有的键
print(list(tel))
### 使用构造器
# 可迭代对象作为实参,可迭代对象中的每一项本身必须
# 为一个刚好包含两个元素的可迭代对象.
# 每一项中的第一个对象将成为新字典的一个键,
# 第二个对象将成为其对应的值.
### None 可以作为键
z = dict(((1, 'tommy'), (2, 'high'), (3, 'lander'), (None, 'nb')))
print(z)
# 还有其他的构造器(不使用位置参数)
k = dict(b='apple', t='pc', v='macOS')
print(k)  # {'b': 'apple', 't': 'pc', 'v': 'macOS'}
### 还可以使用字典推导式
j = {x: x**2 for x in range(5)}
print(j)
### 遍历字典的方式 类似的方法有 keys() values() 
### 类似于java的entry
for key, value in z.items():
    print(key, value)
### 还有一个牛逼的函数 zip
l = dict(zip(['generic', 'track', 'year'],
             ['classical', 'Requiem in D minor', '1673']))
print(l)

```
