## ADDED Requirements

### Requirement: Desktop collapsible sidebar
系统 SHALL 在显示桌面左侧导航的视口中提供图钉式侧栏控制。钉住状态 SHALL 保持当前左侧导航占据固定布局宽度、主功能区位于其右侧的展示方式，并 SHALL 在标题与 icon 右侧显示图钉控制。用户拔起图钉时，系统 SHALL 保持完整侧栏可见，直到鼠标离开侧栏区域后才进入收起状态。收起状态 SHALL 在左侧保留一个窄竖条作为鼠标触发区和键盘入口，并 SHALL 让主功能区扩展占据除窄竖条外的可用屏幕宽度；主要工作区 SHALL 比钉住状态使用更大的可用宽度，适用时也 SHALL 提供更大的工作区高度。收起状态下，当鼠标进入窄竖条或临时展开的导航区域时，系统 SHALL 以覆盖层方式临时展开完整导航及其背景；该临时展开 SHALL NOT 改变主功能区宽度或触发主功能区重新排版。用户在临时展开状态点击图钉时，系统 SHALL 重新钉住侧栏并恢复固定布局。侧栏图钉状态 SHALL NOT 持久化，刷新页面后 SHALL 回到钉住展开状态。移动视口 SHALL 保持现有移动分组导航行为，不受桌面侧栏收起模式影响。

#### Scenario: Unpin the desktop sidebar
- **WHEN** 用户在桌面视口点击已钉住侧栏的图钉控制
- **THEN** 系统将图钉显示为未钉住状态，并保持完整侧栏可见，主功能区布局暂不改变

#### Scenario: Collapse after pointer leaves an unpinned sidebar
- **WHEN** 桌面侧栏处于未钉住但仍完整显示的状态，且用户将鼠标移出侧栏区域
- **THEN** 系统只在左侧保留窄竖条，并让主功能区扩展使用更大的可用宽度和适用的更大工作区高度

#### Scenario: Temporarily reveal collapsed navigation by pointer
- **WHEN** 桌面侧栏处于收起模式且用户将鼠标移入左侧窄竖条
- **THEN** 系统临时显示包含背景的完整左侧导航作为覆盖层，且主功能区尺寸保持不变

#### Scenario: Hide temporary navigation after pointer leaves
- **WHEN** 桌面侧栏处于收起模式、完整导航因鼠标触发而临时显示，且用户将鼠标移出窄竖条和导航覆盖层
- **THEN** 系统恢复仅显示左侧窄竖条的收起呈现，主功能区尺寸保持不变

#### Scenario: Pin the desktop sidebar from temporary reveal
- **WHEN** 用户在临时展开的桌面侧栏中点击未钉住的图钉控制
- **THEN** 系统恢复完整左侧导航占据固定布局宽度、主功能区位于其右侧的钉住展开呈现

#### Scenario: Start a new page session
- **WHEN** 用户刷新页面或开启新的页面会话
- **THEN** 系统默认显示钉住展开的桌面侧栏，而不恢复此前的未钉住或收起选择

#### Scenario: Keep mobile navigation unchanged
- **WHEN** 用户在移动视口浏览应用
- **THEN** 系统显示现有移动分组导航，不显示桌面侧栏收起竖条或桌面侧栏覆盖层
