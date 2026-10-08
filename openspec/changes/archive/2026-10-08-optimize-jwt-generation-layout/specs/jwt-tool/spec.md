## MODIFIED Requirements

### Requirement: Strict JWT parsing and claims display
系统 SHALL 仅将恰好包含三个以句点分隔片段、使用合法无填充 Base64URL 编码且 Header 与 Payload 均为 UTF-8 JSON 对象的输入解析为 JWT。解析模式 SHALL 在 JWT 输入于短暂稳定期内未继续变化后自动解析当前值；解析成功后，系统 SHALL 展示完整 Header，并 SHALL 在共享的切换区域中默认展示完整 Claims/Payload，同时允许切换为 iss、sub、aud、exp、nbf、iat 和 jti 等注册 Claim 的摘要；系统不得从完整 Payload 中丢弃未知或自定义 Claim。空 JWT 输入 SHALL 清除解析结果和错误而不显示格式错误；如果输入在异步处理期间再次变化，较早操作的结果 SHALL NOT 覆盖较新输入的状态。

#### Scenario: Parse a valid token
- **WHEN** 解析模式中的 JWT 输入变为结构和编码均合法、Header 与 Payload 均为 JSON 对象的三段式 JWT，并在短暂稳定期内未继续变化
- **THEN** 系统自动展示格式化后的完整 Header，并在共享切换区域默认展示完整 Claims/Payload 且允许查看其中存在的常见注册 Claim 摘要

#### Scenario: Preserve custom claims
- **WHEN** 自动解析成功的 JWT Payload 包含系统未专门摘要展示的自定义 Claim
- **THEN** 自定义 Claim 仍完整出现在 Payload 视图中

#### Scenario: Reject malformed token input
- **WHEN** 稳定后的非空输入不是三段式 JWT、包含非法 Base64URL、无法按 UTF-8 解码、包含无效 JSON，或 Header/Payload 不是 JSON 对象
- **THEN** 系统不展示部分解析结果，清除此前解析结果并给出可理解且不包含 Secret 的错误信息

#### Scenario: Clear results for empty JWT input
- **WHEN** 用户清空 JWT 输入
- **THEN** 系统立即清除 Header、Claims、信任状态和解析错误，保留解析 Secret，且不显示格式错误

#### Scenario: Ignore a superseded parse result
- **WHEN** 较早 JWT 或 Secret 快照的异步校验在较新输入开始处理后才完成
- **THEN** 系统丢弃较早结果并仅展示与当前 JWT 和 Secret 一致的解析及信任状态

### Requirement: Explicit signature trust status
系统 SHALL 将内容解析与签名信任分开呈现。未提供 Secret 时，系统 SHALL 将带签名令牌标记为“未校验”，不得暗示其内容可信；提供 Secret 时，系统 SHALL 按 Header 的 `alg` 值仅校验 HS256、HS384 或 HS512 HMAC 签名，并 SHALL 将结果明确标记为“有效”或“无效”。Secret SHALL 被视为用户输入的 UTF-8 文本，而不是自动作为 HEX 或 Base64 解码。解析 Secret 输入 SHALL 使用“UTF-8文本密钥，留空则不做校验”作为占位文案，签名状态 SHALL 以非框体状态行显示在该输入下方。成功解析后如 Secret 被编辑、生成或删除，系统 SHALL 立即取消此前的签名结论、保留 Header 与 Payload，并 SHALL 在短暂稳定期后自动使用当前 Secret 重新校验；自动校验期间 SHALL NOT 把旧结论呈现为当前结论。

#### Scenario: Decode without a secret
- **WHEN** 系统自动解析一个带签名 JWT 但解析 Secret 为空
- **THEN** 系统展示可解析内容并在 Secret 下方明确标记签名“未校验”，同时说明解码结果不代表内容可信

#### Scenario: Verify a valid supported signature
- **WHEN** 当前 JWT 采用 HS256、HS384 或 HS512 且用户提供与签名匹配的 UTF-8 Secret
- **THEN** 系统自动按 Header 声明的算法校验原始签名输入并在 Secret 下方将签名状态标记为“有效”

#### Scenario: Report an invalid supported signature
- **WHEN** 用户为采用受支持 HMAC 算法的 JWT 提供不匹配的 Secret，或令牌的签名片段被篡改
- **THEN** 系统可继续展示解析内容，但在自动校验完成后于 Secret 下方将签名状态标记为“无效”并持续说明内容不可信

#### Scenario: Reject unsupported verification algorithm
- **WHEN** JWT Header 声明的 `alg` 不是 HS256、HS384 或 HS512 且也不是 `none`
- **THEN** 系统不尝试签名校验，并在 Secret 下方将状态明确标记为“不支持的算法”

#### Scenario: Handle an unsigned token
- **WHEN** JWT Header 声明 `alg` 为 `none` 且第三段为空
- **THEN** 系统在 Secret 下方将令牌标记为“无签名”并显示不应将其用于身份认证或授权的警告，提供 Secret 也不得使状态变为“有效”

#### Scenario: Invalidate stale trust after editing the secret
- **WHEN** 用户成功解析 JWT 后编辑、生成或删除解析 Secret
- **THEN** 系统立即取消此前的签名结论、保留 Header 与 Payload，并在当前 Secret 稳定后自动展示重新校验得到的最新信任状态

### Requirement: Signed and unsigned JWT generation
系统 SHALL 接受一个 JSON 对象作为 Claims/Payload，并 SHALL 始终保留允许用户选择 HS256、HS384 或 HS512 的签名算法下拉框。生成模式 SHALL 显式展示格式化的只读 JWT Header：存在非空 UTF-8 Secret 时 Header SHALL 包含下拉框所选 `alg` 和 `typ: JWT`；Secret 为空时 Header SHALL 包含 `alg: none` 和 `typ: JWT`，但算法下拉框 SHALL 继续显示并保留用户所选 HMAC 算法。Claims/Payload、Secret 或算法在短暂稳定期内未继续变化后，系统 SHALL 自动使用当前快照生成 JWT；最终令牌解码后的 Header MUST 与当前预览一致，Payload SHALL 保留用户输入的全部 Claim。Secret 为空时，系统 SHALL 自动生成第三段为空的未签名调试令牌，并 SHALL 仅在 Secret 下方的固定提示行以红色文字标记其不安全，不得显示独立警告框、结果下方重复警告或确认步骤。空 Claims/Payload 输入 SHALL 清除生成结果和错误而不显示 JSON 格式错误；较早异步生成结果 SHALL NOT 覆盖较新输入。

#### Scenario: Preview a signed JWT header
- **WHEN** 用户在生成模式输入非空 Secret 并从保留的算法下拉框选择 HS256、HS384 或 HS512
- **THEN** 系统立即展示包含所选 `alg` 与 `typ: JWT` 的格式化只读 Header

#### Scenario: Preview an unsigned JWT header without removing algorithm selection
- **WHEN** 用户在生成模式将 Secret 留空
- **THEN** 系统立即展示包含 `alg: none` 与 `typ: JWT` 的格式化只读 Header，同时继续显示算法下拉框并保留用户此前选择的 HMAC 算法

#### Scenario: Generate a signed token
- **WHEN** 合法 Claims/Payload JSON 对象、非空 Secret 和所选 HMAC 算法在短暂稳定期内未继续变化
- **THEN** 系统自动生成 Header 与当前预览一致、可由本工具使用同一 Secret 验证为有效的三段式 JWT，并展示可复制的令牌

#### Scenario: Generate an unsigned debugging token
- **WHEN** 合法 Claims/Payload JSON 对象保持稳定且生成 Secret 为空
- **THEN** 系统自动生成 Header 与当前预览一致、使用 `alg: none` 且空签名段的三段式 JWT
- **AND** Secret 下方的固定提示行以红色文字显示“Secret 为空，将生成无签名 JWT，不得用于身份认证或授权。”

#### Scenario: Warn without requiring confirmation
- **WHEN** 生成 Secret 为空
- **THEN** 系统不显示独立警告框、结果下方重复警告、确认复选框或额外确认步骤

#### Scenario: Reject invalid claims JSON
- **WHEN** 稳定后的非空 Claims/Payload 输入不是合法 JSON 或其顶层值不是对象
- **THEN** 系统不生成令牌并在 Claims/Payload 输入附近显示可理解的错误

#### Scenario: Clear results for empty claims input
- **WHEN** 用户清空 Claims/Payload 输入
- **THEN** 系统立即清除生成结果和生成错误，保留当前 Secret 与算法，且不显示 JSON 格式错误

#### Scenario: Ignore a superseded generation result
- **WHEN** 较早 Claims、Secret 或算法快照的异步生成在较新输入开始处理后才完成
- **THEN** 系统丢弃较早令牌并仅展示与当前生成设置一致的结果

### Requirement: Aligned generation layout and secret actions
系统 SHALL 在生成模式以明文文本直接显示 Secret，不得提供查看/隐藏切换操作。系统 SHALL 在“Secret（可选）”标题右侧依次提供“生成”、复制图标和删除图标；“生成” SHALL 始终可用，复制与删除 SHALL 在 Secret 为空时不可用。删除 SHALL 只清空生成 Secret 与其复制反馈，不得清除 Claims、算法选择或已有生成结果。Secret 下方 SHALL 保留固定高度的非框体提示行；Secret 为空时该行 SHALL 以红色文字显示无签名安全警告，Secret 非空时 SHALL 保留空间而不显示警告文字。签名算法选择器 SHALL 位于白色主要工作区之外的模式操作行右侧，并 SHALL 仅在生成模式显示。系统 SHALL NOT 显示“生成 JWT”或“清空生成”主操作按钮。桌面端 SHALL 使用等宽、顶部和底部对齐且填满工作区的镜像双列：左列从上到下展示紧凑 Header、占用全部剩余高度的 Claims/Payload 和紧凑 Secret，右列由生成的 JWT 填满。窄视口 SHALL 按 Header、Claims/Payload、Secret 和生成 JWT 结果的语义顺序自然堆叠。

#### Scenario: Place the algorithm beside the mode controls
- **WHEN** 用户切换到生成模式
- **THEN** 签名算法选择器显示在“操作 解析/生成”模式控制行右侧，生成工作区内部不再显示算法字段

#### Scenario: Hide the generation algorithm while parsing
- **WHEN** 用户切换到解析模式
- **THEN** 模式操作行不显示生成算法选择器，且解析工作区不显示独立算法框体

#### Scenario: Display generation secret title actions
- **WHEN** 用户打开生成模式
- **THEN** “Secret（可选）”标题右侧按“生成”、复制图标和删除图标的顺序显示操作，Secret 下方不显示独立按钮操作行

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
- **THEN** 紧凑 Header、扩展的 Claims/Payload 和紧凑 Secret 依次位于左列，生成 JWT 结果填满右列
- **AND** 两列等宽、填满工作区并在顶部和底部视觉对齐

#### Scenario: Expand the claims editor into available space
- **WHEN** 桌面生成工作区具有超出紧凑 Header、Secret 和稳定反馈所需的剩余高度
- **THEN** Claims/Payload 输入占用左列全部剩余高度，且长内容在输入区域内部滚动

#### Scenario: Omit manual generation controls
- **WHEN** 用户查看生成模式
- **THEN** 系统不显示“生成 JWT”或“清空生成”按钮，生成结果由 Claims/Payload、Secret 或算法变化自动更新

#### Scenario: Show an inline unsigned warning
- **WHEN** 生成 Secret 为空
- **THEN** Secret 下方固定提示行以红色文字显示无签名警告，且不渲染独立彩色警告框

#### Scenario: Preserve secret hint spacing when signed
- **WHEN** 生成 Secret 非空
- **THEN** Secret 下方提示行保持原有高度但不显示无签名警告，Claims/Payload 和结果区域位置不发生跳动

#### Scenario: Stack generation fields on a narrow viewport
- **WHEN** 用户在窄视口打开生成模式
- **THEN** Header、Claims/Payload、Secret 和生成 JWT 结果按该顺序自然堆叠，所有标题栏操作均保持可访问

### Requirement: Local-only sensitive data handling and result actions
系统 SHALL 仅在当前页面会话内保存 JWT、Claims 和 Secret，不得因自动解析、签名、校验、生成或 Secret 生成而发起网络请求、写入浏览器持久存储、记录敏感输入或在错误消息中回显 Secret。生成 JWT 的复制操作 SHALL 位于结果标题行右侧；解析 Secret 标题行 SHALL 提供复制与删除图标，删除 SHALL 只清空解析 Secret 和相关复制反馈，不得清空 JWT 输入、Header 或 Payload 解析结果，并 SHALL 自动更新信任状态。JWT 输入和 Claims/Payload 输入的标题行 SHALL 各在复制图标之后提供一个删除图标；该图标 SHALL 在对应输入为空时不可用，激活时 SHALL 取消该输入尚未执行的自动处理并清空对应输入、派生结果、错误及复制反馈，但 SHALL 保留该模式的 Secret、生成算法和另一模式的全部状态。解析和生成模式 SHALL NOT 提供独立的主操作或清空按钮；标题行输入删除图标不视为独立主按钮。

#### Scenario: Process JWT data locally
- **WHEN** 系统自动解析、校验或生成 JWT，或用户生成新 Secret
- **THEN** 全部操作在本地完成，JWT、Claims 和 Secret 不被上传、持久化或写入日志

#### Scenario: Copy a generated token
- **WHEN** 系统成功生成 JWT 且用户激活结果标题行中的复制图标
- **THEN** 系统将完整生成令牌写入剪贴板并提供成功或失败反馈

#### Scenario: Delete only the parsing secret
- **WHEN** 解析 Secret 非空且用户激活其标题行中的删除图标
- **THEN** 系统清空解析 Secret 和相关复制反馈，保留 JWT 输入、Header 和 Payload 解析结果，并自动将签名状态更新为与空 Secret 对应的状态

#### Scenario: Clear parsing mode
- **WHEN** 用户清空解析模式的 JWT 输入
- **THEN** 系统自动清除 Header、Payload、错误和签名状态，保留解析 Secret，且不影响生成模式状态

#### Scenario: Clear generation mode while retaining the secret
- **WHEN** 用户清空生成模式的 Claims/Payload 输入
- **THEN** 系统自动清除生成结果、错误及相关生成状态，保留当前生成 Secret 和算法，且不影响解析模式状态

#### Scenario: Omit primary action and clear buttons
- **WHEN** 用户查看解析或生成模式
- **THEN** 系统不显示解析、生成或独立清空主按钮，Secret 的生成、复制与删除标题栏操作、JWT/Claims 输入删除图标以及各文本区域复制操作仍保持可用

#### Scenario: Clear the parsing JWT from its heading
- **WHEN** JWT 输入非空且用户激活 JWT 标题行中的删除图标
- **THEN** 系统取消待执行的自动解析，清空 JWT 输入、Header、Payload、解析错误、信任状态及解析复制反馈，保留解析 Secret，且不影响生成模式状态

#### Scenario: Clear generation claims from its heading
- **WHEN** Claims/Payload 输入非空且用户激活其标题行中的删除图标
- **THEN** 系统取消待执行的自动生成，清空 Claims/Payload 输入、生成结果、生成错误及生成复制反馈，保留生成 Secret 与算法，且不影响解析模式状态

#### Scenario: Disable primary-input delete icons when empty
- **WHEN** JWT 或 Claims/Payload 输入为空
- **THEN** 对应标题行删除图标不可用，而复制图标继续按其现有值决定是否可用

### Requirement: Bidirectional compact JWT workspace
系统 SHALL 在能够呈现双列的桌面视口中，以等宽、顶部和底部对齐且互为镜像的两列工作区展示解析和生成模式。解析模式 SHALL 由左列 JWT 输入填满可用高度，右列从上到下展示紧凑 Header、占用全部剩余高度的 Payload 或注册 Claim 视图、解析 Secret 及其签名信任状态；解析工作区 SHALL NOT 渲染独立的签名算法、签名校验框体或主操作行。生成模式 SHALL 在左列从上到下展示紧凑派生 Header、占用全部剩余高度的 Claims/Payload 和生成 Secret，右列由生成的 JWT 填满可用高度；签名算法 SHALL 位于白色主要工作区之外的模式操作行右侧。两个模式的白色主要工作区 SHALL 使用相同外部高度，且两列 SHALL 填满该高度；常见四行 Header SHALL 完整可见但不得随工作区增高而持续扩展，Secret SHALL 仅使用内容所需高度，长 JWT、Claims 和结果 SHALL 仅在对应正文区域内部滚动。除统一复制反馈区域外，系统 SHALL NOT 为已移除的按钮、操作状态或重复警告保留空白轨道。窄视口 SHALL 取消固定高度并按语义顺序自然堆叠。

#### Scenario: Arrange parsing as input and result columns
- **WHEN** 用户在桌面视口打开解析模式
- **THEN** 等宽双列工作区左侧由 JWT 输入填满，右侧按紧凑 Header、扩展 Payload 或注册 Claim 视图、Secret 和签名信任状态的顺序显示解析信息
- **AND** 工作区不显示独立算法、校验框体或解析操作行

#### Scenario: Arrange generation in the opposite direction
- **WHEN** 用户在桌面视口打开生成模式
- **THEN** 左列按紧凑 Header、扩展 Claims/Payload 和紧凑 Secret 的顺序显示生成设置，右列由生成的 JWT 填满
- **AND** 签名算法显示在工作区外的模式操作行右侧，工作区不显示生成操作行

#### Scenario: Keep both desktop modes the same height
- **WHEN** 用户在解析和生成模式之间切换，且任一模式尚无结果或包含超长内容
- **THEN** 两种模式的白色主要工作区保持相同外部高度且每列填满可用高度，空结果不引发布局收缩，超长 JWT、Header 和 Payload 仅在对应正文区域内部滚动，列本身不产生滚动

#### Scenario: Keep a normal header fully visible
- **WHEN** 解析或生成的格式化 Header 使用常见的四行 JSON 展示
- **THEN** Header 区域完整显示全部内容而无需滚动，且不随工作区增高而持续扩展
- **AND** 对应列在扣除 Header 与 Secret 内容高度后，将全部剩余弹性高度分配给 Claims/Payload 区域

#### Scenario: Fill the generation workspace
- **WHEN** 用户在桌面视口查看内容较短或尚未生成结果的生成工作区
- **THEN** Claims/Payload 输入扩展以填满左列剩余高度，生成 JWT 结果区域填满右列可用高度
- **AND** 除统一复制反馈区域外，白色主要工作区不为已移除的操作或警告保留空白轨道

#### Scenario: Stack the workspace on a narrow viewport
- **WHEN** 视口不能安全呈现双列工作区
- **THEN** 解析模式按 JWT、Header、Payload、Secret 顺序堆叠，生成模式按 Header、Claims/Payload、Secret、生成 JWT 顺序堆叠
- **AND** 所有标题栏操作保持可访问，页面不产生水平溢出

### Requirement: Mode-aware JWT primary input keyboard execution
The system SHALL automatically process the active JWT mode after its relevant inputs remain unchanged for a short stabilization period. Users SHALL also be able to process the active mode immediately from its primary editable input by pressing `Ctrl+Enter`: the JWT input SHALL immediately run parsing and verification in parse mode, and the Claims/Payload JSON input SHALL immediately run token generation in generate mode. Accepted keyboard execution SHALL cancel the pending automatic timer, use the current input snapshot, preserve plain Enter for multiline editing, and produce the same validation, results, warnings, and status feedback as automatic processing.

#### Scenario: Parse from the JWT input
- **WHEN** parse mode is active, keyboard focus is in the JWT input, and the user presses `Ctrl+Enter` while text composition is inactive
- **THEN** the system cancels the pending automatic parse and immediately parses and, when applicable, verifies the current JWT snapshot once

#### Scenario: Generate from the Claims input
- **WHEN** generate mode is active, keyboard focus is in the Claims/Payload JSON input, and the user presses `Ctrl+Enter` while text composition is inactive
- **THEN** the system cancels the pending automatic generation and immediately generates one JWT using the current Claims, algorithm, and Secret snapshot

#### Scenario: Preserve JWT multiline editing
- **WHEN** keyboard focus is in either JWT primary multiline input and the user presses Enter without Control
- **THEN** the system preserves normal line-break editing and does not immediately execute the active mode

#### Scenario: Exclude JWT auxiliary fields
- **WHEN** keyboard focus is in a JWT Secret field and the user presses Enter or `Ctrl+Enter`
- **THEN** the system does not immediately execute JWT parsing or generation from that keyboard event, while the changed Secret remains eligible for normal debounced automatic processing

#### Scenario: Suppress duplicate or composing JWT execution
- **WHEN** the user presses `Ctrl+Enter` in an active JWT primary input while text composition is active or the keydown is an automatic repeat
- **THEN** the system does not start an immediate operation or interrupt text composition

#### Scenario: Prevent a canceled timer from duplicating immediate execution
- **WHEN** the user presses `Ctrl+Enter` before the current automatic processing timer expires
- **THEN** the system performs the immediate operation once and the canceled timer does not start a duplicate operation
