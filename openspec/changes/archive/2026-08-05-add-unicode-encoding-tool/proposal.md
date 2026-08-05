## Why

工具箱目前能够处理 Base64 和 URL 编码，但缺少将普通文本与常见 `\uXXXX` Unicode 转义序列互相转换的独立工具。开发者在排查接口载荷、源码字符串和日志内容时，需要一个与现有 Base64 页面一致、完全本地运行的双向转换入口。

## What Changes

- 在“编码工具”分类中新增独立的 `Unicode` 工具，并将其置于 `Base64` 上方。
- 提供普通文本到 `\uXXXX` 转义序列的编码，以及 `\uXXXX` 转义序列到普通文本的解码。
- 对基本多文种平面之外的字符使用 UTF-16 代理对表示，以保持 JavaScript/JSON 兼容性。
- 解码时接受普通文本与 Unicode 转义混合输入，并拒绝不完整、非十六进制或代理项不成对的转义输入。
- Unicode 页面沿用 Base64 页面的响应式布局、操作流程、状态反馈、交换、复制和清空能力，所有处理仅在浏览器本地完成。
- 更新桌面导航、移动导航和首页编码工具概览中的工具顺序与名称。

## Capabilities

### New Capabilities

<!-- None. Unicode conversion extends the existing text-encoding capability. -->

### Modified Capabilities

- `text-encoding`: 增加 JavaScript/JSON 兼容的 `\uXXXX` Unicode 文本编码、解码、错误校验和统一页面行为。
- `grouped-tool-navigation`: 在桌面和移动端编码工具分类中于 Base64 之前增加 Unicode 工具，并保持可访问的选择与状态保留行为。

## Impact

- 影响 `src/features/encoding/` 中的转换逻辑、组件类型与测试。
- 影响 `src/shell/App.tsx` 中的工具标识、导航定义和对应壳层测试。
- 影响首页编码工具分类摘要及测试。
- 不新增网络 API、持久化、运行时依赖或后端服务。
