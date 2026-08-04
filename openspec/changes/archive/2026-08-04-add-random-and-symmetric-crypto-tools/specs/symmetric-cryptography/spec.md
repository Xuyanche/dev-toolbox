## Purpose

提供浏览器本地的 AES、DES 与国密 SM4 加解密工具，通过明确的密钥、模式、填充和 IV 参数实现可复现的开发调试与遗留系统互操作。

## ADDED Requirements

### Requirement: Symmetric algorithm tools
系统 SHALL 在“对称加密”分组内分别提供 AES、DES、SM4 子工具，每个子工具 SHALL 同时提供加密和解密操作，并 SHALL 在工具页中明确显示当前算法。

#### Scenario: Select a symmetric algorithm
- **WHEN** 用户从导航选择 AES、DES 或 SM4
- **THEN** 系统显示所选算法的加解密界面和与该算法兼容的参数选项

### Requirement: Encoded key input
系统 SHALL 允许用户明确选择以 HEX 或 Base64 格式输入密钥，解码后 SHALL 根据当前算法验证密钥字节长度：AES 为 16、24 或 32 字节，DES 为 8 字节，SM4 为 16 字节。

#### Scenario: Use a valid encoded key
- **WHEN** 用户选择 HEX 或 Base64 并输入解码后长度符合当前算法的密钥
- **THEN** 系统接受该密钥用于加密或解密

#### Scenario: Reject malformed key encoding
- **WHEN** 密钥不是所选 HEX 或 Base64 格式的有效完整编码
- **THEN** 系统显示密钥格式错误且不执行密码操作

#### Scenario: Reject an invalid key length
- **WHEN** 密钥能够解码但字节长度不符合当前算法
- **THEN** 系统显示当前算法允许的密钥长度且不执行密码操作

### Requirement: Compatible modes and padding
系统 SHALL 允许用户选择当前算法实现支持的加密模式和填充模式，且至少提供 AES-CBC、AES-CTR、AES-GCM，DES-ECB、DES-CBC，SM4-ECB、SM4-CBC；分组模式 SHALL 提供 PKCS#7 和无填充选项，流式或认证模式 SHALL 只显示或强制使用兼容的无填充行为。

#### Scenario: Configure a block mode
- **WHEN** 用户为 AES-CBC、DES-CBC 或 SM4-CBC 选择 PKCS#7 或无填充
- **THEN** 系统保留该兼容组合，并在无填充输入未按分组长度对齐时阻止操作并解释原因

#### Scenario: Select a mode with fixed padding behavior
- **WHEN** 用户选择 AES-CTR 或 AES-GCM
- **THEN** 系统不允许选择不适用于该模式的分组填充

#### Scenario: Change to a mode incompatible with the current parameters
- **WHEN** 用户切换算法或模式导致当前填充或其他参数不兼容
- **THEN** 系统将参数调整为明确显示的兼容值或要求用户重新选择，且不以隐藏参数执行操作

### Requirement: IV, counter, and nonce parameters
系统 SHALL 根据模式显示并验证对应的 IV/偏移量、计数器或 nonce 输入；CBC SHALL 要求一个分组长度的 IV，CTR SHALL 要求有效计数器，GCM SHALL 要求 nonce；ECB SHALL 不使用 IV。二进制参数 SHALL 支持 HEX 和 Base64 编码选择。

#### Scenario: Supply a CBC IV
- **WHEN** 用户选择 CBC 并提供所选编码下可解码且长度等于算法分组大小的 IV
- **THEN** 系统使用该 IV 执行操作

#### Scenario: Use ECB mode
- **WHEN** 用户选择 DES-ECB 或 SM4-ECB
- **THEN** IV 输入不参与操作，界面不要求用户提供 IV

#### Scenario: Reject a missing or invalid mode parameter
- **WHEN** 当前非 ECB 模式缺少必需参数或参数格式、长度不合法
- **THEN** 系统显示针对当前模式的错误且不执行操作

### Requirement: Encryption and decryption results
系统 SHALL 将文本明文按 UTF-8 处理，允许密文以 HEX 或 Base64 格式输出和输入，并 SHALL 使用用户明确选择的算法、模式、填充、密钥及模式参数产生结果。

#### Scenario: Encrypt and decrypt a supported payload
- **WHEN** 用户用一组有效参数加密 UTF-8 文本，再用相同参数解密生成的密文
- **THEN** 系统恢复原始文本并显示成功结果

#### Scenario: Reject malformed ciphertext
- **WHEN** 用户提交不符合所选 HEX 或 Base64 格式的密文进行解密
- **THEN** 系统显示密文格式错误且不执行解密

#### Scenario: Report decryption failure
- **WHEN** 密文可解码但密钥、IV、模式或填充不匹配而无法有效解密
- **THEN** 系统显示解密失败而不把未验证的内容呈现为成功明文

### Requirement: Local processing and legacy warning
系统 MUST 在浏览器本地完成所有对称密码操作且不得传输明文、密文、密钥或模式参数；DES 工具 SHALL 明确提示 DES 已不适合保护新数据，仅用于兼容旧系统。

#### Scenario: Perform cryptography without network transmission
- **WHEN** 用户执行任意 AES、DES 或 SM4 加解密操作
- **THEN** 操作在当前浏览器会话内完成，应用不因该操作发起网络请求

#### Scenario: Open the DES tool
- **WHEN** 用户查看 DES 加解密工具
- **THEN** 界面显示 DES 安全性不足及避免用于新系统的提示

