## ADDED Requirements

### Requirement: Single-viewport desktop SHA workspace
系统 SHALL 在受支持的桌面视口中为 SHA 工具提供一屏工作区。当视口至少为 1280×768、SHA 工具处于活动状态且页面没有需要额外空间的全局能力警告时，应用外层、主文档和完整 SHA 功能区 SHALL NOT 产生纵向滚动；SHA 标题、安全提示、输入、主要操作、四种算法结果组、状态反馈和全局页脚 SHALL 保持在当前动态视口内可访问。系统 SHALL 继续按 SHA-1、SHA-256、SHA-384、SHA-512 的固定顺序纵向排列算法结果组，并 SHALL 允许长输入和摘要内容在各自字段内部滚动，而不增加外层纵向高度。

#### Scenario: Open SHA within one desktop viewport
- **WHEN** 用户在至少 1280×768 的受支持桌面浏览器中打开 SHA 工具，且页面没有全局能力警告
- **THEN** SHA 标题、安全提示、输入、计算与清空操作、四种算法结果组和全局页脚均位于当前视口内
- **AND** 应用外层、主文档和完整 SHA 功能区均不产生纵向滚动

#### Scenario: Keep the calculated batch within one desktop viewport
- **WHEN** 用户在桌面一屏工作区中完成 SHA 计算并显示四种算法的大小写摘要和状态反馈
- **THEN** 四种算法结果继续按固定顺序全部保留在当前视口内
- **AND** 新结果和反馈不会增加应用外层、主文档或完整 SHA 功能区的纵向滚动高度

#### Scenario: Scroll long SHA input internally
- **WHEN** 待摘要文本超过桌面工作区分配给输入字段的可见高度
- **THEN** 输入字段在内部纵向滚动并保留全部文本
- **AND** 长输入不会增加应用外层、主文档或完整 SHA 功能区的纵向滚动高度

#### Scenario: Access a complete long digest in one result row
- **WHEN** SHA-384 或 SHA-512 的完整摘要超过结果字段的可见宽度
- **THEN** 该摘要保持单行并可在所属字段内部横向滚动
- **AND** 对应复制按钮保持固定、可访问，并复制未经截断的完整摘要

#### Scenario: Restore natural scrolling outside desktop focus conditions
- **WHEN** 视口宽度或高度低于 SHA 一屏布局要求，浏览器缩放使有效视口不足，或者页面显示全局能力警告
- **THEN** 系统不应用 SHA 外层聚焦限制并允许自然文档滚动
- **AND** SHA 的标题、安全提示、输入、操作、全部结果、反馈和全局提示不会被裁切或变得不可访问

#### Scenario: Leave MD5 outside SHA focus layout
- **WHEN** 用户从 SHA 切换到 MD5 工具
- **THEN** 系统移除 SHA 一屏布局及其外层溢出限制
- **AND** MD5 的结构、间距、摘要换行和滚动行为保持不变
