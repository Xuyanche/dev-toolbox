## Context

参见 [proposal.md](./proposal.md) 的动机。应用是浏览器端工具箱，现有编码工具与应用壳需要共同扩展；JWT 又涉及不可信输入、算法选择、Secret 和密码学操作，因此实现必须把“解析”和“验证”分离，并保持敏感数据完全在本地。

活动变更 `expand-sha-hash-tool` 正在把导航中的 `SHA-1` 改为 `SHA`。本变更以两项变更合并后的目标状态设计：保留 `SHA`，再在编码工具末尾加入 `JWT`。

## Goals / Non-Goals

**Goals:**

- 用可测试的纯 TypeScript 领域逻辑完成严格解析、序列化、HMAC 签名与校验。
- 复用浏览器 Web Crypto，避免增加 JWT 运行时依赖和自制密码学原语。
- 在界面与状态模型中持续区分已解析内容和已验证内容。
- 让 JWT 页面与现有工具的响应式布局、复制、清空和错误反馈保持一致。

**Non-Goals:**

- 不支持 RSA、ECDSA、EdDSA、JWE、JWKS、远程密钥发现或令牌签发服务。
- 不将 Claim 内容视为业务授权结论，也不自动判断发行方或受众是否合法。
- 不提供 Secret 的 HEX/Base64 自动识别；Secret 始终按 UTF-8 文本使用。
- 不持久化历史令牌、Claims 或 Secret。

## Decisions

### Use strict Base64URL and JSON boundary helpers

JWT 领域模块使用无填充 Base64URL 编解码辅助函数，并在边界处严格检查字符集、片段数、UTF-8 和 JSON 对象类型。Header/Payload 的序列化采用 UTF-8 JSON，签名输入必须保持为令牌原始的 `headerSegment.payloadSegment` ASCII 字节，不能用重新格式化后的 JSON 重建。

选择严格解析是为了让错误可预测并避免浏览器宽松 Base64 行为接受混合字母表或异常填充。备选方案是复用普通 Base64 并做字符替换，但其错误边界模糊，难以覆盖畸形输入。

### Use Web Crypto with an explicit HMAC allowlist

签名和校验使用 `crypto.subtle`：把 UTF-8 Secret 作为 raw key 导入 HMAC，将 HS256、HS384、HS512 分别映射到 SHA-256、SHA-384、SHA-512。只允许这三个精确 `alg` 值；其他算法不进入密码学调用。校验使用 Web Crypto 的 `verify`，避免在应用代码中实现容易出错的字节比较。

备选方案是引入 JWT 库，但当前范围很小，依赖通常同时带来本工具不需要的远程密钥、非对称算法或 Claim 策略，增加体积和审计面。

### Model parsing and trust as separate results

解析结果保存 Header、Payload 和原始三段，签名结果另存为 `unverified`、`valid`、`invalid`、`unsigned` 或 `unsupported`。无效签名不删除可读内容，但所有可读区域都继续显示不可信提示；解析失败则原子地清除旧结果，避免新输入错误时残留旧令牌内容。

这种分离允许开发者检查损坏或不可信令牌，同时不会把成功解码包装成认证成功。备选方案是在验证失败时隐藏 Payload，但会削弱调试用途，且仍无法解决此前结果残留的风险。

### Treat `alg: none` as an explicit debugging-only path

生成模式在 Secret 非空时要求选择 HS256/HS384/HS512；Secret 为空时只生成 `{"alg":"none","typ":"JWT"}` 和空第三段，并在操作前后显示警告。警告是非阻塞信息，不维护确认状态、不显示确认复选框，也不在生成处理函数中设置额外门槛。解析时 `alg: none` 永远是 `unsigned`，即使用户输入 Secret 也不能升级为有效状态。Header 算法决定校验分支，但只能经过固定白名单，从而避免算法混淆。

备选方案是禁止无签名生成；用户明确要求 Secret 可选，因此保留调试路径，但通过独立状态和警告限制误用。

### Generate secrets as 32 random bytes encoded with Base64URL

“生成新 Secret”使用 `crypto.getRandomValues` 生成 32 字节，并输出无填充 Base64URL。输出随后作为可见的 UTF-8 Secret 字符串参与 HMAC，而不是先 Base64URL 解码成原始 32 字节。该规则使手工输入和自动生成 Secret 的处理完全一致，也避免隐式格式猜测。

备选方案是内部把生成文本解码回随机字节，但同一可见字符串在其他常见 JWT 调试器中可能被当作文本，造成跨工具签名不一致。

### Keep two mode states inside one JWT page

页面提供解析与生成模式切换。两种模式分别保存输入、结果、错误和状态；离开页面后沿用应用现有的会话内组件状态策略。生成 Secret 直接使用明文文本控件，并提供明确的清除、复制和生成新 Secret 操作，不进入 URL、持久存储、遥测或错误对象。“清空生成”只重置 Claims、令牌结果、错误和相关状态，保留 Secret；解析清空行为保持不变。

备选方案是拆成两个导航工具，但会增加导航密度，也不符合用户要求的单个 JWT 工具。

### Derive a visible generation Header without replacing algorithm selection

生成模式显式展示格式化的只读 Header JSON，同时保留现有 HS256/HS384/HS512 算法下拉框作为唯一的 HMAC 算法选择来源。Header 预览由 `algorithm` 与 Secret 是否为空派生：非空 Secret 使用下拉框当前值，空 Secret 使用 `none`；`typ` 固定为 `JWT`。清空 Secret 不重置或隐藏算法下拉框，重新输入 Secret 后预览恢复使用此前选择的 HMAC 算法。生成操作与预览调用同一个 Header 派生函数，保证界面展示和最终令牌不会漂移。

选择只读派生预览是为了让用户明确看到实际签入令牌的 Header，又避免可编辑 Header 中的 `alg` 与下拉框形成两个互相冲突的来源。备选方案是提供可编辑 Header JSON，但需要定义字段合并、保留字段与算法冲突优先级，超出本次“显式展示”优化范围。

### Balance the generation columns and expose explicit secret actions

桌面生成表单使用 `minmax(0, 1fr) minmax(0, 1fr)` 等宽两列 Grid，并以 `stretch` 对齐；左侧 Claims 字段和 textarea 使用纵向 Flex/Grid 拉伸，填满由右侧 Header、算法、Secret 及操作确定的默认行高，从而保持两列顶部和底部对齐并扩大右侧 Header 区域。进入单列响应式断点后取消强制拉伸，让各字段恢复自然高度，避免移动端出现不必要的大块空白。

生成 Secret 字段固定使用 `text` 类型，不再维护可见性状态。操作顺序为“清除 Secret、复制 Secret、生成新 Secret”：清除和复制仅在 Secret 非空时启用，清除只重置 Secret 与其复制反馈；复制反馈复用现有剪贴板反馈语义，成功、失败消息都不拼接 Secret。普通“清空生成”不得调用 Secret setter，从而保留当前 Secret。

生成结果不再把会自行渲染状态节点的通用 `CopyButton` 直接作为 `Panel` 标题 aside。结果标题行使用固定的操作容器只承载“复制 JWT”按钮，复制状态在标题行下方的独立区域渲染，使成功或失败文本不会改变标题与按钮的垂直对齐或位置。

备选方案是继续使用较窄的右列和标题 aside 中的组合式复制组件，但前者会压缩 Header 可读性，后者会因反馈节点参与标题行布局而产生跳动。等宽列与拆分按钮/反馈状态能保持稳定布局。

### Integrate through the shared tool registry

应用壳新增稳定的 `jwt` 工具 ID，将 JWT 追加到编码工具列表，并从同一注册信息驱动桌面导航、移动导航与首页能力概览。实现或归档时需基于活动 SHA 变更后的 `SHA` 标签解决规格重叠，不能恢复为 `SHA-1`。

## Risks / Trade-offs

- [用户可能把解码内容当成可信数据] → 将信任状态与内容并列展示，未校验、无效、无签名和不支持状态均使用持续可见的警告。
- [无签名令牌可能被误用于生产] → 只在 Secret 为空时进入独立调试路径，并在生成前后明确警告；解析时永不标记有效。
- [超大或恶意 JSON 造成界面卡顿] → 在 UI 边界设置合理输入长度并让解析错误可恢复，领域逻辑不递归解释 Claim 语义。
- [自动生成 Secret 的文本/字节语义与外部工具不一致] → 在界面帮助文案和测试向量中明确“UTF-8 文本 Secret”约定。
- [明文展示或复制 Secret 增加敏感内容暴露机会] → 明确标注 Secret 字段、提供独立清除操作、空值禁用复制，并确保 Secret 仍不进入网络、持久存储、日志、反馈或错误消息。
- [JWT 与 SHA 活动变更修改同一导航规格产生冲突] → 实施和归档都以 `SHA` 加 `JWT` 的组合目标状态为准，并在导航测试中固定最终顺序。

## Migration Plan

1. 先加入无 UI 副作用的 Base64URL、JWT 与 HMAC 领域逻辑和测试。
2. 加入 JWT 页面及交互测试，再通过共享工具注册表接入首页和两种导航。
3. 运行单元、组件、构建与 OpenSpec 严格校验，确认现有工具顺序和页面状态不回退。
4. 若需回滚，移除 `jwt` 注册项与页面入口；新增领域模块没有持久数据迁移，可独立撤回。
