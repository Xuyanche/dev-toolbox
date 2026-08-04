import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { CopyButton } from './ui'

describe('toolbox shell', () => {
  it('defaults to RSA and renders the required group and tool order', () => {
    render(<App />)
    expect(screen.getByRole('region', { name: 'RSA' })).toBeVisible()

    const desktopNav = screen.getByRole('navigation', { name: '工具导航' })
    const groups = within(desktopNav).getAllByRole('group')
    expect(groups.map((group) => group.getAttribute('aria-labelledby') && document.getElementById(group.getAttribute('aria-labelledby')!)?.textContent))
      .toEqual(['非对称加密', '摘要算法', '时间工具', '编码工具'])
    expect(within(desktopNav).getAllByRole('button').map((button) => button.querySelector('span:last-child')?.textContent))
      .toEqual(['RSA加密与签名', 'MD5消息摘要', 'SHA-1消息摘要', '时间戳ISO 与日期', 'URL 编解码百分号编码', 'Base64文本编解码'])
    expect(within(desktopNav).getByRole('button', { name: /RSA/ })).toHaveAttribute('aria-current', 'page')

    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })
    expect(within(mobileNav).getAllByRole('button').map((button) => button.textContent))
      .toEqual(['RSA', 'MD5', 'SHA-1', '时间戳', 'URL 编解码', 'Base64'])
    expect(within(mobileNav).getByRole('button', { name: 'RSA' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps category labels out of tab order and follows visual tool order', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (const name of [/RSA/, /MD5/, /SHA-1/, /时间戳/, /URL 编解码/, /Base64/]) {
      await user.tab()
      expect(document.activeElement).toHaveAccessibleName(name)
    }
    for (const label of ['非对称加密', '摘要算法', '时间工具', '编码工具']) {
      expect(screen.getAllByText(label)[0]).not.toHaveAttribute('tabindex')
    }
  })

  it('navigates across groups and preserves per-tool memory state', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(screen.getByRole('navigation', { name: '工具导航' })).getByRole('button', { name: /Base64/ }))
    const base64Region = screen.getByRole('region', { name: 'Base64' })
    const input = within(base64Region).getByLabelText('待处理文本')
    await user.type(input, 'kept locally')

    await user.click(within(screen.getByRole('navigation', { name: '工具导航' })).getByRole('button', { name: /MD5/ }))
    expect(screen.getByRole('region', { name: 'MD5' })).toBeVisible()
    await user.click(within(screen.getByRole('navigation', { name: '工具导航' })).getByRole('button', { name: /Base64/ }))
    expect(input).toHaveValue('kept locally')
  })

  it('encodes Base64 without storage or network calls', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<App />)
    await user.click(within(screen.getByRole('navigation', { name: '工具导航' })).getByRole('button', { name: /Base64/ }))
    const region = screen.getByRole('region', { name: 'Base64' })
    await user.type(within(region).getByLabelText('待处理文本'), '你好')
    await user.click(within(region).getByRole('button', { name: '开始编码' }))
    expect(within(region).getByLabelText('转换结果')).toHaveValue('5L2g5aW9')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
    storageSpy.mockRestore()
  })

  it.each([320, 390])('keeps grouped navigation and core controls available at %ipx', (width) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    render(<App />)
    const mobileNav = screen.getByRole('navigation', { name: '移动工具导航' })
    expect(within(mobileNav).getAllByRole('group')).toHaveLength(4)
    expect(within(mobileNav).getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('region', { name: 'RSA' })).toBeVisible()
    expect(screen.getByRole('button', { name: '生成 2048 位密钥' })).toBeEnabled()
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
