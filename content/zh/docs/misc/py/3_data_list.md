---
title: "列表（list）"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 3
BookToC: false
---

```python
'''
和字符串一样, 列表支持索引访问. 
列表是一个元素可重复, 可修改的序列. 
列表的元素可以包括不同的类型, 甚至是None 但是, 一般也不要那么做. 
'''


def __list():
    alist = [1, 1, 2, 3, 5, 8, 13, 21, 34]
    print(type(alist))
    print(alist[4])
    # Join 2 lists together
    blist = alist + [54, 89]
    print(blist)
    # List element can be changed
    blist[9] = 55
    print(blist)
    # Also, list support slice
    clist = ['apple', 'orange', 'grapy', 'stawberry']
    print(clist[2:3])  # grapy
    # Assigning a slice can also modify original list, even clear the list
    clist[2:3] = ['grape']
    print(clist)  # ['apple', 'orange', 'grape', 'stawberry']
    clist[3:] = []
    print(clist)  # ['apple', 'orange', 'grape']
    clist[:] = []
    print(clist)  # []
    # List has many usful APIs
    clist.append('banana')
    clist[len(clist):] = ['peach']
    print(clist)
    # List elements can be dulplicated, and None
    dlist = ['country', 'province', 'state', 'country', 'street', None]
    print(dlist)


__list()


def __list_shalow_copy():
    '''
    列表的切片, 返回一个对列表的浅拷贝. 
    以下操作, 返回了不同的结果.
    '''
    rgba = ["Red", "Green", "Blue", "Alph"]
    # slice will return a shalow copy of a list
    rgba_correct = rgba[:]
    rgba[:] = ["Red", "Green", "Blue", "Alpha"]
    # rgba_correct[-1] = 'alpha'
    print(rgba)  # ['Red', 'Green', 'Blue', 'Alpha']
    print(rgba_correct)  # ['Red', 'Green', 'Blue', 'Alph']


__list_shalow_copy()


class ListStack:
    '''
    使用列表模拟栈
    '''
    # elements = [] 一般不在此处声明变量, 因为是public的（类变量）

    # constructor
    def __init__(self, *args):
        self.elements = list(args) # 此处的变量才是实例变量

    def push(self, ele):
        self.elements.append(ele)

    def pull(self):
        if len(self.elements) > 0:
            return self.elements.pop()
        else:
            raise SystemError("stack is empty!")

    def print_stack(self):
        print(self.elements)

    def size(self):
        return len(self.elements)


stack = ListStack('wind', 'forest', 'fire')
stack.print_stack()
stack.push('mountain')
stack.print_stack()
print(stack.pull() + ', stack length is ' + str(stack.size()))


class ListQueue:
    '''
    使用list实现队列
    更快的实现方式: from collections import deque
    '''
    def __init__(self, *args):
        self.elements = list(args)

    def push(self, ele):
        self.elements.append(ele)

    def pull(self):
        if self.size() > 0:
            return self.elements.pop(0)
        else:
            raise SystemError("queue is empty!")

    def size(self):
        return len(self.elements)

    def print_queue(self):
        print(self.elements)


queue = ListQueue(1, 3, 5)
queue.print_queue()
queue.push(7)
print(queue.size())
queue.pull()
queue.print_queue()

################################
# 列表推导式, 让创建列表的方式更加简单
# 格式: 表达式 + for {[for...][if...]}
# 解释: 一个表达式，后面为一个 for 子句，
#      然后，是零个或多个 for 或 if 子句。
#      结果是由表达式依据 for 和 if 子句
#      求值计算而得出一个新列表。
################################

# 以下初始化列表的方式
squares = []
for x in range(10):
    squares.append(x**2)
print(squares)
### 等价于
squares = list(map(lambda x: x**2, range(10)))
### 还可以更加简单的表示成列表推导式
squares = [x**2 for x in range(10)]
### 还可以使用更加复杂的表达式
sqlist = [(x, y) for x in (1, 2, 3) for y in (3, 1, 4) if x != y]
print(sqlist)
### 上面的表达式等价于
sqlist = []
for x in [4, 6, 9]:
    for y in [5, 4, 6]:
        if x != y:
            sqlist.append((x, y))
print(sqlist)
### 利用表达式展开复杂的列表
vec = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat_vec = [e for l in vec for e in l]
print(flat_vec)
### 等价于
vecc = []
for i in vec:
    for j in i:
        vecc.append(j)
print(vecc)
### 前置表达式可以是更加复杂的表达式
from math import pi
pil = [str(round(pi, i)) for i in range(6)]
print(pil)
### 甚至, 是另一个列表推导式. 不过这种语句, 少用, 可读性太差
matrix = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
]
mat = [[i[k] for i in matrix] for k in range(4)]
print(mat)
### 等价于
matt = []   
for i in range(4):
    tmp = []
    for j in range(len(matrix)):
        tmp.append(matrix[j][i])
    # for ele in matrix:
        # tmp.append(ele[i])
    matt.append(tmp)
print(matt)
### 可以使用内置函数zip替代
print(list(zip(*matrix)))

### del 语句 可以用来删除列表的元素, 或者整个变量
del[matt[0]]
print(matt)
del matt
print(matt)    # name 'matt' is not defined
```
