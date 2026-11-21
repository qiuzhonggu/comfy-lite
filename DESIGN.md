# Design Brief

## Direction

镜台 Darkroom Bay — 轻量视频分镜节点画布，暗房剪辑台氛围，暖炭黑底 + 安全灯朱橙强调。

## Tone

工具型克制暗色（dark-only）：画布与媒体结果是主角，界面退后，像剪辑室的暗房而非冷蓝科技风。

## Differentiation

六种卡片各有身份色（顶部 3px 色条 + 端口圆点 + 工具栏色点），连线运行时朱橙虚线流动，一眼读懂分镜流向。

## Color Palette

| Token          | OKLCH          | Role                                  |
| -------------- | -------------- | ------------------------------------- |
| background     | 0.165 0.006 60 | 页面底色（画布列表、设置页）          |
| canvas         | 0.145 0.005 60 | 无限画布底 + canvas-dot 0.3 点阵       |
| foreground     | 0.93 0.012 80  | 暖白正文                               |
| card           | 0.215 0.007 60 | 节点卡片 / 列表卡片表面               |
| primary        | 0.68 0.19 38   | 安全灯朱橙：运行按钮、选中、进度、焦点 |
| accent         | 0.3 0.03 45    | 悬停/激活工具的暖色 pill              |
| muted          | 0.25 0.007 60  | 输入区、媒体占位底                    |
| destructive    | 0.64 0.21 25   | 失败态描边、删除确认                  |
| success/warning| 0.72 0.15 150 / 0.8 0.15 80 | 连接成功 / 测试中提示      |

Node identity (`.node-*` sets `--node`): prompt 0.88 0.07 90 奶油 · image-ref 0.74 0.11 190 青 · chat 0.72 0.11 270 灰蓝紫 · image-gen 0.68 0.19 38 朱橙 · video 0.79 0.15 72 琥珀 · voice 0.74 0.15 150 绿。

## Typography

- Display: Bricolage Grotesque — 应用名“镜台”、页面标题、画布列表卡名
- Body: Figtree（CJK 回退 PingFang SC / Microsoft YaHei）— 全部中文 UI 标签与正文
- Mono: JetBrains Mono — 模型名、缩放百分比、进度数字、时长、API 地址
- Scale: page title `text-2xl font-display font-semibold tracking-tight`, card title `text-sm font-semibold`, label `text-xs text-muted-foreground`, meta `font-mono text-[11px]`

## Elevation & Depth

三层：canvas（最深）→ card 节点（shadow-node + 1px border）→ 浮层工具栏/缩放面板（surface-float 半透明模糊 + shadow-float）；选中卡用 shadow-node-selected 朱橙描边。

## Structural Zones

| Zone            | Background             | Border          | Notes                                            |
| --------------- | ---------------------- | --------------- | ------------------------------------------------ |
| 顶栏 (44px)     | bg-card shadow-subtle  | border-b        | 应用名 · 可编辑画布名 · mono 缩放 % · 导出 · 设置 |
| 画布            | canvas-grid（随缩放平移） | —            | 全屏，卡片绝对定位，SVG 贝塞尔连线 stroke-edge    |
| 左侧工具栏      | surface-float rounded-full | border       | 垂直 pill，6 个图标 + 身份色点 + 小字标签        |
| 右下缩放面板    | surface-float rounded-lg | border        | 缩放 +/−、适应视图、mono 百分比                  |
| 画布列表页      | bg-background          | —               | 卡片网格 bg-card；顶部同顶栏                     |
| 右侧 AI 助手 (360px) | bg-panel shadow-panel；头部 bg-panel-header | border-l | 可收起（收起后顶栏留图标按钮），画布 flex-1 自适应 |
| 右键菜单        | bg-popover（shadcn context-menu） | border shadow-float | 中文项 + 右侧 mono 快捷键；危险项 text-destructive；子菜单用身份色点列节点类型 |
| 设置页          | bg-background，内容 max-w-3xl | 每个中转站一张 bg-card border 卡 | 名称/地址/Key + 对话·生图·视频三组模型 chip 列表；顶部“默认模型”分组 |

Panel tokens: panel 0.19 0.006 60 · panel-header 0.215 · bubble-user 0.3 0.03 45（暖 accent）· bubble-ai 0.235 · ai-mark = primary。

## Spacing & Rhythm

卡片内紧凑（p-3, gap-2），卡片宽 280–320px；画布节点之间留大间距；列表/设置页 gap-6 分组、p-8 页边距。

## Component Patterns

- Buttons: 运行 = bg-primary rounded-md h-7 小号 + ▶ 图标；次要 = bg-secondary；重试 = 描边 destructive；悬停亮度+5%
- Node cards: rounded-lg bg-card border shadow-node node-stripe；头部 身份色点 + 标题 + mono 模型名；底部 状态 + 运行
- Ports: 10px 圆点，node-dot，边缘居中；悬停放大 1.3
- Status: 空闲 muted · 运行中 primary + run-pulse 点 + 进度条 · 完成 success · 失败 destructive 描边 + 错误文字 + 重试
- Media: 图片/视频 rounded-md 填满卡宽，aspect-video；音频用原生 audio 控件包于 bg-muted 条
- Badges: rounded-full px-2 text-[11px] node-tint node-text
- Relay/model picker (节点头部): shadcn Select h-6 text-[11px] font-mono bg-muted，显示“中转站 / 模型”，分组标签 = 中转站名；未配置时 text-warning “未选模型”
- AI chat: 用户气泡右对齐 bubble-user rounded-xl rounded-br-sm；AI 气泡左对齐 bubble-ai rounded-xl rounded-bl-sm；改动摘要为 bg-muted rounded-md 小列表（身份色点 + ＋新增/✎修改/－删除/⟶连接，mono 计数）；composer 底部 border-t，Textarea bg-muted min-h-16，发送 bg-primary；思考中 3 个 animate-typing-dot 点
- 被 AI 改动的节点：临时加 .ai-touched（朱橙描边外扩淡出 1.6s）
- Model chips (设置页): rounded-full bg-secondary font-mono text-xs + × 删除；末尾“+ 添加”输入

## Motion

- Entrance: 新卡 animate-node-in 180ms；页面无入场编排
- Hover: transition-smooth 200ms，卡片仅边框变亮，不位移
- AI 面板: 展开/收起宽度过渡 200ms；新消息 animate-msg-in；右键菜单用 shadcn 默认 fade/zoom
- Decorative: 运行中连线 animate-edge-flow 虚线流动；加载占位 animate-shimmer；状态点 animate-run-pulse

## Constraints

- 只用 dark 主题；颜色全部走 token，身份色只用于点/条/端口/小徽标，不铺满卡片
- 不做全局渐变、霓虹发光；拖拽时禁用 transition 保证跟手
- 界面文案全中文；技术字符串用 mono

## Signature Detail

安全灯朱橙 + 节点身份色条：暗房剪辑台式的视觉语言，让分镜流程像胶片工作台一样可读。
