---
title: "在RTX4060上运行并调试pdf-craft"
date: 2026-01-11
categories: ["python"]
tags: ["vLLM"]
BookToC: True
---


扫描版的PDF文档在进行阅读标记时存在局限，若不幸扫描PDF是一本没有目录的书籍，那阅读体验就更加糟糕了，就算使用acrobat手动创建书签，那也将会是一项复杂而繁琐的工作。

> [PDF补丁丁](https://github.com/wmjordan/PDFPatcher)可以一键创建目录书签，不过针对的是非扫描版PDF。

幸好，随着文档数字化和 AI 技术的发展，将扫描PDF 文档精准地转化为结构化EPUB/Markdown成为可能。[pdf-craft](https://github.com/oomol-lab/pdf-craft) 就提供了这种能力。

<!--more-->

>*`pdf-craft`基于 [DeepSeek OCR](https://github.com/deepseek-ai/DeepSeek-OCR) 进行文档识别。支持表格、公式等复杂内容的识别。通过 GPU 加速，`pdf-craft`能够在本地完成从 PDF 到 Markdown 或 EPUB 的完整转换流程。转换过程中，`pdf-craft` 会自动识别文档结构，准确提取正文内容，同时过滤页眉、页脚等干扰信息。对于包含脚注、公式、表格的学术或技术文档，`pdf-craft`也能妥善处理，保留这些重要元素（包括脚注中的图片等资源）。转换为 EPUB 时会自动生成目录。最终生成的 Markdown 或 EPUB 文件保持了原书的内容完整性和可读性。*

虽然结合了强大的DeepSeek-OCR视觉模型，提供了极高的识别准确度。然而，对于拥有 RTX 4060（8GB 显存）的 Windows 用户来说，如何在有限的显存下流畅运行并实现快速推理，需要进行一系列的配置优化。本文记录了从安装运行到调优的全过程。

## 安装

> `pdf-craft`支持`3.10.x~ 3.13.x`。开始前请先检查python版本。

### 创建并激活虚拟环境

```bash

mkdir pdf-craft  && cd pdf-craft
## 创建虚拟环境
python -m venv .venv

## 激活虚拟环境
.venv\Scripts\activate

```

### 正确安装pytorch

- 检查 CUDA 版本：在命令行输入 `nvidia-smi`，查看右上角的 CUDA Version。

- 获取安装命令：前往 [PyTorch 官网](https://pytorch.org/get-started/locally/)。

    >PyTorch的CUDA版本并不一定和系统的版本一致，一般不要高于系统版本。

- 根据环境选择：选择 Stable -> Windows -> Pip -> Python -> CUDA 12.1（或对应的版本）。

- 安装pytorch：

    `pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cu128`

安装过程可能会花费一点时间，取决与你的网速。

如果发现下载速度慢，可尝试使用加速镜像:

```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

### 安装pdf-craft

`pip install pdf-craft`

### 安装poppler

`pdf-craft`依赖 `poppler` 处理 PDF 渲染。在 Windows 上需要手动配置：

从 [poppler-windows releases](https://github.com/oschwartz10612/poppler-windows/releases)下载最新版本的二进制压缩包。

将其解压到您的工具目录（例如 C:\Program Files\poppler）。

配置环境变量：将解压目录下的 bin 文件夹路径（例如 C:\Program Files\poppler\Library\bin）添加到系统的 环境变量 PATH 中。

### 检查安装

```bash
## 检查CUDA
python -c "import torch; print('CUDA 可用:', torch.cuda.is_available())"

## 2. 检查 poppler 是否识别成功
pdfinfo -v

## 3. 验证模块导入
python -c "import pdf_craft; print('pdf-craft 模块加载成功')"
```

### 首次运行

以上操作都完成后，你可以使用IDE打开`pdf-craft`项目。这个项目是空的，目前仅仅安装好了依赖，是“可运行”状态，还需要一个脚本让其运行。

同时还需要一个源pdf，随便有找一个扫描版的pdf即可，测试阶段可以使用acrobat只截取一部分页面。完成后将其放在项目文件夹里，命名随意，假如就叫`input.pdf`好了。

在项目里创建一个`demo.py`并使用如下代码快速开始：

```py
from pdf_craft import transform_epub, BookMeta, TableRender, LaTeXRender

transform_epub(
    pdf_path="input.pdf", ##源pdf名
    epub_path="output.epub", ## 输出文件名
    analysing_path="temp",  ## 可选：指定临时文件夹
    ocr_size="base",  ## 可选：tiny, small, base, large, gundam
    models_cache_path="models",  ## 可选：默认的模型下载路径
    dpi=300,  ## 可选：渲染 PDF 页面的 DPI（默认：300）
    max_page_image_file_size=None,  ## 可选：最大图像文件大小（字节），超出时自动调整 DPI
    includes_cover=True,  ## 可选：包含封面
    includes_footnotes=True,  ## 可选：包含脚注
    ignore_pdf_errors=False,  ## 可选：遇到 PDF 渲染错误时继续处理
    ignore_ocr_errors=False,  ## 可选：遇到 OCR 识别错误时继续处理
    generate_plot=False,  ## 可选：生成可视化图表
    toc_assumed=True,  ## 可选：假设 PDF 包含目录页
    book_meta=BookMeta(
        title="书名",
        authors=["作者1", "作者2"],
        publisher="出版社",
    ),
    lan="zh",  ## 可选：语言 (zh/en)
    table_render=TableRender.HTML,  ## 可选：表格渲染方式
    latex_render=LaTeXRender.MATHML,  ## 可选：公式渲染方式
    inline_latex=True,  ## 可选：保留内联 LaTeX 表达式
)
```

不出意外的话，运行脚本，就会自动下载模型。然后进行本地推理了。模型会下载在项目的`models`文件夹里。如上面的`models_cache_path`配置的那样。

>RTX4060在首次以默认配置运行时，使用11张带封面的扫描PDF跑出了20分钟的好成绩。这显然是不能接受的。按照这个速度，跑一本书（按300页算）的话，可能需要10个小时不止！
>
>看到这个数据，顿时不想折腾了。
>

好在考虑到4060的AI性能，提前咨询AI是否存在可优化的空间。AI倒是给出了一些指导意见。Gemini对于模型速度的预测还是过于乐观了，竟然说可以达到2s处理一张PDF，一本300页的书籍可能只需要10分钟！不过正是由于这份乐观，此文才有后续。

## 优化

### 开启flash-attn

通过`pip install`安装`flash-attention`大概率会失败，直接[下载](https://github.com/Dao-AILab/flash-attention/releases)已经编译好的对应本地（cuda、pytorch、python）版本`.whl`文件，再手动安装，会省事得多。

安装命令为`pip install 'xxx.whl'`。

到这里，模型下载和基本的优化就已经完成了。可以使用测试脚本来验证：

```py
import importlib.util
import torch

print(f"Torch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")
    print(f"BF16 supported: {torch.cuda.is_bf16_supported()}")

flash_attn = importlib.util.find_spec("flash_attn")
print(f"Flash Attention installed: {flash_attn is not None}")

###### output:
## Torch version: 2.9.1+cu128
## CUDA available: True
## CUDA device: NVIDIA GeForce RTX 4060
## BF16 supported: True
## Flash Attention installed: True
```

### 调整参数

上面的实例可以看到，还是提供了不少参数用来控制模型效率：

```py
ocr_size="base",  ## 可选：tiny, small, base, large, gundam
dpi=300,  ## 可选：渲染 PDF 页面的 DPI（默认：300）
max_page_image_file_size=None,  ## 可选：最大图像文件大小（字节），超出时自动调整 DPI
```

理论上`ocr_size`越小越快，相对地，OCR精度也会越低，例如会出现“6”识别为“8”的情形。`dpi`也是同理，不过对于一般的PDF文档，将`dpi`设置为144或者96是合理的。`max_page_image_file_size`这个参数就更加直观了。因为pdf-craft的第一步就是将利用popper将单页转换为图片，图片越小速度越看，同理精度也就越低。

以上参数的设置，一般设置为`base`和`144`可以达到效率和质量的平衡。

> 不过实际测算下来，使用300dpi和144dpi的单页速度差不多。

### 使用4bit量化

最值得一提的就是这个优化了，折腾了个大的，发现是负优化（🤡）。

由于一开始就当心pdf-craft在4060上OOM，还“未雨绸缪”了一番，与Gemini友好交流后，决定开启4bit量化，节省VRAM不爆显存才是最重要的呀！

安装完pdf-craft后，就开始研究源码里加载模型的部分，试图在加载模型的配置里作一点小小的patch(使用4bit量化)。

在`doc_page_extractor\model.py`里，定义了`DeepSeekOCRHugginfaceModel`，里面的`_ensure_models`方法定义了模型的加载：

```python
 model = AutoModel.from_pretrained(
    pretrained_model_name_or_path=name_or_path,
    _attn_implementation=_ATTN_IMPLEMENTATION,
    trust_remote_code=True,
    use_safetensors=True,
    cache_dir=cache_dir,
    local_files_only=self._local_only,
)
model = model.to(torch.bfloat16).cuda(device_number)
```

现在要做的就在初始化模型时，使用4bit量化。

```python
compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type='nf4',
    bnb_4bit_compute_dtype=compute_dtype,
)
print(f"正在使用 4-bit NF4 量化加载模型，计算精度: {compute_dtype}")
print(f"flash-attention-2 是否开启: {_ATTN_IMPLEMENTATION}")

model = AutoModel.from_pretrained(
    pretrained_model_name_or_path=name_or_path,
    _attn_implementation=_ATTN_IMPLEMENTATION,
    trust_remote_code=True,
    use_safetensors=True,
    cache_dir=cache_dir,
    local_files_only=self._local_only,
    quantization_config=quantization_config,
    device_map="auto"
)
```

不过仅仅这样做的话会出现一个*datatype mismatch*的错误。原因在于这个配置仅仅指定了LLM的4bit量化datatype（bf16）,而deepseekOCR的视觉编码（vision encoder）使用的datatype还是（Float32）。不过不是什么大问题，antiGravity改改就好了😁。实际上就是在模型初始化侧强制设置模型的所有模块应用统一的数据类型。

>虽然如此看来很简单，修改应用4bit量化测试成功的过程还是花费了我大几个小时的时间~
>
>原因在于antiGravity解决编程问题并不是一次成功的。哈哈。

幸运的是，成功后，再次使用11张的测试pdf跑完，时间从缩短一半约为10分钟了。不过还是远远达不到“我所预料的Gemini给我的速度”。

有趣的是，我关闭4bit量化后，这个时间更短了，为4分钟左右了。这个速度就比较符合我的认知，开启`flash-attn`后速度会快2-3倍。不过，4bit量化是负优化了？？

以下是Gemini给出的答案：

>开启`load_in_4bit=True`反而更慢的原因是因为 Windows 下的`bitsandbytes`库回退到了极其低效的计算模式。
>
>详细原因分析：
>
>在之前的测试中，当开启`4-bit`量化时，Benchmark 脚本的报错信息中出现了以下关键堆栈：
>
>```bash
>File "...\bitsandbytes\backends\cuda\ops.py", line 510, in _gemv_4bit_impl
>lib.cgemm_4bit_inference_naive_bf16(
>```
>
>这里 naive（朴素/简单）是核心线索。它表明：
>
>缺失优化算子：标准的`bitsandbytes`库在 Linux 上有高度优化的 CUDA 内核（kernels），但在 Windows 上支持尚不完美。如果未能加载到针对你显卡架构编译的`4-bit`优化算子，它就会使用备用的 "naive" 实现。
>
>性能差异：这个 "naive" 实现可能是串行的，或者是并未针对 GPU 并行计算进行优化的代码。相比之下，你的 RTX 4060 在运行标准的 BF16/FP16 精度时（即`load_in_4bit=False`），使用的是 NVIDIA 官方高度优化的 cuBLAS 库，速度极快。
>
>结果：量化本应通过减少显存占用和访存带宽来加速，但在这种情况下，计算本身的低效完全抵消并严重拖累了整体速度（导致 3.75s 变成了 50s+）。
>

黄梁一梦啊。

不过1分钟接近3页到4页的处理速度，应该也差不多到4060的极限了，目前来讲。

## 后记

整体测试下来，deepseek-OCR的识别准确率还是不错的。不过对于内容的格式排版，甚至是基本的换行，有时候都不完美。

更坏的是，有很严重的内容缺失。

<center style="font-size:0.8rem; font-style:italic; color: grey">
 <img alt= ‘’ src="/img/2026-01-13215529.png" width="100%" />
 <p>
 识别结果与原pdf对比（ocr_size:small, dpi:72）
</center>

上图可以看到，完全丢掉了第二页和第三页(仅仅保留了最后一句话，截图未显示)的内容。目前还不清楚类似这种情况的内容确实是否和`ocr_size`以及`dpi`配置有关。不过理论上应该是没什么关系的。

看来目前完全期待pdf-craft来“修复”扫描版本的PDF书籍还是不太可能的。毕竟除了格式上面的问题，内容的缺失确实还需要更多的实践测试才行。

不管怎样，它为更加“优雅”地阅读扫描版PDF提供了一个实际可行的操作。除了书籍之外，对于其他的短篇幅的诸如论文之类，无论是处理时间和人为校验起来，时间成本会更低，还是值得尝试的。
