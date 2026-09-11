import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { DEFAULT_TOOL_AVAILABILITY, TOOL_IDS, type ToolAvailability } from './toolRegistry'
import { CopyButton } from './ui'

describe('toolbox shell', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('defaults to the homepage with every desktop category collapsed', () => {
    render(<App />)
    expect(screen.getByRole('region', { name: '开发者工具箱' })).toBeVisible()
    expect(screen.queryByRole('region', { name: 'RSA' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unpin navigation' })).toHaveAttribute('aria-pressed', 'true')

    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const groups = within(desktopNav).getAllByRole('group')
    expect(groups.map((group) => group.querySelector('.nav-group-toggle > span:first-child')?.textContent))
      .toEqual(['随机数工具', '对称加密', '非对称加密', '摘要算法', '时间工具', '编码工具'])
    for (const label of ['随机数工具', '对称加密', '非对称加密', '摘要算法', '时间工具', '编码工具']) {
      expect(within(desktopNav).getByRole('button', { name: label })).toHaveAttribute('aria-expanded', 'false')
    }
    expect(within(desktopNav).getAllByRole('button')).toHaveLength(6)
    expect(desktopNav.querySelector('[aria-current="page"]')).toBeNull()

    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })
    expect(within(mobileNav).getAllByRole('button').map((button) => button.textContent))
      .toEqual(['色子模拟器', '随机数生成器', 'AES', 'SM4', 'RSA', 'MD5', 'SHA', '时间戳', 'URL 编解码', 'Unicode', 'Base64', 'JWT', 'JSON'])
    expect(mobileNav.querySelector('[aria-current="page"]')).toBeNull()
    expect(screen.getAllByRole('button', { name: '返回介绍首页' })).toHaveLength(2)
  })

  it('unpinned desktop sidebar stays open until pointer exit, previews from the rail, and pins again', async () => {
    const user = userEvent.setup()
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    const { container } = render(<App />)
    const shell = container.querySelector('.app-shell')
    const sidebar = container.querySelector('.sidebar')
    const unpinButton = screen.getByRole('button', { name: 'Unpin navigation' })

    expect(shell).not.toHaveClass('sidebar-collapsed')
    expect(sidebar).toHaveAttribute('aria-expanded', 'true')
    expect(unpinButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(unpinButton)
    const pinButton = screen.getByRole('button', { name: 'Pin navigation' })
    expect(shell).toHaveClass('sidebar-unpinned-open')
    expect(shell).not.toHaveClass('sidebar-collapsed')
    expect(sidebar).toHaveAttribute('aria-expanded', 'true')
    expect(container.querySelector('.sidebar-content')).toHaveAttribute('aria-hidden', 'false')
    expect(pinButton).toHaveAttribute('aria-pressed', 'false')
    expect(storageSpy).not.toHaveBeenCalled()

    await user.unhover(sidebar as Element)
    expect(shell).toHaveClass('sidebar-collapsed')
    expect(shell).not.toHaveClass('sidebar-peeking')
    expect(sidebar).toHaveAttribute('aria-expanded', 'false')
    expect(container.querySelector('.sidebar-content')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.sidebar-content')).toHaveAttribute('inert')

    await user.hover(sidebar as Element)
    expect(shell).toHaveClass('sidebar-peeking')
    expect(container.querySelector('.sidebar-content')).toHaveAttribute('aria-hidden', 'false')
    expect(container.querySelector('.sidebar-content')).not.toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: 'Pin navigation' }))
    expect(shell).not.toHaveClass('sidebar-collapsed')
    expect(shell).not.toHaveClass('sidebar-peeking')
    expect(screen.getByRole('button', { name: 'Unpin navigation' })).toHaveAttribute('aria-pressed', 'true')
    storageSpy.mockRestore()
  })

  it('uses a keyboard-accessible single-expanded disclosure navigation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.tab()
    expect(document.activeElement).toHaveAccessibleName('返回介绍首页')
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })

    await user.tab()
    expect(document.activeElement).toHaveAccessibleName('Unpin navigation')
    await user.tab()
    expect(document.activeElement).toHaveAccessibleName('随机数工具')
    await user.keyboard('{Enter}')

    expect(within(desktopNav).getByRole('button', { name: '随机数工具' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(desktopNav).getByRole('button', { name: '非对称加密' })).toHaveAttribute('aria-expanded', 'false')
    expect(within(desktopNav).queryByRole('button', { name: /RSA/ })).not.toBeInTheDocument()

    await user.tab()
    expect(document.activeElement).toHaveAccessibleName(/色子模拟器/)
    await user.tab()
    expect(document.activeElement).toHaveAccessibleName(/随机数生成器/)
    await user.tab()
    expect(document.activeElement).toHaveAccessibleName('对称加密')
  })

  it('keeps stable SVG chevron nodes while disclosure state changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const toggles = ['随机数工具', '对称加密', '非对称加密', '摘要算法', '时间工具', '编码工具']
      .map((name) => within(desktopNav).getByRole('button', { name }))

    for (const toggle of toggles) {
      const chevron = toggle.querySelector('.nav-group-chevron')
      expect(chevron).not.toBeNull()
      expect(chevron?.querySelector('svg')).toHaveAttribute('viewBox', '0 0 16 16')
    }

    const firstChevron = toggles[0].querySelector('.nav-group-chevron')
    await user.click(toggles[0])
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'true')
    expect(toggles[0].querySelector('.nav-group-chevron')).toBe(firstChevron)
    await user.click(toggles[0])
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'false')
    expect(toggles[0].querySelector('.nav-group-chevron')).toBe(firstChevron)
  })

  it('navigates across groups and preserves per-tool memory state', async () => {
    const user = userEvent.setup()
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    await user.click(within(desktopNav).getByRole('button', { name: '编码工具' }))
    await user.click(within(desktopNav).getByRole('button', { name: /Base64/ }))
    const base64Region = screen.getByRole('region', { name: 'Base64' })
    const input = within(base64Region).getByLabelText('待处理文本')
    await user.type(input, 'kept locally')

    await user.click(screen.getAllByRole('button', { name: '返回介绍首页' })[0])
    expect(screen.getByRole('region', { name: '开发者工具箱' })).toBeVisible()
    expect(within(desktopNav).getByRole('button', { name: '编码工具' })).toHaveAttribute('aria-expanded', 'false')
    expect(desktopNav.querySelector('[aria-current="page"]')).toBeNull()

    await user.click(within(desktopNav).getByRole('button', { name: '编码工具' }))
    await user.click(within(desktopNav).getByRole('button', { name: /Base64/ }))
    expect(input).toHaveValue('kept locally')

    await user.click(within(desktopNav).getByRole('button', { name: '摘要算法' }))
    await user.click(within(desktopNav).getByRole('button', { name: /MD5/ }))
    expect(screen.getByRole('region', { name: 'MD5' })).toBeVisible()
    await user.click(within(desktopNav).getByRole('button', { name: '编码工具' }))
    await user.click(within(desktopNav).getByRole('button', { name: /Base64/ }))
    expect(input).toHaveValue('kept locally')
  })

  it('opens the renamed SHA tool after MD5 and preserves its state across desktop and mobile navigation', async () => {
    const user = userEvent.setup()
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })

    await user.click(within(desktopNav).getByRole('button', { name: '摘要算法' }))
    const digestButtons = within(desktopNav).getAllByRole('button').filter((button) => button.classList.contains('nav-item'))
    expect(digestButtons.map((button) => button.querySelector('strong')?.textContent)).toEqual(['MD5', 'SHA'])
    expect(within(desktopNav).getByRole('button', { name: /SHA/ })).toHaveTextContent('四种 SHA 摘要')
    expect(within(desktopNav).getByRole('button', { name: /SHA/ }).querySelector('.nav-icon')).toHaveTextContent('S4')

    await user.click(within(desktopNav).getByRole('button', { name: /SHA/ }))
    const shaRegion = screen.getByRole('region', { name: 'SHA' })
    expect(shaRegion).toBeVisible()
    expect(within(desktopNav).getByRole('button', { name: /SHA/ })).toHaveAttribute('aria-current', 'page')
    expect(within(mobileNav).getByRole('button', { name: 'SHA' })).toHaveAttribute('aria-current', 'page')
    await user.type(within(shaRegion).getByLabelText('待摘要文本'), 'preserved SHA input')

    await user.click(within(desktopNav).getByRole('button', { name: /MD5/ }))
    await user.click(within(desktopNav).getByRole('button', { name: /SHA/ }))
    expect(within(shaRegion).getByLabelText('待摘要文本')).toHaveValue('preserved SHA input')
    expect(screen.queryByRole('region', { name: 'SHA-1' })).not.toBeInTheDocument()
  })

  it('returns home from desktop and mobile brand buttons with keyboard and pointer activation', async () => {
    const user = userEvent.setup()
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })
    const [desktopBrand, mobileBrand] = screen.getAllByRole('button', { name: '返回介绍首页' })

    await user.click(within(desktopNav).getByRole('button', { name: '非对称加密' }))
    await user.click(within(desktopNav).getByRole('button', { name: /RSA/ }))
    desktopBrand.focus()
    await user.keyboard(' ')
    expect(screen.getByRole('region', { name: '开发者工具箱' })).toBeVisible()

    await user.click(within(mobileNav).getByRole('button', { name: 'RSA' }))
    expect(screen.getByRole('region', { name: 'RSA' })).toBeVisible()
    await user.click(mobileBrand)
    expect(screen.getByRole('region', { name: '开发者工具箱' })).toBeVisible()
  })

  it('encodes Base64 without storage or network calls', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    await user.click(within(desktopNav).getByRole('button', { name: '编码工具' }))
    await user.click(within(desktopNav).getByRole('button', { name: /Base64/ }))
    const region = screen.getByRole('region', { name: 'Base64' })
    await user.type(within(region).getByLabelText('待处理文本'), '你好')
    await user.click(within(region).getByRole('button', { name: '开始编码' }))
    expect(within(region).getByLabelText('转换结果')).toHaveValue('5L2g5aW9')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    storageSpy.mockRestore()
  })

  it('opens Unicode before Base64, processes locally and preserves independent tool state', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })

    await user.click(within(desktopNav).getByRole('button', { name: '编码工具' }))
    const encodingTools = within(desktopNav).getAllByRole('button').filter((button) => button.classList.contains('nav-item'))
    expect(encodingTools.map((button) => button.querySelector('strong')?.textContent))
      .toEqual(['URL 编解码', 'Unicode', 'Base64', 'JWT', 'JSON'])

    await user.click(within(desktopNav).getByRole('button', { name: /Unicode/ }))
    const unicodeRegion = screen.getByRole('region', { name: 'Unicode' })
    expect(unicodeRegion).toBeVisible()
    expect(within(desktopNav).getByRole('button', { name: /Unicode/ })).toHaveAttribute('aria-current', 'page')
    expect(within(mobileNav).getByRole('button', { name: 'Unicode' })).toHaveAttribute('aria-current', 'page')

    const unicodeInput = within(unicodeRegion).getByLabelText('待处理文本')
    await user.type(unicodeInput, 'A中')
    await user.click(within(unicodeRegion).getByRole('button', { name: '开始编码' }))
    expect(within(unicodeRegion).getByLabelText('转换结果')).toHaveValue('\\u0041\\u4E2D')
    await user.click(within(unicodeRegion).getByRole('radio', { name: '解码' }))

    await user.click(within(desktopNav).getByRole('button', { name: /Base64/ }))
    const base64Region = screen.getByRole('region', { name: 'Base64' })
    await user.type(within(base64Region).getByLabelText('待处理文本'), 'base64 state')
    expect(within(base64Region).getByRole('radio', { name: '编码' })).toBeChecked()

    await user.click(within(desktopNav).getByRole('button', { name: /Unicode/ }))
    expect(unicodeInput).toHaveValue('A中')
    expect(within(unicodeRegion).getByRole('radio', { name: '解码' })).toBeChecked()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    storageSpy.mockRestore()
  })

  it.each([320, 390])('keeps the homepage and mobile tools available at %ipx', async (width) => {
    const user = userEvent.setup()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Unpin navigation' }))
    expect(screen.getByRole('button', { name: 'Pin navigation' })).toBeInTheDocument()
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })
    expect(within(mobileNav).getAllByRole('group')).toHaveLength(6)
    expect(within(mobileNav).getAllByRole('button')).toHaveLength(13)
    expect(within(mobileNav).getByRole('button', { name: 'Unicode' })).toBeVisible()
    expect(within(mobileNav).getByRole('button', { name: 'SHA' })).toBeVisible()
    expect(screen.getByRole('region', { name: '开发者工具箱' })).toBeVisible()
    await user.click(within(mobileNav).getByRole('button', { name: 'SHA' }))
    expect(screen.getByRole('region', { name: 'SHA' })).toBeVisible()
    expect(within(mobileNav).getByRole('button', { name: 'SHA' })).toHaveAttribute('aria-current', 'page')
    await user.click(within(mobileNav).getByRole('button', { name: 'RSA' }))
    expect(screen.getByRole('region', { name: 'RSA' })).toBeVisible()
    expect(screen.getByRole('button', { name: '生成 2048 位密钥' })).toBeEnabled()
  })

  it('opens JWT from the encoding group and keeps its active state in both navigations', async () => {
    const user = userEvent.setup()
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })

    await user.click(within(desktopNav).getByRole('button', { name: '编码工具' }))
    await user.click(within(desktopNav).getByRole('button', { name: /JWT/ }))

    expect(screen.getByRole('region', { name: 'JWT' })).toBeVisible()
    expect(within(desktopNav).getByRole('button', { name: /JWT/ })).toHaveAttribute('aria-current', 'page')
    expect(within(mobileNav).getByRole('button', { name: 'JWT' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens JSON from the encoding group after JWT and keeps its active state in both navigations', async () => {
    const user = userEvent.setup()
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })

    await user.click(within(desktopNav).getByRole('button', { name: '编码工具' }))
    const encodingButtons = within(desktopNav).getAllByRole('button').filter((button) => button.classList.contains('nav-item'))
    expect(encodingButtons.map((button) => button.querySelector('strong')?.textContent)).toEqual(['URL 编解码', 'Unicode', 'Base64', 'JWT', 'JSON'])

    await user.click(within(desktopNav).getByRole('button', { name: /JSON/ }))
    const jsonRegion = screen.getByRole('region', { name: 'JSON' })
    expect(jsonRegion).toBeVisible()
    expect(within(jsonRegion).queryByText('本地处理')).not.toBeInTheDocument()
    expect(within(jsonRegion).getByText(/在浏览器本地格式化或压缩 JSON/)).toBeVisible()
    expect(within(desktopNav).getByRole('button', { name: /JSON/ })).toHaveAttribute('aria-current', 'page')
    expect(within(mobileNav).getByRole('button', { name: 'JSON' })).toHaveAttribute('aria-current', 'page')
  })

  it('enables focus mode for every symmetric and encoding tool, including runtime-enabled DES', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('crypto', { subtle: {}, getRandomValues: vi.fn() })
    const { container } = render(<App availability={{ ...DEFAULT_TOOL_AVAILABILITY, des: true }} />)
    const shell = container.querySelector('.app-shell')
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })

    expect(shell).not.toHaveClass('tool-focus-mode')
    for (const name of ['AES', 'DES', 'SM4', 'URL 编解码', 'Unicode', 'Base64', 'JWT', 'JSON']) {
      await user.click(within(mobileNav).getByRole('button', { name }))
      expect(shell).toHaveClass('tool-focus-mode')
    }

    await user.click(within(mobileNav).getByRole('button', { name: 'SHA' }))
    expect(shell).not.toHaveClass('tool-focus-mode')
    expect(shell).toHaveClass('sha-focus-mode')

    await user.click(within(mobileNav).getByRole('button', { name: 'MD5' }))
    expect(shell).not.toHaveClass('tool-focus-mode')
    expect(shell).not.toHaveClass('sha-focus-mode')

    await user.click(within(mobileNav).getByRole('button', { name: 'SHA' }))
    expect(shell).toHaveClass('sha-focus-mode')

    await user.click(screen.getAllByRole('button', { name: '返回介绍首页' })[0])
    expect(shell).not.toHaveClass('tool-focus-mode')
    expect(shell).not.toHaveClass('sha-focus-mode')
  })

  it('keeps document scrolling available when global capability warnings are present', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('crypto', {})
    const { container } = render(<App />)
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })

    expect(screen.getAllByRole('alert')).toHaveLength(2)
    await user.click(within(mobileNav).getByRole('button', { name: 'JSON' }))
    expect(container.querySelector('.app-shell')).not.toHaveClass('tool-focus-mode')
    expect(screen.getByRole('region', { name: 'JSON' })).toBeVisible()
    await user.click(within(mobileNav).getByRole('button', { name: 'SHA' }))
    expect(container.querySelector('.app-shell')).not.toHaveClass('sha-focus-mode')
    expect(screen.getByRole('region', { name: 'SHA' })).toBeVisible()
  })

  it('keeps desktop, mobile and home listings consistent with explicit overrides', async () => {
    const user = userEvent.setup()
    const availability = { ...DEFAULT_TOOL_AVAILABILITY, des: true, json: false }
    render(<App availability={availability} />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })
    const homepage = screen.getByRole('region', { name: '开发者工具箱' })

    expect(within(mobileNav).getByRole('button', { name: 'DES' })).toBeVisible()
    expect(within(mobileNav).queryByRole('button', { name: 'JSON' })).not.toBeInTheDocument()
    expect(within(homepage).getByText('AES · DES · SM4')).toBeVisible()
    expect(within(homepage).getByText('URL 编解码 · Unicode · Base64 · JWT')).toBeVisible()

    await user.click(within(desktopNav).getByRole('button', { name: '对称加密' }))
    await user.click(within(desktopNav).getByRole('button', { name: /DES/ }))
    expect(screen.getByRole('region', { name: 'DES' })).toBeVisible()
  })

  it('removes empty categories from every listing', () => {
    const availability = Object.fromEntries(TOOL_IDS.map((id) => [id, id === 'aes'])) as ToolAvailability
    render(<App availability={availability} />)

    expect(within(screen.getByRole('navigation', { name: '工具导航' })).getAllByRole('group')).toHaveLength(1)
    expect(within(screen.getByRole('navigation', { name: '移动工具导航' })).getAllByRole('group')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: '开发者工具箱' })).getAllByRole('article')).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: '非对称加密' })).not.toBeInTheDocument()
  })

  it('returns home when the active tool becomes unavailable', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<App availability={{ ...DEFAULT_TOOL_AVAILABILITY, des: true }} />)
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })
    await user.click(within(mobileNav).getByRole('button', { name: 'DES' }))
    expect(screen.getByRole('region', { name: 'DES' })).toBeVisible()

    rerender(<App availability={DEFAULT_TOOL_AVAILABILITY} />)
    expect(await screen.findByRole('region', { name: '开发者工具箱' })).toBeVisible()
    expect(within(mobileNav).queryByRole('button', { name: 'DES' })).not.toBeInTheDocument()
  })
})

describe('clipboard feedback', () => {
  it('reports clipboard success and failure without removing the result', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { rerender } = render(<CopyButton value="result" />)
    await user.click(screen.getByRole('button', { name: '复制结果' }))
    expect(await screen.findByText('已复制到剪贴板。')).toBeVisible()
    expect(writeText).toHaveBeenCalledWith('result')

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    rerender(<CopyButton value="result" />)
    await user.click(screen.getByRole('button', { name: '复制结果' }))
    expect(await screen.findByText('无法访问剪贴板，请手动复制结果。')).toBeVisible()
  })
})
