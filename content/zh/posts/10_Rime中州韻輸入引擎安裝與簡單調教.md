---
title: "Rime中州韻輸入引擎安裝與輸入方案定製指北"
date: 2024-06-06
draft: false
series: [rime]
categories: [utility]
author: "wangy32"
# weight: 11
---

~~由于未知的原因~~<sup>很有可能是配置文件错误</sup>，使用几年多的Rime（squirrel）输入法发生异常。主要表现为小鹤双拼的键位映射异常（如键入‘budv’的候选词是‘病毒’而不是‘不对’。），检查了许久的配置文件，并没有发现明显异常。距离上次配置Rime已许久，很多细节都已经丢失。一番纠结后，决定再重新调试一下Rime，并作此记录。

<!--more-->

## 卸载Rime输入法

为了排除一些不必要的影响，从0开始，首先就要卸载掉Mac（11.7.2）上原本的Rime。卸载的方法也很简单。只是删除几个配置/文件即可：

1. 找到系统偏好设置->键盘->输入法，删除鼠须管

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img alt = '' src="/img/rime/uninstall.png" width="50%" />
<p>
从系统设置中移除鼠须管
</center>

2. 删除配置文件夹
`sudo rm -rf ~/Library/Rime`
3. 删除主应用程序
`sudo rm -rf /Lirary/Input Method/Squirrel.app`

重启电脑。

若遇到Squirrel.app正在使用中，无法删除，则可能需要多次重启电脑。

## 安装Rime输入法

这里没有直接使用〔东风破〕，而是使用brew安装：

`brew install --cast squirrel`

完成后需要重新登入mac。

> 此方式安装的squirrel版本是`0.15.2`，squirrel对MacOS 13以下支持的最高版本是`0.16.2`
>
>如果需要更新squirrel，参考[更新homebrew的安装包](./16_update%20homebrew%20packages.md)

安装完成后的鼠须管没有任何配置，默认使用「朙月拼音」中文输入。

此时的Rime是可用的状态，但是还没有恢复到之前的使用状态。配置文件夹也是空空如也。

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img src="/img/rime/install_config_file.png" width="70%" />
<p>
初始化状态下的squirrel配置文件夹
</center>

## Rime的基本配置文件

这时候就需要使用〔东风破〕来安装配置文件了。

首先需要安装基础配置以及~~基础词汇~~

```bash
git clone --depth 1 https://github.com/rime/plum.git
cd plum
bash rime-install prelude 
bash rime-install essay
bash rime-install luna-pinyin 
```

{{< hint warning >}}
> essay可以不用安装，里面的有些词汇〔很奇怪〕。后续会使用搜狗的词库。
{{< /hint >}}

克隆「东风破」项目到本地，进入项目文件夹。接下来分别安装：

- 基础配置文件
- 预设词汇和语言模型
- 朙月拼音（为了更好的输入体验，小鹤双拼依赖朙月拼音的词库）

接下来安装双拼配置文件：

`bash rime-install double-pinyin`

一直到这里都并没有定制化。

不过，通过〔东风破〕，鼠须管增加了很多默认配置文件，这些配置文件在自定义输入方案的时候，都**不要**去更改。接下来的部分，才是定制化输入法的内容。

## 定制化

### 用户数据同步

编辑Rime配置文件夾下的`installation.yaml`，在文件最后加入以下内容：

`sync_dir: '/absolute/path/you/want/to/sync'`

手动创建`sync`文件夹，重新部署之后，即可同步用户数据。

> 同步文件夾可以在硬盘任何地方，上述只是用作演示。

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img src="/img/rime/sync.png" width="30%" />
<p>
同步鼠须管用户配置
</center>

定制化包括两部分，一是应用程序的配置，二是输入方案的配置。

### 应用程序配置

> 📌Squirrel的配置支持「补丁」的方式，意即不用修改通过「plum」安装的默认配置，而是通过创建新的配置文件，以补丁的方式对其进行个性化设置。这样可以避免对默认配置文件作出修改而导致一系列难以排查的问题。
>
> Squirrel的配置文件通常以`some_config.yaml`命名，如果要定制化，只需要新创建一个`some_config.custom.yaml`配置文件，然后以`patch`为开头，进行配置即可。

`squirrel.yaml`文件主要配置了鼠鬚管輸入法的一些基本配置，如候選詞的排布方向，字体大小，配色方案等等，是最基础的配置。

以下配置片段截取了一些重要的，仅供参考。

```yaml
patch:
  us_keyboard_layout: true      # 鍵盤選項：應用美式鍵盤佈局
# 狀態通知，默認裝有Growl時顯示，也可設爲全開（always）全關（never）
#  show_notifications_when: growl_is_running 
  style/horizontal: true        # 候選窗横向顯示
#  style/inline_preedit: false   # 非內嵌編碼行
#  style/font_face: "儷黑 Pro"    # 我喜歡的字體名稱
  style/font_point: 14          # 字號
#  style/corner_radius: 10       # 窗口圓角半徑
#  style/border_height: 0        # 窗口邊界高度，大於圓角半徑才有效果
#  style/border_width: 0         # 窗口邊界寬度，大於圓角半徑才有效果
  style/label_font_point: 14     # 候选词序号字号 建议和候选词字号一致
  style/comment_font_point: 14   # 候选词的注释字号，建议一样或者小于候选词字号
  style/color_scheme: cheese_blue     # 選擇配色方案
  style/corner_radius: 5        # 候选框圆角半径 
```

如果安装完成squirrel之后，并没有发现`squirrel.yaml`这个配置文件，可以在安装包中找到。安装包的位置在`/Library/Input Method/Squirrel.app`，显示包内容就可拷贝一份放在配置文件夹里了（不拷贝也并无影响）。

自定义squirrel的这些基础配置只需要创建`squirrel.custom.yaml`配置文件，并修改部分默认配置就行了。

例如若觉得默认/自带的配色方案都不太喜欢，定制一份「专属」的配色方案也很简单，热心的社区提供了易用的[调色板](https://gjrobert.github.io/Rime-See-Me-squirrel/) 。

> 实际上，上面的`cheese_blue`，就是我使用调色板自己捣鼓出来的。😁️

某些特定的应用程序界面，可能只需要英文输入模式即可「如终端」，可以使用`app_options`标签对特定程序的输入方案进行定制：

```yaml
app_options:
  com.apple.Spotlight:
    ascii_mode: true
  com.alfredapp.Alfred:
    ascii_mode: true
  com.apple.Terminal:
    ascii_mode: true
    no_inline: true
    #...
```

上述配置已经包含在默认`squirrel.yaml`配置文件里了。

### 输入方案默认配置

`default.yaml`配置文件定义了输入方案选单、热键、候选字数量、punctuator〔谓句读处理器〕、recognizer〔谓规则匹配器〕等配置。

以下列出了`default.yaml`的配置项（部分）

```yaml
# Rime default settings
# encoding: utf-8

config_version: '0.40'

schema_list:  #输入方案列表
  - schema: luna_pinyin
  - schema: luna_pinyin_simp
  - schema: luna_pinyin_fluency
  - schema: bopomofo

switcher:  # 切换输入方案的快捷键
  caption: 〔方案選單〕
  hotkeys:
    - Control+grave  # ctrl + `
    - Control+Shift+grave  
    - F4
  save_options: 
    - full_shape
    - ascii_punct
    - simplification
  fold_options: true
  abbreviate_options: true
  option_list_separator: '／'

menu: 
  page_size: 5  #候选词数目

punctuator:  # 自定义符号输入
  full_shape:
    __include: punctuation:/full_shape
  half_shape:
    __include: punctuation:/half_shape

key_binder:     # 按键绑定
  bindings:
    __patch:
      - key_bindings:/emacs_editing
      - key_bindings:/move_by_word_with_tab

# 输入识别与匹配，一般用来连贯地输入含有字母和数字的组合，如id、邮箱等 
# 一般来说，如果在中文输入模式下，想输入「mamba24」，就需要先输入「mamba」
#  然后「回车键」上屏，接着使用小键盘输入24，
# 使用特定的模式匹配，可以连贯地输入mamba24
recognizer: 
  patterns:
    email: "^[A-Za-z][-_.0-9A-Za-z]*@.*$"
    uppercase: "[A-Z][-_+.'0-9A-Za-z]*$"
    url: "^(www[.]|https?:|ftp[.:]|mailto:|file:).*$|^[a-z]+[.].+$"

ascii_composer:  # 设置caps、shift、control等键的作用
  good_old_caps_lock: true
  switch_key:
    Shift_L: inline_ascii
    Shift_R: commit_text
    Control_L: noop
    Control_R: noop
    Caps_Lock: clear
    Eisu_toggle: clear
```

定制化的主要配置集中在：

1. schema_list：配置输入方案
2. switcher/hotkeys：配置方案切换的快捷键
3. ascii_composer/switch_key：配置中/英切换的快捷键
4. menu/page_size：配置候选词数目

以下是`default.custom.yaml`配置示例：

```yaml
# 以补丁方式配置
patch:
  schema_list:
    - schema: double_pinyin_flypy # 仅保留小鹤双拼
    # - schema: luna_pinyin # 全拼
    # - schema: double_pinyin # 自然码
  switcher:
    hotkeys: #输入选单切换快捷键
      - "Control+grave" # 注意是control+`，不是command+`
      - "Shift+F4"  # 避免按键冲突
    save_options:
      - full_shape
      - ascii_punct
      - simplification
      - zh_hans
      - emoji_suggestion
  menu:
    page_size: 6 #候选字6个
  ascii_composer: # 设置caps、shift、control等键的作用
    good_old_caps_lock: false # 若为true，caps只切换大小写
    switch_key:
      Caps_Lock: noop # 仅仅切换大小写
      Shift_L: commit_code # 使用shift切换中英文
      Shift_R: noop  # MAC系统无法区分Shift/Control_L和R，因此都是L 
      Control_L: noop
      Control_R: noop
      Eisu_toggle: clear
```

> mac原生输入法支持使用`caps`按键支持中/英切换，如若使用鼠须管，可以关闭这一偏好，让其仅作大小写切换。鼠须管使用`shift`切换〔中/英〕输入。


### 小鹤双拼输入方案配置

上文提到的配置都算是输入引擎的通用性配置，如果想真正定制输入法，还得从`double_pinyin_flypy.schema.yaml`入手，这是小鹤双拼的配置项。稍作「补丁」，便可以让它更好为输入服务。

关于`schema.yaml`内各配置项的具体解释，可以参照[schema.yaml释义](https://github.com/LEOYoon-Tsaw/Rime_collections/blob/master/Rime_description.md)，或者[输入法引擎与功能组件](https://github.com/rime/home/wiki/RimeWithSchemata#%E8%BC%B8%E5%85%A5%E6%B3%95%E5%BC%95%E6%93%8E%E8%88%87%E5%8A%9F%E8%83%BD%E7%B5%84%E4%BB%B6)

通俗地讲，输入法引擎获取键盘的输入，通过一系列的分析、匹配、处理，找到合适的规则，然后根据规则显示最匹配的候选字。而输入引擎里，所谓的「processors」、「segmentors」、「translators」和「filters」不过是处理键盘输入的**先后**流程罢了。

而大部分的流程，都无需关心，需要处理的，仅仅是小部分。

此文对小鹤双拼的定制化，主要集中在4个方面：

- emoji的支持
- 中英文混输，这是很多网络输入法自带的功能
- 模糊音，南方人太需要这个了😳
- 自定义短语，可以快速输入邮箱之类
- 日期和时间快速输入（小插件）

#### 快速输入emoji

#####  使用「plum」安装指定输入法对emoji的支持

`bash rime-install emoji:customize:double_pinyin_flypy`

上述命令对〔小鹤双拼〕输入法安装了对emoji的支持，透过安装日志，其实可以看到实际上就是对`double_pinyin_flypy.custom.yaml`打上补丁。

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img  alt = '' src="/img/rime/install_emoji.png" width="100%" />
<p>
plum安装对小鹤双拼的emoji支持
</center>


查看配置文件，可以看到多了如下配置：

```yaml
# Rx: emoji:customize:schema=double_pinyin_flypy {  #emoji支持
  - patch/+:
      __include: emoji_suggestion:/patch
# }
```

并且可以看到配置目录多了`emoji_suggestion.yaml`文件夹以及`opencc`文件夹里的「emoji词典」。

此时，输入法的选单有一些小小的变化，即加入了emoji建议的开关：


<center style="font-size:0.8rem; font-style:italic; color: grey">
 <img alt= ‘’ src="/img/rime/quick_setting.png" width="70%" />
 <p>
 emoji支持安装完成后的输入法选单变化
</center>


 调出此选单，按「6」可以选择开启或者关闭emoji建议。

 这要得益于`emoji_suggestion.yaml`的配置，这个配置是通过上述「patch」成为了`double_pinyin_flypy.custom.yaml`的配置。

 > 基于这种方式，也可以很方便地为其他输入方案引入emoji输入的支持。

重新部署后，就可以直接在候选词中输入emoji：

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img alt = '' src="/img/rime/emoji_suggestion1.png" width="50%" />
</center>

>上图使用的小鹤双拼输入法，*不过拼音显示的内容是全拼*，这个〔缺陷〕会在后续配置中优化。

需要注意的是，不同版本的系统可能对emoji的支持不同，可能会出现部分乱码，这样的候选字很影响输入体验。

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img alt= '' src="/img/rime/error_code.png"  width="50%"/>
</center>

直接的处理方法，就是在`opencc`文件夹里面，找到对应的emoji字典，删掉里面乱码的内容🤭。

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img alt= '' src="/img/rime/opencc_emoji.png" width="50%"/>
<p>
emoji字典中可能会存在部分乱码的内容
</center>

##### 自定义符号上屏

除了上面的方法之外，还有一个可以快速输入emoji的功能，就是借助于「punctuator」和「recognizer」以及`symbols.yaml`

「punctuator」是「句讀處理器，將單個字符按鍵直接映射爲文字符號」，简单来讲，它可以快速让符号上屏。

「recognizer」可以认作「匹配器」，用于匹配特定的输入码，使用的正则表达式进行匹配。

因此，配合使用，可以获得如下的效果：

<center>
<img alt=‘’ src="/img/rime/symbols.png" width="30%" />
</center>

即输入`/tq`，即可出现和「天气」有关的候选项。

如何做呢，首先需要如下配置：

```yaml
patch:
    punctuator:
        import_preset: symbols    #自定义表情输入 更多参见symbols.custom.yaml
    recognizer:
        patterns:
            punct: "^/([a-z]+|[0-9]0?)$"  # 自定义符号上屏
```

默认地，`symbols.yaml`里定义了**很多**快速输入的符号，但是，我们可以定义更多，并且覆盖一些「略显繁琐」的默认配置。

在自定义的`symbols.custom.yaml`配置文件中，还可以做更多的定制：

```yaml
patch:
  punctuator/import_preset: symbols
  punctuator/full_shape/+:
    '/' : [ ／, ÷ ]
  punctuator/half_shape/+:
    '/' : [ '/', ÷ ]
    '@' : '@'
  punctuator/symbols/+:
    "/fs": [½, ‰, ¼, ⅓, ⅔, ¾, ⅒ ]
    "/xh": [ ＊, ×, ✱, ★, ☆, ✩, ✧, ❋, ❊, ❉, ❈, ❅, ✿, ✲]
    "/dq": [🌍,🌎,🌏,🌐,🌑,🌒,🌓,🌔,🌕,🌖,🌗,🌘]
    "/sg": [🍇,🍉,🍌,🍍,🍎,🍏,🍑,🍒,🍓,🍊,🍋,🫐,🍈,🥭,🥝]
  recognizer/patterns/punct: '^/([0-9]0?|[A-Za-z]+)$'
```

首先做的一件事情，就是覆盖了原来对于`/`符号的提示，默认的设置，输入`/`会显示`、`，`､`， `/`， `／〔全角〕`， `÷`候选项，可以根据喜好添加删除候选项即可。其次就是可以通过`/xx`的方式快捷输入emoji表情符号，对于常用emoji的人来说，这无异于天降甘霖啦😄️。

#### 中英文混输

通常，在中文模式下，直接输入英文并带补全「提示」是非常有必要的功能。幸好，使用插件解决可以满足这个功能：

``` bash
bash rime-install BlindingDark/rime-easy-en:customize:schema=double_pinyin_flypy
```

和emoji的支持一样，「东风破」的安装命令会在配置文件上打上「补丁」。

```yaml
# Rx: BlindingDark/rime-easy-en:customize:schema=double_pinyin_flypy 
#中英文混输 Typing English when using Chinese input-method
__patch:
    - patch/+:
         __include: easy_en:/patch
         # 避免矫枉过正，true会把所有的字母组合当作英文作为候选词
         easy_en/enable_sentence: false   
```

`easy_en/enable_sentence`开关的作用是，将任何输入的字符都作为英文候选，这样有点「过分敏感」了，通常需要将其设置为`false`。

重新部署后，即可在中文输入模式下，实现英文输入：

<center>
<img alt='' src="/img/rime/mix_input.png" width="50%"/>
</center>

#### 模糊音

模糊音若是用的多了，候选词往往会更混乱。但是对于前后鼻音拎不清的南方人来讲，没有模糊音，输入后鼻音真的好模糊😭️！所以还是想想怎样让鼠须管支持模糊音吧。

```yaml
patch:
    speller/algebra:                    #模糊音配置（部分），使用哪个就取消注释
        - erase/^xx$/                   # 第一行保留
        #- derive/^([zcs])h/$1/          # zh, ch, sh => z, c, s
        #- derive/^([zcs])([^h])/$1h$2/     # z, c, s => zh, ch, sh
        # - derive/([aei])n$/$1ng/        # an => ang en => eng, in => ing
        # - derive/([aei])ng$/$1n/        # ang => an eng => en, ing => in 
        # - derive/([u])an$/$1ang/        # uan => uang
        # - derive/([u])ang$/$1an/        # uang => uan
```

模糊音的配置项应位于〔拼写算法〕里，意为将在拼写时将`a`认作`b`。上面的配置文件列出了典型的模糊音配置。

由于双拼有自己的键位映射，所以在配置模糊音时，需要将模糊音配置在键位映射（全拼转双拼）之前，这样模糊音才能生效，并且需要
在`custom`配置里，模糊音配置之后，重新「抄写」一遍双拼的键盘映射配置。

具体的模糊音处理，参考[模糊音定製模板](https://gist.github.com/lotem/2320943)。

#### 自定义词典

在鼠须管中使用自定义词典也非常简单。只需要在对应输入方案的`xxx.custom.yaml`配置文件中添加如下配置即可：

```yaml
###使用自定义词典 custom_phrase.txt 
patch:
    custom_phrase: 
    dictionary: ""
    user_dict: custom_phrase
    db_class: stabledb
    enable_completion: false    #关闭逐键提示，精确匹配输入码的候选字即可
    enable_sentence: false      # 关闭输入法连打，此配置对双拼方案无效
    initial_quality: 1
    # 在translators列表配置第5项中加入配置，启用自定义词典
    "engine/translators/@5": table_translator@custom_phrase  
```

{{< hint warning>}}
> 上述配置中的`@5`意思是`@n`，意思是在列表项目配置中的第n个元素位设定新的值。常用用`@last`，表示在列表配置项最后加入配置。
{{< /hint >}}

此外，还需要一个名字为`custom_phrase.txt`的用户字典（在鼠须管的配置文件目录下），字典的内容格式为〔候选字\tab输入码\tab权重（可省略）〕，`\tab`表示各项以制表符（tab）分隔。

重新部署后，既可以使用自定义短语。自定义短语用来快速输入邮箱📮️地址非常有用。

<center>
<img alt ='' src="/img/rime/custom_phrase.png" width="50%"/>
</center>

#### 日期时间动态输入

需要使用[这个](https://github.com/hchunhui/librime-lua/wiki)拓展。

具体的使用方法是：

1. clone项目，找到项目中的`sample`文件夹，将`lua`文件夹和`rime.lua`文件拷贝到`User/xxx/Library/Rime`目录下。
2. 修改使用的输入方案的配置文件，本文讨论的是`double_pinyin_flypy.custom.yaml`文件，添加如下配置：

```yaml
engine/translators/+:
    - lua_translator@date_translator         # 日期候选 
    - lua_translator@time_translator         # 时间候选
    # 还有一些函数可以调用，参见rime.lua
```

重新部署后，就可以在输入选框中快速键入当前日期和时间了。

<center>
<img alt = '' src="/img/rime/date_to_screen.png" width="70%" />
</center>

## 其他杂项

### 双拼显示双拼码，不解析为全拼

在默认配置下，即使使用小鹤双拼方案，在键入输入码之后，屏上显示的依然是全拼，就像这样：

<center>
<img alt='' src="/img/rime/full_pinyin.png" width="50%" />
</center>

对于习惯双拼上屏的用户来说，可能有一点别扭，此时，需要额外的配置，来使屏上直接显示键入码，而不「翻译」为全拼：

```yaml
patch:
    translator/preedit_format: []         #双拼显示双拼码，不解析为全拼
```

重新部署后生效。

<center>
<img src="/img/rime/double_pinyin.png" alt="屏上显示为双拼" width="50%" />
</center>

### 快速输入id，网址、邮箱等

前文已经提到过，`recognizer/patterns`可以用来匹配输入码，适合进行快速处理。利用这个机制，除了可以通过使用`/bq`快速输入表情之外，还可以做一些特别的事情：

```yaml
patch:
  recognizer:
    patterns:
      punct: "^/([a-z]+|[0-9]0?)$"  # 自定义符号上屏
      email: "^[A-Za-z][-_.0-9A-Za-z]*@.*$"   # email快速上屏
      uppercase: "[A-Z][-_+.'0-9A-Za-z]*$"    # 大写英文直接上屏
      #网址快速上屏
      url: "^(www[.]|https?:|ftp[.:]|mailto:|file:).*$|^[a-z]+[.].+$"  
      mypattern: "^icool[0-9]+$"     # 直接输入id，而不需要先上屏icool
```

在中文输入模式下，如果要输入网址，邮箱等全英文的「字符串」，在不切换为英文输入模式的情况下，一般需要多次上屏操作，往往不能一次性连续的输入。而借助`recognizer/patterns`，则可以实现连续输入一次上屏。

还可以自定义匹配模式，比如带数字的id，比如`icool123`，上面的最后一项自定义配置即可快速输入，不需要2次上屏。

在注释掉上述`url` pattern后，在中文模式下不能快速输入网址，在输入`www`之后，接`.`会直接上屏：

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img src="/img/rime/a_1.gif" alt="www直接上屏了" width="50%" />
<p>
输入www。则会直接上屏
</center>

而在取消注释（即启用pattern）后，在中文输入模式下，可以直接输入网址：

<center style="font-size:0.8rem; font-style:italic; color: grey">
<img src="/img/rime/a_2.gif" alt="快速输入网址" width="50%" />
<p>
启用模式匹配后，输入www。会匹配模式而不上屏
</center>

其他匹配模式效果一致，不再一一例证。


### 使用拓展词库

由于自带的`luna_pinyin.dict.yaml`词库实在有些贫瘠，我们可以使用拓展词库，以搜狗细胞词库为最佳。

本文不讨论如何自己动手制作细胞词库了，感兴趣可以参考[Rime配置指南](https://sspai.com/post/84373)。

使用起来也很简单，只需要先[从这里](https://github.com/ssnhd/rime)搞个现成的词库`luna_pinyin.sogou.dict.yaml`，放在Rime的配置目录下，然后在对应的自定义输入方案中使用该词库即可，本例中对应的配置文件是`double_pinyin_flypy.custom.yaml`，在其中添加如下配置：

```yaml
translator/dictionary: luna_pinyin.extended #使用拓充词库
```

如上所示，我们还需要一个`luna_pinyin.extend.yaml`配置，如下：

```yaml
name: luna_pinyin.extended      # 词库名
version: "2021.02.07"
sort: by_weight         
use_preset_vocabulary: true 

import_tables:
  - luna_pinyin
  - luna_pinyin.sogou  #引入搜狗词库
```

重新部署即可。

### 查看部署的日志

如果想知道配置自定义配置为什么没有生效，查看部署日志文件或许是一个可行的办法。

以macOS 11.7.2为例，日志文件存放在`/var/folders/9v/v3ws_2g90cg9_ntr7rmc8kpc0000gn/T`目录下。 三个日志文件分别是：

- rime.squirrel.ERROR， 错误日志，主要查看
- rime.squirrel.INFO， 信息级别，记录内容较多
- rime.squirrel.WARNING，警告级别，可能会记录一些不影响使用的警告信息，如自定义配置缺失等

可以通过`echo $TMPDIR`来快速定位日志文件的目录。

---

此次配置文件同步在 https://github.com/wangy325/squirrel_config，感兴趣的朋友可以自行下载使用。

---

References:

- [如何卸载Rime输入法](https://www.cnblogs.com/Bob-wei/p/5010143.html)
- [东风破](https://github.com/rime/plum?tab=readme-ov-file)
- [安装Rime](https://rime.im/download/)
- [squirrel.custom配置样例](https://gist.github.com/2290714)
- [squirrel-调色板](https://gjrobert.github.io/Rime-See-Me-squirrel/)
- [中英文混输](https://github.com/BlindingDark/rime-easy-en)
- [模糊音配置参考](https://gist.github.com/lotem/2320943)
- [日期动态输入](https://github.com/hchunhui/librime-lua/wiki)
- [schema.yaml配置文件解释](https://github.com/LEOYoon-Tsaw/Rime_collections/blob/master/Rime_description.md)
- [Rime方案設計（中階）](https://github.com/rime/home/wiki/RimeWithSchemata#rime-%E4%B8%AD%E7%9A%84%E6%95%B8%E6%93%9A%E6%96%87%E4%BB%B6%E5%88%86%E4%BD%88%E5%8F%8A%E4%BD%9C%E7%94%A8)
- [鼠须管的部署日志](https://github.com/rime/home/wiki/RimeWithSchemata#%E9%97%9C%E6%96%BC%E8%AA%BF%E8%A9%A6)
- [开箱即用的Rime配置](https://github.com/ssnhd/rime)
