---
title: "让Infuse从TMDB正确获取元数据"
date: 2024-08-23
author: wangy325
enableGitInfo: true
BookToC: false
categories: [utility]
tags: [闲聊]
---

{{< hint info>}}
对于电影和剧集，早就不是“下完即删”了，对于高质量的电影和剧集，尤其是记录片，会收藏在硬盘里面。特别现在会优先考虑下载高清资源。

这可能会是，捣鼓NAS的一个开始...
{{< /hint>}}

找剧的时候，误打误撞下载了一份DV的4K视频文件，用尽各种软件，播放都是偏（绿）色的。尽管IINA可以通过调整色调让视频颜色看起来正常些（能看），但是始终不满意。由于迅雷下得辛苦，就留着。

>DV = Dolby Vision，即杜比视界，对于不支持杜比视界的设备，播放就会出现偏色。
>
> https://www.demolandia.net/4k-video-test/dolby-vision.html 可以下载DV的4K视频demo，检查你电脑电视是否支持DV。

<!--more-->

近来又回顾这剧下饭，偏色的问题还是困扰。一通搜索，发现了Infuse这个播放器，支持DV软解。使用之后，发现更好的地方——类似于iTunes管理本地音乐一样，可以对本地电影电视作分类管理。这里就需要涉及要一个重要的概念，**元数据**。

> Infuse还可以使用本地元数据（需要自己编辑），这部分后面再作讨论...

Infuse可以通过文件名从[TMDB](https://www.themoviedb.org/)获取元数据。元数据一般包括发布年份，类型，剧情简介，封面海报，演职人员名单等等，对于剧集，还可以拉取分集标题等信息。总体来讲，给人的感觉就像是走进了一个在线影院^_^。

<center style="font-size:.8rem; font-style:italic; color: gray">

![demo](/img/infuse-matadata.png)

Infuse获取元数据之后的展示界面

</center>

开始总是分分钟妙不可言。不过，由于硬盘里的电影格式并不是完全按照可以获取元数据的格式命名，有些剧集，甚至简单到使用数字序号命名单集，这样Infuse自然是无能为力的。要想Infuse从TMDB顺利获取**正确地**元数据，以下是一些必要命名规则：

## 电影

一般地，只需要提供电影名字就可以获取到元数据，不过，由于信息模糊，很有可能获取到错误的元数据。我们可以为每一部电影单独使用一个文件夹，文件夹名字为电影名：

    /Movies/Pulp Fiction (1994)
    > Pulp Fiction (1994).mkv
    > Pulp Fiction (1994).srt
    > Pulp Fiction (1994).jpg
    > Pulp Fiction-fanart.jpg
    > Pulp Fiction.nfo

    /Movies/Inception
    > Inception.avi
    > Inception.srt
    > Inception.jpg
    > Inception-fanart.jpg
    > Inception.xml

为了让Infuse精确地匹配元数据，还可以在档名中包含TMDB 或IMDb ID 号（大括弧中），以便Infuse 找到完全匹配项。 使用`{[原始程式码]-[id]}` ：

    Inception {tmdb-27205}.mkv 
    Inception {imdb-tt1375666}.mkv

不过，最好的方式是下载符合通用命名格式的资源。这个命名格式接下来会介绍。

## 剧集

相比于电影，剧集要稍微麻烦一点。因为剧集有`Season`和`Episode`的概念。

电视剧集可以使用这样的文件结构：

    TV Shows/The Office
    > Season 1
        > Files
    > Season 2
        > Files
    > Season 3
        > Files

对于Season和Episode，在文件名中应该这样处理：

    show-name_s01.e02.mkv
    show-name_s1e2.mkv
    show-name_1x02.mkv
    show-name_se1.ep2.mkv
    show-name-season1.episode2.mkv
    show-name-S01E01.mkv

经过测试，

`The.Long.Season.S01E01.2023.V2.2160p.WEB-DL.H265.DV.DDP2.0-yiiha.mp4`

这样的文件名，可以成功获取元数据。

对于只有一季的剧集（电视或者动画），都可以使用`S01`来标记，以让Infuse获取正确的元数据。

---

[Infuse元數據](https://support.firecore.com/hc/zh-tw/articles/215090947-%E5%85%83%E6%95%B8%E6%93%9A-101)

[电影文件命名的一般性规则](https://www.luxiyue.com/personal/%E4%B8%80%E6%96%87%E6%90%9E%E6%87%82%E7%94%B5%E5%BD%B1%E6%96%87%E4%BB%B6%E5%91%BD%E5%90%8D%E8%A7%84%E5%88%99/)
