# Dev Toolbox

一个完全在浏览器本地运行的开发者工具箱，包含 Base64、MD5、SHA-1、RSA、时间戳与 ISO 8601、URL 编解码。应用没有后端接口、账号、分析追踪或数据持久化。

## 本地开发

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

## 质量检查

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

生产静态文件输出到 `dist/`，可部署到任意静态托管服务。生产环境应启用 HTTPS；Web Crypto API 与剪贴板 API 在不安全上下文中可能不可用。所有依赖均打包进静态资源，资源加载完成后，各项转换不依赖网络。

## 运行时工具开关

部署时可覆盖与 `index.html` 同目录的 `toolbox.config.json`，无需重新构建即可控制工具入口。例如：

```json
{
  "tools": {
    "des": true,
    "json": false
  }
}
```

可用工具 ID 为 `aes`、`base64`、`des`、`dice`、`json`、`jwt`、`md5`、`random-number`、`rsa`、`sha`、`sm4`、`timestamp`、`unicode`、`url`。默认仅 `des` 为 `false`，其他工具均为 `true`；未写出的项目沿用默认值，未知 ID 会被忽略。配置请求或 JSON/结构校验失败时会整体使用默认值。

配置文件按页面 base URL 加载，支持部署在子路径。服务器应允许 `toolbox.config.json` 及时重新验证或使用较短缓存时间；应用请求时也会使用 `no-store`。这些开关只隐藏并停止挂载前端工具，不是访问控制或安全边界，不能替代服务器端授权。

## 行为约定

- Base64 输入与输出使用 UTF-8 文本和标准 Base64，不包含 URL-safe 变体。
- URL 工具区分完整 URL 与 URL 组件语义。
- MD5、SHA-1 只用于兼容性或开发检查，不适合密码存储、数字签名或抗碰撞安全场景。
- RSA 使用 2048 位密钥、RSA-OAEP/SHA-256 加解密，以及 RSA-PSS/SHA-256 和 32 字节盐值签名。明文上限为 190 UTF-8 字节。
- RSA 公钥采用 SPKI PEM，私钥采用 PKCS#8 PEM。私钥只存在于当前页面内存，不写入浏览器存储；页面刷新后不可恢复。
- 时间戳支持秒和毫秒、UTC 与浏览器本地时区、自定义格式和严格 ISO 8601 日期时间。ISO 模式支持日期、`T` 分隔时间、三位毫秒、`Z` 与 `±HH:mm` 偏移。

本项目不是生产密钥保险库、文件加密器或证书管理器。处理真实私钥前，请根据你的安全模型使用经过审计的专用工具。
