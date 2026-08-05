# dice-simulator Specification

## Purpose

提供完全在浏览器本地运行的多面骰子配置和投掷能力，让用户能够通过可视控件或标准骰子表达式快速构造组合，并清楚核对单颗结果与合计点数。

## Requirements
### Requirement: Initial dice combination
系统 SHALL 在色子模拟器首次显示时默认配置 1 颗 d6，并 SHALL 在可视数量控件、当前组合摘要和表达式文本框中一致呈现为 `1d6`。

#### Scenario: Open the dice simulator for the first time
- **WHEN** 用户在新的页面会话中首次打开色子模拟器
- **THEN** d6 数量为 1、其他骰子数量为 0，表达式和当前组合均显示 `1d6`

### Requirement: Visual integer modifier
系统 SHALL 在可视骰子选择区的右侧提供标记为“补正”的整数输入框。补正 SHALL 可为正整数、负整数或 0，未输入值 SHALL 等价于 0；小数、非数字和超出安全整数范围的值 SHALL 被拒绝且不替换上一个有效配置。

#### Scenario: Set a positive modifier visually
- **WHEN** 用户在补正输入框中输入 `2`，当前骰子为 `1d6`
- **THEN** 当前补正为 `+2`，表达式与当前组合同步为 `1d6 + 2`

#### Scenario: Set a negative modifier visually
- **WHEN** 用户在补正输入框中输入 `-3`，当前骰子为 `1d6`
- **THEN** 当前补正为 `-3`，表达式与当前组合同步为 `1d6 - 3`

#### Scenario: Clear or zero the visual modifier
- **WHEN** 用户清空补正输入框或输入 `0`
- **THEN** 当前补正为 0，规范化表达式和当前组合中不显示补正项

### Requirement: Visual dice combination
系统 SHALL 提供 d2、d6、d8、d10、d12、d20、d100 七种骰子的可视选择控件，并 SHALL 允许用户为每种骰子增加或减少非负整数数量，以构造包含任意已支持面数和数量的组合。系统 SHALL 在表达式“应用”操作右侧提供“清空色子”操作，用于将所有骰子数量、补正和表达式清空。

#### Scenario: Build a mixed dice pool visually
- **WHEN** 用户通过可视控件选择 2 颗 d6 和 1 颗 d20
- **THEN** 当前骰子组合显示 `2d6 + 1d20`，并可用于下一次投掷

#### Scenario: Remove dice from the pool
- **WHEN** 用户将某一面数的骰子数量减少到 0
- **THEN** 该面数不再包含在当前投掷组合中，且数量不会变为负数

#### Scenario: Clear the dice pool and modifier
- **WHEN** 用户选择“清空色子”
- **THEN** 所有骰子数量变为 0、补正恢复为 0、表达式变为空且当前组合显示尚未选择

### Requirement: Dice expression quick selection
系统 SHALL 提供文本框接受不区分大小写的 `NdS` 骰子项与十进制整数补正项组成的表达式。表达式 SHALL 至少包含一个骰子项；骰子项之间只能使用 `+`，整数补正项可使用 `+` 或 `-`。系统 SHALL 将同面骰子数量合并，并 SHALL 将所有整数项的代数和作为唯一补正值；规范化表达式 SHALL 先显示骰子项，再显示最多一个带符号的非零补正项。

#### Scenario: Apply a single dice expression
- **WHEN** 用户输入 `2d6` 并应用表达式
- **THEN** 可视配置同步为 2 颗 d6 且补正为 0，替换此前组合

#### Scenario: Apply a mixed dice expression with a modifier
- **WHEN** 用户输入 `2d6 + 1D20 - 3` 并应用表达式
- **THEN** 可视配置同步为 2 颗 d6、1 颗 d20 和 `-3` 补正

#### Scenario: Sum and normalize multiple modifier terms
- **WHEN** 用户输入 `1d6+3-5` 并应用表达式
- **THEN** 系统将补正计算为 `-2`，并将表达式与当前组合规范化为 `1d6 - 2`

#### Scenario: Omit a zero net modifier
- **WHEN** 用户输入 `1d6+3-3` 并应用表达式
- **THEN** 系统将补正计算为 0，并将表达式与当前组合规范化为 `1d6`

#### Scenario: Reject subtraction of dice
- **WHEN** 用户应用 `2d6 - 1d20`
- **THEN** 系统明确提示骰子只能相加，且不投掷、不覆盖上一个有效组合与补正

#### Scenario: Reject unsupported arithmetic or invalid integers
- **WHEN** 用户应用包含乘法、除法、括号、小数、非数字项、超出安全整数范围的补正，或数量为零/面数不受支持/语法不完整的表达式
- **THEN** 系统显示可理解的校验错误且不投掷、不覆盖上一个有效组合与补正

### Requirement: Dice roll results
系统 SHALL 在用户投掷非空组合时为每颗骰子生成 1 至其面数之间的整数结果，并 SHALL 按骰子类型展示每颗骰子的结果。总点数 SHALL 等于所有骰子结果之和加上投掷时的当前补正；补正非 0 时，系统 SHALL 在骰子结果之后的最后一行显示带符号的补正值，补正为 0 时 SHALL 省略该行。系统 SHALL 在结果旁明确显示总点数和清空结果操作，二者 SHALL 在标题操作区内垂直居中对齐。

#### Scenario: Roll a configured combination with a positive modifier
- **WHEN** 用户投掷由 2 颗 d6、1 颗 d20 和 `+3` 补正组成的配置
- **THEN** 系统展示两个 1–6 范围的 d6 结果、一个 1–20 范围的 d20 结果，并在最后一行显示“补正 `+3`”
- **AND** 总点数等于三颗骰子结果之和加 3

#### Scenario: Roll with a negative modifier
- **WHEN** 用户以 `-3` 补正投掷非空骰子组合
- **THEN** 结果的最后一行显示“补正 `-3`”，总点数等于骰子结果之和减 3

#### Scenario: Roll with no effective modifier
- **WHEN** 用户在补正未输入或为 0 时投掷非空骰子组合
- **THEN** 系统不显示补正结果行，总点数等于所有骰子结果之和

#### Scenario: Preserve the rolled modifier snapshot
- **WHEN** 用户已完成投掷，然后修改或清空当前补正配置
- **THEN** 已显示结果的补正行和总点数保持该次投掷时的值，直到用户再次投掷或清空结果

#### Scenario: Attempt to roll an empty combination
- **WHEN** 当前所有骰子数量均为 0 且用户请求投掷，无论补正是否非 0
- **THEN** 系统提示用户先选择骰子且不生成结果

#### Scenario: Clear dice results
- **WHEN** 用户已有投掷结果并选择清空结果
- **THEN** 系统移除逐颗结果、补正结果行和总点数，但保留当前骰子组合、补正与表达式

### Requirement: Compact dice controls
系统 SHALL 将表达式控件放置在“选择骰子”面板标题区域的右侧，并 SHALL 在桌面宽度下将其控制在面板约四分之一宽度。每种骰子的数量控件 SHALL 使用适合短整数的紧凑宽度；补正整数输入 SHALL 在桌面宽度下位于可视骰子选择区右侧的独立紧凑框中。表达式、骰子数量和补正控件 SHALL 在窄视口下回流为可完整操作且不产生水平页面溢出的布局。

#### Scenario: View dice and modifier controls on desktop
- **WHEN** 用户在桌面视口打开色子模拟器
- **THEN** 表达式控件位于面板右上且不会挤压骰子选择区，七个数量控件保持紧凑对齐
- **AND** 补正框位于骰子选择区右侧，与骰子数量框使用一致的视觉语义

#### Scenario: View dice and modifier controls on a narrow viewport
- **WHEN** 用户在窄视口打开色子模拟器
- **THEN** 表达式、骰子数量和补正控件回流后仍完整可见、可聚焦且可操作，页面不产生水平溢出

### Requirement: Unbiased local dice randomness
系统 SHALL 使用浏览器提供的密码学安全随机源和无取模偏差的范围映射生成骰子结果，并 MUST 在本地完成投掷而不传输组合或结果。

#### Scenario: Roll without network transmission
- **WHEN** 用户执行任意有效骰子投掷
- **THEN** 结果由当前浏览器会话本地生成，应用不因该操作发起网络请求
