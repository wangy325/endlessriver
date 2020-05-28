---
title: "Git入门1"
date: 2018-09-19
lastmod: 2020-04-02
draft: false
tags: [git]
categories: [VCS]
author: "wangy325"

hasJCKLanguage: true
# You can also close(false) or open(true) something for this content.
# P.S. comment can only be closed
# comment: false
toc: true
autoCollapseToc: false

# reward: false

---

本文简单介绍了Git本地仓库的构建，与远程仓库的关联

<!--more-->


# 安装

ubuntu下安装：

    sudo apt install git

windows 下安装，需[下载](https://git-scm.com/downloads)安装包

# Git 本地仓库的创建

通俗地讲，本地任何一个目录都可以是本地仓库。只需要启动Terminal(ubuntu)或Git Bash(windows)，`cd`进入指定目录，运行

    git init

即可以初始化一个**空的**本地仓库。此时，该目录下会多出一个`.git`子目录，它是Git用来跟踪管理版本库的。当然，如果你想取消版本管理，删除这个目录即可。

Git 不同于 Subversion 的地方在于，Git是分布式的版本管理系统，没有中央服务器。~~这大概解释了Git可以创建本地仓库的原因，而Subversion的使用必须要借助互联网~~。

~~关于**集中式**与**分布式**的讨论，此处不作多的说明，没有使用经验支撑，那些优劣列出来，没有什么意义。~~

# Git 关联GitHub远程仓库

Git支持基于SSH和https关联远程仓库，但推荐使用SSH方式，它[更加安全](#)。在本地仓库要想和GitHub远程仓库关联，首先需要在GitHub中配置SSH and GPG keys。

通过

    ssh-keygen -t rsa -C "wangy325@qq.com"

获取ssh密钥文件，操作过程中会提示确认保存文件的位置以及要求输入密码，以下是命令输出(windows 平台)。
    
    Generating public/private rsa key pair.
    Enter file in which to save the key (/c/Users/mayn/.ssh/id_rsa):
    Enter passphrase (empty for no passphrase):
    Enter same passphrase again:
    Your identification has been saved in /c/Users/mayn/.ssh/id_rsa.
    Your public key has been saved in /c/Users/mayn/.ssh/id_rsa.pub.
    The key fingerprint is:
    SHA256:Yy7sS0KnY+iaQDLldwI43znocIboZhDbD5ZPwjzMybU wangy325@qq.com
    The key's randomart image is:
    +---[RSA 2048]----+
    |                 |
    | .               |
    |+ o .            |
    |./ B o           |
    |O.^ E o S        |
    |=B @ B o .       |
    |.+o B + .        |
    |+o . = .         |
    |o..   o.         |
    +----[SHA256]-----+

命令执行完成之后，会在 `c/Users/mayn/` 下生成一个`.ssh`目录，里面包含了密钥信息。

然后在GitHub页面添加新的ssh key，配置完成以后，便可以将本地仓库和远程仓库关联，并将本地文件上传到远程（通常，你需要先`add`并且`commit`文件到本地版本库）：

    git remote add origin git@github.com:wangy325/repositoryName.git
    git push -u origin master

# Git的工作模式简单介绍

- 工作区(workspace)：即当前工作目录
- 暂存区(stage/index):`.log`目录下的的index文件中，暂存区域保存的是本地已`add`但未`commit`的改动
- 版本库(local repository):本地版本库，`commit`之后文件信息变保存在其中
- 远程仓库(remote repository):远程版本库，`push`推送本地文件到远程版本库，`fetch`从远程版本库拉取 ~~资源~~ 版本信息，`pull`从远程版本库中拉取资源


![imLgtx.png](https://s1.ax1x.com/2018/09/20/imLgtx.png)

​										*Git本地**工作区**，**暂存区**，**版本库**的概念，图引自[易百教程](https://www.yiibai.com/git/)*



Git 版本控制的一些主要概念：
- 3个步骤：
    1. `add`命令只添加文件到暂存区
    2. `commit`命令将文件添加到本地版本库
    3. `push`命令将本地版本库的内容推送到远程仓库
- 4个区：
    1. workingAera：当前工作空间
    2. stage：暂存区，已修改并`add`的文件在此区
    3. local repository：本地仓库
    4. remote repository：远程仓库
- 5种状态
    1. origin：被git追踪但未作任何修改
    2. modified：已修改但未`add`到暂存区
    3. staged：已修改并`add`到暂存区
    4. committed：已提交到本地仓库
    5. pushed：已推送到远程仓库

# 常用命令

>***git command \--help 可以打开帮助文档***  
>***git config \--global credential.helper store 保存用户凭证，避免每次push/pull都需要输入密码***

## 添加文件到暂存区


    git add file1 ...

提交文件到仓库之前，需要配置用户名和电子邮件

    git config --global user.name "wangy325"
    git config --global user.email "wangy325@qq.com"

## 提交文件到仓库

    git commit -m "commit comment"


## 查看当前仓库的状态

    $ git status
    On branch master
    Your branch is up to date with 'origin/master'.
    
    Changes not staged for commit:
      (use "git add <file>..." to update what will be committed)
      (use "git checkout -- <file>..." to discard changes in working directory)
    
            modified:   readme.md
    
    Untracked files:
      (use "git add <file>..." to include in what will be committed)
    
            Main.java
    
    no changes added to commit (use "git add" and/or "git commit -a")



## 查看某个文件的差异信息

- `git diff` 

    查看暂未`add`到暂存区的改动，也就是状态为`modified`的文件，如果文件已经`staged`，则此命令不会显示差异信息
- `git diff --cached`     
  
     查看已经`add`到暂存区的改动，也就是状态为`staged`的文件，如果文件处于`modified`状态，则此命令不会显示差异信息
- `git diff HEAD`         
  
     查看已暂存和未暂存的所有改动
- `git diff --stat`       
  
     显示差异的摘要信息
- `git diff master origin/master`   
  
     显示本地仓库和远程仓库之间的文件的差异信息，即`committed`和`pushed`两个状态之间的差异 
- `git diff versionCode1 versionCode2`      
  
     显示两个版本(号)之间的差异信息，`less`打开


    $ git diff readme.md
    warning: LF will be replaced by CRLF in readme.md.
    The file will have its original line endings in your working directory.
    diff --git a/readme.md b/readme.md
    index bb8298f..222e2da 100644
    --- a/readme.md
    +++ b/readme.md
    @@ -6,3 +6,5 @@
     - Java的回调机制
     - idea的多线程调试
     - 拦截器
    +
    +> you can't live your life based on other people's point of view.

## 查看版本更新日志

    git log [--pretty=oneline]       --可选参数显示简略信息
    
    $ git log
    commit cf3d291b043457536f5851c3517c94f6f50d4c94 (HEAD -> master, origin/master)
    Author: wangy325 <wangy325@qq.com>
    Date:   Wed Sep 19 12:11:13 2018 +0800
    
        update readme.md
    
    commit 7daa43936419202cfd6c0e58988001577cb61e73
    Author: wangy325 <wangy325@qq.com>
    Date:   Wed Sep 19 12:10:30 2018 +0800
    
        upload files

上面的日志显示 HEAD 的**版本号**为`cf3d291b043457536f5851c3517c94f6f50d4c94`，括号内显示，本地仓库和远程仓库的文件是一致的（最新的），以下是commit但是**没有push到远程仓库**的日志记录：

    commit f67ec47c9df0f0f8351413ef64494e908d7183a0 (HEAD -> master)
    Author: wangy325 <wangy325@qq.com>
    Date:   Thu Sep 20 17:29:09 2018 +0800
    
        add motto
    
    commit cf3d291b043457536f5851c3517c94f6f50d4c94 (origin/master)
    Author: wangy325 <wangy325@qq.com>
    Date:   Wed Sep 19 12:11:13 2018 +0800
    
        update readme.md
    
    commit 7daa43936419202cfd6c0e58988001577cb61e73
    Author: wangy325 <wangy325@qq.com>
    Date:   Wed Sep 19 12:10:30 2018 +0800
    
        upload files

上面的日志显示，本地HEAD最新的版本号和远程仓库的版本号不一致，暗示本地仓库的改动还未提交到远程仓库



## 撤销修改

1. modified 状态撤回

> git checkout 

## 从工作区和索引中删除文件

> ***git rm [-f | --force] [-n] [-r] [--cached] [--ignore-unmatch] [--quiet] [--] <file>…*** 


- `git rm <file>`  

    从当前工作目录中删除文件，这个文件将会从***工作空间***物理删除，然后commit，版本库中的改文件信息会被删除
```
$ git rm text2.md
rm 'text2.md'

$ git status
On branch master
Your branch is ahead of 'origin/master' by 5 commits.
  (use "git push" to publish your local commits)

Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

        deleted:    text2.md

$ git commit -m "aaa"
[master d0ba06d] aaa
 1 file changed, 1 deletion(-)
 delete mode 100644 text2.md
```
- `git rm -f <file>` 

    如果当前文件已经在暂存区，则将其从***暂存区***和***工作空间***中移除（移除版本信息），commit 之后，其将不在版本库中

```
$ git add t3.md
warning: LF will be replaced by CRLF in t3.md.
The file will have its original line endings in your working directory.

$ git rm t3.md
error: the following file has changes staged in the index:
    t3.md
(use --cached to keep the file, or -f to force removal)

$ git rm -f t3.md
rm 't3.md'

$ git status
On branch master
Your branch is ahead of 'origin/master' by 6 commits.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean
```
- `git rm --cached <file>`  

    如果当前文件改动已经add到暂存区，使用该命令从暂存区中移除版本信息，但是工作空间中还存在，commit之后，其将不在版本库中
```
$ git add t3.md
warning: LF will be replaced by CRLF in t3.md.
The file will have its original line endings in your working directory.

$ git rm --cached t3.md
rm 't3.md'

$ ls
me/  readme.md  t3.md

$ git status
On branch master
Your branch is ahead of 'origin/master' by 7 commits.
  (use "git push" to publish your local commits)

Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

        deleted:    t3.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)

        t3.md
```

---

1. 首次创建时间 2018/09/19 09:34
2. update time  2020/04/02 12:10
