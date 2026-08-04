import { useState, type ReactNode } from 'react'
import { DiceSimulatorTool } from '../features/dice/DiceSimulatorTool'
import { EncodingTool } from '../features/encoding/EncodingTool'
import { HashTool } from '../features/hash/HashTool'
import { HomePage } from '../features/home/HomePage'
import { JsonTool } from '../features/json/JsonTool'
import { JwtTool } from '../features/jwt/JwtTool'
import { RandomNumberGeneratorTool } from '../features/random-number/RandomNumberGeneratorTool'
import { RsaTool } from '../features/rsa/RsaTool'
import { SymmetricCryptoTool } from '../features/symmetric/SymmetricCryptoTool'
import { TimestampTool } from '../features/timestamp/TimestampTool'

type ToolId = 'aes' | 'base64' | 'des' | 'dice' | 'json' | 'jwt' | 'md5' | 'random-number' | 'rsa' | 'sha' | 'sm4' | 'timestamp' | 'url'
type ToolGroupId = 'random' | 'symmetric' | 'asymmetric' | 'digest' | 'time' | 'encoding'

interface ToolDefinition {
  id: ToolId
  name: string
  short: string
  icon: string
  element: ReactNode
}

interface ToolGroup {
  id: ToolGroupId
  name: string
  tools: ToolDefinition[]
}

const toolGroups: ToolGroup[] = [
  {
    id: 'random',
    name: '随机数工具',
    tools: [
      { id: 'dice', name: '色子模拟器', short: '多面骰子组合', icon: 'D', element: <DiceSimulatorTool /> },
      { id: 'random-number', name: '随机数生成器', short: '范围与批量', icon: '#', element: <RandomNumberGeneratorTool /> },
    ],
  },
  {
    id: 'symmetric',
    name: '对称加密',
    tools: [
      { id: 'aes', name: 'AES', short: '现代分组加密', icon: 'AE', element: <SymmetricCryptoTool algorithm='AES' /> },
      { id: 'des', name: 'DES', short: '遗留系统兼容', icon: 'DE', element: <SymmetricCryptoTool algorithm='DES' /> },
      { id: 'sm4', name: 'SM4', short: '国密分组加密', icon: 'S4', element: <SymmetricCryptoTool algorithm='SM4' /> },
    ],
  },
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
      { id: 'sha', name: 'SHA', short: '四种 SHA 摘要', icon: 'S4', element: <HashTool algorithm="SHA" /> },
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
      { id: 'jwt', name: 'JWT', short: '令牌生成与解析', icon: 'JWT', element: <JwtTool /> },
      { id: 'json', name: 'JSON', short: '格式化与转义', icon: '{}', element: <JsonTool /> },
    ],
  },
]

const tools = toolGroups.flatMap((group) => group.tools)

export function App() {
  const [active, setActive] = useState<ToolId | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<ToolGroupId | null>(null)
  const cryptoSupported = Boolean(globalThis.crypto?.subtle)
  const secureRandomSupported = Boolean(globalThis.crypto?.getRandomValues)

  function selectTool(groupId: ToolGroupId, toolId: ToolId) {
    setExpandedGroup(groupId)
    setActive(toolId)
  }

  function showHome() {
    setActive(null)
    setExpandedGroup(null)
  }

  return (
    <div className='app-shell'>
      <aside className="sidebar">
        <button className='brand brand-home' type='button' aria-label='返回介绍首页' onClick={showHome}>
          <div className="brand-mark" aria-hidden="true"><span>&lt;</span><span>/</span><span>&gt;</span></div>
          <div><strong>Dev Toolbox</strong><span>LOCAL UTILITIES</span></div>
        </button>
        <nav aria-label='工具导航'>
          {toolGroups.map((group) => (
            <section className='nav-group' role='group' aria-labelledby={`desktop-group-${group.id}`} key={group.id}>
              <button
                className='nav-group-toggle'
                id={`desktop-group-${group.id}`}
                type='button'
                aria-expanded={expandedGroup === group.id}
                aria-controls={`desktop-tools-${group.id}`}
                onClick={() => setExpandedGroup((current) => current === group.id ? null : group.id)}
              >
                <span className='nav-group-title'>{group.name}</span>
                <span className='nav-group-chevron' aria-hidden='true'>
                  <svg viewBox='0 0 16 16' focusable='false'><path d='M3 5.5 8 10.5 13 5.5' /></svg>
                </span>
              </button>
              <div className='nav-group-tools' id={`desktop-tools-${group.id}`} hidden={expandedGroup !== group.id}>
                {group.tools.map((tool) => (
                  <button
                    key={tool.id}
                    type='button'
                    className={`nav-item ${active === tool.id ? 'active' : ''}`}
                    aria-current={active === tool.id ? 'page' : undefined}
                    onClick={() => selectTool(group.id, tool.id)}
                  >
                    <span className='nav-icon' aria-hidden='true'>{tool.icon}</span>
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
          <button className='brand brand-home' type='button' aria-label='返回介绍首页' onClick={showHome}><div className="brand-mark" aria-hidden="true">&lt;/&gt;</div><strong>Dev Toolbox</strong></button>
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
                    onClick={() => selectTool(group.id, tool.id)}
                  >
                    {tool.name}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        {!secureRandomSupported ? (
          <div className='notice notice-danger' role='alert'><strong>安全随机源不可用</strong><span>色子模拟器和随机数生成器需要浏览器安全随机 API，不会降级使用 Math.random()。</span></div>
        ) : null}
        {!cryptoSupported ? (
          <div className="notice notice-danger" role="alert"><strong>浏览器能力不足</strong><span>SHA、RSA 和 JWT 需要 Web Crypto API，请通过 HTTPS 使用现代浏览器。</span></div>
        ) : null}
        {active === null ? <HomePage /> : null}
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
