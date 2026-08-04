## Purpose

通过稳定的能力分类和子工具顺序组织桌面及移动导航，让用户能够从工具所属领域快速理解并访问全部六项开发能力。

## ADDED Requirements

### Requirement: Desktop navigation hierarchy
系统 SHALL 在左侧导航中使用非交互分类标题和视觉嵌套的子工具构成两级层级，并 SHALL 按以下顺序展示：非对称加密下的 RSA；摘要算法下的 MD5、SHA-1；时间工具下的时间戳；编码工具下的 URL 编解码、Base64。

#### Scenario: View grouped desktop navigation
- **WHEN** 用户在显示左侧导航的桌面视口打开应用
- **THEN** 用户按指定顺序看到四个分类和六个子工具，且能够视觉辨认工具所属分类

#### Scenario: Category headings are not tool actions
- **WHEN** 用户使用鼠标或键盘浏览左侧导航
- **THEN** 分类标题不表现为可激活工具，六个子工具保持可聚焦和可操作

### Requirement: Default active tool
系统 SHALL 在新的页面会话首次加载时默认激活 RSA，并 SHALL 在桌面和移动导航中同时标识 RSA 为当前工具。

#### Scenario: Open a fresh session
- **WHEN** 用户首次加载或刷新应用且没有当前页面内存状态
- **THEN** 系统显示 RSA 工具并将 RSA 导航项标记为当前项

### Requirement: Navigation order and labels
系统 SHALL 将工具显示名称设为 `RSA`、`MD5`、`SHA-1`、`时间戳`、`URL 编解码` 和 `Base64`，并 SHALL 在所有导航呈现中保持分类确定的工具顺序。

#### Scenario: Compare desktop and mobile order
- **WHEN** 用户分别查看桌面和移动导航
- **THEN** 两种导航中的工具顺序均为 RSA、MD5、SHA-1、时间戳、URL 编解码、Base64

### Requirement: Mobile grouped navigation
系统 SHALL 在移动端保留四个分类与全部六个工具的关联和顺序，并 SHALL 允许在有限宽度中访问每个工具且不裁切工具名称。

#### Scenario: Navigate on a narrow viewport
- **WHEN** 用户在移动视口浏览工具导航
- **THEN** 用户能够识别分类、滚动或展开导航并激活任意一个工具，完整名称保持可读

### Requirement: Grouped navigation accessibility
系统 SHALL 为导航分组提供可识别语义，并 SHALL 使键盘焦点按照视觉顺序依次到达六个工具；当前工具 SHALL 具有程序化状态。

#### Scenario: Navigate groups with a keyboard
- **WHEN** 用户仅使用键盘从 RSA 依次浏览导航
- **THEN** 焦点按 RSA、MD5、SHA-1、时间戳、URL 编解码、Base64 的顺序移动，分类标题不会截获焦点

#### Scenario: Switch tools without losing page state
- **WHEN** 用户在一个工具中输入内容、切换到另一分类的工具并返回
- **THEN** 当前页面会话内原工具状态保持不变
