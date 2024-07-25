---
title: "命名空间与作用域"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 8
BookToC: false
---

```python
"""
Author: wangy325
Date: 2024-07-17 19:24:01
Description: 作用域
"""


def __scope_test():

    def do_local():
        # 内层局部作用域
        spam = 'local spam'

    def do_nonlocal():
        # 使用nonlocal可以改变外层变量对spam的绑定
        nonlocal spam
        spam = 'nonlocal spam'

    def do_global():
        # 使用global改变全局作用域对spam的绑定
        global spam
        spam = 'global spam'
    # 函数内局部作用域
    spam = 'spam' 
    do_local()
    print('After local assignment: ', spam)
    do_nonlocal()
    print('After nonlocal assignment: ', spam)
    do_global()
    print('After global assignment: ', spam)


__scope_test()
# 在当前模块的全局作用域访问 spam
# 如果没有在局部使用global声明，你看这里打印spam报不报错就完了
print("In global scope: ", spam)

```
