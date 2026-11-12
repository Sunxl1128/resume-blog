# 内容维护指南（追加项目经历 / 修改简历内容）

整站的**唯一内容源**是 `data/resume.js` 里的 `window.RESUME_DATA` 对象。页面所有文字（包括导航、指标、外链、页脚）都由它渲染，HTML / CSS / JS 里没有写死任何简历内容。

> 这个文件是普通 JavaScript，不是 JSON：可以写注释、可以用单/双引号、可以有尾随逗号（现代浏览器支持，但建议不要依赖）。修改后**保存文件、刷新浏览器**即可看到效果，不需要构建、不需要 npm、不需要重启服务。

---

## 一、追加一条项目经历（三步）

### 第 1 步：打开文件

用任意文本编辑器打开 `data/resume.js`，搜索 `projects:`，找到里面的 `items: [ ... ]` 数组。当前数组里已经有 1 个对象（新能源充电桩上位机系列项目）。

### 第 2 步：复制一个对象，粘到数组末尾

在数组的最后一个 `}` 后面加一个英文逗号 `,`，然后粘贴下面这段模板并改成自己的内容：

```js
{
  id: "my-new-project",
  name: "这里写项目名称",
  period: "2025.03 - 2025.09",
  role: "核心开发工程师",
  status: "已交付",
  statusTone: "info",
  summary: "一两句话说明项目背景、目标与自己的职责边界。",
  highlights: [
    "核心工作第 1 条：做了什么、用了什么技术、解决了什么问题",
    "核心工作第 2 条"
  ],
  stack: ["Kotlin", "Jetpack Compose", "OCPP 1.6/2.0"],
  results: [
    "量化成果第 1 条（请写真实数据，不要杜撰）",
    "量化成果第 2 条"
  ],
  links: [
    { label: "产品页", url: "https://www.xcharge.com/device/C7EU", kind: "product" }
  ],
  tags: ["新能源", "从 0 到 1"]
}
```

### 第 3 步：保存、刷新、提交

```bash
git add data/resume.js
git commit -m "docs: add project xxx"
```

推到 `main` 分支后 GitHub Pages 会自动更新（通常 1 分钟内）。**页面会自动多渲染一张卡片，不需要改 `index.html`、`style.css` 或 `main.js`。**

---

## 二、字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 建议 | 唯一标识，仅用于区分条目（不生成 DOM id），建议小写字母 / 数字 / 连字符。重复不会报错，但不利于维护。 |
| `name` | string | 是 | 项目名称，显示为卡片标题。 |
| `period` | string | 是 | 项目周期，如 `"2024.01 - 至今"`。 |
| `role` | string | 是 | 担任角色，如 `"项目负责人 / 核心开发工程师"`。 |
| `status` | string | 否 | 状态徽标文字，如 `"进行中"` / `"已交付"`。留空 `""` 则不显示徽标。 |
| `statusTone` | string | 否 | 徽标语义色：`success`（绿）/ `warn`（黄）/ `info`（蓝）/ `accent`（绿强调）/ `purple`（紫）/ `neutral`（灰）。默认 `success`。 |
| `summary` | string | 建议 | 项目一句话概述，显示在卡片头部。 |
| `highlights` | string[] | 否 | 核心工作列表，渲染成带 `▸` 的项目符号列表。 |
| `stack` | string[] | 否 | 技术栈，渲染成胶囊标签。 |
| `results` | string[] | 否 | 项目成果，渲染成带 `✓` 的列表。 |
| `links` | object[] | 否 | 外链列表，见下文。**允许为空数组 `[]`**。 |
| `tags` | string[] | 否 | 卡片头部标签。 |

### `links[]` 元素结构

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `label` | string | 链接显示文字，如 `"C7 超充产品页"`。 |
| `url` | string | **必须来自已核实外链清单**，严禁编造或猜测。 |
| `kind` | string | 决定外链前的小徽标：`company`→官网、`product`→产品页、`cert`→认证、`news`→资讯、`standard`→协议、`repo`→仓库。填其它值会显示为「外链」。 |

渲染时所有外链自动带上 `target="_blank"`、`rel="noopener noreferrer"`、外链角标 `↗` 以及「（在新标签页打开）」的读屏提示。

---

## 三、空值与可选字段

渲染代码对所有数组都做了兜底，**少写字段、写成空数组都不会报错**：

```js
{
  id: "draft-project",
  name: "内部工具（暂无公开资料）",
  period: "2023.01 - 2023.06",
  role: "独立开发",
  highlights: [],
  stack: [],
  results: [],
  links: [],
  tags: []
}
```

- `links: []` → 渲染成「本项目暂无公开外链」的空态提示（虚线框）。
- 整个 `projects.items: []` → 渲染成「暂无项目条目」的空态提示。
- `status` 不写 → 不显示状态徽标。
- `summary` 不写 → 头部不出现概述段落。

---

## 四、外链白名单（只能用这些）

**严禁编造或猜测任何链接。** 以下地址均已 curl 实测 HTTP 200：

### 公司 / 产品 / 认证

| 用途 | URL |
| --- | --- |
| XCHARGE 官网 | `https://www.xcharge.com/` |
| 关于 XCHARGE | `https://www.xcharge.com/aboutUs` |
| C7 超充产品页 | `https://www.xcharge.com/device/C7EU` |
| C6 产品页 | `https://www.xcharge.us/product/c6` |
| Net Zero Series（C8 相关） | `https://m.xcharge.com/device/NetZeroSeries` |
| OCA · XCharge Group OCPP 认证记录 | `https://openchargealliance.org/participants/beijing-x-charge-technology-co-ltd` |
| C7 新一代发布新闻 | `https://www.xcharge.com/newsDetail?id=6a3350039c6f921c19dcc7e2&type=news` |
| 奥飞娱乐官网 | `https://www.gdalpha.com/` |
| 好活科技官网 | `https://www.51haohuo.com/` |

### 技术 / 协议

| 用途 | URL |
| --- | --- |
| Jetpack Compose | `https://developer.android.com/jetpack/compose` |
| Kotlin | `https://kotlinlang.org/` |
| Flutter | `https://flutter.dev/` |
| Open Charge Alliance | `https://www.openchargealliance.org/` |
| MQTT | `https://mqtt.org/` |

### 本人 GitHub（账号 `Sunxl1128`）

| 用途 | URL |
| --- | --- |
| 个人主页 | `https://github.com/Sunxl1128` |
| CoolMallKotlin | `https://github.com/Sunxl1128/CoolMallKotlin` |
| SuperEditTextLibrary | `https://github.com/Sunxl1128/SuperEditTextLibrary` |
| SxlLibrary | `https://github.com/Sunxl1128/SxlLibrary` |
| SxlLibrary2 | `https://github.com/Sunxl1128/SxlLibrary2` |
| DJI-Android-VideoStreamDecodingSample | `https://github.com/Sunxl1128/DJI-Android-VideoStreamDecodingSample` |
| ai-native-jobhunt | `https://github.com/Sunxl1128/ai-native-jobhunt` |

**禁止加外链的域名**（实测不可达）：名医讲堂 / 看名医 `52myjt.com`、有妖气 `u17.com`、未名天 `pkusky.com`。这三家公司在 `experience.items` 里 `companyUrl` 留空字符串 `""`，只显示纯文本。

如果以后要加新外链，请先 `curl -I <url>` 确认返回 200，再把地址加进本白名单表与 `README.md`，然后才能写进 `links[]`。

---

## 五、其它数组的写法

### 追加一段工作经历（`experience.items`）

```js
{
  id: "new-company",
  company: "公司全称",
  companyUrl: "",                 // 官网不在白名单就留空，只显示纯文本
  role: "Android 开发工程师",
  period: "2025.01 - 至今",
  current: true,                  // true 会显示「在职」徽标 + 高亮时间线圆点
  duties: "核心职责描述",
  achievements: ["关键业绩 1", "关键业绩 2"],
  tags: ["Kotlin", "架构设计"]
}
```

### 追加一个技能项（`skills.groups[].items`）

```js
{ name: "Kotlin", url: "https://kotlinlang.org/" }   // 带外链 → 显示 ↗ 可点击
{ name: "MVVM / MVI / MVP" }                         // 无外链 → 纯标签
```

### 追加一个开源仓库（`opensource.items`）

```js
{
  id: "my-repo",
  name: "仓库名",
  desc: "一句话说明这是个人技术实践 / 开源作品，不要写成公司商业项目",
  url: "<请从第四节白名单中粘贴一条真实 URL>",
  lang: "Kotlin",
  tags: ["Android", "个人项目"]
}
```

> 注意：上面 `url` 里的尖括号是占位符，**不能直接提交使用**。请从第四节白名单中复制一条真实存在的地址替换它；如果新仓库地址还没核实，先 `curl -I` 确认 200 并把它加入白名单表。
>
> 另外，开源区标题是「开源与技术实践」，这些是**个人公开仓库**，请在描述里保持这个定位，不要冒充任职公司的项目。

### 追加一条联系方式（`contact.items`）

```js
{ label: "微信", value: "your-id", copy: "your-id", icon: "code" }
```

`copy` 是点击「复制」按钮时写入剪贴板的文本，`value` 是页面上显示的文本，两者可以不同。可用图标名：`external` / `github` / `mail` / `copy` / `check` / `phone` / `location` / `code` / `terminal`（定义在 `assets/js/main.js` 的 `ICONS`）。

---

## 六、修改后自检（1 分钟）

1. **语法**：在项目根目录运行

   ```bash
   node --check data/resume.js
   node --check assets/js/main.js
   ```

   两条都无输出即通过。若没有 Node，也可以直接双击 `index.html` 看页面是否正常渲染。

2. **本地预览**：双击 `index.html`，或 `python -m http.server 8000` 后访问 `http://localhost:8000/`。

3. **检查新增卡片**：确认项目卡片出现、字段都显示正确、`links` 里的链接能点击且地址正确。

4. **检查控制台**：浏览器 F12 → Console 应无红色报错。

---

## 七、常见错误

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 页面全空 / 只剩空态框 | `resume.js` 有语法错误，`window.RESUME_DATA` 没挂上 | 跑 `node --check data/resume.js`，多半是漏了逗号或用了中文引号 |
| 新项目没出现 | 对象粘到了 `projects.items` 数组外面 | 确认在 `items: [ ... ]` 的方括号内 |
| 外链点不开 / 打开空白 | URL 拼错或不在白名单 | 对照本文件第四节逐字核对，必要时 `curl -I` 复测 |
| 中文变成乱码 | 文件保存成了非 UTF-8 | 用 UTF-8（无 BOM）重新保存 `data/resume.js`；`index.html` 已声明 `<meta charset="utf-8">` |
| 改了 GitHub Pages 上没生效 | 浏览器缓存 / Pages 构建延迟 | 强制刷新（Ctrl+F5），等待 1 分钟；确认推送到了 `main` 根目录 |
| `file://` 下复制到剪贴板失败 | 浏览器禁用 clipboard API | 页面已内置 `execCommand` 兜底；若仍失败，页面内会提示手动复制 |
