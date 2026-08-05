## Purpose

为维护者提供可重复的一键 Windows 发布流程，将前端构建结果和 Go 启动器组合成最终用户可直接解压运行的便携发布包。

## ADDED Requirements

### Requirement: One-command release build
项目 SHALL 提供可从仓库根目录执行的 PowerShell 打包脚本，该脚本 SHALL 依次完成依赖校验、前端生产构建、资源暂存、Windows Go 可执行文件构建和发布压缩包生成。

#### Scenario: Build a release successfully
- **WHEN** 维护者在具备受支持 Node.js、npm 和 Go 工具链的源码目录运行打包脚本
- **THEN** 脚本使用当前源码重新构建前端和启动器，并在明确的发布目录生成便携压缩包

#### Scenario: Report a missing build prerequisite
- **WHEN** Node.js、npm、Go 或必要项目文件不可用
- **THEN** 脚本指出缺失项、中止后续步骤并以非零状态退出

#### Scenario: Stop after a failed build step
- **WHEN** 前端构建、资源暂存、Go 构建或压缩中的任一步骤失败
- **THEN** 脚本停止执行、保留原始失败信息且不宣称发布成功

### Requirement: Portable release contents
发布包 SHALL 至少包含 Windows AMD64 可执行文件、可供用户编辑的默认 `toolbox.config.json` 和简明启动说明，最终用户 SHALL 能够在解压后直接启动应用。

#### Scenario: Run the extracted package
- **WHEN** Windows AMD64 用户将发布包解压到普通可写目录并启动其中的可执行文件
- **THEN** 应用以默认设置启动，而无需项目源码或构建工具链

#### Scenario: Retain an embedded fallback
- **WHEN** 用户删除或未携带发布包中的外部 `toolbox.config.json`
- **THEN** 可执行文件仍包含足以启动完整应用的静态资源和默认运行时配置

### Requirement: Release output isolation
打包产生的暂存资源、可执行文件和压缩包 SHALL 位于约定的生成目录中，且 SHALL NOT 被当作项目源文件提交。

#### Scenario: Complete a release build
- **WHEN** 打包脚本执行成功
- **THEN** 所有生成物位于约定的暂存或发布目录，并可由维护者安全地重新生成

