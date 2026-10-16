## MODIFIED Requirements

### Requirement: Desktop navigation hierarchy
系统 SHALL 在左侧导航中使用可折叠分类按钮和视觉嵌套的子工具构成两级层级，并 SHALL 从以下基础顺序中过滤运行时关闭的工具：随机数工具下的色子模拟器、随机数生成器；对称加密下的 AES、DES、SM4；非对称加密下的 RSA；摘要算法下的 MD5、SHA；时间工具下的时间戳；编码工具下的 URL 编解码、Unicode、Base64、JWT、JSON；文本工具下的文本对比。系统 SHALL 省略过滤后为空的分类，并 SHALL 保持剩余分类和工具的相对顺序。桌面导航 SHALL 同时至多展开一个分类；介绍首页显示时 SHALL 收起全部分类。

#### Scenario: View grouped desktop navigation
- **WHEN** 用户在显示左侧导航的桌面视口打开应用
- **THEN** 用户按基础顺序看到至少包含一个启用工具的收起分类，且能够辨认每个分类的展开状态

#### Scenario: Filter disabled desktop tools
- **WHEN** 运行时工具配置关闭一个或多个工具
- **THEN** 桌面导航不显示被关闭的工具，并省略没有启用工具的分类，同时保持其他入口的相对顺序

#### Scenario: Expand another desktop category
- **WHEN** 用户激活一个当前收起的分类按钮
- **THEN** 系统展开该分类、收起此前展开的分类，并通过程序化状态表达展开变化

#### Scenario: Select a tool from an expanded category
- **WHEN** 用户激活展开分类内的任一启用工具
- **THEN** 系统显示该工具并保持其所属分类展开

#### Scenario: Select Unicode from the encoding category
- **WHEN** `Unicode` 已启用且用户展开“编码工具”分类并选择 `Unicode`
- **THEN** 系统显示 Unicode 工具并保持“编码工具”分类展开

#### Scenario: Select JSON from the encoding category
- **WHEN** `JSON` 已启用且用户展开“编码工具”分类并选择 `JSON`
- **THEN** 系统显示 JSON 工具并保持“编码工具”分类展开

#### Scenario: Select text comparison from its own category
- **WHEN** `text-diff` 已启用且用户展开“文本工具”并选择“文本对比”
- **THEN** 系统显示文本对比工作区并保持“文本工具”展开，该入口不属于“编码工具”

### Requirement: Navigation order and labels
系统 SHALL 使用以下基础工具显示名称与顺序：`色子模拟器`、`随机数生成器`、`AES`、`DES`、`SM4`、`RSA`、`MD5`、`SHA`、`时间戳`、`URL 编解码`、`Unicode`、`Base64`、`JWT`、`JSON` 和 `文本对比`。系统 SHALL 从该基础列表中过滤运行时关闭的工具，并 SHALL 在所有导航呈现中保持剩余工具的分类和相对顺序。

#### Scenario: Compare desktop and mobile order
- **WHEN** 用户分别查看桌面和移动导航
- **THEN** 两种导航显示相同的启用工具集合，且这些工具遵循基础顺序

#### Scenario: Hide DES by default
- **WHEN** 应用使用内置工具可用性默认值
- **THEN** 桌面和移动导航均不显示 `DES`，而 `AES` 与 `SM4` 保持原有相对顺序

#### Scenario: Place text tools after encoding tools
- **WHEN** 文本对比与编码工具均已启用
- **THEN** 桌面、移动和首页目录均在“编码工具”之后显示独立“文本工具”分类，子工具名为“文本对比”

### Requirement: Grouped navigation accessibility
系统 SHALL 为导航分组和折叠按钮提供可识别语义，折叠按钮 SHALL 暴露 `aria-expanded` 和所控制的工具区域；键盘焦点 SHALL 按视觉顺序到达当前非空分类按钮及当前展开分类内的工具，收起分类内的工具 SHALL 不进入焦点顺序；当前工具 SHALL 具有程序化状态。

#### Scenario: Navigate groups with a keyboard
- **WHEN** 用户仅使用键盘浏览桌面导航并展开“随机数工具”
- **THEN** 焦点能够到达“随机数工具”按钮及其色子模拟器、随机数生成器工具，其他收起分类的工具不会截获焦点

#### Scenario: Switch tools without losing page state
- **WHEN** 用户在一个工具中输入内容、切换到另一分类的工具并返回
- **THEN** 当前页面会话内原工具状态保持不变

#### Scenario: Reach text tools with a keyboard
- **WHEN** 用户通过键盘展开“文本工具”并激活“文本对比”
- **THEN** 焦点可到达该一级分类及子工具，展开和当前项状态可被辅助技术识别

## ADDED Requirements

### Requirement: Text comparison registration and availability
系统 SHALL 使用工具 ID `text-diff` 将“文本对比”默认启用并注册在独立一级“文本工具”分类中。运行时配置、桌面导航、移动导航、首页和组件挂载 SHALL 使用同一可用性判断；关闭 `text-diff` 后 SHALL 隐藏该工具及其空分类且不挂载其组件。现有分类及工具的相对顺序 SHALL 保持不变。

#### Scenario: Disable text comparison everywhere
- **WHEN** 有效运行时配置将 `tools.text-diff` 设为 false
- **THEN** 桌面导航、移动导航和首页均不显示“文本工具”或“文本对比”，文本对比组件不挂载，其他工具保持原顺序

#### Scenario: Open text comparison from desktop or mobile navigation
- **WHEN** 文本对比已启用且用户在桌面或移动“文本工具”分类中激活“文本对比”
- **THEN** 系统进入同一个文本对比工作区，当前项状态一致；首页目录仅展示统一能力介绍，不为文本对比单独提供跳转按钮
