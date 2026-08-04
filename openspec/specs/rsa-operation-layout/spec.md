# rsa-operation-layout Specification

## Purpose

规范 RSA 公钥加密与私钥解密输入区域的视觉对齐和长度信息展示，使用户能够清楚关联明文字段与字节限制，并在桌面及窄屏布局中获得稳定、无重叠的输入体验。

## Requirements

### Requirement: Aligned RSA encryption fields
系统 SHALL 在 RSA“公钥加密 / 私钥解密”区域以成对字段展示“明文”和“Base64 密文”，并 SHALL 在桌面双列布局中使两个输入框的顶部与底部对齐。

#### Scenario: View encryption fields in desktop layout
- **WHEN** 用户在足以展示双列字段的桌面视口打开 RSA 工具
- **THEN** “明文”和“Base64 密文”输入框以相同高度呈现，且上下边缘分别对齐

#### Scenario: Enter or replace field content
- **WHEN** 用户编辑明文或 Base64 密文内容
- **THEN** 输入内容和动态字节计数不会破坏两个输入框的双列对齐

### Requirement: Plaintext byte count in field heading
系统 SHALL 将 RSA 明文字节计数展示在“明文”标签同一行的右侧，并 SHALL 使计数的右边缘与明文输入框的右边缘对齐；系统 MUST NOT 再为该计数占用输入框下方的提示行。

#### Scenario: View plaintext byte count
- **WHEN** 用户查看 RSA 明文字段
- **THEN** 系统在“明文”标签右侧显示“当前字节数 / 最大字节数 字节”，且输入框下方没有重复计数或由计数产生的空白提示行

#### Scenario: Update plaintext byte count
- **WHEN** 用户输入或删除 Unicode 明文
- **THEN** 标题行右侧的计数按 UTF-8 字节数实时更新

#### Scenario: Exceed plaintext limit
- **WHEN** 明文的 UTF-8 字节数超过当前 RSA 明文上限
- **THEN** 标题行右侧的字节计数显示危险状态，同时保留现有的加密禁用行为

### Requirement: Responsive field heading layout
系统 SHALL 在窄屏单列布局中完整显示明文标签、字节计数和输入框，不得产生文字重叠、裁切或页面级横向溢出。

#### Scenario: View encryption fields on a narrow screen
- **WHEN** 用户在 320px 或 390px 宽的视口打开 RSA 工具
- **THEN** 明文标签与字节计数保持清晰可读，两个字段按单列顺序展示且页面没有横向溢出
