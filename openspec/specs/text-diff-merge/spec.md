# text-diff-merge Specification

## Purpose

提供浏览器本地的三栏文本融合工作区，让 YAML 配置与注释可以按熟悉的编辑器方式阅读、选择、修改及导出。

## Requirements

### Requirement: Three-pane text merge
系统 SHALL 以左来源、可编辑结果、右来源显示完整文本及注释，提供行差异高亮、当前块采用左/右、上一/下一差异及手动确认。相同内容 SHALL 自动继承，全部源差异初始待处理。左右比较时默认只读，可显式编辑；源改变 SHALL 暂停旧操作并保留草稿。

#### Scenario: Merge readable source text
- **WHEN** 用户载入两份 YAML 并开始比较
- **THEN** 三栏直接展示完整配置，结果初始沿用左侧，各差异仍需明确处理

### Requirement: Independent accept and ignore actions
系统 SHALL 在左右差异行分别提供箭头采用与叉号忽略。替换冲突 SHALL 独立记录两侧状态，双方处理后才确认；第二侧采用 SHALL 按点击顺序追加。只忽略一侧 SHALL 保留当前内容等待另一侧；两侧都忽略 SHALL 删除结果中该差异块，保持相同内容和其他块，支持撤销。覆盖手改前 SHALL 允许取消，失效范围 SHALL 禁止自动删除。单侧新增/删除的采用与换行风格差异一次操作 SHALL 可确认，文本块的忽略仍分别处理两侧。工具栏采用与 Ctrl/Cmd+点击 SHALL 支持整块解决；结果区右键 SHALL 提供使用某侧解决、忽略、标记解决和重置。两份来源无共同祖先时 SHALL 不伪造三方自动合并。

#### Scenario: Accept right and ignore left
- **WHEN** 用户点击右侧箭头，再点击左侧叉号
- **THEN** 结果采用右侧，右侧采用后先变灰且整块仍待处理，左侧忽略后整块确认且不改变正文

#### Scenario: Accept both list fragments
- **WHEN** 用户依次采用同一冲突的左侧和右侧
- **THEN** 第二侧追加到已采用内容之后，保留双方片段；若 YAML 无效则保留并诊断草稿

#### Scenario: Reject both sides of a difference
- **WHEN** 用户分别忽略同一差异的两侧
- **THEN** 该差异块从结果删除，其他内容保持，后续采用位置仍准确；撤销一次恢复删除前的正文与单侧忽略状态

### Requirement: Visible resolved state and reversible reset
已处理的一侧 SHALL 显示灰色行高亮及禁用按钮。已确认整块 SHALL 显示灰色结果高亮，上方当前项采用/手动确认按钮及行旁采用/忽略按钮 SHALL 变灰禁用，禁止重复操作。系统 SHALL 提供可撤销的重置，恢复此块初始左侧内容和双方待处理状态，保留其他块；覆盖手改前允许取消。手改已确认块 SHALL 重新开启双方操作。侧决策 SHALL 随撤销、重做及匹配块重排保持一致。

#### Scenario: Reopen a resolved difference
- **WHEN** 用户重置已解决的差异
- **THEN** 该块恢复初始左侧内容和待处理高亮，双方操作重新启用；撤销一次恢复之前的内容与已确认状态

### Requirement: Unified difference toolbar and bulk resolution
系统 SHALL 将差异选择、上一/下一处、当前项采用/手动确认/重置、状态与阅读选项集中在编辑器上方的同一紧凑工具栏，窄屏可换行，保留已确认项灰色禁用提示。工具栏“采用左侧” SHALL 位于最左并同时忽略右侧，“采用右侧” SHALL 位于最右并同时忽略左侧；工具栏 SHALL 不提供单侧忽略，独立采用/忽略保留在编辑器行旁。系统 SHALL 提供“全部采用左侧/右侧”，处理所有未处理差异（含部分决策、单侧增删和换行风格），保留已确认选择及相同区域手改，不受定位筛选或折叠影响。覆盖待处理块内手改前 SHALL 允许整体取消；存在失效范围、结果超限或计算失败时 SHALL 保留整批操作之前的正文、决策及历史。批量操作 SHALL 作为一次可撤销/重做事务，处理完毕后按钮禁用；查看已确认项时仍 SHALL 能批量处理剩余项。源改变、校验中或 YAML 无效时 SHALL 沿用自动采用暂停规则。

#### Scenario: Resolve one whole block from either toolbar edge
- **WHEN** 用户点击工具栏最左的“采用左侧”或最右的“采用右侧”
- **THEN** 当前块使用所选侧内容，另一侧同时标记忽略，双方操作变灰；独立采用或忽略一侧仍通过编辑器行旁按钮完成

#### Scenario: Resolve all remaining differences from the right
- **WHEN** 用户已确认一部分差异，随后点击“全部采用右侧”
- **THEN** 其余未处理项均采用右侧并忽略左侧，已确认选择及相同区域手改保留；撤销一次恢复整批操作前正文、换行和决策

#### Scenario: Cancel overwriting manually edited pending blocks
- **WHEN** 待处理差异包含手改，用户取消批量覆盖确认
- **THEN** 所有差异正文和决策保持，其他待处理项也不先行应用

#### Scenario: Reject an unsafe batch atomically
- **WHEN** 任一待处理块无法安全定位，或合并后的结果超出限制
- **THEN** 整批不执行，提示原因并保留草稿及历史

### Requirement: Search replace and editing tools
系统 SHALL 提供当前栏或三栏搜索、大小写/整词/正则选项、匹配数量、上一/下一匹配及当前可编辑栏的单次/全部替换。系统 SHALL 提供行号跳转、缩进、注释切换、行移动复制、多光标与矩形选择、括号辅助、代码折叠、自动换行、空白字符显示及行列/选择状态。无效查询 SHALL 可恢复且不改变文档。

#### Scenario: Replace in the result only
- **WHEN** 用户在结果栏全部替换匹配内容
- **THEN** 来源保持不变，结果更新，撤销一次恢复整个替换及差异状态

#### Scenario: Search read-only sources
- **WHEN** 用户搜索三栏中的字符串
- **THEN** 三栏均高亮匹配并显示计数，替换只允许在明确可编辑的当前栏执行

### Requirement: Consistent history and draft safety
采用、替换、手改及右侧重排/恢复 SHALL 支持一致撤销重做。重排 SHALL 保留融合文本；新差异划分可重新待确认。无效 YAML 及失效范围 SHALL 保留并给出诊断，不标记完成；重置前允许取消。

#### Scenario: Reorder after editing
- **WHEN** 用户手改结果后重排右侧，再撤销重排
- **THEN** 手改内容始终保留，右侧候选及相应差异状态恢复

#### Scenario: Preserve unsafe ranges through reorder
- **WHEN** 用户跨多个差异块手改结果后，重排或恢复右侧候选
- **THEN** 已失效范围和已删除状态不会被重新设为可安全自动操作，采用和删除不会覆盖其他块或手改；用户仍可手动确认，且撤销恢复之前的草稿与状态

### Requirement: Coordinated reading and complete export
系统 SHALL 支持可关闭的横向及纵向锁定滚动、隐藏相同内容、定位展开、桌面内部滚动及窄屏标签视图。短文本到达横向边界 SHALL 不把长文本拉回。查找和导航 SHALL 揭示折叠目标。导出 SHALL 包含全文，与折叠无关；支持 UTF-8、LF/CRLF 及完整结果/草稿区分，保持输入限制、后台取消、离线、本地处理和刷新清空行为。

#### Scenario: Export while equal sections are hidden
- **WHEN** 用户折叠相同区并下载
- **THEN** 文件仍包含全部相同内容、注释和融合修改

#### Scenario: Reveal every pane when navigating unequal differences
- **WHEN** 用户通过差异下拉框、上一/下一处或导航快捷键定位差异，且两侧前置差异块长度悬殊
- **THEN** 各栏分别将该差异起点或缺失侧锚点滚入可见区域，不被顶部锚点联动拉走；锁定开关与隐藏相同内容不影响主动定位，定位完成后仍可正常联动滚动

### Requirement: Compact editor controls and download dialog
系统 SHALL 移除载入示例按钮及常驻下载设置区；编辑器顶栏 SHALL 将名称、文件名、状态和操作尽量放在一行，撤销、重做、导入及下载 SHALL 使用带提示和可访问名称的图标。当前差异的行旁按钮 SHALL 适度高亮且与已确认灰色禁用状态区分。下载 SHALL 从中间结果栏图标进入弹窗，设置文件名和换行符，支持键盘取消及焦点返回；取消及导出设置 SHALL 不改变结果或差异历史。

#### Scenario: Configure a download without occupying editor space
- **WHEN** 用户点击结果栏下载图标
- **THEN** 弹窗显示文件名和换行符设置，确认下载完整快照；取消关闭弹窗并返回图标焦点，正文及决策保持
