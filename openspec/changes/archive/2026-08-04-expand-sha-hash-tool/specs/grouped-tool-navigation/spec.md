## MODIFIED Requirements

### Requirement: Desktop navigation hierarchy
系统 SHALL 在左侧导航中使用可折叠分类按钮和视觉嵌套的子工具构成两级层级，并 SHALL 按以下顺序展示：随机数工具下的色子模拟器、随机数生成器；对称加密下的 AES、DES、SM4；非对称加密下的 RSA；摘要算法下的 MD5、SHA；时间工具下的时间戳；编码工具下的 URL 编解码、Base64。桌面导航 SHALL 同时至多展开一个分类；介绍首页显示时 SHALL 收起全部分类。

#### Scenario: View grouped desktop navigation
- **WHEN** 用户在显示左侧导航的桌面视口打开应用
- **THEN** 用户按指定顺序看到六个收起的分类，且能够辨认每个分类的展开状态

#### Scenario: Expand another desktop category
- **WHEN** 用户激活一个当前收起的分类按钮
- **THEN** 系统展开该分类、收起此前展开的分类，并通过程序化状态表达展开变化

#### Scenario: Select a tool from an expanded category
- **WHEN** 用户激活展开分类内的任一工具
- **THEN** 系统显示该工具并保持其所属分类展开

### Requirement: Navigation order and labels
系统 SHALL 将工具显示名称设为 `色子模拟器`、`随机数生成器`、`AES`、`DES`、`SM4`、`RSA`、`MD5`、`SHA`、`时间戳`、`URL 编解码` 和 `Base64`，并 SHALL 在所有导航呈现中保持分类确定的工具顺序。

#### Scenario: Compare desktop and mobile order
- **WHEN** 用户分别查看桌面和移动导航
- **THEN** 两种导航中的工具顺序均为色子模拟器、随机数生成器、AES、DES、SM4、RSA、MD5、SHA、时间戳、URL 编解码、Base64
