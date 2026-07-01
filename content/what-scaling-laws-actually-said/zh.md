---
title: "Scaling Laws 说了什么，没说什么"
date: 2026-06-30
lang: zh
tags: [Scaling-Laws, LLM, 深度学习, Kaplan, Chinchilla]
description: "中文 AI 圈习惯引用 Scaling Laws，却很少认真读这篇论文。GPT-3 只用了 Chinchilla 最优数据量的十分之一；LLaMA 3 8B 超出最优 94 倍——两个决策都是对的，只是在优化不同的目标。"
cover: "https://images.unsplash.com/photo-1782094673136-5198a372980c?w=1280&q=85&fm=jpg"
draft: false
slug: what-scaling-laws-actually-said
---

中文互联网对 Scaling Laws 的讨论，大多停在两种形态之间：一种是"算力决定一切"的战略叙事，一种是"大力出奇迹"的调侃。这两种叙事都从论文里提取了真实的观察，但都跳过了论文实际说的东西。

这不是偶然的。Kaplan 等人 2020 年的原始论文是一篇实证工作，核心内容是三条幂律曲线的参数估计，以及由此推出的最优算力分配建议。它的价值在工程细节里，不在标题里。而这类工程细节，在中文 AI 讨论里有系统性的欠表达——大多数讨论以应用层为核心，而原文结论要求一定的统计学背景才能正确解读。

这篇文章做一件具体的事：把论文说了什么、没说什么、后来被修正的部分，分开讲清楚。

---

## 论文实际测量了什么

Kaplan 等人训练了超过 200 个 Transformer 模型，计算量从 10^18 到 10^23 FLOPs，横跨七个数量级。每组实验固定其他变量，只改变一个因素，然后拟合幂律曲线。

结果是三条干净的关系：

**按参数量扩展**：L(N) ≈ (N_c / N)^{0.076}。把参数量翻 10 倍，交叉熵损失降低约 17%。

**按数据量扩展**：L(D) ≈ (D_c / D)^{0.095}。把训练 token 数翻 10 倍，损失降低约 22%。

**按总算力扩展**：L(C_min) ≈ (C_c / C_min)^{0.050}。把总算力翻 10 倍，损失降低约 11%。

这三个幂律指数都很小——这是结论的关键。它同时说明了两件事：扩展确实有效，损失在七个数量级范围内平滑下降，没有出现悬崖；但扩展没有奇迹，指数级的算力投入换来的是对数级的性能提升。

论文同时给出了给定算力预算 C 下的最优参数量估计：N_opt ∝ C^{0.73}。这个指数大于 0.5，含义是：当算力增加时，应该把更大比例分给参数，而不是数据。这是 Kaplan 2020 给出的核心工程建议，GPT-3 大致遵循了它——175B 参数，仅训练 ~300B tokens，每个参数约 1.7 个 token。

---

## Kaplan vs Chinchilla：两年后同一问题的不同答案

2022 年，DeepMind 的 Hoffmann 等人重新做了这个实验，得出了不同的结论。

Chinchilla 论文训练了超过 400 个模型，从三种独立方法拟合最优参数量。三种方法收敛到同一个结论：**N_opt ∝ C^{0.50}**，即参数量和数据量应该以相同比例扩展。经验法则：每个参数对应约 20 个训练 token。

这直接修正了 Kaplan 的建议。

| 模型 | 参数量 | 训练 Tokens | Tokens / 参数 |
|------|--------|------------|--------------|
| GPT-3 | 175B | ~300B | ~1.7 |
| Chinchilla | 70B | 1.4T | 20 |

在 Chinchilla 的框架下，GPT-3 严重训练不足。175B 参数按 20 tokens/param 计算，需要 3.5T tokens 才达到计算最优——GPT-3 实际只用了 300B，不到最优的十分之一。

两篇论文为什么得出不同结论？关键在方法论。Kaplan 的实验在固定训练步数下比较不同规模的模型，没有为每个规模充分调整学习率调度。Chinchilla 的实验在固定 FLOPs 下让模型训练到真正收敛后比较。前者系统性地低估了数据对最终损失的贡献。

---

## Chinchilla 陷阱

Chinchilla 的结论被广泛接受之后，行业出现了一个有意思的现象：最受关注的开源模型大多忽略了它。

LLaMA 3 8B 用 15T tokens 训练，每参数 1,875 个 token。Chinchilla 最优建议是 8B × 20 = 160B tokens。LLaMA 3 8B 实际使用了约 **94 倍**于 Chinchilla 最优的数据量。这不是疏漏，是有意为之的工程决策。

| 模型 | 参数量 | 训练 Tokens | Tokens / 参数 | 相较 Chinchilla 最优 |
|------|--------|------------|--------------|---------------------|
| Chinchilla（最优基准）| 70B | 1.4T | 20 | 1× |
| LLaMA 3 8B | 8B | 15T | 1,875 | ~94× 过训练 |
| LLaMA 3 70B | 70B | 15T | 214 | ~11× 过训练 |

理解这个决策，需要看清 Chinchilla 优化的是什么：**给定算力预算，最小化最终损失**。隐含假设是你只训练这个模型一次，然后用同等规模的模型做推理。

现实的推理经济学不是这样运作的。一个 70B 模型每个 token 的推理成本大约是 8B 模型的 9 倍。如果你把一个 8B 模型过度训练到 LLaMA 3 的程度，你付出了更高的一次性训练成本，但接下来每一次生产推理的成本都大幅降低。在数百万次每日请求的规模下，服务成本的差值远超训练成本的差值。

Chinchilla 优化的是训练效率。LLaMA 3 8B 优化的是部署效率。这是两个不同的问题，理应有不同的答案。

---

## 论文预测不了的东西

Scaling Laws 建立的是损失的幂律关系。损失是一个有用的代理指标，但它不等于能力。两个重要的限制：

**能力涌现（Emergent Abilities）**。Wei 等人 2022 年记录了一类现象：某些任务能力在模型规模低于某个阈值时几乎为零，越过阈值后突然出现。这种不连续的相变，在幂律框架里没有对应的描述——幂律只能描述平滑下降，不能预测跳变。多数观察到的涌现集中在 10^22 到 10^23 FLOPs 的总训练算力附近。

**不同能力的不同扩展曲线**。整体损失曲线是平滑的，具体任务的性能曲线千差万别。数学推理和代码生成的扩展行为与自然语言理解不同，对话能力和长上下文理解的扩展曲线也不相同。把"损失在下降"等同于"所有能力在同步进步"是一个常见的误读。

---

## 新的扩展轴：推理时算力

Kaplan 2020 定义的扩展，发生在预训练阶段。2024 年之后，这个框架开始不够用了。

OpenAI o1 和 DeepSeek R1 引入了一个新的扩展维度：**推理时算力（inference-time compute）**。这类模型在推理阶段花费更多计算，通过内部思维链的生成和验证来提升输出质量，而不是通过增加训练参数量。Snell 等人 2024 年的研究表明，对于许多任务，最优分配的推理时算力可以优于简单扩大模型参数量。

这是 Scaling Laws 论文框架里完全没有的一个轴。预训练算力的扩展和推理算力的扩展，有不同的成本结构、不同的适用场景、不同的饱和点。目前还没有 Kaplan 2020 那样被广泛接受的幂律估计，但它是主动讨论中的前沿。

---

## 它仍然是对的部分

在 Chinchilla 的修正、LLaMA 3 的部署最优过训练、推理时扩展律之后——Kaplan 2020 的核心主张仍然成立：

模型损失是参数量、数据量、算力的平滑可预测函数，在多个数量级上成幂律关系。

这不是平凡的结论。它意味着你可以在小规模实验上训练模型、测量损失曲线，然后可靠地外推大规模训练的预期结果——这在 2020 年之前并不被认为是可信的做法。扩展定律把 LLM 开发从"花钱期待奇迹"变成了"可以规划和预测的工程"。

"扩展什么"、"为什么目标扩展"，是在 2020 年基础上持续被修订的问题。扩展本身有效，这一点没有被推翻。

---

## 参考文献

1. Kaplan, J., McCandlish, S., Henighan, T., Brown, T. B., Chess, B., Child, R., ... & Amodei, D. (2020). *Scaling Laws for Neural Language Models*. arXiv:2001.08361.

2. Hoffmann, J., Borgeaud, S., Mensch, A., Buchatskaya, E., Cai, T., Rutherford, E., ... & Sifre, L. (2022). *Training Compute-Optimal Large Language Models*. arXiv:2203.15556.

3. Wei, J., Tay, Y., Bommasani, R., Raffel, C., Zoph, B., Borgeaud, S., ... & Fedus, W. (2022). *Emergent Abilities of Large Language Models*. *Transactions on Machine Learning Research*. arXiv:2206.07682.

4. Meta AI. (2024). *The Llama 3 Herd of Models*. arXiv:2407.21783.

5. Snell, C., Lee, J., Xu, K., & Kumar, A. (2024). *Scaling LLM Test-Time Compute Optimally is More Effective than Scaling Model Parameters*. arXiv:2408.03314.

6. Hagele, A., Flux, M., & Schölkopf, B. (2024). *Scaling Laws and Compute-Optimal Training Beyond Fixed Training Durations*. arXiv:2405.18392.
