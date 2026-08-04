# toolbox-shell Specification

## Purpose

为各类开发者工具提供统一、响应式且保护隐私的前端容器，使用户能够快速切换能力、操作结果并理解成功或失败状态。

## Requirements

### Requirement: Tool navigation
系统 SHALL 通过清晰的导航提供 Base64、MD5、SHA-1、RSA、时间戳和 URL 工具，并 SHALL 明确标识当前工具。

#### Scenario: Switch tools
- **WHEN** 用户从导航中选择另一个工具
- **THEN** 系统显示所选工具的输入、设置和输出区域并更新当前选中状态

### Requirement: Common result actions
系统 SHALL 为适用的文本结果提供复制和清空操作，并 SHALL 为可逆的转换工具提供交换输入输出的操作。

#### Scenario: Copy a result
- **WHEN** 用户复制一个非空结果且浏览器允许剪贴板访问
- **THEN** 系统将完整结果写入剪贴板并显示成功反馈

#### Scenario: Clipboard access fails
- **WHEN** 浏览器拒绝剪贴板访问
- **THEN** 系统显示可理解的失败反馈且继续保留结果供手动复制

#### Scenario: Clear a tool
- **WHEN** 用户执行清空操作
- **THEN** 系统清除当前工具的输入、输出和瞬时错误，不影响其他工具

### Requirement: Local-only processing
系统 SHALL 在浏览器本地完成所有转换和密码操作，并 MUST NOT 将工具输入、输出或密钥发送到远程服务。

#### Scenario: Perform an operation offline
- **WHEN** 应用静态资源已加载且网络不可用
- **THEN** 用户仍可执行所有工具操作

### Requirement: Sensitive key lifecycle
系统 SHALL 默认仅在当前页面会话内保存 RSA 私钥状态，并 MUST NOT 将私钥写入本地存储、会话存储或日志。

#### Scenario: Reload after generating a private key
- **WHEN** 用户生成或导入私钥后重新加载页面
- **THEN** 系统不从浏览器持久存储中恢复该私钥

### Requirement: Responsive and accessible operation
系统 SHALL 在常见桌面和移动视口中保持所有核心操作可用，并 SHALL 为表单控件、状态信息和键盘操作提供可识别的语义。

#### Scenario: Use the toolbox on a narrow viewport
- **WHEN** 用户在移动设备宽度下打开任一工具
- **THEN** 输入、设置、主要操作和结果保持可见且无需横向滚动页面

#### Scenario: Navigate with a keyboard
- **WHEN** 用户仅使用键盘浏览和操作工具
- **THEN** 所有交互控件均可聚焦、具有可见焦点且能以键盘触发

