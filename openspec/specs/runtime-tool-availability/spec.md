# runtime-tool-availability Specification

## Purpose

允许静态部署的工具箱在不重新构建前端资源的情况下，通过服务器提供的运行时配置统一控制工具页面是否可用，同时保持导航、首页和内容区域的一致性。

## Requirements

### Requirement: Runtime tool availability configuration
系统 SHALL 在应用启动时读取部署环境提供的工具可用性配置，并 SHALL 接受以已知工具标识为键、布尔值为值的部分工具映射。缺失的工具项 SHALL 使用内置默认值；未知工具标识 SHALL 被忽略。内置默认值 SHALL 关闭 DES，并 SHALL 开启其他已注册工具。

#### Scenario: Apply a valid partial runtime configuration
- **WHEN** 部署配置为一个或多个已知工具提供布尔开关
- **THEN** 系统使用配置值覆盖对应内置默认值，并对未列出的工具保留默认值

#### Scenario: Use built-in defaults without configuration
- **WHEN** 运行时配置文件不存在、无法读取或不包含工具映射
- **THEN** 系统使用内置默认值启动，DES 不可用且其他已注册工具保持可用

#### Scenario: Reject malformed configuration safely
- **WHEN** 配置文件不是有效 JSON，或工具映射包含非布尔开关
- **THEN** 系统不应用含义不明确的值，并使用完整内置默认值完成启动

### Requirement: Consistent enabled-tool presentation
系统 SHALL 在配置解析完成后才呈现工具目录，并 SHALL 使用同一个已启用工具集合驱动桌面导航、移动导航、首页能力目录和工具内容挂载。系统 SHALL 隐藏没有任何启用工具的分类，并 SHALL 保持剩余分类与工具的既有相对顺序。

#### Scenario: Hide a disabled tool everywhere
- **WHEN** 某个工具在有效配置或内置默认值中被关闭
- **THEN** 该工具不出现在桌面导航、移动导航或首页能力目录中，且其工具组件不被挂载

#### Scenario: Hide an empty category
- **WHEN** 一个分类下的全部工具均被关闭
- **THEN** 系统在桌面导航、移动导航和首页能力目录中省略该分类

#### Scenario: Avoid a disabled-tool loading flash
- **WHEN** 应用首次加载且运行时配置尚未解析完成
- **THEN** 系统不短暂呈现随后会被配置关闭的工具入口或内容

#### Scenario: Recover when the active tool becomes unavailable
- **WHEN** 当前工具不再属于已启用工具集合
- **THEN** 系统返回介绍首页、移除该工具的当前项状态并收起其分类

### Requirement: Configuration privacy boundary
系统 SHALL 仅在应用启动时获取公开的工具可用性配置，且 SHALL NOT 在该请求中包含工具输入、结果、密钥或其他页面会话数据。工具的业务处理 SHALL 继续在浏览器本地完成。

#### Scenario: Load configuration without user data
- **WHEN** 应用请求运行时工具配置
- **THEN** 请求不携带任何工具内容或用户生成数据，配置加载完成后的加解密、转换和生成操作仍不因处理内容发起网络请求

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
