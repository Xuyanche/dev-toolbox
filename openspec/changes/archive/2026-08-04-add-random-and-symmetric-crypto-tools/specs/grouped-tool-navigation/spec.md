## MODIFIED Requirements

### Requirement: Desktop navigation hierarchy
系统 SHALL 在左侧导航中使用可折叠分类按钮和视觉嵌套的子工具构成两级层级，并 SHALL 按以下顺序展示：随机数工具下的色子模拟器、随机数生成器；对称加密下的 AES、DES、SM4；非对称加密下的 RSA；摘要算法下的 MD5、SHA-1；时间工具下的时间戳；编码工具下的 URL 编解码、Base64。桌面导航 SHALL 同时只展开一个分类；首次加载时 SHALL 展开当前 RSA 所属的“非对称加密”分类。

#### Scenario: View grouped desktop navigation
- **WHEN** 用户在显示左侧导航的桌面视口打开应用
- **THEN** 用户按指定顺序看到六个分类，只有“非对称加密”展开并显示 RSA，且能够辨认每个分类的展开状态

#### Scenario: Expand another desktop category
- **WHEN** 用户激活一个当前收起的分类按钮
- **THEN** 系统展开该分类、收起此前展开的分类，并通过程序化状态表达展开变化

#### Scenario: Select a tool from an expanded category
- **WHEN** 用户激活展开分类内的任一工具
- **THEN** 系统显示该工具并保持其所属分类展开

### Requirement: Navigation order and labels
系统 SHALL 将新增工具显示名称设为 `色子模拟器`、`随机数生成器`、`AES`、`DES`、`SM4`，保留现有工具名称 `RSA`、`MD5`、`SHA-1`、`时间戳`、`URL 编解码` 和 `Base64`，并 SHALL 在所有导航呈现中保持分类确定的工具顺序。

#### Scenario: Compare desktop and mobile order
- **WHEN** 用户分别查看桌面和移动导航
- **THEN** 两种导航中的工具顺序均为色子模拟器、随机数生成器、AES、DES、SM4、RSA、MD5、SHA-1、时间戳、URL 编解码、Base64

### Requirement: Mobile grouped navigation
系统 SHALL 在移动端保留六个分类与全部十一个工具的关联和顺序，并 SHALL 允许在有限宽度中访问每个工具且不裁切工具名称。

#### Scenario: Navigate on a narrow viewport
- **WHEN** 用户在移动视口浏览工具导航
- **THEN** 用户能够识别分类、滚动或展开导航并激活任意一个工具，完整名称保持可读

### Requirement: Grouped navigation accessibility
系统 SHALL 为导航分组和折叠按钮提供可识别语义，折叠按钮 SHALL 暴露 `aria-expanded` 和所控制的工具区域；键盘焦点 SHALL 按视觉顺序到达六个分类按钮及当前展开分类内的工具，收起分类内的工具 SHALL 不进入焦点顺序；当前工具 SHALL 具有程序化状态。

#### Scenario: Navigate groups with a keyboard
- **WHEN** 用户仅使用键盘浏览桌面导航并展开“随机数工具”
- **THEN** 焦点能够到达“随机数工具”按钮及其色子模拟器、随机数生成器工具，其他收起分类的工具不会截获焦点

#### Scenario: Switch tools without losing page state
- **WHEN** 用户在一个工具中输入内容、切换到另一分类的工具并返回
- **THEN** 当前页面会话内原工具状态保持不变
