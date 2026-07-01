#!/usr/bin/env node
/**
 * build-blog.js  —  FT-style editorial blog generator
 * cover 图片来自 frontmatter 的 cover: 字段（由写作 pipeline 自动填入）
 * 运行: node scripts/build-blog.js
 */

const fs   = require('fs');
const path = require('path');

let marked;
try { marked = require('marked').marked; }
catch { console.error('❌  请先运行: npm install'); process.exit(1); }

const ROOT        = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const BLOG_DIR    = path.join(ROOT, 'blog');

// ── 工具 ──────────────────────────────────────────────────────────────────────
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: {}, content: raw };
  const data = {};
  m[1].split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon < 0) return;
    const k = line.slice(0, colon).trim();
    let v = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    if (v.startsWith('[') && v.endsWith(']'))
      v = v.slice(1,-1).split(',').map(s => s.trim().replace(/^["']|["']$/g,'')).filter(Boolean);
    data[k] = v;
  });
  return { data, content: m[2] };
}

function fmtDate(dateStr, lang) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return lang === 'zh'
    ? `${d.getFullYear()} 年 ${d.getMonth()+1} 月 ${d.getDate()} 日`
    : d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
}

function readingTime(text, lang) {
  const wpm = lang === 'zh' ? 400 : 220;
  const words = lang === 'zh' ? text.length : text.trim().split(/\s+/).length;
  return lang === 'zh' ? `${Math.max(1,Math.round(words/wpm))} 分钟` : `${Math.max(1,Math.round(words/wpm))} min read`;
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function addDropCap(html) { return html.replace('<p>', '<p class="ft-drop">'); }

// ── 图片 HTML 片段 ─────────────────────────────────────────────────────────────
// cover: 真实图片 URL（frontmatter 提供）或渐变占位
function imgBox(coverUrl, tag, style='') {
  if (coverUrl) {
    return `<div style="position:relative;overflow:hidden;${style}">
      <img src="${coverUrl}" alt="${tag}" style="width:100%;height:100%;object-fit:cover;display:block;">
    </div>`;
  }
  return `<div style="position:relative;background:linear-gradient(135deg,#c98f5e,#7c4f2c);overflow:hidden;${style}">
    <div style="position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 4px);"></div>
    <span style="position:absolute;left:16px;bottom:12px;font:400 9.5px 'Space Mono',monospace;letter-spacing:.1em;color:rgba(255,241,229,.72);">PHOTO · ${tag}</span>
  </div>`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500;1,6..72,600&family=Space+Mono:wght@400;700&family=Noto+Serif+SC:wght@400;500;600&display=swap" rel="stylesheet">`;

const CSS_BASE = `
  :root{--accent:#b5692a;--paper:#fff1e5;--ink:#2a2018;--muted:#8a7763;--line:#ecd9c4;--lineS:#c9b295;}
  *{box-sizing:border-box;} html{scroll-behavior:smooth;}
  body{margin:0;background:var(--paper);color:var(--ink);font-family:'Newsreader','Noto Serif SC',Georgia,serif;}
  a{color:inherit;text-decoration:none;transition:color .2s;} a:hover{color:var(--accent);}`;

// ── 文章页 ────────────────────────────────────────────────────────────────────
function articleHtml({ title, description, date, tags, lang, slug, coverUrl, bodyHtml, readTime, allPosts }) {
  const tagList   = Array.isArray(tags) ? tags : [tags].filter(Boolean);
  const tag1      = tagList[0] || '';
  const otherLang = lang === 'zh' ? 'en' : 'zh';
  const isZh      = lang === 'zh';
  const dateStr   = fmtDate(date, lang);

  const labels = {
    back:       isZh ? '← 返回博客'          : '← All posts',
    pub:        isZh ? '技术手记'             : 'FIELD NOTES',
    by:         isZh ? '文'                   : 'By',
    author:     isZh ? '吴晓天'               : 'Theo Wu',
    authorBio:  isZh ? 'AI · 前端 · 数据'    : 'AI · Frontend · Data',
    subTitle:   isZh ? '喜欢这篇文章？'       : 'Enjoy this piece?',
    subSub:     isZh ? '新文章第一时间送达'   : 'New posts delivered first',
    subBtn:     isZh ? '订阅'                 : 'Subscribe',
    relLabel:   isZh ? '相关文章'             : 'MORE FROM THE BLOG',
    foot:       isZh ? '吴晓天 出品 — 个人网站子站' : 'Built by Theo Wu — a sub-site of the portfolio',
    infoLabel:  isZh ? '📊 内容可视化'        : '',
  };

  const related = allPosts
    .filter(p => p.slug !== slug && p.lang === lang)
    .sort((a,b) => {
      const at = (Array.isArray(a.tags)?a.tags:[a.tags]).includes(tag1)?-1:0;
      const bt = (Array.isArray(b.tags)?b.tags:[b.tags]).includes(tag1)?-1:0;
      return at-bt || b.date.localeCompare(a.date);
    }).slice(0,3);

  const relHtml = related.map(p => {
    const pt = Array.isArray(p.tags)?p.tags:[p.tags];
    return `<a href="/blog/${p.slug}/${p.lang}/" style="display:flex;flex-direction:column;">
      ${imgBox(p.coverUrl, pt[0]||'', 'width:100%;aspect-ratio:3/2;margin-bottom:14px;')}
      <div style="font:700 10px 'Space Mono',monospace;letter-spacing:.14em;color:var(--accent);text-transform:uppercase;margin-bottom:8px;">${pt[0]||''}</div>
      <h3 style="margin:0 0 9px;font:600 20px/1.2 'Newsreader','Noto Serif SC',serif;">${p.title}</h3>
      <div style="margin-top:auto;font:400 10px 'Space Mono',monospace;color:var(--muted);text-transform:uppercase;">${fmtDate(p.date,lang)}</div>
    </a>`;
  }).join('');

  // 检查是否有信息图（仅中文）
  const hasInfographic = isZh && fs.existsSync(path.join(CONTENT_DIR, slug, 'zh-infographic.html'));
  const infoBlock = hasInfographic ? `
  <div style="max-width:780px;margin:48px auto 0;padding:0 28px;">
    <div style="font:700 11px 'Space Mono',monospace;letter-spacing:.16em;color:var(--ink);text-transform:uppercase;display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <span>${labels.infoLabel}</span><span style="flex:1;height:1px;background:var(--line);"></span>
    </div>
    <iframe src="./infographic.html" style="width:100%;min-height:640px;border:1px solid var(--line);border-radius:8px;" frameborder="0" loading="lazy"></iframe>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="${isZh?'zh-Hans':'en'}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ${labels.pub}</title>
${FONTS}
<style>
${CSS_BASE}
.util-bar{display:flex;align-items:center;justify-content:space-between;padding:9px 36px;
  border-bottom:1px solid var(--line);font:400 10.5px 'Space Mono',monospace;letter-spacing:.08em;
  color:var(--muted);position:sticky;top:0;background:var(--paper);z-index:30;}
.lang-sw{display:flex;font:700 10px 'Space Mono',monospace;border:1px solid var(--lineS);border-radius:30px;overflow:hidden;}
.lang-sw a,.lang-sw span{padding:4px 11px;cursor:pointer;transition:.2s;}
.lang-sw .on{background:var(--accent);color:#fff1e5;} .lang-sw .off{color:#7a6a56;}
.masthead{text-align:center;padding:18px 36px 16px;border-bottom:2px solid var(--ink);}
.art-head{max-width:760px;margin:0 auto;padding:48px 28px 26px;text-align:center;}
.art-h1{margin:0 0 24px;font:600 clamp(34px,5vw,58px)/1.05 'Newsreader','Noto Serif SC',serif;letter-spacing:-.025em;}
.art-stand{margin:0 auto 28px;max-width:600px;font:400 21px/1.5 'Newsreader','Noto Serif SC',serif;font-style:italic;color:var(--muted);}
.art-byline{display:flex;align-items:center;justify-content:center;gap:13px;font:400 11px 'Space Mono',monospace;
  letter-spacing:.06em;color:var(--muted);text-transform:uppercase;padding-bottom:22px;border-bottom:1px solid var(--line);}
.hero-wrap{max-width:980px;margin:0 auto 14px;padding:0 28px;}
.hero-inner{position:relative;width:100%;aspect-ratio:21/9;overflow:hidden;}
.ft-body{max-width:680px;margin:0 auto;padding:34px 28px 20px;}
.ft-body p{margin:0 0 22px;font:400 19px/1.72 'Newsreader','Noto Serif SC',serif;}
.ft-drop::first-letter{float:left;font:600 76px/0.74 'Newsreader',serif;padding:8px 12px 0 0;color:var(--accent);}
.ft-body h2{margin:38px 0 18px;font:600 clamp(24px,2.4vw,30px)/1.2 'Newsreader','Noto Serif SC',serif;letter-spacing:-.01em;}
.ft-body h3{margin:28px 0 12px;font:600 22px 'Newsreader','Noto Serif SC',serif;color:var(--accent);}
.ft-body blockquote{margin:40px 0;padding:6px 0 6px 26px;border-left:3px solid var(--accent);}
.ft-body blockquote p{margin:0;font:500 italic 27px/1.3 'Newsreader','Noto Serif SC',serif;}
.ft-body a{color:var(--accent);border-bottom:1px solid rgba(181,105,42,.3);}
.ft-body code{font-family:'Space Mono',monospace;font-size:.83em;background:rgba(181,105,42,.1);padding:2px 6px;border-radius:3px;color:var(--accent);}
.ft-body pre{background:#f5e9d8;border:1px solid var(--line);border-radius:6px;padding:20px 24px;overflow-x:auto;margin:1.6em 0;}
.ft-body pre code{background:none;padding:0;color:var(--ink);font-size:.82em;line-height:1.7;}
.ft-body ul,.ft-body ol{padding-left:1.5em;margin:0 0 22px;}
.ft-body li{margin-bottom:.4em;font:400 19px/1.6 'Newsreader','Noto Serif SC',serif;}
.byline-foot{margin-top:40px;padding-top:22px;border-top:1px solid var(--line);display:flex;align-items:center;gap:14px;}
.byline-avatar{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#c98f5e,#7c4f2c);flex:none;}
.sub-band{max-width:680px;margin:30px auto 0;padding:0 28px;}
.sub-inner{border:1px solid var(--lineS);border-radius:10px;padding:26px 28px;background:rgba(181,105,42,.04);
  display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.sub-btn{display:inline-flex;align-items:center;padding:13px 22px;border-radius:9px;background:var(--accent);
  color:#fff1e5;font:700 12px 'Space Mono',monospace;letter-spacing:.05em;cursor:pointer;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.38),0 3px 7px -1px rgba(0,0,0,.22);}
.related{max-width:980px;margin:48px auto 0;padding:0 28px 50px;}
.related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:34px 30px;margin-top:20px;}
.ft-footer{border-top:1px solid var(--ink);padding:16px 36px;display:flex;align-items:center;
  justify-content:space-between;flex-wrap:wrap;gap:12px;font:400 10.5px 'Space Mono',monospace;
  letter-spacing:.06em;color:var(--muted);text-transform:uppercase;}
@media(max-width:680px){
  .util-bar{padding:9px 16px;} .art-head{padding:32px 16px 20px;}
  .ft-body,.sub-band{padding-left:16px;padding-right:16px;} .hero-wrap{padding:0 16px;}
  .related{padding:0 16px 40px;} .related-grid{grid-template-columns:1fr;} .ft-footer{padding:16px;}
}
</style>
</head>
<body>
<div class="util-bar">
  <a href="/blog/">${labels.back}</a>
  <span>${dateStr}</span>
  <div class="lang-sw">
    <span class="on">${isZh?'中':'EN'}</span>
    <a href="/blog/${slug}/${otherLang}/" class="off">${isZh?'EN':'中'}</a>
  </div>
</div>
<div class="masthead">
  <a href="/blog/" style="font:600 26px/1 'Newsreader','Noto Serif SC',serif;letter-spacing:-.01em;">${labels.pub}</a>
</div>
<div class="art-head">
  <div style="font:700 11px 'Space Mono',monospace;letter-spacing:.2em;color:var(--accent);text-transform:uppercase;margin-bottom:22px;">${tag1}</div>
  <h1 class="art-h1">${title}</h1>
  ${description?`<p class="art-stand">${description}</p>`:''}
  <div class="art-byline">
    <span style="color:var(--ink);">${labels.by} ${labels.author}</span>
    <span>·</span><span>${dateStr}</span><span>·</span><span>${readTime}</span>
  </div>
</div>
<div class="hero-wrap">
  <div class="hero-inner">${imgBox(coverUrl, tag1, 'width:100%;height:100%;')}</div>
</div>
<div class="ft-body">
${addDropCap(bodyHtml)}
  <div class="byline-foot">
    <div class="byline-avatar"></div>
    <div>
      <div style="font:600 16px 'Newsreader','Noto Serif SC',serif;">${labels.author}</div>
      <div style="font:400 11px 'Space Mono',monospace;color:var(--muted);letter-spacing:.04em;margin-top:3px;">${labels.authorBio}</div>
    </div>
  </div>
</div>
${infoBlock}
<div class="sub-band">
  <div class="sub-inner">
    <div style="flex:1;min-width:220px;">
      <div style="font:600 19px/1.25 'Newsreader','Noto Serif SC',serif;margin-bottom:5px;">${labels.subTitle}</div>
      <div style="font:400 12px 'Space Mono',monospace;color:var(--muted);">${labels.subSub}</div>
    </div>
    <span class="sub-btn">${labels.subBtn} →</span>
  </div>
</div>
${related.length?`<div class="related">
  <div style="font:700 11px 'Space Mono',monospace;letter-spacing:.16em;color:var(--ink);text-transform:uppercase;display:flex;align-items:center;gap:14px;">
    <span>${labels.relLabel}</span><span style="flex:1;height:1px;background:var(--line);"></span>
  </div>
  <div class="related-grid">${relHtml}</div>
</div>`:''}
<div class="ft-footer">
  <span>${labels.foot}</span>
  <a href="/blog/">${labels.back}</a>
</div>
</body></html>`;
}

// ── 列表页 ────────────────────────────────────────────────────────────────────
function listingHtml(posts) {
  const sorted = [...posts].sort((a,b) => b.date.localeCompare(a.date));
  const slugMap = {};
  for (const p of sorted) { if(!slugMap[p.slug]) slugMap[p.slug]={}; slugMap[p.slug][p.lang]=p; }
  const articles = Object.values(slugMap).map(v=>v.zh||v.en).sort((a,b)=>b.date.localeCompare(a.date));

  const lead = articles[0];
  const secondary = articles.slice(1,7);

  const leadHtml = lead ? (() => {
    const lt = Array.isArray(lead.tags)?lead.tags:[lead.tags];
    const imgStyle = 'min-height:440px;';
    return `<div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--ink);">
      <div style="padding:46px 40px 48px;display:flex;flex-direction:column;justify-content:center;">
        <div style="font:700 11px 'Space Mono',monospace;letter-spacing:.18em;color:var(--accent);text-transform:uppercase;margin-bottom:18px;">头条 · ${lt[0]||''}</div>
        <a href="/blog/${lead.slug}/zh/">
          <h1 style="margin:0 0 22px;font:600 clamp(40px,4.8vw,62px)/1.0 'Newsreader','Noto Serif SC',serif;letter-spacing:-.025em;">${lead.title}</h1>
        </a>
        ${lead.description?`<p style="margin:0 0 26px;font:400 18px/1.6 'Newsreader','Noto Serif SC',serif;color:var(--muted);max-width:460px;">${lead.description}</p>`:''}
        <div style="display:flex;align-items:center;gap:14px;font:400 11px 'Space Mono',monospace;letter-spacing:.06em;color:var(--muted);text-transform:uppercase;">
          <span style="color:var(--ink);">文 吴晓天</span><span>·</span><span>${fmtDate(lead.date,'zh')}</span>
        </div>
      </div>
      <a href="/blog/${lead.slug}/zh/" style="display:block;text-decoration:none;">
        ${imgBox(lead.coverUrl, lt[0]||'', imgStyle)}
      </a>
    </div>`;
  })() : `<div style="padding:60px;text-align:center;color:var(--muted);font:400 13px 'Space Mono',monospace;">还没有文章</div>`;

  const secHtml = secondary.map(a => {
    const at = Array.isArray(a.tags)?a.tags:[a.tags];
    return `<a href="/blog/${a.slug}/zh/" style="display:flex;flex-direction:column;text-decoration:none;">
      ${imgBox(a.coverUrl, at[0]||'', 'width:100%;aspect-ratio:3/2;margin-bottom:14px;')}
      <div style="font:700 10px 'Space Mono',monospace;letter-spacing:.14em;color:var(--accent);text-transform:uppercase;margin-bottom:8px;">${at[0]||''}</div>
      <h3 style="margin:0 0 9px;font:600 21px/1.16 'Newsreader','Noto Serif SC',serif;">${a.title}</h3>
      ${a.description?`<p style="margin:0 0 12px;font:400 14px/1.5 'Newsreader','Noto Serif SC',serif;color:var(--muted);">${a.description}</p>`:''}
      <div style="margin-top:auto;font:400 10px 'Space Mono',monospace;color:var(--muted);text-transform:uppercase;">${fmtDate(a.date,'zh')}</div>
    </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-Hans"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>技术手记 — Theo Wu</title>
${FONTS}
<style>
${CSS_BASE}
.util-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 36px;
  border-bottom:1px solid var(--line);font:400 10.5px 'Space Mono',monospace;letter-spacing:.08em;color:var(--muted);}
.lang-sw{display:flex;font:700 10px 'Space Mono',monospace;border:1px solid var(--lineS);border-radius:30px;overflow:hidden;}
.lang-sw a,.lang-sw span{padding:4px 11px;cursor:pointer;transition:.2s;text-decoration:none;}
.lang-sw .on{background:var(--accent);color:#fff1e5;} .lang-sw .off{color:#7a6a56;}
.sec-nav{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;padding:12px 36px;
  border-bottom:2px solid var(--ink);font:700 12px 'Space Mono',monospace;letter-spacing:.12em;text-transform:uppercase;}
.sec-nav a{padding:0 19px;border-right:1px solid var(--line);color:var(--muted);}
.sec-nav a:hover{color:var(--accent);}
.latest-hd{font:700 11px 'Space Mono',monospace;letter-spacing:.16em;color:var(--ink);text-transform:uppercase;
  margin-bottom:24px;display:flex;align-items:center;gap:14px;}
.ft-footer{border-top:1px solid var(--ink);padding:16px 36px;display:flex;align-items:center;
  justify-content:space-between;flex-wrap:wrap;gap:12px;font:400 10.5px 'Space Mono',monospace;
  letter-spacing:.06em;color:var(--muted);text-transform:uppercase;}
@media(max-width:700px){
  .lead-grid{grid-template-columns:1fr!important;} .lead-img{min-height:220px!important;}
  .sec-grid{grid-template-columns:1fr!important;}
  .util-bar,.ft-footer,.sec-area{padding-left:16px!important;padding-right:16px!important;}
  .masthead-wrap,.sec-nav{padding-left:16px;padding-right:16px;}
}
</style>
</head><body>
<div class="util-bar">
  <a href="https://portfoilo.xiaotian.sbs/" style="display:flex;align-items:center;gap:6px;">← 返回主页</a>
  <div style="display:flex;align-items:center;gap:16px;">
    <span>${new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'})}</span>
    <div class="lang-sw"><span class="on">中</span><a href="#" class="off">EN</a></div>
  </div>
</div>
<div class="masthead-wrap" style="text-align:center;padding:30px 36px 18px;border-bottom:1px solid var(--ink);max-width:1160px;margin:0 auto;">
  <div style="font:400 11px 'Space Mono',monospace;letter-spacing:.3em;color:var(--accent);margin-bottom:13px;text-transform:uppercase;">关于 AI · 前端 · 数据的札记</div>
  <div style="font:600 clamp(42px,6.2vw,74px)/0.92 'Newsreader','Noto Serif SC',serif;letter-spacing:-.02em;">技术手记</div>
</div>
<div class="sec-nav" style="max-width:1160px;margin:0 auto;">
  ${['AI','前端','数据','札记'].map(s=>`<a href="#">${s}</a>`).join('')}
</div>
<div style="max-width:1160px;margin:0 auto;">
  ${leadHtml}
  ${secondary.length?`<div class="sec-area" style="padding:30px 36px 42px;">
    <div class="latest-hd"><span>最新</span><span style="flex:1;height:1px;background:var(--line);"></span></div>
    <div class="sec-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:34px 30px;">${secHtml}</div>
  </div>`:''}
  <div class="ft-footer">
    <span>吴晓天 出品 — 个人网站的子站</span>
    <a href="https://portfoilo.xiaotian.sbs/">← 返回主页</a>
  </div>
</div>
</body></html>`;
}

// ── 主构建 ────────────────────────────────────────────────────────────────────
function build() {
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true });
  ensureDir(BLOG_DIR);

  const slugs = fs.readdirSync(CONTENT_DIR)
    .filter(n => fs.statSync(path.join(CONTENT_DIR,n)).isDirectory());

  const allPosts = [];
  for (const slug of slugs) {
    for (const lang of ['zh','en']) {
      const file = path.join(CONTENT_DIR, slug, `${lang}.md`);
      if (!fs.existsSync(file)) continue;
      const { data, content } = parseFrontmatter(fs.readFileSync(file,'utf-8'));
      if (data.draft === 'true') continue;
      allPosts.push({
        slug, lang,
        title:       data.title || slug,
        description: data.description || '',
        date:        data.date || slug.slice(0,10),
        tags:        data.tags || [],
        coverUrl:    data.cover || '',          // ← Unsplash URL，由写作 pipeline 填入
        readTime:    readingTime(content, lang),
      });
    }
  }

  for (const meta of allPosts) {
    const file = path.join(CONTENT_DIR, meta.slug, `${meta.lang}.md`);
    const { content } = parseFrontmatter(fs.readFileSync(file,'utf-8'));
    const bodyHtml = marked(content, { breaks:false, gfm:true });
    const html = articleHtml({ ...meta, bodyHtml, allPosts });
    const outDir = path.join(BLOG_DIR, meta.slug, meta.lang);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir,'index.html'), html, 'utf-8');

    // 拷贝信息图（如果存在）
    const infoSrc = path.join(CONTENT_DIR, meta.slug, 'zh-infographic.html');
    if (meta.lang === 'zh' && fs.existsSync(infoSrc)) {
      fs.copyFileSync(infoSrc, path.join(outDir,'infographic.html'));
      console.log(`  📊  blog/${meta.slug}/zh/infographic.html`);
    }

    console.log(`  ✅  blog/${meta.slug}/${meta.lang}/index.html`);
  }

  fs.writeFileSync(path.join(BLOG_DIR,'index.html'), listingHtml(allPosts), 'utf-8');
  console.log(`\n✅  blog/index.html`);
  console.log(`\n🎉  构建完成：${allPosts.length} 个页面（${slugs.length} 篇文章）`);
}

build();
