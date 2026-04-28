---
weight: 2
title: "Quick-Union"
snippets: true
BookToC: false
date: 2026-04-27
categories: [java, algo]
author: wangy325
---
<!--
## Data Structure

- Integer array `id[]` of length ***N***.
- Interpretation: `id[i]` is parent of `i`. (树结构，索引为i的值指向其“父节点”的索引。)
- Root of `i` is `id[id[id[…id[i]…]]]`. (一直向上查找，直到`id[i] == i`，算法保证不会出现环。)

## Find

- Check if `p` and `q` have the same **root**.

## Union

- To merge components containing p and q, {{< highline >}}set the id of p’s root to the id of q’s root{{< /highline >}}.
-->

---
