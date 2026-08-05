## MODIFIED Requirements

### Requirement: Homepage introduction
系统 SHALL 提供独立的介绍首页，清楚展示工具箱名称、用途、当前至少包含一个启用工具的主要分类概览以及所有处理均在浏览器本地完成的隐私说明。首页能力目录 SHALL 使用与桌面导航、移动导航和内容挂载相同的运行时启用工具集合，并 SHALL NOT 宣传已关闭的工具或空分类。

#### Scenario: View the introduction homepage
- **WHEN** 用户打开介绍首页
- **THEN** 系统展示工具箱介绍、当前非空分类的能力概览和本地处理说明，且不显示任一具体工具页面

#### Scenario: Reflect runtime tool availability
- **WHEN** 运行时配置关闭一个或多个工具
- **THEN** 首页目录不列出被关闭的工具，并省略不再包含启用工具的分类
- **AND** 首页所呈现的工具集合与桌面、移动导航一致

#### Scenario: View the homepage on a narrow viewport
- **WHEN** 用户在窄视口打开介绍首页
- **THEN** 介绍内容保持可读且不要求页面横向滚动，移动工具导航仍可用于进入任一启用工具
