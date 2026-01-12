---
title: "在RTX4060上运行并调试pdf-craft"
date: 2026-01-11
categories: ["python"]
tags: ["vLLM"]
BookToC: True
draft: True
---


扫描版的PDF文档在进行阅读标记时存在局限，若不幸扫描PDF是一本没有目录的书籍，那阅读体验就更加糟糕了，就算使用acrobat手动创建书签，那也将会是一项复杂而繁琐的工作。

> [PDF补丁丁](https://github.com/wmjordan/PDFPatcher)可以一键创建目录书签，不过针对的是非扫描版PDF。

幸好，随着文档数字化和 AI 技术的发展，将扫描PDF 文档精准地转化为结构化EPUB/Markdown成为可能。[pdf-craft](https://github.com/oomol-lab/pdf-craft) 就提供了这种能力。

>*`pdf-craft`基于 [DeepSeek OCR](https://github.com/deepseek-ai/DeepSeek-OCR) 进行文档识别。支持表格、公式等复杂内容的识别。通过 GPU 加速，`pdf-craft`能够在本地完成从 PDF 到 Markdown 或 EPUB 的完整转换流程。转换过程中，`pdf-craft` 会自动识别文档结构，准确提取正文内容，同时过滤页眉、页脚等干扰信息。对于包含脚注、公式、表格的学术或技术文档，`pdf-craft`也能妥善处理，保留这些重要元素（包括脚注中的图片等资源）。转换为 EPUB 时会自动生成目录。最终生成的 Markdown 或 EPUB 文件保持了原书的内容完整性和可读性。*

虽然结合了强大的DeepSeek-OCR视觉模型，提供了极高的识别准确度。然而，对于拥有 RTX 4060（8GB 显存）的 Windows 用户来说，如何在有限的显存下流畅运行并实现快速推理，需要进行一系列的配置优化。本文记录了从安装运行到调优的全过程。

# 安装与运行

> `pdf-craft`支持`3.10.x~ 3.13.x`。开始前请先检查python版本。

## 安装

### 创建并激活虚拟环境

```bash

mkdir pdf-craft  && cd pdf-craft
# 创建虚拟环境
python -m venv .venv

# 激活虚拟环境
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
# 检查CUDA
python -c "import torch; print('CUDA 可用:', torch.cuda.is_available())"

# 2. 检查 poppler 是否识别成功
pdfinfo -v

# 3. 验证模块导入
python -c "import pdf_craft; print('pdf-craft 模块加载成功')"
```

## 首次运行

以上操作都完成后，你可以使用IDE打开`pdf-craft`项目。这个项目是空的，目前仅仅安装好了依赖，是“可运行”状态，还需要一个脚本让其运行。

同时还需要一个源pdf，随便有找一个扫描版的pdf即可，测试阶段可以使用acrobat只截取一部分页面。完成后将其放在项目文件夹里，命名随意，假如就叫`input.pdf`好了。

在项目里创建一个`demo.py`并使用如下代码快速开始：

```py
from pdf_craft import transform_epub, BookMeta, TableRender, LaTeXRender

transform_epub(
    pdf_path="input.pdf", #源pdf名
    epub_path="output.epub", # 输出文件名
    analysing_path="temp",  # 可选：指定临时文件夹
    ocr_size="base",  # 可选：tiny, small, base, large, gundam
    models_cache_path="models",  # 可选：默认的模型下载路径
    dpi=300,  # 可选：渲染 PDF 页面的 DPI（默认：300）
    max_page_image_file_size=None,  # 可选：最大图像文件大小（字节），超出时自动调整 DPI
    includes_cover=True,  # 可选：包含封面
    includes_footnotes=True,  # 可选：包含脚注
    ignore_pdf_errors=False,  # 可选：遇到 PDF 渲染错误时继续处理
    ignore_ocr_errors=False,  # 可选：遇到 OCR 识别错误时继续处理
    generate_plot=False,  # 可选：生成可视化图表
    toc_assumed=True,  # 可选：假设 PDF 包含目录页
    book_meta=BookMeta(
        title="书名",
        authors=["作者1", "作者2"],
        publisher="出版社",
    ),
    lan="zh",  # 可选：语言 (zh/en)
    table_render=TableRender.HTML,  # 可选：表格渲染方式
    latex_render=LaTeXRender.MATHML,  # 可选：公式渲染方式
    inline_latex=True,  # 可选：保留内联 LaTeX 表达式
)
```

不出意外的话，运行脚本，就会自动下载模型。然后进行本地推理了。模型会下载在项目的`models`文件夹里。如上面的`models_cache_path`配置的那样。

>RTX4060在首次以默认配置运行时，使用11张带封面的扫描PDF跑出了20分钟的好成绩。这显然是不能接受的。按照这个速度，跑一本书（按300页算）的话，可能需要10个小时不止！
>
>看到这个数据，顿时不想折腾了。
>

好在提前问了AI，考虑到4060蹩脚的AI性能，问了问是否存在可优化的空间。AI倒是给出了一些指导意见。Gemini对于模型速度的预测还是过于乐观了，竟然说可以达到2s处理一张PDF，一本300页的书籍可能只需要10分钟！不过正是由于这份乐观，此文才有后续。

# 优化

## 开启flash-attn

通过`pip install`安装编译`flash-attention`大概率会失败，建议直接下载已经编译好的对应版本。再手动安装。

## 调整参数

## 使用4bit量化

# 结论

