## Purpose

提供可配置、可校验且在浏览器本地运行的批量随机数生成能力，覆盖整数、浮点数和不重复结果等常见开发、测试与抽样场景。

## ADDED Requirements

### Requirement: Random number defaults
系统 SHALL 在随机数生成器首次显示时默认配置最小值 1、最大值 100、生成数量 1、数值类型为整数、唯一性为开启。

#### Scenario: Open the generator for the first time
- **WHEN** 用户在新的页面会话中首次打开随机数生成器
- **THEN** 界面显示范围 1–100、数量 1、整数和唯一结果配置

### Requirement: Configurable random generation
系统 SHALL 允许用户设置最小值、最大值、正整数生成数量、整数或浮点数类型以及结果是否唯一，并 SHALL 使用浏览器提供的密码学安全随机源在本地生成结果。

#### Scenario: Generate integers
- **WHEN** 用户选择整数、范围 1–100、数量 5 并生成
- **THEN** 系统展示 5 个大于等于 1 且小于等于 100 的整数

#### Scenario: Generate floating-point values
- **WHEN** 用户选择浮点数、最小值 0、最大值 1、数量 3 并生成
- **THEN** 系统展示 3 个大于等于 0 且小于 1 的有限浮点数

#### Scenario: Generate unique values
- **WHEN** 用户开启唯一性并请求生成多个值
- **THEN** 本次结果集合中不存在两个相同的输出值

#### Scenario: Generate without uniqueness
- **WHEN** 用户关闭唯一性并请求生成多个值
- **THEN** 系统生成指定数量的值且不承诺去除重复项

### Requirement: Random request validation
系统 SHALL 在生成前验证范围、数量、数值类型和唯一性约束，并 SHALL 对无效或不可能完成的请求显示原因而不返回部分结果。

#### Scenario: Reject a reversed or empty range
- **WHEN** 最小值不小于最大值且用户请求生成
- **THEN** 系统显示范围错误且不生成结果

#### Scenario: Reject an invalid quantity
- **WHEN** 数量不是正整数或超过界面声明的单次生成上限
- **THEN** 系统显示数量错误且不生成结果

#### Scenario: Reject an impossible unique integer request
- **WHEN** 用户请求范围 1–3 内的 4 个唯一整数
- **THEN** 系统说明可用整数不足且不返回部分结果

### Requirement: Random result presentation
系统 SHALL 以可读列表展示本次生成的全部结果，并 SHALL 提供一次性复制全部结果和清空结果的操作；新一次成功生成 SHALL 替换上一次结果。生成设置中的范围、数量和类型控件 SHALL 在同一布局行中视觉对齐，生成数量的提示文本不得改变输入框与相邻控件的垂直对齐。

#### Scenario: Copy a generated batch
- **WHEN** 用户成功生成多个随机数并选择复制结果
- **THEN** 系统将完整结果以可复用的文本格式写入剪贴板并提供操作反馈

#### Scenario: Clear a generated batch
- **WHEN** 用户已有随机数结果并选择清空结果
- **THEN** 系统移除结果列表并禁用结果操作，但保留当前生成设置

#### Scenario: View aligned generation controls
- **WHEN** 用户在桌面视口查看生成设置
- **THEN** 最小值、最大值、生成数量和数值类型控件的输入区域沿同一基线排列
