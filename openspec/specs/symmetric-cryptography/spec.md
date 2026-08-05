# symmetric-cryptography Specification

## Purpose

提供浏览器本地的 AES、DES 与国密 SM4 加解密工具，通过明确的密钥、模式、填充和 IV 参数实现可复现的开发调试与遗留系统互操作。

## Requirements
### Requirement: Aligned symmetric text workspaces
系统 SHALL 为 AES、DES 和 SM4 使用左右对齐的明文/密文文本区域。两个区域 SHALL 使用一致的字段标题高度、文本框起点和默认框体高度；当前可编辑区域 SHALL 在文本框外的标题区域提供复制与删除图标，只读结果区域 SHALL 在对应位置提供复制图标。图标操作 SHALL 具有可访问名称、悬停说明、键盘焦点和固定反馈区域。

#### Scenario: View aligned input and result fields
- **WHEN** 用户在宽视口打开任一已启用的对称加密工具
- **THEN** 左右文本框的顶部和底部对齐，标题操作不会使其中一个文本框产生额外垂直偏移

#### Scenario: Copy either complete text value
- **WHEN** 用户激活可编辑输入或只读结果的复制图标
- **THEN** 系统复制对应区域当前未经截断的完整值，并在不移动文本框的固定区域显示成功或失败反馈

#### Scenario: Delete the editable text
- **WHEN** 用户激活可编辑区域的删除图标
- **THEN** 系统清空当前明文或密文输入，保留所选算法、模式、填充、编码、密钥和模式参数

#### Scenario: Stack aligned actions on a narrow viewport
- **WHEN** 用户在窄视口查看对称加密工具
- **THEN** 两个文本区域按输入后结果的顺序回流，复制与删除图标仍位于各自字段标题区域且可操作，页面不产生水平溢出

### Requirement: Symmetric algorithm tools
系统 SHALL 在“对称加密”分组内为运行时启用的 AES、DES、SM4 子工具分别提供入口，每个可用子工具 SHALL 同时提供加密和解密操作，并 SHALL 在工具页中明确显示当前算法。DES SHALL 使用关闭的内置默认值，且只有运行时工具配置显式开启后才可从工具目录访问。

#### Scenario: Select an enabled symmetric algorithm
- **WHEN** 用户从导航选择当前已启用的 AES、DES 或 SM4
- **THEN** 系统显示所选算法的加解密界面和与该算法兼容的参数选项

#### Scenario: Use the default symmetric tool set
- **WHEN** 应用使用内置工具可用性默认值启动
- **THEN** 对称加密分组提供 AES 与 SM4，不显示或挂载 DES

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
系统 SHALL 允许用户选择当前算法实现支持的加密模式和填充模式，且至少提供 AES-ECB、AES-CBC、AES-CTR、AES-GCM，DES-ECB、DES-CBC，SM4-ECB、SM4-CBC；ECB 与 CBC 分组模式 SHALL 提供 PKCS#7 和无填充选项，流式或认证模式 SHALL 只显示或强制使用兼容的无填充行为。

#### Scenario: Configure a block mode
- **WHEN** 用户为 AES-ECB、AES-CBC、DES-ECB、DES-CBC、SM4-ECB 或 SM4-CBC 选择 PKCS#7 或无填充
- **THEN** 系统保留该兼容组合，并在无填充输入未按分组长度对齐时阻止操作并解释原因

#### Scenario: Select AES ECB
- **WHEN** 用户在 AES 工具中选择 ECB
- **THEN** 系统允许使用有效 AES 密钥及 PKCS#7 或无填充完成加解密，且不要求或使用 IV

#### Scenario: Select a mode with fixed padding behavior
- **WHEN** 用户选择 AES-CTR 或 AES-GCM
- **THEN** 系统不允许选择不适用于该模式的分组填充

#### Scenario: Change to a mode incompatible with the current parameters
- **WHEN** 用户切换算法或模式导致当前填充或其他参数不兼容
- **THEN** 系统将参数调整为明确显示的兼容值或要求用户重新选择，且不以隐藏参数执行操作

### Requirement: IV, counter, and nonce parameters
系统 SHALL 根据模式显示并验证对应的 IV/偏移量、计数器或 nonce 输入；CBC SHALL 要求一个分组长度的 IV，CTR SHALL 要求有效计数器，GCM SHALL 要求 nonce；ECB SHALL 不使用 IV。二进制参数 SHALL 支持 HEX 和 Base64 编码选择。对于不使用模式参数的 ECB，系统 SHALL 保留与其他模式一致的参数栏位置，以禁用的普通参数控件表达不可用状态，且 SHALL NOT 使用彩色提示框替换该控件。

#### Scenario: Supply a CBC IV
- **WHEN** 用户选择 CBC 并提供所选编码下可解码且长度等于算法分组大小的 IV
- **THEN** 系统使用该 IV 执行操作

#### Scenario: Use ECB mode
- **WHEN** 用户选择 AES-ECB、DES-ECB 或 SM4-ECB
- **THEN** 偏移量输入不参与操作，参数输入显示为禁用且为空，页面不显示“无需偏移量”彩色提示框

#### Scenario: Keep the parameter layout aligned
- **WHEN** 用户在需要模式参数和不需要模式参数的模式之间切换
- **THEN** 参数设置区域保持稳定对齐，禁用状态不会改变相邻密钥与密文格式控件的垂直位置

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
系统 MUST 在浏览器本地完成所有对称密码操作且不得传输明文、密文、密钥或模式参数；当 DES 通过运行时配置启用时，DES 工具 SHALL 明确提示 DES 已不适合保护新数据，仅用于兼容旧系统。

#### Scenario: Perform cryptography without network transmission
- **WHEN** 用户执行任意 AES、DES 或 SM4 加解密操作
- **THEN** 操作在当前浏览器会话内完成，应用不因该操作发起网络请求

#### Scenario: Open an enabled DES tool
- **WHEN** 部署配置已启用 DES 且用户查看 DES 加解密工具
- **THEN** 界面显示 DES 安全性不足及避免用于新系统的提示
