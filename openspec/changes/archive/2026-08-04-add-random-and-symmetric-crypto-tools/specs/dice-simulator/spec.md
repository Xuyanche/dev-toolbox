## Purpose

提供完全在浏览器本地运行的多面骰子配置和投掷能力，让用户能够通过可视控件或标准骰子表达式快速构造组合，并清楚核对单颗结果与合计点数。

## ADDED Requirements

### Requirement: Initial dice combination
系统 SHALL 在色子模拟器首次显示时默认配置 1 颗 d6，并 SHALL 在可视数量控件、当前组合摘要和表达式文本框中一致呈现为 `1d6`。

#### Scenario: Open the dice simulator for the first time
- **WHEN** 用户在新的页面会话中首次打开色子模拟器
- **THEN** d6 数量为 1、其他骰子数量为 0，表达式和当前组合均显示 `1d6`

### Requirement: Visual dice combination
系统 SHALL 提供 d2、d6、d8、d10、d12、d20、d100 七种骰子的可视选择控件，并 SHALL 允许用户为每种骰子增加或减少非负整数数量，以构造包含任意已支持面数和数量的组合。系统 SHALL 在表达式“应用”操作右侧提供“清空色子”操作，用于将所有骰子数量和表达式清空。

#### Scenario: Build a mixed dice pool visually
- **WHEN** 用户通过可视控件选择 2 颗 d6 和 1 颗 d20
- **THEN** 当前骰子组合显示 `2d6 + 1d20`，并可用于下一次投掷

#### Scenario: Remove dice from the pool
- **WHEN** 用户将某一面数的骰子数量减少到 0
- **THEN** 该面数不再包含在当前投掷组合中，且数量不会变为负数

#### Scenario: Clear the dice pool
- **WHEN** 用户选择“清空色子”
- **THEN** 所有骰子数量变为 0、表达式变为空且当前组合显示尚未选择

### Requirement: Dice expression quick selection
系统 SHALL 提供文本框接受不区分大小写的 `NdS` 骰子表达式，其中 N 为正整数、S 为受支持的面数；系统 SHALL 至少支持 `2d6` 单项输入，并 SHALL 支持使用 `+` 连接多个骰子项以快速配置混合组合。

#### Scenario: Apply a single dice expression
- **WHEN** 用户输入 `2d6` 并应用表达式
- **THEN** 可视配置同步为 2 颗 d6，替换此前组合

#### Scenario: Apply a mixed dice expression
- **WHEN** 用户输入 `2d6 + 1D20` 并应用表达式
- **THEN** 可视配置同步为 2 颗 d6 和 1 颗 d20

#### Scenario: Reject an invalid dice expression
- **WHEN** 用户应用数量为零、面数不受支持、语法不完整或含有无法识别内容的表达式
- **THEN** 系统显示可理解的校验错误且不投掷、不覆盖上一个有效组合

### Requirement: Dice roll results
系统 SHALL 在用户投掷非空组合时为每颗骰子生成 1 至其面数之间的整数结果，并 SHALL 按骰子类型展示每颗骰子的结果，同时在结果旁明确展示所有结果的总点数和清空结果操作。总点数和清空结果操作 SHALL 在标题操作区内垂直居中对齐。

#### Scenario: Roll a configured combination
- **WHEN** 用户投掷由 2 颗 d6 和 1 颗 d20 组成的组合
- **THEN** 系统展示两个 1–6 范围的 d6 结果、一个 1–20 范围的 d20 结果，以及三颗骰子结果之和

#### Scenario: Attempt to roll an empty combination
- **WHEN** 当前所有骰子数量均为 0 且用户请求投掷
- **THEN** 系统提示用户先选择骰子且不生成结果

#### Scenario: Clear dice results
- **WHEN** 用户已有投掷结果并选择清空结果
- **THEN** 系统移除逐颗结果和总点数，但保留当前骰子组合与表达式

### Requirement: Compact dice controls
系统 SHALL 将表达式控件放置在“选择骰子”面板标题区域的右侧，并 SHALL 在桌面宽度下将其控制在面板约四分之一宽度；每种骰子的数量控件 SHALL 使用适合短整数的紧凑宽度，并在窄视口下回流为可完整操作的布局。

#### Scenario: View dice controls on desktop
- **WHEN** 用户在桌面视口打开色子模拟器
- **THEN** 表达式控件位于面板右上且不会挤压骰子选择区，七个数量控件保持紧凑对齐

#### Scenario: View dice controls on a narrow viewport
- **WHEN** 用户在窄视口打开色子模拟器
- **THEN** 表达式和数量控件回流后仍完整可见、可聚焦且可操作

### Requirement: Unbiased local dice randomness
系统 SHALL 使用浏览器提供的密码学安全随机源和无取模偏差的范围映射生成骰子结果，并 MUST 在本地完成投掷而不传输组合或结果。

#### Scenario: Roll without network transmission
- **WHEN** 用户执行任意有效骰子投掷
- **THEN** 结果由当前浏览器会话本地生成，应用不因该操作发起网络请求
