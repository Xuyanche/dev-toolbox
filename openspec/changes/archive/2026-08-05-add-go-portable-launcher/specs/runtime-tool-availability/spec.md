## ADDED Requirements

### Requirement: Portable launcher configuration source
便携启动器 SHALL 在请求运行时工具配置时优先读取其可执行文件同目录下的 `toolbox.config.json`；当该文件不存在或无法读取时，启动器 SHALL 返回可执行文件内嵌的构建时默认配置。配置内容的结构校验和默认值行为 SHALL 继续遵循现有运行时工具可用性规则。

#### Scenario: Use an external portable configuration
- **WHEN** 可执行文件同目录存在可读取的 `toolbox.config.json`
- **THEN** 启动器向前端返回该外部文件的当前内容，而无需重新构建可执行文件

#### Scenario: Fall back to the embedded configuration
- **WHEN** 可执行文件同目录不存在可读取的 `toolbox.config.json`
- **THEN** 启动器返回构建时内嵌的默认配置，应用能够按现有默认值完成启动

#### Scenario: Handle malformed external configuration safely
- **WHEN** 外部 `toolbox.config.json` 可读取但内容无效
- **THEN** 前端按照现有配置解析规则整体使用内置工具默认值，不应用含义不明确的开关

