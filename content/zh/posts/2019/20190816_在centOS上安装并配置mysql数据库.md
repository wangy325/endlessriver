---
title: "CentOS安装并配置MySQL"
date: 2019-08-16
author: "wangy325"
tags: []
categories: [mysql]
---

文章介绍了在centOS7上安装mysql数据库服务的配置及简单优化过程。在服务器上安装mysql服务网络上能够找到的资源很多了，因此本文没有作详细介绍，本文的重点在于后续的优化配置方面。

<!--more-->

# 安装MySQL

- [在centOS上安装mysql 5.7-juejin](https://juejin.im/post/5c088b066fb9a049d4419985)
- <span id=hook></span>[通过yum命令安装并进行初始化设置-dev.mysql.com](https://dev.mysql.com/doc/refman/5.7/en/linux-installation-yum-repo.html)

# 配置

mysql的配置文件在`/etc/my.cnf`， 只是简单地配置了数据库编码为`utf8`；

```shell
### my.cnf配置内容
# For advice on how to change settings please see
# http://dev.mysql.com/doc/refman/5.7/en/server-configuration-defaults.html
[client]
default-character-set=utf8

[mysql]
default-character-set=utf8

[mysqld]
collation-server = utf8_unicode_ci
collation-server = utf8_bin
collation-server = utf8_general_ci
init-connect='SET NAMES utf8'
character-set-server = utf8
default-storage-engine = INNODB
datadir=/var/lib/mysql
socket=/var/lib/mysql/mysql.sock
```

mysql有默认配置账户以及测试数据库， root账户也会默认分配密码， 安装[指引链接2](#hook)**官方文档**中说明了默认账户密码:

1） 在 `/var/log/mysqld.log`中记录了mysql root账户的默认密码

```shell
[root@simple ~] cat /var/log/mysqld.log | grep -i 'temporary password'
# 2019-10-15T07:08:33.627866Z 1 [Note] A temporary password is generated for
# root@localhost: I6cpDa!wj.6&
```

2） 可以使用`mysql_secure_installation`命令进行初始化设置，程序会询问一些默认设置，包括重置密码，删除匿名账户，禁止root远程登录等等配置

```shell
[root@simple ~] mysql_secure_installation
...
```

> 还可以通过<code>set password</code>或者> <code>mysqladmin</code>修改密码:
> ``` 
> SET PASSWORD FOR 'username'@'scope' = PASSWORD('newpasswd')
> 或者
> mysqladmin -uroot -poldpass password newpass;
>```
> 其他的配置 比如设置数据库时间为服务器时间(默认为UTC时间)<b>并没有成功</b>

# 账户与权限

前已述及，mysql默认配置root账户，并且已经**只能本地登录**(出于安全考虑)，并且不建议使用root账户进行数据库连接；

因此，需要新账户，并且要控制账户权限，防止一些不可预见的错误出现；

同时，账户创建之后需赋予适当的权限；

## 账户

使用以下命令创建账户:

```mysql
create user username@'scope' IDENTIFIED BY 'passwd@';
```
关于账户说明

-  mysql 5.7加入了`validate_password`机制，该机制迫使用户使用[强密码]--至少8位，且至少包含一个大写字母，一个小写字母，一个数字，一个特殊符号；若想关闭此功能，可在`my.cnf`中的[mysqld]栏下配置`validate_password=Off`；

- scope项指定用户可以从哪里登录，一般`localhost`只允许本地(或ssh登录)，`%`允许任意ip位置登录，

## 权限

mysql的权限可以简单介绍为:

|权限|描述|
|:--:|:--:|
|全局权限|privilege for all schemas； 信息保存在mysql.user表中|
| schema权限|privilege for all tables； 信息保存在mysql.db中|
| table权限| privilege for all columns； 信息保存在mysql.tables_priv中|
| column权限|privilege for column；信息保存在mysql.columns_priv中|
| 子程序权限|?|

权限的细致说明以及，各类权限所保存的表，可参考:

1. [MySQL 查看用户授予的权限](https://www.cnblogs.com/kerrycode/p/7423850.html)
2. [Privileges Provided by MySQL](https://dev.mysql.com/doc/refman/5.7/en/privileges-provided.html)
3. [Grant Tables](https://dev.mysql.com/doc/refman/5.7/en/grant-tables.html)

最简单的查看用户权限的方法

```shell
show grants for user;
show grants for user@'localhost';
# 查看root的权限
mysql> show grants for root@'localhost';
+---------------------------------------------------------------------+
| Grants for root@localhost                                           |
+---------------------------------------------------------------------+
| GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION |
| GRANT PROXY ON ''@'' TO 'root'@'localhost' WITH GRANT OPTION        |
+---------------------------------------------------------------------+
2 rows in set (0.00 sec)
```

从上面可以看出，root有[\*.\*的**所有权限**]，至于\*.\*，代表了ALLDB.ALLTABLES-即**所有数据库的所有表**，这是最高权限。

或者，可以通过查询`mysql.user`表来获取权限信息

```sql
select * from mysql.user where user='root'\G;
*************************** 1. row ***************************
                  Host: localhost
                  User: root
           Select_priv: Y
           Insert_priv: Y
           Update_priv: Y
           Delete_priv: Y
# ignore others
```

### 给用户授予权限

假设我们创建了一个用户`test`，并且没有授予任何权限，name，这个用户的权限是这样的；

```shell
mysql> show grants for test;
+---------------------------------------+
| Grants for hc_future@%                |
+---------------------------------------+
| GRANT USAGE ON *.* TO 'hc_future'@'%' |
+---------------------------------------+
1 row in set (0.00 sec)
```

可以看到，实际上`test`并没有任何权限；

```sql
mysql> select * from user where user='test'\G;
*************************** 1. row ***************************
                  Host: %
                  User: hc_future
           Select_priv: N
           Insert_priv: N
           Update_priv: N
           Delete_priv: N
*************************** 1. row ***************************
```

尝试使用该账户对mysql进行任何操作都会得到一个错误信息：

```sql
[42000][1044] Access denied for user 'hc_future'@'%' to database 'test'
```

显然，我们应该给用户授予部分权限，已让其完成操作，mysql使用`grant`来给用户授予权限

若我想给`test`授予全局select，update权限:

```sql
mysql> grant select， update on *.* to test@'%' identified by 'testT123!@#';
Query OK， 0 rows affected， 1 warning (0.00 sec)
mysql> show grants for test;
+------------------------------------------------+
| Grants for test@%                         |
+------------------------------------------------+
| GRANT SELECT， UPDATE ON *.* TO 'test'@'%' |
+------------------------------------------------+
1 row in set (0.00 sec)
mysql> select * from user where user ='test'\G;
*************************** 1. row ***************************
                  Host: %
                  User: hc_future
           Select_priv: Y
           Insert_priv: N
           Update_priv: Y
           Delete_priv: N
           Create_priv: N
           # ignore others
```

**mysql 5.7.28中， 如果grant命令执行的用户没有被创建，会默认创建该用户**

更多关于grant的使用，参考官方文档[GRANT Syntax](https://dev.mysql.com/doc/refman/5.7/en/grant.html)

# 数据备份与导入

主要使用`mysqldump`和`source`来进行数据库的备份和恢复

数据库的备份主要分为结构和数据的备份，备份为`x.sql`形式的文件

从备份的结果来看，

- 备份结构主要生成`create table`语句
- 备份数据生成`insert into`语句

除此之外，备份的范围可从库到表之间多级变化， 总言之， `mysqldump`满足绝大多数备份需求；

需要说明的是，若数据库中有视图，则需要谨慎行事了， 因为视图中存在一些对原数据库表的引用以及对[执行用户的DEFINER](https://www.cnblogs.com/zejin2008/p/4767531.html)， 若恢复的数据库和备份的数据库名字以及用户一致，则不会存在问题，否则可能会出现找不到表的错误

而数据库的恢复则简单了，`source x.sql`即可

更多关于数据库备份恢复的细节，查看: [mysqldump 导入/导出 结构&数据&存储过程&函数&事件&触发器](https://www.cnblogs.com/chevin/p/5683281.html)

# 使用SSL加密连接

在`jdbc`连接数据库的过程中可能会出现这样的警告:

> Establishing SSL connection without server's identity verification is not recommended.
According to MySQL 5.5.45+， 5.6.26+ and 5.7.6+ requirements SSL connection must be
established by default if explicit option isn't set. For compliance with existing applications
not using SSL the verifyServerCertificate property is set to 'false'. You need either to
explicitly disable SSL by setting useSSL=false， or set useSSL=true and provide
truststore for server certificate verification.

有时候，设置`useSSL=true`又会遇到这样的错误:

```java
Caused by: javax.net.ssl.SSLHandshakeException:
sun.security.validator.ValidatorException: PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException:
unable to find valid certification path to requested target
	at sun.security.ssl.Alerts.getSSLException(Alerts.java:192)
	at sun.security.ssl.SSLSocketImpl.fatal(SSLSocketImpl.java:1946)
	at sun.security.ssl.Handshaker.fatalSE(Handshaker.java:316)
	at sun.security.ssl.Handshaker.fatalSE(Handshaker.java:310)
	... 67 more
```

上述错误的大意是没找到ssl证书， 那么问题出在了~~mysql配置~~服务端或者客户端的配置上

由于mysql 5.7以上默认开启了ssl，验证一下

## 查看mysql SSL状态信息

```sql
# 使用root账户登录 mysql -u root -p
# 查看ssl信息
# Server version: 5.7.28 MySQL Community Server (GPL)
mysql> show global variables like '%ssl%';
+---------------+-----------------+
| Variable_name | Value           |
+---------------+-----------------+
| have_openssl  | YES             |
| have_ssl      | YES             |
| ssl_ca        | ca.pem          |
| ssl_capath    |                 |
| ssl_cert      | server-cert.pem |
| ssl_cipher    |                 |
| ssl_crl       |                 |
| ssl_crlpath   |                 |
| ssl_key       | server-key.pem  |
+---------------+-----------------+
9 rows in set (0.00 sec)
#have_ssl = YES， 说明ssl已经启用

#查看当前用户的连接信息
mysql> \s;
--------------
mysql  Ver 14.14 Distrib 5.7.28， for Linux (x86_64) using  EditLine wrapper

Connection id:		157
Current database:
Current user:		root@localhost
SSL:			Not in use
Current pager:		stdout
Using outfile:		''
Using delimiter:	;
Server version:		5.7.28 MySQL Community Server (GPL)
Protocol version:	10
Connection:		Localhost via UNIX socket
Server characterset:	utf8
Db     characterset:	utf8
Client characterset:	utf8
Conn.  characterset:	utf8
UNIX socket:		/var/lib/mysql/mysql.sock
Uptime:			23 hours 21 min 57 sec

Threads: 5  Questions: 10325  Slow queries: 0  Opens: 5061  Flush tables: 1  Open tables: 1543  Queries per second avg: 0.122
--------------

ERROR:
No query specified
#SSL=Not in use 说明没有使用ssl连接
```

结果显示， mysql 5.7.28已经启用了ssl，并且可以不使用ssl登录

根据上面的错误， jdbc连接错误的原因是由于*证书错误*， 做个测试:

```shell
[root@iZbp17pma26sz5vqqwb1v3Z ~]# mysql -u root -p --ssl-ca=
Enter password:
ERROR 2026 (HY000): SSL connection error: SSL_CTX_set_default_verify_paths failed
```
当使用SSL登录而不指定证书的时候我们无法登录

> 如果你的mysql没有开启SSL，当使用`mysql -u root -p --ssl`登录的时候，会得到如下错误:
> `ERROR 2026(HY000): SSL connection error: SSL is required but the server doesn't support it`

## 配置SSL安全连接

那么， mysql的证书在哪里? 可能根据安装方式不同， 配置文件路径不一样， 使用yum源安装mysql时，实际上可以在`var/lib/mysql`里找到mysql的证书文件:

```sh
[root@sample ~]# ll /var/lib/mysql/*.pem
-rw------- 1 mysql mysql 1676 Oct 15 15:08 /var/lib/mysql/ca-key.pem
-rw-r--r-- 1 mysql mysql 1112 Oct 15 15:08 /var/lib/mysql/ca.pem
-rw-r--r-- 1 mysql mysql 1112 Oct 15 15:08 /var/lib/mysql/client-cert.pem
-rw------- 1 mysql mysql 1680 Oct 15 15:08 /var/lib/mysql/client-key.pem
-rw------- 1 mysql mysql 1680 Oct 15 15:08 /var/lib/mysql/private_key.pem
-rw-r--r-- 1 mysql mysql  452 Oct 15 15:08 /var/lib/mysql/public_key.pem
-rw-r--r-- 1 mysql mysql 1112 Oct 15 15:08 /var/lib/mysql/server-cert.pem
-rw------- 1 mysql mysql 1680 Oct 15 15:08 /var/lib/mysql/server-key.pem
```
我们指定证书试试看:

```sh
[root@sample ~]# mysql -u root -p --ssl-ca=/var/lib/mysql/ca.pem
Enter password:
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 161
Server version: 5.7.28 MySQL Community Server (GPL)
```
```sql
mysql> \s;
--------------
mysql  Ver 14.14 Distrib 5.7.28， for Linux (x86_64) using  EditLine wrapper

Connection id:		161
Current database:
Current user:		root@localhost
**SSL:			Cipher in use is ECDHE-RSA-AES128-GCM-SHA256**
Current pager:		stdout
Using outfile:		''
Using delimiter:	;
Server version:		5.7.28 MySQL Community Server (GPL)
Protocol version:	10
Connection:		Localhost via UNIX socket
Server characterset:	utf8
Db     characterset:	utf8
Client characterset:	utf8
Conn.  characterset:	utf8
UNIX socket:		/var/lib/mysql/mysql.sock
Uptime:			1 day 14 min 19 sec

Threads: 3  Questions: 10335  Slow queries: 0  Opens: 5061  Flush tables: 1  Open tables: 1543  Queries per second avg: 0.118
--------------

ERROR:
No query specified
```
可以看到， 连接信息的SSL信息变成了`Cipher in use is ECDHE-RSA-AES128-GCM-SHA256`， 说明mysql可以使用SSL登录

关于mysql ssl证书的生成，参考[creating-ssl-files-using-openssl](https://dev.mysql.com/doc/refman/5.6/en/creating-ssl-files-using-openssl.html)

既然可以指定证书使用SSL， jdbc为什么报错?

`/etc/my.cnf`里没有ssl配置?

如何使用SSL连接，参考[Use Encrypted Connections](https://dev.mysql.com/doc/refman/5.6/en/using-encrypted-connections.html)

在`/etc/my.cnf`中添加

```properties
[mysqld]
ssl-ca=ca.pem
ssl-cert=server-cert.pem
ssl-key=server-key.pem
```

使用`service mysqld restart`重启mysql server， 让后看看服务端ssl配置是否生效:

```sh
[root@sample ~]# service mysqld restart
Redirecting to /bin/systemctl restart mysqld.service
[root@sample ~]# mysql -u root -p --ssl
WARNING: --ssl is deprecated and will be removed in a future version. Use --ssl-mode instead.
Enter password:
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 2
Server version: 5.7.28 MySQL Community Server (GPL)
mysql> \s;
--------------
mysql  Ver 14.14 Distrib 5.7.28， for Linux (x86_64) using  EditLine wrapper

Connection id:		2
Current database:
Current user:		root@localhost
SSL:			Cipher in use is ECDHE-RSA-AES128-GCM-SHA256
Current pager:		stdout
Using outfile:		''
Using delimiter:	;
Server version:		5.7.28 MySQL Community Server (GPL)
Protocol version:	10
Connection:		Localhost via UNIX socket
Server characterset:	utf8
Db     characterset:	utf8
Client characterset:	utf8
Conn.  characterset:	utf8
UNIX socket:		/var/lib/mysql/mysql.sock
Uptime:			12 sec

Threads: 1  Questions: 5  Slow queries: 0  Opens: 105  Flush tables: 1  Open tables: 98  Queries per second avg: 0.416
\--------------
```

看到，我们使用ssl登录mysql，这一次并没有指定证书，而mysql连接成功，说明mysql服务端ssl配置成功了


事实上，做到此步后，jdbc里使用

```xml
jdbc:mysql://47.110.226.247:3306/hcfuture_bundule?useUnicode=true&characterEncoding=UTF-8&zeroDateTimeBehavior=convertToNull&useSSL=true
```
这样的数据库url仍然得到同样的错误；个人认为是由于当客户端设置`useSSL=true`时，同样需要配置客户端的SSL证书信息

如何在客户端使用SSL，可以参考[connector-j-reference-using-ssl](https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-using-ssl.html)

以下内容摘自(https://www.sojpt.com/feedback/5723):

>首先mysql服务端要支持ssl，支持ssl需要以下条件：
>1. 创建ssl证书和密钥--生成ca.pem server-cert.pem client-cert.pem 文件
>mysql提供两种方式
>一种方式用openssl编译的mysql版本可以在启动时生成（参考链接：https://dev.mysql.com/doc/refman/5.7/en/creating-ssl-rsa-files-using-mysql.html）；
>第二种方式用openssl生成（采用的方式），（参考链接：https://dev.mysql.com/doc/refman/5.7/en/creating-ssl-files-using-openssl.html）
>
>
>2. 配置服务器支持（参考链接：https://dev.mysql.com/doc/refman/5.7/en/using-encrypted-connections.html）
>主要时需要在my.cnf中需要添加以下配置，文件路径自行修改；还可以指定某个用户必须使用ssl链接等，详情参考官方的链接
>```
>[mysqld]
>ssl-ca=ca.pem
>ssl-cert=server-cert.pem
>ssl-key=server-key.pem
>require_secure_transport=ON
>```
>
>客户端链接需要以下几个步骤
>1. 需要将服务端的pem证书转换成java支持的JKS证书，得到keystore.jks和truststore.jks：
>参考链接1：（可用）https://biteeniu.github.io/ssl/convert_pem_to_jks/
>参考链接2：（官方但连不上不知道什么原因）https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-using-ssl.html
>2. 修改mysql链接，指定链接方式为ssl
>jdbc:mysql://127.0.0.1:3306/test?useUnicode=true&characterEncoding=utf-8&verifyServerCertificate=true&useSSL=true&requireSSL=true
>3. 加载生成的jks证书和密码到系统属性，要在ActiveRecordPlugin之前
>// keystore.jks和truststore.jks所在的路径，及创建时的密码
>System.setProperty("javax.net.ssl.keyStore"， "path/keystore.jks");
>System.setProperty("javax.net.ssl.keyStorePassword"， "password");
>System.setProperty("javax.net.ssl.trustStore"，"path/truststore.jks");
>System.setProperty("javax.net.ssl.trustStorePassword"， "password");

实在是很繁琐，不过我估计此法是可行的，实际上是配置客户端的certificate，我嫌繁琐并没有尝试

实际上，我在官方文档里看到了此段话:

>By default， Connector/J establishes secure connections with the MySQL servers. Note that MySQL servers 5.7 and 8.0， when compiled with OpenSSL， can automatically generate missing SSL files at startup and configure the SSL connection accordingly.
>
>As long as the server is correctly configured to use SSL， there is no need to configure anything on the Connector/J client to use encrypted connections (the exception is when Connector/J is connecting to very old server versions like 5.6.25 and earlier or 5.7.5 and earlier， in which case the client must set the connection property useSSL=true in order to use encrypted connections). The client can demand SSL to be used by setting the connection property requireSSL=true; the connection then fails if the server is not configured to use SSL. Without requireSSL=true， the connection just falls back to non-encrypted mode if the server is not configured to use SSL.

实际上，此前我们mysql server的SSL已经成功配置，已经验证通过`mysql -u test -p -h your serverip`远程登录mysql后，通过`status`查看连接信息可以看到是通过SSL连接的

结合此段声明， mysql 5.7以后的连接是加密的(需要服务端开启SSL)，故无需费时在客户端进行ssl配置(特殊需求除外)

如果想使用jdbc连接配置SSL， 而不使用编码方式，可以参考[connector-j-reference-configuration-properties](https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-configuration-properties.html)
