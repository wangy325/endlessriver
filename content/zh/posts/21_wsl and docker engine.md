---
title: "Win11 WSL安装并使用docker"
date: 2024-10-31
author: wangy325
BookToC: true
categories: [utility]
tags: [软件, WSL, Docker]
---

## 安装WSL Ubuntu遇到的错误

安装过程很简单，在*microsoft store*里直接安装，这里选择的版本是`22.04.5 LTS`，安装完成后，Windows Terminal会自动添加配置终端配置，直接打开即可。

不过，首次安装，很可能会遇到一些错误代码...

### 1. 0x8007019e

该错误代码原因：未安装子系统支持。

管理员打开命令行，运行如下命令：

```cmd
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
```

按照提示，重启电脑。

### 2. 0x800701bc

该错误代码原因：没有升级对应wsl2的内核。

下载插件([wsl_update_x64.msi](https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi))，安装后即可成功。

### 3. 0x80370102

该错误代码原因：没有开启虚拟化。

在`控制面板`-->`程序和功能` --> `启用或关闭 windows 功能` 中，找到`虚拟机平台`，勾选上安装并重启。

<center style="font-size:.8rem; font-style:italic; color: gray">

![img](/img/post/2024-11-01%20001009.png)

开启Windows的虚拟化功能
</center>

## WSL配置走宿主代理

安装完成WSL后，默认配置下，网络是正常的。在docker拉取镜像的时候，发现连接超时。想到了可能需要走代理。

问题接着就出现了，WSL无法ping通宿主机~

首先需要解决这个问题。

在PowerShell和WSL分别运行`ipconfg`和`ifconfig`命令，查看宿主机和WSL的ip：

<center style="font-size: .8rem; font-style:italic; color:gray">

<img  alt="wsl" src="/img/post/2024-11-01%20013045.png" width="600px"/>

Windows宿主机的网络属性

<img  alt="wsl" src="/img/post/2024-11-01%20013101.png" width="600px"/>

WSL的网络属性
</center>

在宿主机中运行`ping  172.18.32.24`通， 在WSL中运行`ping 172.18.32.1`不通。发现是Win防火墙的配置问题：

使用管理员权限运行PowerShell运行

```cmd
New-NetFirewallRule -DisplayName "WSL" -Direction Inbound  -InterfaceAlias "vEthernet (WSL)"  -Action Allow
```

即可。

接下来，就是让WSL走宿主机代理。

由于WSL的ip和宿主机的ip都是动态的，所以使用`export http-proxy ...`的方式配置`.bashrc`文件，每次ip变化都需要手动再配置一遍，推荐使用脚本获取上述2个ip
，再执行命令配置。方法参考[WSL2 中访问宿主机 Windows 的代理](https://zinglix.xyz/2020/04/18/wsl2-proxy/)。

配置完成后，在WSL中运行`proxy set`即可开启代理。

然后运行`curl www.google.com`测试代理是否正常工作。

{{< hint info >}}
用上述方法设置的代理，可以正常工作。但是会引发2个问题：

1. WSL开机提示（`wsl --update`之后出现）：[wsl: 检测到 localhost 代理配置，但未镜像到 WSL。NAT 模式下的 WSL 不支持 localhost 代理](https://www.cnblogs.com/hg479/p/17869109.html)

    解决这个问题的方式是，换一个WSL的代理方式：即在宿主机的`C:\Users\<username>`下创建一个`.wslconfig`文件，写入如下配置：

        [experimental]
        autoMemoryReclaim=gradual  
        networkingMode=mirrored
        dnsTunneling=true
        firewall=true
        autoProxy=true

    然后关闭WSL再重启。

2. docker代理问题：Handler for GET /v1.47/images/search returned error: Get \"https://index.docker.io/v1/search?q=mysql&n=25\": dial tcp 31.13.69.245:443: connect: connection refused

    docker的问题在WSL的代理问题处理完成之后，docker正确配置代理即可解决了。
{{< /hint >}}

{{< update 2024-11-01 >}}
使用宿主机配置文件的方式配置代理后，在WSL里运行`proxy test`查看代理情况：

```cmd
root@pc-wangy:~# proxy test
Host ip: 10.255.255.254
WSL ip: 192.168.101.49
Current proxy: http://127.0.0.1:7890
```

看到WSL走了宿主机的代理。
有趣的是，此时，WSL无法ping通宿主机WSL的ip，但是可以ping通宿主机的LANip：

```cmd
64 bytes from 192.168.101.49: icmp_seq=43 ttl=64 time=0.060 ms
^C
--- 192.168.101.49 ping statistics ---
43 packets transmitted, 43 received, 0% packet loss, time 43662ms
rtt min/avg/max/mdev = 0.028/0.065/0.178/0.020 ms
root@pc-wangy:~# ping root@pc-wangy:~# proxy test
Host ip: 10.255.255.254
WSL ip: 192.168.101.49
Current proxy: http://127.0.0.1:^C
root@pc-wangy:~# ping 172.29.96.1
PING 172.29.96.1 (172.29.96.1) 56(84) bytes of data.
^C
--- 172.29.96.1 ping statistics ---
4 packets transmitted, 0 received, 100% packet loss, time 3090ms

root@pc-wangy:~# ping 172.18.32.1
PING 172.18.32.1 (172.18.32.1) 56(84) bytes of data.
^C
--- 172.18.32.1 ping statistics ---
5 packets transmitted, 0 received, 100% packet loss, time 4125ms
```

但是并不影响WSL的代理：

```cmd
root@pc-wangy:~# curl www.google.com
<!doctype html><html itemscope="" itemtype="http://schema.org/WebPage" lang="zh-HK">...
```

{{< /update >}}

{{< update 2024-11-02 >}}
> 默认情况下，WSL 使用基于 NAT（网络地址转换）的网络体系结构。

这句话对应按照[WSL2 中访问宿主机 Windows 的代理](https://zinglix.xyz/2020/04/18/wsl2-proxy/)设置代理后启动WSL后的错误。

在NAT模式下，才会要求WSL和宿主机之间互相ping虚拟网络（非127.0.0.1）的IP。

配置宿主机的`.wslconfig`文件，可以使用**镜像网络模式**。启用此功能会将 WSL 更改为全新的网络体系结构，其目标是将 Windows 上的网络接口“镜像”到 Linux 中，以添加新的网络功能并提高兼容性。

以下是启用此模式的当前优势：

- IPv6 支持
- 使用 localhost 地址 127.0.0.1 从 Linux 内部连接到 Windows 服务器。 不支持 IPv6 localhost 地址 ::1
- 改进了 VPN 的网络兼容性
- 多播支持
- 直接从局域网 (LAN) 连接到 WSL

在镜像模式下，WSL就可以直接PING通宿主机的LAN IP了。

 参考：

- 使用 WSL 访问网络应用程序: https://learn.microsoft.com/zh-cn/windows/wsl/networking
- WSL中的高级配置.wslconfig： https://learn.microsoft.com/zh-cn/windows/wsl/wsl-config#configuration-settings-for-wslconfig

{{< /update >}}

## WSL启用systemctl

WSL 0.67.6+之后，支持systemctl了。

首先运行`wsl -version`检查电脑所使用的WSL版本：

```cmd
```cmd
WSL 版本： 2.3.24.0
内核版本： 5.15.153.1-2
WSLg 版本： 1.0.65
MSRDC 版本： 1.2.5620
Direct3D 版本： 1.611.1-81528511
DXCore 版本： 10.0.26100.1-240331-1435.ge-release
Windows 版本： 10.0.22631.4317
```

如果WSL版本过低，使用`wsl --update`更新WSL。

按照[指导](https://devblogs.microsoft.com/commandline/systemd-support-is-now-available-in-wsl/)，配置WSL中的`/etc/wsl.conf`文件后重启WSL即可。

>实际上，高版本的WSL配置文件`/etc/wsl.conf`已经存在了。尽管如此，我的Win11还是运行`wsl --update`之后才正常使用systemctl。


## 配置Ubuntu镜像源

按照经验，Ubuntu一般会选择国内的镜像站点来安装软件。

简单一点，使用[清华大学镜像站](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/)来配置软件仓库。

比较简单，就不详细叙述了。

## WSL安装docker engine

{{< hint info >}}
既然使用WSL了，就不要在Win上安装docker desktop了吧。
{{< /hint >}}

按照[官网教程](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)安装docker engine。

### docker daemon 无法启动

安装完成后，运行`docker run hello-world`出现错误提示：

```shell
```shell
docker: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. 
Is the docker daemon running?.
See 'docker run --help'.
```

>~~WSL 无法使用`systemctl`命令~~。
>
>WSL 0.67.6+ 版本才能启用 systemd。参考：https://learn.microsoft.com/zh-cn/windows/wsl/wsl-config

发现docker服务并没有启动。使用`service docker start`尝试启动服务，再次运行还是失败。使用`cat var/log/docker.log`查看docker日志:

```shell
```shell
level=warning msg="Controller.NewNetwork bridge:" error="failed to add the RETURN rule for DOCKER-USER
IPV6: unable to add return rule in DOCKER-USER chain:
(iptables failed: ip6tables --wait -A DOCKER-USER -j RETURN: ip6tables v1.8.7 (nf_tables):
RULE_APPEND failed (No such file or directory): rule in chain DOCKER-USER\n (exit status 4))
```

这个问题是`iptables`导致的，Ubuntu 20.10之后使用`nftables`，而要使用`nftables`，Linux kernel版本要高于5.8，而WSL使用的版本是5.4。

运行`update-alternatives --config iptables`将WSL使用的iptables版本更换为`iptables-legacy`就可以了。

{{< hint warning >}}
实际上，win11的WSL2 Ubuntu 22.04.5 LTS kernel版本已经是5.10.16了，还是会存在这个问题。win也在~~摆烂~~?
{{< /hint >}}

### 无法拉取镜像

WSL配置完代理之后，执行`docker run hello-world`依然报错：
WSL配置完代理之后，执行`docker run hello-world`依然报错：

```shell
root@pc-wangy:~# docker run hello-world
```shell
root@pc-wangy:~# docker run hello-world
Error response from daemon: Get "https://index.docker.io/v1/search?q=mysql&n=25": dial tcp 192.133.77.59:443: i/o timeout
```

想了想，可能是docker并没有走代理：于是开始配置docker的代理了。

>Docker的代理有2个地方的配置，一个是[daemon的配置](https://docs.docker.com/engine/daemon/proxy/#systemd-unit-file)，也就是本文讨论的内容，另一个是[cli的配置](https://docs.docker.com/engine/cli/proxy/)。

创建docker daemon的配置文件夹及文件：

```shell
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo vim /etc/systemd/system/docker.service.d/http-proxy.conf
```

写入如下配置：

```conf
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:7890"
Environment="HTTPS_PROXY=http://127.0.0.1:7890"
```

接着运行如下命令：

```shell
systemctl daemon-reload
system restart docker
```

> WSL2 已经支持systemctl啦！

接着使用`docker info`检验docker daemon的配置：

{{< highlight shell "11-12" >}}
 Kernel Version: 5.15.153.1-microsoft-standard-WSL2
 Operating System: Ubuntu 22.04.5 LTS
 OSType: linux
 Architecture: x86_64
 CPUs: 8
 Total Memory: 7.76GiB
 Name: pc-wangy
 ID: 124fe023-2684-4e51-87bb-76261f0974c5
 Docker Root Dir: /var/lib/docker
 Debug Mode: false
 HTTP Proxy: http://127.0.0.1:7890
 HTTPS Proxy: http://127.0.0.1:7890
 Experimental: false
 Insecure Registries:
  127.0.0.0/8
 Live Restore Enabled: false
{{< /highlight >}}

这样，docker就可以走代理了。

接下来，运行`docker run hello-world`来验证一下：

```cmd
root@pc-wangy:~# docker run hello-world

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

本文完。
想了想，可能是docker并没有走代理：于是开始配置docker的代理了。

>Docker的代理有2个地方的配置，一个是[daemon的配置](https://docs.docker.com/engine/daemon/proxy/#systemd-unit-file)，也就是本文讨论的内容，另一个是[cli的配置](https://docs.docker.com/engine/cli/proxy/)。

创建docker daemon的配置文件夹及文件：

```shell
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo vim /etc/systemd/system/docker.service.d/http-proxy.conf
```

写入如下配置：

```conf
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:7890"
Environment="HTTPS_PROXY=http://127.0.0.1:7890"
```

接着运行如下命令：

```shell
systemctl daemon-reload
system restart docker
```

> WSL2 已经支持systemctl啦！

接着使用`docker info`检验docker daemon的配置：

{{< highlight shell "11-12" >}}
 Kernel Version: 5.15.153.1-microsoft-standard-WSL2
 Operating System: Ubuntu 22.04.5 LTS
 OSType: linux
 Architecture: x86_64
 CPUs: 8
 Total Memory: 7.76GiB
 Name: pc-wangy
 ID: 124fe023-2684-4e51-87bb-76261f0974c5
 Docker Root Dir: /var/lib/docker
 Debug Mode: false
 HTTP Proxy: http://127.0.0.1:7890
 HTTPS Proxy: http://127.0.0.1:7890
 Experimental: false
 Insecure Registries:
  127.0.0.0/8
 Live Restore Enabled: false
{{< /highlight >}}

这样，docker就可以走代理了。

接下来，运行`docker run hello-world`来验证一下：

```cmd
root@pc-wangy:~# docker run hello-world

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

本文完。

## References

- WSL安装问题：<https://www.jeremyjone.com/933/>
- 清华大学镜像站：<https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/>
- Install docker engine：<https://docs.docker.com/engine/install/ubuntu/>
- Docker daemon not running：<https://patrickwu.space/2021/03/09/wsl-solution-to-native-docker-daemon-not-starting/>
- Docker daemon issue on WSL： <https://askubuntu.com/questions/1402272/cannot-connect-to-the-docker-daemon-when-running-docker-on-ubuntu-wsl>
- WSL2 Ubuntu 21.04原生Docker无法运行的问题： https://www.ichenfu.com/2021/10/23/wsl2-ubuntu-dockerd-iptables-problem/
- WSL2-解决无法ping通主机/配置使用主机代理： https://blog.csdn.net/fur_pikachu/article/details/127973376
- WSL2 中访问宿主机 Windows 的代理：https://zinglix.xyz/2020/04/18/wsl2-proxy/
- WSL使用systemctl：https://learn.microsoft.com/zh-cn/windows/wsl/wsl-config
- NAT模式下的WSL不支持localhost代理？ https://www.cnblogs.com/hg479/p/17869109.html
- Docker daemon proxy configuration： https://docs.docker.com/engine/daemon/proxy/#systemd-unit-file
- Docker CLI proxy configuration：https://docs.docker.com/engine/cli/proxy/
- 使用 WSL 访问网络应用程序: https://learn.microsoft.com/zh-cn/windows/wsl/networking
- WSL中的高级配置.wslconfig： https://learn.microsoft.com/zh-cn/windows/wsl/wsl-config#configuration-settings-for-wslconfig