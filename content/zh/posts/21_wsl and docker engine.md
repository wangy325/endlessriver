---
title: "Win11 WSL安装并使用docker"
date: 2024-10-31
author: wangy325
BookToC: true
categories: [utility]
tags: [软件]
---

## 安装WSL Ubuntu遇到的错误

安装过程很简单，在*microsoft store*里直接安装，这里选择的版本是`22.04.5 LTS`，安装完成后，Windows Terminal会自动添加配置终端配置，直接打开即可。

不过，首次安装，很可能会遇到一些问题...

### error 0x8007019e

该错误代码原因：未安装子系统支持。

管理员打开命令行，运行如下命令：

```cmd
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
```

按照提示，重启电脑。

### error 0x800701bc

该错误代码原因：没有升级对应wsl2的内核。

下载插件([wsl_update_x64.msi](https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi))，安装后即可成功。

### error 0x80370102

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

## WSL启用systemctl

WSL 0.67.6+之后，支持systemctl了。

首先运行`wsl -version`检查电脑所使用的WSL版本：

```
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


## 配置ubuntu镜像源

## WSL安装docker engine

{{< hint info >}}
既然使用WSL了，就不要在Win上安装docker desktop了吧。
{{< /hint >}}

按照[官网教程](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)安装docker engine。

### docker daemon 无法启动

安装完成后，运行`docker run hello-world`出现错误提示：

```
docker: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. 
Is the docker daemon running?.
See 'docker run --help'.
```

>~~WSL 无法使用`systemctl`命令~~。
>
>WSL 0.67.6+ 版本才能启用 systemd。参考：https://learn.microsoft.com/zh-cn/windows/wsl/wsl-config

发现docker服务并没有启动。使用`service docker start`尝试启动服务，再次运行还是失败。使用`cat var/log/docker.log`查看docker日志:

```
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

WSL配置完代理之后，执行`docker search mysql`依然报错：

```
root@pc-wangy:~# docker search mysql
Error response from daemon: Get "https://index.docker.io/v1/search?q=mysql&n=25": dial tcp 192.133.77.59:443: i/o timeout
```




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