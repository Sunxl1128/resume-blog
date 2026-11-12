# QA 独立验证报告 · 孙喜龙简历博客（v2 / 增量回归）

> 验证人：严过关（QA 工程师） · 验证时间：2026-11-12
> **本轮被测提交**：`00d2627 feat: add Nori and industry terminal projects`（本地 `main`，工作区 clean）
> **基线提交**：`dca7397 feat: init resume blog` → `c250b22 test: add regression validator and QA report`（v1 报告结论见第七节）
> 本地项目：`D:/workbuddy/2026-11-12-14-17-52/resume-blog/`
> 线上地址：https://sunxl1128.github.io/resume-blog/
> 分工：QA 负责脚本/用例/回归；**主理人负责 push 与线上复测**

---

## 一、结论速览

| 项目 | 结果 |
| --- | --- |
| 用例总数 | **52**（50 PASS / **0 FAIL** / 2 WAIT） |
| 通过率 | **50/50 = 100.0%**（WAIT 不计入分母） |
| 智能路由判定 | **NoOne** —— 无源码缺陷，无需工程师返工 |
| 本地放行 | **放行**。5 张项目卡、3 条新外链、`renderProjects` 条件渲染全部实测通过 |
| 线上状态 | **待主理人 push**：线上仍为上一版（1 张项目卡），2 项 WAIT 需 push 后复测 |
| 源码改动（QA） | **无**。QA 只更新 `tests/validate.mjs` 与 `docs/qa-report.md` |
| 一键回归 | `node tests/validate.mjs --online-render` |

**核心结论**：工程师 `00d2627` 的增量改动经真实 Chrome/CDP 复核**无缺陷**——`renderProjects` 的条件渲染确实做到了「字段缺失不生成空标签/空标题/空容器」，5 张卡顺序正确、3 张行业终端卡保持纯净、Nori 卡外链与措辞合规，且原有充电桩卡、主题、reduced-motion、打印、noscript、四档响应式、导航高亮、点击复制全部无回归。线上 2 项 WAIT 纯粹是**尚未 push 的部署状态**，按任务分工不计为源码缺陷。

---

## 二、本轮增量改动范围（`dca7397+c250b22` → `00d2627`）

| 文件 | 改动 | QA 验证方式 |
| --- | --- | --- |
| `data/resume.js` | `projects.items` 1 → **5**；新增 Nori + 3 个行业终端项目；新增 3 条外链；`site.description` 扩展 | A17–A20 / B20–B23 / D1 |
| `assets/js/main.js` | `renderProjects` 内 13 行：`period`/`role`/`status` 条件创建、三者全空不生成 `.project-meta`；`highlights`/`stack`/`results` 为空不生成区块；`linksBlock` 始终渲染 | B21 / B22 / B23 / B16 / B17 |
| `README.md` | 项目数量说明、字段模板提示、新增外链清单 | A7 / A19 / A20 |
| `docs/content-guide.md` | `period`/`role` 改为可选、空值渲染说明、新增外链白名单 | A7 / A16 / A20 |

未改动：`index.html`、`assets/css/style.css`、`assets/favicon.svg`、`.nojekyll`、`.gitignore`、9 个源文件中的其余部分。

---

## 三、测试环境与方法

| 项 | 说明 |
| --- | --- |
| 运行时 | Node.js v22.22.2（内置 `WebSocket` / `fetch` / `vm`，零第三方依赖） |
| 浏览器 | 系统 **Google Chrome**，`--headless=new`；通过 **Chrome DevTools Protocol** 驱动（`Runtime.evaluate` / `Emulation.*` / `Page.navigate` / `Log.enable`） |
| 控制台错误 | CDP `Runtime.exceptionThrown` + `Runtime.consoleAPICalled(error)` + `Log.entryAdded(error)` + harness 内 `window.onerror` / `console.error` 钩子，四路捕获 |
| 数据加载 | Node `vm.runInNewContext` + `global.window = {}` 加载 `window.RESUME_DATA` |
| 扩展性冒烟 | 系统临时目录内 harness（复制真实 `index.html`，资源改绝对 `file://` URL），在 `resume.js` 之后、`main.js` 之前注入 patch **在内存中改数据**；`finally` 里 `rmSync` 删除。**未复制/修改/污染 `data/resume.js`** |
| 外链 | `curl -sS -L --max-time 30 -w %{http_code}`，失败自动重试 1 次 |
| 结果状态 | **PASS / FAIL / WAIT**。WAIT = 部署状态（主理人尚未 push）导致线上仍是旧版，不计入通过率分母、不判为源码缺陷，push 后复测即可 |

> 环境具备真实浏览器，**未降级**到 curl + Node 静态执行的等价方案；全部渲染断言均在真实 DOM 上完成。

---

## 四、用例表（52 条 · 完整）

| 编号 | 验证项 | 方法 | 期望 | 实际 | 结果 |
| --- | --- | --- | --- | --- | --- |
| A1 | JS 语法 | `node --check` 两个 JS | 0 error | 两个 JS 均通过 | ✅ PASS |
| A2 | 数据可作为 `window.RESUME_DATA` 加载 | Node `vm` 注入 `global.window` | 对象可用 | 加载成功 | ✅ PASS |
| A3 | 资源全部 `./` 相对路径 | 正则提取 script/link | 全部 `./`，无绝对路径 | 4 个资源全 `./`；绝对路径 0 | ✅ PASS |
| A4 | 同步 script 注入 / `file://` 双击 | script 标签检查 | 2 个同步 script | 2 个同步 script，顺序正确 | ✅ PASS |
| A5 | 无 `fetch` / XHR / 外部 CDN | 源码正则 | 0 处 | 0 处 | ✅ PASS |
| A6 | `projects.items` 数据契约 | `vm` + 提取 `project.*` 键与 `KIND` | 字段无未知项、kind ⊆ KIND | 读取键 11 个；KIND 6 种；问题=无 | ✅ PASS |
| A7 | 全源码 http(s) 地址在白名单内 | URL 提取比对（白名单已更新为 24 条） | 0 越界 | 共 26 条；越界=无 | ✅ PASS |
| A8 | 无不可达域名 / 无 `MonkeySunxl` | 关键字扫描 | 0 命中 | 3 个禁用域名 0；MonkeySunxl 0 | ✅ PASS |
| A9 | 两个 UI skill 设计声明真实落地 | CSS 静态审查 21 项 | 21/21 命中 | 21/21，缺失=无 | ✅ PASS |
| A10 | 无 `alert/confirm/prompt` | 源码正则 | 0 处 | 0 处 | ✅ PASS |
| A11 | SEO title/description/keywords/OG/canonical | 标签检查 | 9/9 | 9/9 | ✅ PASS |
| A12 | `<noscript>` 静态兜底 | 结构检查 | 含姓名/经历/外链 | 通过 | ✅ PASS |
| A13 | 5 段公司名/时间/业绩数字与 `resume.md` 一致 | 逐项比对 | 无杜撰 | 5 段 + 8 个关键数字全部可溯源 | ✅ PASS |
| A14 | 开源区标题/非商业声明/页脚托管文案 | 数据字段 | 三项齐备 | 齐备 | ✅ PASS |
| A15 | 导航 6 项与 `section[data-nav]` 映射 | id 比对 | 6 项全命中 | 全命中（`skills` 复用 about） | ✅ PASS |
| A16 | 唯一扩展点 + 空态常量齐备 | 源码/文档一致性 | 常量存在 | 齐备 | ✅ PASS |
| **A17** | **增量数据契约：5 项顺序、无编造字段、行业卡极简** | `vm` 遍历 `projects.items` | 5 项且 id 顺序正确；新增 4 项无 period/role/status/statusTone、results=[]；行业 3 项四数组全空且共同标签齐全；Nori 3 条白名单外链 | 全部满足；编造字段=无；行业卡问题=无 | ✅ PASS |
| **A18** | `site.description` 扩展且保留原技术词 | 关键字检查 | 8/8 命中 | 缺失=无（含 Nori/RK3576/行业终端 + 5 个原技术词） | ✅ PASS |
| **A19** | 新增项目措辞客观、`Onboarding` 拼写、Nori 功能点 | 序列化文本关键字 | 夸大用词 0、无拼写错误、8 个功能词齐全 | 夸大用词=无；拼写错误=false；功能点缺失=无 | ✅ PASS |
| **A20** | 403 域名未进入数据外链、3 条新 URL 在白名单 | 数据文本 + 白名单比对 | 403 域名 0 命中；3 条齐备 | 403命中=无；新URL齐备=true | ✅ PASS |
| B0 | 真实浏览器可用 | spawn Chrome + CDP | 可连接 | Chrome 已连接 | ✅ PASS |
| B1 | **真实渲染 DOM 全量断言** | Chrome 加载 `file://index.html` 后 `Runtime.evaluate` | 8 顶层 section / 5 经历 / **5 项目** / 6 仓库 / 教育 / 页脚 | `sections=8, navLinks=6, timeline=5, projectCards=5, repoCards=6, eduCards=1, contactRows=4, skillGroups=4, advCards=4, footerLines=3, modiv=7, windowBar=1, h1=1` | ✅ PASS |
| B2 | IDE 窗口/徽标/分割线真实生成 | DOM 计数 | dots=3, badge≥10, modiv=7 | dots=3, badge=**19**, modiv=7 | ✅ PASS |
| B3 | 开源标题/教育/页脚文案落地 | DOM textContent | 三项存在 | 三项均在 | ✅ PASS |
| B4 | 带参 URL `&type=news` 未截断/错误转义 | 读真实 DOM `getAttribute('href')` 与 `a.href` | 严格等于原 URL | attr 与 prop 均为 `...?id=6a3350039c6f921c19dcc7e2&type=news` | ✅ PASS |
| B5 | 外链 100% 配对 `target=_blank` + `rel` | 遍历 `a[href^=http]` | badTarget=0, badRel=0 | 共 **27** 条；两者皆 0 | ✅ PASS |
| B6 | 渲染后 DOM 外链全在白名单 | href 去重比对 | 0 越界 | **24** 条唯一 URL；越界=无 | ✅ PASS |
| B7 | 移动站 `m.xcharge.com` 外链存在 | DOM href 检索 | 1 条 | 1 条 | ✅ PASS |
| B8 | 控制台无红色报错 / 未捕获异常 | CDP 三类错误事件 | 0 条 | 0 条 | ✅ PASS |
| B9 | 主题切换 5 项联动 | CDP click 后读属性 | 翻转且状态一致 | `light→dark`，stored/aria/label/meta 全一致 | ✅ PASS |
| B10 | 刷新后主题记忆 | reload 后读 `data-theme` | 与 localStorage 一致 | `theme=dark, stored=dark` | ✅ PASS |
| B9b | 防闪烁三层优先级 | `prefers-color-scheme` × 2 + 手动写 localStorage | localStorage > 系统 > 默认深色 | `[light→light, dark→dark, 系统light+记忆dark→dark]` | ✅ PASS |
| B11 | 防闪烁 inline 脚本在 `<head>` 内 | 源码位置检查 | 位置正确 | 存在且位置正确 | ✅ PASS |
| B12 | `prefers-reduced-motion` 降级 | `setEmulatedMedia` + computedStyle | 打字机一次性显示、reveal 100% 可见 | `matches=true, lines=7, filled=7, reveal 39/39` | ✅ PASS |
| B13 | 禁用 JS 后 `<noscript>` 兜底 | `setScriptExecutionDisabled` | 姓名/公司/教育/≥5 外链 | 1119 字符、8 条外链、`html.js` 未添加 | ✅ PASS |
| B14 | 360/768/1280/1600 无横向滚动 | `setDeviceMetricsOverride` + `scrollWidth` | 4/4 无页面级溢出 | 4 档 `scrollWidth === clientWidth`；360px 下导航为设计内 `overflow-x:auto` | ✅ PASS |
| B15 | `@media print` 隐藏导航 + 展开 URL | `setEmulatedMedia(print)` | 导航隐藏、URL 展开、reveal 可见 | header/nav/toggle 均 none；`a::after` 含 URL；reveal opacity=1 | ✅ PASS |
| B16 | **易扩展性：追加 `links:[]` 最小项目** | 内存 patch + 真实重渲染 | `cards=6`、第 6 张含空态文案、0 异常 | `cards=6`；hasName/hasEmptyText=true；patch/page/CDP 错误全 0 | ✅ PASS |
| B17 | 易扩展性：`projects.items=[]` 整体空态 | 内存清空数组 | 0 卡 +「暂无项目条目」 | `cards=0`，空态正确，0 异常 | ✅ PASS |
| B18 | sticky header / scroll-margin / 44px / focus-visible | `getComputedStyle` + CSSOM | 4 项生效 | `sticky`、`80px`、`44px`、规则存在 | ✅ PASS |
| **B20** | **5 张项目卡渲染顺序** | 真实 DOM `.project-name` 顺序 | 充电桩 → Nori → 单兵 → 油井 → 轮转器 | 5 张，顺序完全一致 | ✅ PASS |
| **B21** | **Nori 卡细节** | 读真实 DOM href / block-label / meta / 文本 | 3 外链合规；RK3576 规格 URL `getAttribute` 与 `a.href` 均完整；无 `.project-meta` 与「项目成果」；8 个功能词；无夸大用词；无 undefined | `links=3; rockOk=true; hasMeta=false; labels=核心工作,技术栈,相关外链 · 可点击查看; 关键词缺失=无; 夸大用词=无` | ✅ PASS |
| **B22** | **3 张行业终端卡纯净性** | 逐卡检查 10 项 | 仅 1 个「相关外链」区块 + 1 个空态 + 0 外链；无空标题/空 span/undefined/公司名/日期/数字/技术方案；共同标签齐全 | 3 张卡 10 项全 true | ✅ PASS |
| **B23** | **原充电桩卡未回归** | 首张卡结构比对 | 4 区块 / 7 外链 / meta 存在 / 「进行中」徽标 / 无 undefined | `labels=核心工作,技术栈,项目成果,相关外链 · 可点击查看; links=7; hasMeta=true` | ✅ PASS |
| **B24** | 导航高亮 | 滚动到 `#projects` 后读 `.nav-link` | 恰好 1 个 active、aria-current 配对 | `active=["projects"], ariaCurrent=["projects"], scrollY=5470` | ✅ PASS |
| **B25** | 点击复制 | 注入 clipboard mock 后触发 click | 行内反馈 + toast + 按钮「已复制」 | 三处均成功态，`data-copy=16601115513` | ✅ PASS |
| B19 | 线上 Pages 子路径真实渲染（与版本无关） | Chrome 打开线上 URL 后 CDP 断言 | pathname=`/resume-blog/`、CSS/JS 加载、0 报错 | `/resume-blog/`、`cssLoaded=true`、`dataLoaded=true`、`jsClass=true`、等宽字体生效、0 控制台错误 | ✅ PASS |
| **B19b** | 线上内容与本地 HEAD 同步 | 线上真实渲染 DOM 比对 | 5 张项目卡 + Nori 官网外链 | 线上 `projects=1`、hasNori=false、hasNoriLink=false | ⏸ **WAIT** |
| D1 | **白名单 24 条外链 curl 复测** | `curl -L -w %{http_code}` + 失败重试 | 24/24 = 200 | **24/24 = 200** | ✅ PASS |
| **D1b** | 403 域名纪律 | curl + 白名单比对 | `support.heynori.com` 返回 403 且不在白名单 | `403 support.heynori.com`；在白名单=false | ✅ PASS |
| D2 | 线上 Pages 地址与静态资源 | curl 探测 3 个 URL | 3/3 = 200 | 首页 / `data/resume.js` / `style.css` 全部 200 | ✅ PASS |
| **D3** | 线上 `data/resume.js` 已含新项目 | curl 取回线上 JS 内容比对 | 含 `nori-family-ai-hub` 与 `heynori.com` | 线上仍为上一版（未 push） | ⏸ **WAIT** |

---

## 五、外链状态码表（24 条白名单）

| # | URL | 状态码 | 备注 |
| --- | --- | --- | --- |
| 1 | `https://www.xcharge.com/` | 200 | |
| 2 | `https://www.xcharge.com/aboutUs` | 200 | |
| 3 | `https://www.xcharge.com/device/C7EU` | 200 | |
| 4 | `https://www.xcharge.us/product/c6` | 200 | |
| 5 | `https://m.xcharge.com/device/NetZeroSeries` | 200 | 移动页 |
| 6 | `https://openchargealliance.org/participants/beijing-x-charge-technology-co-ltd` | 200 | |
| 7 | `https://www.xcharge.com/newsDetail?id=6a3350039c6f921c19dcc7e2&type=news` | 200 | 带参 URL，DOM 中 `&` 完好 |
| 8 | `https://www.gdalpha.com/` | 200 | |
| 9 | `https://www.51haohuo.com/` | 200 | |
| 10 | `https://developer.android.com/jetpack/compose` | 200 | |
| 11 | `https://kotlinlang.org/` | 200 | |
| 12 | `https://flutter.dev/` | 200 | |
| 13 | `https://www.openchargealliance.org/` | 200 | |
| 14 | `https://mqtt.org/` | 200 | |
| 15 | `https://github.com/Sunxl1128` | 200 | |
| 16 | `https://github.com/Sunxl1128/CoolMallKotlin` | 200 | |
| 17 | `https://github.com/Sunxl1128/SuperEditTextLibrary` | 200 | |
| 18 | `https://github.com/Sunxl1128/SxlLibrary` | 200 | |
| 19 | `https://github.com/Sunxl1128/SxlLibrary2` | 200 | |
| 20 | `https://github.com/Sunxl1128/DJI-Android-VideoStreamDecodingSample` | 200 | |
| 21 | `https://github.com/Sunxl1128/ai-native-jobhunt` | 200 | |
| **22** | `https://heynori.com/` | **200** | 本轮新增（Nori 官网） |
| **23** | `https://www.rock-chips.com/a/cn/product/RK35xilie/2024/1015/2016.html` | **200** | 本轮新增（RK3576 规格） |
| **24** | `https://www.rock-chips.com/` | **200** | 本轮新增（瑞芯微官网） |
| — | `https://support.heynori.com/` | **403** | **禁止加入白名单**，仅作文档「禁止说明」 |
| — | 线上首页 / `data/resume.js` / `assets/css/style.css` | 200 / 200 / 200 | D2 |

**专项澄清**：
- **RK3576 规格 URL 专项**：`https://www.rock-chips.com/a/cn/product/RK35xilie/2024/1015/2016.html` 的路径为纯 ASCII，无中文字符、无查询串；中文仅出现在该外链的显示文字（label）中。B21 已用 CDP 确认 `getAttribute('href')` 与 `a.href` 均严格等于原字符串，未截断、未 percent-encode、未错误转义。
- `&type=news` 在 `--dump-dom` 的 HTML 序列化里显示为 `&amp;` 属浏览器**标准属性序列化**，非错误转义；真实 DOM 属性值为 `&`（B4 已验证）。
- 渲染后 DOM 共 **27** 条 `a[href^=http]`（24 条唯一 URL，部分重复出现在不同卡片），全部 100% 配对 `target=_blank` + `rel=noopener noreferrer`，0 条白名单外地址。

---

## 六、增量改动专项验证结论（工程师重点关注项）

| 关注点 | 验证结果 | 用例 |
| --- | --- | --- |
| `period`/`role`/`status` 条件创建，三者全空不生成 `.project-meta` | Nori 卡 `hasMeta=false`；3 张行业卡同样无空 meta 容器 | B21 / B22 |
| `highlights`/`stack`/`results` 为空不生成区块 | 3 张行业卡 `labels` **仅** `["相关外链 · 可点击查看"]`，无「核心工作/技术栈/项目成果」空标题；Nori 卡有「核心工作/技术栈」但**无**「项目成果」（`results: []`） | B21 / B22 |
| `linksBlock` 始终渲染，空态文案保留 | 3 张行业卡各有 1 个「本项目暂无公开外链」空态 | B22 |
| 无 `undefined` / 空 `<span>` / 空标题 | 3 张行业卡 `noEmptySpan=true`、`noUndefined=true`、`noEmptyHeadings=true` | B22 |
| 5 张卡顺序 | 充电桩 → Nori → 单兵 → 油井 → 轮转器，与 `items` 完全一致 | B20 / A17 |
| Nori 3 条外链可点击且合规 | 3 条全在白名单、target/rel 配对、RK3576 URL 完整 | B21 / D1 |
| Nori 措辞客观 | 文本含「协助实现 / 协助完成」，**0 处**「主导 / 独立负责 / 项目负责人」；`Onboarding` 拼写正确（非 onbrading）；含 OTA / 屏保提醒 / Recipe / Meal Plan / 相册 / 日历 / RK3576 | A19 / B21 |
| 3 张行业卡不编造 | 无公司名、无日期、无成果数字、无技术方案；共同标签「行业终端 / 上位机 / 设备端」三张齐全 | A17 / B22 |
| 新增 4 项缺 `period`/`role`/`status` 是**合规**而非缺陷 | A17 作为**正向断言**验证「不得出现这些字段」，未按「缺字段」判 FAIL | A17 |
| 原充电桩卡未回归 | 仍 4 个内容区块 + 7 条外链 + `.project-meta` +「进行中」徽标 | B23 |
| 扩展性 claim 仍成立 | 内存 push 一个最小对象 → 6 张卡 + 空态；清空数组 → 整体空态，均 0 异常 | B16 / B17 |
| 全链路交互无回归 | 主题三层优先级、reduced-motion 39/39 reveal、打印展开 URL、noscript、四档响应式、**导航高亮 projects**、**点击复制三处反馈** | B9–B18 / B24 / B25 |
| `site.description` | 含 Nori / RK3576 / 行业终端，且保留 Jetpack Compose / Kotlin / Flutter / OCPP / MQTT | A18 |

**结论：工程师用 Node `vm` + DOM stub 的自测结果与真实 Chrome/CDP 复核结果一致，渲染层改动无缺陷。**

---

## 七、测试轮次与智能路由过程（如实记录）

| 阶段 | 轮次 | 结果 | 失败项 | 路由 | 处理 |
| --- | --- | --- | --- | --- | --- |
| **v1 基线**（`dca7397`） | 第 1 轮 | 32/35 | B1、B9、B10 | **QA 自修** | B1 误把 4 个语义化 `.skill-group` 计入顶层 section（12 vs 8）→ 改 `main > section`；B9/B10 硬编码初始 dark，实际 headless 默认 `prefers-color-scheme: light` 属正确设计 → 改为不假设初始值并补 B9b |
| v1 基线 | 第 2 轮 | **39/39 = 100%** | 0 | **NoOne** | 放行 |
| **v2 增量**（`00d2627`） | 第 1 轮 | **47/47 = 100%**（WAIT 1） | 0 | **NoOne** | 更新脚本硬编码（白名单 21→24、B1 项目 1→5、B16 卡片 2→6、B19 项目 1→5）并新增 A17–A20 / B20–B25 / D1b / D3 / B19b，**一次通过，无测试脚本 bug 需自修** |
| v2 增量 | 第 2 轮（全量） | **50/50 = 100%**（WAIT 2） | **0** | **NoOne** | 24 条外链 curl + 线上探测 + 线上真实渲染全部完成 |

- v1 与 v2 各自严格控制在 **2 轮**内。
- **全程无一次失败归因源码**，路由从未指向 Engineer；本轮工程师的改动经独立复核确认正确。
- `mqtt.org` 曾在 v1 出现一次瞬时 curl ERR，单独复测 GET×3 + HEAD 全 200，已加「失败重试 1 次」机制；本轮 24/24 稳定通过。
- `WAIT` 状态是本轮新增的结果类型，用于把「部署未完成」与「源码缺陷」严格区分，避免误报。

---

## 八、线上同步状态与待复测项（WAIT 2 · 主理人负责）

线上当前仍为 `c250b22` 版本（**1 张项目卡**），`00d2627` 尚未 push。这与任务分工一致（主理人负责 push 与复测），**不是源码缺陷**。

| 用例 | 当前实际 | push 后期望 |
| --- | --- | --- |
| **B19b** | 线上 `projects=1`、`hasNori=false`、`hasNoriLink=false` | `projects=5`、页面含 Nori、`a[href="https://heynori.com/"]` 存在 |
| **D3** | 线上 `data/resume.js` 不含 `nori-family-ai-hub` | 含 `nori-family-ai-hub` 与 `https://heynori.com/` |

**push 后主理人只需执行一条命令完成复测**：

```bash
cd resume-blog
node tests/validate.mjs --online-render
```

预期输出 `== 汇总: 52/52 通过 (100.0%)，WAIT 0 ==` 且 `exit=0`（B19b / D3 自动由 WAIT 转 PASS，脚本无需再改）。

> B19（线上基础渲染 / CSS·JS 相对资源生效）**当前已 PASS**，说明 `/resume-blog/` 子路径下 `./` 相对资源在真实线上环境确实可用。

---

## 九、遗留问题清单

**阻断性遗留问题：无。** 以下为非缺陷观察项：

| # | 观察项 | 位置 | 性质 |
| --- | --- | --- | --- |
| 1 | `.copy-btn` 为 `min-height:36px` + `min-width:44px`，未完全达 44×44 | `assets/css/style.css:1009-1017` | 轻微可访问性建议；`.btn`/`.nav-link`/`.nav-brand`/`.theme-toggle` 均 44px，主交互达标。B25 已证明点击复制功能正常 |
| 2 | 360px 下 `.nav-list` 为 `overflow-x:auto` 设计内可横向滑动容器 | `assets/css/style.css:581-591` | 设计取舍，非页面级溢出（4 档 `scrollWidth === clientWidth`） |
| 3 | headless/系统偏好为 light 时首次访问呈浅色主题 | `index.html:27-42` | 符合设计「首次访问尊重 prefers-color-scheme」，B9b 三层优先级已验证 |
| 4 | `main section` 共 12（8 顶层 + 4 个语义化 `.skill-group`） | `assets/js/main.js:387` | 语义化用法，顶层区块仍为 8 |
| 5 | 线上 2 项 WAIT | 部署 | 主理人 push 后复测，见第八节 |
| 6 | `reveal` 节点数由 35 增至 39（新增 4 张项目卡） | — | 正常变化，B12 仍 39/39 全可见 |

---

## 十、上线放行建议

**本地代码放行；线上待主理人 push 后自动复测通过即可上线。**

1. 源码零缺陷：50/50 用例通过，真实 Chrome/CDP 复核 5 张卡、3 条新外链、`renderProjects` 条件渲染全部正确，无控制台报错。
2. 外链纪律达标：24/24 = 200，`403` 域名未误入，DOM 27 条外链 100% 配对 `target/rel`，0 条白名单外地址。
3. 「严禁编造」落实：新增 4 项无周期/角色/状态/成果，措辞客观；3 张行业终端卡纯净无占位。
4. 扩展性 claim 仍成立：内存 push 一个对象即多一张卡并显示空态，清空数组显示整体空态，均 0 异常。
5. **唯一未完成项是部署**：主理人 push `00d2627` 后跑一次 `node tests/validate.mjs --online-render`，B19b / D3 转 PASS 即可确认线上同步。

---

## 十一、交付物与合规声明

| 类别 | 内容 |
| --- | --- |
| 本轮更新文件 | `tests/validate.mjs`（回归工具：白名单 24 条、项目数 5、新增 A17–A20 / B20–B25 / D1b / D3 / B19b、WAIT 状态支持）、`docs/qa-report.md`（本报告 v2） |
| 工程师改动文件（QA 未触碰） | `data/resume.js`、`assets/js/main.js`、`README.md`、`docs/content-guide.md` |
| QA 对既有源文件的改动 | **无**（仅更新自己负责的两个文件） |
| 临时文件 | 全部在系统临时目录，harness 于 `finally` 删除；`data/resume.js` 全程未被复制或修改 |
| 未执行操作 | 未执行 `git push`、未创建远程仓库、未改 GitHub 设置（按分工由主理人负责） |
| 测试轮次 | v1 2 轮 + v2 2 轮，各自未超上限 |
