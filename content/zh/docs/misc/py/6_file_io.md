---
title: "格式化输出与文件I/O"
date: 2024-06-06
tags: [python]
categories: []
author: "wangy32"
weight: 6
BookToC: false
---

```python
from math import pi as pi
import os

"""
输入输出与文件I/O
1. 格式化字符串
2. 读取文件
"""
'''
使用占位符
'''
year = 2024
event = 'Trump\'s Gun Shot'
print(f'Big News of {event} in {year}')
### 或者这样
print(f'Big News of {event=} in {year=}')
### 占位符支持还格式化字符串输出

print(f'The value of pi is approximately {pi:.3f}')
### 可以指定宽度
table = {'Sjoerd': 4127, 'Jack': 4098, 'Dcab': 7678}
for name, phone in table.items():
    print(f'{name:10} ==> {phone:10d}')
'''
使用format()方法
'''
yes_votes = 42_573_651
total_votes = 83_637_912
percentage = yes_votes / total_votes
print('{:-9} YES votes {:2.3%}'.format(yes_votes, percentage))
### 或者 加入前导位置索引
print('{1:-9} YES votes {0:2.3%}'.format(percentage, yes_votes))
### 或者直接使用关键字
print('{yes_votes:4} YES votes {percentage:2.3%}'.format(yes_votes=117,
                                                         percentage=0.459417))
### 还可以直接输出字典类型
dicta = {'Sjoerd': 4127, 'Jack': 4098, 'Dcab': 8637678}
print('Jack: {Jack:d}; Sjoerd: {Sjoerd:d}; Dcab: {Dcab:d}'.format(**dicta))
'''
Old school 格式化方法(Java还在用哦)
'''
print('The value of pi is approximately %5.3f.' % pi)
'''
读写文件
python可以以纯文本或者二进制字节的形式读写文件

with 关键字的作用类似Java的try..with...resource, 不需要显式地处理异常和关闭资源

如果不使用with关键字, 则需要处理异常 和关闭资源
'''
### 文本流
with open('pys/misc/text', '+w', encoding="utf-8") as f:
    f.writelines([
        '這是一個純文字檔案.\n', 'This is a plain text file.\n'
                                 'これはただのテキストファイルです.\n', 'Il s\'agit d\'un fichier texte brut.\n',
        'Este es un archivo de texto sin formato.\n'
    ])
fil = open('pys/misc/text')
while (line := fil.readline()) != '':
    print(line, end='')
fil.close()
### 字节流


file_path = 'pys/misc/textb'
if not os.path.exists(file_path) or not os.path.isfile(file_path):
    open('pys/misc/textb', 'x')
with open('pys/misc/textb', '+wb') as fb:
    btsw = fb.write(b'This is a binary text file.')
    # 文件指针向前移动到写入字节数前一位
    fb.seek(btsw - 1)
    bt = fb.read(1)
    print(bt == b'.')


### 试试复制张图片
def copy_file(target, dest):
    if os.path.exists(target) and os.path.isfile(target):
        if not os.path.exists(dest) or not os.path.isfile(dest):
            df = open(dest, '+xb')
            with open(target, 'rb') as tf:
                while len((buffer := tf.read(1024))) > 0:
                    df.write(buffer)
            df.close()
        else:
            print("dest file exists.")
    else:
        raise FileNotFoundError("target file not found.")


copy_file('pys/misc/bot.jpg', 'pys/misc/bot_copy.jpg')

```
