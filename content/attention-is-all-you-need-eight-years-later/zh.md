---
title: "《注意力就是一切》，八年后再看"
date: 2026-06-30
lang: zh
tags: [Transformer, 深度学习, AI架构, 技术回顾]
description: "论文发表八年、引用 18 万次——但如果你现在读原文，会发现作者对几件关键的事判断错了，而那些错误恰恰解释了今天 AI 架构的走向。"
cover: "https://images.unsplash.com/photo-1555618254-84e2cf498b01?w=1280&q=85&fm=jpg"
draft: false
slug: attention-is-all-you-need-eight-years-later
---

今年六月，"Attention Is All You Need" 发表整整八年。被引用次数已经超过 18 万——这个数字本身是一种奇观，大多数论文一生都到不了 1000。

我最近把原文又翻了一遍。不是因为没读过，是因为想搞清楚一件事：八年前那 11 页纸，到底哪些判断是真知灼见，哪些是幸运的副产品，哪些问题其实一直没有被解决干净。

结论和我预期的不太一样。

---

## 它当时真正在解决什么

2017 年的背景是：RNN 和 LSTM 是处理序列数据的标准答案，但它们有两个硬伤。

第一，顺序计算。RNN 必须一步一步处理序列，无法并行，意味着训练慢、扩展难。第二，长距离依赖弱。序列越长，早期信息被稀释得越厉害，梯度消失是结构性问题。

论文的核心 bet 只有一个：**attention 不是 RNN 的补丁，而是替代**。把 encoder 和 decoder 里的循环结构全部去掉，只用 attention。

这个判断在两年内被全领域验证。BERT、GPT-2，然后是 GPT-3。Ilya Sutskever 后来说，他读完这篇论文的当下就意识到"这就是我们需要的一切"，然后 OpenAI 整体放弃了 RNN 路线。

到这里，论文赢了。赢得很彻底。

---

## 它说对了什么——包括它自己没预料到的

论文里有一句话经常被忽略：

> "The Transformer allows for significantly more parallelization."

这句话在当时是说训练效率。但它实际上解锁的是规模化。并行计算 → 可以喂更多数据 → 可以堆更多参数 → 扩展定律（Scaling Laws）成为可能。论文没有预测这条路，但它铺了这条路。

更反直觉的一点：Transformer 的架构极简性反而成了优势。它几乎没有归纳偏置（inductive bias）——不像 CNN 假设了局部性，不像 RNN 假设了顺序性。这意味着它让模型自己从数据里学结构，在数据量足够大的时候，这是碾压性的优势。

原作者 Ashish Vaswani 后来说，ChatGPT 出现的那一刻对他来说是"清晰的里程碑"——但那不是他 2017 年想象中的目标。他当时的设想是做一个能整合所有模态的单一模型，有点像人脑。ChatGPT 那条路是别人走出来的。

---

## 它没说、但后来变成了核心问题的

**位置编码是论文最脆弱的部分。**

原论文用的是正弦位置编码（sinusoidal positional encoding）。这个设计在当时是够用的，但它不会随序列长度泛化，对相对位置的感知也很弱。

八年里，这个部分被改得面目全非。RoPE（旋转位置编码）、ALiBi、YaRN……几乎所有主流大模型都不再用原始的正弦编码了。这不是小修小补，是核心组件的替换。

**KV 缓存问题在论文里根本不存在。**

原论文设计的是 encoder-decoder 架构，用于机器翻译——输入和输出都是已知的，不需要自回归推理。但后来 GPT 系列走的是纯 decoder、自回归生成的路，每生成一个 token 都要把之前所有 token 的 K/V 重新存一遍。

这个问题在 1M token 上下文的今天已经变成了显存的主要杀手，催生了整条技术路线（FlashAttention、MLA、PagedAttention）。但 2017 年的论文完全没有这个概念，因为当时没有人在做这件事。

**涌现（Emergence）没有被预测。**

论文里没有任何关于"规模带来质变"的描述。从 BERT 到 GPT-3，再到 GPT-4，每一次量变引起质变的过程，都是在论文框架之外发生的。Scaling Laws 是 2020 年才被 Kaplan 等人系统化的，Transformer 论文根本没有这个视角。

---

## 它埋下的、至今没解决干净的

**注意力的二次复杂度是结构性问题，不是工程问题。**

$O(n^2)$ 是 self-attention 的原罪。序列长度翻倍，计算量翻四倍。八年里，这个问题出现了各种"解法"：FlashAttention 是 IO 层面的优化，MLA 是存储层面的压缩，线性注意力是数学上的近似。

没有一个是真正解决了问题，都是在不同层面绕路。

**Transformer 有理论上的推理上限。**

理论分析表明，log-precision 的 Transformer 被限制在 TC⁰ 复杂度类——它无法可靠地解决严格顺序依赖的问题。换句话说，有一类计算问题，不管参数量多大，标准 Transformer 在理论上都处理不好。

它们用了各种技巧在实践中绕过这个限制。但这个天花板是真实的，而且是架构层面的。

---

## "后 Transformer 时代"为什么还没来

2023 年 Mamba 出来的时候，"Transformer 要被取代"的讨论很热。状态空间模型（SSM）的线性复杂度在理论上很漂亮。

但 2025 年的基准测试泼了冷水：纯 Mamba 架构在联想召回（associative recall）和上下文学习（in-context learning）上，仍然落后于同等规模的 Transformer。SSM 也有自己的"幻觉"——理论上线性，但实际上对长距离依赖的建模能力同样受限。

现在的主流共识是 hybrid 架构：大部分层用线性的 SSM，少量关键层保留 attention（比例大概是 1/8 到 1/10）。NeurIPS 2025 最佳论文 Gated Attention 走的也是这条路。

Transformer 没死。但它也不是终点，这一点现在基本没有争议。

---

## 最反直觉的一件事

Ashish Vaswani，"Attention Is All You Need" 的第一作者，现在领导的公司叫 Essential AI。他最近最频繁说的一件事是：纯参数扩展已经不够了，架构层面需要真正的创新。

写出 Transformer 的人，现在是最积极推动走出 Transformer 时代的人之一。

这不是打脸，是正常的科学进程。任何架构，包括改变了整个领域的架构，都只是当时约束下的最优解，不是终点。

---

## 原文 Abstract 的最后一句

> "We achieve a new state of the art on English-to-German and English-to-French newstest2014 by more than 2 BLEU."

这篇改变了整个 AI 领域走向的论文，最后的 punchline 是翻译 benchmark 上的 2 个 BLEU 分。

2017 年，没有人知道这是什么的开始。

---

<!-- SOURCES
- https://hub.baai.ac.cn/view/46494
- https://zhuanlan.zhihu.com/p/1976640624171180699
- https://arxiv.org/abs/1706.03762
- https://blogs.nvidia.com/blog/gtc-2024-transformer-ai-research-panel-jensen/
- https://www.askaibrain.com/en/posts/end-of-transformers-hybrids-attention-state-space-2025/
-->
