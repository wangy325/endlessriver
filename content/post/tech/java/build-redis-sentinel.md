---
title: "Redis Sentinel高可用实现"
date: 2019-08-14T16:01:23+08:00
lastmod: 2019-10-21T10:01:23+08:00
draft: false
tags: [redis]
categories: [NOSQL]
author: "wangy325"

# You can also close(false) or open(true) something for this content.
# P.S. comment can only be closed
# comment: false
# toc: false
autoCollapseToc: false

# reward: false
hasCJKLanguage: true
mathjax: true

---

Redis [v2.8](https://raw.githubusercontent.com/antirez/redis/2.8/00-RELEASENOTES) 之后提供了高可用实现`Redis Sentinel`，实现了**主从复制**以及~~被动~~**主备切换**。[v3.0](https://raw.githubusercontent.com/antirez/redis/3.0/00-RELEASENOTES) 之后提供了分布式实现`Redis Cluster`。本文讨论的是使用Sentinel搭建Redis高可用服务。

>If all redis and sentinel instances were deployed in same host, you just build a fake redis-sentinel *High-Availability* environment[^v1].

# 1 准备

## 1.1 linux主机

本文使用centOS7，需安装gcc：

```shell
yum install gcc
# or on ubuntu
apt-get install gcc
```

<!--more-->

## 1.2 Redis 源码

本文使用[v4.0.0.11](http://download.redis.io/releases/redis-4.0.11.tar.gz)，版本号应大于2.8.0。

可以使用如下命令来获取指定版本的redis：

```shell
wget http://download.redis.io/releases/redis-4.0.11.tar.gz
```

## 1.3 了解linux防火墙的基本知识

centOS7和centOS6使用不同的防火墙机制，前者使用`firewall`，后者使用`iptables`。

## 1.4 master，slave和sentinel

如果只想搭建一个单机(standalone)实例[^v2]来学习redis的数据结构，只需要阅读安装redis实例就好。

多个`standalone`加之合适的配置便组成了`master-slave`结构，一般而言，此时已经具备了「主从复制」的能力。

所谓`Sentinel`，并不是所谓「新技术」名词，只是一个用来做特定事情[^v3]的redis实例而已，故此我们也可以将其称作「服务」。如果需要搭建`Sentinel`服务，你需要先具备`master-slave`结构，也就是说，你至少需要搭建2个redis实例，并且将其中一台配置为另一台的slave。

了解更多关于redis-sentinel的相关内容，请参考[redis哨兵与高可用架构](#)。

{{% figure class="center" src="/img/master-slave-vs-sentinel.png" title="redis的主从模式和哨兵模式" alt="img" %}}

<!-- {{% admonition bug "bug" %}}
此处用图片释义可能更明确
{{% /admonition %}} -->

# 2 安装配置Redis

接下来会依次安装Redis并且配置多个Redis实例


## 2.1 编译源码 {#section-1}

```shell
  tar -zxf redis-4.0.11.tar.gz
  # compile source code
  cd redis-4.0.11
  # redis was recommended to install in /usr/local/redis
  mkdir /usr/local/redis
  make install PREFIX=/usr/local/redis
  # ---
  #if all operations are right, you will see the output below:
  [root@shell ~]# cd /usr/local/redis ; ll
  total 68
  drwxr-xr-x 2 root root  4096 Aug  4 15:19 bin         #the redis executable binary file folder.
  -rw-r--r-- 1 root root    93 Aug  4 16:54 dump.rdb    #the dump of redis database, You can config where to save it later.
  -rw-r--r-- 1 root root 58905 Aug  7 13:56 redis.conf  #the config file of a particular redis instance.
  [root@shell redis]# cd /usr/local/redis/bin ; ll    
  total 21876
  -rwxr-xr-x 1 root root 2452168 Aug  4 15:19 redis-benchmark                 #redis test tool
  -rwxr-xr-x 1 root root 5775312 Aug  4 15:19 redis-check-aof                 #redis AOF persistent check tool
  -rwxr-xr-x 1 root root 5775312 Aug  4 15:19 redis-check-rdb                 #redis RBD persistent check tool
  -rwxr-xr-x 2 root root 2618192 Aug  4 15:19 redis-cli                       #launch a redis client
  lrwxrwxrwx 1 root root      12 Aug  4 15:19 redis-sentinel -> redis-server  #launch a redis sentinel server
  -rwxr-xr-x 3 root root 5775312 Aug  4 15:19 redis-server                    #launch a redis server(instance)
```

两个`ll`命令显示了一个redis的全部内容。本文用到的几个文件分别是：

- redis.conf： 配置文件，绝对的主角，它的戏谁都抢不走
- redis-server： 🧹扫地僧，开局现身一次，不出意外将隐居
- redis-client：谁都不用client，谁都是client

## 2.2 其他配置项

如果上述操作没有问题~~这么简单也不会有问题~~，理论上，一个`standalone`实例已经安装完成了，可以通过「命令 配置文件」的方式启动redis服务：

```shell
/usr/local/redis/bin/redis-server /usr/local/redis/redis.conf
```

但是为了方便启动服务，还需要做一些额外的操作：

<p style="background-color:lightgray">复制redis二进制程序到系统环境变量并将redis设置为开机启动</p>

```shell
cd /usr/local/redis/bin/
cp redis-server redis-cli redis-sentinel /usr/local/bin
```
如此，启动redis的时候便不需要指定程序路径; 此时，已经可以直接在终端运行`redis-server`了

将redis设置为开机启动（可选操作）：

```shell
# 安装完成后可以添加多个命令启动redis主从-哨兵系统
echo "redis-server /usr/local/redis.conf" >> /etc/rc.local
```

<!-- <p style="background-color:lightgray">将redis添加至系统服务，简化服务启停操作</p>

{{% admonition question "question" %}}此处需要添加内容{{% /admonition %}} -->

<p style="background-color:lightgray">开放防火墙端口</p>

{{% admonition tip "tip" %}}若主机未开启防火墙，则无需操作。{{% /admonition %}}

如果你的主机开启了防火墙，其他主机是无法连接上你的redis-server的，此时需要为其开放端口。

前面说到，centOS7和centOS6的防火墙机制不一样，需要分别处理。

若需知晓防火墙状态，请运行
```shell
systemctl status serviceName
```
centOS7 和centOS6的防火墙服务名分别为 `firewalld`和`iptables`

- 对于centOS7：

```shell
# 查看开放端口
[root@shell ~]# firewall-cmd --list-all
public
  target: default
  icmp-block-inversion: no
  interfaces:
  sources:
  services: ssh dhcpv6-client http
  ports: 6379/tcp
  protocols:
  masquerade: no
  forward-ports:
  source-ports:
  icmp-blocks:
  rich rules:
# 如果6379端口不在返回结果中，那么将6379添加到开放端口列表中
[root@shell ~]# firewall-cmd --permanent --add-port=6379/tcp
[root@shell ~]# firewall-cmd --reload
```

- centOS6[^v4]

```shell
# 添加规则
iptables -I INPUT -p tcp -m tcp --dport 6379 -j ACCEPT
# 保存规则
service iptables save
# 重启iptables
service iptables restart
```


## 2.3 配置文件redis.conf

在redis的[安装文件夹](#section-1)内，有一个系统预配置文件`redis.conf`，我们需要修改此配置文件以满足需求。

以下列出了(redis-standalone)常见配置列表[^v4]：

```shell
# redis进程是否以守护进程的方式(后台)运行(不以守护进程的方式运行会占用一个终端)
daemonize yes
# 指定redis进程的PID文件存放位置
pidfile /var/run/redis.pid
# redis进程的端口号
port 6379
# 允许任何ipv4的主机连接；
bind 0.0.0.0
# 客户端闲置多长时间(s)后关闭连接，默认此参数为0即关闭此功能
timeout 300
# redis日志级别，可用的级别有debug.verbose.notice.warning
loglevel verbose
# log文件输出位置，如果进程以守护进程的方式运行，此处又将输出文件设置为stdout的话，
# 就会将日志信息输出到/dev/null里面去了
logfile /var/log/redis/redis_6379.log
# 设置数据库的数量，默认为0可以使用select <dbid>命令在连接上指定数据库id
databases 16
# 保存db到磁盘，可配置多条，表示不同级别的数据改动
# 如下配置表示至少有一个key-value发生改动时，900s之后将其保存到磁盘；
# 如果至少有10个key-value发生改动，那么300s后将其保存到磁盘；
save 900 1
save 300 10
# 指定存储至本地数据库时是否压缩文件，默认为yes即启用存储
rdbcompression yes
# 指定本地数据库文件名
dbfilename dump.db
# 指定本地数据文件存放位置，以下配置表示保存在redis安装目录
dir ./
# 指定当本机为slave服务，配置为master的IP及端口，在redis启动的时候他会自动跟master进行数据同步
slaveof <masterip> <masterport>
# 当master设置了密码保护时，slave服务连接master的密码
masterauth <master-password>
# 设置redis连接密码，如果配置了连接密码，客户端在连接redis是需要通过AUTH<password>命令
# 提供密码，默认关闭
requirepass password
# 设置同一时间最大客户连接数，默认无限制。redis可以同时连接的客户端数为redis程序可以打开的最大
# 文件描述符，如果设置 maxclients 0，表示不作限制。当客户端连接数到达限制时，Redis会关闭新的
# 连接并向客户端返回 max number of clients reached 错误信息
maxclients 128
# 指定Redis最大内存限制，Redis在启动时会把数据加载到内存中，达到最大内存后，Redis会先尝试清除
# 已到期或即将到期的Key。当此方法处理后，仍然到达最大内存设置，将无法再进行写入操作，但仍然可以
# 进行读取操作。Redis新的vm机制，会把Key存放内存，Value会存放在swap区
maxmemory <bytes>
# 指定是否在每次更新操作后进行日志记录，Redis在默认情况下是异步的把数据写入磁盘，如果不开启，可
# 能会在断电时导致一段时间内的数据丢失。因为redis本身同步数据文件是按上面save条件来同步的，所以
# 有的数据会在一段时间内只存在于内存中。默认为no。
appendonly no
# 指定跟新日志文件名默认为appendonly.aof
appendfilename appendonly.aof
# 指定更新日志的条件，有三个可选参数 - no：表示等操作系统进行数据缓存同步到磁盘(快)，always：表示每次
# 更新操作后手动调用fsync()将数据写到磁盘(慢，安全)， everysec：表示每秒同步一次(折衷，默认值)；
appendfsync everysec

```
⚠️注意：关于`bind`指令的描述~~可以配置指定ip来允许指定连接，多个ip使用空格分隔~~，关于bind的意义，参考[redis配置外网访问](https://blog.csdn.net/hel12he/article/details/46911159)


# 3 启动redis

redis.conf文件配置无差的话，即可指定配置文件启动redis服务：

```shell
redis-server /usr/local/redis/redis.conf
```
启动日志：

```
27552:C 04 Aug 16:12:58.912 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
27552:C 04 Aug 16:12:58.912 # Redis version=4.0.11, bits=64, commit=00000000, modified=0, pid=27552, just started
27552:C 04 Aug 16:12:58.912 # Configuration loaded
                _._                                                  
           _.-``__ ''-._                                             
      _.-``    `.  `_.  ''-._           Redis 4.0.11 (00000000/0) 64 bit
  .-`` .-```.  ```\/    _.,_ ''-._                                   
 (    '      ,       .-`  | `,    )     Running in standalone mode
 |`-._`-...-` __...-.``-._|'` _.-'|     Port: 6379
 |    `-._   `._    /     _.-'    |     PID: 27553
  `-._    `-._  `-./  _.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |           http://redis.io        
  `-._    `-._`-.__.-'_.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |                                  
  `-._    `-._`-.__.-'_.-'    _.-'                                   
      `-._    `-.__.-'    _.-'                                       
          `-._        _.-'                                           
              `-.__.-'                                               

27553:M 04 Aug 16:12:58.915 # WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.
27553:M 04 Aug 16:12:58.916 # Server initialized
27553:M 04 Aug 16:12:58.916 # WARNING overcommit_memory is set to 0! Background save may fail under low memory condition. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.
27553:M 04 Aug 16:12:58.916 # WARNING you have Transparent Huge Pages (THP) support enabled in your kernel. This will create latency and memory usage issues with Redis. To fix this issue run the command 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' as root, and add it to your /etc/rc.local in order to retain the setting after a reboot. Redis must be restarted after THP is disabled.
27553:M 04 Aug 16:12:58.916 * Ready to accept connections
```

可以看到，一个`standalon`已经运行成功，但是有3个WARNING[^V5]:



```shell
WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.
# solution
[root@shell ~]# echo 511 >/proc/sys/net/core/somaxconn
[root@shell ~]# echo "net.core.somaxconn = 551" >> /etc/sysctl.conf

WARNING overcommit_memory is set to 0! Background save may fail under low memory condition. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.
#solution
[root@shell ~]# echo 1 > /proc/sys/vm/overcommit_memory
[root@shell ~]# echo "vm.overcommit_memory=1" >> /etc/sysctl.conf

WARNING you have Transparent Huge Pages (THP) support enabled in your kernel. This will create latency and memory usage issues with Redis. To fix this issue run the command 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' as root, and add it to your /etc/rc.local in order to retain the setting after a reboot. Redis must be restarted after THP is disabled.
#solution
[root@shell ~]# echo never > /sys/kernel/mm/transparent_hugepage/enabled
[root@shell ~]# vi /etc/rc.local
if test -f /sys/kernel/mm/transparent_hugepage/enabled; then
   echo never > /sys/kernel/mm/transparent_hugepage/enabled
fi
if test -f /sys/kernel/mm/transparent_hugepage/defrag; then
   echo never > /sys/kernel/mm/transparent_hugepage/defrag
fi    
```

# 4 使用redis-cli

redis服务启动成功之后，便可以通过`redis-cli`与服务进行交互。

```shell
# 连接redis-server，若-h和-p参数缺省，则默认连接localhost:6379
redis-cli -h 127.0.0.1 -p 6379
127.0.0.1:6379>
# 若redis-server requirepass设置了密码，那么需要认证
127.0.0.1:6379> auth yourpassword
OK
# ping-PONG说明redis服务正常
127.0.0.1:6379> ping
127.0.0.1:6379> PONG
# 获取帮助
127.0.0.1:6379> help
redis-cli 4.0.11
To get help about Redis commands type:
      "help @<group>" to get a list of commands in <group>
      "help <command>" for help on <command>
      "help <tab>" to get a list of possible help topics
      "quit" to exit

To set redis-cli preferences:
      ":set hints" enable online hints
      ":set nohints" disable online hints
Set your preferences in ~/.redisclirc
127.0.0.1:6379> help shutdown

  SHUTDOWN [NOSAVE|SAVE]
  summary: Synchronously save the dataset to disk and then shut down the server
  since: 1.0.0
  group: server

127.0.0.1:6379>
# 退出客户端
127.0.0.1:6379> exit
```
# 5 关闭redis-server

{{% admonition warning "warning"  %}}不要使用kill -9 pid关闭redis server，这样会可能会丢失数据完整性 {{% /admonition %}}

```shell
#关闭redis-server 可选参数nosave|save意为关闭服务之前是否保存数据到磁盘
127.0.0.1:6379> shutdown [nosave|save]
```

# 6 艺术就是复制

{{% admonition danger "danger" %}}以下配置是基于一台服务器的演示，如果要部署高可用环境，需要在不同的服务器上安装redis并作如下配置{{% /admonition %}}

经过上述操作，一个redis-standalone服务就配置好了，如果要将redis系统高可用，只需要「复制」就好了。

前面说过，`redis-server`是通过**可执行文件 + 配置文件**的方式启动，可执行文件已经解压得到，那么只需要复制配置文件就可以了。

以下是本次slave和sentinel的配置：

| Role      | Address          | Port    |
| ------------- |:---------------:| :------------|
| **Master**           | localhost         | 6379       |
| Slave           | localhost         | 16379, 26379|
| Sentinel         | localhost | 6380, 16380, 26380      |

```shell
# current workDir
cd /usr/local
# 创建文件夹存放slave和sentinel配置文件
mkdir redis-slave  redis-sentinel
cp -r redis/redis.conf redis-slave
cp -r redis/redis.conf redis-sentinel
# slave配置文件
mv redis-slave/redis.conf redis-slave/slave-16379.conf
```
## 6.1 配置redis-salve

slave的配置大抵和standalone一致，需要注意配置几个地方：

- `logfile`的保存地址配置自行配置
- `masterauth`和`requirepass`配置master的密码
- `slaveof`指明了其是哪个「主」的「从」
- `slave-read-only`指明从服务器只读

```shell
vim redis-slave/slave-16379.conf
<<<
    daemonize yes
    pidfile /var/run/redis-16379.pid
    logfile /var/log/redis/redis-16379.log
    port 16379
    bind 0.0.0.0
    timeout 300
    databases 16
    dbfilename dump-16379.db
    dir ./
    masterauth yourpassword
    requirepass yourpassword
    slave-read-only yes
    slaveof 127.0.0.1 6379
```

```shell
# 再多配一个slave
cp redis-slave/slave-16379.conf redis-slave/slave-26379.conf
```
同样地，只需要更改部分配置内容（端口，文件名）就可以了。

### 6.1.1 salve启动日志

以下是配置成功的slave启动日志：

```
30463:C 05 Aug 11:33:34.536 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
30463:C 05 Aug 11:33:34.537 # Redis version=4.0.11, bits=64, commit=00000000, modified=0, pid=30463, just started
30463:C 05 Aug 11:33:34.537 # Configuration loaded
                _._                                                  
           _.-``__ ''-._                                             
      _.-``    `.  `_.  ''-._           Redis 4.0.11 (00000000/0) 64 bit
  .-`` .-```.  ```\/    _.,_ ''-._                                   
 (    '      ,       .-`  | `,    )     Running in standalone mode
 |`-._`-...-` __...-.``-._|'` _.-'|     Port: 26379
 |    `-._   `._    /     _.-'    |     PID: 30464
  `-._    `-._  `-./  _.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |           http://redis.io        
  `-._    `-._`-.__.-'_.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |                                  
  `-._    `-._`-.__.-'_.-'    _.-'                                   
      `-._    `-.__.-'    _.-'                                       
          `-._        _.-'                                      
              `-.__.-'                                               

30464:S 05 Aug 11:33:34.539 # Server initialized
30464:S 05 Aug 11:33:34.539 * Ready to accept connections
# 注意以下输出：
30464:S 05 Aug 11:33:34.539 * Connecting to MASTER 127.0.0.1:6379
30464:S 05 Aug 11:33:34.539 * MASTER <-> SLAVE sync started
30464:S 05 Aug 11:33:34.539 * Non blocking connect for SYNC fired the event.
30464:S 05 Aug 11:33:34.539 * Master replied to PING, replication can continue...
30464:S 05 Aug 11:33:34.539 * Partial resynchronization not possible (no cached master)
30464:S 05 Aug 11:33:34.540 * Full resync from master: 4e99dfc708f2035b3b39f34796434de5889f667b:308
30464:S 05 Aug 11:33:34.543 * MASTER <-> SLAVE sync: receiving 177 bytes from master
30464:S 05 Aug 11:33:34.543 * MASTER <-> SLAVE sync: Flushing old data
30464:S 05 Aug 11:33:34.543 * MASTER <-> SLAVE sync: Loading DB in memory
30464:S 05 Aug 11:33:34.543 * MASTER <-> SLAVE sync: Finished with success
```
slave的启动日志有几个信息值得关注：

- redis启动警告信息消除，说明我们之前的配置生效了；
- slave server 初始化成功之后，便开始连接master；
- master 连接成功之后，便开始从主数据库同步数据；
- 之后，从数据库一直监听<sup><a>机制</a></sup>主数据库的改动并同步数据

### 6.1.2 验证主从数据同步

可以通过在主数据库写入数据，通过从服务器读取数据来验证主从关系是否正常。

```shell
[root@shell ~]# redis-cli -h localhost -p 6379
localhost:6379> auth yourpassword
OK
localhost:16379> get count
"6"
localhost:16379> decr count
(integer) 5
localhost:16379> exit
[root@ ~]# redis-cli -h localhost -p 16379
localhost:6379> auth yourpassword
OK
localhost:6379> get count
"5"
localhost:6379> incr count
(error) READONLY You can't write against a read only slave.
```
可以看到，主服务器将count值自减1之后，从服务器获取的count值也是自减后的值；同时，如果在从服务器上对count进行自增操作，会得到一条

```
(error) READONLY You can't write against a read only slave.
```
的错误消息，说明

- 端口16379的redis服务是slave；

- 我们配置的从服务器只读生效了

以上，即可完成配置经典的一主多备的redis服务部署。

## 6.2 配置redis-sentinel

同`slave`的配置一样，复制配置文件，少许改动即可，以下列出了`sentinel`的异于`slave`的配置项[^v7]：

```shell
# 哨兵sentinel监控的redis主节点的
## quorum：当这些quorum个数sentinel哨兵认为master主节点失联 那么这时 客观上认为主节点失联了  
# sentinel monitor <master-name> <ip> <port> <quorum>  
sentinel monitor master 127.0.0.1 6379 2

# 当在Redis实例中开启了requirepass <foobared>，所有连接Redis实例的客户端都要提供密码
# sentinel auth-pass <master-name> <password>  
sentinel auth-pass master yourpassword  

# 指定主节点应答哨兵sentinel的最大时间间隔，超过这个时间，哨兵主观上认为主节点下线，默认30秒  
# sentinel down-after-milliseconds <master-name> <milliseconds>
sentinel down-after-milliseconds master 30000  

# 指定了在发生failover主备切换时，最多可以有多少个slave同时对新的master进行同步。这个数字越小，完成failover所需的时间就越长；反之，但是如果这个数字越大，就意味着越多的slave因为replication而不可用。可以通过将这个值设为1，来保证每次只有一个slave，处于不能处理命令请求的状态。
# sentinel parallel-syncs <master-name> <numslaves>
sentinel parallel-syncs master 1  

# 故障转移的超时时间failover-timeout，默认三分钟，可以用在以下这些方面：
## 1. 同一个sentinel对同一个master两次failover之间的间隔时间。  
## 2. 当一个slave从一个错误的master那里同步数据时开始，直到slave被纠正为从正确的master那里同步数据时结束。  
## 3. 当想要取消一个正在进行的failover时所需要的时间。
## 4.当进行failover时，配置所有slaves指向新的master所需的最大时间。不过，即使过了这个超时，slaves依然会被正确配置为指向master，但是就不按parallel-syncs所配置的规则来同步数据了
# sentinel failover-timeout <master-name> <milliseconds>  
sentinel failover-timeout master 180000

```

```shell
# sentinel配置文件
mv redis-sentinel/redis.conf redis-sentinel/sentinel-6380.conf
vim redis-sentinel/sentinel-6380.conf
<<<
protected-mode no
bind 0.0.0.0
port 16380
daemonize yes
sentinel monitor master 127.0.0.1 6379 2
sentinel down-after-milliseconds master 5000
sentinel failover-timeout master 180000
sentinel parallel-syncs master 1
sentinel auth-pass master yourpassword
logfile /var/log/redis/sentinel-16380.log

```
同理，可以再配置其他2个`sentinel`服务。

### 6.2.1 sentinel启动日志

启动sentinel[^v8]

```Shell
redis-sentinel /usr/local/redis-sentinel/sentinel-6380.conf
# 或者
redis-server /usr/local/redis-sentinel/sentinel-6380.conf --sentinel
```

以下是配置成功的`sentinel`启动日志其一
```
8550:X 05 Aug 14:29:38.696 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
8550:X 05 Aug 14:29:38.696 # Redis version=4.0.11, bits=64, commit=00000000, modified=0, pid=8550, just started
8550:X 05 Aug 14:29:38.696 # Configuration loaded
                _._                                                  
           _.-``__ ''-._                                             
      _.-``    `.  `_.  ''-._           Redis 4.0.11 (00000000/0) 64 bit
  .-`` .-```.  ```\/    _.,_ ''-._                                   
 (    '      ,       .-`  | `,    )     Running in sentinel mode
 |`-._`-...-` __...-.``-._|'` _.-'|     Port: 6380
 |    `-._   `._    /     _.-'    |     PID: 8551
  `-._    `-._  `-./  _.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |           http://redis.io        
  `-._    `-._`-.__.-'_.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |                                  
  `-._    `-._`-.__.-'_.-'    _.-'                                   
      `-._    `-.__.-'    _.-'                                       
          `-._        _.-'                                           
              `-.__.-'                                               

8551:X 05 Aug 14:29:38.702 # Sentinel ID is c3776869c9bc3998e45158d3933d8e7b7c60ea84
8551:X 05 Aug 14:29:38.702 # +monitor master master 127.0.0.1 6379 quorum 2
```

通过观查启动日志，我们可以看到：

- 此实例的启动模式为`sentinel mode`，端口为6380
- `sentinel`已经成功监控`master`端口6379了

全部哨兵系统搭建起来并运行之后，再去查看`sentinel`的配置文件，会有如下自动配置的内容：

```
# Generated by CONFIG REWRITE
sentinel auth-pass master yourpassword
sentinel config-epoch master 1
sentinel leader-epoch master 1
sentinel known-slave master 127.0.0.1 16379
sentinel known-slave master 127.0.0.1 26379
sentinel known-sentinel master 127.0.0.1 26380 e615ce0f9e12531b83b3c7c7ff0e91e3c8873222
sentinel known-sentinel master 127.0.0.1 6380 dcc9d7e345a7f4db3b304b032bd1b41a8a7fc706
sentinel current-epoch 1
```
上面的配置列出了

- 主服务器的密码
- 以及当前世代（每发生一次主备切换称为一次世代，epoch加1）
- 当前所有从服务器的地址和端口信息
- 当前所以其他已知哨兵的端口和id信息

### 6.2.2 使用redis-cli查看系统信息

`sentinel`哨兵系统搭建起来之后，可以任一通过客户端查看系统内的实例信息。

```Shell
127.0.0.1:16380> sentinel master master
 1) "name"
 2) "master"
 3) "ip"
 4) "127.0.0.1"
 5) "port"
 6) "6379"
 7) "runid"
 8) "dfefe0ba7435f7c2c193698f17b7e46f7450d5ce"
 9) "flags"
10) "master"
...
127.0.0.1:16380> sentinel slaves master
1)  1) "name"
    2) "127.0.0.1:16379"
    3) "ip"
    4) "127.0.0.1"
    5) "port"
    6) "16379"
    7) "runid"
    8) "fdda882f98724c46359a4deb9390b6ae4de13320"
    9) "flags"
   10) "slave"
 ...
2)  1) "name"
    2) "127.0.0.1:26379"
    3) "ip"
    4) "127.0.0.1"
    5) "port"
    6) "26379"
    7) "runid"
    8) "4a2c286c0c99c3a1202eec142599193a85671f6c"
    9) "flags"
   10) "slave"
...
```

### 6.2.3 模拟主备切换

哨兵的存在就是为了解决`master-slave`系统中由于`master`宕机引起的系统瘫痪问题。

在哨兵系统中，一旦哨兵发现当前`master`宕机，哨兵会在余下的`slaves`中选举一个「继任」为新一代的`master`，从而保证系统的高可用。

现在我们通过主动关闭当前`master`服务的方式来模拟`master`宕机，看看哨兵会做什么：

```Shell
# 关闭master服务
redis-cli -p 6379
127.0.0.1:6379> auth yourpassword
OK
127.0.0.1:6379> shutdown save
127.0.0.1:6379> exit
# 查看sentinel日志
less /var/log/redis/sentinel-6380.log
<<<
29649:X 23 Aug 17:14:02.326 # +sdown master master 127.0.0.1 6379
29649:X 23 Aug 17:14:02.389 # +new-epoch 1
29649:X 23 Aug 17:14:02.391 # +vote-for-leader 503d5371452f8e110df0f12c236da3e51b55b03a 1
29649:X 23 Aug 17:14:03.444 # +odown master master 127.0.0.1 6379 #quorum 3/2
29649:X 23 Aug 17:14:03.444 # Next failover delay: I will not start a failover before Fri Aug 23 17:14:38 2019
29649:X 23 Aug 17:14:03.488 # +config-update-from sentinel 503d5371452f8e110df0f12c236da3e51b55b03a 172.16.16.203 16380 @ master 127.0.0.1 6379
29649:X 23 Aug 17:14:03.488 # +switch-master master 127.0.0.1 6379 127.0.0.1 26379
29649:X 23 Aug 17:14:03.488 * +slave slave 127.0.0.1:16379 127.0.0.1 16379 @ master 127.0.0.1 26379
29649:X 23 Aug 17:14:03.488 * +slave slave 127.0.0.1:6379 127.0.0.1 6379 @ master 127.0.0.1 26379
29649:X 23 Aug 17:14:08.536 # +sdown slave 127.0.0.1:6379 127.0.0.1 6379 @ master 127.0.0.1 26379
29649:X 23 Aug 17:15:42.868 # -sdown slave 127.0.0.1:6379 127.0.0.1 6379 @ master 127.0.0.1 26379
29649:X 23 Aug 17:15:52.888 * +convert-to-slave slave 127.0.0.1:6379 127.0.0.1 6379 @ master 127.0.0.1 26379
```

通过24行`sentinel`日志，我们可以看到的信息有哪些呢？

- master**主观下线**[^v9]；
- 系统进入新世代；
- 3/2投票认为master下线，master**客观下线**[^v10]；
- 切换主服务器：从6379切换为26379；
- 同时6379和16379切换为26379的从节点

此时，我们如果查看redis的配置文件，会发现原`6379`的主服务器配置文件多了一行

```
slaveof 127.0.0.1 26379
```

同时，`16379`和`26379`端口的服务的`slaveof`配置项也作了相应修改。

# 7 结束语

至此，基于`sentinel`的redis高可用集群就搭建完成了。虽然篇幅较长，实际上搭建一个这样的系统的逻辑是比较简单的。

主要易于混淆的是6不个redis实例的配置，细心点就好了。

想用好这个高可用系统，你可能还需要了解更多关于`sentinel`的内容。



[^v1]: 本文是在所有服务均配置完成之后所作的记录，并非同步记录，部分操作可能存在错误
[^v2]: 下文会多次提到实例这个概念，它在本文中指一个运行的Redis数据库服务
[^v3]: 监控master状态，如果宕机，则执行主备切换
[^v4]: [搭建redis单机服务](https://juejin.im/post/5b76e732f265da4376203849#heading-11)
[^v5]: [解决redis启动的3个警告](https://blog.csdn.net/kk185800961/article/details/53326465)

[^v7]: [redis哨兵与高可用](https://juejin.im/post/5b7d226a6fb9a01a1e01ff64)
[^v8]: [redis-server man page](https://www.mankier.com/1/redis-server)
[^v6]: 付磊，张益军：redis开发与运维
[^v9]: 仅当前哨兵接收不到master的心跳，称为主观下线
[^v10]:经过投票之后，满足配置个数的哨兵认为master下线，则master被认为客观下线，触发主备切换
