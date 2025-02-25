---
title: "Hugo自定义TOC模板及滚动监听"
date: 2024-08-20
author: wangy325
enableGitInfo: true
BookToC: true
categories: [utility]
tags: [hugo]
---

{{< hint warning>}}
还挺麻烦的，主要是Hugo的模板语言语法，那是人看的吗？
{{< /hint >}}

一个文章目录，有几个基本要素：

1. 目录锚点，可以点击跳转
2. 目录层级，控制目录的展示

Hugo定义了默认的TOC模板，实现了上面的要素，比较简单：

    {{ .TableOfContents}}

这个模板仅仅能用而已。对于较长的目录，以及多层级的目录都有点无能为力。

如果想要让目录更加灵活，可以自定义TOC，并且实现滚动监听。

<!--more-->

一般Hugo博客的TOC引用在`layouts/_default/baseof.html`里面，不用大改，只需要修改引用模板的部分即可：

```html
    {{ if default false (default .Site.Params.BookToC .Params.BookToC) }}
    <aside class="book-toc" >
      <div class="book-toc-content">
        {{ template "toc" . }} 
      </div>
    </aside>
    ... // 上半部分展示了TOC的html组成，无需修改

    {{ define "toc" }}
        {{ partial "new-toc" . }}
    {{ end }}
    // 下半部分定义了`toc`模板，这是修改过的，默认是`docs/toc`，
    // 指向主题里`layouts/partials/docs/toc.html`
```

所以，如果想自定义TOC，除了自定义模板外，修改`baseof.html`关于模板的引用才可以生效。

>对于不同的Hugo主题，目录结构可能有所差异，还需要修改其它文件夹里如`single.html`文件中对于TOC模板的引用，如果未达到预期效果，可仔细排查一下。本文针对的是`hugo-book`这个主题
>
>当然，其它主题也可能已经支持本文所讨论的内容:-)。

---

## 自定义TOC模板

和上面对应，新的TOC模板应该为`new-toc.html`，位于项目`layouts/partials`目录（⚠️非主题目录）。

模板受到[AC Dustbin-TOC in Hugo](https://allanchain.github.io/blog/post/hugo-toc/)启发[^1]，内容不详细展开，简单阐述几个要点：

[^1]: 博主现已弃坑Hugo。我折腾的时候，也有弃坑的想法:-)

### 目录层级的问题

本博客默认读取到5级标题。可以通篇修改正则表达式中的内容，控制读取到的目录级别。

    `(?s)<h[1-5].*?>.+?</h[1-5]>`

中的1-5表示显示1到5级标题。如果只想显示到4级标题，将5改为4即可。

### 特殊字符的转义问题

读取目录时，Hugo会将特殊字符如`(`、`'`、`"`等进行html转义。

> 此外，Hugo使用`goldmark`来渲染markdown，`goldmark`默认也会对这些特殊字符转义，可以在全局配置里关闭：
>
>```yaml
>   markup:
>     goldmark:
>        extensions:
>          typographer:
>             disable: true
>```
>
>更多信息，参考: https://gohugo.io/getting-started/configuration-markup/#typographer

在解析目录标题的时候，需要将其反转义，已避免出现类似于

    new String(&amp;quot;abc&amp;quot;)

的目录。

Hugo使用`htmlUnescape`来反转义：

    {{- $header := $header | safeHTML  | plainify | htmlUnescape  -}}

### 锚点标签的渲染问题

`baseof.html`里定义的TOC的html结构是：

```html
<aside>
    <div class="book-toc-content">
        {{template}}
    </div>
</aside>
```

模板定义的html结构是：

```html
<div id="toc-new">
    <ul class="nav">
        <li class="nav-item">
            <a id="" href=""></a>
            <ul class="nav">
                <li class="nav-item">
                    <a id="" href=""></a>
                    ...
                </li>
            <ul>
        </li>
    </ul>
</div>
```

模板定义了一个嵌套列表，外围是一个`id`为`toc-new`的`div`。目录内容由一个`a`标签展示。标签里的内容是重点。

{{< hint info>}}
如果想实现滚动监听，为`a`标签添加`id`属性是必须的，这样才有滚动事件触发后找到对应目录的前提。

还有一个前提：

因为滚动的是文章主体，所以页面只能判定当前离页面顶端最近的标题是哪一个，而要通过标题找到TOC里的目录，那么TOC目录里的id要和正文的标题有某种联系（或者由标题属性计算出来）。这是本文的处理思路。
{{< /hint >}}

### 目录的id

上面分析了，目录的`id`应该和正文的标题有所联系。这样方便滚动时定位TOC目录。

```html
{{- $lid := replaceRE `[\(\)-\.\@\?\";= ]`  "" $header  -}}
<a  id="{{ add "t" (trim $lid " ")}}" href="#{{- $cleanedID -}}">
    {{- $header -}}
</a>
```

上面的代码，处理掉了标题中的空格和特殊字符，并且已字符`t`开头，避免id不能已数字开头的问题。

为了后续使用js操作元素的时候方便。

完整的模板代码: https://gist.github.com/wangy325/f7664932443aaf3495bdad610eff80d9。

## TOC样式优化

定义完模板后，目录的基本雏形就已经出来了：

<center style="font-size:.8rem;font-style:italic; color:gray">
<img alt= "" style="width:40%" src= "/img/book-toc.png"/>
<p>使用自定义模板生成的目录</p>
</center>

还需要修改一下css样式。Hugo支持自定义样式，在不影响主题样式的前提下，配置`_custom.scss`即可实现。样式文件放在项目`assets`目录下：

```scss
#toc-new  ul {
    list-style: none;
    padding: 0px;
    margin: 0;
    overflow:hidden;
    white-space:nowrap;
}

#toc-new ul ul {
    padding-inline-start: 1rem;
}

#toc-new ul li {
    margin: .65em 0;
    position: relative;
    text-overflow:ellipsis;
    overflow:hidden;
}
```

基于上述样式的目录为：

<center style="font-size:.8rem;font-style:italic; color:gray">
<img alt= "" style="width:40%" src= "/img/book-toc-styled.png"/>
<p>配置样式后的目录</p>
</center>

上述样式还会将过长的目录以`...`的形式省略，而不会显示横向的滚动条。

完整的样式表: https://gist.github.com/wangy325/3e03a36f679bef6ed0f98a7838108c9f。


## 为TOC添加滚动监听

现在，是时候为TOC添加滚动监听[^2]了。

[^2]: 参考几篇文章，[这篇](https://qzy.im/blog/2020/02/generate-article-catalogs-and-switch-catalog-following-article-s-scroll-using-javascript/#%E7%9B%AE%E5%BD%95%E8%B7%9F%E9%9A%8F%E6%96%87%E7%AB%A0%E5%86%85%E5%AE%B9%E6%BB%9A%E5%8A%A8)用处最大，不过使用了jQuery。

前面说过，模板生成的TOC每个`a`标签的`id`属性由目录内容计算来。这样为了方便滚动时找到对应的TOC目录。

首先，我们需要为页面添加一个滚动监听事件：

```js
window.addEventListener("scroll", () => tocTrack())
```

接着，需要获取文档的所有标题信息，用于标记当前页面的滚动位置：

```js
const listAllHeadings = () => {
  const headlines = document
    .querySelectorAll("article h1, article h2, h3, h4, h5");
  const head = [].slice.apply(headlines).filter(function (item) {
    return item.getAttribute("id") != null
  })
  return head
}
```

上面的代码获取了`article`类（正文）中1-5级标题，并去除了`id`为空的-主要是文档大标题。

当滚动页面时，需要计算出当前页面上最近的标题：

```js
  for (let heading of has) {
    if (heading.offsetTop - document.scrollingElement.scrollTop > 20) {
      break
    }
    currentHeading = heading
  }
```

上述代码的意思是，当前标题距离页面顶部的距离与文档的滚动距离差距在20px的时候，认为这个标题就是当前正在阅读的标题。


获得了当前的标题，就可以获得当前标题对应的目录了：

```js
 let anchorId
  try {
    anchorId = currentHeading.innerText.slice(0, -2)
  } catch (e) {
    // console.log(e)
    return
  }
  let sps = anchorId.replace(/[\(\)-\.\@\"\?;= ]/g, '')  
  anchorId = "t" + sps
```

这里获取`id`的方式，和模板里是一致的。

获取到`id`后，就可以操作DOM元素了：

```js
 var toc_active = document.querySelectorAll(`#toc-new .nav-item #${anchorId}`)
  removeAllOtherActiveClasses()
  Array.from(toc_active, v => v.classList.add("active"))
```

上述代码，移除了其他“激活”的`a`标签，并且给当前正在阅读的`a`标签添加“active”类信息。

{{< hint warning>}}
实际上，应该使用`querySelect()`方法，并使用`Element.classList.add("active")`方法，但是试了不生效，无奈只能使用`querySelectAll()`方法。
{{< /hint>}}

完整的js代码: https://gist.github.com/wangy325/136a81bd4ef350629869bb6ebc6e1fca。

以上，当前浏览的目录就会带上“active”类信息，就可以使用样式操作高亮了。

```scss
#toc-new li  a.active {
    color: #05b;
    background-color: aliceblue;
}
```

## 次级目录隐藏与显示

有了“active”类信息，除了操作高亮，还可以自动显示和隐藏次级目录。这样对于较长目录的文档，可以解决目录垂直滚动的问题：
较少的目录，规避了这个问题。

```scss
// 隐藏次一级目录
#toc-new li > ul {
    display: none;
}
// 展开
// + ~ 兄弟选择器
// :has 父类选择器
#toc-new li > a.active ~ ul {
    display: inherit;
}
#toc-new .nav:has( a.active) {
    display: inherit;
}
```

最后的完成的效果图：

<center style="font-size:.8rem;font-style:italic; color:gray">
<img alt= "" style="width:100%" src= "/img/book-toc-final.gif"/>
<p>完整的TOC效果</p>
</center>
