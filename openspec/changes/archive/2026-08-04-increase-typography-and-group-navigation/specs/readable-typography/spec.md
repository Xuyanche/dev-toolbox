## Purpose

确保开发工具箱中的正文、导航、表单、提示和操作反馈在桌面与移动设备上保持足够字号，并在放大后仍具有清晰、无裁切的布局。

## ADDED Requirements

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

