/**
 * assets/js/main.js — 渲染层与交互层
 * ---------------------------------------------------------------------------
 * 职责：把 data/resume.js 里的 window.RESUME_DATA 渲染成页面，并挂载轻量交互。
 * 约定：本文件不写死任何简历内容；新增项目只需编辑 data/resume.js 的数组。
 *
 * 交互清单：
 *   - 锚点导航 + 当前区块高亮（IntersectionObserver，带 scroll 兜底）
 *   - 深浅色主题切换（localStorage 记忆 + prefers-color-scheme，防闪烁前置脚本在 <head>）
 *   - 联系方式点击复制（clipboard API + execCommand 兜底，file:// 也可用）
 *   - 外链统一 target="_blank" rel="noopener noreferrer" + 角标
 *   - 命令行 Hero 打字机（prefers-reduced-motion 时一次性显示全文）
 *   - 轻量入场动画（仅在 html.js 下启用，打印 / 无 JS 时内容始终可见）
 *
 * 设计约束落地（来自 website-ui-designer 与 workbench-ui-design）：
 *   - 组件状态八件套中的 default / hover / active / focus-visible / disabled / empty
 *   - 空列表一律渲染 .empty-state 文案，不留空白
 *   - 复制反馈用行内状态文本 + toast，不使用原生 alert / confirm / prompt
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ 常量 */
  /** @type {Object<string,string>} 内联 SVG 图标，零外部图标库依赖 */
  var ICONS = {
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/></svg>',
    terminal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/></svg>'
  };

  /** 外链类型 → 中文徽标文案与语义色（语义不只靠颜色，配文字） */
  var KIND = {
    company:  { label: "官网", tone: "info" },
    product:  { label: "产品页", tone: "accent" },
    cert:     { label: "认证", tone: "purple" },
    news:     { label: "资讯", tone: "warn" },
    standard: { label: "协议", tone: "info" },
    repo:     { label: "仓库", tone: "accent" }
  };

  /** @type {Object} 全站数据引用，默认空对象，保证字段缺失时也不抛错 */
  var DATA = {};

  /* ------------------------------------------------------------------ 工具 */
  /**
   * 创建元素。统一用 DOM API，简历内容一律走 textContent，杜绝 innerHTML 注入。
   * @param {string} tag 标签名
   * @param {string=} className class
   * @param {string=} text 文本内容
   * @return {HTMLElement}
   */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = String(text); }
    return node;
  }

  /**
   * 生成内联 SVG 图标元素。
   * @param {string} name ICONS 的键
   * @param {string=} className 应用到 svg 上的 class
   * @return {Element}
   */
  function svgIcon(name, className) {
    var holder = document.createElement("span");
    holder.innerHTML = ICONS[name] || ICONS.external;
    var svg = holder.firstElementChild;
    if (!svg) { return holder; }
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (className) { svg.setAttribute("class", className); }
    return svg;
  }

  /** @param {string} text @param {string=} tone @return {HTMLElement} */
  function badge(text, tone) {
    return el("span", "badge badge--" + (tone || "neutral"), text);
  }

  /** @param {string} text @return {HTMLElement} */
  function emptyState(text) {
    return el("p", "empty-state", text || "暂无内容。");
  }

  /** @param {Array<string>=} items @return {HTMLElement} */
  function tagList(items) {
    var list = el("ul", "tag-list");
    (items || []).forEach(function (item) {
      list.appendChild(el("li", "tag", item));
    });
    return list;
  }

  /**
   * 创建外链 <a>：统一新标签页打开 + noopener/noreferrer + 外链角标 + 读屏提示。
   * @param {string} label @param {string} url @param {string=} className
   * @return {HTMLAnchorElement}
   */
  function externalLink(label, url, className) {
    var a = el("a", "ext-link" + (className ? " " + className : ""));
    a.setAttribute("href", url);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
    a.appendChild(document.createTextNode(label));
    a.appendChild(svgIcon("external", "ext-icon"));
    a.appendChild(el("span", "sr-only", "（在新标签页打开）"));
    return a;
  }

  /**
   * 创建带外链属性的按钮形态链接（用于主操作区）。
   * @param {string} label @param {string} url @param {string} kind @param {string=} iconName
   * @return {HTMLAnchorElement}
   */
  function externalButton(label, url, kind, iconName) {
    var a = el("a", "btn btn--" + (kind || "ghost"));
    a.setAttribute("href", url);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
    if (iconName) { a.appendChild(svgIcon(iconName, "btn__icon")); }
    a.appendChild(document.createTextNode(label));
    a.appendChild(svgIcon("external", "btn__icon"));
    a.appendChild(el("span", "sr-only", "（在新标签页打开）"));
    return a;
  }

  /**
   * 统一的 section 头部：eyebrow → h2（# 装饰）→ note → 渐变模块分割线。
   * @param {Object} cfg @param {string} titleId 供 section 的 aria-labelledby 引用
   * @return {HTMLElement}
   */
  function sectionHeader(cfg, titleId) {
    var head = el("div", "section-head reveal");
    if (cfg.eyebrow) { head.appendChild(el("p", "eyebrow", "// " + cfg.eyebrow)); }
    var h2 = el("h2", "section-title");
    h2.id = titleId;
    var hash = el("span", "section-hash", "#");
    hash.setAttribute("aria-hidden", "true");
    h2.appendChild(hash);
    h2.appendChild(document.createTextNode(" " + (cfg.title || "")));
    head.appendChild(h2);
    if (cfg.note) { head.appendChild(el("p", "section-note", cfg.note)); }
    var divider = el("div", "modiv");
    divider.setAttribute("aria-hidden", "true");
    head.appendChild(divider);
    return head;
  }

  /** 生成一个带标签的内容块（ul 列表）。 */
  function listBlock(label, items, extraClass) {
    var block = el("div", "project-block");
    block.appendChild(el("span", "block-label", label));
    var list = el("ul", "project-list" + (extraClass ? " " + extraClass : ""));
    (items || []).forEach(function (item) { list.appendChild(el("li", "", item)); });
    block.appendChild(list);
    return block;
  }

  /** 生成一个带标签的技术栈标签块。 */
  function stackBlock(label, items) {
    var block = el("div", "project-block");
    block.appendChild(el("span", "block-label", label));
    block.appendChild(tagList(items));
    return block;
  }

  /** 生成外链列表；links 为空时渲染空态文案。 */
  function linksBlock(label, links, emptyText) {
    var block = el("div", "project-block");
    block.appendChild(el("span", "block-label", label));
    var wrap = el("div", "link-list");
    if (!links || links.length === 0) {
      wrap.appendChild(emptyState(emptyText));
    } else {
      links.forEach(function (link) {
        var row = el("span", "link-row");
        var meta = KIND[link.kind] || { label: "外链", tone: "info" };
        row.appendChild(badge(meta.label, meta.tone));
        row.appendChild(externalLink(link.label, link.url));
        wrap.appendChild(row);
      });
    }
    block.appendChild(wrap);
    return block;
  }

  /* ------------------------------------------------------------------ 元数据 */
  function setMeta(attr, key, value) {
    if (!value) { return; }
    var node = document.querySelector("meta[" + attr + '="' + key + '"]');
    if (node) { node.setAttribute("content", value); }
  }

  /** 让 <title> 与 meta 也从数据文件取值，保持「单一数据源」。 */
  function applyMeta(site) {
    if (!site) { return; }
    if (site.title) { document.title = site.title; }
    setMeta("name", "description", site.description);
    setMeta("name", "keywords", site.keywords);
    setMeta("property", "og:title", site.title);
    setMeta("property", "og:description", site.description);
    if (site.lang) { document.documentElement.setAttribute("lang", site.lang); }
  }

  /* ------------------------------------------------------------------ 导航 */
  function renderNav() {
    var list = document.getElementById("nav-list");
    if (!list) { return; }
    (DATA.nav || []).forEach(function (item) {
      var li = el("li");
      var a = el("a", "nav-link");
      a.setAttribute("href", "#" + item.id);
      a.setAttribute("data-target", item.id);
      a.appendChild(el("span", "nav-link__index", item.index));
      a.appendChild(document.createTextNode(item.label));
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------ Hero */
  /**
   * 渲染 Hero，并把命令行输出行返回给打字机。
   * @return {Array<{type:string,text:string}>}
   */
  function renderHero() {
    var root = document.getElementById("hero-root");
    var cfg = DATA.hero || {};
    var lines = cfg.terminal || [];
    if (!root) { return lines; }

    var grid = el("div", "hero-grid twocol");
    var mainCol = el("div", "col hero-main reveal");
    var sideCol = el("div", "col hero-side reveal");

    if (cfg.status) {
      var status = el("div", "hero-status");
      status.appendChild(badge("● " + cfg.status, cfg.statusTone || "success"));
      mainCol.appendChild(status);
    }

    var h1 = el("h1", "hero-name");
    h1.id = "hero-name";
    h1.appendChild(document.createTextNode(cfg.name || ""));
    var cursorText = el("span", "hero-name__accent", "_");
    cursorText.setAttribute("aria-hidden", "true");
    h1.appendChild(cursorText);
    mainCol.appendChild(h1);

    if (cfg.handle) {
      mainCol.appendChild(el("p", "hero-handle", "@" + cfg.handle));
    }
    if (cfg.headline) { mainCol.appendChild(el("p", "hero-headline", cfg.headline)); }
    if (cfg.subline) { mainCol.appendChild(el("p", "hero-subline", cfg.subline)); }
    if (cfg.summary) { mainCol.appendChild(el("p", "hero-summary", cfg.summary)); }

    var meta = el("div", "hero-meta");
    (cfg.meta || []).forEach(function (item) {
      var span = el("span", "hero-meta__item");
      span.appendChild(svgIcon(item.icon || "code", "hero-meta__icon"));
      span.appendChild(document.createTextNode(item.text || ""));
      meta.appendChild(span);
    });
    if (meta.childNodes.length > 0) { mainCol.appendChild(meta); }

    var actions = el("div", "hero-actions");
    (cfg.actions || []).forEach(function (action) {
      if (action.external && action.url) {
        actions.appendChild(externalButton(action.label, action.url, action.kind || "primary", action.icon));
      } else {
        var btn = el("button", "btn btn--" + (action.kind || "secondary"));
        btn.type = "button";
        btn.setAttribute("data-copy", action.copy || "");
        btn.setAttribute("aria-label", action.label + "：" + (action.copy || ""));
        if (action.icon) { btn.appendChild(svgIcon(action.icon, "btn__icon")); }
        btn.appendChild(document.createTextNode(action.label));
        actions.appendChild(btn);
      }
    });
    if (actions.childNodes.length > 0) { mainCol.appendChild(actions); }

    if ((cfg.stats || []).length > 0) {
      var stats = el("div", "stats");
      (cfg.stats || []).forEach(function (item) {
        var stat = el("div", "stat");
        var value = el("span", "stat__value", item.value || "");
        stat.appendChild(value);
        if (item.unit) { value.appendChild(el("span", "stat__unit", item.unit)); }
        stat.appendChild(el("span", "stat__label", item.label || ""));
        stats.appendChild(stat);
      });
      mainCol.appendChild(stats);
    }

    /* 终端窗口（IDE 标题栏 + 命令行输出） */
    var win = el("div", "window");
    var bar = el("div", "window__bar");
    var dots = el("span", "window__dots");
    ["red", "amber", "green"].forEach(function (color) {
      var dot = el("span", "window__dot window__dot--" + color);
      dot.setAttribute("aria-hidden", "true");
      dots.appendChild(dot);
    });
    bar.appendChild(dots);
    bar.appendChild(el("span", "window__title", "~/sunxl1128/resume-blog — zsh"));
    win.appendChild(bar);

    var body = el("div", "window__body");
    var linesWrap = el("div", "terminal-lines");
    linesWrap.id = "terminal-lines";
    linesWrap.setAttribute("aria-hidden", "true");
    var cursor = el("span", "term-cursor", "▍");
    cursor.setAttribute("aria-hidden", "true");
    linesWrap.appendChild(cursor);
    body.appendChild(linesWrap);

    var sr = el("p", "terminal-sr sr-only");
    sr.id = "terminal-sr";
    sr.textContent = lines.map(function (line) { return line.text; }).join("；");
    body.appendChild(sr);
    win.appendChild(body);

    var foot = el("div", "window__foot", "// " + ((DATA.site && DATA.site.repo) || "resume-blog") + " · static site, no build step");
    win.appendChild(foot);
    sideCol.appendChild(win);

    grid.appendChild(mainCol);
    grid.appendChild(sideCol);
    root.appendChild(grid);
    return lines;
  }

  /* ------------------------------------------------------------------ 关于 */
  function renderAbout() {
    var root = document.getElementById("about-root");
    var cfg = DATA.about || {};
    if (!root) { return; }
    root.appendChild(sectionHeader(cfg, "about-title"));

    var layout = el("div", "about-layout");
    var advice = el("div", "advice reveal");
    advice.appendChild(el("span", "advice__label", cfg.positioningLabel || "个人定位"));
    advice.appendChild(el("p", "advice__text", cfg.positioning || ""));
    layout.appendChild(advice);

    var advWrap = el("div");
    advWrap.appendChild(el("span", "block-label", cfg.advantagesLabel || "个人优势"));
    var grid = el("div", "adv-grid");
    var advantages = cfg.advantages || [];
    if (advantages.length === 0) {
      grid.appendChild(emptyState("暂无优势条目。"));
    } else {
      advantages.forEach(function (item) {
        var card = el("article", "card adv-card reveal");
        card.appendChild(el("span", "adv-card__tag", item.tag || ""));
        card.appendChild(el("h3", "adv-card__title", item.title || ""));
        card.appendChild(el("p", "adv-card__desc", item.desc || ""));
        card.appendChild(tagList(item.tags));
        grid.appendChild(card);
      });
    }
    advWrap.appendChild(grid);
    layout.appendChild(advWrap);
    root.appendChild(layout);
  }

  /* ------------------------------------------------------------------ 技能栈 */
  function renderSkills() {
    var root = document.getElementById("skills-root");
    var cfg = DATA.skills || {};
    if (!root) { return; }
    root.appendChild(sectionHeader(cfg, "skills-title"));

    var grid = el("div", "skills-grid");
    var groups = cfg.groups || [];
    if (groups.length === 0) {
      grid.appendChild(emptyState("暂无技能分组。"));
    } else {
      groups.forEach(function (group) {
        var card = el("section", "card skill-group reveal");
        var head = el("div", "skill-group__head");
        head.appendChild(el("h3", "skill-group__title", group.title || ""));
        head.appendChild(el("span", "skill-group__note", group.note || ""));
        card.appendChild(head);
        var items = el("div", "skill-items");
        (group.items || []).forEach(function (item) {
          if (item.url) {
            var a = el("a", "skill-item skill-item--link");
            a.setAttribute("href", item.url);
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener noreferrer");
            a.appendChild(document.createTextNode(item.name || ""));
            a.appendChild(svgIcon("external", "ext-icon"));
            a.appendChild(el("span", "sr-only", "（在新标签页打开）"));
            items.appendChild(a);
          } else {
            items.appendChild(el("span", "skill-item", item.name || ""));
          }
        });
        card.appendChild(items);
        grid.appendChild(card);
      });
    }
    root.appendChild(grid);
  }

  /* ------------------------------------------------------------------ 工作经历 */
  function renderExperience() {
    var root = document.getElementById("experience-root");
    var cfg = DATA.experience || {};
    if (!root) { return; }
    root.appendChild(sectionHeader(cfg, "experience-title"));

    var timeline = el("div", "timeline");
    var items = cfg.items || [];
    if (items.length === 0) {
      timeline.appendChild(emptyState(cfg.emptyText));
    } else {
      items.forEach(function (job) {
        var item = el("article", "timeline-item" + (job.current ? " timeline-item--current" : "") + " reveal");
        var marker = el("span", "timeline-item__marker");
        marker.setAttribute("aria-hidden", "true");
        item.appendChild(marker);

        var card = el("div", "card timeline-card");
        var head = el("div", "timeline-card__head");
        var company = el("h3", "timeline-company");
        if (job.companyUrl) {
          company.appendChild(externalLink(job.company, job.companyUrl));
        } else {
          company.textContent = job.company || "";
        }
        head.appendChild(company);
        head.appendChild(el("span", "timeline-role", job.role || ""));
        head.appendChild(el("span", "timeline-period", job.period || ""));
        if (job.current) { head.appendChild(badge("在职", "success")); }
        card.appendChild(head);

        var duties = el("div", "project-block");
        duties.appendChild(el("span", "block-label", "核心职责"));
        duties.appendChild(el("p", "duties", job.duties || ""));
        card.appendChild(duties);

        var achievements = el("div", "project-block");
        achievements.appendChild(el("span", "block-label", "关键业绩"));
        var list = el("ol", "achievements");
        (job.achievements || []).forEach(function (text) { list.appendChild(el("li", "", text)); });
        achievements.appendChild(list);
        card.appendChild(achievements);
        card.appendChild(tagList(job.tags));

        item.appendChild(card);
        timeline.appendChild(item);
      });
    }
    root.appendChild(timeline);
  }

  /* ------------------------------------------------------------------ 项目经历 */
  function renderProjects() {
    var root = document.getElementById("projects-root");
    var cfg = DATA.projects || {};
    if (!root) { return; }
    root.appendChild(sectionHeader(cfg, "projects-title"));

    var grid = el("div", "project-grid");
    var items = cfg.items || [];
    if (items.length === 0) {
      grid.appendChild(emptyState(cfg.emptyText));
    } else {
      items.forEach(function (project) {
        var card = el("article", "card project-card reveal");
        var head = el("div", "project-card__head");
        head.appendChild(el("h3", "project-name", project.name || ""));

        var meta = el("div", "project-meta");
        meta.appendChild(el("span", "project-meta__period", project.period || ""));
        meta.appendChild(el("span", "", project.role || ""));
        if (project.status) { meta.appendChild(badge(project.status, project.statusTone || "success")); }
        head.appendChild(meta);

        if (project.summary) { head.appendChild(el("p", "project-summary", project.summary)); }
        if ((project.tags || []).length > 0) { head.appendChild(tagList(project.tags)); }
        card.appendChild(head);

        var body = el("div", "project-card__body");
        body.appendChild(listBlock("核心工作", project.highlights));
        body.appendChild(stackBlock("技术栈", project.stack));
        body.appendChild(listBlock("项目成果", project.results, "project-list--results"));
        body.appendChild(linksBlock("相关外链 · 可点击查看", project.links, cfg.linksEmptyText));
        card.appendChild(body);

        grid.appendChild(card);
      });
    }
    root.appendChild(grid);
  }

  /* ------------------------------------------------------------------ 开源实践 */
  function renderOpenSource() {
    var root = document.getElementById("opensource-root");
    var cfg = DATA.opensource || {};
    if (!root) { return; }
    root.appendChild(sectionHeader(cfg, "opensource-title"));

    var grid = el("div", "repo-grid");
    var items = cfg.items || [];
    if (items.length === 0) {
      grid.appendChild(emptyState(cfg.emptyText));
    } else {
      items.forEach(function (repo) {
        var a = el("a", "card repo-card reveal");
        a.setAttribute("href", repo.url || "#");
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.appendChild(el("span", "sr-only", "（在新标签页打开）"));

        var head = el("div", "repo-card__head");
        head.appendChild(svgIcon("github", "repo-icon"));
        head.appendChild(el("h3", "repo-name", repo.name || ""));
        a.appendChild(head);
        a.appendChild(el("p", "repo-desc", repo.desc || ""));

        var foot = el("div", "repo-foot");
        foot.appendChild(badge(repo.lang || "公开仓库", "info"));
        var cta = el("span", "repo-cta", "查看仓库");
        cta.appendChild(svgIcon("external", "ext-icon"));
        foot.appendChild(cta);
        a.appendChild(foot);
        a.appendChild(tagList(repo.tags));
        grid.appendChild(a);
      });
    }
    root.appendChild(grid);

    if (cfg.profileUrl) {
      var ctaWrap = el("div", "opensource-cta");
      ctaWrap.appendChild(externalButton(cfg.profileLabel || "GitHub", cfg.profileUrl, "secondary", "github"));
      root.appendChild(ctaWrap);
    }
  }

  /* ------------------------------------------------------------------ 教育 */
  function renderEducation() {
    var root = document.getElementById("education-root");
    var cfg = DATA.education || {};
    if (!root) { return; }
    root.appendChild(sectionHeader(cfg, "education-title"));

    var grid = el("div", "edu-grid");
    var items = cfg.items || [];
    if (items.length === 0) {
      grid.appendChild(emptyState(cfg.emptyText));
    } else {
      items.forEach(function (edu) {
        var card = el("article", "card edu-card reveal");
        card.appendChild(el("h3", "edu-school", edu.school || ""));
        card.appendChild(el("span", "edu-major", (edu.major || "") + " · " + (edu.degree || "")));
        card.appendChild(el("span", "edu-period", edu.period || ""));
        if (edu.note) { card.appendChild(el("p", "section-note", edu.note)); }
        grid.appendChild(card);
      });
    }
    root.appendChild(grid);
  }

  /* ------------------------------------------------------------------ 联系 */
  function renderContact() {
    var root = document.getElementById("contact-root");
    var cfg = DATA.contact || {};
    if (!root) { return; }
    root.appendChild(sectionHeader(cfg, "contact-title"));

    var grid = el("div", "contact-grid");
    var items = cfg.items || [];
    if (items.length === 0) {
      grid.appendChild(emptyState(cfg.emptyText));
    } else {
      items.forEach(function (item) {
        var row = el("div", "copy-row reveal");
        row.appendChild(el("span", "copy-row__label", item.label || ""));
        row.appendChild(el("span", "copy-row__value", item.value || ""));
        var btn = el("button", "copy-btn");
        btn.type = "button";
        btn.setAttribute("data-copy", item.copy || item.value || "");
        btn.setAttribute("aria-label", "复制" + (item.label || "") + "：" + (item.value || ""));
        btn.appendChild(svgIcon(item.icon || "copy", "copy-btn__icon"));
        btn.appendChild(document.createTextNode("复制"));
        row.appendChild(btn);
        grid.appendChild(row);
      });
    }
    root.appendChild(grid);

    var feedback = el("p", "copy-feedback");
    feedback.id = "copy-feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    root.appendChild(feedback);

    if (cfg.githubUrl) {
      var ctaWrap = el("div", "contact-cta");
      ctaWrap.appendChild(externalButton(cfg.githubLabel || "GitHub", cfg.githubUrl, "secondary", "github"));
      root.appendChild(ctaWrap);
    }
  }

  /* ------------------------------------------------------------------ 页脚 */
  function renderFooter() {
    var footer = document.getElementById("footer-root");
    var cfg = DATA.footer || {};
    if (!footer) { return; }
    var inner = el("div", "footer-inner container");
    var year = String(new Date().getFullYear());
    inner.appendChild(el("span", "footer-line", (cfg.copyright || "").replace("{year}", year)));
    inner.appendChild(el("span", "footer-line", cfg.hosted || ""));
    inner.appendChild(el("span", "footer-line footer-note", (cfg.source || "") + " · " + (cfg.note || "")));
    footer.appendChild(inner);
  }

  /* ------------------------------------------------------------------ 主题 */
  function initTheme() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) { return; }

    function apply(theme) {
      var next = theme === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      btn.setAttribute("aria-pressed", next === "light" ? "true" : "false");
      btn.setAttribute("aria-label", next === "light" ? "切换到深色主题" : "切换到浅色主题");
      var colorMeta = document.querySelector('meta[name="theme-color"]');
      if (colorMeta) { colorMeta.setAttribute("content", next === "light" ? "#ffffff" : "#0d1117"); }
      try { window.localStorage.setItem("resume-theme", next); } catch (e) { /* 隐私模式下忽略 */ }
    }

    apply(document.documentElement.getAttribute("data-theme") || "dark");
    btn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      apply(current === "light" ? "dark" : "light");
    });
  }

  /* ------------------------------------------------------------------ 复制 */
  function legacyCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  /**
   * 复制文本：优先 clipboard API（本地 file:// 下可能不可用），失败回退 execCommand。
   * @param {string} text @return {Promise<void>}
   */
  function copyText(text) {
    return new Promise(function (resolve, reject) {
      var canAsync = navigator.clipboard && typeof navigator.clipboard.writeText === "function";
      if (!canAsync) {
        if (legacyCopy(text)) { resolve(); } else { reject(new Error("copy failed")); }
        return;
      }
      navigator.clipboard.writeText(text).then(function () { resolve(); }, function () {
        if (legacyCopy(text)) { resolve(); } else { reject(new Error("copy failed")); }
      });
    });
  }

  /** @param {string} message */
  function showToast(message) {
    var toast = document.getElementById("toast");
    if (!toast) { return; }
    toast.textContent = message;
    toast.classList.add("is-visible");
    if (showToast.timer) { window.clearTimeout(showToast.timer); }
    showToast.timer = window.setTimeout(function () { toast.classList.remove("is-visible"); }, 2200);
  }

  function initCopy() {
    var feedback = document.getElementById("copy-feedback");
    document.addEventListener("click", function (event) {
      var target = event.target;
      var btn = target && target.closest ? target.closest("[data-copy]") : null;
      if (!btn) { return; }
      var text = btn.getAttribute("data-copy") || "";
      if (!text) { return; }

      copyText(text).then(function () {
        showToast("已复制到剪贴板：" + text);
        if (feedback) { feedback.textContent = "✓ 已复制「" + text + "」到剪贴板"; }
        /* 用固定快照恢复按钮，避免连续点击时把「已复制」当成原始内容 */
        if (!btn.getAttribute("data-original-html")) {
          btn.setAttribute("data-original-html", btn.innerHTML);
        }
        var original = btn.getAttribute("data-original-html");
        if (btn.copyTimer) { window.clearTimeout(btn.copyTimer); }
        btn.classList.add("is-copied");
        btn.innerHTML = "";
        btn.appendChild(svgIcon("check", "copy-btn__icon"));
        btn.appendChild(document.createTextNode("已复制"));
        btn.copyTimer = window.setTimeout(function () {
          btn.innerHTML = original;
          btn.classList.remove("is-copied");
        }, 1800);
      }, function () {
        showToast("复制失败，请手动选中文本复制");
        if (feedback) { feedback.textContent = "复制失败，请手动选中「" + text + "」复制"; }
      });
    });
  }

  /* ------------------------------------------------------------------ 打字机 */
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /** @param {Array<{type:string,text:string}>} lines */
  function initTypewriter(lines) {
    var wrap = document.getElementById("terminal-lines");
    if (!wrap || !lines || lines.length === 0) { return; }
    var cursor = wrap.querySelector(".term-cursor");

    /* 先一次性创建所有行骨架，保证打字过程中窗口高度不跳动 */
    var rows = lines.map(function (line) {
      var isCmd = line.type === "cmd";
      var row = el("div", "term-line term-line--" + (isCmd ? "cmd" : "out"));
      row.appendChild(el("span", "term-prompt", isCmd ? "❯" : "·"));
      row.appendChild(el("span", "term-text", ""));
      if (cursor) { wrap.insertBefore(row, cursor); } else { wrap.appendChild(row); }
      return row;
    });

    function fillAll() {
      rows.forEach(function (row, index) {
        row.querySelector(".term-text").textContent = lines[index].text;
      });
    }

    if (prefersReducedMotion()) { fillAll(); return; }

    var lineIndex = 0;
    function nextLine() {
      if (lineIndex >= rows.length) { return; }
      var row = rows[lineIndex];
      var text = lines[lineIndex].text || "";
      var isCmd = lines[lineIndex].type === "cmd";
      lineIndex += 1;
      var target = row.querySelector(".term-text");
      var chars = Array.from(text);
      var charIndex = 0;
      function step() {
        if (charIndex >= chars.length) { window.setTimeout(nextLine, 140); return; }
        target.textContent += chars[charIndex];
        charIndex += 1;
        window.setTimeout(step, isCmd ? 26 : 14);
      }
      window.setTimeout(step, 100);
    }
    nextLine();
  }

  /* ------------------------------------------------------------------ 高亮 / 入场 */
  /** @param {NodeList|Array} links @param {string|null} navId */
  function setActiveNav(links, navId) {
    Array.prototype.forEach.call(links, function (a) {
      var on = navId !== null && a.getAttribute("data-target") === navId;
      if (on) {
        a.classList.add("is-active");
        a.setAttribute("aria-current", "true");
      } else {
        a.classList.remove("is-active");
        a.removeAttribute("aria-current");
      }
    });
  }

  function initScrollSpy() {
    var sections = document.querySelectorAll("main section[data-nav]");
    var links = document.querySelectorAll(".nav-link");
    if (!sections.length || !links.length) { return; }

    if (!("IntersectionObserver" in window)) {
      var ticking = false;
      function update() {
        ticking = false;
        var offset = window.scrollY + 160;
        var current = null;
        Array.prototype.forEach.call(sections, function (section) {
          if (section.offsetTop <= offset) { current = section.getAttribute("data-nav"); }
        });
        if (window.scrollY < 120) { current = null; }
        setActiveNav(links, current);
      }
      window.addEventListener("scroll", function () {
        if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
      }, { passive: true });
      update();
      return;
    }

    var ratios = {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        ratios[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });
      var bestId = null;
      var bestRatio = 0;
      Array.prototype.forEach.call(sections, function (section) {
        if ((ratios[section.id] || 0) > bestRatio) {
          bestRatio = ratios[section.id];
          bestId = section.id;
        }
      });
      var navId = bestId ? document.getElementById(bestId).getAttribute("data-nav") : null;
      if (window.scrollY < 120) { navId = null; }
      setActiveNav(links, navId);
    }, {
      rootMargin: "-18% 0px -62% 0px",
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
    });
    Array.prototype.forEach.call(sections, function (section) { observer.observe(section); });
  }

  function initReveal() {
    var nodes = document.querySelectorAll(".reveal");
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(nodes, function (node) { node.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    Array.prototype.forEach.call(nodes, function (node) { observer.observe(node); });
  }

  /* ------------------------------------------------------------------ 入口 */
  function main() {
    document.documentElement.classList.add("js");
    try {
      var data = window.RESUME_DATA;
      if (!data || typeof data !== "object") {
        var fallback = document.getElementById("hero-root");
        if (fallback) {
          fallback.appendChild(emptyState("内容数据未加载：请确认 data/resume.js 存在，且 index.html 中的引用路径为 ./data/resume.js。"));
        }
        return;
      }
      DATA = data;

      applyMeta(DATA.site);
      renderNav();
      var terminalLines = renderHero();
      renderAbout();
      renderSkills();
      renderExperience();
      renderProjects();
      renderOpenSource();
      renderEducation();
      renderContact();
      renderFooter();

      initTheme();
      initScrollSpy();
      initCopy();
      initTypewriter(terminalLines);
      initReveal();
    } catch (error) {
      /* 兜底：任何渲染异常都不能让 html.js .reveal 的内容永久隐藏 */
      document.documentElement.classList.remove("js");
      if (window.console && window.console.error) {
        window.console.error("[resume-blog] 渲染失败：", error);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
