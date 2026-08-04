# rsa-cryptography Specification

## Purpose

为开发者提供基于现代参数的浏览器本地 RSA 演示与实用操作，包括密钥管理、短文本加解密以及消息签名和验签。

## Requirements

### Requirement: RSA key-pair generation
系统 SHALL 在浏览器本地生成 2048 位 RSA 密钥对，并 SHALL 将公钥和私钥分别提供为可复制的 PEM 文本。

#### Scenario: Generate a key pair
- **WHEN** 用户请求生成 RSA 密钥对
- **THEN** 系统生成匹配的 2048 位公私钥并分别显示 PEM 格式结果

### Requirement: PEM key import
系统 SHALL 接受兼容操作所需的 PEM 公钥和私钥，并 SHALL 在密钥格式、类型或算法不兼容时拒绝导入并显示错误。

#### Scenario: Import compatible keys
- **WHEN** 用户粘贴有效且兼容的 PEM 公钥或私钥
- **THEN** 系统接受密钥并允许执行该密钥支持的 RSA 操作

#### Scenario: Reject an invalid key
- **WHEN** 用户粘贴格式错误、类型不符或算法不兼容的 PEM 密钥
- **THEN** 系统显示明确错误且不启用依赖该密钥的操作

### Requirement: RSA-OAEP encryption and decryption
系统 SHALL 使用 RSA-OAEP 与 SHA-256，以公钥加密 UTF-8 短文本并以匹配私钥解密；密文 SHALL 以 Base64 文本展示。

#### Scenario: Encrypt and decrypt short text
- **WHEN** 用户使用公钥加密长度允许的 Unicode 文本，再使用匹配私钥解密所得密文
- **THEN** 系统恢复与原始输入完全一致的文本

#### Scenario: Reject oversized plaintext
- **WHEN** 输入文本的 UTF-8 字节数超过当前 RSA 密钥和填充参数允许的最大值
- **THEN** 系统在加密前说明长度限制且不尝试生成密文

#### Scenario: Reject invalid ciphertext
- **WHEN** 用户尝试解密无效 Base64、长度错误或与私钥不匹配的密文
- **THEN** 系统显示解密失败且不输出部分明文

### Requirement: RSA-PSS signing and verification
系统 SHALL 使用 RSA-PSS、SHA-256 和 32 字节盐值对 UTF-8 文本签名和验签，并 SHALL 以 Base64 文本展示签名。

#### Scenario: Sign and verify a message
- **WHEN** 用户使用私钥签名文本并以匹配公钥验证未修改的文本和签名
- **THEN** 系统显示验签成功

#### Scenario: Detect a modified message
- **WHEN** 用户验证的文本或签名与原始签名内容不同
- **THEN** 系统显示验签失败而不将其作为运行错误隐藏

### Requirement: RSA safety guidance
系统 SHALL 说明 RSA 工具只适合短文本操作，并 SHALL 提示用户不要把展示或粘贴的私钥视为已受安全存储保护。

#### Scenario: View the RSA tool
- **WHEN** 用户打开 RSA 工具
- **THEN** 系统在操作区域显示明文长度和私钥处理提示

