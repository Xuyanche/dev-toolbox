# readable-typography Specification

## Purpose

确保开发工具箱中的正文、导航、表单、提示和操作反馈在桌面与移动设备上保持足够字号，并在放大后仍具有清晰、无裁切的布局。

## Requirements

### Requirement: Minimum readable text size
系统 SHALL 使所有承载用户可读信息或可操作标签的页面文字具有不小于 12px 的最终计算字号，包括导航、辅助说明、字段标签、提示、按钮、状态、页脚和品牌文字；装饰性符号不受此限制。

#### Scenario: Inspect desktop text sizes
- **WHEN** 用户在桌面视口以浏览器默认缩放打开任一工具
- **THEN** 所有可读或可操作文字的最终计算字号均不小于 12px

#### Scenario: Inspect mobile text sizes
- **WHEN** 用户在 390px 宽移动视口以浏览器默认缩放打开任一工具
- **THEN** 所有可读或可操作文字的最终计算字号均不小于 12px

### Requirement: Comfortable body typography
系统 SHALL 使常规正文、表单输入和工具说明使用 13px 或更大的字号，并 SHALL 保持足以区分标题、正文和辅助信息的视觉层级。

#### Scenario: Read regular content
- **WHEN** 用户查看工具说明、输入内容、输出内容或通知正文
- **THEN** 这些常规内容使用至少 13px 字号，且标题仍明显大于正文

### Requirement: Layout accommodates enlarged text
系统 SHALL 调整行高、控件高度、间距和可换行行为，使增大的文字不会被裁切、重叠或遮挡，也不会在 320px 及以上视口造成页面级横向滚动。

#### Scenario: Render controls with enlarged typography
- **WHEN** 页面展示按钮、分段选项、导航项、提示框和输入输出区域
- **THEN** 文字完整可见并与相邻内容保持可辨认间距

#### Scenario: Render at minimum supported width
- **WHEN** 用户在 320px 宽视口打开页面
- **THEN** 核心内容保持可读且页面不需要横向滚动

### Requirement: Status and secondary text remain legible
系统 SHALL 在弱化辅助信息视觉权重时使用颜色、字重或间距，而 MUST NOT 通过小于 12px 的字号弱化信息。

#### Scenario: View secondary information
- **WHEN** 用户查看字段提示、状态反馈、导航副标题、品牌副标题或页脚
- **THEN** 信息仍不小于 12px，并通过非字号缩小方式与正文形成层级

### Requirement: Shared compact tool headers and workspaces
工具页 SHALL 使用紧凑标题布局，将标题与说明尽量并排展示并允许窄屏换行，以减少非正文区域占用；正文输入字号 SHALL 保持不变，说明 SHALL 保持至少 13px。JSON SHALL 合并重复输入标题并将复制操作放在同一标题栏。JWT SHALL 移除重复工作区标题占位并紧凑排列模式和算法控件，让已有编辑/结果区域利用剩余空间。窄屏和低高度 SHALL 保持核心操作及内容可访问。

#### Scenario: Expand JSON and JWT content on desktop
- **WHEN** 用户在至少 1280×768 的桌面视口打开 JSON 或 JWT
- **THEN** 标题占用减少，输入和结果区域使用扩大的剩余高度，主要操作与状态保持可达且不因外层隐藏被裁切

#### Scenario: Retain readable controls on mobile
- **WHEN** 用户在窄屏打开这些工具
- **THEN** 标题说明与控件可换行，正文按原有窄屏布局展示，页面没有横向溢出
