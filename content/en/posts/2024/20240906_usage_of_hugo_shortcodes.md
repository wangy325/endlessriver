---
title: "Usage of Hugo Short Codes"
date: 2024-09-06
author: "wangy325"
categories: []
tags: [gossip, hugo]
---

Despiting all hugo internal *shortcodes*, I'v wrote or modified some shortcodes.

This page shows the usage of those shortcodes, especially customized shortcodes.

<!--more-->

### Hint

> A customized shortcode based on  hugo book theme.

There are 3 levels of hint: info warning and danger.  And could be used like this:

```tpl {linenos=false}
{{</* hint info */>}}
This is customized shortcode `hint`, based on theme  [Hugo Book](#hint).
{{</* /hint */>}}
```

Rendered as this:

{{< hint info >}}
This is customized shortcode `hint`, based on theme  [Hugo Book](#hint).
{{< /hint >}}


{{< hint warning >}}
This is warning.

`markdown` is still *working*
{{< /hint >}}


{{< hint danger >}}
Danger Zone. [Link](#hint)
{{< /hint >}}

### Quote

`quote` is **real** quotation. With new font style and text format. `quote` can be used when you quoting some classical literatures. Like:

```tpl {linenos=false}
{{</* quote */>}}
相见欢·林花谢了春红
南唐·李煜
林花谢了春红，太匆匆。无奈朝来寒雨晚来风。
胭脂泪，相留醉，自是人生长恨水长东。
{{</* /quote */>}}
```

Gives this:

{{< quote >}}
相见欢·林花谢了春红
南唐·李煜
林花谢了春红，太匆匆。无奈朝来寒雨晚来风。
胭脂泪，相留醉，自是人生长恨水长东。
{{< /quote >}}


If you want to make title and author placed in middle, use a boolean parameter `true`.

Some ancient China *Ci* has a preface, you can make it font-size smaller than main text, use a `<small>` tag.

```tpl {linenos=false}
{{</* quote true */>}}
摸鱼儿
金·元好问
<small>乙丑岁赴试并州...<p></small>
// ...
{{</* /quote */>}}
```

{{< quote true >}}
摸鱼儿
金·元好问

<small>乙丑岁赴试并州，道逢捕雁者云：“今旦获一雁，杀之矣。其脱网者悲鸣不能去，竟自投于地而死。”予因买得之，葬之汾水之上，垒石为识，号曰“雁丘”。时同行者多为赋诗，予亦有《雁丘词》。旧所作无宫商，今改定之。<p></small>

问世间，情是何物，直教生死相许？天南地北双飞客，老翅几回寒暑。欢乐趣，离别苦，就中更有痴儿女。君应有语：渺万里层云，千山暮雪，只影向谁去？
横汾路，寂寞当年箫鼓，荒烟依旧平楚。招魂楚些何jiē嗟及，山鬼暗啼风雨。天也妒，未信与，莺儿燕子俱黄土。千秋万古，为留待骚人，狂歌痛饮，来访雁丘处。
{{< /quote >}}

Additionally, you can place all contents in middle.

Just one more boolean parameter. (:-

```tpl {linenos=false}
{{</* quote true true */>}}
Sonnet 8
William Shakespeare
Music to hear, why hear'st thou music sadly?
Sweets with sweets war not, joy delights in joy.
长相思，摧心肝。
// ...
{{</* /quote */>}}

```


{{< quote true true >}}
长相思（其一）
唐·李白
长相思，在长安。
络纬秋啼金井阑，微霜凄凄diàn簟色寒。
孤灯不明思欲绝，卷帷望月空长叹。
美人如花隔云端。
上有青冥之长天，下有渌水之波澜。
天长路远魂飞苦，梦魂不到关山难。
长相思，摧心肝。
{{< /quote >}}

{{< update 2024-10-31 >}}
The PinYin Note were handled by quote shortcodes and displayed by css style.
{{< /update >}}

{{< quote true true >}}
Sonnet 8
William Shakespeare
Music to hear, why hear'st thou music sadly?
Sweets with sweets war not, joy delights in joy.
Why lovest thou that which thou receivest not gladly,
Or else receivest with pleasure thine annoy?
If the true concord of well-tuned sounds,
By unions married, do offend thine ear,
They do but sweetly chide thee, who confounds
In singleness the parts that thou shouldst bear.
Mark how one string, sweet husband to another,
Strikes each in each by mutual ordering,
Resembling sire and child and happy mother
Who all in one, one pleasing note do sing:
Whose speechless song, being many, seeming one,
Sings this to thee: 'thou single wilt prove none.'
{{< /quote >}}

### Highlight Code

It's not the syntax highlighting, It's code line highlighting.

{{< hint info >}}
The code syntax highlight should be preset, and enabled by default.

Besides, you can customized them by using hugo to generate a code syntax style sheet:

```shell {{linenos=false}}
hugo gen chromastyles --style=themename > syntax.css
```

Hugo supports [chroma style](https://xyproto.github.io/splash/docs/all.html) code fence themes.

Here is the discussion about syntax highlight: https://discourse.gohugo.io/t/unable-to-customize-the-syntax-highlight-colors/22140/4
{{< /hint >}}


2 ways to achieve that.

First approach is to setting highlight format in code fence, *not recommended*:

```tpl {linenos=false}
  ``` python {linenos=inline,hl_lines=[3, "7-10"],linenostart=1}
  # ...
```

Gives this:

```python {linenos=inline,hl_lines=[3, "7-10"],linenostart=1}
def incr_with_x_threads(x, func, n):
    # 列表推导式
    threads = [Thread(target=func, args=(n,)) for i in range(x)]
    start = time.time()
    global shared_int
    shared_int = 0
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(f"finished in {time.time() - start}\n"
          f"shared expected: {n * x}\n"
          f"shared actual: {shared_int}\n"
          f"difference: {n * x - shared_int}({100 - shared_int / n / x * 100}%)")
```

The way it configs the highlight line numbers is strange[^1]. Isn't it?

[^1]: `hl_lines=[3, "4-6"]`？Why number ahead and string behind(double quoted)?

Second way is recommended: using shortcode `highlight`.

This shortcode accepts 2 params:

- the 1st one specifies the coding language,
- the 2nd param specifies line numbers to be highlighted.

```tpl {linenos=false}
{{</* highlight python "1 5-7" */>}}
def copy_file(target, dest):
    if os.path.exists(target) and os.path.isfile(target):
        if not os.path.exists(dest) or not os.path.isfile(dest):
            df = open(dest, '+xb')
            with open(target, 'rb') as tf:
                while len((buffer := tf.read(1024))) > 0:
                    df.write(buffer)
            df.close()
        else:
            print("dest file exists.")
    else:
        raise FileNotFoundError("target file not found.")
{{</* /highlight */>}}
```

Gives this:

{{< highlight python "1 5-7" >}}
def copy_file(target, dest):
    if os.path.exists(target) and os.path.isfile(target):
        if not os.path.exists(dest) or not os.path.isfile(dest):
            df = open(dest, '+xb')
            with open(target, 'rb') as tf:
                while len((buffer := tf.read(1024))) > 0:
                    df.write(buffer)
            df.close()
        else:
            print("dest file exists.")
    else:
        raise FileNotFoundError("target file not found.")
{{< /highlight >}}

The code comments can also be highlighted.

{{< highlight java "2-4 9 11" >}}
/*
It's been a long day
Without you my friend
And I will tell you all about it when I see you again
We've come a lone way
From where we began
And I will tell you all about it when I see you again
*/
public static void main(String[] args){
    // ...
    System.out.printf("the cost of %s is %.2f", "cola", 1.99f);
}
{{< /highlight>}}

### Highlight Line

Customized a new shortcode named `highline`, which is used to highlight current paragraph.

It's simple to use:

```tpl {{linenos=false}}
{{</* highline */>}}
This line is **highlight**.
{{</* /highline */>}}
```

Gives this:

{{< highline >}}
This line is **highlight**.
{{< /highline >}}

And this line is normal.

### Update Info

A customized shortcode to add update tags to page. Simple to use:

```tpl {{linenos=false}}
{{</* update 2024-09-19 */>}}
This is page update info.
{{</* /update */>}}
```

{{< update 2024-09-19 >}}
This is page update info.
{{< /update >}}


### Audio

There are many ways to play audio on HTML. Here are 2 simple solution(3rd open-source api used).

A simple audio player implemented by [plyr](https://github.com/sampotts/plyr/?tab=readme-ov-file):

```tpl {{linenos=false}}
{{</* audio "/audio/宋冬野-安和桥.mp3"  "安和桥-宋冬野" */>}}
```

{{< audio "/audio/宋冬野-安和桥.mp3"  "安和桥-宋冬野" >}}

Another simple music player implemented by [APlayer](https://github.com/DIYgod/APlayer?tab=readme-ov-file):

`aplayer` shortcode was used as [hugo module](https://gohugo.io/hugo-modules/use-modules/), and it's quite easy to use, just import [the module](https://github.com/Runzelee/aplayer-hugo-module).

{{< hint info >}}
The aplayer shortcode need a `/` before ending, else you need to add another close tag, do not know why.
{{< /hint >}}

```tpl {{ linenos=false}}
{{</* aplayer name="安和桥" artist="宋冬野" url="/audio/宋冬野-安和桥.mp3" cover="/audio/anheqiao.jpg" /*/>}}
```

{{< aplayer name="安和桥" artist="宋冬野" url="/audio/宋冬野-安和桥.mp3" cover="/audio/anheqiao.jpg" />}}
