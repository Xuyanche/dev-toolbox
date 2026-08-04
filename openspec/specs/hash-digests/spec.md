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

### Requirement: SHA-1 digest variants
系统 SHALL 对输入文本的 UTF-8 字节计算 SHA-1 摘要，并 SHALL 同时展示完整的 40 字符小写和大写十六进制结果。

#### Scenario: Calculate a SHA-1 digest
- **WHEN** 用户输入任意 Unicode 文本并选择 SHA-1 计算
- **THEN** 系统显示内容相同但字母大小写不同的 40 字符小写与大写十六进制摘要

### Requirement: Legacy algorithm warning
系统 SHALL 在 MD5 和 SHA-1 工具中持续显示安全提示，说明这些算法不适用于密码存储、数字签名或需要抗碰撞性的安全场景。

#### Scenario: View a legacy hash tool
- **WHEN** 用户打开 MD5 或 SHA-1 工具
- **THEN** 系统在执行计算前即可看到算法安全局限提示

