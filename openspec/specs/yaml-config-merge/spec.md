# yaml-config-merge Specification

## Purpose

用 YAML 结构能力辅助三栏文本融合，提供字段顺序对齐、附属注释与源文档保护及结果校验，让用户减少配置顺序差异带来的阅读成本并保留完整草稿。

## Requirements

### Requirement: Reorder mapping keys by left reference
系统 SHALL 提供右侧“按左侧顺序排列”与“恢复原始顺序”。重排 SHALL 按同路径映射的左侧字段顺序递归排列公共字段，右独有字段按其原顺序追加；不修改配置值，不补入缺失字段，不删除右独有字段，不进入或重排列表。原始右来源 SHALL 保留。

#### Scenario: Reorder nested mapping fields
- **WHEN** 左右 server 及其内部字段顺序不同
- **THEN** 右侧公共字段按左侧顺序展示，各值及独有字段保持，列表顺序不变

### Requirement: Preserve comments and representation during reorder
重排 SHALL 移动完整字段源片段及其附属注释，保留文档头尾和原有标量表示。独立分组说明或不安全的流式父映射 SHALL 跳过该级重排并解释位置，不猜测归属。重排后 SHALL 校验配置签名未变化，失败保留旧候选与草稿。

#### Scenario: Preserve an ambiguous group note
- **WHEN** 父映射中存在隔有空行的独立说明块
- **THEN** 系统保留该父级顺序并提示，可继续重排安全的嵌套映射

### Requirement: Formatting is separate from ordering
系统 SHALL 将格式化作为独立显式操作，不在重排时顺便格式化；格式化和重排均 SHALL 可撤销。结构变换支持单文档、核心 schema 标量键映射、标量及列表；映射键 SHALL 按类型和值匹配，数字和同名字符串 SHALL 区分，右侧键的原始写法 SHALL 保留。错误、重复键、锚点/别名、合并键、自定义标签和列表/对象复杂键 SHALL 保留原文并给出原因；结构错误 SHALL 标出实际节点位置与来源侧，不静默展开内容。

#### Scenario: Reorder numeric configuration keys
- **WHEN** 配置包含数字 `1` 与字符串 `"1"`，两侧顺序不同
- **THEN** 对应键与其子映射按类型和值匹配重排，值及附属注释保留，两个键互不覆盖

#### Scenario: Reject an unsupported reorder
- **WHEN** 用户尝试重排包含别名的文档
- **THEN** 系统解释暂不支持并保留原文和结果，文本查看及手工编辑仍可使用

### Requirement: Validate result without discarding edits
系统 SHALL 在结果修改后检查 YAML 语法，错误期间保留全文、撤销和草稿导出并显示位置；自动采用及完成状态暂停，修复后恢复。所有文本差异已决策且结果有效时 SHALL 允许完整结果导出。

#### Scenario: Repair a partial merge
- **WHEN** 一次文本块采用造成暂时无效 YAML，用户随后修正
- **THEN** 草稿不丢失，诊断显示并在修复后消失，操作可继续
