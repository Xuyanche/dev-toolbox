## Why

当前编码工具只能处理 URL 与 Base64，缺少开发和调试 API 身份令牌时常用的 JWT 查看、签名核对和快速生成功能。新增本地 JWT 工具可以让用户在不上传令牌或 Secret 的情况下完成这些敏感操作。

## What Changes

- 在“编码工具”分组中新增 `JWT` 工具，排列在 URL 编解码、Base64 之后。
- 提供解析模式：严格读取三段式 JWT，展示 Header、完整 Claims/Payload 和常见注册 Claim 摘要；仅解析时明确说明内容尚未验证。
- 解析模式允许输入可选 Secret，并根据 Header 中的算法校验 HS256、HS384、HS512 签名，清楚区分有效、无效、未校验、无签名和不支持算法状态。
- 提供生成模式：输入 JSON Claims/Payload，保留 HS256、HS384、HS512 签名算法选择下拉框，并显式展示随当前算法与 Secret 状态更新的格式化 JWT Header；使用 Secret 生成签名 JWT，Secret 为空时可直接生成明确标记为不安全的 `alg: none` 调试令牌，仅显示警告而不要求额外确认。
- 提供密码学安全的新 Secret 生成功能，生成至少 256 位随机值并以无填充 Base64URL 文本填入 Secret 字段。
- 优化生成表单：桌面端 Claims 输入区域与右侧 Header、算法和 Secret 设置列使用等宽双列并保持等高对齐；Secret 直接以明文显示，并提供清除、复制和生成新 Secret 操作。
- 支持复制生成令牌、清空当前模式、严格 JSON/Base64URL 校验和可理解的错误反馈；生成结果中的复制 JWT 操作保持与结果标题稳定对齐，清空生成内容时保留当前 Secret。
- JWT、Claims 和 Secret 始终只保存在当前页面会话内，解析、签名和校验不得发起网络请求或写入浏览器持久存储。

## Capabilities

### New Capabilities

- `jwt-tool`: 定义 JWT 的严格解析、Claims 展示、HMAC 签名校验、签名/无签名生成、安全 Secret 生成及本地敏感数据处理行为。

### Modified Capabilities

- `grouped-tool-navigation`: 在“编码工具”分组末尾新增 JWT，并将桌面和移动导航工具总数从十一项增加为十二项。

## Impact

- 新增 JWT 领域模块、页面组件、响应式样式、标准测试向量和交互测试。
- 扩展应用壳的工具 ID、编码分组定义、首页能力概览和导航顺序测试。
- 复用 Web Crypto 的 HMAC 与安全随机能力，不计划新增运行时依赖。
- Secret 属于敏感输入；实现不得记录、上传、持久化或在错误中回显 Secret。
- 与活动变更 `expand-sha-hash-tool` 都会修改分组导航；实施与归档时需要保留最终 `SHA` 标签并在其基础上加入 JWT。
