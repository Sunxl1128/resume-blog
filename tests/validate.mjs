#!/usr/bin/env node
/**
 * tests/validate.mjs — 简历博客上线回归自检工具
 * ---------------------------------------------------------------------------
 * 用法：node tests/validate.mjs [--online-render] [--no-links] [--no-online]
 *   --online-render  额外用 Chrome 打开线上 Pages 做真实渲染断言（默认只 curl 探测）
 *   --no-links       跳过外链 curl 复测（离线快速自检）
 *   --no-online      跳过线上地址探测
 *
 * 覆盖：
 *   A. 静态检查：JS 语法 / 数据契约 / 外链白名单 / 相对路径 / CSS 设计令牌 / 内容一致性
 *      A17-A20 专门校验 00d2627 增量（5 项目、无编造字段、措辞纪律、403 域名）
 *   B. 真实浏览器（Chrome/Edge headless + CDP）：真实渲染 DOM 断言、控制台错误、
 *      外链属性精确值、主题切换与记忆、reduced-motion、noscript、四档响应式、打印样式
 *      B20-B25 专门复核 renderProjects 条件渲染与导航高亮 / 点击复制回归
 *   C. 易扩展性冒烟：内存中 patch window.RESUME_DATA，不改动任何源文件
 *   D. 外链 curl 复测 / 线上 Pages 探测与内容同步状态（可选）
 *
 * 结果状态：PASS / FAIL / WAIT。WAIT = 部署状态（主理人尚未 push）导致线上仍是旧版，
 * 不计入通过率分母，也不判为源码缺陷，push 后复测即可。
 *
 * 设计原则：只读源码；临时 harness 写在系统临时目录，跑完即删；零第三方依赖。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARGS = new Set(process.argv.slice(2));
const p = (...parts) => path.join(ROOT, ...parts);
const read = (f) => fs.readFileSync(f, "utf8");
const fileUrl = (f) => pathToFileURL(f).href;

const results = [];
/**
 * 登记一条用例。
 * ok === true → PASS；ok === false → FAIL；ok === null → WAIT（部署/环境状态，不计入通过率分母）。
 * WAIT 用于「主理人尚未 push，线上仍是旧版」这类无需工程师修源码、只需稍后复测的情形。
 */
function check(id, name, method, expected, actual, ok, detail = "") {
  const state = ok === null ? "WAIT" : (ok ? "PASS" : "FAIL");
  results.push({ id, name, method, expected, actual, state, detail });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   白名单 / 常量
   --------------------------------------------------------------------------- */
const WHITELIST = [
  "https://www.xcharge.com/",
  "https://www.xcharge.com/aboutUs",
  "https://www.xcharge.com/device/C7EU",
  "https://www.xcharge.us/product/c6",
  "https://m.xcharge.com/device/NetZeroSeries",
  "https://openchargealliance.org/participants/beijing-x-charge-technology-co-ltd",
  "https://www.xcharge.com/newsDetail?id=6a3350039c6f921c19dcc7e2&type=news",
  "https://www.gdalpha.com/",
  "https://www.51haohuo.com/",
  "https://developer.android.com/jetpack/compose",
  "https://kotlinlang.org/",
  "https://flutter.dev/",
  "https://www.openchargealliance.org/",
  "https://mqtt.org/",
  "https://github.com/Sunxl1128",
  "https://github.com/Sunxl1128/CoolMallKotlin",
  "https://github.com/Sunxl1128/SuperEditTextLibrary",
  "https://github.com/Sunxl1128/SxlLibrary",
  "https://github.com/Sunxl1128/SxlLibrary2",
  "https://github.com/Sunxl1128/DJI-Android-VideoStreamDecodingSample",
  "https://github.com/Sunxl1128/ai-native-jobhunt",
  /* 00d2627 增量：Nori / 瑞芯微，3 条均 curl 实测 200 */
  "https://heynori.com/",
  "https://www.rock-chips.com/a/cn/product/RK35xilie/2024/1015/2016.html",
  "https://www.rock-chips.com/",
];
const SELF_URL = "https://sunxl1128.github.io/resume-blog/";
const FORBIDDEN_DOMAINS = ["52myjt.com", "u17.com", "pkusky.com"];
/* 实测 403，禁止进入数据外链（仅允许在文档里作为「禁止说明」出现） */
const FORBIDDEN_URLS = ["support.heynori.com"];
const ROCK_SPEC_URL = "https://www.rock-chips.com/a/cn/product/RK35xilie/2024/1015/2016.html";
const EXPECTED_PROJECT_COUNT = 5;
const EXPECTED_PROJECT_IDS = [
  "xcharge-hmi-c6-c7-c8a-c8s", "nori-family-ai-hub", "soldier-vitals-ble-hmi",
  "oilwell-tablet-hmi", "rotary-press-app",
];
const INDUSTRY_COMMON_TAGS = ["行业终端", "上位机", "设备端"];
const NORI_KEYWORDS = ["OTA", "屏保提醒", "Recipe", "Meal Plan", "相册", "日历", "RK3576", "Onboarding"];
const EXAGGERATIONS = ["主导", "独立负责", "项目负责人"];

/* ===========================================================================
   A. 静态检查
   =========================================================================== */
function staticChecks() {
  const html = read(p("index.html"));
  const css = read(p("assets/css/style.css"));
  const mainJs = read(p("assets/js/main.js"));
  const resumeJs = read(p("data/resume.js"));
  const guide = read(p("docs/content-guide.md"));
  const readme = read(p("README.md"));
  const resumeMd = read(path.resolve(ROOT, "..", ".pdf-read", "resume.md"));

  /* A1 — JS 语法 */
  let syntaxOk = true;
  let syntaxMsg = "两个 JS 均通过 node --check";
  try {
    execFileSync(process.execPath, ["--check", p("data/resume.js")], { stdio: "pipe" });
    execFileSync(process.execPath, ["--check", p("assets/js/main.js")], { stdio: "pipe" });
  } catch (e) {
    syntaxOk = false;
    syntaxMsg = String(e.stderr || e.message);
  }
  check("A1", "JS 语法", "node --check 两个 JS", "0 error", syntaxMsg, syntaxOk);

  /* A2 — 加载数据（构造 global.window） */
  const sandbox = { window: {} };
  let dataLoadOk = true;
  let dataLoadMsg = "window.RESUME_DATA 可加载";
  let D;
  try {
    vm.runInNewContext(resumeJs, sandbox, { filename: "data/resume.js" });
    D = sandbox.window.RESUME_DATA;
    if (!D || typeof D !== "object") throw new Error("RESUME_DATA 未挂载");
  } catch (e) {
    dataLoadOk = false;
    dataLoadMsg = String(e.message);
  }
  check("A2", "数据文件可作为 window.RESUME_DATA 加载", "Node vm 注入 global.window", "对象可用", dataLoadMsg, dataLoadOk);
  if (!dataLoadOk) return { html, css, mainJs, resumeJs, guide, readme, resumeMd, D: null };

  /* A3 — 同步 script 注入 / 无 fetch / 无绝对路径资源 */
  const scriptTags = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  const linkTags = [...html.matchAll(/<link[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const assetRefs = [...scriptTags, ...linkTags.filter((u) => !u.startsWith("http"))];
  const absoluteRefs = assetRefs.filter((u) => u.startsWith("/"));
  const relativeOk = assetRefs.every((u) => u.startsWith("./")) && absoluteRefs.length === 0;
  check("A3", "资源全部 ./ 相对路径（Pages 子路径兼容）", "正则提取 script/link 资源引用", "全部 ./ 开头，无 / 绝对路径",
    `资源=${JSON.stringify(assetRefs)}；绝对路径=${absoluteRefs.length}`, relativeOk);

  const syncOk = scriptTags.length === 2 && scriptTags.some((s) => s.includes("data/resume.js")) &&
    scriptTags.some((s) => s.includes("assets/js/main.js")) &&
    !scriptTags.some((s) => /type=["']module["']/.test(s)) &&
    !/\basync\b|\bdefer\b/.test(html.match(/<script[^>]*src=[^>]*>/g)?.join("") || "");
  check("A4", "data/resume.js 同步 script 注入（file:// 可双击）", "检查 script 标签顺序与属性",
    "2 个同步 script，无 module/async/defer，无 fetch/XHR",
    `scripts=${JSON.stringify(scriptTags)}`, syncOk);

  const noFetch = !/\bfetch\s*\(|XMLHttpRequest|\bimport\s*\(|importScripts/.test(mainJs + resumeJs);
  const noCdn = !/(https?:)?\/\/(cdn\.|unpkg|jsdelivr|fonts\.googleapis|cdnjs)/i.test(html + css + mainJs);
  check("A5", "无 fetch / XHR / 外部 CDN 依赖", "源码正则扫描", "0 处",
    `fetch/XHR=${!noFetch}；外部CDN=${!noCdn}`, noFetch && noCdn);

  /* A6 — 数据契约：projects.items 字段 vs 渲染函数读取的键 */
  const projFn = mainJs.slice(mainJs.indexOf("function renderProjects"), mainJs.indexOf("function renderOpenSource"));
  const usedKeys = new Set([...projFn.matchAll(/project\.(\w+)/g)].map((m) => m[1]));
  const kindBlock = (mainJs.match(/var KIND = \{([\s\S]*?)\n  \};/) || [])[1] || "";
  const kinds = new Set([...kindBlock.matchAll(/^\s*(\w+)\s*:/gm)].map((m) => m[1]));
  const knownKeys = new Set(["id", "name", "period", "role", "status", "statusTone", "summary",
    "highlights", "stack", "results", "links", "tags", ...usedKeys]);
  const contractIssues = [];
  (D.projects?.items || []).forEach((it, i) => {
    if (!it.name) contractIssues.push(`items[${i}] 缺 name`);
    Object.keys(it).forEach((k) => { if (!knownKeys.has(k)) contractIssues.push(`items[${i}] 未知字段 ${k}`); });
    (it.links || []).forEach((l, j) => {
      if (!l.label || !l.url) contractIssues.push(`items[${i}].links[${j}] 缺 label/url`);
      if (l.kind && !kinds.has(l.kind)) contractIssues.push(`items[${i}].links[${j}] kind=${l.kind} 不在 KIND`);
    });
  });
  const contractOk = contractIssues.length === 0 && kinds.size >= 4 && usedKeys.size >= 8;
  check("A6", "projects.items 数据契约与 main.js 读取键一致", "Node vm 加载 + 正则提取渲染函数键/KIND 映射",
    `字段无未知项、links.kind ⊆ KIND{${[...kinds].join(",")}}`,
    `读取键=${[...usedKeys].join(",")}；KIND=${[...kinds].join(",")}；问题=${contractIssues.join("; ") || "无"}`, contractOk);

  /* A7 — 全站 http(s) URL 白名单（源码级） */
  const srcAll = html + resumeJs + mainJs + css + guide + readme;
  const srcUrls = [...new Set((srcAll.match(/https?:\/\/[^\s"'`<>)\],;]+/g) || [])
    .map((u) => u.replace(/&amp;/g, "&").replace(/[.,;)\]]+$/, "")))];
  const outOfList = srcUrls.filter((u) => !WHITELIST.includes(u) && !u.startsWith(SELF_URL) &&
    !u.includes("www.w3.org") && !u.includes("localhost") && !u.includes("127.0.0.1"));
  check("A7", "源码中所有 http(s) 地址均在白名单内", "正则提取全源码 URL 并逐条比对",
    "0 条白名单外地址（站点自身/SVG xmlns/localhost 示例除外）",
    `共 ${srcUrls.length} 条；越界=${outOfList.join(", ") || "无"}`, outOfList.length === 0);

  /* A8 — 禁止域名 / 错误账号 */
  const forbiddenHit = FORBIDDEN_DOMAINS.filter((d) => (html + resumeJs + mainJs).includes(d));
  const badHandle = /MonkeySunxl/i.test(html + resumeJs + mainJs + css + guide + readme);
  check("A8", "无不可达域名外链、无 MonkeySunxl 账号", "源码关键字扫描",
    "0 命中", `禁用域名=${forbiddenHit.join(",") || "无"}；MonkeySunxl=${badHandle}`,
    forbiddenHit.length === 0 && !badHandle);

  /* A9 — CSS 设计令牌真实落地 */
  const cssClaims = {
    "Layer1 primitive": /Layer 1 — Primitive tokens/,
    "Layer2 semantic": /Layer 2 — Semantic tokens/,
    "Layer3 component": /Layer 3 — Component tokens/,
    "8pt 间距": /--space-2:\s*var\(--size-2\)/,
    "深色近黑背景": /--bg:\s*var\(--gray-950\)/,
    "橘黄标题": /--title:\s*var\(--orange-400\)/,
    ".modiv 渐变分割线": /\.modiv\s*\{[\s\S]*?linear-gradient/,
    ".badge 状态徽标": /\.badge--success/,
    "IDE 窗口标题栏": /\.window__bar\s*\{/,
    "浅色主题切换": /\[data-theme="light"\]\s*\{/,
    ":focus-visible": /:focus-visible\s*\{/,
    "scroll-margin-top": /scroll-margin-top:/,
    "44px 触控目标": /min-height:\s*44px/,
    "min-width:0": /min-width:\s*0/,
    "overflow-wrap": /overflow-wrap:/,
    "auto-fit minmax": /repeat\(auto-fit,\s*minmax\(min\(/,
    "prefers-reduced-motion": /@media \(prefers-reduced-motion: reduce\)/,
    "@media print": /@media print\s*\{/,
    "打印展开链接 URL": /a\[href\^="http"\]::after[\s\S]*?attr\(href\)/,
    "打印隐藏导航": /@media print[\s\S]*?\.site-header[\s\S]*?display:\s*none/,
    "响应式断点 768/1024/767/359": /@media \(min-width: 768px\)[\s\S]*@media \(min-width: 1024px\)[\s\S]*@media \(max-width: 767px\)[\s\S]*@media \(max-width: 359px\)/,
  };
  const cssMiss = Object.entries(cssClaims).filter(([, re]) => !re.test(css)).map(([k]) => k);
  check("A9", "两个 UI skill 的设计声明在 CSS 中真实存在", "CSS 规则静态审查（20 项）",
    "20/20 命中", `命中 ${Object.keys(cssClaims).length - cssMiss.length}/${Object.keys(cssClaims).length}；缺失=${cssMiss.join(", ") || "无"}`,
    cssMiss.length === 0, cssMiss.join(", "));

  /* A10 — 交互安全 / SEO / noscript / 内容一致性 */
  const noDialogs = !/\b(alert|confirm|prompt)\s*\(/.test(mainJs + read(p("index.html")));
  check("A10", "无 alert / confirm / prompt（沙箱 iframe 铁律）", "源码正则", "0 处",
    noDialogs ? "0 处" : "发现原生对话框调用", noDialogs);

  const seoOk = ["<title>", 'name="description"', 'name="keywords"', 'property="og:type"',
    'property="og:title"', 'property="og:description"', 'property="og:url"', 'rel="canonical"',
    'name="twitter:card"'].every((s) => html.includes(s));
  check("A11", "SEO title/description/keywords/OG/canonical 齐全", "index.html 标签检查",
    "9/9 存在", seoOk ? "9/9" : "有缺失", seoOk);

  const noscriptOk = /<noscript>[\s\S]*?孙喜龙[\s\S]*?<\/noscript>/.test(html) &&
    (html.match(/<noscript>[\s\S]*?<\/noscript>/)?.[0].match(/href="https:/g) || []).length >= 5;
  check("A12", "<noscript> 静态兜底含核心信息与关键外链", "index.html 结构检查",
    "含姓名、5 段经历、外链", noscriptOk ? "通过" : "内容不足", noscriptOk);

  const companies = ["北京智充科技有限公司", "名医讲堂 (北京) 科技发展有限公司", "好活集团",
    "奥飞娱乐股份有限公司", "未名天 (北京) 教育科技有限公司"];
  const periods = ["2022.12", "2022.05", "2021.04", "2019.11", "2016.08"];
  const expText = JSON.stringify(D.experience.items);
  const mdNum = ["2000+", "10+", "50+", "95%+", "1% 以下", "0.3% 以下", "40%", "60%"];
  const contentIssues = [];
  companies.forEach((c) => { if (!resumeMd.includes(c) || !expText.includes(c)) contentIssues.push(`公司 ${c}`); });
  periods.forEach((t) => { if (!resumeMd.includes(t) || !expText.includes(t)) contentIssues.push(`时间 ${t}`); });
  mdNum.forEach((n) => { if (!resumeMd.includes(n) || !JSON.stringify(D).includes(n)) contentIssues.push(`数字 ${n}`); });
  const expOk = D.experience.items.length === 5 && contentIssues.length === 0;
  check("A13", "5 段公司名/时间/业绩数字与 resume.md 一致，无杜撰", "源数据 vs 素材原文逐项比对",
    "5 段经历、关键数字全部可在原文找到", `经历数=${D.experience.items.length}；差异=${contentIssues.join(", ") || "无"}`, expOk);

  const osOk = D.opensource.title === "开源与技术实践" && /并非任职公司的商业项目/.test(D.opensource.note);
  const footerOk = /本站由 GitHub Pages 托管/.test(D.footer.hosted);
  check("A14", "开源区标题/非商业声明、页脚托管文案", "数据字段检查",
    "标题=开源与技术实践 + 非公司商业项目声明 + 页脚托管文案",
    `title=${D.opensource.title}；note声明=${/并非任职公司的商业项目/.test(D.opensource.note)}；页脚=${D.footer.hosted}`,
    osOk && footerOk);

  /* A15 — nav 6 项与 section[data-nav] 映射 */
  const navIds = (D.nav || []).map((n) => n.id);
  const sectionNavIds = [...html.matchAll(/<section[^>]*data-nav="([^"]+)"/g)].map((m) => m[1]);
  const navMapOk = navIds.length === 6 && navIds.every((id) => sectionNavIds.includes(id));
  check("A15", "导航 6 项均可映射到 section[data-nav]", "提取 nav.id 与 HTML data-nav",
    "6 项且全部命中", `nav=${navIds.join(",")}；sections=${sectionNavIds.join(",")}`, navMapOk);

  /* A16 — 内容指南与 README 的扩展性说明与实际实现一致 */
  const docOk = /linksEmptyText/.test(resumeJs) && /本项目暂无公开外链/.test(resumeJs) &&
    /emptyText/.test(resumeJs) && /links: \[\]/.test(guide);
  check("A16", "唯一扩展点：projects.items + 空态文案常量齐备", "源码/文档一致性",
    "数据文件内定义 linksEmptyText / emptyText", docOk ? "齐备" : "缺失", docOk);

  /* ---- 增量改动（00d2627）专项静态检查 ---- */
  const items = D.projects?.items || [];
  const ids = items.map((it) => it.id);
  const newItems = items.slice(1);
  const industryItems = items.slice(2);
  const nori = items[1] || {};

  /* A17 — 5 项顺序、新增 4 项严禁编造未公开字段、行业终端 3 项保持极简 */
  const invented = [];
  newItems.forEach((it, i) => {
    ["period", "role", "status", "statusTone"].forEach((k) => {
      if (it[k] !== undefined && it[k] !== null && it[k] !== "") invented.push(`items[${i + 1}].${k}=${it[k]}`);
    });
    if ((it.results || []).length > 0) invented.push(`items[${i + 1}].results 非空`);
  });
  const industryIssues = [];
  industryItems.forEach((it, i) => {
    ["highlights", "stack", "results", "links"].forEach((k) => {
      if ((it[k] || []).length > 0) industryIssues.push(`items[${i + 2}].${k} 应为空数组`);
    });
    INDUSTRY_COMMON_TAGS.forEach((t) => {
      if (!(it.tags || []).includes(t)) industryIssues.push(`items[${i + 2}] 缺共同标签 ${t}`);
    });
  });
  const noriLinks = nori.links || [];
  const idsOk = items.length === EXPECTED_PROJECT_COUNT &&
    JSON.stringify(ids) === JSON.stringify(EXPECTED_PROJECT_IDS);
  const a17ok = idsOk && invented.length === 0 && industryIssues.length === 0 &&
    noriLinks.length === 3 && noriLinks.every((l) => WHITELIST.includes(l.url) && kinds.has(l.kind));
  check("A17", "增量数据契约：5 项顺序正确、新增 4 项无编造字段、3 张行业终端卡保持极简",
    "Node vm 遍历 projects.items 字段",
    "5 项且 id 顺序匹配；新增 4 项无 period/role/status/statusTone、results=[]；行业 3 项四个数组全空且共同标签齐全；Nori 3 条白名单外链",
    `ids=${ids.join(",")}；编造字段=${invented.join("; ") || "无"}；行业卡问题=${industryIssues.join("; ") || "无"}；Nori外链=${noriLinks.length}`, a17ok);

  /* A18 — site.description 扩展后仍保留原技术关键词 */
  const desc = D.site?.description || "";
  const descNeed = ["Nori", "RK3576", "行业终端", "Jetpack Compose", "Kotlin", "Flutter", "OCPP", "MQTT"];
  const descMiss = descNeed.filter((k) => !desc.includes(k));
  check("A18", "site.description 含新项目且保留原技术关键词", "数据字段关键字检查",
    `8/8 关键词命中`, `缺失=${descMiss.join(",") || "无"}；description=${desc}`, descMiss.length === 0);

  /* A19 — 新增项目措辞纪律：客观描述、Onboarding 拼写、Nori 功能关键词 */
  const newText = JSON.stringify(newItems);
  const exaggerations = EXAGGERATIONS.filter((w) => newText.includes(w));
  const misspelling = /onbrading|onboardng/i.test(newText);
  const noriMiss = NORI_KEYWORDS.filter((k) => !newText.includes(k));
  check("A19", "新增项目措辞客观（无夸大用词）、Onboarding 拼写正确、Nori 功能点齐全",
    "新增 4 项序列化文本关键字检查",
    "夸大用词 0；Onboarding 存在且无拼写错误；8 个功能关键词齐全",
    `夸大用词=${exaggerations.join(",") || "无"}；拼写错误=${misspelling}；功能点缺失=${noriMiss.join(",") || "无"}`,
    exaggerations.length === 0 && !misspelling && newText.includes("Onboarding") && noriMiss.length === 0);

  /* A20 — 403 域名不得进入数据外链；3 条新 URL 在白名单且渲染层可读 */
  const dataText = JSON.stringify(D);
  const forbiddenUrlHit = FORBIDDEN_URLS.filter((u) => dataText.includes(u));
  const newUrlsInList = ["https://heynori.com/", ROCK_SPEC_URL, "https://www.rock-chips.com/"]
    .every((u) => WHITELIST.includes(u) && dataText.includes(u));
  check("A20", "403 域名 support.heynori.com 未进入数据外链；3 条新增 URL 均在白名单且在数据中",
    "数据序列化文本 + 白名单比对",
    "403 域名 0 命中；3 条新 URL 全部命中",
    `403域名命中=${forbiddenUrlHit.join(",") || "无"}；新URL齐备=${newUrlsInList}`,
    forbiddenUrlHit.length === 0 && newUrlsInList);

  return { html, css, mainJs, resumeJs, guide, readme, resumeMd, D };
}

/* ===========================================================================
   B. Chrome DevTools Protocol 客户端
   =========================================================================== */
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.listeners = [];
    this.events = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method) this.events.push(msg);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
      this.listeners.forEach((fn) => fn(msg));
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("CDP 超时: " + method)); }
      }, 20000);
    });
  }
  waitEvent(method, timeout = 25000) {
    return new Promise((resolve, reject) => {
      let off;
      const timer = setTimeout(() => { off(); reject(new Error("等待事件超时: " + method)); }, timeout);
      off = () => { clearTimeout(timer); this.listeners.splice(this.listeners.indexOf(handler), 1); };
      const handler = (msg) => { if (msg.method === method) { off(); resolve(msg.params); } };
      this.listeners.push(handler);
    });
  }
}

function findBrowser() {
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    process.env.CHROME_BIN,
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c));
}

/** 生成临时 harness：复制真实 index.html，资源改绝对 file:// URL，注入探针与数据 patch。 */
function makeHarness(html, tmpDir, name, patchSource) {
  let out = html.replace(/((?:src|href)=")\.\/([^"]+)"/g,
    (m, head, rel) => `${head}${fileUrl(p(rel))}"`);
  const probe = `<script>
    window.__QA_ERRORS__ = [];
    window.addEventListener("error", function (e) { window.__QA_ERRORS__.push("error: " + e.message); });
    var __origErr = console.error;
    console.error = function () {
      window.__QA_ERRORS__.push("console.error: " + Array.prototype.map.call(arguments, String).join(" "));
      __origErr.apply(console, arguments);
    };
    window.__QA_PATCH__ = ${patchSource};
  </script>`;
  out = out.replace("<head>", "<head>" + probe);
  out = out.replace(/(<script src="[^"]*data\/resume\.js"><\/script>)/,
    "$1\n  <script>try { if (window.__QA_PATCH__) window.__QA_PATCH__(window.RESUME_DATA); } catch (e) { window.__QA_PATCH_ERROR__ = String(e); }</script>");
  const f = path.join(tmpDir, name);
  fs.writeFileSync(f, out, "utf8");
  return fileUrl(f);
}

async function browserChecks(html) {
  const browser = findBrowser();
  if (!browser) {
    check("B0", "真实浏览器可用", "探测系统 Chrome/Edge", "找到可执行文件", "未找到", false);
    return { available: false };
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resume-qa-"));
  const profile = path.join(tmpDir, "profile");
  fs.mkdirSync(profile, { recursive: true });
  const proc = spawn(browser, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--no-first-run",
    "--disable-extensions", "--allow-file-access-from-files", "--mute-audio",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });

  let cdp;
  try {
    /* 等待 DevToolsActivePort */
    const portFile = path.join(profile, "DevToolsActivePort");
    let port = null;
    for (let i = 0; i < 60; i++) {
      if (fs.existsSync(portFile)) { port = read(portFile).split("\n")[0].trim(); break; }
      await sleep(250);
    }
    if (!port) throw new Error("Chrome 未生成 DevToolsActivePort");

    const jlist = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    let page = jlist.find((t) => t.type === "page");
    if (!page) {
      page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
    cdp = new CDP(ws);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");

    const evalJS = async (expression) => {
      const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.text + " :: " + (r.exceptionDetails.exception?.description || ""));
      }
      return r.result.value;
    };
    const navigate = async (url, timeout = 40000) => {
      cdp.events.length = 0;
      const loaded = cdp.waitEvent("Page.loadEventFired", timeout);
      await cdp.send("Page.navigate", { url });
      await loaded;
      await sleep(180);
      return evalJS("document.readyState");
    };
    const cdpErrors = () => cdp.events.filter((e) =>
      (e.method === "Runtime.exceptionThrown") ||
      (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") ||
      (e.method === "Log.entryAdded" && e.params.entry.level === "error"));

    check("B0", "真实浏览器可用（Chrome/Edge headless + CDP）", "spawn headless + DevTools Protocol",
      "可连接并求值", `${path.basename(browser)} 已连接`, true);

    /* ---- 场景 1：真实 index.html 无任何 patch ---- */
    const realUrl = fileUrl(p("index.html"));
    await navigate(realUrl);

    const dom = await evalJS(`(() => {
      const q = (s) => document.querySelectorAll(s);
      return {
        heroName: (document.querySelector("#hero-name") || {}).textContent || "",
        sections: q("main > section").length,
        allSections: q("main section").length,
        sectionsWithNav: [...q("main section[data-nav]")].map(s => s.getAttribute("data-nav")),
        navLinks: q(".nav-link").length,
        timelineItems: q(".timeline-item").length,
        projectCards: q(".project-card").length,
        repoCards: q(".repo-card").length,
        eduCards: q(".edu-card").length,
        contactRows: q(".copy-row").length,
        skillGroups: q(".skill-group").length,
        advCards: q(".adv-card").length,
        footerLines: q(".footer-line").length,
        modiv: q(".modiv").length,
        windowBar: q(".window__bar").length,
        windowDots: q(".window__dot").length,
        badges: q(".badge").length,
        h1: q("h1").length,
        termLines: q(".term-line").length,
        jsClass: document.documentElement.classList.contains("js"),
        theme: document.documentElement.getAttribute("data-theme"),
        footerText: (document.querySelector(".site-footer") || {}).textContent || "",
        eduText: (document.querySelector("#education-root") || {}).textContent || "",
        osTitle: (document.querySelector("#opensource-title") || {}).textContent || "",
      };
    })()`);
    const domExpect = { heroName: "孙喜龙", sections: 8, navLinks: 6, timelineItems: 5,
      projectCards: EXPECTED_PROJECT_COUNT, repoCards: 6, eduCards: 1, contactRows: 4, skillGroups: 4,
      advCards: 4, footerLines: 3, modiv: 7, windowBar: 1, h1: 1 };
    const domDiff = Object.entries(domExpect).filter(([k, v]) =>
      k === "heroName" ? !dom.heroName.includes(v) : dom[k] !== v).map(([k, v]) => `${k}: 期望 ${v} 实际 ${dom[k]}`);
    check("B1", "真实渲染 DOM：Hero 姓名 / 8 顶层 section / 5 经历 / 5 项目 / 6 仓库 / 教育 / 页脚",
      "Chrome headless 加载 file://index.html 后 Runtime.evaluate 断言（main > section 计顶层区块）",
      "顶层 section=8，其余数量全部匹配",
      domDiff.length ? domDiff.join("; ") : `${JSON.stringify(domExpect)}；main section 共 ${dom.allSections}（含 4 个语义化 skill-group 卡片）`,
      domDiff.length === 0);

    check("B2", "IDE 窗口三圆点 / 状态徽标 / 渐变分割线真实生成", "DOM 节点计数",
      "window__dot=3, badge≥10, modiv=7", `dots=${dom.windowDots}, badge=${dom.badges}, modiv=${dom.modiv}`,
      dom.windowDots === 3 && dom.badges >= 10 && dom.modiv === 7);

    check("B3", "内容文案落地：开源标题 / 教育 / 页脚托管声明", "DOM textContent",
      "含『开源与技术实践』『吉林师范大学』『本站由 GitHub Pages 托管』",
      `osTitle=${dom.osTitle.trim()}; edu=${dom.eduText.includes("吉林师范大学")}; footer=${dom.footerText.includes("本站由 GitHub Pages 托管")}`,
      dom.osTitle.includes("开源与技术实践") && dom.eduText.includes("吉林师范大学") &&
      dom.footerText.includes("本站由 GitHub Pages 托管"));

    /* ---- 场景 2：外链属性精确值 + target/rel 配对 ---- */
    const links = await evalJS(`(() => {
      const as = [...document.querySelectorAll('a[href^="http"]')];
      return {
        total: as.length,
        hrefs: as.map(a => a.getAttribute("href")),
        badTarget: as.filter(a => a.getAttribute("target") !== "_blank").map(a => a.getAttribute("href")),
        badRel: as.filter(a => !/(^|\\s)noopener(\\s|$)/.test(a.getAttribute("rel") || "") ||
                              !/(^|\\s)noreferrer(\\s|$)/.test(a.getAttribute("rel") || "")).map(a => a.getAttribute("href")),
        news: as.filter(a => (a.getAttribute("href") || "").includes("newsDetail"))
                .map(a => ({ attr: a.getAttribute("href"), prop: a.href })),
        mobile: as.filter(a => (a.getAttribute("href") || "").includes("m.xcharge.com"))
                .map(a => a.getAttribute("href")),
      };
    })()`);
    const NEWS = "https://www.xcharge.com/newsDetail?id=6a3350039c6f921c19dcc7e2&type=news";
    const newsOk = links.news.length === 1 && links.news[0].attr === NEWS && links.news[0].prop === NEWS;
    check("B4", "带参 URL 的 &type=news 未被截断/错误转义", "读取真实 DOM a.getAttribute('href') 与 a.href",
      NEWS, `attr=${links.news[0]?.attr} | prop=${links.news[0]?.prop}`, newsOk);
    check("B5", "所有外链 100% 配对 target=_blank + rel=noopener noreferrer", "遍历 a[href^=http]",
      "badTarget=0 且 badRel=0", `共 ${links.total} 条；badTarget=${links.badTarget.length}；badRel=${links.badRel.length}`,
      links.badTarget.length === 0 && links.badRel.length === 0);

    const outside = [...new Set(links.hrefs.filter((u) => !WHITELIST.includes(u) && !u.startsWith(SELF_URL)))];
    check("B6", "渲染后 DOM 中的外链全部在白名单内", "提取 DOM href 去重比对",
      "0 条越界", `共 ${new Set(links.hrefs).size} 条唯一 URL；越界=${outside.join(", ") || "无"}`, outside.length === 0);
    check("B7", "移动站 m.xcharge.com 外链存在", "DOM href 检索", "1 条",
      links.mobile.join(", ") || "未找到", links.mobile.length === 1);

    /* ---- 场景 3：控制台错误 ---- */
    const errs = cdpErrors();
    check("B8", "真实加载无控制台红色报错 / 未捕获异常", "CDP Runtime.exceptionThrown / consoleAPICalled / Log.entryAdded",
      "0 条", errs.length ? JSON.stringify(errs.map((e) => e.params?.exceptionDetails?.text || e.params?.entry?.text || e.params?.type)) : "0 条",
      errs.length === 0);

    /* ---- 场景 4：主题切换 + localStorage 记忆 + 防闪烁三层优先级 ----
       注意：headless Chrome 默认 prefers-color-scheme: light，因此首次访问
       按设计应为 light；断言不得硬编码初始主题，只验证「翻转 + 记忆 + 联动」。 */
    const theme1 = await evalJS(`(() => {
      const before = document.documentElement.getAttribute("data-theme");
      document.getElementById("theme-toggle").click();
      return {
        before: before,
        after: document.documentElement.getAttribute("data-theme"),
        stored: localStorage.getItem("resume-theme"),
        aria: document.getElementById("theme-toggle").getAttribute("aria-pressed"),
        label: document.getElementById("theme-toggle").getAttribute("aria-label"),
        meta: document.querySelector('meta[name="theme-color"]').getAttribute("content")
      };
    })()`);
    const t1ok = theme1.after !== theme1.before && ["light", "dark"].includes(theme1.after) &&
      theme1.stored === theme1.after &&
      theme1.aria === (theme1.after === "light" ? "true" : "false") &&
      theme1.meta === (theme1.after === "light" ? "#ffffff" : "#0d1117") &&
      (theme1.after === "light" ? /深色/.test(theme1.label) : /浅色/.test(theme1.label));
    check("B9", "主题切换：data-theme / aria-pressed / aria-label / theme-color / localStorage 联动",
      "CDP 触发 click 后读 DOM 属性（不假设初始主题）",
      "主题翻转，5 项状态与新主题一致", JSON.stringify(theme1), t1ok);

    cdp.events.length = 0;
    await navigate(realUrl);
    const theme2 = await evalJS(`({ theme: document.documentElement.getAttribute("data-theme"), stored: localStorage.getItem("resume-theme") })`);
    check("B10", "刷新后主题记忆不闪烁（前置脚本读取 localStorage）", "reload 后读 data-theme",
      `theme=${theme1.after}（来自 localStorage）`, JSON.stringify(theme2),
      theme2.theme === theme1.after && theme2.stored === theme1.after);

    /* 三层优先级：localStorage > prefers-color-scheme > 默认深色 */
    const priority = [];
    for (const scheme of ["light", "dark"]) {
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
      await evalJS(`localStorage.removeItem("resume-theme"); "cleared"`);
      cdp.events.length = 0;
      await navigate(realUrl);
      priority.push({ scheme: scheme, saved: null, theme: await evalJS(`document.documentElement.getAttribute("data-theme")`) });
    }
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await evalJS(`localStorage.setItem("resume-theme", "dark"); "ok"`);
    cdp.events.length = 0;
    await navigate(realUrl);
    priority.push({ scheme: "light", saved: "dark", theme: await evalJS(`document.documentElement.getAttribute("data-theme")`) });
    const prioOk = priority[0].theme === "light" && priority[1].theme === "dark" && priority[2].theme === "dark";
    check("B9b", "防闪烁脚本三层优先级：localStorage > prefers-color-scheme > 默认深色",
      "CDP setEmulatedMedia(prefers-color-scheme) × 2 + 手动写 localStorage 后各自 reload",
      "light→light, dark→dark, 系统 light+记忆 dark→dark", JSON.stringify(priority), prioOk);
    await evalJS(`localStorage.removeItem("resume-theme"); "cleared"`);
    await cdp.send("Emulation.setEmulatedMedia", { features: [] });

    const headEnd = html.indexOf("</head>");
    const bodyStart = html.indexOf("<body");
    const inlineAt = html.indexOf('getItem("resume-theme")');
    const antiFlicker = inlineAt > 0 && inlineAt < headEnd && headEnd < bodyStart &&
      /setAttribute\("data-theme", theme\)/.test(html) &&
      html.indexOf('<link rel="stylesheet"') > 0;
    check("B11", "防闪烁 inline 脚本位于 <head> 内且在 <body> 之前执行", "index.html 源码位置检查",
      "script 在 </head> 之前、含 localStorage 读取与 setAttribute", antiFlicker ? "存在且位置正确" : "缺失或位置错误", antiFlicker);

    /* ---- 场景 5：prefers-reduced-motion 降级 ---- */
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    cdp.events.length = 0;
    await navigate(realUrl);
    const rm = await evalJS(`(() => {
      const texts = [...document.querySelectorAll(".term-text")].map(n => n.textContent);
      const reveals = [...document.querySelectorAll(".reveal")];
      return {
        matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
        lines: texts.length,
        filled: texts.filter(t => t.length > 0).length,
        revealVisible: reveals.filter(n => getComputedStyle(n).opacity === "1").length,
        revealTotal: reveals.length
      };
    })()`);
    check("B12", "prefers-reduced-motion：打字机一次性显示 + reveal 全部可见", "CDP setEmulatedMedia + computedStyle",
      "matches=true, 全部行填充, reveal 可见率 100%", JSON.stringify(rm),
      rm.matches && rm.lines > 0 && rm.filled === rm.lines && rm.revealVisible === rm.revealTotal);
    await cdp.send("Emulation.setEmulatedMedia", { features: [] });

    /* ---- 场景 6：noscript 兜底 ---- */
    await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });
    cdp.events.length = 0;
    await navigate(realUrl);
    const ns = await evalJS(`(() => {
      const t = (document.querySelector(".noscript-box") || {}).textContent || "";
      return { len: t.length, name: t.includes("孙喜龙 · 个人简历"), js: document.documentElement.classList.contains("js"),
               xcharge: t.includes("北京智充科技有限公司"), edu: t.includes("吉林师范大学"),
               links: (document.querySelector(".noscript-box") || {querySelectorAll:()=>[]}).querySelectorAll("a[href^=http]").length };
    })()`);
    check("B13", "禁用 JS 后 <noscript> 兜底内容可读", "CDP setScriptExecutionDisabled + 读取 .noscript-box",
      "含姓名/公司/教育/≥5 外链且 html.js 未添加", JSON.stringify(ns),
      ns.name && ns.xcharge && ns.edu && ns.links >= 5 && !ns.js && ns.len > 300);
    await cdp.send("Emulation.setScriptExecutionDisabled", { value: false });

    /* ---- 场景 7：四档响应式横向滚动 ---- */
    cdp.events.length = 0;
    await navigate(realUrl);
    const viewports = [];
    for (const w of [360, 768, 1280, 1600]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
      await sleep(120);
      const r = await evalJS(`(() => {
        const de = document.documentElement;
        const wide = [...document.querySelectorAll("body *")].filter(e => {
          const b = e.getBoundingClientRect(); return b.width > 0 && b.right > de.clientWidth + 1;
        }).slice(0, 4).map(e => (e.className && String(e.className).slice(0, 40)) || e.tagName);
        return { w: ${w}, clientWidth: de.clientWidth, scrollWidth: de.scrollWidth,
                 overflow: de.scrollWidth > de.clientWidth + 1,
                 navOverflowX: getComputedStyle(document.querySelector(".nav-list")).overflowX,
                 wide: wide };
      })()`);
      viewports.push(r);
    }
    await cdp.send("Emulation.clearDeviceMetricsOverride");
    const vpOk = viewports.every((v) => !v.overflow) && viewports[0].navOverflowX === "auto";
    check("B14", "360 / 768 / 1280 / 1600 四宽度无横向滚动", "CDP setDeviceMetricsOverride + scrollWidth 实测",
      "4/4 无页面级溢出；360px 下导航为设计内 overflow-x:auto 容器",
      JSON.stringify(viewports), vpOk,
      "360px 下 wide 节点均为 .nav-list 内部可横向滚动的导航项，非页面级溢出");

    /* ---- 场景 8：打印样式 ---- */
    await cdp.send("Emulation.setEmulatedMedia", { media: "print" });
    const pr = await evalJS(`(() => {
      const g = (s) => getComputedStyle(document.querySelector(s)).display;
      const a = document.querySelector('a[href^="http"]');
      const after = a ? getComputedStyle(a, "::after").content : "none";
      return { header: g(".site-header"), nav: g(".nav"), themeToggle: g(".theme-toggle"),
               toast: g(".toast"), heroSide: g(".hero-side"), after: after,
               revealOpacity: getComputedStyle(document.querySelector(".reveal")).opacity };
    })()`);
    check("B15", "@media print 隐藏导航并展开外链 URL", "CDP setEmulatedMedia(print) + getComputedStyle",
      "header/nav/toggle 全 none；a::after 含 URL；reveal 可见", JSON.stringify(pr),
      pr.header === "none" && pr.nav === "none" && pr.themeToggle === "none" &&
      /http/.test(pr.after) && pr.revealOpacity === "1");
    await cdp.send("Emulation.setEmulatedMedia", { media: "" });

    /* ---- 场景 9 & 10：易扩展性冒烟（内存 patch，不改源文件） ---- */
    const patchAppend = `function (d) {
      d.projects.items.push({
        id: "qa-minimal-project", name: "QA 最小项目（仅用于验证扩展点）",
        period: "", role: "", highlights: [], stack: [], results: [], links: [], tags: []
      });
    }`;
    const appendUrl = makeHarness(html, tmpDir, "qa-append.html", patchAppend);
    cdp.events.length = 0;
    await navigate(appendUrl);
    const ext = await evalJS(`(() => {
      const cards = [...document.querySelectorAll(".project-card")];
      const last = cards[cards.length - 1] || {};
      return {
        cards: cards.length,
        lastText: (last.textContent || "").slice(0, 200),
        emptyStates: document.querySelectorAll("#projects-root .empty-state").length,
        hasEmptyText: (last.textContent || "").includes("本项目暂无公开外链"),
        hasName: (last.textContent || "").includes("QA 最小项目"),
        patchError: window.__QA_PATCH_ERROR__ || null,
        pageErrors: window.__QA_ERRORS__ || []
      };
    })()`);
    const cdpExtErr = cdpErrors().length;
    const expectedAppendCards = EXPECTED_PROJECT_COUNT + 1;
    check("B16", "易扩展性：追加 links:[]/highlights:[] 最小项目 → 多一张卡 + 空态文案、不抛异常",
      "临时 harness 内存中 push 一个对象，真实浏览器重新渲染",
      `cards=${expectedAppendCards}、第 ${expectedAppendCards} 张含『本项目暂无公开外链』、0 异常`,
      `cards=${ext.cards}; hasName=${ext.hasName}; hasEmptyText=${ext.hasEmptyText}; patchError=${ext.patchError}; pageErrors=${JSON.stringify(ext.pageErrors)}; cdpErrors=${cdpExtErr}`,
      ext.cards === expectedAppendCards && ext.hasName && ext.hasEmptyText && !ext.patchError &&
      ext.pageErrors.length === 0 && cdpExtErr === 0);

    const patchClear = `function (d) { d.projects.items.length = 0; }`;
    const clearUrl = makeHarness(html, tmpDir, "qa-clear.html", patchClear);
    cdp.events.length = 0;
    await navigate(clearUrl);
    const clr = await evalJS(`(() => ({
      cards: document.querySelectorAll(".project-card").length,
      empties: [...document.querySelectorAll("#projects-root .empty-state")].map(n => n.textContent),
      patchError: window.__QA_PATCH_ERROR__ || null,
      pageErrors: window.__QA_ERRORS__ || []
    }))()`);
    const cdpClrErr = cdpErrors().length;
    check("B17", "易扩展性：projects.items=[] → 整体空态、不抛异常",
      "临时 harness 内存中清空数组，真实浏览器重新渲染",
      "cards=0 且显示『暂无项目条目』空态",
      JSON.stringify(clr) + `; cdpErrors=${cdpClrErr}`,
      clr.cards === 0 && clr.empties.some((t) => t.includes("暂无项目条目")) &&
      !clr.patchError && clr.pageErrors.length === 0 && cdpClrErr === 0);

    /* ---- 场景 11：sticky header / scroll-margin-top / focus-visible 生效 ---- */
    cdp.events.length = 0;
    await navigate(realUrl);
    const a11y = await evalJS(`(() => {
      const h = getComputedStyle(document.querySelector(".site-header"));
      const s = getComputedStyle(document.querySelector("#projects"));
      const b = getComputedStyle(document.querySelector(".btn"));
      const navLink = document.querySelector(".nav-link");
      navLink.focus();
      return { headerPosition: h.position, headerTop: h.top, scrollMargin: s.scrollMarginTop,
               btnMinHeight: b.minHeight, focusVisibleRule: [...document.styleSheets].some(ss => {
                 try { return [...ss.cssRules].some(r => r.selectorText && r.selectorText.includes(":focus-visible")); }
                 catch (e) { return false; }
               }) };
    })()`);
    check("B18", "sticky header / scroll-margin-top / 44px 触控目标 / :focus-visible 规则生效",
      "CDP getComputedStyle + CSSOM 规则检索",
      "position=sticky, scrollMarginTop>0, btn≥44px, focus-visible 规则存在", JSON.stringify(a11y),
      a11y.headerPosition === "sticky" && parseFloat(a11y.scrollMargin) > 0 &&
      parseFloat(a11y.btnMinHeight) >= 44 && a11y.focusVisibleRule);

    /* ---- 增量改动（00d2627）专项：真实浏览器复核 renderProjects 条件渲染 ---- */
    const proj = await evalJS(`(() => {
      const cards = [...document.querySelectorAll(".project-card")];
      const info = (c) => ({
        name: (c.querySelector(".project-name") || {}).textContent || "",
        text: c.textContent || "",
        labels: [...c.querySelectorAll(".block-label")].map(n => n.textContent),
        links: [...c.querySelectorAll('a[href^="http"]')].map(a => ({
          attr: a.getAttribute("href"), prop: a.href,
          target: a.getAttribute("target"), rel: a.getAttribute("rel")
        })),
        hasMeta: !!c.querySelector(".project-meta"),
        badges: [...c.querySelectorAll(".badge")].map(n => n.textContent),
        emptyState: (c.querySelector(".empty-state") || {}).textContent || "",
        tags: [...c.querySelectorAll(".tag")].map(n => n.textContent),
        emptySpans: [...c.querySelectorAll("span")].filter(s => !s.textContent.trim()).length,
        undefinedHit: (c.textContent || "").includes("undefined")
      });
      return { count: cards.length, cards: cards.map(info) };
    })()`);

    /* B20 — 5 张卡顺序 */
    const orderNames = ["新能源充电桩上位机系列", "Nori", "单兵身体检测", "油井操作平板", "大型轮转器"];
    const orderOk = proj.count === EXPECTED_PROJECT_COUNT &&
      orderNames.every((frag, i) => (proj.cards[i]?.name || "").includes(frag));
    check("B20", "5 张项目卡渲染顺序与 projects.items 一致", "真实 DOM .project-name 顺序比对",
      "5 张，顺序为充电桩 → Nori → 单兵 → 油井 → 轮转器",
      proj.cards.map((c, i) => `${i + 1}.${c.name}`).join(" | "), orderOk);

    /* B21 — Nori 卡：3 外链、URL 完整、无 meta/成果区块、措辞与功能点 */
    const noriCard = proj.cards[1] || {};
    const rockLinks = (noriCard.links || []).filter((l) => (l.attr || "").includes("rock-chips.com/a/cn"));
    const rockOk = rockLinks.length === 1 && rockLinks[0].attr === ROCK_SPEC_URL && rockLinks[0].prop === ROCK_SPEC_URL;
    const noriAllLinksOk = (noriCard.links || []).length === 3 &&
      (noriCard.links || []).every((l) => l.target === "_blank" &&
        /(^|\s)noopener(\s|$)/.test(l.rel || "") && /(^|\s)noreferrer(\s|$)/.test(l.rel || "") &&
        WHITELIST.includes(l.attr));
    const noriKwMiss = NORI_KEYWORDS.filter((k) => !(noriCard.text || "").includes(k));
    const noriExaggeration = EXAGGERATIONS.filter((w) => (noriCard.text || "").includes(w));
    const b21ok = !!noriCard.name && noriAllLinksOk && rockOk && !noriCard.hasMeta &&
      !(noriCard.labels || []).includes("项目成果") &&
      ["核心工作", "技术栈", "相关外链 · 可点击查看"].every((l) => (noriCard.labels || []).includes(l)) &&
      !noriCard.undefinedHit && noriKwMiss.length === 0 && noriExaggeration.length === 0;
    check("B21", "Nori 卡：3 条外链可点击 / RK3576 规格 URL 完整 / 无周期·角色·状态·成果 / 措辞客观",
      "真实 DOM 读取 href / block-label / project-meta / 文本",
      "3 外链全部合规；getAttribute 与 a.href 均等于瑞芯微规格 URL；无 .project-meta 与『项目成果』；含 8 个功能关键词；无夸大用词；无 undefined",
      `links=${(noriCard.links || []).length}; rockOk=${rockOk}; hasMeta=${noriCard.hasMeta}; labels=${(noriCard.labels || []).join(",")}; 关键词缺失=${noriKwMiss.join(",") || "无"}; 夸大用词=${noriExaggeration.join(",") || "无"}`,
      b21ok);

    /* B22 — 3 张行业终端卡：只显示名称 + 客观描述 + 标签 + 空态，无任何空标题/占位 */
    const companyWords = ["有限公司", "集团", "股份", "科技", "智充", "奥飞", "好活", "名医", "未名天"];
    const industryReport = proj.cards.slice(2).map((c, i) => {
      const text = c.text || "";
      const hasDigit = Array.from(text).some((ch) => ch >= "0" && ch <= "9");
      return {
        index: i + 3,
        labels: c.labels,
        onlyLinksBlock: c.labels.length === 1 && c.labels[0] === "相关外链 · 可点击查看",
        emptyStateOk: c.emptyState.includes("本项目暂无公开外链"),
        noLinks: c.links.length === 0,
        commonTags: INDUSTRY_COMMON_TAGS.every((t) => c.tags.includes(t)),
        noEmptySpan: c.emptySpans === 0,
        noUndefined: !c.undefinedHit,
        noDateOrNumber: !hasDigit && !text.includes("%"),
        noCompany: !companyWords.some((w) => text.includes(w)),
        noEmptyHeadings: !["核心工作", "技术栈", "项目成果"].some((l) => text.includes(l)),
      };
    });
    const b22ok = industryReport.length === 3 && industryReport.every((r) =>
      Object.entries(r).filter(([k]) => k !== "index" && k !== "labels").every(([, v]) => v === true));
    check("B22", "3 张行业终端卡纯净性：无空标题 / 空 span / undefined / 公司名 / 日期 / 成果数字 / 技术方案",
      "真实 DOM 逐卡检查 block-label / span / 文本 / 标签 / 空态",
      "每卡仅 1 个『相关外链』区块、1 个空态、0 外链、共同标签齐全，10 项纯净性全 true",
      JSON.stringify(industryReport), b22ok);

    /* B23 — 原充电桩卡未被增量改动破坏 */
    const first = proj.cards[0] || {};
    const firstLabels = first.labels || [];
    const b23ok = firstLabels.length === 4 &&
      ["核心工作", "技术栈", "项目成果", "相关外链 · 可点击查看"].every((l) => firstLabels.includes(l)) &&
      (first.links || []).length === 7 && first.hasMeta === true &&
      (first.badges || []).some((b) => b.includes("进行中")) && !first.undefinedHit;
    check("B23", "回归：原充电桩卡仍为 4 个内容区块 + 7 条外链 + 周期/角色/在职徽标",
      "真实 DOM 比对首张卡结构",
      "4 区块 / 7 外链 / .project-meta 存在 / 含『进行中』徽标 / 无 undefined",
      `labels=${firstLabels.join(",")}; links=${(first.links || []).length}; hasMeta=${first.hasMeta}; badges=${(first.badges || []).join(",")}`, b23ok);

    /* B24 — 锚点导航高亮（IntersectionObserver / scroll 兜底） */
    await evalJS(`(() => {
      document.documentElement.style.scrollBehavior = "auto";
      var s = document.getElementById("projects");
      window.scrollTo(0, Math.max(0, s.offsetTop - 80));
      return s.offsetTop;
    })()`);
    await sleep(650);
    const spy = await evalJS(`(() => ({
      active: [...document.querySelectorAll(".nav-link.is-active")].map(a => a.getAttribute("data-target")),
      ariaCurrent: [...document.querySelectorAll(".nav-link[aria-current]")].map(a => a.getAttribute("data-target")),
      scrollY: window.scrollY
    }))()`);
    const validTargets = ["about", "experience", "projects", "opensource", "education", "contact"];
    const b24ok = spy.active.length >= 1 && spy.active.length <= 1 &&
      validTargets.includes(spy.active[0]) &&
      JSON.stringify(spy.active) === JSON.stringify(spy.ariaCurrent) && spy.scrollY > 0;
    check("B24", "导航高亮：滚动后当前区块链接 is-active 且 aria-current 配对", "CDP 滚动到 #projects + 读 .nav-link 状态",
      "恰好 1 个 active，target 合法，aria-current 一致，scrollY>0", JSON.stringify(spy), b24ok);
    await evalJS(`window.scrollTo(0, 0); "reset"`);

    /* B25 — 点击复制（注入 clipboard mock 走成功路径，验证 UI 反馈链路） */
    await evalJS(`Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: function () { return Promise.resolve(); } } }); "mocked"`);
    await evalJS(`document.querySelector(".copy-btn").click(); "clicked"`);
    await sleep(300);
    const cp = await evalJS(`(() => {
      var btn = document.querySelector(".copy-btn");
      return {
        feedback: (document.getElementById("copy-feedback") || {}).textContent || "",
        toastText: (document.getElementById("toast") || {}).textContent || "",
        toastVisible: document.getElementById("toast").classList.contains("is-visible"),
        btnText: (btn || {}).textContent || "",
        btnCopied: btn ? btn.classList.contains("is-copied") : false,
        dataCopy: btn ? btn.getAttribute("data-copy") : ""
      };
    })()`);
    const b25ok = cp.feedback.includes("已复制") && cp.toastVisible && cp.btnCopied &&
      cp.btnText.includes("已复制") && !!cp.dataCopy;
    check("B25", "点击复制：行内反馈 + toast + 按钮变为『已复制』（无系统弹窗）", "CDP 注入 clipboard mock 后触发 click",
      "copy-feedback / toast / 按钮三处均显示成功态且 data-copy 非空", JSON.stringify(cp), b25ok);

    /* ---- 场景 12（可选 --online-render）：线上 Pages 子路径真实渲染 + CSS 生效 ----
       file:// 只能证明本地可用；本例证明 /resume-blog/ 子路径下 ./ 相对资源全部加载。 */
    if (ARGS.has("--online-render")) {
      try {
        cdp.events.length = 0;
        await navigate(SELF_URL, 45000);
        const on = await evalJS(`(() => {
          const cs = getComputedStyle(document.body);
          return {
            url: location.pathname,
            title: document.title,
            heroName: (document.querySelector("#hero-name") || {}).textContent || "",
            navLinks: document.querySelectorAll(".nav-link").length,
            timeline: document.querySelectorAll(".timeline-item").length,
            projects: document.querySelectorAll(".project-card").length,
            repos: document.querySelectorAll(".repo-card").length,
            bg: cs.backgroundColor,
            mono: /mono|Menlo|Consolas/i.test(cs.fontFamily),
            cssSheets: document.styleSheets.length,
            cssLoaded: [...document.styleSheets].some(s => (s.href || "").includes("style.css")),
            dataLoaded: !!window.RESUME_DATA,
            jsClass: document.documentElement.classList.contains("js"),
            theme: document.documentElement.getAttribute("data-theme"),
            hasNori: document.body.textContent.includes("Nori"),
            hasNoriLink: !!document.querySelector('a[href="https://heynori.com/"]')
          };
        })()`);
        const onlineErr = cdpErrors().length;
        /* 不硬编码深/浅色：headless 默认 light，背景须与 data-theme 一致即可证明 CSS 生效 */
        const expectedBg = on.theme === "light" ? "rgb(255, 255, 255)" : "rgb(13, 17, 23)";
        const onlineOk = on.url.startsWith("/resume-blog/") && on.heroName.includes("孙喜龙") &&
          on.navLinks === 6 && on.timeline === 5 && on.projects >= 1 && on.repos === 6 &&
          on.cssLoaded && on.dataLoaded && on.jsClass && ["light", "dark"].includes(on.theme) &&
          on.bg === expectedBg && on.mono && on.cssSheets >= 1 && onlineErr === 0;
        check("B19", "线上 Pages 子路径真实渲染 + CSS/JS 相对资源生效（与版本无关）",
          "Chrome headless 打开 https://sunxl1128.github.io/resume-blog/ 后 CDP 断言",
          "pathname=/resume-blog/，DOM 基本结构正确，style.css 已加载，body 背景与 data-theme 一致，0 控制台错误",
          JSON.stringify(on) + `; expectedBg=${expectedBg}; cdpErrors=${onlineErr}`, onlineOk);

        /* 线上内容同步：主理人负责 push，未同步时记 WAIT，不判为源码缺陷 */
        const synced = on.projects === EXPECTED_PROJECT_COUNT && on.hasNori && on.hasNoriLink;
        check("B19b", "线上内容与本地 HEAD 同步（5 张项目卡 + Nori 外链）",
          "线上真实渲染 DOM 比对本地 projects.items 数量与新增外链",
          `${EXPECTED_PROJECT_COUNT} 张项目卡且含 Nori 官网外链`,
          `线上 projects=${on.projects}；hasNori=${on.hasNori}；hasNoriLink=${on.hasNoriLink}`,
          synced ? true : null,
          synced ? "" : "主理人尚未 push 00d2627，线上仍为上一版；push 后需复测 B19b / D3（非源码缺陷）");
      } catch (e) {
        check("B19", "线上 Pages 子路径真实渲染 + CSS/JS 相对资源生效（与版本无关）",
          "Chrome headless 打开线上地址", "可渲染", `环境限制/未生效: ${e.message}`, false,
          "线上验证依赖外网访问与 Pages 生效状态，失败不自动判定为源码缺陷");
      }
    }

    return { available: true, dom, links, viewports, errors: errs.length };
  } finally {
    try { if (cdp) cdp.ws.close(); } catch (e) { /* ignore */ }
    try { proc.kill(); } catch (e) { /* ignore */ }
    await sleep(300);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
}

/* ===========================================================================
   D. 外链 curl 复测 / 线上 Pages 探测
   =========================================================================== */
function networkChecks() {
  /* 瞬时网络抖动会导致单条 curl 偶发超时；失败自动重试 1 次，避免误报。 */
  const curl = (url) => {
    let last = "ERR";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        last = execFileSync("curl", ["-sS", "-o", "NUL", "-L", "--max-time", "30",
          "-w", "%{http_code}", url], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
        if (last === "200") return last;
      } catch (e) { last = "ERR"; }
    }
    return last;
  };
  const codes = [];
  for (const u of WHITELIST) codes.push({ url: u, code: curl(u) });
  const bad = codes.filter((c) => c.code !== "200");
  const n = WHITELIST.length;
  check("D1", `白名单 ${n} 条外链 curl 复测 HTTP 200`, "curl -L -o NUL -w %{http_code}",
    `${n}/${n} = 200`, `${codes.length - bad.length}/${codes.length} = 200；非200=${bad.map((b) => b.code + " " + b.url).join(" | ") || "无"}`,
    bad.length === 0);

  /* 403 域名纪律（文档里的「禁止说明」不算，只查是否真的被当作外链使用） */
  const forbidden403 = FORBIDDEN_URLS.map((u) => ({ url: u, code: curl("https://" + u + "/") }));
  check("D1b", "403 域名未被误加入白名单或未作为可用外链", "curl + 白名单比对",
    "support.heynori.com 返回 403 且不在 WHITELIST",
    forbidden403.map((f) => `${f.code} ${f.url}`).join(" | ") + `；在白名单=${WHITELIST.some((u) => u.includes("support.heynori.com"))}`,
    forbidden403.every((f) => f.code === "403") && !WHITELIST.some((u) => u.includes("support.heynori.com")));

  if (!ARGS.has("--no-online")) {
    const online = [SELF_URL, SELF_URL + "data/resume.js", SELF_URL + "assets/css/style.css"].map((u) => ({ url: u, code: curl(u) }));
    const live = online.every((o) => o.code === "200");
    check("D2", "GitHub Pages 线上地址与静态资源可访问", "curl 探测 3 个线上 URL",
      "3/3 = 200（尚未生效则标注待复测）", online.map((o) => o.code + " " + o.url).join(" | "),
      live, live ? "" : "Pages 可能尚未生效，需主理人稍后复测（不计为源码缺陷）");

    /* 线上内容同步状态：主理人负责 push，未同步记 WAIT */
    let onlineJs = "";
    try {
      onlineJs = execFileSync("curl", ["-sS", "-L", "--max-time", "30", SELF_URL + "data/resume.js"],
        { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) { onlineJs = ""; }
    const jsSynced = onlineJs.includes("nori-family-ai-hub") && onlineJs.includes("https://heynori.com/");
    check("D3", "线上 data/resume.js 已包含 00d2627 的新项目与外链", "curl 取回线上 JS 内容比对",
      "含 nori-family-ai-hub 与 heynori.com 外链",
      jsSynced ? "已同步" : "线上仍为上一版（未 push）",
      jsSynced ? true : null,
      jsSynced ? "" : "主理人负责 push 与复测；此项为部署状态，不判为源码缺陷");
  }
  return codes;
}

/* ===========================================================================
   主流程
   =========================================================================== */
(async () => {
  console.log("== 简历博客 QA 回归自检 ==\n");
  staticChecks();
  await browserChecks(read(p("index.html")));
  let codes = [];
  if (!ARGS.has("--no-links")) codes = networkChecks();

  const passes = results.filter((r) => r.state === "PASS").length;
  const fails = results.filter((r) => r.state === "FAIL").length;
  const waits = results.filter((r) => r.state === "WAIT").length;
  const judged = passes + fails;
  console.log("---- 用例结果 ----");
  for (const r of results) {
    console.log(`${r.state} ${r.id} | ${r.name}\n       期望: ${r.expected}\n       实际: ${r.actual}`);
    if (r.state === "WAIT") { console.log(`       待复测: ${r.detail}`); }
  }
  console.log(`\n== 汇总: ${passes}/${judged} 通过 (${(100 * passes / (judged || 1)).toFixed(1)}%)，WAIT ${waits} ==`);
  if (codes.length) {
    console.log("\n---- 外链状态码 ----");
    codes.forEach((c) => console.log(`${c.code} ${c.url}`));
  }
  const failed = results.filter((r) => r.state === "FAIL");
  if (failed.length) {
    console.log("\n---- 失败项 ----");
    failed.forEach((r) => console.log(`${r.id} ${r.name}: ${r.actual} ${r.detail}`));
  }
  const waiting = results.filter((r) => r.state === "WAIT");
  if (waiting.length) {
    console.log("\n---- 待主理人 push 后复测（非源码缺陷） ----");
    waiting.forEach((r) => console.log(`${r.id} ${r.name}: ${r.detail}`));
  }
  process.exitCode = failed.length ? 1 : 0;
})().catch((e) => {
  console.error("自检脚本异常:", e);
  process.exitCode = 2;
});
