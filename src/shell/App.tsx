import { useEffect, useMemo, useState } from 'react'
import { HomePage } from '../features/home/HomePage'
import {
  DEFAULT_TOOL_AVAILABILITY,
  getEnabledToolGroups,
  type ToolAvailability,
  type ToolGroupId,
  type ToolId,
} from './toolRegistry'

type SidebarMode = 'pinned' | 'unpinned-open' | 'collapsed' | 'peeking'

const FOCUS_TOOL_IDS = new Set<ToolId>(['aes', 'base64', 'des', 'json', 'jwt', 'sm4', 'unicode', 'url'])

export function App({ availability = DEFAULT_TOOL_AVAILABILITY }: { availability?: ToolAvailability }) {
  const [active, setActive] = useState<ToolId | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<ToolGroupId | null>(null)
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('pinned')
  const toolGroups = useMemo(() => getEnabledToolGroups(availability), [availability])
  const tools = useMemo(() => toolGroups.flatMap((group) => group.tools), [toolGroups])
  const cryptoSupported = Boolean(globalThis.crypto?.subtle)
  const secureRandomSupported = Boolean(globalThis.crypto?.getRandomValues)
  const sidebarPinned = sidebarMode === 'pinned'
  const sidebarVisible = sidebarMode !== 'collapsed'
  const toolFocusMode = active !== null && FOCUS_TOOL_IDS.has(active) && cryptoSupported && secureRandomSupported

  useEffect(() => {
    if (active && !tools.some((tool) => tool.id === active)) {
      setActive(null)
      setExpandedGroup(null)
      return
    }
    if (expandedGroup && !toolGroups.some((group) => group.id === expandedGroup)) {
      setExpandedGroup(null)
    }
  }, [active, expandedGroup, toolGroups, tools])

  function selectTool(groupId: ToolGroupId, toolId: ToolId) {
    setExpandedGroup(groupId)
    setActive(toolId)
  }

  function showHome() {
    setActive(null)
    setExpandedGroup(null)
  }

  function toggleSidebarPin() {
    setSidebarMode((current) => current === 'pinned' ? 'unpinned-open' : 'pinned')
  }

  function peekSidebar() {
    if (sidebarMode === 'collapsed') {
      setSidebarMode('peeking')
    }
  }

  function hidePeekedSidebar() {
    if (sidebarMode === 'unpinned-open' || sidebarMode === 'peeking') {
      setSidebarMode('collapsed')
    }
  }

  return (
    <div className={[
      'app-shell',
      sidebarMode === 'unpinned-open' ? 'sidebar-unpinned-open' : '',
      sidebarMode === 'collapsed' || sidebarMode === 'peeking' ? 'sidebar-collapsed' : '',
      sidebarMode === 'peeking' ? 'sidebar-peeking' : '',
      toolFocusMode ? 'tool-focus-mode' : '',
    ].filter(Boolean).join(' ')}>
      <aside
        className="sidebar"
        aria-expanded={sidebarVisible}
        onPointerEnter={peekSidebar}
        onPointerLeave={hidePeekedSidebar}
      >
        <div
          className='sidebar-content'
          id='desktop-sidebar-content'
          aria-hidden={!sidebarVisible}
          {...(!sidebarVisible ? { inert: '' } : {})}
        >
          <div className='sidebar-brand-row'>
            <button className='brand brand-home' type='button' aria-label='返回介绍首页' onClick={showHome}>
              <div className="brand-mark" aria-hidden="true"><span>&lt;</span><span>/</span><span>&gt;</span></div>
              <div><strong>Dev Toolbox</strong><span>LOCAL UTILITIES</span></div>
            </button>
            <button
              className={`sidebar-pin ${sidebarPinned ? 'pinned' : ''}`}
              type='button'
              aria-label={sidebarPinned ? 'Unpin navigation' : 'Pin navigation'}
              aria-pressed={sidebarPinned}
              title={sidebarPinned ? 'Unpin navigation' : 'Pin navigation'}
              onClick={toggleSidebarPin}
            >
              <svg viewBox='0 0 20 20' focusable='false' aria-hidden='true'>
                <path d='M7.2 2.8h5.6l-.9 4.3 2.7 2.7v1.6H5.4V9.8l2.7-2.7-.9-4.3Z' />
                <path d='M10 11.4v5.8' />
              </svg>
            </button>
          </div>
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
        {active === null ? <HomePage groups={toolGroups} /> : null}
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
