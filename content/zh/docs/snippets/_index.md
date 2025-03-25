---
title: "Snippets"
weight: 8
date: 2024-06-14
bookFlatSection: true
bookCollapseSection: false
bookComments: false
BookIndex: true
---

这里包含了一些代码片断，里面的内容宽泛，从API demo到语言特性，还有一些日常软件的使用配置等等。

此文档通过Hugo的模板自动生成，源代码在项目的子模块`assets/snippets`里。

Hugo通过源代码生成post的代码是

```go-html
{{ if default false (default .Site.Params.snippets .Params.snippets) }}
    {{ $key := path.Base .TranslationKey }}
    {{ with resources.GetMatch (printf "snippets/*/%s.*" $key) }}
        {{ $lang := path.Ext .Name | strings.TrimLeft "."  }}
        {{ $options := slice "lineNos=inline" "style=lovelace" }}
        {{ transform.Highlight .Content $lang (delimit $options ",") }}
    {{ end }}
{{ end }}
```

References:

- https://discourse.gohugo.io/t/easiest-way-to-embed-code-from-source-files/36662
- https://gohugo.io/methods/site/data/
