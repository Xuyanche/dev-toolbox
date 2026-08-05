## Purpose

为 Dev Toolbox 提供无需预装 Node.js 或配置 Web 服务器即可运行的本机便携入口，并以明确、可测试的方式约束端口、浏览器启动、资源服务及失败处理行为。

## ADDED Requirements

### Requirement: Self-contained local application service
便携启动器 SHALL 从可执行文件内提供完整的 Dev Toolbox 前端资源，并 SHALL NOT 要求最终用户安装 Node.js、Go、Nginx 或其他应用服务器。

#### Scenario: Start from the distributed executable
- **WHEN** 用户在受支持的 Windows 系统上直接启动发布的可执行文件
- **THEN** 启动器提供可加载的完整 Dev Toolbox 页面，且运行不依赖开发环境或项目源码

#### Scenario: Serve application resources
- **WHEN** 浏览器请求入口页面、脚本、样式或其他已打包资源
- **THEN** 启动器以正确的 HTTP 状态和内容类型返回对应的内嵌资源

### Requirement: Loopback-only listener with configurable port
启动器 SHALL 仅绑定 IPv4 回环地址 `127.0.0.1`，默认 SHALL 监听端口 `15173`，并 SHALL 接受 `--port <port>` 命令行参数覆盖默认端口。端口值 MUST 是 1 至 65535 范围内的整数。

#### Scenario: Start with the default port
- **WHEN** 用户未提供端口参数且 `127.0.0.1:15173` 可用
- **THEN** 应用在 `http://127.0.0.1:15173/` 提供服务

#### Scenario: Override the port
- **WHEN** 用户以 `--port 18080` 启动且该地址可用
- **THEN** 应用在 `http://127.0.0.1:18080/` 提供服务，而不监听默认端口

#### Scenario: Reject an invalid port
- **WHEN** 用户提供非整数、零、负数或大于 65535 的端口值
- **THEN** 启动器输出明确的参数错误、不启动 HTTP 服务并以非零状态退出

#### Scenario: Refuse a non-loopback exposure
- **WHEN** 启动器以默认参数或端口覆盖参数启动
- **THEN** 服务不绑定局域网地址、通配地址或公网地址

### Requirement: Browser launch and process lifetime
启动器 SHALL 在监听成功后自动使用系统默认浏览器打开实际服务 URL，并 SHALL 保持服务运行直至用户中断进程或关闭承载进程的窗口。

#### Scenario: Open the browser after successful startup
- **WHEN** HTTP 监听器成功启动
- **THEN** 启动器打开一次对应本机 URL，并在控制台显示访问地址和停止方式

#### Scenario: Do not open the browser before a failed startup
- **WHEN** 目标端口被占用或监听器无法建立
- **THEN** 启动器不打开浏览器，输出可操作的错误信息并以非零状态退出

#### Scenario: Browser opening fails
- **WHEN** 服务已成功监听但系统无法启动默认浏览器
- **THEN** 启动器继续提供服务，并在控制台显示可手动打开的完整 URL 和警告

### Requirement: Predictable local HTTP behavior
启动器 SHALL 在根路径提供应用入口，对不存在的资源返回 `404`，并 SHALL 对 `toolbox.config.json` 响应声明禁止缓存，以便配置变更在刷新后生效。

#### Scenario: Request an unknown resource
- **WHEN** 客户端请求发布资源集中不存在的文件路径
- **THEN** 服务返回 `404`，且不泄露本机文件系统内容

#### Scenario: Refresh runtime configuration
- **WHEN** 浏览器重新请求 `toolbox.config.json`
- **THEN** 响应包含禁止缓存的指令，使客户端能够获得当前配置内容

