
---
title: "安装单机版fdfs服务遇到的问题"
date: 2019-08-31
draft: false
tags: [fdfs]
categories: [Server]
author: "wangy325"

hasJCKLanguage: true
# You can also close(false) or open(true) something for this content.
# P.S. comment can only be closed
# comment: false
toc: true
autoCollapseToc: false

# reward: false
---


本文简单记录了2个在安装单机版fdfs服务遇到的问题，虽然报错信息不同，但是问题出在同一个地方：

<!--more-->

> nginx版本与ngx_http_fastdfs_module版本
> nginx版本1.16.1
> module版本1.20

这个版本的混用会导致编译和配置时分别遇到致命错误

1. nginx1.12编译出现 [/usr/include/fastdfs/fdfs_define.h:15:27: fatal error: common_define.h: No such file or directory](https://github.com/happyfish100/fastdfs-nginx-module/issues/31)

2. 按照1法解决编译问题之后，紧接着会出现配置文件错误 `unknown directive "ngx_http_fastdfs_module"`，个人推测虽然在解决第一个问题（通过修改fdfs_module的配置文件使得编译通过）时，nginx的模块实际上没有安装成功

3. 模块安装成功的标志是

    ```
     [root@shell ~]# nginx -V 
     nginx version: nginx/1.12.1
     built by gcc 4.8.5 20150623 (Red Hat 4.8.5-36) (GCC) 
     configure arguments: --add-module=/opt/fdfs/fastdfs-nginx-module-revise/src
    ```

最后使用nginx-1.12.0以及

```
# 这里为啥这么长一串呢，因为最新版的master与当前nginx有些版本问题
# wget https://github.com/happyfish100/fastdfs-nginx-module/archive/5e5f3566bbfa57418b5506aaefbe107a42c9fcb1.zip

# 解压
# unzip 5e5f3566bbfa57418b5506aaefbe107a42c9fcb1.zip

# 重命名
# mv fastdfs-nginx-module-5e5f3566bbfa57418b5506aaefbe107a42c9fcb1  fastdfs-nginx-module-master
```

解决问题

### 2 安装nginx的2种方式

~~centOS上安装nginx有2种方式~~[^1]

- 通过包管理器（yum命令）安装（未测试）
- 通过源码安装

这里说一下通过源码安装的几个点：

- 网络上的其他教程说的比较细致了，几个依赖一定要先安装

    ```
    yum install gcc-c++
    yum install -y pcre pcre-devel
    yum install -y zlib zlib-devel
    yum install -y openssl openssl-devel
    ```

- 如果`./configure`命令后面不接[任何参数](https://blog.csdn.net/Eric1012/article/details/6052154)的话，nginx默认安装在`/usr/local/nginx`下，以及nginx启动需要的作用资源均在此目录下

    ```
    [root@shell nginx-1.12.1]# ./configure --help 
      --help                             print this message
    
      --prefix=PATH                      set installation prefix
      --sbin-path=PATH                   set nginx binary pathname
      --modules-path=PATH                set modules path
      --conf-path=PATH                   set nginx.conf pathname
      --error-log-path=PATH              set error log pathname
      --pid-path=PATH                    set nginx.pid pathname
      --lock-path=PATH                   set nginx.lock pathname
      ...省略内容 ...
    ```

    如上可以自定义编译nginx的参数，这也是能为nginx添加`ngx_http_fastdfs_modul`模块的原因。

    题外：如果安装过程完全参照[这篇文章](https://www.cnblogs.com/chiangchou/p/fastdfs.html#_label2_0)的话，或许就不会有这个问题了

[^1]: 使用[nginx官网推荐](#https://nginx.org/en/linux_packages.html#RHEL-CentOS)的方式安装最方便

