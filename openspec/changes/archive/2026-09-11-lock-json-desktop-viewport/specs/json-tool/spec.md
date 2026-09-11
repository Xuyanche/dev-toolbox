## MODIFIED Requirements

### Requirement: Single-window JSON formatting workspace
系统 SHALL 在同一个 JSON 工具工作区内提供一个统一输入框，并 SHALL 在该输入框下方同时提供格式化、压缩、转义、去除转义和清空操作。系统 SHALL NOT 要求用户切换 JSON 模式或进入独立的转义输入、输出页面。宽视口下，系统 SHALL 将文本工作区放在左侧，将树形结构放在右侧，并 SHALL 让两个区域使用匹配的可用高度和各自的内部滚动；当桌面视口具备足够宽度和高度时，系统 SHALL 将 JSON 工具外层约束在当前视口内且不产生文档级纵向滚动。窄视口或可用高度不足时，系统 SHALL 以可访问的自然文档流展示内容并允许文档滚动。转换、复制和错误反馈 SHALL 共用一个不会引起主要控件位置移动的稳定反馈区域。

#### Scenario: Format and inspect in one workspace
- **WHEN** 用户输入有效 JSON 并执行格式化
- **THEN** 系统在同一个窗口中同时显示被格式化替换后的输入内容和树形结构

#### Scenario: Access every transformation without switching modes
- **WHEN** 用户打开 JSON 工具
- **THEN** 格式化、压缩、转义、去除转义和清空操作均位于统一输入框下方
- **AND** 页面不显示 JSON 模式选择或独立的转义输入、输出工作区

#### Scenario: Show the tree on the right side
- **WHEN** 用户在宽视口中查看 JSON 工具页面
- **THEN** JSON 输入位于左侧工作区，树形结构位于右侧工作区，两个区域使用匹配的可用高度

#### Scenario: Keep the desktop JSON page within one viewport
- **WHEN** 用户在受支持浏览器中以至少 1280×768 的桌面视口打开 JSON 工具，且页面没有需要额外空间的全局能力警告
- **THEN** 工具标题、统一输入框、树形区域、全部主要操作和全局页脚均位于当前视口内
- **AND** 页面外层不产生文档级纵向滚动
- **AND** 超出可用高度的输入或树内容分别在所属区域内部滚动

#### Scenario: Keep feedback layout stable
- **WHEN** 系统显示转换、复制成功或错误反馈
- **THEN** 反馈在统一的稳定区域内更新，且不会增加重复反馈行或移动输入框和主要操作

#### Scenario: Stack the same workspace on a narrow viewport
- **WHEN** 用户在窄视口中查看 JSON 工具页面
- **THEN** 输入、操作和树形结构按可访问顺序纵向展示，且所有操作保持可用

#### Scenario: Restore document scrolling when the viewport cannot safely contain the workspace
- **WHEN** 视口宽度或高度低于 JSON 聚焦布局要求，或者页面显示需要额外空间的全局能力警告
- **THEN** 系统允许文档级纵向滚动
- **AND** 工具标题、输入、全部主要操作、树形区域、反馈和全局提示不会因外层溢出限制而被裁切或变得不可访问
