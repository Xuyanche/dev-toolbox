import { useState, type ReactNode } from 'react'
import { EncodingTool } from '../features/encoding/EncodingTool'
import { HashTool } from '../features/hash/HashTool'
import { RsaTool } from '../features/rsa/RsaTool'
import { TimestampTool } from '../features/timestamp/TimestampTool'

type ToolId = 'base64' | 'md5' | 'sha1' | 'rsa' | 'timestamp' | 'url'

interface ToolDefinition {
  id: ToolId
  name: string
  short: string
  icon: string
  element: ReactNode
}

interface ToolGroup {
  id: 'asymmetric' | 'digest' | 'time' | 'encoding'
  name: string
  tools: ToolDefinition[]
}

const toolGroups: ToolGroup[] = [
  {
    id: 'asymmetric',
    name: '非对称加密',
    tools: [
      { id: 'rsa', name: 'RSA', short: '加密与签名', icon: 'RS', element: <RsaTool /> },
    ],
  },
  {
    id: 'digest',
    name: '摘要算法',
    tools: [
      { id: 'md5', name: 'MD5', short: '消息摘要', icon: 'M5', element: <HashTool algorithm="MD5" /> },
      { id: 'sha1', name: 'SHA-1', short: '消息摘要', icon: 'S1', element: <HashTool algorithm="SHA-1" /> },
    ],
  },
  {
    id: 'time',
    name: '时间工具',
    tools: [
      { id: 'timestamp', name: '时间戳', short: 'ISO 与日期', icon: 'TS', element: <TimestampTool /> },
    ],
  },
  {
    id: 'encoding',
    name: '编码工具',
    tools: [
      { id: 'url', name: 'URL 编解码', short: '百分号编码', icon: '%', element: <EncodingTool kind="url" /> },
      { id: 'base64', name: 'Base64', short: '文本编解码', icon: 'B64', element: <EncodingTool kind="base64" /> },
    ],
  },
]

const tools = toolGroups.flatMap((group) => group.tools)

export function App() {
  const [active, setActive] = useState<ToolId>('rsa')
  const cryptoSupported = Boolean(globalThis.crypto?.subtle)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span>&lt;</span><span>/</span><span>&gt;</span></div>
          <div><strong>Dev Toolbox</strong><span>LOCAL UTILITIES</span></div>
        </div>
        <nav aria-label="工具导航">
          {toolGroups.map((group) => (
            <section className="nav-group" role="group" aria-labelledby={`desktop-group-${group.id}`} key={group.id}>
              <span className="nav-group-label" id={`desktop-group-${group.id}`}>{group.name}</span>
              <div className="nav-group-tools">
                {group.tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={`nav-item ${active === tool.id ? 'active' : ''}`}
                    aria-current={active === tool.id ? 'page' : undefined}
                    onClick={() => setActive(tool.id)}
                  >
                    <span className="nav-icon" aria-hidden="true">{tool.icon}</span>
                    <span><strong>{tool.name}</strong><small>{tool.short}</small></span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <div className="privacy-card">
          <span className="privacy-dot" />
          <div><strong>本地处理</strong><span>数据不会离开浏览器</span></div>
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-header">
          <div className="brand"><div className="brand-mark" aria-hidden="true">&lt;/&gt;</div><strong>Dev Toolbox</strong></div>
          <span className="local-pill">● LOCAL</span>
        </div>
        <div className="mobile-nav" role="navigation" aria-label="移动工具导航">
          {toolGroups.map((group) => (
            <section className="mobile-nav-group" role="group" aria-labelledby={`mobile-group-${group.id}`} key={group.id}>
              <span className="mobile-group-label" id={`mobile-group-${group.id}`}>{group.name}</span>
              <div className="mobile-group-tools">
                {group.tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={active === tool.id ? 'active' : ''}
                    aria-current={active === tool.id ? 'page' : undefined}
                    onClick={() => setActive(tool.id)}
                  >
                    {tool.name}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        {!cryptoSupported ? (
          <div className="notice notice-danger" role="alert"><strong>浏览器能力不足</strong><span>SHA-1 和 RSA 需要 Web Crypto API，请通过 HTTPS 使用现代浏览器。</span></div>
        ) : null}
        {tools.map((tool) => (
          <section key={tool.id} hidden={active !== tool.id} aria-label={tool.name}>
            {tool.element}
          </section>
        ))}
        <footer><span>Dev Toolbox · 所有操作均在本地完成</span><span>无需账号 · 无上传 · 无追踪</span></footer>
      </main>
    </div>
  )
}
