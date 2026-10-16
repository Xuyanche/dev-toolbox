## ADDED Requirements

### Requirement: Shared compact tool headers and workspaces
工具页 SHALL 使用紧凑标题布局，将标题与说明尽量并排展示并允许窄屏换行，以减少非正文区域占用；正文输入字号 SHALL 保持不变，说明 SHALL 保持至少 13px。JSON SHALL 合并重复输入标题并将复制操作放在同一标题栏。JWT SHALL 移除重复工作区标题占位并紧凑排列模式和算法控件，让已有编辑/结果区域利用剩余空间。窄屏和低高度 SHALL 保持核心操作及内容可访问。

#### Scenario: Expand JSON and JWT content on desktop
- **WHEN** 用户在至少 1280×768 的桌面视口打开 JSON 或 JWT
- **THEN** 标题占用减少，输入和结果区域使用扩大的剩余高度，主要操作与状态保持可达且不因外层隐藏被裁切

#### Scenario: Retain readable controls on mobile
- **WHEN** 用户在窄屏打开这些工具
- **THEN** 标题说明与控件可换行，正文按原有窄屏布局展示，页面没有横向溢出
