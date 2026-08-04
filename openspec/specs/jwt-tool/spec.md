# jwt-tool Specification

## Purpose

为开发与调试场景提供完全在浏览器本地运行的 JWT 解析、签名校验和生成功能，使用户能清楚区分可读内容与可信内容，并安全处理令牌和 Secret。

## Requirements

### Requirement: Strict JWT parsing and claims display
系统 SHALL 仅将恰好包含三个以句点分隔片段、使用合法无填充 Base64URL 编码且 Header 与 Payload 均为 UTF-8 JSON 对象的输入解析为 JWT。解析成功后，系统 SHALL 分别展示完整 Header、完整 Claims/Payload，并 SHALL 在存在时摘要展示 `iss`、`sub`、`aud`、`exp`、`nbf`、`iat` 和 `jti` 等注册 Claim，且不得从完整 Payload 中丢弃未知或自定义 Claim。

#### Scenario: Parse a valid token
- **WHEN** 用户提交一个结构和编码均合法、Header 与 Payload 均为 JSON 对象的三段式 JWT
- **THEN** 系统展示格式化后的完整 Header、完整 Claims/Payload，以及令牌中存在的常见注册 Claim 摘要

#### Scenario: Preserve custom claims
- **WHEN** 合法 JWT 的 Payload 包含系统未专门摘要展示的自定义 Claim
- **THEN** 自定义 Claim 仍完整出现在 Payload 展示中

#### Scenario: Reject malformed token input
- **WHEN** 输入不是三段式 JWT、包含非法 Base64URL、无法按 UTF-8 解码、包含无效 JSON，或 Header/Payload 不是 JSON 对象
- **THEN** 系统不展示部分解析结果，清除此前解析结果并给出可理解且不包含 Secret 的错误信息

### Requirement: Explicit signature trust status
系统 SHALL 将内容解析与签名信任分开呈现。未提供 Secret 时，系统 SHALL 将带签名令牌标记为“未校验”，不得暗示其内容可信；提供 Secret 时，系统 SHALL 按 Header 的 `alg` 值仅校验 HS256、HS384 或 HS512 HMAC 签名，并 SHALL 将结果明确标记为“有效”或“无效”。Secret SHALL 被视为用户输入的 UTF-8 文本，而不是自动作为 HEX 或 Base64 解码。

#### Scenario: Decode without a secret
- **WHEN** 用户解析一个带签名 JWT 但没有提供 Secret
- **THEN** 系统展示可解析内容并明确标记签名“未校验”，同时说明解码结果不代表内容可信

#### Scenario: Verify a valid supported signature
- **WHEN** 用户为采用 HS256、HS384 或 HS512 的 JWT 提供与签名匹配的 UTF-8 Secret
- **THEN** 系统按 Header 声明的算法校验原始签名输入并将签名状态标记为“有效”

#### Scenario: Report an invalid supported signature
- **WHEN** 用户为采用受支持 HMAC 算法的 JWT 提供不匹配的 Secret，或令牌的签名片段被篡改
- **THEN** 系统可继续展示解析内容，但将签名状态标记为“无效”并持续说明内容不可信

#### Scenario: Reject unsupported verification algorithm
- **WHEN** JWT Header 声明的 `alg` 不是 HS256、HS384 或 HS512 且也不是 `none`
- **THEN** 系统不尝试签名校验，并将状态明确标记为“不支持的算法”

#### Scenario: Handle an unsigned token
- **WHEN** JWT Header 声明 `alg` 为 `none` 且第三段为空
- **THEN** 系统将令牌标记为“无签名”并显示不应将其用于身份认证或授权的警告，提供 Secret 也不得使状态变为“有效”

### Requirement: Signed and unsigned JWT generation
系统 SHALL 接受一个 JSON 对象作为 Claims/Payload，并 SHALL 始终保留允许用户选择 HS256、HS384 或 HS512 的签名算法下拉框。生成模式 SHALL 在生成前显式展示格式化的只读 JWT Header：存在非空 UTF-8 Secret 时 Header SHALL 包含下拉框所选 `alg` 和 `typ: JWT`；Secret 为空时 Header SHALL 包含 `alg: none` 和 `typ: JWT`，但算法下拉框 SHALL 继续显示并保留用户所选 HMAC 算法。系统 SHALL 使用预览所示 Header 生成 JWT，最终令牌解码后的 Header MUST 与执行生成时的预览一致。Payload SHALL 保留用户输入的全部 Claim。Secret 为空时，系统 SHALL 仅生成第三段为空的未签名调试令牌，并在生成前后明确提示该令牌不安全；该警告 SHALL 不包含确认复选框或其他额外确认步骤，也不得阻止用户直接执行生成。

#### Scenario: Preview a signed JWT header
- **WHEN** 用户在生成模式输入非空 Secret 并从保留的算法下拉框选择 HS256、HS384 或 HS512
- **THEN** 系统在生成前显式展示包含所选 `alg` 与 `typ: JWT` 的格式化只读 Header

#### Scenario: Preview an unsigned JWT header without removing algorithm selection
- **WHEN** 用户在生成模式将 Secret 留空
- **THEN** 系统显式展示包含 `alg: none` 与 `typ: JWT` 的格式化只读 Header，同时继续显示算法下拉框并保留用户此前选择的 HMAC 算法

#### Scenario: Generate a signed token
- **WHEN** 用户输入合法 JSON 对象、非空 Secret，选择 HS256、HS384 或 HS512 并执行生成
- **THEN** 系统生成 Header 与执行生成时预览一致、可由本工具使用同一 Secret 验证为有效的三段式 JWT，并展示可复制的令牌

#### Scenario: Generate an unsigned debugging token
- **WHEN** 用户输入合法 JSON 对象、将 Secret 留空并直接执行生成
- **THEN** 系统生成 Header 与执行生成时预览一致、使用 `alg: none` 且空签名段的三段式 JWT，并以醒目状态标记其未签名且不安全

#### Scenario: Warn without requiring confirmation
- **WHEN** 生成模式的 Secret 为空
- **THEN** 系统显示无签名安全警告，但不显示确认复选框、不要求额外确认，并保持“生成 JWT”操作可直接使用

#### Scenario: Reject invalid claims JSON
- **WHEN** Claims/Payload 输入不是合法 JSON 或其顶层值不是对象
- **THEN** 系统不生成令牌并显示定位到 Payload 输入的可理解错误

### Requirement: Aligned generation layout and secret actions
系统 SHALL 在生成模式以明文文本直接显示 Secret，不得提供查看/隐藏切换操作。系统 SHALL 在原查看操作位置提供“清除 Secret”，并 SHALL 同时提供复制当前完整 Secret 和生成新 Secret 的操作；清除与复制操作在 Secret 为空时 SHALL 不可用。复制结果 SHALL 提供成功或失败反馈且反馈不得回显 Secret。在能够呈现双列生成表单的桌面视口中，Claims/Payload 输入区域与右侧 Header、算法及 Secret 设置列 SHALL 使用等宽两列、顶部对齐，并 SHALL 默认拉伸至两列底部视觉对齐；在窄视口中，两列 SHALL 按自然内容高度纵向堆叠且所有操作保持可访问。

#### Scenario: Display the generation secret as plain text
- **WHEN** 用户在生成模式输入或生成 Secret
- **THEN** Secret 字段直接以明文文本显示，且界面不提供查看或隐藏 Secret 的按钮

#### Scenario: Clear only the generation secret
- **WHEN** Secret 非空且用户激活原查看操作位置的“清除 Secret”
- **THEN** 系统只清空 Secret 和 Secret 复制反馈，不清除 Claims、算法选择或已有生成结果

#### Scenario: Copy a non-empty generation secret
- **WHEN** 生成 Secret 字段非空且用户激活复制 Secret
- **THEN** 系统将完整 Secret 写入剪贴板并显示不包含 Secret 内容的成功或失败反馈

#### Scenario: Disable secret copy when empty
- **WHEN** 生成 Secret 字段为空
- **THEN** 清除 Secret 和复制 Secret 操作均不可用

#### Scenario: Align generation columns on desktop
- **WHEN** 用户在能够显示双列生成表单的桌面视口打开生成模式
- **THEN** Claims/Payload 输入区域与右侧设置列以等宽双列呈现、顶部对齐，并默认拉伸使两列底部视觉对齐

#### Scenario: Stack generation fields on a narrow viewport
- **WHEN** 用户在窄视口打开生成模式
- **THEN** Claims/Payload 与右侧 Header、算法和 Secret 设置按自然内容高度纵向堆叠，查看、复制和生成操作均保持可访问

### Requirement: Cryptographically secure secret generation
系统 SHALL 提供“生成新 Secret”操作，每次显式触发时使用密码学安全随机源生成至少 256 位随机数据，以无填充 Base64URL 文本表示，并填入当前 Secret 字段。

#### Scenario: Generate a new secret
- **WHEN** 用户激活“生成新 Secret”
- **THEN** 系统生成至少 256 位随机数据的无填充 Base64URL 文本并用其替换当前 Secret 字段内容

#### Scenario: Do not replace a secret implicitly
- **WHEN** 用户切换解析与生成模式、修改算法或执行其他非 Secret 生成操作
- **THEN** 系统不会自动生成或替换 Secret

### Requirement: Local-only sensitive data handling and result actions
系统 SHALL 仅在当前页面会话内保存 JWT、Claims 和 Secret，不得因解析、签名、校验或 Secret 生成而发起网络请求、写入浏览器持久存储、记录敏感输入或在错误消息中回显 Secret。生成模式 SHALL 提供复制令牌操作，并 SHALL 将该操作稳定放置在生成结果标题行右侧、与标题垂直对齐；复制反馈 SHALL 在不挤动标题或按钮位置的独立区域呈现。解析模式 SHALL 提供清空全部解析输入、结果与状态的操作；生成模式的“清空生成” SHALL 清除 Claims、生成结果、错误及相关生成状态，但 MUST 保留当前 Secret，Secret 只能通过独立的“清除 Secret”或用户直接编辑来清空。

#### Scenario: Process JWT data locally
- **WHEN** 用户解析、校验或生成 JWT，或生成新 Secret
- **THEN** 全部操作在本地完成，JWT、Claims 和 Secret 不被上传、持久化或写入日志

#### Scenario: Copy a generated token
- **WHEN** 用户成功生成 JWT 并激活复制操作
- **THEN** 系统将完整生成令牌写入剪贴板并提供成功或失败反馈

#### Scenario: Keep the copy JWT action aligned
- **WHEN** 生成结果及复制成功或失败反馈显示
- **THEN** “复制 JWT”保持位于生成结果标题行右侧并与标题垂直对齐，反馈不会改变标题或按钮的位置

#### Scenario: Clear parsing mode
- **WHEN** 用户在解析模式激活清空操作
- **THEN** 系统清除解析模式的输入、结果、错误和签名状态，且不影响生成模式状态

#### Scenario: Clear generation mode while retaining the secret
- **WHEN** 用户在生成模式激活“清空生成”
- **THEN** 系统清除 Claims、生成结果、错误及相关生成状态，保留当前 Secret，且不影响解析模式状态
