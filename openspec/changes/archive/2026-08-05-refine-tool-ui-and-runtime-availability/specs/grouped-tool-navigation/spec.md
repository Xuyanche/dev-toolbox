## MODIFIED Requirements

### Requirement: Desktop navigation hierarchy
系统 SHALL 在左侧导航中使用可折叠分类按钮和视觉嵌套的子工具构成两级层级，并 SHALL 从以下基础顺序中过滤运行时关闭的工具：随机数工具下的色子模拟器、随机数生成器；对称加密下的 AES、DES、SM4；非对称加密下的 RSA；摘要算法下的 MD5、SHA；时间工具下的时间戳；编码工具下的 URL 编解码、Unicode、Base64、JWT、JSON。系统 SHALL 省略过滤后为空的分类，并 SHALL 保持剩余分类和工具的相对顺序。桌面导航 SHALL 同时至多展开一个分类；介绍首页显示时 SHALL 收起全部分类。

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

### Requirement: Navigation order and labels
系统 SHALL 使用以下基础工具显示名称与顺序：`色子模拟器`、`随机数生成器`、`AES`、`DES`、`SM4`、`RSA`、`MD5`、`SHA`、`时间戳`、`URL 编解码`、`Unicode`、`Base64`、`JWT` 和 `JSON`。系统 SHALL 从该基础列表中过滤运行时关闭的工具，并 SHALL 在所有导航呈现中保持剩余工具的分类和相对顺序。

#### Scenario: Compare desktop and mobile order
- **WHEN** 用户分别查看桌面和移动导航
- **THEN** 两种导航显示相同的启用工具集合，且这些工具遵循基础顺序

#### Scenario: Hide DES by default
- **WHEN** 应用使用内置工具可用性默认值
- **THEN** 桌面和移动导航均不显示 `DES`，而 `AES` 与 `SM4` 保持原有相对顺序

### Requirement: Mobile grouped navigation
系统 SHALL 在移动端保留非空分类与其中启用工具的关联和相对顺序，并 SHALL 允许在有限宽度中访问每个启用工具且不裁切工具名称。关闭的工具和空分类 SHALL NOT 出现在移动导航中。

#### Scenario: Navigate on a narrow viewport
- **WHEN** 用户在移动视口浏览工具导航
- **THEN** 用户能够识别所有非空分类、滚动或展开导航并激活任意启用工具，完整名称保持可读

#### Scenario: Navigate to Unicode on a narrow viewport
- **WHEN** `Unicode` 已启用且用户在移动视口浏览编码工具导航
- **THEN** 用户能够在 Base64 之前看到并激活 `Unicode` 工具，且工具名称保持完整可读

#### Scenario: Navigate to JSON on a narrow viewport
- **WHEN** `JSON` 已启用且用户在移动视口浏览编码工具导航
- **THEN** 用户能够看到并激活 `JSON` 工具，且工具名称保持完整可读

#### Scenario: Filter disabled mobile tools
- **WHEN** 运行时配置关闭一个工具或一个分类下的全部工具
- **THEN** 移动导航省略对应工具或空分类，且其他工具仍可按原相对顺序访问
