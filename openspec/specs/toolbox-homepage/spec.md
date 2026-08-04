# toolbox-homepage Specification

## Purpose

为开发者工具箱提供清晰、可访问的统一介绍入口，使用户在进入具体工具前了解主要能力、本地处理原则，并能从任意工具快速返回该入口。

## Requirements
### Requirement: Homepage introduction
系统 SHALL 提供独立的介绍首页，清楚展示工具箱名称、用途、六个主要工具分类概览以及所有处理均在浏览器本地完成的隐私说明。

#### Scenario: View the introduction homepage
- **WHEN** 用户打开介绍首页
- **THEN** 系统展示工具箱介绍、六个分类的能力概览和本地处理说明，且不显示任一具体工具页面

#### Scenario: View the homepage on a narrow viewport
- **WHEN** 用户在窄视口打开介绍首页
- **THEN** 介绍内容保持可读且不要求页面横向滚动，移动工具导航仍可用于进入任一工具

### Requirement: Homepage is the initial destination
系统 SHALL 在新的页面会话首次加载或刷新应用时默认显示介绍首页，并 SHALL 不将任一具体工具标记为当前项。

#### Scenario: Start a fresh session
- **WHEN** 用户首次加载或刷新应用
- **THEN** 系统显示介绍首页，桌面分类初始全部收起，桌面和移动导航均没有具体工具带有当前项状态

### Requirement: Brand returns to homepage
系统 SHALL 将当前视口中显示的左上角品牌标识区域提供为具有可识别名称的首页操作，并 SHALL 支持指针和键盘激活。

#### Scenario: Return from a tool by activating the brand
- **WHEN** 用户正在查看任一工具并激活左上角品牌入口
- **THEN** 系统显示介绍首页、移除具体工具的当前项状态并收起桌面工具分类

#### Scenario: Activate the brand with a keyboard
- **WHEN** 键盘焦点位于品牌入口且用户按 Enter 或 Space
- **THEN** 系统执行与点击品牌入口相同的返回首页行为并保留可见焦点样式

### Requirement: Preserve tool state across homepage navigation
系统 SHALL 在当前页面会话内保留已访问工具的组件状态，返回介绍首页不得重置工具输入或结果。

#### Scenario: Return to a previously used tool
- **WHEN** 用户在工具中输入内容、返回介绍首页后再次进入该工具
- **THEN** 系统恢复该工具离开前的会话内状态
