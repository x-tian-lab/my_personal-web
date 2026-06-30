---
title: "Attention Is All You Need, Eight Years Later"
date: 2026-06-30
lang: en
tags: [transformer, deep-learning, AI-architecture, retrospective]
description: "180,000 citations and eight years later, re-reading the original reveals something surprising: two wrong predictions, one spectacularly lucky bet, and several structural problems quietly left unresolved."
heroImage: "images/hero.jpg"
heroImageAlt: "Nvidia RTX 2060 GPU close-up"
heroImageCredit: "Photo by Christian Wiediger on Unsplash"
draft: false
slug: attention-is-all-you-need-eight-years-later
primary_keyword: "Attention Is All You Need retrospective"
secondary_keywords: ["transformer architecture limitations 2025", "Vaswani Essential AI", "post-transformer era", "attention mechanism critique"]
schema_type: TechArticle
---

"Attention Is All You Need" turns eight this June. The citation count has crossed 180,000 — a number that is itself a kind of spectacle, since most papers never reach 1,000 in their lifetime.

I went back and read the original paper again recently. Not because I hadn't read it — I had — but because I wanted to answer a specific question: which of its judgments were genuine insight, which were lucky accidents, and which problems did it leave open that we still haven't solved cleanly?

The answer was not quite what I expected.

---

## What It Was Actually Trying to Solve

The context in 2017: RNNs and LSTMs were the standard answer for sequence modeling, but they had two structural problems.

First, sequential computation. RNNs process sequences one step at a time — no parallelism, which meant slow training and hard scaling. Second, weak long-range dependencies. The longer the sequence, the more early-context information gets diluted. Gradient vanishing wasn't a bug; it was built into the architecture.

The paper's core bet was simple: **attention isn't a patch on RNNs — it's a replacement.** Strip the recurrence entirely from both encoder and decoder. Use only attention.

This judgment was validated across the entire field within two years. BERT, GPT-2, then GPT-3. Ilya Sutskever later said that when he read this paper, he immediately knew "this is everything we need" — and OpenAI abandoned its RNN work entirely.

On this core claim, the paper won. Decisively.

---

## What It Got Right — Including What It Didn't Anticipate

There's a line in the paper that often gets overlooked:

> "The Transformer allows for significantly more parallelization."

At the time, this was a statement about training efficiency. What it actually unlocked was scale. Parallel computation → more data → more parameters → the Scaling Laws era becomes possible. The paper didn't predict this path, but it built the road.

The more counterintuitive point: the architectural minimalism of Transformers turned out to be a feature. Unlike CNNs (which assume locality) or RNNs (which assume sequential order), Transformers have almost no inductive bias. They let the model learn structure from data. When you have enough data, this is a dominant strategy.

Vaswani himself has said that ChatGPT felt like "a clear landmark" — but it wasn't what he was imagining when he wrote the paper. His original vision was a unified multimodal model, something like the way the human brain integrates different inputs. The path that led to ChatGPT was taken by other people.

---

## What It Didn't Say — But Later Became Critical

**Positional encoding is the weakest part of the paper.**

The original used sinusoidal positional encoding — sufficient in 2017, but it doesn't generalize to longer sequences and has poor relative position sensitivity. Over eight years this component has been replaced almost universally: RoPE, ALiBi, YaRN. Not patched. Replaced. The core mechanism for how models understand position, rebuilt from scratch.

**The KV cache problem doesn't exist in the paper — because the paper didn't need to solve it.**

The 2017 architecture was encoder-decoder for machine translation, where inputs and outputs are both known at inference time. Autoregressive generation — where you produce one token at a time, caching all previous K/V pairs — came later, with GPT. At 1M-token context lengths, the KV cache is now the primary VRAM bottleneck, spawning an entire technical lineage: FlashAttention, MLA, PagedAttention. None of this was conceivable in 2017 because no one was doing autoregressive generation at scale.

**Emergence was not predicted.**

There is no description in the paper of scale producing qualitative phase transitions. The path from BERT to GPT-3 to GPT-4 — where quantitative changes in parameters produced qualitative changes in capability — happened entirely outside the paper's framework. Scaling Laws were only systematized by Kaplan et al. in 2020.

---

## What It Left Unresolved

**The quadratic complexity of attention is a structural problem, not an engineering one.**

$O(n^2)$ is self-attention's original sin. Double the sequence length, quadruple the compute. Eight years of solutions: FlashAttention optimizes at the IO level, MLA compresses at the storage level, linear attention approximates mathematically. None solve the problem. They route around it at different layers.

**Transformers have a theoretical ceiling on sequential reasoning.**

Formal analysis shows that log-precision Transformers are confined to the TC⁰ complexity class — they cannot reliably solve problems with strict sequential dependencies. There's a class of computation that standard Transformers cannot handle well regardless of parameter count. Current models work around this with various techniques, but the ceiling is real and it's architectural.

---

## Why the Post-Transformer Era Hasn't Arrived Yet

When Mamba dropped in 2023, "Transformers are being replaced" became a credible thesis. State Space Models with linear complexity looked theoretically superior.

By 2025, the benchmarks told a more complicated story. Pure Mamba architectures consistently underperform comparably-sized Transformers on associative recall and in-context learning. SSMs have their own version of the "illusion of state" — theoretically linear, but similarly limited on long-range dependencies in practice.

The current consensus: hybrid architectures, mostly linear SSM layers with a small fraction of attention retained (roughly 1-in-8 or 1-in-10). Gated Attention, Best Paper at NeurIPS 2025, is where serious research has landed.

Transformers aren't dead. But they aren't the endpoint either.

---

## The Most Counterintuitive Thing

Ashish Vaswani — first author on "Attention Is All You Need" — now leads Essential AI. His most consistent public message: pure parameter scaling is no longer sufficient, and architectural innovation is the real frontier.

The person who wrote Transformers is among the most vocal advocates for moving beyond them.

This isn't contradiction. It's how science normally works. But it's worth sitting with: the paper that defined an era was written by people who understood exactly where it would run out.

---

## The Last Sentence of the Abstract

> "We achieve a new state of the art on English-to-German and English-to-French newstest2014 by more than 2 BLEU."

The paper that reoriented an entire field ends its abstract with a +2 BLEU improvement on a translation benchmark.

Nobody in 2017 knew what this was the beginning of.

---

<!-- SOURCES
- https://arxiv.org/abs/1706.03762
- https://blogs.nvidia.com/blog/gtc-2024-transformer-ai-research-panel-jensen/
- https://hub.baai.ac.cn/view/46494
- https://www.askaibrain.com/en/posts/end-of-transformers-hybrids-attention-state-space-2025/
- https://nextomoro.com/ashish-vaswani/
-->
