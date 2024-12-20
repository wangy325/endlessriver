---
title: "更换macOS下Firefox的浏览器图标"
date: 2024-12-16
author: wangy325
BookToC: false
categories: []
tags: [软件]
---

不知道从哪一个版本开始，MacOS下的Firefox的应用程序图标变的，真的，不能说很丑，只能说很违和，我都不好意思让这个图标留在dock栏。经典火狐图标扁平化的还是不错，但是用一个接近黑色的深蓝色底色，就真的很难评价。

> 话说也很久没有使用Firefox了。

于是想了想，看看能否换回白底或者经典的火狐图标。

<!--more-->

首先感受一下火狐新图标的违和感...

<center>

![img](/img/post/firefox_in_dock.png)

</center>

正确的处理办法是，从网络上找合适的图标，最好是**svg**文件。

> 你可能需要一个Photoshop或者PixelMator Pro这样的软件来处理svg文件。

可以从 https://iconduck.com/icons/253047/firefox-developer-edition 下载你喜欢的图标。

接下来，生成firefox的图标包。

按照 https://firefox-source-docs.mozilla.org/browser/branding/docs/UpdatingMacIcons.html 的引导，我们会使用`svg`原文件**导出**各种规格的png图片文件，就像文中那样，注意导出文件的命名，要遵从`icon_1x1.png`这样的格式：


{{< highlight cmd "12" >}}
mkdir firefox.iconset
mv icon_16x16.png firefox.iconset
mv icon_32x32.png firefox.iconset
mv icon_32x32@2x.png firefox.iconset
mv icon_64x64@2x.png firefox.iconset
mv icon_128x128.png firefox.iconset
mv icon_256x256 firefox.iconset
mv icon_256x256@2x.png firefox.iconset
mv icon_512x512.png firefox.iconset
mv icon_512x512@2x.png firefox.iconset
mv icon_1024x1024@2x.png firefox.iconset
iconutil -c icns firefox.iconset
{{< /highlight >}}


最后执行上面高亮行的命令后会生成一个`firefox.icns`文件，使用`预览`打开文件，可以看到里面实际上整合了不同分辨率的图标，是一个**包**。

到这里工作就做的差不多了。

最后我们只需要替换Firefox安装包里的图标就行了。

- 打开访达，在应用程序里找到Firefox，打开包内容，进入`Resources`文件夹，将上面生成的 `firefox.icns`文件拷贝进去。退出。

    > 文件夹中原本存一个图标包，将其重命名，以免复制的时候将其覆盖。

- 新开一个访达窗口，继续在应用程序里找到Firefox，选中使用`command+I`快捷键或者鼠标右键选择`显示简介`，然后将`firefox.icns`图标拖动到简介窗口的左上角显示原来图标的位置，这时候会显示一个绿色的`+`号，此时松开鼠标即可。

不出意外的话，Firefox的图标就更换成功了。

{{< hint info >}}
 如果选择白底的图标，最后替换后的图标可能会比其他的图标大，这又是另一种的不和谐。我试了一个，是这样的，不过也没多试。

 或许你选择的带底色图标就完美呢。
{{< /hint >}}

附上最后成功的效果图：

<center>

![img](/img/post/ff-old-logo-in-dock.jpg)

</center>



