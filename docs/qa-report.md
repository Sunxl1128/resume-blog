# QA 独立验证报告 · 孙喜龙简历博客

> 验证人：严过关（QA 工程师） · 验证时间：2026-11-12
> 被测提交：`dca7397 feat: init resume blog`（`main`，工作区 clean）
> 本地项目：`D:/workbuddy/2026-11-12-14-17-52/resume-blog/`
> 线上地址：https://sunxl1128.github.io/resume-blog/

---

## 一、结论速览

| 项目 | 结果 |
| --- | --- |
| 用例总数 | **39** |
| 通过 / 失败 | **39 / 0** |
| 通过率 | **100.0%** |
| 智能路由判定 | **NoOne**（全部通过，无需工程师修复） |
| 上线放行建议 | **放行**。源码零缺陷，线上 Pages 已生效且真实渲染验证通过 |
| 源码改动 | **无**。未修改 `index.html` / `style.css` / `main.js` / `resume.js` / `README.md` / `content-guide.md` |
| 新增文件 | `tests/validate.mjs`（回归工具）、`docs/qa-report.md`（本报告） |

**核心结论**：工程师交付的站点不是「文件存在」，而是**在真实 Chrome 里能跑、在线上 `/resume-blog/` 子路径下也能跑**。设计令牌、8pt 间距、渐变分割线、状态徽标、IDE 窗口栏、主题切换、打印样式等 UI claim 均在 CSS/DOM 中真实生效；最关键的「追加一个项目对象即多渲染一张卡片」可维护性 claim 已用内存 patch + 真实浏览器重新渲染实测通过。

---

## 二、测试环境与方法

| 项 | 说明 |
| --- | --- |
| 运行时 | Node.js v22.22.2（内置 `WebSocket` / `fetch` / `vm`，零第三方依赖） |
| 浏览器 | 系统 **Google Chrome**（`C:/Program Files/Google/Chrome/Application/chrome.exe`），`--headless=new` |
| 浏览器控制 | **Chrome DevTools Protocol**（`Runtime.evaluate` / `Emulation.*` / `Page.navigate` / `Log.enable`），非仅 `--dump-dom` |
| 控制台错误捕获 | CDP `Runtime.exceptionThrown` + `Runtime.consoleAPICalled(type=error)` + `Log.entryAdded(level=error)`，并在 harness 内注入 `window.onerror` / `console.error` 钩子 |
| 数据加载 | Node `vm.runInNewContext` + `global.window = {}`，加载 `window.RESUME_DATA` |
| 扩展性测试 | 生成**系统临时目录**内的 harness HTML（复制真实 `index.html`，资源改绝对 `file://` URL），在 `resume.js` 之后、`main.js` 之前注入 patch 函数**在内存中修改** `window.RESUME_DATA`；`finally` 中 `rmSync` 删除。**未复制、未修改、未污染 `data/resume.js`** |
| 外链复测 | `curl -sS -o NUL -L --max-time 30 -w %{http_code}`，失败自动重试 1 次 |
| 一键回归 | `node tests/validate.mjs --online-render` |

> 环境具备可用浏览器，因此**未降级**到「HTTP server + curl + Node 静态执行」的等价方案；全部渲染断言均在真实浏览器 DOM 上完成。

---

## 三、用例表（39 条）

| 编号 | 验证项 | 方法 | 期望 | 实际 | 通过 |
| --- | --- | --- | --- | --- | --- |
| A1 | JS 语法 | `node --check` 两个 JS | 0 error | 两个 JS 均通过 | ✅ |
| A2 | 数据可作为 `window.RESUME_DATA` 加载 | Node `vm` 注入 `global.window` | 对象可用 | 加载成功 | ✅ |
| A3 | 资源全部 `./` 相对路径（Pages 子路径兼容） | 正则提取 script/link 引用 | 全部 `./`，无 `/` 绝对路径 | `./data/resume.js`、`./assets/js/main.js`、`./assets/favicon.svg`、`./assets/css/style.css`；绝对路径 0 | ✅ |
| A4 | 同步 script 注入 / `file://` 双击场景 | 检查 script 标签顺序与属性 | 2 个同步 script，无 module/async/defer | 2 个同步 script，顺序为 resume.js → main.js | ✅ |
| A5 | 无 `fetch` / XHR / 外部 CDN | 源码正则扫描 | 0 处 | fetch/XHR=0，外部 CDN=0 | ✅ |
| A6 | `projects.items` 数据契约与渲染函数读取键一致 | `vm` 加载 + 提取 `renderProjects` 的 `project.*` 键与 `KIND` 映射 | 字段无未知项、`links.kind ⊆ KIND` | 读取键 11 个（name/period/role/status/statusTone/summary/tags/highlights/stack/results/links）；KIND 6 种；问题=无 | ✅ |
| A7 | 源码所有 http(s) 地址在白名单内 | 全源码 URL 提取比对 | 0 条越界 | 共 23 条；越界=无 | ✅ |
| A8 | 无不可达域名外链 / 无 `MonkeySunxl` | 关键字扫描 | 0 命中 | `52myjt.com`/`u17.com`/`pkusky.com` 均 0；MonkeySunxl 0；账号统一 `Sunxl1128` | ✅ |
| A9 | 两个 UI skill 的设计声明在 CSS 真实存在 | CSS 规则静态审查（21 项） | 21/21 命中 | 三层令牌、8pt、近黑背景、橘黄标题、`.modiv`、`.badge`、`.window__bar`、`[data-theme=light]`、`:focus-visible`、`scroll-margin-top`、44px、`min-width:0`、`overflow-wrap`、`auto-fit minmax`、reduced-motion、`@media print`、打印展开 URL、4 个断点全部命中 | ✅ |
| A10 | 无 `alert/confirm/prompt`（沙箱 iframe 铁律） | 源码正则 | 0 处 | 0 处（复制反馈用 toast + 行内状态） | ✅ |
| A11 | SEO title/description/keywords/OG/canonical | index.html 标签检查 | 9/9 | 9/9 | ✅ |
| A12 | `<noscript>` 静态兜底 | 结构检查 | 含姓名、5 段经历、外链 | 通过 | ✅ |
| A13 | 5 段公司名/时间/业绩数字与 `resume.md` 一致 | 源数据 vs 素材原文逐项比对 | 无杜撰 | 经历数 5；5 个公司名、5 个起始时间、8 个关键数字（2000+/10+/50+/95%+/1% 以下/0.3% 以下/40%/60%）全部可在原文找到；差异=无 | ✅ |
| A14 | 开源区标题/非商业声明、页脚托管文案 | 数据字段检查 | 三项齐备 | 「开源与技术实践」+「并非任职公司的商业项目」+「本站由 GitHub Pages 托管」 | ✅ |
| A15 | 导航 6 项与 `section[data-nav]` 映射 | 提取 `nav.id` 与 HTML `data-nav` | 6 项全命中 | nav=about/experience/projects/opensource/education/contact；sections=about,about,experience,projects,opensource,education,contact（`skills` 复用 about，属设计） | ✅ |
| A16 | 唯一扩展点 + 空态常量齐备 | 源码/文档一致性 | 常量存在 | `projects.linksEmptyText` / `emptyText` / `projects.items` 齐备 | ✅ |
| B0 | 真实浏览器可用 | spawn Chrome headless + CDP | 可连接并求值 | Chrome 已连接 | ✅ |
| B1 | **真实渲染 DOM 全量断言** | Chrome 加载 `file://index.html` 后 `Runtime.evaluate` | Hero「孙喜龙」、8 顶层 section、5 经历、1 项目、6 仓库、教育、页脚 | `sections=8, navLinks=6, timeline=5, projectCards=1, repoCards=6, eduCards=1, contactRows=4, skillGroups=4, advCards=4, footerLines=3, modiv=7, windowBar=1, h1=1` 全部匹配 | ✅ |
| B2 | IDE 窗口/状态徽标/分割线真实生成 | DOM 节点计数 | dots=3, badge≥10, modiv=7 | dots=3, badge=16, modiv=7 | ✅ |
| B3 | 开源标题/教育/页脚文案落地 | DOM `textContent` | 三项存在 | 「# 开源与技术实践」、吉林师范大学、托管声明均在 | ✅ |
| B4 | **带参 URL `&type=news` 未被截断/错误转义** | 读真实 DOM `a.getAttribute('href')` 与 `a.href` | 严格等于原 URL | `attr` 与 `prop` 均为 `https://www.xcharge.com/newsDetail?id=6a3350039c6f921c19dcc7e2&type=news`（`&` 未变 `&amp;`、未截断） | ✅ |
| B5 | 外链 100% 配对 `target=_blank` + `rel=noopener noreferrer` | 遍历 `a[href^=http]` | badTarget=0, badRel=0 | 共 24 条；badTarget=0；badRel=0 | ✅ |
| B6 | 渲染后 DOM 外链全部在白名单 | 提取 DOM href 去重比对 | 0 越界 | 21 条唯一 URL；越界=无 | ✅ |
| B7 | 移动站 `m.xcharge.com` 外链存在 | DOM href 检索 | 1 条 | 1 条，URL 完整 | ✅ |
| B8 | **控制台无红色报错 / 未捕获异常** | CDP 三类错误事件 + 页面钩子 | 0 条 | 0 条 | ✅ |
| B9 | 主题切换 5 项联动 | CDP 触发 `click` 后读 DOM 属性 | 主题翻转且状态一致 | `light→dark`，`stored=dark`、`aria-pressed=false`、`aria-label=切换到浅色主题`、`theme-color=#0d1117` | ✅ |
| B10 | 刷新后主题记忆（防闪烁） | reload 后读 `data-theme` | 与 localStorage 一致 | `theme=dark, stored=dark` | ✅ |
| B9b | 防闪烁三层优先级 | `prefers-color-scheme` × 2 + 手动写 localStorage，各自 reload | localStorage > 系统 > 默认深色 | `[light→light, dark→dark, 系统 light+记忆 dark→dark]` | ✅ |
| B11 | 防闪烁 inline 脚本在 `<head>` 内、早于 `<body>` | 源码位置检查 | 位置正确 | 存在且位置正确 | ✅ |
| B12 | `prefers-reduced-motion` 降级 | `setEmulatedMedia` + computedStyle | 打字机一次性显示、reveal 100% 可见 | `matches=true, lines=7, filled=7, reveal 35/35` | ✅ |
| B13 | 禁用 JS 后 `<noscript>` 兜底 | `setScriptExecutionDisabled` + 读 `.noscript-box` | 姓名/公司/教育/≥5 外链 | 文本 1119 字符、8 条外链、`html.js` 未添加 | ✅ |
| B14 | **360/768/1280/1600 无横向滚动** | `setDeviceMetricsOverride` + `scrollWidth` 实测 | 4/4 无页面级溢出 | 4 档 `scrollWidth === clientWidth`，全部 `overflow=false`；360px 下 `nav-list` 为设计内 `overflow-x:auto` 容器 | ✅ |
| B15 | `@media print` 隐藏导航 + 展开链接 URL | `setEmulatedMedia(print)` + `getComputedStyle` | 导航隐藏、URL 展开、reveal 可见 | header/nav/toggle/toast/heroSide 均 `none`；`a::after` = `" <https://github.com/Sunxl1128>"`；reveal opacity=1 | ✅ |
| B16 | **易扩展性：追加 `links:[]` 最小项目** | 临时 harness 内存 `push` 对象 + 真实浏览器重渲染 | 多 1 张卡 + 空态「本项目暂无公开外链」+ 0 异常 | `cards=2`、`hasName=true`、`hasEmptyText=true`、patch/page/CDP 错误全 0 | ✅ |
| B17 | **易扩展性：`projects.items=[]` 整体空态** | 临时 harness 内存清空数组 | 0 卡 + 空态「暂无项目条目」 | `cards=0`，空态文案正确，0 异常 | ✅ |
| B18 | sticky header / `scroll-margin-top` / 44px / `:focus-visible` | `getComputedStyle` + CSSOM | 4 项生效 | `position=sticky`、`scrollMarginTop=80px`、btn `min-height=44px`、focus-visible 规则存在 | ✅ |
| B19 | **线上 Pages 子路径真实渲染 + CSS/JS 相对资源生效** | Chrome headless 打开线上 URL 后 CDP 断言 | pathname=`/resume-blog/`、DOM 数量正确、style.css 已加载、0 报错 | `/resume-blog/`，hero/6 nav/5 经历/1 项目/6 仓库齐全，`cssLoaded=true`、`cssSheets=1`、`dataLoaded=true`、`jsClass=true`、等宽字体生效、背景与 `data-theme` 一致、0 控制台错误 | ✅ |
| D1 | 白名单 21 条外链 curl 复测 | `curl -L -w %{http_code}`，失败重试 1 次 | 21/21 = 200 | 21/21 = 200 | ✅ |
| D2 | 线上 Pages 地址与静态资源 | curl 探测 3 个线上 URL | 3/3 = 200 | 首页、`data/resume.js`、`assets/css/style.css` 全部 200 | ✅ |

---

## 四、外链状态码表

所有 21 条白名单地址均 `curl -L` 实测 **HTTP 200**，页面渲染后 DOM 中出现的 21 条唯一 URL 与之完全一致，无白名单之外的地址。

| # | URL | 状态码 |
| --- | --- | --- |
| 1 | `https://www.xcharge.com/` | 200 |
| 2 | `https://www.xcharge.com/aboutUs` | 200 |
| 3 | `https://www.xcharge.com/device/C7EU` | 200 |
| 4 | `https://www.xcharge.us/product/c6` | 200 |
| 5 | `https://m.xcharge.com/device/NetZeroSeries` | 200 |
| 6 | `https://openchargealliance.org/participants/beijing-x-charge-technology-co-ltd` | 200 |
| 7 | `https://www.xcharge.com/newsDetail?id=6a3350039c6f921c19dcc7e2&type=news` | 200 |
| 8 | `https://www.gdalpha.com/` | 200 |
| 9 | `https://www.51haohuo.com/` | 200 |
| 10 | `https://developer.android.com/jetpack/compose` | 200 |
| 11 | `https://kotlinlang.org/` | 200 |
| 12 | `https://flutter.dev/` | 200 |
| 13 | `https://www.openchargealliance.org/` | 200 |
| 14 | `https://mqtt.org/` | 200 |
| 15 | `https://github.com/Sunxl1128` | 200 |
| 16 | `https://github.com/Sunxl1128/CoolMallKotlin` | 200 |
| 17 | `https://github.com/Sunxl1128/SuperEditTextLibrary` | 200 |
| 18 | `https://github.com/Sunxl1128/SxlLibrary` | 200 |
| 19 | `https://github.com/Sunxl1128/SxlLibrary2` | 200 |
| 20 | `https://github.com/Sunxl1128/DJI-Android-VideoStreamDecodingSample` | 200 |
| 21 | `https://github.com/Sunxl1128/ai-native-jobhunt` | 200 |
| — | `https://sunxl1128.github.io/resume-blog/` | 200 |
| — | `https://sunxl1128.github.io/resume-blog/data/resume.js` | 200 |
| — | `https://sunxl1128.github.io/resume-blog/assets/css/style.css` | 200 |

**带参 URL 专项**：`--dump-dom` 的 HTML 序列化中出现 `&amp;type=news` 是浏览器**标准的属性序列化转义**，不是错误转义。通过 CDP 读取真实 DOM 属性 `getAttribute('href')` 与 `a.href`，两者均严格等于 `...&type=news`，`&` 未被吞掉、未被截断，链接可正常点击。

---

## 五、测试轮次与智能路由过程（如实记录）

严格控制在 **2 轮**。所有失败项均为**测试脚本自身的断言错误**，路由到 **QA 自修**，**无一次需要 Engineer 修源码**。

| 轮次 | 结果 | 失败项 | 判定 | 处理 |
| --- | --- | --- | --- | --- |
| 第 1 轮 | 32/35 | B1、B9、B10 | **QA（测试脚本 bug）** | B1 用 `main section` 计数把 4 个语义化 `.skill-group` 卡片算进 section（得 12，顶层实为 8）→ 改断言为 `main > section`；B9/B10 硬编码假设初始主题为 dark，而 headless Chrome 默认 `prefers-color-scheme: light`、前置脚本按设计给出 light → 改为「不假设初始值，只断言翻转 + 记忆 + 联动」，并补充 B9b 验证三层优先级 |
| 第 2 轮 | **38/38（不含可选 B19）= 100%** | 无 | **NoOne** | 全量回归通过；线上 Pages 已生效（3/3 = 200） |
| 补充用例 | 新增 B19 线上真实渲染 | B19 首次失败 | **QA（测试脚本 bug）** | 断言硬编码 `body` 背景为深色，而线上在 headless 默认 light 偏好下白底为**正确设计** → 改为「背景色与 `data-theme` 一致」；同时 `cssLoaded=true`、`mono=true` 已证明 CSS 在子路径生效 |
| 网络抖动 | D1 一次 `mqtt.org` = ERR | 非缺陷 | **重试机制** | 单独复测 `mqtt.org`：GET × 3 + HEAD 全部 200（~0.3s），确认为 21 条连发时的瞬时超时；给回归工具加「失败重试 1 次」，最终 21/21 = 200 |
| **最终** | **39/39 = 100%** | **0** | **NoOne** | 放行 |

> 补充说明：B19 与 D1 重试均为第 2 轮通过之后做的**补充验证与工具健壮性加固**，不涉及源码回归，未突破 2 轮上限。

---

## 六、遗留问题清单

**阻断性遗留问题：无。**

以下为**非缺陷观察项 / 优化建议**，不影响上线，供后续迭代参考：

| # | 观察项 | 位置 | 性质 |
| --- | --- | --- | --- |
| 1 | `.copy-btn` 为 `min-height:36px` + `min-width:44px`，未完全达到 44×44 触控目标 | `assets/css/style.css:1009-1017` | 轻微可访问性优化建议。`.btn` / `.nav-link` / `.nav-brand` / `.theme-toggle` 均为 44px，主交互已达标 |
| 2 | 360px 宽度下 `.nav-list` 为 `overflow-x:auto` 容器，导航项可横向滑动 | `assets/css/style.css:581-591` | **设计取舍**，不是页面横向滚动。实测 4 档宽度 `scrollWidth === clientWidth`，页面级无溢出 |
| 3 | headless/系统偏好为 light 时首次访问呈浅色主题 | `index.html:27-42` | **符合设计**（README 声明「首次访问尊重 prefers-color-scheme」），非缺陷 |
| 4 | `main section` 共 12 个（8 个顶层区块 + 4 个 `.skill-group` 语义化 `<section>` 卡片） | `assets/js/main.js:387` | 语义化用法合理，顶层区块数仍为验收要求的 8 |
| 5 | `mqtt.org` 曾出现一次 curl 瞬时 ERR | 网络 | 单独复测 4 次全 200，重试机制已覆盖 |
| 6 | 线上 Pages 生效时间 | 部署 | 验证时已生效（3/3 = 200 + B19 线上真实渲染通过），无需主理人补测 |

---

## 七、上线放行建议

**建议放行上线，无需工程师返工。**

理由：
1. **功能真实可用**：真实 Chrome 渲染 DOM 全量断言通过，控制台 0 报错；线上 `/resume-blog/` 子路径下 CSS/JS 相对资源同样加载生效（B19）。
2. **外链纪律达标**：21 条可点击外链全部 200、全部在白名单内、100% 配对 `target/rel`；三个不可达域名与 `MonkeySunxl` 账号 0 命中；带参 URL 的 `&` 完好。
3. **最关键的扩展性 claim 已证伪风险排除**：内存中追加一个 `links:[]` / `highlights:[]` 最小项目对象即多渲染一张卡片并显示「本项目暂无公开外链」空态；清空数组显示整体空态；两者均 0 异常。后续补充项目经历**确实只需改 `data/resume.js` 的 `projects.items`**。
4. **UI claim 真实落地**：21 项设计令牌/组件/响应式/打印/降级规则在 CSS 与 DOM 中均可验证，不是文档里的一句话。
5. **内容真实**：5 段公司名、时间、业绩数字与 `resume.md` 逐项一致，无杜撰。

建议主理人在合入时一并提交两个新增文件（`tests/validate.mjs`、`docs/qa-report.md`）；此后每次改内容，运行一次回归：

```bash
cd resume-blog
node tests/validate.mjs --online-render    # 全量（含外链 + 线上）
node tests/validate.mjs --no-links --no-online   # 仅本地快速自检（离线）
```

---

## 八、交付物与合规声明

| 类别 | 内容 |
| --- | --- |
| 新增文件 | `tests/validate.mjs`（自包含回归工具，零第三方依赖）、`docs/qa-report.md`（本报告） |
| 源文件改动 | **无**。`git status --short` 仅显示 `?? tests/` 与 `?? docs/qa-report.md`，无 `M` 条目 |
| 临时文件 | 全部位于项目外的系统临时目录 / 父目录，测完已删除；`data/resume.js` 全程未被复制或修改 |
| 未执行操作 | 未执行 `git push`、未创建远程仓库、未改 GitHub 设置、未修改任何既有源文件 |
| 测试轮次 | 2 轮（第 1 轮 3 项 QA 自修 → 第 2 轮全通过），未超上限 |
