# 孙喜龙 · 简历博客（resume-blog）

一个程序员风格（终端 / IDE 气质）的个人简历博客，部署在 GitHub Pages。

- **线上地址**：https://sunxl1128.github.io/resume-blog/
- **仓库**：`Sunxl1128/resume-blog`，`main` 分支根目录即站点根目录
- **技术栈**：原生 HTML + CSS + JavaScript，零构建、零依赖、零外部 CDN
- **设计方法**：实际加载并落地 `website-ui-designer`（网站UI设计）与 `workbench-ui-design`（工作台界面设计）两个 skill —— 三层设计令牌、8pt 间距节奏、两列 / 栅格布局、渐变模块分割线、状态徽标、按钮三档与组件状态规范

页面全部内容集中在一个数据文件 `data/resume.js`，追加项目经历只需往数组里加一个对象，无需改动 HTML / CSS / JS。

---

## 本地预览

两种方式，都不需要 Node.js、不需要构建：

1. **最简单**：直接双击 `index.html`（`file://` 协议下也能完整渲染，因为数据用 `<script src>` 同步注入，没有用 `fetch` + JSON，不会被 CORS 拦住）。
2. **起个本地服务**（更接近线上环境）：

   ```bash
   cd resume-blog
   python -m http.server 8000
   # 浏览器打开 http://localhost:8000/
   ```

   > 注意：所有资源都使用 `./` 开头的相对路径，站点挂在 `/resume-blog/` 子路径下也能正常加载。

---

## 目录结构

```
resume-blog/
├── index.html                 # 页面骨架、SEO 元信息、主题前置脚本、<noscript> 兜底
├── assets/
│   ├── css/style.css          # 三层设计令牌 + 全部组件样式 + 响应式 / 打印 / reduced-motion
│   ├── js/main.js             # 数据渲染 + 导航高亮 / 主题 / 复制 / 打字机
│   └── favicon.svg            # 内联 SVG 图标
├── data/
│   └── resume.js              # ★ 唯一内容数据源：window.RESUME_DATA = { ... }
├── docs/
│   └── content-guide.md       # 追加项目经历的详细字段说明与示例
├── .gitignore
├── .nojekyll                  # 让 GitHub Pages 跳过 Jekyll，直接托管静态文件
└── README.md
```

**只需要改 `data/resume.js` 一个文件**，就能更新姓名、定位、指标、技能、工作经历、项目、开源仓库、教育经历、联系方式与页脚文案。

---

## 如何补充项目经历（最常用操作）

打开 `data/resume.js`，找到 `projects.items` 数组，**复制里面已有的一个对象**，粘贴到数组末尾（记得在前面加逗号），改掉字段后保存即可。页面会自动多渲染一张项目卡片，不需要动任何其它文件。

当前共 **5 张项目卡片**：新能源充电桩上位机系列（C6/C7/C8A/C8S）、Nori 家庭日常 AI 助理，以及蓝牙单兵身体检测 / 油井操作平板 / 大型轮转器 3 个行业终端项目。后 4 项按用户口述补充，只写基于名称的客观描述，未公开的周期、角色、成果数字一律留空；只有 Nori 带 3 条已核实外链，其余显示「本项目暂无公开外链」空态。

```js
{
  id: "my-new-project",                    // 唯一标识，小写字母 / 数字 / 连字符
  name: "新项目名称",
  period: "2025.03 - 2025.09",
  role: "核心开发工程师",
  status: "已交付",                        // 徽标文字，可留空字符串
  statusTone: "info",                      // success / warn / info / accent / purple / neutral
  summary: "一句话说明项目背景与目标。",
  highlights: ["核心工作 1", "核心工作 2"],  // 数组，可为空 []
  stack: ["Kotlin", "OCPP"],                // 技术栈标签，可为空 []
  results: ["成果 1", "成果 2"],            // 项目成果，可为空 []
  links: [                                  // 外链，允许为空数组 []
    { label: "产品页", url: "https://www.xcharge.com/device/C7EU", kind: "product" }
  ],
  tags: ["新能源", "海外交付"]              // 卡片顶部标签，可为空 []
}
```

> 上面是字段模板，示例值只演示格式：用户未公开的周期 / 角色 / 状态 / 成果请直接省略或写 `[]`，**不要猜测**；`links[].url` 必须来自外链白名单。本次新增的 4 个项目就是按此约定处理的。

完整字段说明、空值处理与常见错误见 [`docs/content-guide.md`](./docs/content-guide.md)。

> **外链纪律**：`links[].url` 只允许填「已核实外链清单」里的地址（见下文），严禁编造或猜测链接。`links: []` 是合法的，页面会渲染「本项目暂无公开外链」的空态提示。

---

## 如何改主题色 / 个人信息

### 改主题色

打开 `assets/css/style.css` 顶部的 `:root`：

- **Layer 1（Primitive）**：原始色值与 4px 尺寸原语，组件不直接引用。
- **Layer 2（Semantic）**：`--accent`（主强调色，默认终端绿）、`--accent-2`（链接蓝）、`--title`（标题 / 字段标签的橘黄强调色）、`--bg` / `--surface` / `--border` / `--text` 等。
- **Layer 3（Component）**：`--card-padding`、`--btn-radius`、`--nav-height` 等组件级变量。

只改 semantic 层的少量变量即可整体换肤，**组件 CSS 一行都不用动**。浅色主题由 `[data-theme="light"]` 只覆盖 semantic 层实现（深色为默认，右上角按钮可切换，选择记忆在 `localStorage`，首次访问尊重 `prefers-color-scheme`）。间距遵循 8pt 节奏（`--space-2: 8px`、`--space-4: 16px`、`--space-6: 24px`…），调整时请沿用该刻度。

### 改个人信息

编辑 `data/resume.js`：

| 想改什么 | 字段位置 |
| --- | --- |
| 页面标题 / 描述 / 关键词 / 线上地址 | `site` |
| 导航项 | `nav`（`id` 必须与 `index.html` 中某个 `section[data-nav]` 对应） |
| 姓名、定位、指标、命令行输出 | `hero` |
| 个人定位、4 条优势 | `about.positioning` / `about.advantages` |
| 技能分组 | `skills.groups` |
| 工作经历 | `experience.items` |
| 项目经历 | `projects.items` |
| 开源仓库 | `opensource.items` |
| 教育经历 | `education.items` |
| 联系方式 | `contact.items` |
| 页脚文案 | `footer`（`{year}` 会自动替换为当前年份） |

`index.html` 的 `<head>` 里也有静态的 SEO 标签，运行时 `main.js` 会用 `site` 里的值覆盖它们，因此**平时只改数据文件即可**；若需要让不执行 JS 的爬虫也拿到不同文案，再同步改 `index.html`。

---

## 隐私提示

手机号 `16601115513` 与邮箱 `sunxilongsxl@163.com` 来自本人**公开简历**，属于对外求职联系方式。如果不想公开，请直接删除 `data/resume.js` 中 `contact.items` 里对应的对象，以及 `hero.actions` 里「复制邮箱」那一项；`index.html` 的 `<noscript>` 静态兜底段落里也有同样信息，需要一并删除。

页脚与联系方式同时说明：本页面不收集任何数据，不使用统计脚本、不加载外部字体 / 图标 / CDN，`localStorage` 只存一个 `resume-theme` 键用于记忆深浅色主题。

---

## 外链清单说明

页面里所有可点击的 `http(s)` 外链均来自**已 curl 实测 HTTP 200** 的白名单，未编造任何地址。所有外链统一 `target="_blank" rel="noopener noreferrer"`，带外链角标 `↗` 与清晰的 hover / focus 态。

- **公司 / 产品 / 认证**：XCHARGE 官网、关于 XCHARGE、C7 超充产品页、C6 产品页、Net Zero Series、OCA 的 XCharge Group OCPP 认证记录、C7 新一代发布新闻、奥飞娱乐官网、好活科技官网
- **技术 / 协议**：Jetpack Compose、Kotlin、Flutter、Open Charge Alliance、MQTT
- **本次新增（家庭 AI 助理 / 芯片平台，实测 200，共 3 条）**：Nori 官网 `https://heynori.com/`、RK3576 官方规格（瑞芯微）`https://www.rock-chips.com/a/cn/product/RK35xilie/2024/1015/2016.html`、瑞芯微官网 `https://www.rock-chips.com/` —— 仅挂在 Nori 项目卡片上，另外 3 个新增项目均为 `links: []`；`support.heynori.com` 实测 403，未加入白名单
- **本人 GitHub**：`github.com/Sunxl1128` 及 6 个公开仓库（CoolMallKotlin、SuperEditTextLibrary、SxlLibrary、SxlLibrary2、DJI-Android-VideoStreamDecodingSample、ai-native-jobhunt）

「名医讲堂 / 看名医」「有妖气」「未名天」三处公司名因域名实测不可达，**只显示纯文本，不加外链**。

新增项目时如果暂时没有可核实的链接，请写 `links: []`，不要猜测 URL。

---

## 部署

站点由 **GitHub Pages** 托管（`.nojekyll` 保证跳过 Jekyll 构建）。把本目录内容推到 `Sunxl1128/resume-blog` 的 `main` 分支根目录，在仓库 Settings → Pages 选择 `Deploy from a branch / main / (root)` 即可上线。

---

## 特性速览

- 深色终端主题 + 可切换浅色主题（记忆 + 尊重系统偏好 + 防闪烁）
- 响应式：手机 / 平板 / 桌面，360px 无横向滚动，44×44 触控目标
- 键盘可达：跳转链接、可见 focus、语义化标签、单 `h1`、标题层级不跳级
- `prefers-reduced-motion` 降级：打字机直接显示全文、动画关闭
- `@media print`：隐藏导航与主题按钮、展开所有外链地址，方便打印 / 导出 PDF
- `<noscript>` 静态兜底，禁用 JS 也能读到核心简历信息
- 命令行 Hero 打字机、锚点导航当前区块高亮、联系方式点击复制（页面内提示，不弹系统对话框）
