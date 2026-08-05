## MODIFIED Requirements

### Requirement: Copy any JSON part
系统 SHALL 在统一输入框的字段标题区域提供位于文本框边界之外、仅显示图标的完整内容复制操作，并 SHALL 为树状视图中的每个 JSON 部件提供仅显示图标的复制操作。图标复制按钮 SHALL 具有可访问名称、悬停说明和键盘焦点状态。输入框复制操作 SHALL 写入当前输入框的完整内容，且系统 SHALL NOT 提供独立的“复制格式化结果”或“复制压缩结果”文字按钮。对象和数组节点复制时 SHALL 写入该节点值的格式化 JSON；字符串节点复制时 SHALL 写入原始字符串值；数字、布尔值和 null 节点复制时 SHALL 写入其 JSON 文本表示。复制反馈 SHALL 不改变输入区或树节点的布局。

#### Scenario: Copy the current input content
- **WHEN** 用户激活统一输入框标题区域的复制图标
- **THEN** 系统将输入框当前未经截断的完整内容写入剪贴板并显示成功或失败反馈
- **AND** 复制图标位于文本框边界之外，不覆盖输入内容或文本框滚动区域

#### Scenario: Omit separate formatted and minified copy buttons
- **WHEN** 用户查看统一输入框下方的操作区
- **THEN** 系统不显示“复制格式化结果”或“复制压缩结果”文字按钮

#### Scenario: Copy an object subtree
- **WHEN** 用户激活某个对象或数组节点的复制图标
- **THEN** 系统将该节点对应值的格式化 JSON 写入剪贴板

#### Scenario: Copy a scalar node
- **WHEN** 用户激活字符串、数字、布尔值或 null 节点的复制图标
- **THEN** 系统按该标量类型的复制规则写入剪贴板，并显示不回显敏感内容的反馈
