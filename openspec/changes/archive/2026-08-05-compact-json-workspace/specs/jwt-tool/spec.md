## ADDED Requirements

### Requirement: Compact local-processing notice placement
系统 SHALL NOT 在 JWT 页面顶部显示独立的彩色“本地处理”提示。系统 SHALL 继续通过 JWT 页面说明及工具箱全局隐私信息传达 JWT、Claims 与 Secret 在浏览器本地处理的原则，并 SHALL 保留无签名、签名信任状态及其他安全警告的现有可见性和行为。

#### Scenario: Open the JWT tool without a standalone local notice
- **WHEN** 用户打开 JWT 工具
- **THEN** 页面顶部不显示独立的彩色“本地处理”提示
- **AND** 页面说明或工具箱全局隐私信息继续说明本地处理原则

#### Scenario: Preserve JWT security warnings
- **WHEN** 用户解析未校验、无效或无签名 JWT，或者准备生成无签名 JWT
- **THEN** 系统继续显示对应的信任状态和安全警告，不因移除本地处理提示而隐藏或弱化这些警告
