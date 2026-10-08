# json-tool Specification

## Purpose

为开发者提供完全在浏览器本地运行的中文 JSON 工具，用于在同一个窗口中完成 JSON 格式化、压缩、右侧树形查看、任意层级折叠、局部复制、JSON 字符串转义和去除转义，方便调试接口响应、配置片段、日志载荷和嵌套 JSON 字段。

## Requirements

### Requirement: Chinese JSON tool interface
系统 SHALL 为 JSON 工具提供中文界面文案，包括页面标题、说明、输入标签、按钮、状态反馈、错误提示和树节点操作。系统 SHALL 通过页面说明及工具箱全局隐私信息传达本地处理原则，而 SHALL NOT 在 JSON 页面顶部显示独立的彩色“本地处理”提示。

#### Scenario: View the JSON tool in Chinese
- **WHEN** 用户打开 `JSON` 工具
- **THEN** 页面主要可见文案使用中文说明 JSON 格式化、压缩、树状查看、复制、转义和去除转义操作
- **AND** 页面顶部不显示独立的彩色“本地处理”提示

### Requirement: Single-window JSON formatting workspace
系统 SHALL 在同一个 JSON 工具工作区内提供一个统一输入框，并 SHALL 在该输入框下方同时提供格式化、压缩、转义、去除转义和清空操作。系统 SHALL NOT 要求用户切换 JSON 模式或进入独立的转义输入、输出页面。宽视口下，系统 SHALL 将文本工作区放在左侧，将树形结构放在右侧，并 SHALL 让两个区域使用匹配的可用高度和各自的内部滚动；当桌面视口具备足够宽度和高度时，系统 SHALL 将 JSON 工具外层约束在当前视口内且不产生文档级纵向滚动。窄视口或可用高度不足时，系统 SHALL 以可访问的自然文档流展示内容并允许文档滚动。转换、复制和错误反馈 SHALL 共用一个不会引起主要控件位置移动的稳定反馈区域。

#### Scenario: Format and inspect in one workspace
- **WHEN** 用户输入有效 JSON 并执行格式化
- **THEN** 系统在同一个窗口中同时显示被格式化替换后的输入内容和树形结构

#### Scenario: Access every transformation without switching modes
- **WHEN** 用户打开 JSON 工具
- **THEN** 格式化、压缩、转义、去除转义和清空操作均位于统一输入框下方
- **AND** 页面不显示 JSON 模式选择或独立的转义输入、输出工作区

#### Scenario: Show the tree on the right side
- **WHEN** 用户在宽视口中查看 JSON 工具页面
- **THEN** JSON 输入位于左侧工作区，树形结构位于右侧工作区，两个区域使用匹配的可用高度

#### Scenario: Keep the desktop JSON page within one viewport
- **WHEN** 用户在受支持浏览器中以至少 1280×768 的桌面视口打开 JSON 工具，且页面没有需要额外空间的全局能力警告
- **THEN** 工具标题、统一输入框、树形区域、全部主要操作和全局页脚均位于当前视口内
- **AND** 页面外层不产生文档级纵向滚动
- **AND** 超出可用高度的输入或树内容分别在所属区域内部滚动

#### Scenario: Keep feedback layout stable
- **WHEN** 系统显示转换、复制成功或错误反馈
- **THEN** 反馈在统一的稳定区域内更新，且不会增加重复反馈行或移动输入框和主要操作

#### Scenario: Stack the same workspace on a narrow viewport
- **WHEN** 用户在窄视口中查看 JSON 工具页面
- **THEN** 输入、操作和树形结构按可访问顺序纵向展示，且所有操作保持可用

#### Scenario: Restore document scrolling when the viewport cannot safely contain the workspace
- **WHEN** 视口宽度或高度低于 JSON 聚焦布局要求，或者页面显示需要额外空间的全局能力警告
- **THEN** 系统允许文档级纵向滚动
- **AND** 工具标题、输入、全部主要操作、树形区域、反馈和全局提示不会因外层溢出限制而被裁切或变得不可访问

### Requirement: Strict JSON formatting and minification
系统 SHALL 接受标准 JSON 输入并严格解析。格式化成功时，系统 SHALL 使用两空格缩进的格式化 JSON 替换当前输入框内容；压缩成功时，系统 SHALL 使用无多余空白的紧凑 JSON 替换当前输入框内容。两种操作均 SHALL 使用同一次解析结果更新右侧树形结构。系统 SHALL 拒绝注释、尾随逗号、未加引号的对象键和其他非标准 JSON 语法，并 SHALL 在解析失败时清除旧树形结果而不以部分结果替换输入。

#### Scenario: Format compact JSON
- **WHEN** 用户输入紧凑形式的有效 JSON 并执行格式化
- **THEN** 系统以两空格缩进、换行稳定的格式化 JSON 替换输入框内容
- **AND** 系统按同一解析结果更新树形结构

#### Scenario: Minify formatted JSON
- **WHEN** 用户输入包含空白和换行的有效 JSON 并执行压缩
- **THEN** 系统以不包含多余空白且语义等价的紧凑 JSON 替换输入框内容
- **AND** 系统按同一解析结果更新树形结构

#### Scenario: Reject invalid JSON
- **WHEN** 用户对无效 JSON、非标准 JSON 或无法解析的内容执行格式化或压缩
- **THEN** 系统不以部分结果替换输入，清除旧树形结果，并提供中文错误反馈供用户修正

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
系统 SHALL 让右侧 JSON 树保持紧凑的代码式视觉密度。树节点主行高度 SHALL 由树文本字号和行高决定；每个可复制节点 SHALL 使用具有可访问名称的图标复制控件，且 SHALL NOT 显示可见的“复制”按钮文字。隐藏复制控件、折叠按钮、复制反馈、状态提示或占位元素 SHALL NOT 为每个节点额外增加可见行距。复制反馈 SHALL 不改变树节点的层级布局或节点间距。

#### Scenario: Render compact rows for a large JSON tree
- **WHEN** 用户格式化包含多层对象和数组的较大 JSON
- **THEN** 右侧树节点行距保持紧凑，节点之间不会因为不可见复制图标、反馈行或占位元素出现额外空白

#### Scenario: Reveal an accessible node copy icon
- **WHEN** 用户悬停树节点或通过键盘聚焦该节点的复制操作
- **THEN** 系统显示可识别复制目标的图标按钮，且按钮不包含可见的“复制”文字

#### Scenario: Copy feedback does not expand tree rows
- **WHEN** 用户复制任意树节点
- **THEN** 系统显示复制反馈，但树节点主行高度和相邻节点间距保持不变

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

### Requirement: JSON string escaping and unescaping
系统 SHALL 在统一输入框下方提供 JSON 字符串转义和去除转义操作。转义成功时，系统 SHALL 将当前输入转换为可嵌入 JSON 字符串的转义内容且不包含外层双引号，并 SHALL 用结果替换当前输入。去除转义成功时，系统 SHALL 接受完整 JSON 字符串字面量或不含外层引号的转义内容，还原普通文本并用结果替换当前输入。任一操作均 SHALL 清除旧树形结果；输入不是有效 JSON 字符串转义内容时 SHALL 保留当前输入、清除旧树形结果并显示中文错误。

#### Scenario: Escape plain text in place
- **WHEN** 用户在统一输入框中输入包含换行、双引号、反斜杠或 Unicode 字符的普通文本并执行转义
- **THEN** 系统以可放入 JSON 字符串值中的转义内容替换当前输入
- **AND** 系统清除旧树形结果

#### Scenario: Unescape quoted JSON string in place
- **WHEN** 用户在统一输入框中输入有效的完整 JSON 字符串字面量并执行去除转义
- **THEN** 系统以该字符串字面量表示的普通文本替换当前输入
- **AND** 系统清除旧树形结果

#### Scenario: Unescape raw escaped content in place
- **WHEN** 用户在统一输入框中输入不含外层双引号但包含有效 JSON 转义序列的内容并执行去除转义
- **THEN** 系统以对应普通文本替换当前输入并清除旧树形结果

#### Scenario: Reject malformed escaped content
- **WHEN** 用户输入包含非法 JSON 转义序列或不完整 Unicode 转义的内容并执行去除转义
- **THEN** 系统保留当前输入、清除旧树形结果，并提供可理解的中文错误反馈

### Requirement: Local-only JSON processing
系统 SHALL 仅在当前页面会话中保存 JSON 输入、输出、树状态和转义内容。系统 SHALL 不因格式化、树状显示、复制、转义或去除转义而发起网络请求、写入浏览器持久化存储或记录用户输入。

#### Scenario: Process JSON locally
- **WHEN** 用户格式化、压缩、查看树状 JSON、复制节点、转义或去除转义
- **THEN** 全部操作在浏览器本地完成，输入和输出不被上传或持久化

### Requirement: Primary JSON input keyboard execution
The system SHALL allow users to execute JSON formatting from the unified editable JSON input by pressing `Ctrl+Enter`. Keyboard execution SHALL use the current input and SHALL produce the same formatted text, tree result, validation, and status feedback as activating the primary “格式化 JSON” button. Plain Enter SHALL remain available for multiline editing, and the shortcut SHALL NOT invoke compression, escaping, or unescaping.

#### Scenario: Format JSON from the unified input
- **WHEN** keyboard focus is in the unified JSON input and the user presses `Ctrl+Enter` while text composition is inactive
- **THEN** the system executes JSON formatting once for the current input and keeps keyboard focus in that input

#### Scenario: Preserve JSON multiline editing
- **WHEN** keyboard focus is in the unified JSON input and the user presses Enter without Control
- **THEN** the system preserves normal line-break editing and does not execute a JSON operation

#### Scenario: Ignore composing or repeated JSON execution
- **WHEN** an input method editor is composing text or the Enter keydown is an automatic repeat while the user presses `Ctrl+Enter` in the unified JSON input
- **THEN** the system does not execute a JSON operation or interrupt text editing

#### Scenario: Report invalid shortcut input consistently
- **WHEN** the unified JSON input contains invalid JSON and the user presses `Ctrl+Enter`
- **THEN** the system preserves the malformed input, clears any stale tree result, and shows the same validation feedback as the “格式化 JSON” button
