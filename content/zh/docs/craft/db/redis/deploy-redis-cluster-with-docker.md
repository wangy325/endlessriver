---
title: "使用docker镜像快速搭建redis集群开发环境"
date: 2022-08-25T16:01:23+08:00
author: "wangy325"
weight: 3
tags: []
categories: [redis]
---


## 准备镜像

`docker`以及`docker-compose`的安装以及加速镜像的配置不在此处说明。windows系统上直接安装客户端即可完成docker及docker-compose的安装。在centOS 8中安装docker服务以及docker-compose可以参考下面的文章：

- [在centOS 8中安装docker](https://zhuanlan.zhihu.com/p/286845061)
- [在contOS 8中安装docker-compose](https://www.cnblogs.com/51ma/p/15641138.html)

运行如下命令检查docker和docker-compose的安装情况：

<!--more-->

```shell
[xx@CentOS8 ~]$ docker version
Client: Docker Engine - Community
 Version:           20.10.17
 API version:       1.41
 Go version:        go1.17.11
 Git commit:        100c701
 Built:             Mon Jun  6 23:03:11 2022
 OS/Arch:           linux/amd64
 Context:           default
 Experimental:      true
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
[xx@CentOS8 ~]$ docker-compose version
Docker Compose version v2.10.0
```

centOS 8 通过命令`systemctl start docker`来运行docker服务。

本次搭建使用的redis[官方镜像](https://hub.docker.com/_/redis)，版本`7.0.4`:

```shell
docker pull redis:7.0.4
```

## 创建自定义docker网络模式

```shell
docker network create redis-net --subnet 192.168.10.0/24 --gateway=192.168.10.1 --driver bridge
```

上述命令创建了一个桥接网络，使用`192.168.10.0`网段。

创建桥接网络后，方便后续在编写docker-compose配置时，为每个redis节点指定`ipv4_address`。

> `--subnet`参数必须要指定，不指定的话，docker默认为其分配一个网段。但此时，docker-compose配置里便不能手动指定`ipv4_address`了。

## 编写配置文件

为了搭建redis集群，我们需要运行6个redis服务端容器，组成一个最简单的3主3从的集群结构。我们需要自定义redis的配置（服务端口及映射ip）、持久化数据。因此，你需要在“合适的地方”新建一个文件夹，用于容器运行时候的
挂载目录。

此次搭建我在centOS的家目录下新建了`redis-cluster`目录，作为容器运行的工作目录，目录结构如下：

```shell
|-- redis-cluster
    |-- docker-compose.yml  
    |-- redis-cluster.tmp   # redis集群配置文件模板
    |-- redis-6379             #节点1
        |-- conf                    # 配置文件目录         
            |-- redis.conf       # 配置文件
        |--data                     # redis数据目录
    |-- .... 以下省略...
```

redis节点主要配置如下信息：

- port：节点端口；
- requirepass：添加访问认证；
- masterauth：如果主节点开启了访问认证，从节点访问主节点需要认证；
- protected-mode：保护模式，默认值 yes，即开启。开启保护模式以后，需配置 bind ip 或者设置访问密码；关闭保护模式，外部网络可以直接访问；
- daemonize：是否以守护线程的方式启动（后台启动），默认 no；
- appendonly：是否开启 AOF 持久化模式，默认 no；
- cluster-enabled：是否开启集群模式，默认 no；
- cluster-config-file：集群节点信息文件；
- cluster-node-timeout：集群节点连接超时时间；
- cluster-announce-ip：集群节点 IP，填写宿主机的 IP（通过ifconfig获得），用于宿主机访问redis容器；
- cluster-announce-port：集群节点映射端口；
- cluster-announce-bus-port：集群节点总线端口，redis集群节点端口+10000。

可以使用shell命令快速创建节点的配置文件及目录结构，为此，我们需要一个redis.conf的模板文件`redis-cluster.tmp`，内容如下：

```conf
port ${PORT}
cluster-enabled yes
cluster-config-file node-${PORT}.conf
cluster-node-timeout 5000
appendonly yes
daemonize no
protected-mode no
requirepass 123456
masterauth 123456
pidfile /var/run/redis-${PORT}.pid
cluster-announce-ip 10.211.55.3
cluster-announce-port ${PORT}
cluster-announce-bus-port 1${PORT}
```

随即可以通过shell命令，快速创建上述目录结构及配置文件(当前工作目录为redis-cluster)：

```shell
for port in `seq 6379 6384`; do \
  mkdir -p redis-${port}/conf \
  && PORT=${port} envsubst < redis-cluster.tmp> redis-${port}/conf/redis.conf \
  && mkdir -p redis-${port}/data;\
done
```

## 编写docker-compose脚本

使用`docker-compose`脚本是YAML风格，可以替代`docker run`命令，通过配置文件之间启动容器，并且可以更加直观、不易出错地配置容器使用的镜像、网络等内容。

本次搭建的`docker-compose.yml`脚本内容如下：

```yaml
version: "3.7"

x-image:
   &default-image
        redis:7.0.4

networks:
  redis-net:
    name: redis-net

services:
  redis-6379:
    image: *default-image
    container_name: redis-6379
    volumes:
      - ./redis-6379/conf/redis.conf:/usr/local/etc/redis/redis.conf
      - ./redis-6379/data:/data
    ports:
      - 6379:6379
      - 16379:16379
    command:
      redis-server /usr/local/etc/redis/redis.conf
    networks:
      redis-net:
         ipv4_address: 192.168.10.9

  redis-6380:
    image: *default-image
    container_name: redis-6380
    volumes:
      - ./redis-6380/conf/redis.conf:/usr/local/etc/redis/redis.conf
      - ./redis-6380/data:/data
    ports:
      - 6380:6380
      - 16380:16380
    command:
      redis-server /usr/local/etc/redis/redis.conf
    networks:
      redis-net:
        ipv4_address: 192.168.10.10

  redis-6381:
    image: *default-image
    container_name: redis-6381
    volumes:
      - ./redis-6381/conf/redis.conf:/usr/local/etc/redis/redis.conf
      - ./redis-6381/data:/data
    ports:
      - 6381:6381
      - 16381:16381
    command:
      redis-server /usr/local/etc/redis/redis.conf
    networks:
      redis-net:
        ipv4_address: 192.168.10.11

  redis-6382:
    image: *default-image
    container_name: redis-6382
    volumes:
      - ./redis-6382/conf/redis.conf:/usr/local/etc/redis/redis.conf
      - ./redis-6382/data:/data
    ports:
      - 6382:6382
      - 16382:16382
    command:
      redis-server /usr/local/etc/redis/redis.conf
    networks:
      redis-net:
        ipv4_address: 192.168.10.12

  redis-6383:
    image: *default-image
    container_name: redis-6383
    volumes:
      - ./redis-6383/conf/redis.conf:/usr/local/etc/redis/redis.conf
      - ./redis-6383/data:/data
    ports:
      - 6383:6383
      - 16383:16383
    command:
      redis-server /usr/local/etc/redis/redis.conf
    networks:
          redis-net:
            ipv4_address: 192.168.10.13

  redis-6384:
    image: *default-image
    container_name: redis-6384
    volumes:
      - ./redis-6384/conf/redis.conf:/usr/local/etc/redis/redis.conf
      - ./redis-6384/data:/data
    ports:
      - 6384:6384
      - 16384:16384
    command:
      redis-server /usr/local/etc/redis/redis.conf
    networks:
      redis-net:
        ipv4_address: 192.168.10.16
```

## 运行脚本并创建集群

以上工作完成之后，便可以通过`docker-compose`运行容器。

```shell
docker-compose up -d
```

`-d`参数指示后台运行。

若脚本运行无误，即可看到docker已经成功运行6个redis容器，但是此时集群还没有搭建起来。

可以通过`docker container ls`查看正在运行的容器。

可以通过`docker network inspect redis-net`查看在文章开头创建的网络信息：

```shell
[xx@centOS8 ~]$ docker network inspect redis-net
[
    {
        "Name": "redis-net",
        "Id": "0a1f6b466e5af068f42f64968ba39b0b6bf08df972b913d1f7060128b015c10f",
        "Created": "2022-08-26T09:51:21.510880934+08:00",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": {},
            "Config": [
                {
                    "Subnet": "192.168.10.0/24",
                    "Gateway": "192.168.10.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": false,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "1c89a8b2e1eaf33f4664873b726bdbfce3ebdc9ae4bbdb3e3326db8f3501f57e": {
                "Name": "redis-6383",
                "EndpointID": "3f4ad0bec008b14f6799bb341651f18846f5ae468d80296c265424f708079f32",
                "MacAddress": "02:42:c0:a8:0a:0d",
                "IPv4Address": "192.168.10.13/24",
                "IPv6Address": ""
            },
            "2a259630bb33d10b274d4ab1a1f50850c445bb299dbbbde55710ae59bc578f68": {
                "Name": "redis-6379",
                "EndpointID": "2f57c1a336d8a08606eb9f0d1077da2cdc8e6744a147040b840c78a42ebdc2a3",
                "MacAddress": "02:42:c0:a8:0a:09",
                "IPv4Address": "192.168.10.9/24",
                "IPv6Address": ""
            },
            "7ace535271e764554e08c4528a713657002c543f30f183454410f7d4b9e92d9d": {
                "Name": "redis-6381",
                "EndpointID": "89507334eef9eb9a907b6f5edeca8aee01fcace9982dc41a1e620c8c0d41113c",
                "MacAddress": "02:42:c0:a8:0a:0b",
                "IPv4Address": "192.168.10.11/24",
                "IPv6Address": ""
            },
            "a0f6dc1fe2520f43ad3babdac39b782be7b277bc368138d65593e2bf3a04214c": {
                "Name": "redis-6380",
                "EndpointID": "1b0320a540085673eebda450036d386e50eb168d7221e09471bed1074fb685d2",
                "MacAddress": "02:42:c0:a8:0a:0a",
                "IPv4Address": "192.168.10.10/24",
                "IPv6Address": ""
            },
            "a2308807a6502efce0a3e316df5c1a261e529b81613d29ef52a045e17eb87b13": {
                "Name": "redis-6384",
                "EndpointID": "fab8518518d19e2308eaa309aef8665e708ffa0e37a2e5ba9200a620b04e7108",
                "MacAddress": "02:42:c0:a8:0a:10",
                "IPv4Address": "192.168.10.16/24",
                "IPv6Address": ""
            },
            "a42b71abb59b5267dcf77bf592afbe2fefa89191348a796b9b44e08fdf239a49": {
                "Name": "redis-6382",
                "EndpointID": "15755c329085da197f7afc5c5e0fbe8ecd1e9cd8fabc83fd3918d82653f7112b",
                "MacAddress": "02:42:c0:a8:0a:0c",
                "IPv4Address": "192.168.10.12/24",
                "IPv6Address": ""
            }
        },
        "Options": {},
        "Labels": {}
    }
]
```

可以看到，返回的`container`域列出了刚才运行脚本所创建的容器的详细信息。说明，docker-compose的网络配置生效了。

剩下来的工作就是创建集群了。

运行命令`docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6380 -p 6380 -a 123456`来查看redis以及集群的状态：

```shell
[xx@centOS8 ~]$ docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6380 -p 6380 -a 123456 set foo bar
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
(error) CLUSTERDOWN Hash slot not served
[xx@centOS8 ~]$
```

上述命令说明几点信息：

1. 通过6379实例连接6380实例成功，说明基于之前的网络配置，redis容器之间可以通过容器名相互连接（当然，也可以使用配置的ip地址）；
2. `set foo bar`命令失败，错误信息显示，集群的槽并没有分配成功

更直观地，可以通过`docker exec -it redis-6379 /usr/local/bin/redis-cli -a 123456 --cluster check redis-6379:6379`检查集群信息：

```shell
[xx@CentOS8 ~]$ docker exec -it redis-6379 /usr/local/bin/redis-cli -a 123456 --cluster check redis-6379:6379
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
redis-6379:6379 (6466d336...) -> 0 keys | 0 slots | 0 slaves.
[OK] 0 keys in 1 masters.
0.00 keys per slot on average.
>>> Performing Cluster Check (using node redis-6379:6379)
M: 6466d33686f7c629d70d19ad31fe5d77ec3a6879 redis-6379:6379
   slots: (0 slots) master
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[ERR] Not all 16384 slots are covered by nodes.
```

说明，集群确实还没成功搭建。

接下来，我们通过`redis-cli --cluster create`命令创建集群。

使用`docker exec -it redis-6379 bash`进入6379节点，其中，`redis-6379`可以替换成本次搭建中任何其他节点。

执行命令：

```shell
redis-cli -a 123456 --cluster create \
192.168.10.9:6379 192.168.10.10:6380 192.168.10.11:6381 \
192.168.10.12:6382 192.168.10.13:6383 192.168.10.14:6384 \
--cluster-replicas 1
```

其中指明了6个节点，并且`--cluster-replicas 1`说明为一主一从的结构，6个节点构成了3主3从的集群架构。

上述命令将产生如下输出：

```shell
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
>>> Performing hash slots allocation on 6 nodes...
Master[0] -> Slots 0 - 5460
Master[1] -> Slots 5461 - 10922
Master[2] -> Slots 10923 - 16383
Adding replica 192.168.10.12:6382 to 192.168.10.9:6379
Adding replica 192.168.10.13:6383 to 192.168.10.10:6380
Adding replica 192.168.10.14:6384 to 192.168.10.11:6381
M: 6466d33686f7c629d70d19ad31fe5d77ec3a6879 192.168.10.9:6379
   slots:[0-5460] (5461 slots) master
M: f8bc3dcb0ea4a93733d16c18eba7a92cee8d4a8f 192.168.10.10:6380
   slots:[5461-10922] (5462 slots) master
M: 0321e838b8b9a179612d2c3fa21ff544723598b6 192.168.10.11:6381
   slots:[10923-16383] (5461 slots) master
S: 5ec421c294038ff745c0b637bbe426d182ad32cc 192.168.10.12:6382
   replicates 6466d33686f7c629d70d19ad31fe5d77ec3a6879
S: 84fbb314009f34ad8a1a2ca19746dc31866d009f 192.168.10.13:6383
   replicates f8bc3dcb0ea4a93733d16c18eba7a92cee8d4a8f
S: c124a8eaafd919015ab618edf8441a7b925d8a2f 192.168.10.14:6384
   replicates 0321e838b8b9a179612d2c3fa21ff544723598b6
Can I set the above configuration? (type 'yes' to accept): yes
>>> Nodes configuration updated
>>> Assign a different config epoch to each node
>>> Sending CLUSTER MEET messages to join the cluster
Waiting for the cluster to join
..
>>> Performing Cluster Check (using node 192.168.10.9:6379)
M: 6466d33686f7c629d70d19ad31fe5d77ec3a6879 192.168.10.9:6379
   slots:[0-5460] (5461 slots) master
   1 additional replica(s)
S: c124a8eaafd919015ab618edf8441a7b925d8a2f 10.211.55.3:6384
   slots: (0 slots) slave
   replicates 0321e838b8b9a179612d2c3fa21ff544723598b6
M: 0321e838b8b9a179612d2c3fa21ff544723598b6 10.211.55.3:6381
   slots:[10923-16383] (5461 slots) master
   1 additional replica(s)
S: 84fbb314009f34ad8a1a2ca19746dc31866d009f 10.211.55.3:6383
   slots: (0 slots) slave
   replicates f8bc3dcb0ea4a93733d16c18eba7a92cee8d4a8f
S: 5ec421c294038ff745c0b637bbe426d182ad32cc 10.211.55.3:6382
   slots: (0 slots) slave
   replicates 6466d33686f7c629d70d19ad31fe5d77ec3a6879
M: f8bc3dcb0ea4a93733d16c18eba7a92cee8d4a8f 10.211.55.3:6380
   slots:[5461-10922] (5462 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

从上述输出可以看到，6379、6380、6381为3个主节点，6382、6383、6384分别设置为它们的从节点。

集群的16384个槽被分配到6379、6380和6381三个主节点上。

至此，集群的搭建工作大抵完成了，还需要做一些验证工作。

## 验证集群可用性

运行`docker exec -it redis-6379 /usr/local/bin/redis-cli --cluster check redis-6379:6379 -a 123456`查看集群信息：

```shell
[xx@CentOS8 ~]$ docker exec -it redis-6379 /usr/local/bin/redis-cli --cluster check redis-6379:6379 -a 123456
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
redis-6379:6379 (6466d336...) -> 0 keys | 5461 slots | 1 slaves.
10.211.55.3:6381 (0321e838...) -> 0 keys | 5461 slots | 1 slaves.
10.211.55.3:6380 (f8bc3dcb...) -> 0 keys | 5462 slots | 1 slaves.
```

> 10.211.55.3 为宿主机ip。

运行`docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6379 -p 6379 -a 123456 cluster nodes`查看集群节点信息：

```shell
[xx@CentOS8 ~]$ docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6379 -p 6379 -a 123456 cluster nodes
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
6466d33686f7c629d70d19ad31fe5d77ec3a6879 10.211.55.3:6379@16379 myself,master - 0 1661484250000 1 connected 0-5460
c124a8eaafd919015ab618edf8441a7b925d8a2f 10.211.55.3:6384@16384 slave 0321e838b8b9a179612d2c3fa21ff544723598b6 0 1661484248833 3 connected
0321e838b8b9a179612d2c3fa21ff544723598b6 10.211.55.3:6381@16381 master - 0 1661484250857 3 connected 10923-16383
84fbb314009f34ad8a1a2ca19746dc31866d009f 10.211.55.3:6383@16383 slave f8bc3dcb0ea4a93733d16c18eba7a92cee8d4a8f 0 1661484250353 2 connected
5ec421c294038ff745c0b637bbe426d182ad32cc 10.211.55.3:6382@16382 slave 6466d33686f7c629d70d19ad31fe5d77ec3a6879 0 1661484249341 1 connected
f8bc3dcb0ea4a93733d16c18eba7a92cee8d4a8f 10.211.55.3:6380@16380 master - 0 1661484249000 2 connected 5461-10922
```

分别运行

`docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6379 -p 6379 -a 123456 info replication`

和

`docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6382 -p 6382 -a 123456 info replication`

查看单个节点的信息：

```shell
[xx@CentOS8 ~]$ docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6379 -p 6379 -a 123456 info replication
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
# Replication
role:master
connected_slaves:1
slave0:ip=192.168.10.1,port=6382,state=online,offset=2520,lag=1
master_failover_state:no-failover
master_replid:75b44c0a227fa29a6faf0be53aba63a47e615fa0
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:2534
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:2534
[xx@CentOS8 ~]$ docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6382 -p 6382 -a 123456 info replication
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
# Replication
role:slave
master_host:10.211.55.3
master_port:6379
master_link_status:up
master_last_io_seconds_ago:7
master_sync_in_progress:0
slave_read_repl_offset:2814
slave_repl_offset:2814
slave_priority:100
slave_read_only:1
replica_announced:1
connected_slaves:0
master_failover_state:no-failover
master_replid:75b44c0a227fa29a6faf0be53aba63a47e615fa0
master_replid2:0000000000000000000000000000000000000000
master_repl_offset:2814
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:2814
```

接下来，进入某个节点，进行一些简单的读写操作，

```shell
[xx@CentOS8 ~]$ docker exec -it redis-6382 bash
root@e7c5c96e43c3:/data# redis-cli -c -p 6382 -a 123456
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
127.0.0.1:6382> setex foo 1000 bar
-> Redirected to slot [12182] located at 10.211.55.3:6381
OK
10.211.55.3:6381> setex hello 1000 redis
-> Redirected to slot [866] located at 10.211.55.3:6379
OK
10.211.55.3:6379> set hey 1000 you
-> Redirected to slot [10667] located at 10.211.55.3:6380
(error) ERR syntax error
10.211.55.3:6380> setex hey 1000 you
OK
10.211.55.3:6380> get foo
-> Redirected to slot [12182] located at 10.211.55.3:6381
"bar"
10.211.55.3:6381> ttl foo
(integer) 938
10.211.55.3:6381> keys *
1) "foo"
10.211.55.3:6381> get hello
-> Redirected to slot [866] located at 10.211.55.3:6379
"redis"
10.211.55.3:6379> keys *
1) "hello"
10.211.55.3:6379>
```

> 提示：`redis-cli -c`中`-c`参数指示使用集群模式，上述交互日志可以看出，集群基本上是可用的。

接下来，我们模拟一个主节点下线，看看集群是否能够作出响应。前面说过，6379-->6382、6380-->6383、6381-->6384分别为3对主从节点，此时强制停止6380节点：

`docker container stop redis-6380`

接下来，使用`docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6379 -p 6379 -a 123456 cluster nodes`查看节点信息：

```shell
[xx@CentOS8 ~]$ docker exec -it redis-6379 /usr/local/bin/redis-cli -c -h redis-6379 -p 6379 -a 123456 cluster nodes
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
6466d33686f7c629d70d19ad31fe5d77ec3a6879 10.211.55.3:6379@16379 myself,master - 0 1661486336000 1 connected 0-5460
c124a8eaafd919015ab618edf8441a7b925d8a2f 10.211.55.3:6384@16384 slave 0321e838b8b9a179612d2c3fa21ff544723598b6 0 1661486336865 3 connected
0321e838b8b9a179612d2c3fa21ff544723598b6 10.211.55.3:6381@16381 master - 0 1661486335556 3 connected 10923-16383
84fbb314009f34ad8a1a2ca19746dc31866d009f 10.211.55.3:6383@16383 master - 0 1661486335556 7 connected 5461-10922
5ec421c294038ff745c0b637bbe426d182ad32cc 10.211.55.3:6382@16382 slave 6466d33686f7c629d70d19ad31fe5d77ec3a6879 0 1661486336000 1 connected
f8bc3dcb0ea4a93733d16c18eba7a92cee8d4a8f 10.211.55.3:6380@16380 master,fail - 1661486269058 1661486267032 2 disconnected
```

可以看到，6380节点的状态为`fail`，并且，其从节点6383升级为主节点了，集群状态正常。

```shell
[parallels@CentOS8 redis-cluster]$ docker exec -it redis-6382 bash
root@e7c5c96e43c3:/data# redis-cli -c -h redis-6383 -p 6383 -a 123456
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
redis-6383:6383> info replication
# Replication
role:master
connected_slaves:0
master_failover_state:no-failover
master_replid:7c94538adb23f4c95ea6085af34ca40a6c20ca00
master_replid2:b6f2d9ac88cd6b4cdb097464ec271a1b96647ed2
master_repl_offset:5328
second_repl_offset:5329
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:5328
redis-6383:6383> keys *
(empty array)
redis-6383:6383>
```


##  windows WSL主从同步失败的处理办法

在windosw上，按照上文思路搭建redis集群的过程中，可能会遇到主从节点同步失败的错误，具体错误信息为：

```shell
Failed trying to load the MASTER synchronization DB from disk: No such file or directory
```

在这之前，通过`docker-compose`启动容器的过程中，还可以看到一句警告信息：

```shell
WARNING overcommit_memory is set to 0! Background save may fail under low memory condition. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.
```

先处理这个警告。由于windows下docker使用WSL，所以这个配置和WSL有关，在`C:\Users\<username>`下创建`.wslconfig`文件，写入以下内容：

```conf
[wsl2]
kernelCommandLine = "sysctl.vm.overcommit_memory=1"
```

然后重启wsl和docker：

```shell
wsl --shtdown
```

此时，docker的启动警告应该消失了。

接着，在所有节点的配置文件中，增加一行配置：

```conf
repl-diskless-load on-empty-db  # Use diskless load only when it is completely safe.
```

此时重新启动所有节点，即可。

---

本文完


## 参考

- [使用Docker部署Redis集群-三主三从](https://jasonkayzk.github.io/2020/01/17/%E4%BD%BF%E7%94%A8Docker%E9%83%A8%E7%BD%B2Redis%E9%9B%86%E7%BE%A4-%E4%B8%89%E4%B8%BB%E4%B8%89%E4%BB%8E/)
- [docker安装redis cluster集群](https://blog.csdn.net/damishidai15/article/details/108976378)
- [Docker实战-部署「Redis集群」](https://cloud.tencent.com/developer/article/1924693)
- [bitnami/redis-cluster](https://hub.docker.com/r/bitnami/redis-cluster)
- [处理windows WSL主从同步失败](https://www.cnblogs.com/emmith/p/16466809.html)

