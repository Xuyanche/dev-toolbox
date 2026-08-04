## Purpose

为开发者提供可预测的 Base64 与 URL 文本编解码能力，明确字符集和编码语义，并在输入无效时给出可操作的反馈。

## ADDED Requirements

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

