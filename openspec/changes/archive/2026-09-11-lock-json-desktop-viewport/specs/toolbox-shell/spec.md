## ADDED Requirements

### Requirement: Focused desktop viewport for symmetric and encoding tools
系统 SHALL 为对称加密分组中的 AES、DES、SM4 页面，以及编码工具分组中的 URL、Unicode、Base64、JWT、JSON 页面提供统一的桌面聚焦布局。当视口至少为 1280×768、目标工具处于活动状态且页面没有全局能力警告时，应用外层 SHALL 保持在当前动态视口高度内且 SHALL NOT 产生文档级纵向滚动。工具标题、主要操作和全局页脚 SHALL 保持可访问；超出可用空间的内容 SHALL 在当前活动工具的功能区域内部滚动。系统 SHALL NOT 将此聚焦布局应用于首页、其他工具、窄视口、低高度视口或显示全局能力警告的页面。

#### Scenario: Focus every symmetric tool page
- **WHEN** 用户在至少 1280×768 的受支持桌面浏览器中打开一个已启用的 AES、DES 或 SM4 页面，且没有全局能力警告
- **THEN** 应用外层和主文档不产生纵向滚动
- **AND** 工具标题、参数设置、主要操作和全局页脚保持可访问

#### Scenario: Focus every encoding tool page
- **WHEN** 用户在至少 1280×768 的受支持桌面浏览器中打开 URL、Unicode、Base64、JWT 或 JSON 页面，且没有全局能力警告
- **THEN** 应用外层和主文档不产生纵向滚动
- **AND** 工具标题、模式或参数设置、主要操作和全局页脚保持可访问

#### Scenario: Scroll long functional content internally
- **WHEN** 活动目标工具的输入、输出、树形结构、JWT 正文或完整工具内容超出分配给功能区域的高度
- **THEN** 超出内容在该工具的功能区域内部滚动
- **AND** 长内容不会增加应用外层或主文档的滚动高度

#### Scenario: Preserve tool-specific warnings in focus mode
- **WHEN** 活动目标工具显示属于自身功能的警告或状态，例如 DES 旧算法警告或 JWT 无签名警告
- **THEN** 警告或状态保留在当前工具的可访问功能区域内
- **AND** 页面继续保持无文档级纵向滚动

#### Scenario: Restore natural document scrolling outside focus conditions
- **WHEN** 用户打开首页、非目标工具、窄视口或低高度视口，或者页面显示全局能力警告
- **THEN** 系统不应用外层聚焦溢出限制并允许自然文档滚动
- **AND** 页面内容不会因外层高度锁定而被裁切或变得不可访问

#### Scenario: Switch focus mode with the active tool
- **WHEN** 用户在目标工具与首页或非目标工具之间切换
- **THEN** 系统仅根据当前活动页面启用或移除聚焦布局
- **AND** 工具切换不会保留不属于当前页面的外层溢出限制
