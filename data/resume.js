/**
 * data/resume.js — 全站唯一内容数据源
 * ------------------------------------------------------------------
 * 这是整份简历博客里唯一需要编辑内容的文件。HTML / CSS / JS 不写死任何简历文字。
 * 用 <script src="./data/resume.js"></script> 同步注入，因此双击 index.html
 * （file:// 协议）也能正常预览，不需要 fetch / JSON / 本地服务器 / Node 环境。
 *
 * 追加一段项目经历：往 projects.items 数组里复制一个对象、改字段、保存即可，
 * 页面会自动多渲染一张卡片，无需改动其它文件。详见 docs/content-guide.md。
 *
 * 外链规则：links[] 里的 url 只允许使用「已核实外链清单」中的地址，
 * 严禁编造或猜测链接；links 可以为空数组（此时渲染空态文案）。
 * 名医讲堂 / 有妖气 / 未名天 三处域名不可达，只保留纯文本，不加外链。
 */
window.RESUME_DATA = {
  /* ---------------------------------------------------------------- 站点元信息 */
  site: {
    name: "孙喜龙",
    handle: "Sunxl1128",
    title: "孙喜龙 · 9 年 Android 开发 / 新能源充电桩上位机工程师 · 简历",
    description: "孙喜龙的个人简历博客：9 年 Android 原生开发经验，深耕新能源充电桩上位机（C6/C7/C8A/C8S），精通 Jetpack Compose、Kotlin、Flutter、OCPP、MQTT，含工作经历、项目经历与 GitHub 开源实践。",
    keywords: "孙喜龙,Android,新能源充电桩,上位机,Jetpack Compose,Kotlin,Flutter,OCPP,MQTT,MVVM,MVI,个人简历,GitHub Pages",
    url: "https://sunxl1128.github.io/resume-blog/",
    lang: "zh-CN",
    repo: "Sunxl1128/resume-blog"
  },

  /* ---------------------------------------------------------------- 主导航 */
  nav: [
    { id: "about", label: "关于", index: "01" },
    { id: "experience", label: "经历", index: "02" },
    { id: "projects", label: "项目", index: "03" },
    { id: "opensource", label: "开源", index: "04" },
    { id: "education", label: "教育", index: "05" },
    { id: "contact", label: "联系", index: "06" }
  ],

  /* ---------------------------------------------------------------- Hero */
  hero: {
    prompt: "~/whoami",
    name: "孙喜龙",
    handle: "Sunxl1128",
    location: "北京",
    headline: "9 年 Android 原生开发 · 新能源充电桩上位机",
    subline: "北京智充科技 / Android 开发工程师 · 项目负责人",
    status: "目前在职 · 开放技术交流",
    statusTone: "success",
    summary: "主导多款充电桩上位机产品从 0 到 1 落地与迭代，覆盖架构设计、技术攻坚、项目管理与海外产品交付全流程；独立打造 Windows 端充电桩测试运维工具。",
    meta: [
      { icon: "location", text: "北京 · 期望城市" },
      { icon: "code", text: "Android / Flutter / OCPP / MQTT" }
    ],
    stats: [
      { value: "9", unit: "年", label: "Android 开发经验" },
      { value: "10+", unit: "", label: "国家 / 地区" },
      { value: "50+", unit: "", label: "海外客户" },
      { value: "2000+", unit: "台", label: "设备规模落地" }
    ],
    actions: [
      { label: "GitHub 主页", url: "https://github.com/Sunxl1128", kind: "primary", icon: "github", external: true },
      { label: "复制邮箱", copy: "sunxilongsxl@163.com", kind: "secondary", icon: "mail" }
    ],
    /* 命令行 Hero 的输出行；打字机逐字呈现，prefers-reduced-motion 时一次性显示 */
    terminal: [
      { type: "cmd", text: "~/whoami" },
      { type: "out", text: "孙喜龙 / Sunxl1128 · 北京" },
      { type: "out", text: "Android Engineer · EV Charging HMI" },
      { type: "cmd", text: "cat ./stack.json" },
      { type: "out", text: "Kotlin · Jetpack Compose · Flutter · OCPP · MQTT" },
      { type: "cmd", text: "git status" },
      { type: "out", text: "on branch main · 9 years of commits · ready to collaborate" }
    ]
  },

  /* ---------------------------------------------------------------- 关于我 */
  about: {
    eyebrow: "01 / ABOUT",
    title: "关于我",
    note: "个人定位与核心优势，摘自本人公开简历。",
    positioningLabel: "个人定位",
    positioning: "9 年 Android 原生开发经验，熟练运用 Cursor、Trae、ChatGPT、Claude Code 等 AI 编程工具提效提质，深耕新能源充电桩上位机领域，同时覆盖在线医疗、泛娱乐、教育四大行业；精通硬件通讯协议与多版本 Android 适配，具备 Flutter 跨平台开发能力，独立打造 Windows 端充电桩测试运维工具；主导多款产品从 0 到 1 落地与迭代，兼具架构设计、技术攻坚、项目管理与海外产品交付全流程能力。",
    advantagesLabel: "个人优势",
    advantages: [
      {
        tag: "01 · ARCH",
        title: "技术扎实，架构精通",
        desc: "精通 Android 4.2/11/14 全版本开发，熟练掌握 Java/Kotlin/Flutter；深度掌握 Jetpack Compose + MVVM + MVI 最新架构，熟练运用 MVP 传统架构，擅长架构设计、硬件交互与性能调优；精通 OCPP/MQTT 协议及 CAN/Modbus/串口通讯，完美适配新能源硬件开发场景。",
        tags: ["Jetpack Compose", "MVVM / MVI", "多版本适配", "硬件交互"]
      },
      {
        tag: "02 · DOMAIN",
        title: "领域深耕，经验丰富",
        desc: "专注新能源充电桩 / 光储一体机上位机研发，精通电池加充、光储协同、并网控制等核心业务；熟悉医疗、泛娱乐、教育类产品开发逻辑，深刻理解 ToB/ToC 产品差异，具备大规模海外定制化开发实战经验。",
        tags: ["充电桩上位机", "光储一体机", "海外定制", "ToB / ToC"]
      },
      {
        tag: "03 · LEAD",
        title: "项目管理，提效赋能",
        desc: "历任研发经理，统筹团队完成产品全生命周期开发与迭代，制定标准化研发流程；推动 AI 辅助开发落地，打造高效协作研发团队。",
        tags: ["研发经理", "标准化流程", "AI 辅助开发", "团队协作"]
      },
      {
        tag: "04 · PRODUCT",
        title: "产品思维，落地能力",
        desc: "精准捕捉海内外客户核心需求，兼顾技术可行性与产品体验；擅长跨团队协同沟通，高效协调资源保障项目高质量落地，开发产品获全球客户高度认可。",
        tags: ["需求分析", "跨团队协同", "从 0 到 1", "全球客户"]
      }
    ]
  },

  /* ---------------------------------------------------------------- 技能栈 */
  skills: {
    eyebrow: "02 / STACK",
    title: "技能栈",
    note: "带 ↗ 标记的技术项可点击查看官方文档或协议组织主页（均为已核实可访问的外链）。",
    groups: [
      {
        id: "lang-arch",
        title: "语言与架构",
        note: "language / architecture",
        items: [
          { name: "Kotlin", url: "https://kotlinlang.org/" },
          { name: "Java" },
          { name: "Flutter", url: "https://flutter.dev/" },
          { name: "Jetpack Compose", url: "https://developer.android.com/jetpack/compose" },
          { name: "MVVM / MVI / MVP" },
          { name: "Android 4.2 / 11 / 14" },
          { name: "多语言适配" }
        ]
      },
      {
        id: "proto-hardware",
        title: "协议与硬件",
        note: "protocol / hardware",
        items: [
          { name: "OCPP 1.6 / 2.0", url: "https://www.openchargealliance.org/" },
          { name: "MQTT", url: "https://mqtt.org/" },
          { name: "CAN 通讯" },
          { name: "Modbus" },
          { name: "串口通信" },
          { name: "国标 / 欧标适配" },
          { name: "电池加充 / 光储协同 / 并网控制" }
        ]
      },
      {
        id: "toolchain",
        title: "工具链",
        note: "toolchain",
        items: [
          { name: "Android Studio" },
          { name: "Gradle" },
          { name: "Git" },
          { name: "Tinker 热修复" },
          { name: "LeakCanary" },
          { name: "Flutter Windows 桌面端" },
          { name: "钉钉问题同步" },
          { name: "日志分析工具" }
        ]
      },
      {
        id: "ai-tools",
        title: "AI 提效工具",
        note: "ai-assisted development",
        items: [
          { name: "Cursor" },
          { name: "Trae" },
          { name: "ChatGPT" },
          { name: "Claude Code" },
          { name: "OpenClaw 日志分析" }
        ]
      }
    ]
  },

  /* ---------------------------------------------------------------- 工作经历 */
  experience: {
    eyebrow: "03 / EXPERIENCE",
    title: "工作经历",
    note: "5 段任职经历；公司名带 ↗ 标记的表示已核实可访问的官网，纯文本公司名不附加外链。",
    emptyText: "暂无工作经历条目。",
    items: [
      {
        id: "xcharge",
        company: "北京智充科技有限公司",
        companyUrl: "https://www.xcharge.com/",
        role: "Android 开发工程师 / 项目负责人",
        period: "2022.12 - 至今",
        current: true,
        duties: "负责新能源充电桩上位机全流程研发，2024 年起主导 C8A 电池加充电桩、C8S 光储一体机核心开发，采用 Jetpack Compose + MVVM + MVI 最新架构搭建高可用系统；独立使用 Flutter 开发 Windows 端充电桩测试运维工具，对接全球客户完成国标 / 欧标产品定制化交付，基于 OpenClaw 实现测试和售后的日志分析工具，接入钉钉实现问题同步，保障跨团队高效协作。",
        achievements: [
          "基于 Android 11/14 新架构完成 C6/C7/C8A/C8S 多款机型上位机开发，产品落地欧美、非洲等 10+ 国家 / 地区，服务 50+ 海外客户，客户满意度达 95%+；",
          "攻克多机型硬件交互与跨系统兼容难题，实现多设备统一管理，将设备运行故障率控制在 1% 以下；",
          "开发 Flutter Windows 充电桩测试运维工具，集成硬件调试、协议报文解析、故障诊断等核心功能，设备问题定位效率提升 60%，大幅降低研发 / 测试 / 售后运维成本。"
        ],
        tags: ["Jetpack Compose", "Kotlin / Java", "Flutter", "OCPP / MQTT", "海外交付"]
      },
      {
        id: "myjt",
        company: "名医讲堂 (北京) 科技发展有限公司",
        companyUrl: "",
        role: "Android 研发经理",
        period: "2022.05 - 2022.11",
        current: false,
        duties: "担任看名医 APP 安卓端研发负责人，采用 MVVM 架构搭建项目框架，统筹团队完成版本迭代、功能开发与上线交付，把控项目进度与产品质量，解决核心技术瓶颈。",
        achievements: [
          "主导 APP 2.0.0-2.1.6 版本全流程开发上线，新增音视频问诊、IM 即时通讯、在线挂号等核心功能，覆盖在线医疗全场景服务；",
          "优化音视频通讯链路与网络适配策略，将通话卡顿率降至 2% 以下，推动 APP 日活实现稳步增长；",
          "搭建标准化研发与 Bug 修复流程，推动团队开发效率提升 30%+，优化用户数据存储与传输方案，完全符合医疗行业数据安全合规标准。"
        ],
        tags: ["MVVM", "音视频问诊", "IM 即时通讯", "研发管理"]
      },
      {
        id: "haohuo",
        company: "好活集团",
        companyUrl: "https://www.51haohuo.com/",
        role: "Android 开发工程师",
        period: "2021.04 - 2022.05",
        current: false,
        duties: "独立负责公司两款核心 APP 的需求分析、架构设计、全流程开发、上线运维与迭代优化。",
        achievements: [
          "独立完成「好活 App」「就业管理 App」开发，覆盖个体户及外出务工群体，实现灵活就业服务与基层就业数据管理全流程数字化，基层管理效率提升 30%+；",
          "开展深度性能优化，解决启动慢、页面卡顿等问题，APP 启动速度提升 40%，页面加载速度提升 35%，用户留存率显著改善。"
        ],
        tags: ["独立开发", "性能优化", "灵活就业", "ToC / ToB"]
      },
      {
        id: "alpha",
        company: "奥飞娱乐股份有限公司",
        companyUrl: "https://www.gdalpha.com/",
        role: "Android 研发经理",
        period: "2019.11 - 2021.04",
        current: false,
        duties: "担任有妖气漫画 APP 安卓端负责人，采用 MVP 架构完成项目架构重构与性能优化，统筹核心功能开发与团队管理，保障百万级用户产品稳定运行。",
        achievements: [
          "主导百万级用户 APP 架构重构，搭建高可维护性技术框架，将 APP 崩溃率降至 0.3% 以下，用户投诉率降低 40%；",
          "带领团队开发高性能漫画阅读器、社区互动、内购会员等核心模块，社区互动率提升 25%+，会员付费转化率显著提升，为公司创造稳定营收；",
          "引入 Tinker 热修复与 LeakCanary 内存监控体系，线上 Bug 修复效率提升 80%+，制定标准化开发规范，培养核心开发人才。"
        ],
        tags: ["MVP 重构", "百万级用户", "Tinker", "LeakCanary", "团队管理"]
      },
      {
        id: "weiming",
        company: "未名天 (北京) 教育科技有限公司",
        companyUrl: "",
        role: "Android 开发工程师",
        period: "2016.08 - 2019.11",
        current: false,
        duties: "负责日语教育系列 APP Android 端设计、开发、迭代与全渠道上线，采用 MVP 架构搭建项目基础框架，研究应用新技术并推动落地。",
        achievements: [
          "独立完成 3 款日语教育 APP（覆盖入门到考级全场景）的 v1.0~v2.0+ 版本开发与迭代，累计下载量超百万；",
          "负责架构设计与全链路性能优化，保障产品长期稳定运行，成为公司在线日语学习核心产品矩阵。"
        ],
        tags: ["MVP", "独立开发", "全渠道上线", "在线教育"]
      }
    ]
  },

  /* ---------------------------------------------------------------- 项目经历（后续在这里追加） */
  projects: {
    eyebrow: "04 / PROJECTS",
    title: "项目经历",
    note: "所有项目由下方 items 数组驱动，每个对象渲染成一张卡片；带 ↗ 的外链均可点击查看。后续补充项目只需复制一个对象追加到数组。",
    emptyText: "暂无项目条目；可在 data/resume.js 的 projects.items 中追加。",
    linksEmptyText: "本项目暂无公开外链。",
    items: [
      {
        id: "xcharge-hmi-c6-c7-c8a-c8s",
        name: "新能源充电桩上位机系列开发项目（C6/C7/C8A/C8S）",
        period: "2024.01 - 至今",
        role: "项目负责人 / 核心开发工程师",
        status: "进行中",
        statusTone: "success",
        summary: "面向海外市场的国标 / 欧标充电桩上位机系统，覆盖 C6 / C7 / C8A / C8S 多机型，实现云端平台与下位机硬件双向实时通信，支撑光伏策略调度、防逆流保护、并网控制与电池数据实时上报。",
        highlights: [
          "采用 Jetpack Compose + MVVM + MVI 全新架构，搭建高可用、易维护的上位机系统，实现云端平台与下位机硬件双向实时通信，落地光伏策略智能调度、防逆流保护、并网控制、电池数据实时上报等核心能力；",
          "完成国标 / 欧标多机型充电桩开发，适配 OCPP 1.6/2.0 与 MQTT 协议，实现多语言适配与海外电力标准兼容，满足全球不同地区的合规要求；",
          "独立使用 Flutter 开发 Windows 端测试运维工具，覆盖研发、测试、售后全流程调试、参数配置、批量测试场景，成为公司内部标准化工具；",
          "开展全链路稳定性优化，解决设备离线、通信中断、数据延迟等关键问题，建立完善的故障排查与修复体系。"
        ],
        stack: [
          "Android 11/14", "Jetpack Compose", "MVVM", "MVI", "Kotlin", "Java", "Flutter",
          "OCPP 1.6/2.0", "MQTT", "CAN/Modbus 通讯", "串口通信", "多语言适配", "硬件交互"
        ],
        results: [
          "C8A/C8S 产品规模落地 2000+ 台，能源利用率提升 25%+，设备响应速度提升 30%，获海内外客户高度认可；",
          "全系列产品覆盖 10+ 国家 / 地区，服务 50+ 海外客户，设备运行故障率低于 1%；",
          "自研运维工具将跨团队协作效率提升 60%，大幅降低全流程运维成本。"
        ],
        links: [
          { label: "XCHARGE 官网", url: "https://www.xcharge.com/", kind: "company" },
          { label: "关于 XCHARGE", url: "https://www.xcharge.com/aboutUs", kind: "company" },
          { label: "C7 超充产品页", url: "https://www.xcharge.com/device/C7EU", kind: "product" },
          { label: "C6 产品页", url: "https://www.xcharge.us/product/c6", kind: "product" },
          { label: "Net Zero Series（C8 相关）", url: "https://m.xcharge.com/device/NetZeroSeries", kind: "product" },
          { label: "OCA · XCharge Group OCPP 认证记录", url: "https://openchargealliance.org/participants/beijing-x-charge-technology-co-ltd", kind: "cert" },
          { label: "C7 新一代发布新闻", url: "https://www.xcharge.com/newsDetail?id=6a3350039c6f921c19dcc7e2&type=news", kind: "news" }
        ],
        tags: ["新能源", "充电桩上位机", "海外交付", "从 0 到 1", "Flutter 工具链"]
      }
    ]
  },

  /* ---------------------------------------------------------------- 开源与技术实践 */
  opensource: {
    eyebrow: "05 / OPEN SOURCE",
    title: "开源与技术实践",
    note: "以下均为本人 GitHub 公开仓库，属个人技术实践 / 开源作品，用于展示代码习惯与技术广度，并非任职公司的商业项目。点击卡片可直接查看仓库。",
    emptyText: "暂无公开仓库条目。",
    profileLabel: "访问 GitHub 个人主页",
    profileUrl: "https://github.com/Sunxl1128",
    items: [
      {
        id: "coolmallkotlin",
        name: "CoolMallKotlin",
        desc: "个人 Kotlin 技术实践项目仓库，代码公开可查。",
        url: "https://github.com/Sunxl1128/CoolMallKotlin",
        lang: "Kotlin",
        tags: ["Kotlin", "Android", "个人项目"]
      },
      {
        id: "superedittextlibrary",
        name: "SuperEditTextLibrary",
        desc: "自定义 EditText 控件库，个人开源组件实践。",
        url: "https://github.com/Sunxl1128/SuperEditTextLibrary",
        lang: "Java / Kotlin",
        tags: ["自定义 View", "Android", "组件库"]
      },
      {
        id: "sxllibrary",
        name: "SxlLibrary",
        desc: "个人 Android 通用组件库（第一代），沉淀日常开发复用代码。",
        url: "https://github.com/Sunxl1128/SxlLibrary",
        lang: "Android",
        tags: ["Android", "工具库", "个人项目"]
      },
      {
        id: "sxllibrary2",
        name: "SxlLibrary2",
        desc: "个人 Android 通用组件库（第二代），延续组件化实践。",
        url: "https://github.com/Sunxl1128/SxlLibrary2",
        lang: "Android",
        tags: ["Android", "组件化", "个人项目"]
      },
      {
        id: "dji-videostream",
        name: "DJI-Android-VideoStreamDecodingSample",
        desc: "DJI Android 视频流解码示例相关的技术实践仓库。",
        url: "https://github.com/Sunxl1128/DJI-Android-VideoStreamDecodingSample",
        lang: "Android / Java",
        tags: ["视频流", "DJI", "Android"]
      },
      {
        id: "ai-native-jobhunt",
        name: "ai-native-jobhunt",
        desc: "AI 原生求职方向的技术实践仓库。",
        url: "https://github.com/Sunxl1128/ai-native-jobhunt",
        lang: "AI / Web",
        tags: ["AI", "工具实践", "个人项目"]
      }
    ]
  },

  /* ---------------------------------------------------------------- 教育经历 */
  education: {
    eyebrow: "06 / EDUCATION",
    title: "教育经历",
    note: "",
    emptyText: "暂无教育经历条目。",
    items: [
      {
        id: "jlnu",
        school: "吉林师范大学",
        major: "软件工程",
        degree: "本科",
        period: "2013.09 - 2017.06",
        note: ""
      }
    ]
  },

  /* ---------------------------------------------------------------- 联系方式 */
  contact: {
    eyebrow: "07 / CONTACT",
    title: "联系方式",
    note: "点击任一联系方式即可复制到剪贴板（页面内提示，不弹出系统对话框）。",
    emptyText: "暂无联系方式。",
    items: [
      { label: "手机", value: "16601115513", copy: "16601115513", icon: "phone" },
      { label: "邮箱", value: "sunxilongsxl@163.com", copy: "sunxilongsxl@163.com", icon: "mail" },
      { label: "GitHub", value: "github.com/Sunxl1128", copy: "https://github.com/Sunxl1128", icon: "github" },
      { label: "所在地", value: "北京", copy: "北京", icon: "location" }
    ],
    githubLabel: "查看 GitHub 个人主页",
    githubUrl: "https://github.com/Sunxl1128"
  },

  /* ---------------------------------------------------------------- 页脚 */
  footer: {
    copyright: "© {year} 孙喜龙 · Built with HTML / CSS / JS",
    hosted: "本站由 GitHub Pages 托管",
    source: "源码仓库：Sunxl1128/resume-blog",
    note: "内容驱动 · 零构建 · 零外部 CDN 依赖"
  }
};
