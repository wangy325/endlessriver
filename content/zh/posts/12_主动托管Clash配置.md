---
title: "主动管理Clash的代理配置"
date: 2024-06-15
author: wangy325
categories: [utility]
tags: [Integration]
enableGitInfo: true
# weight: 15
---

自己搭建了这么多年的shadowsocks服务，经历了2次续年费后服务器ip被加黑名单之后，算是彻底放弃了（心痛100刀😭），说的就是帮瓦工。vultr的服务器虽然稳定，但是延迟比较高，糟糕的时候甚至连油管的高清视频都卡顿，不过大部分时间都是轻度搜索场景，也就还能使用。那时候也知道“机场”的概念，不过自己搭的服务用着放心么不是，机场随时跑路的，就一直没用。而且vultr的服务器，5刀/月，价格也在可接受的范围内。

<!--more-->

不过浸淫了那么久，发现机场的速度和稳定性确实要好过自建服务。

1. 一来稳定的机场每天都有维护，自建的服务半年都不见得上去看一眼；
2. 二来身边有用机场的人，机场经过了时间的检验，可靠性有保证了；
3. 三来如果不是定制化或者要求非常高，机场的价格比自建服务器便宜。

综上，还是转用机场吧，别再自己折腾了。

以上为引。

---

机场购买套餐后，一般会提供订阅链接，clash可以直接托管配置，用起来相当方便。不过机场提供的订阅使用起来，还有如下缺点：

1. 机场提供的订阅配置一般都是一大坨，不同机场的配置也有较大差异，在切换配置文件后，往往需要调整规则，或者需要测速后手动选择低延迟的节点
2. 不能自定义，部分机场缺乏对某些地址的分流规则，可能需要手动添加，但是，机场的托管配置更新之后会覆盖用户添加的内容
3. 机场有些“凑数”节点，不好用也基本上用不到，但是在选择节点总是展示，不够有条理

实际上，只要稍微使用一段时间的clash，这些问题都不难发现。如果能够自己写规则，并管理机场提供的节点的话，以上问题都能解决。

### clash配置文件的结构

- “head” 头部配置，主要是代理端口，模式，日志级别等基础配置
- proxy-providers 核心配置，代理集，用来管理机场的节点
- proxy-groups 核心配置，代理组，用来管理分流
- proxies 核心配置，上述两个配置好之后，可以不配置此项，机场订阅链接一般配置此项
- rule-providers 核心配置，用来订阅分流规则
- rules 核心配置，控制分流规则，机场订阅仅用此来分流

说起来也很简单，主要是2部分核心配置

- proxy 即指代服务节点
- rule 即指代分流规则，即哪个网站走哪个节点

自定义的话，只需要配置`proxy-providers`、`proxy-groups`、`rule-providers`和`rules`配置就行了，至于头部配置，随便抄一个就行了：

```yaml
port: 7890
socks-port: 7891
redir-port: 7892
mixed-port: 7893
allow-lan: false
mode: rule
log-level: warn
external-controller: '127.0.0.1:9090'
```

####  proxy-providers

这是核心配置，用来管理（多个）机场的订阅，并且可以将节点分类到不同的订阅组。以下是配置示例：

```yaml
proxy-providers:
  ChinaG-tw:
    type: http #类型，使用http从订阅地址拉取配置
    path: ./proxyset/ChinaG.yaml    # 拉取的配置文件存放地址
    url: "机场提供的订阅地址"
    interval: 1800 # 配置更新间隔 30分钟
    filter: 'TW' # 节点过滤，根据机场提供的名字来，这里过滤含有‘TW’两个字母的节点
    health-check: # 健康检查
      enable: true
      url: http://www.gstatic.com/generate_204  # 健康检查地址
      interval: 300 # 检查间隔 5分钟
    ChinaG-hk:
        type: file # 从本地配置文件读取节点
        path: ./proxyset/ChinaG.yaml # 这里是将上面机场的节点分组，故直接使用上面拉取的配置
        interval: 3600 
        filter: 'HK|SG' # 节点过滤 这里过滤含有'HK'或者'SG'的节点
        health-check:
            enable: true
            url: http://www.gstatic.com/generate_204
            interval: 300
```

以上就是2种不同的配置`proxy-providers`方式。

有时候，机场提供的订阅地址可能无法顺利拉取下来，这时候可能需要一点特殊的处理，一般是对订阅地址进行[urlEncode](https://www.urlencoder.org/)后，通过subconverter拉取。具体过程参照引文2。

#### proxy-groups

`proxy-groups`理解为策略组，也就是单击clash图标后，显示的那些选择节点的配置。这些配置一般机场都会提供，开箱即用的。手撸之后的好处就是，不用忍受不同机场的配置差异，总是一样的选单。

以下是`proxy-groups`配置示例：

```yaml
proxy-groups:
  - name: 🎯境外流量  # 策略组名字
    type: select   # 类型 自动选择
    use: # 使用哪些proxy-providers
      - ChinaG-tw # 上一步配置的代理集名字
      - ChinaG-hk
      - Coffee-hk
    proxies:    # 使用哪些代理
      - DIRECT # clash自带的，直连
      - 🥤亚洲咖啡    # 下面配置的策略组
  - name: 🥤亚洲咖啡
    type: url-test # 自动测速并选择节点
    url: http://www.gstatic.com/generate_204    # 测速地址
    interval: 300   # 测速间隔
    use:
      - Coffee-asia 
```

#### rule-providers

一般机场提供的配置不会配置此项目，而是把所有的ip/域名规则一股脑全塞进`rules`配置里，差一点的，整个配置文件几千行，良心一点的机场，配置文件动辄几万行。虽然功能相同，但是确实看着累人。

`rule-providers`相当于是从互联网拉取分流规则，这些规则有人维护，并且持续更新，这样方便多了。

以下是`rule-providers`配置示例：

```yaml
  YouTube:
    behavior: classical  # 用于yaml结尾的url
    type: http 
    url: https://cdn.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/Providers/Ruleset/YouTube.yaml # 规则地址
    interval: 86400 # 更新间隔 1个月
    path: ./ruleset/YouTube.yaml # 存放地址
  google:
    type: http
    behavior: domain # 用于txt结尾的url
    url: "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/google.txt"
    path: ./ruleset/google.yaml
    interval: 86400
```

拉取下来的实际上是`rules`的子集，这样是方便管理，简化配置。

#### rules

分流规则的核心配置。既然配置了`rule-providers`，那么`rules`的配置自然是要按照上面的配置来。

以下是配置示例:

```yaml
  - DOMAIN-SUFFIX,bing.com,🥤亚洲咖啡  # 自定义规则 bing.com走代理访问国际版
  # 规则集  对应的规则集名字 对应的proxy-groups名字
  - RULE-SET,YouTube,🎬️Youtube  #YouTube规则集里的流量都走🎬️Youtube出
  - RULE-SET,google,🎯境外流量 # google规则集的流量都走🎯境外流量出
  - GEOIP,LAN,DIRECT # 局域网直连
  - GEOIP,CN,DIRECT # 国内ip直连
  - MATCH,🐟漏网之鱼 # 白名单模式 未匹配上的域名走🐟漏网之鱼代理组出
```

以上就是手撸clash配置的全部内容。

### 使用gist实现远程订阅

实际上，这一步并没有什么必要，如果是本地使用的话。不过如果想多端使用，可以使用gist托管配置然后远程订阅。

实现也很简单，创建新的**私密**gist，把配置文件贴上去。点击`raw`查看配置文件，复制地址栏的链接，去掉链接中raw到文件名
中间的字符串，剩下的部分可以直接使用clash订阅。


### 参考

1. [机场规则优化-v2ex](https://cn.v2ex.com/t/964122)
2. [你的订阅地址无法读取？试试这个](https://limbopro.com/archives/subconverter.html#%E4%BD%BF%E7%94%A8%E7%9A%84%E5%88%86%E6%B5%81%E8%A7%84%E5%88%99/%E7%AD%96%E7%95%A5%E5%8F%8A%E8%84%9A%E6%9C%AC%E8%AF%B4%E6%98%8E%EF%BC%88%E5%BF%85%E7%9C%8B%EF%BC%89)
3. [适用于clash的测速地址](https://www.skyqian.com/archives/clash-testlink.html)
4. [clash rules规则集](https://github.com/Loyalsoldier/clash-rules)
5. [clash分流的终极方法](https://jamesdaily.life/rule-proxy-provider)
