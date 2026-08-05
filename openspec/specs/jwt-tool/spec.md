# jwt-tool Specification

## Purpose

为开发与调试场景提供完全在浏览器本地运行的 JWT 解析、签名校验和生成功能，使用户能清楚区分可读内容与可信内容，并安全处理令牌和 Secret。

## Requirements

### Requirement: Strict JWT parsing and claims display
系统 SHALL 仅将恰好包含三个以句点分隔片段、使用合法无填充 Base64URL 编码且 Header 与 Payload 均为 UTF-8 JSON 对象的输入解析为 JWT。解析成功后，系统 SHALL 展示完整 Header，并 SHALL 在共享的切换区域中默认展示完整 Claims/Payload，同时允许切换为 iss、sub、aud、exp、nbf、iat 和 jti 等注册 Claim 的摘要；系统不得从完整 Payload 中丢弃未知或自定义 Claim。

#### Scenario: Parse a valid token
- **WHEN** 用户提交一个结构和编码均合法、Header 与 Payload 均为 JSON 对象的三段式 JWT
- **THEN** 系统展示格式化后的完整 Header，并在共享切换区域默认展示完整 Claims/Payload 且允许查看其中存在的常见注册 Claim 摘要

#### Scenario: Preserve custom claims
- **WHEN** 合法 JWT 的 Payload 包含系统未专门摘要展示的自定义 Claim
- **THEN** 自定义 Claim 仍完整出现在 Payload 视图中

#### Scenario: Reject malformed token input
- **WHEN** 输入不是三段式 JWT、包含非法 Base64URL、无法按 UTF-8 解码、包含无效 JSON，或 Header/Payload 不是 JSON 对象
- **THEN** 系统不展示部分解析结果，清除此前解析结果并给出可理解且不包含 Secret 的错误信息

### Requirement: Explicit signature trust status
系统 SHALL 将内容解析与签名信任分开呈现。未提供 Secret 时，系统 SHALL 将带签名令牌标记为“未校验”，不得暗示其内容可信；提供 Secret 时，系统 SHALL 按 Header 的 `alg` 值仅校验 HS256、HS384 或 HS512 HMAC 签名，并 SHALL 将结果明确标记为“有效”或“无效”。Secret SHALL 被视为用户输入的 UTF-8 文本，而不是自动作为 HEX 或 Base64 解码。解析 Secret 输入 SHALL 使用“UTF-8文本密钥，留空则不做校验”作为占位文案，签名状态 SHALL 以非框体状态行显示在该输入下方并替代静态编码说明。成功解析后如 Secret 被编辑或删除，系统 SHALL 立即停止展示此前的有效、无效或其他校验结论，并 SHALL 提示用户重新解析以更新签名状态；Header 与 Payload 解析结果 SHALL 保留。

#### Scenario: Decode without a secret
- **WHEN** 用户解析一个带签名 JWT 但没有提供 Secret
- **THEN** 系统展示可解析内容并在 Secret 下方明确标记签名“未校验”，同时说明解码结果不代表内容可信

#### Scenario: Verify a valid supported signature
- **WHEN** 用户为采用 HS256、HS384 或 HS512 的 JWT 提供与签名匹配的 UTF-8 Secret
- **THEN** 系统按 Header 声明的算法校验原始签名输入并在 Secret 下方将签名状态标记为“有效”

#### Scenario: Report an invalid supported signature
- **WHEN** 用户为采用受支持 HMAC 算法的 JWT 提供不匹配的 Secret，或令牌的签名片段被篡改
- **THEN** 系统可继续展示解析内容，但在 Secret 下方将签名状态标记为“无效”并持续说明内容不可信

#### Scenario: Reject unsupported verification algorithm
- **WHEN** JWT Header 声明的 `alg` 不是 HS256、HS384 或 HS512 且也不是 `none`
- **THEN** 系统不尝试签名校验，并在 Secret 下方将状态明确标记为“不支持的算法”

#### Scenario: Handle an unsigned token
- **WHEN** JWT Header 声明 `alg` 为 `none` 且第三段为空
- **THEN** 系统在 Secret 下方将令牌标记为“无签名”并显示不应将其用于身份认证或授权的警告，提供 Secret 也不得使状态变为“有效”

#### Scenario: Invalidate stale trust after editing the secret
- **WHEN** 用户成功解析 JWT 后编辑或删除解析 Secret
- **THEN** 系统保留 Header 与 Payload，取消此前的签名结论，并在 Secret 下方提示“Secret 已更改，请重新解析以更新签名状态。”直至用户再次解析

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
系统 SHALL 在生成模式以明文文本直接显示 Secret，不得提供查看/隐藏切换操作。系统 SHALL 移除 Secret 下方的独立操作行，并 SHALL 在“Secret（可选）”标题右侧依次提供“生成”、复制图标和删除图标；“生成” SHALL 始终可用，复制与删除 SHALL 在 Secret 为空时不可用。删除 SHALL 只清空生成 Secret 与其复制反馈，不得清除 Claims、算法选择或已有生成结果。签名算法选择器 SHALL 从生成设置列移到白色主要工作区之外的模式操作行右侧，并 SHALL 仅在生成模式显示。桌面端生成设置与 JWT 结果 SHALL 位于等宽、顶部和底部对齐且填满工作区的两列中；窄视口 SHALL 按自然高度纵向堆叠。

#### Scenario: Place the algorithm beside the mode controls
- **WHEN** 用户切换到生成模式
- **THEN** 签名算法选择器显示在“操作 解析/生成”模式控制行右侧，生成工作区内部不再显示算法字段

#### Scenario: Hide the generation algorithm while parsing
- **WHEN** 用户切换到解析模式
- **THEN** 模式操作行不显示生成算法选择器，且解析工作区不显示独立算法框体

#### Scenario: Display generation secret title actions
- **WHEN** 用户打开生成模式
- **THEN** “Secret（可选）”标题右侧按“生成”、复制图标和删除图标的顺序显示操作，Secret 下方不显示独立操作行

#### Scenario: Display the generation secret as plain text
- **WHEN** 用户输入或生成 Secret
- **THEN** Secret 字段直接以明文显示，且界面不提供查看或隐藏按钮

#### Scenario: Delete only the generation secret
- **WHEN** Secret 非空且用户激活删除图标
- **THEN** 系统只清空 Secret 和 Secret 复制反馈，不清除 Claims、算法选择或已有生成结果

#### Scenario: Disable generation secret actions when empty
- **WHEN** 生成 Secret 为空
- **THEN** 复制和删除图标不可用，而“生成”操作仍可用

#### Scenario: Align generation columns on desktop
- **WHEN** 用户在能够显示双列工作区的桌面视口打开生成模式
- **THEN** 不含算法选择器的设置位于左列、JWT 结果位于右列，两列等宽并填满工作区，在顶部和底部视觉对齐

#### Scenario: Stack generation fields on a narrow viewport
- **WHEN** 用户在窄视口打开生成模式
- **THEN** 设置和 JWT 结果按自然高度纵向堆叠，所有标题栏操作均保持可访问

### Requirement: Cryptographically secure secret generation
系统 SHALL 在生成 Secret 字段标题行提供“生成”操作，每次显式触发时使用密码学安全随机源生成至少 256 位随机数据，以无填充 Base64URL 文本表示，并替换当前生成 Secret。

#### Scenario: Generate a new secret
- **WHEN** 用户激活生成 Secret 标题行中的“生成”
- **THEN** 系统生成至少 256 位随机数据的无填充 Base64URL 文本并用其替换当前 Secret

#### Scenario: Do not replace a secret implicitly
- **WHEN** 用户切换解析与生成模式、修改算法或执行其他非 Secret 生成操作
- **THEN** 系统不会自动生成或替换 Secret

### Requirement: Local-only sensitive data handling and result actions
系统 SHALL 仅在当前页面会话内保存 JWT、Claims 和 Secret，不得因解析、签名、校验或 Secret 生成而发起网络请求、写入浏览器持久存储、记录敏感输入或在错误消息中回显 Secret。生成 JWT 的复制操作 SHALL 位于结果标题行右侧；解析 Secret 标题行 SHALL 提供复制与删除图标，删除 SHALL 只清空解析 Secret 和相关复制反馈，不得清空 JWT 输入、Header 或 Payload 解析结果。解析模式 SHALL 提供清空全部解析输入、结果与状态的操作；生成模式的“清空生成” SHALL 清除 Claims、生成结果、错误及相关生成状态，但 MUST 保留当前 Secret。

#### Scenario: Process JWT data locally
- **WHEN** 用户解析、校验或生成 JWT，或生成新 Secret
- **THEN** 全部操作在本地完成，JWT、Claims 和 Secret 不被上传、持久化或写入日志

#### Scenario: Copy a generated token
- **WHEN** 用户成功生成 JWT 并激活结果标题行中的复制图标
- **THEN** 系统将完整生成令牌写入剪贴板并提供成功或失败反馈

#### Scenario: Delete only the parsing secret
- **WHEN** 解析 Secret 非空且用户激活其标题行中的删除图标
- **THEN** 系统清空解析 Secret 和相关复制反馈，保留 JWT 输入、Header 和 Payload 解析结果，并将此前签名结论替换为需要重新解析的状态

#### Scenario: Clear parsing mode
- **WHEN** 用户在解析模式激活清空操作
- **THEN** 系统清除解析模式的输入、结果、错误和签名状态，且不影响生成模式状态

#### Scenario: Clear generation mode while retaining the secret
- **WHEN** 用户在生成模式激活“清空生成”
- **THEN** 系统清除 Claims、生成结果、错误及相关生成状态，保留当前 Secret，且不影响解析模式状态

### Requirement: Compact local-processing notice placement
系统 SHALL NOT 在 JWT 页面顶部显示独立的彩色“本地处理”提示。系统 SHALL 继续通过页面说明和工具箱全局隐私信息传达本地处理原则，并 SHALL 保留无签名、签名信任状态及其他安全警告。

#### Scenario: Open the JWT tool without a standalone local notice
- **WHEN** 用户打开 JWT 工具
- **THEN** 页面顶部不显示独立的彩色“本地处理”提示，页面说明或全局隐私信息仍说明本地处理原则

#### Scenario: Preserve JWT security warnings
- **WHEN** 用户解析未校验、无效或无签名 JWT，或者准备生成无签名 JWT
- **THEN** 系统继续显示对应信任状态和安全警告

### Requirement: Bidirectional compact JWT workspace
系统 SHALL 在能够呈现双列的桌面视口中，以等宽、顶部和底部对齐的两列工作区展示解析和生成模式。解析模式 SHALL 在左列提供 JWT 输入，在右列从上到下展示 Header、Payload 或注册 Claim 视图、解析 Secret 及其签名信任状态；解析工作区 SHALL NOT 渲染独立的签名算法或签名校验框体。生成模式 SHALL 在左列依次提供派生 Header、Claims/Payload、生成 Secret 和生成操作，在右列展示生成的 JWT；签名算法 SHALL 位于白色主要工作区之外的模式操作行右侧。两个模式的白色主要工作区 SHALL 使用相同外部高度，且两列 SHALL 填满该高度；常见的四行格式化 Header SHALL 完整可见，其余弹性空间 SHALL 优先供 Payload 使用，长文本 SHALL 仅在对应正文区域内部滚动。窄视口 SHALL 取消固定高度并按语义顺序自然堆叠。

#### Scenario: Arrange parsing as input and result columns
- **WHEN** 用户在桌面视口打开解析模式
- **THEN** 等宽双列工作区左侧显示 JWT 输入，右侧按 Header、Payload 或注册 Claim 视图、Secret 和签名信任状态的顺序显示解析信息，且不显示独立的算法或校验框体

#### Scenario: Arrange generation in the opposite direction
- **WHEN** 用户在桌面视口打开生成模式
- **THEN** 左列按 Header、Payload、Secret 和生成操作的顺序显示设置，右列显示生成的 JWT，签名算法显示在工作区外的模式操作行右侧

#### Scenario: Keep both desktop modes the same height
- **WHEN** 用户在解析和生成模式之间切换，且任一模式尚无结果或包含超长内容
- **THEN** 两种模式的白色主要工作区保持相同外部高度且每列填满可用高度，空结果不引发布局收缩，超长 JWT、Header 和 Payload 仅在对应正文区域内部滚动，列本身不产生滚动

#### Scenario: Keep a normal header fully visible
- **WHEN** 解析或生成的格式化 Header 使用常见的四行 JSON 展示
- **THEN** Header 区域完整显示全部内容而无需滚动，剩余的弹性高度主要分配给 Payload 区域

#### Scenario: Stack the workspace on a narrow viewport
- **WHEN** 视口不能安全呈现双列工作区
- **THEN** 当前模式的输入或设置先于结果按自然高度纵向堆叠，且所有标题栏操作保持可访问

### Requirement: Switchable parsed payload and registered claims
解析成功后，系统 SHALL 在同一个可伸缩正文区域中提供“Payload”和“注册 Claim”两个互斥视图。Payload 视图 SHALL 展示完整 Payload 并保留所有未知或自定义 Claim；注册 Claim 视图 SHALL 仅摘要展示当前 Payload 中存在的常见注册 Claim，且不得渲染额外的独立 Claim 框体。切换视图 SHALL NOT 改变解析结果、签名信任状态或工作区外部尺寸。

#### Scenario: Default to the complete payload
- **WHEN** 用户成功解析 JWT
- **THEN** 共享正文区域默认显示包含全部注册及自定义 Claim 的完整 Payload

#### Scenario: Switch to registered claim summary
- **WHEN** 用户在解析成功后选择“注册 Claim”
- **THEN** 同一正文区域改为显示当前 Payload 中存在的注册 Claim 摘要，不再同时显示完整 Payload 或独立摘要框体

#### Scenario: Show an empty registered claim view
- **WHEN** 已解析 Payload 不包含任何支持摘要的注册 Claim 且用户选择“注册 Claim”
- **THEN** 共享正文区域显示明确空状态，且该视图的复制操作不可用

### Requirement: Header-aligned copy controls for JWT text regions
系统 SHALL 在 JWT 输入、解析 Header、当前解析 Payload/注册 Claim 视图、解析 Secret、生成 Header 预览、Claims/Payload 输入、生成 Secret 和生成 JWT 等每个文本输入或展示区域的标题行右侧提供仅显示图标的复制操作。复制图标 SHALL 位于文本框边框外，不得覆盖文本内容，并 SHALL 与 MD5 摘要复制操作保持一致的视觉语义、可访问名称、悬停说明、键盘焦点和禁用状态。空文本或无可复制内容的当前视图 SHALL 禁用复制；复制反馈 SHALL 使用固定共享区域且不得回显 Secret。

#### Scenario: Copy text from a titled region
- **WHEN** 用户激活任一非空文本区域标题行右侧的复制图标
- **THEN** 系统将该区域的完整当前文本写入剪贴板，并且图标不覆盖或改变正文区域尺寸

#### Scenario: Copy the active parsed view
- **WHEN** 用户在 Payload 与注册 Claim 之间切换后激活共享正文区域的复制图标
- **THEN** 系统复制当前可见视图的完整内容，而不是未选中的视图

#### Scenario: Disable copy for an empty region
- **WHEN** 某文本区域或当前切换视图没有可复制内容
- **THEN** 标题行中的复制图标保持可见但不可用

#### Scenario: Copy a masked parsing secret safely
- **WHEN** 解析 Secret 非空且用户激活其标题行中的复制图标
- **THEN** 系统复制完整 Secret，不改变密码遮蔽状态，并显示不包含 Secret 内容的反馈

#### Scenario: Report clipboard failure without layout shift
- **WHEN** 浏览器拒绝任一剪贴板写入
- **THEN** 系统在固定反馈区域显示不包含敏感内容的失败消息，标题、操作和正文区域位置保持不变
