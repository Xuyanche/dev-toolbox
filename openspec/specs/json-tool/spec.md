# json-tool Specification

## Purpose

为开发者提供完全在浏览器本地运行的中文 JSON 工具，用于在同一个窗口中完成 JSON 格式化、压缩、右侧树形查看、任意层级折叠、局部复制、JSON 字符串转义和去除转义，方便调试接口响应、配置片段、日志载荷和嵌套 JSON 字段。

## Requirements

### Requirement: Chinese JSON tool interface
系统 SHALL 为 JSON 工具提供中文界面文案，包括页面标题、说明、输入标签、按钮、状态反馈、错误提示、树节点操作和本地处理提示。

#### Scenario: View the JSON tool in Chinese
- **WHEN** 用户打开 `JSON` 工具
- **THEN** 页面主要可见文案使用中文说明 JSON 格式化、树状查看、复制、转义和去除转义操作

### Requirement: Single-window JSON formatting workspace
系统 SHALL 在同一个 JSON 工具窗口内完成 JSON 输入、格式化文本结果和树形结构展示。系统 SHALL NOT 要求用户跳转到另一个页面或切换到另一个工具才能查看树形结构。宽视口下，系统 SHALL 将文本工作区放在左侧，将树形结构放在右侧；窄视口下，系统 SHALL 以可访问的纵向顺序展示同样内容。

#### Scenario: Format and inspect in one workspace
- **WHEN** 用户输入有效 JSON 并执行格式化
- **THEN** 系统在同一个窗口中同时显示格式化文本结果和树形结构

#### Scenario: Show the tree on the right side
- **WHEN** 用户在宽视口中查看格式化后的 JSON 工具页面
- **THEN** JSON 输入和文本结果位于左侧工作区，树形结构位于右侧工作区

#### Scenario: Stack the same workspace on a narrow viewport
- **WHEN** 用户在窄视口中查看格式化后的 JSON 工具页面
- **THEN** 输入、文本结果和树形结构按可访问顺序纵向展示，且所有操作保持可用

### Requirement: Strict JSON formatting and minification
系统 SHALL 接受标准 JSON 输入并严格解析；解析成功后，系统 SHALL 能输出两空格缩进的格式化 JSON 和无多余空白的压缩 JSON。系统 SHALL 拒绝注释、尾随逗号、未加引号的对象键和其他非标准 JSON 语法。

#### Scenario: Format compact JSON
- **WHEN** 用户输入紧凑形式的有效 JSON 并执行格式化
- **THEN** 系统显示两空格缩进、换行稳定的格式化 JSON

#### Scenario: Minify formatted JSON
- **WHEN** 用户输入包含空白和换行的有效 JSON 并执行压缩
- **THEN** 系统显示不包含多余空白且语义等价的紧凑 JSON

#### Scenario: Reject invalid JSON
- **WHEN** 用户输入无效 JSON、非标准 JSON 或无法解析的内容
- **THEN** 系统不显示旧的格式化或树状结果，并提供中文错误反馈供用户修正

### Requirement: Right-side tree view for JSON parts
系统 SHALL 将解析成功的 JSON 在右侧树形区域按层级显示。对象节点 SHALL 显示属性名和属性数量；数组节点 SHALL 显示索引和元素数量；字符串、数字、布尔值和 null 节点 SHALL 显示类型和值预览。

#### Scenario: Display object and array hierarchy
- **WHEN** 用户格式化包含嵌套对象和数组的 JSON
- **THEN** 右侧树形区域按层级显示对象属性、数组索引和每个子值的类型

#### Scenario: Display scalar root JSON
- **WHEN** 用户输入字符串、数字、布尔值或 null 作为有效 JSON 根值
- **THEN** 系统显示单个标量树节点和对应格式化结果

### Requirement: Collapse any JSON tree level with count indicators
系统 SHALL 允许用户对任意对象或数组节点独立展开和折叠。折叠对象或数组节点后，系统 SHALL 隐藏该节点子项，并 SHALL 在该节点行内显示一个小框标识折叠内容中包含多少个属性或元素。展开或折叠一个节点 SHALL NOT 重置其他节点的展开状态。系统 SHALL 在树区域提供一个全局展开/折叠切换按钮；初始文案 SHALL 为“全部折叠”，当所有可折叠节点均已折叠时 SHALL 切换为“全部展开”。

#### Scenario: Collapse a nested object
- **WHEN** 用户折叠某个嵌套对象节点
- **THEN** 系统隐藏该对象的子属性，并在该节点上显示包含属性数量的小框

#### Scenario: Collapse a nested array
- **WHEN** 用户折叠某个数组节点
- **THEN** 系统隐藏该数组的子元素，并在该节点上显示包含元素数量的小框

#### Scenario: Preserve independent tree state
- **WHEN** 用户展开一个节点后折叠另一个节点
- **THEN** 系统只改变被操作节点的展开状态，其他节点的展开状态保持不变

#### Scenario: Collapse all nodes with one toggle
- **WHEN** 用户在树形结构可用且按钮显示“全部折叠”时激活全局切换按钮
- **THEN** 系统折叠所有可折叠对象和数组节点，并将按钮文案切换为“全部展开”

#### Scenario: Expand all nodes with the same toggle
- **WHEN** 所有可折叠节点均已折叠且按钮显示“全部展开”时，用户再次激活该按钮
- **THEN** 系统展开所有可折叠对象和数组节点，并将按钮文案切换回“全部折叠”

#### Scenario: Keep text workspace unchanged while toggling all nodes
- **WHEN** 用户激活全局展开/折叠切换按钮
- **THEN** 系统只改变树节点展开状态，不修改 JSON 输入、格式化文本结果或压缩结果

### Requirement: Compact right-side JSON tree density
系统 SHALL 让右侧 JSON 树保持紧凑的代码式视觉密度。树节点主行高度 SHALL 由树文本字号和行高决定；隐藏复制控件、折叠按钮、复制反馈、状态提示或占位元素 SHALL NOT 为每个节点额外增加可见行距。复制反馈 SHALL 不改变树节点的层级布局或节点间距。

#### Scenario: Render compact rows for a large JSON tree
- **WHEN** 用户格式化包含多层对象和数组的较大 JSON
- **THEN** 右侧树节点行距保持紧凑，节点之间不会因为不可见复制按钮、反馈行或占位元素出现额外空白

#### Scenario: Copy feedback does not expand tree rows
- **WHEN** 用户复制任意树节点
- **THEN** 系统显示复制反馈，但树节点主行高度和相邻节点间距保持不变

### Requirement: Copy any JSON part
系统 SHALL 为完整 JSON 结果和树状视图中的每个 JSON 部件提供复制操作。对象和数组节点复制时 SHALL 写入该节点值的格式化 JSON；字符串节点复制时 SHALL 写入原始字符串值；数字、布尔值和 null 节点复制时 SHALL 写入其 JSON 文本表示。复制反馈 SHALL 不改变树节点的层级布局。

#### Scenario: Copy the full formatted JSON
- **WHEN** 用户在格式化模式中激活复制格式化结果
- **THEN** 系统将完整格式化 JSON 写入剪贴板并显示成功或失败反馈

#### Scenario: Copy an object subtree
- **WHEN** 用户激活某个对象或数组节点的复制操作
- **THEN** 系统将该节点对应值的格式化 JSON 写入剪贴板

#### Scenario: Copy a scalar node
- **WHEN** 用户激活字符串、数字、布尔值或 null 节点的复制操作
- **THEN** 系统按该标量类型的复制规则写入剪贴板，并显示不回显敏感内容的反馈

### Requirement: JSON string escaping and unescaping
系统 SHALL 提供 JSON 字符串转义和去除转义功能。转义时，系统 SHALL 将普通文本转换为可嵌入 JSON 字符串的转义内容且不包含外层双引号。去除转义时，系统 SHALL 接受完整 JSON 字符串字面量或不含外层引号的转义内容，并还原为普通文本；输入不是有效 JSON 字符串转义内容时 SHALL 显示中文错误。

#### Scenario: Escape plain text
- **WHEN** 用户输入包含换行、双引号、反斜杠或 Unicode 字符的普通文本并执行 JSON 转义
- **THEN** 系统输出可放入 JSON 字符串值中的转义内容

#### Scenario: Unescape quoted JSON string
- **WHEN** 用户输入有效的完整 JSON 字符串字面量并执行去除转义
- **THEN** 系统输出该字符串字面量表示的普通文本

#### Scenario: Unescape raw escaped content
- **WHEN** 用户输入不含外层双引号但包含有效 JSON 转义序列的内容并执行去除转义
- **THEN** 系统输出对应普通文本

#### Scenario: Reject malformed escaped content
- **WHEN** 用户输入包含非法 JSON 转义序列或不完整 Unicode 转义的内容
- **THEN** 系统不显示旧结果，并提供可理解的中文错误反馈

### Requirement: Local-only JSON processing
系统 SHALL 仅在当前页面会话中保存 JSON 输入、输出、树状态和转义内容。系统 SHALL 不因格式化、树状显示、复制、转义或去除转义而发起网络请求、写入浏览器持久化存储或记录用户输入。

#### Scenario: Process JSON locally
- **WHEN** 用户格式化、压缩、查看树状 JSON、复制节点、转义或去除转义
- **THEN** 全部操作在浏览器本地完成，输入和输出不被上传或持久化
