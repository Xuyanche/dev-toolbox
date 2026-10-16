export const YAML_LEFT = `# 应用配置 · 本地环境
server:
  # 服务端口
  port: 8080
  host: localhost
logging:
  level: info
servers:
  - name: primary
    url: http://localhost:8080
legacy: true
`
export const YAML_RIGHT = `# 应用配置 · 部署环境
logging:
  level: debug
server:
  host: localhost
  # 对外端口
  port: 9090
servers:
  - name: primary
    url: https://example.test
  - name: backup
    url: https://backup.test
timeout: 30
`
export const TEXT_LEFT = '第一行：保持不变\n环境：本地\n旧配置：启用\n最后一行\n'
export const TEXT_RIGHT = '第一行：保持不变\n环境：部署\n最后一行\n新配置：启用\n'
