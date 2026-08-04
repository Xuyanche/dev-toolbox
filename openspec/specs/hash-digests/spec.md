# hash-digests Specification

## Purpose

为开发者提供一致的文本摘要计算界面，清晰展示 MD5 与 SHA-1 的十六进制结果，同时避免用户误认为这些旧算法适合安全用途。

## Requirements

### Requirement: MD5 digest variants
系统 SHALL 对输入文本的 UTF-8 字节计算 MD5 摘要，并 SHALL 同时展示完整的 32 字符小写和大写十六进制结果。

#### Scenario: Calculate an MD5 digest
- **WHEN** 用户输入任意 Unicode 文本并选择 MD5 计算
- **THEN** 系统显示内容相同但字母大小写不同的 32 字符小写与大写十六进制摘要

#### Scenario: Calculate an empty-text MD5 digest
- **WHEN** 用户以空文本执行 MD5 计算
- **THEN** 系统将空的 UTF-8 字节序列视为有效输入并输出其 MD5 摘要

### Requirement: Compact MD5 result presentation
系统 SHALL 在一次 MD5 计算后，于一个紧凑结果组中从上到下展示小写摘要和大写摘要两行。每行 SHALL 将摘要类型标签、完整的 32 位摘要内容框以及位于内容框右端的复制图标按钮布置在同一水平行；复制按钮 SHALL 具有可访问名称，且 SHALL 不显示可见的按钮文字。

#### Scenario: Display both MD5 variants in compact rows
- **WHEN** 用户计算任意文本的 MD5
- **THEN** 系统在同一个紧凑结果组中按“小写摘要”“大写摘要”的顺序展示两行完整的 32 位结果
- **AND** 每行的标签、摘要内容框和内容框右端的复制图标按钮保持水平对齐

#### Scenario: Copy a complete MD5 digest with an icon control
- **WHEN** 用户激活任一 MD5 摘要行右端的复制图标按钮
- **THEN** 系统复制该行未经截断的完整摘要
- **AND** 系统提供不会引起摘要行位置移动的成功或失败反馈
- **AND** 复制按钮可通过键盘操作及其可访问名称识别

#### Scenario: Preserve compact MD5 rows on a narrow viewport
- **WHEN** 用户在窄视口查看 MD5 结果
- **THEN** 两条摘要行保持可读和可操作，完整摘要可以安全换行或收缩且不会产生水平页面溢出
- **AND** 复制图标仍位于对应摘要内容框的右端

#### Scenario: Preserve existing MD5 result behavior
- **WHEN** 用户计算空文本、重新计算其他文本或执行清空全部
- **THEN** 系统分别保持现有的空文本摘要、结果替换和清空行为
- **AND** MD5 旧算法警告与本地处理语义保持不变

### Requirement: SHA digest batch
系统 SHALL 对同一输入文本的 UTF-8 字节同时计算 SHA-1、SHA-256、SHA-384、SHA-512 摘要，并 SHALL 为每种算法展示完整的小写和大写十六进制结果，长度依次为 40、64、96、128 个字符。

#### Scenario: Calculate all SHA digests
- **WHEN** 用户输入任意 Unicode 文本并在 SHA 工具中执行计算
- **THEN** 系统在同一批结果中展示 SHA-1、SHA-256、SHA-384、SHA-512 四个算法的大小写十六进制摘要

#### Scenario: Calculate SHA digests for empty text
- **WHEN** 用户以空文本执行 SHA 计算
- **THEN** 系统将空的 UTF-8 字节序列视为有效输入并输出四种 SHA 摘要

#### Scenario: Replace a SHA result batch
- **WHEN** 用户修改输入并再次执行 SHA 计算
- **THEN** 系统整体替换上一批四种 SHA 结果，不混合展示不同输入产生的摘要

### Requirement: SHA result actions
系统 SHALL 为每种 SHA 算法的每个大小写结果提供独立复制操作，并 SHALL 提供一次清空操作同时移除 SHA 输入、全部摘要结果和瞬时反馈。

#### Scenario: Copy one SHA result
- **WHEN** 用户选择复制某个算法的某个大小写结果
- **THEN** 系统只将对应的完整十六进制摘要写入剪贴板并保留其他结果

#### Scenario: Clear the SHA tool
- **WHEN** 用户在 SHA 工具中执行清空
- **THEN** 系统清除输入、四种算法的全部结果及瞬时状态

### Requirement: Compact vertical SHA result presentation
系统 SHALL 按 SHA-1、SHA-256、SHA-384、SHA-512 的固定顺序将四种算法从上到下单列排列。每种算法 SHALL 使用紧凑结果组，并 SHALL 将每条“小写摘要”或“大写摘要”标签、完整摘要内容框以及位于内容框右端的复制图标按钮布置在同一水平行。复制图标按钮 SHALL 具有可访问名称，且 SHALL 不以可见文字代替图标。

#### Scenario: View the ordered SHA result groups
- **WHEN** 用户在桌面视口计算 SHA 摘要
- **THEN** 系统从上到下依次显示 SHA-1、SHA-256、SHA-384、SHA-512，且不将算法结果并排分列

#### Scenario: Copy from an integrated result row
- **WHEN** 用户查看任一算法的某条大小写摘要结果
- **THEN** 该行同时显示变体标签、完整摘要内容以及内容框右端的复制图标按钮，并可通过辅助技术识别复制目标

#### Scenario: View compact results on a narrow viewport
- **WHEN** 用户在窄视口查看四种 SHA 结果
- **THEN** 四种算法继续保持相同纵向顺序，长摘要在内容框内安全换行，标签与复制图标仍可操作且页面不产生水平溢出

### Requirement: Legacy algorithm warning
系统 SHALL 在 MD5 工具中持续提示 MD5 不适用于密码存储、数字签名或需要抗碰撞性的安全场景；系统 SHALL 在 SHA 工具中明确提示 SHA-1 已不适用于抗碰撞安全用途，并 SHALL 说明 SHA-2 摘要不应直接用于密码存储。

#### Scenario: View the MD5 tool
- **WHEN** 用户打开 MD5 工具
- **THEN** 系统在执行计算前即可看到 MD5 的安全局限提示

#### Scenario: View the SHA tool
- **WHEN** 用户打开 SHA 工具
- **THEN** 系统在执行计算前即可区分 SHA-1 的遗留风险和 SHA-2 不适合直接存储密码的限制
