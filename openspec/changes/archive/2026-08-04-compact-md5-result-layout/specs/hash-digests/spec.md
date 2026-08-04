## ADDED Requirements

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
