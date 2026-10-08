# text-encoding Specification

## Purpose

为开发者提供可预测的 Base64 与 URL 文本编解码能力，明确字符集和编码语义，并在输入无效时给出可操作的反馈。

## Requirements

### Requirement: UTF-8 Base64 encoding
系统 SHALL 将用户输入的 Unicode 文本按 UTF-8 字节编码为标准 Base64 文本。

#### Scenario: Encode Unicode text
- **WHEN** 用户输入包含中文或其他 Unicode 字符的文本并执行 Base64 编码
- **THEN** 系统输出对其 UTF-8 字节进行编码所得的标准 Base64 文本

### Requirement: UTF-8 Base64 decoding
系统 SHALL 将有效的标准 Base64 输入解码为 UTF-8 文本，并 SHALL 拒绝无效 Base64 或无法构成有效 UTF-8 文本的输入。

#### Scenario: Decode valid Base64
- **WHEN** 用户输入表示有效 UTF-8 字节的标准 Base64 文本并执行解码
- **THEN** 系统输出原始 Unicode 文本

#### Scenario: Reject invalid Base64
- **WHEN** 用户输入包含非法字符、错误填充或不能解码为有效 UTF-8 的 Base64 文本
- **THEN** 系统显示明确错误且不输出误导性的部分结果

### Requirement: URL encoding modes
系统 SHALL 提供“URL 组件”和“完整 URL”两种编码模式，并 SHALL 分别保留符合对应语义的字符。

#### Scenario: Encode a URL component
- **WHEN** 用户选择 URL 组件模式并编码包含空格、斜杠或非 ASCII 字符的文本
- **THEN** 系统按 URL 组件语义输出百分号编码结果

#### Scenario: Encode a complete URL
- **WHEN** 用户选择完整 URL 模式并编码一个包含协议、路径、查询参数和非 ASCII 字符的 URL
- **THEN** 系统保留 URL 结构分隔符并编码需要转义的字符

### Requirement: URL decoding
系统 SHALL 按用户选择的 URL 组件或完整 URL 模式解码百分号编码文本，并 SHALL 对非法转义序列给出错误。

#### Scenario: Decode percent-encoded text
- **WHEN** 用户输入有效的百分号编码文本并执行 URL 解码
- **THEN** 系统按选定模式输出解码后的 Unicode 文本

#### Scenario: Reject malformed escape sequence
- **WHEN** 用户输入包含不完整或非十六进制的百分号转义序列
- **THEN** 系统显示明确错误且保留原始输入供用户修正

### Requirement: Unicode escape encoding
系统 SHALL 将输入文本的每个 UTF-16 代码单元编码为一个使用反斜杠、小写 `u`、四位大写十六进制数字组成的 `\uXXXX` 转义序列；基本多文种平面之外的字符 SHALL 编码为一对按高代理项、低代理项排列的 `\uXXXX` 序列。

#### Scenario: Encode BMP text
- **WHEN** 用户在 Unicode 工具中输入 `A中` 并执行编码
- **THEN** 系统输出 `\u0041\u4E2D`

#### Scenario: Encode a supplementary character
- **WHEN** 用户输入字符 `👋` 并执行 Unicode 编码
- **THEN** 系统输出 JavaScript/JSON 兼容的代理对 `\uD83D\uDC4B`

#### Scenario: Encode empty input
- **WHEN** 用户以空输入执行 Unicode 编码
- **THEN** 系统成功输出空文本且不显示错误

### Requirement: Unicode escape decoding and validation
系统 SHALL 将大小写十六进制均有效的 `\uXXXX` 序列解码为普通文本，SHALL 保留混合输入中不属于 Unicode 转义序列的普通文本，并 SHALL 拒绝不完整、包含非十六进制数字或代理项不成对的 Unicode 转义输入。失败时系统 SHALL 清除旧输出、保留原始输入并显示可理解的中文错误。

#### Scenario: Decode Unicode escapes
- **WHEN** 用户输入 `\u0041\u4E2D\uD83D\uDC4B` 并执行解码
- **THEN** 系统输出 `A中👋`

#### Scenario: Decode mixed plain and escaped text
- **WHEN** 用户输入 `Hello, \u4E16\u754C` 并执行解码
- **THEN** 系统输出 `Hello, 世界`

#### Scenario: Accept lowercase hexadecimal digits
- **WHEN** 用户输入 `\u4e2d\u6587` 并执行解码
- **THEN** 系统输出 `中文`

#### Scenario: Reject malformed Unicode escape
- **WHEN** 用户输入不完整的 `\u12` 或包含非十六进制数字的 `\uZZZZ` 并执行解码
- **THEN** 系统不显示转换结果、保留原始输入并提示 Unicode 转义格式无效

#### Scenario: Reject unpaired surrogate
- **WHEN** 用户输入孤立高代理项 `\uD83D` 或孤立低代理项 `\uDC4B` 并执行解码
- **THEN** 系统不显示转换结果、保留原始输入并提示代理项必须成对出现

### Requirement: Consistent Unicode conversion workspace
系统 SHALL 为 Unicode 编解码提供与 Base64 工具相同的响应式页面结构和操作流程，包括编码/解码选择、左右输入输出区域、开始转换、交换、复制结果、清空及状态反馈；Unicode 工具状态 SHALL 与其他工具相互独立，且转换 SHALL 完全在浏览器本地完成。

#### Scenario: Use Unicode conversion on desktop
- **WHEN** 用户在桌面视口打开 Unicode 工具
- **THEN** 系统以与 Base64 工具一致的双列结构展示输入和输出，并提供相同类型的结果操作

#### Scenario: Use Unicode conversion on a narrow viewport
- **WHEN** 用户在窄视口打开 Unicode 工具
- **THEN** 输入、输出、主要操作和反馈按可读顺序呈现且页面无需横向滚动

#### Scenario: Swap a Unicode result
- **WHEN** 用户完成一次 Unicode 转换并激活交换操作
- **THEN** 系统交换输入与输出、切换编码/解码方向并保留可继续执行的内容

#### Scenario: Process Unicode locally
- **WHEN** 用户编码、解码、交换、复制或清空 Unicode 内容
- **THEN** 系统不上传输入或结果，也不将其写入浏览器持久化存储

### Requirement: Primary encoding input keyboard execution
The system SHALL allow users to execute the currently selected encode or decode operation from the primary editable input of the URL, Unicode, and Base64 tools by pressing `Ctrl+Enter`. The keyboard-triggered operation SHALL use the current direction and options and SHALL produce the same result, validation, and status feedback as activating the primary action button.

#### Scenario: Execute an encoding operation from the primary input
- **WHEN** keyboard focus is in the primary editable input of the URL, Unicode, or Base64 tool and the user presses `Ctrl+Enter` while text composition is inactive
- **THEN** the system executes that tool's currently selected encode or decode operation once using the current input and settings

#### Scenario: Preserve multiline editing
- **WHEN** keyboard focus is in an encoding tool's primary multiline input and the user presses Enter without Control
- **THEN** the system preserves the normal line-break editing behavior and does not execute the operation

#### Scenario: Ignore a shortcut during text composition
- **WHEN** an input method editor is composing text in an encoding tool's primary input and the user presses `Ctrl+Enter`
- **THEN** the system does not execute the operation or interrupt the composition
