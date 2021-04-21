---
title: "Git入门2"
date: 2018-09-20
lastmod: 2019-10-21
draft: false
tags:
- 
categories:
- git
author: "wangy325"

---

git fetch 与 git pull

<!--more-->

> 此文的操作背景在本次工作空间的master分支下, 并且追踪远程master分支
> 部分内容引用自[yibai.com](https://www.yiibai.com/git/git_pull.html)

前文说到, git版本控制的基本原型与操作逻辑. 如果出现两台机器(比如公司和家)上同时更改'本地仓库'内容并且`push`到远程库中,那么必然会导致另一个版本库中的文件低于远程库,如果是有效的改动, 必然涉及到本地库和远程库同步的问题, 这涉及到3个关键词: `fetch`, `merge`, `pull`

#### git fetch

> 从一个或多个其他存储库中获取分支和/或标签(统称为“引用”)以及完成其历史所必需的对象

通俗地讲, 如果想将远程仓库`master`分支的版本信息下载(同步)到本地仓库, 就可以简单地使用

```
$ git fetch origin master
```

命令. `git fetch` 命令会默认拉取所有分支信息. 但是仅仅这样, 本地的文件并没有更新, 因为这一操作仅仅'检查到有可用更新', 要'更新'本地仓库工作空间的文件,还需要另一个命令: `git merge`

#### git merge

> 命令用于将两个或两个以上的开发历史加入(合并)一起

实际上, 在执行了`git fetch origin master` 之后, 再执行`git branch`, 会出现两个分支信息:

```git
$ git fetch origin master
Warning: Permanently added the RSA host key for IP address '52.74.223.119' to the list of known hosts.
Enter passphrase for key '/c/Users/mayn/.ssh/id_rsa':
remote: Enumerating objects: 19, done.
remote: Counting objects: 100% (19/19), done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 10 (delta 5), reused 10 (delta 5), pack-reused 0
Unpacking objects: 100% (10/10), done.
From github.com:wangy325/demoLite
 * branch            master     -> FETCH_HEAD
   276f33d..78beaa6  master     -> origin/master
$ git branch -a
* master
  remotes/origin/master
```

其中`master`分支是当前工作分支, 而`remotes/origin/master`是执行fetch命令之后下载的版本信息. 如果想将版本库中的分支合并到**当前工作分支**,可以使用命令:

```git
$ git merge origin/master
```

> 注意：上述命令会自动将合并后的结果提交(commit), 如果想要对合并进行进一步更改时, 可以使用 `--no-commit` 选项

#### git pull

> 取回远程主机某个分支的更新(fetch)，再与本地的指定分支合并(merge)

因此, `pull`可以看作是`fetch`和`merge`命令的集合, 如果想要将远程`master`分支与本地`master`分支合并, 可使用如下命令:

```
$ git pull origin master:master
```

如果当前工作分支是`master`分支, 那么命令也可以简写为:

```
$ git pull origin master
```

实际上我们发现, 以上命令相当于先取回`origin/master`分支, 再将其与**当前分支**合并, 这是一个先做`git fetch`, 后做`git merge`操作的过程:

```
$ git fetch origin master
$ git merge origin/master
```

#### 分支追踪关系

一般地, Git会自动在本地分支和远程分支之间建立一种追踪关系(tracking). 建立追踪关系的分支之间可以建立更加简便的操作.

> 比如，在git clone的时候，所有本地分支默认与远程主机的同名分支，建立追踪关系，也就是说，本地的master分支自动”追踪”origin/master分支

可以通过 `git branch -vv` 查看当前本地分支与远程分支的追踪关系:

```
$ git branch -vv
* master 78beaa6 [origin/master] revise code
```

也可以手动建立追踪关系:

```
// 将本地master分支与远程master分支建立追踪关系
$ git branch --set-upstream master origin/master
```

建立追踪关系之后, **`git pull`** 就可以省略远程名, git 自动从**当前分支**追踪的远程分支中获取更新并且拉取到本地工作空间

```
// 现在自动从远程仓库(origin)中拉取当前分支追踪的远程分支的更新
$ git pull origin
// 若当前分支只有一个追踪分支, 甚至可以省略主机名
$ git pull
```

#### git fetch和git pull的区别

- *git fetch* : 从远程获取最新的版本到本地, 但是不会自动合并
- *git pull* : 从远程获取最新版本并且合并到本地

```git
// 从远程origin的master分支拉取最新版本到origin/master分支
$ git fetch origin master
// 比较本地master和origin/master分支的区别
$ git log -p master.. origin/master
// 合并 origin/master 到当前分支(master)
$ git merge origin/master
```

上述过程可以更加简便地表述为

```git
$ git fetch origin master:tmp
$ git diff tmp
$ git merge tmp
```
