import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { CopyButton } from './ui'

describe('toolbox shell', () => {
  it('defaults to the homepage with every desktop category collapsed', () => {
    render(<App />)
    expect(screen.getByRole('region', { name: '开发者工具箱' })).toBeVisible()
    expect(screen.queryByRole('region', { name: 'RSA' })).not.toBeInTheDocument()

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
      .toEqual(['色子模拟器', '随机数生成器', 'AES', 'DES', 'SM4', 'RSA', 'MD5', 'SHA', '时间戳', 'URL 编解码', 'Base64', 'JWT', 'JSON'])
    expect(mobileNav.querySelector('[aria-current="page"]')).toBeNull()
    expect(screen.getAllByRole('button', { name: '返回介绍首页' })).toHaveLength(2)
  })

  it('uses a keyboard-accessible single-expanded disclosure navigation', async () => {
    const user = userEvent.setup()
    render(<App />)
    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })

    await user.tab()
    expect(document.activeElement).toHaveAccessibleName('返回介绍首页')
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

  it.each([320, 390])('keeps the homepage and mobile tools available at %ipx', async (width) => {
    const user = userEvent.setup()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    render(<App />)
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })
    expect(within(mobileNav).getAllByRole('group')).toHaveLength(6)
    expect(within(mobileNav).getAllByRole('button')).toHaveLength(13)
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
    expect(encodingButtons.map((button) => button.querySelector('strong')?.textContent)).toEqual(['URL 编解码', 'Base64', 'JWT', 'JSON'])

    await user.click(within(desktopNav).getByRole('button', { name: /JSON/ }))
    expect(screen.getByRole('region', { name: 'JSON' })).toBeVisible()
    expect(within(desktopNav).getByRole('button', { name: /JSON/ })).toHaveAttribute('aria-current', 'page')
    expect(within(mobileNav).getByRole('button', { name: 'JSON' })).toHaveAttribute('aria-current', 'page')
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
