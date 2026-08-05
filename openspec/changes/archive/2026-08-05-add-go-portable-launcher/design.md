## Context

当前项目由 Vite 生成静态 `dist/`，运行时还会从站点根目录加载 `toolbox.config.json`。现有应用没有服务端业务、持久化或客户端路由，因此启动器只需安全地提供静态文件和可覆盖配置。发布目标是无需安装运行时的 Windows AMD64 便携包；构建机可以增加 Go 工具链依赖。

## Goals / Non-Goals

**Goals:**

- 生成包含全部前端资源的单个 Windows 可执行文件，并保留同目录配置覆盖能力。
- 将服务限制在 `127.0.0.1`，使用稳定的默认端口 `15173` 和明确的 `--port` 覆盖方式。
- 让维护者通过一个 PowerShell 脚本获得可直接分发的 ZIP 包。
- 保持启动、静态服务、参数校验和失败路径可由 Go 单元测试验证。

**Non-Goals:**

- 不将应用改造成 Electron、Tauri 或原生 WebView 桌面界面。
- 不提供局域网或公网监听、TLS、身份验证、系统服务安装或自动更新。
- 不在本变更中提供安装器、托盘图标、Windows 代码签名或非 Windows 发布物。

## Decisions

### Use a Go standard-library launcher

启动器使用 Go 标准库的 `embed`、`net/http`、`flag`、`os/exec` 和信号处理能力，不引入第三方 Go 依赖。Go 能生成无外部运行时依赖的单文件程序，产物明显小于完整浏览器运行时方案，也比依赖用户安装 Node.js 的脚本更符合便携交付目标。

替代方案包括 Electron（桌面体验完整但包体和改造成本高）、Tauri（包体较小但引入 Rust/WebView 构建复杂度）以及 Node 打包器（仍会携带较大的 Node 运行时并增加打包兼容问题）。

### Stage Vite output below the launcher package before embedding

Go 的嵌入规则不能引用包目录之外的 `../dist`。打包脚本先运行现有 `npm run build`，再把 `dist/` 同步到启动器包下的生成型 `web/` 目录，最后执行 Go 构建。`web/` 和 `release/` 纳入忽略规则；源码中保留最小占位资源，确保未执行完整打包时 Go 包仍可编译和测试。

脚本每次构建都重建并重新暂存资源，避免旧前端文件混入新发布物。直接提交一份 `dist/` 副本被否决，因为它会制造重复的源事实并容易过期。

### Bind a fixed loopback endpoint and validate the port before listening

监听地址固定拼接为 `127.0.0.1:<port>`，CLI 仅暴露 `--port`。默认值为 `15173`；解析后显式验证 1–65535，监听失败直接返回非零退出码，不自动寻找随机端口。固定默认端口方便书签和运维说明，而失败而非静默换端口能让命令行行为保持可预测。

不提供 `--host`，以免便携工具被意外暴露给局域网。`localhost`/回环来源同时满足现代浏览器对 Web Crypto 等能力的安全上下文要求。

### Open the browser only after the listener is ready

程序先创建监听器，再输出 URL 并通过 Windows 系统命令交给默认浏览器。浏览器命令失败只产生警告，因为 HTTP 服务仍可手动访问；监听失败则不会尝试打开浏览器。服务响应 Ctrl+C/终止信号并进行有界的优雅关闭。

浏览器启动封装为可替换函数，服务器处理器从可注入文件系统构造，以便测试时不真正打开浏览器或占用固定端口。

### Prefer an external runtime config without exposing arbitrary files

静态资源只来自嵌入文件系统。唯一允许读取的本机路径是由 `os.Executable` 确定的同目录、固定文件名 `toolbox.config.json`；请求路径不能映射到任意磁盘文件。若外部文件不存在或不可读，处理器回退到内嵌配置，并为配置响应设置 `Cache-Control: no-store`。

启动器不复制前端的 JSON 结构校验逻辑：它只提供字节，现有前端解析器负责无效 JSON、未知 ID 和非布尔值回退，从而避免两套规则漂移。

### Produce an isolated Windows AMD64 ZIP release

根目录 PowerShell 脚本负责检查命令、执行 `npm ci`（可提供跳过依赖恢复的维护者参数）、运行前端质量门槛和生产构建、暂存资源、以 `GOOS=windows`/`GOARCH=amd64` 构建精简 EXE，并将 EXE、默认配置和最终用户说明压缩至 `release/`。脚本使用 `$PSScriptRoot` 定位仓库，避免依赖调用者当前目录。

发布脚本在任何外部命令返回非零时立即失败，并仅在 ZIP 完成后报告成功。固定输出名称便于重复构建；覆盖范围仅限脚本拥有的明确生成目录和文件。

## Risks / Trade-offs

- [未签名 EXE 可能触发 Windows SmartScreen] → 在发布说明中明确提示；公开分发前另行加入代码签名流程。
- [默认端口可能被占用] → 输出包含地址和 `--port` 示例的明确错误，不静默选择不可预测端口。
- [外部配置可被同机用户修改] → 配置仅控制非安全性的工具展示开关，文档继续声明其不是授权边界。
- [构建暂存目录可能残留旧文件] → 脚本只清理并重建明确的 `launcher/web` 生成目录，随后验证入口和配置存在再编译。
- [自动打开浏览器依赖 Windows shell 关联] → 失败时保持服务器运行并打印可复制 URL。
- [当前发布只覆盖 AMD64 Windows] → Go 结构保持可交叉编译，但其他架构和操作系统产物留给后续变更。

## Migration Plan

1. 添加 Go 启动器、测试、最小嵌入占位资源和模块定义，不改变现有 `npm run dev` 或静态部署流程。
2. 添加发布脚本、发布说明和忽略规则，在构建机安装受支持 Go 版本后生成首个 ZIP。
3. 对生成的 EXE 验证默认端口、覆盖端口、外部配置、端口冲突和离线加载。
4. 保留现有 `dist/` 静态发布方式作为回滚路径；若便携包出现问题，只需停止分发该 ZIP，不影响 Web 构建和部署。
